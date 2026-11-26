import type { ActionName, AppStateSnapshot, SessionResponse } from '../types/api';
import { extractFilenameFromDisposition } from './formatters';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseJsonSafe(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function defaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid or missing request fields.';
    case 401:
      return 'Your session has expired or you are not signed in. Please sign in again.';
    case 403:
      return 'Permission denied or CSRF verification failed for this action.';
    case 404:
      return 'The requested record or endpoint was not found.';
    case 409:
      return 'Action blocked due to a scheduling, eligibility, or state conflict.';
    case 413:
      return 'File or payload exceeds the maximum permitted size (100 MB).';
    case 500:
      return 'An unexpected server error occurred. No transaction was recorded.';
    default:
      return `Request failed with HTTP ${status}.`;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const serverMsg =
      data && typeof data.error === 'string' && data.error.trim()
        ? data.error
        : defaultErrorMessage(res.status);
    throw new ApiError(res.status, serverMsg);
  }
  return (data ?? { ok: true }) as T;
}

export async function fetchSession(): Promise<SessionResponse> {
  let res: Response;
  try {
    res = await fetch('/api/session', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ApiError(
      0,
      'Unable to reach the Discivium Python backend at /api/session. Confirm "python -m prototype.app" is running on 127.0.0.1:8000.'
    );
  }
  return handleResponse<SessionResponse>(res);
}

export async function fetchState(): Promise<AppStateSnapshot> {
  let res: Response;
  try {
    res = await fetch('/api/state', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ApiError(
      0,
      'Unable to reach /api/state. Ensure the Discivium backend server is running.'
    );
  }
  return handleResponse<AppStateSnapshot>(res);
}

export async function loginAccount(
  username: string,
  password: string
): Promise<{ ok: boolean }> {
  let res: Response;
  try {
    res = await fetch('/api/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new ApiError(
      0,
      'Cannot connect to /api/login. Start the Python backend with "python -m prototype.app" and retry.'
    );
  }
  return handleResponse<{ ok: boolean }>(res);
}

export async function logoutAccount(csrf: string): Promise<{ ok: boolean }> {
  const res = await fetch('/api/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf,
      Accept: 'application/json',
    },
    body: JSON.stringify({}),
  });
  return handleResponse<{ ok: boolean }>(res);
}

export async function postAction(
  action: ActionName,
  payload: Record<string, unknown>,
  csrf: string
): Promise<{ ok: boolean }> {
  let res: Response;
  try {
    res = await fetch(`/api/actions/${action}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf,
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(
      0,
      `Network failure while posting action "${action}". No change was assumed.`
    );
  }
  return handleResponse<{ ok: boolean }>(res);
}

export function uploadActionWithProgress(
  action: 'submit' | 'resource',
  formData: FormData,
  csrf: string,
  onProgress?: (percent: number | null) => void
): Promise<{ ok: boolean }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/actions/${action}`, true);
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-CSRF-Token', csrf);
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      } else {
        onProgress(null);
      }
    };

    xhr.onerror = () => {
      reject(
        new ApiError(
          0,
          'Upload failed due to a network error. Verify the backend server is reachable.'
        )
      );
    };

    xhr.onload = () => {
      let parsed: Record<string, unknown> | null = null;
      if (xhr.responseText) {
        try {
          parsed = JSON.parse(xhr.responseText) as Record<string, unknown>;
        } catch {
          parsed = null;
        }
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve((parsed ?? { ok: true }) as { ok: boolean });
      } else {
        const message =
          parsed && typeof parsed.error === 'string' && parsed.error.trim()
            ? parsed.error
            : defaultErrorMessage(xhr.status);
        reject(new ApiError(xhr.status, message));
      }
    };

    xhr.send(formData);
  });
}

export async function downloadProtectedFile(
  url: string,
  fallbackFilename: string
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'Network error while downloading file from server.');
  }
  if (!res.ok) {
    const data = await parseJsonSafe(res);
    const message =
      data && typeof data.error === 'string'
        ? data.error
        : defaultErrorMessage(res.status);
    throw new ApiError(res.status, message);
  }
  const filename = extractFilenameFromDisposition(
    res.headers.get('Content-Disposition'),
    fallbackFilename
  );
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  return filename;
}
