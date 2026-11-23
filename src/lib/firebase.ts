import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.messages.create',
];

export const googleAuthProvider = new GoogleAuthProvider();
for (const scope of WORKSPACE_SCOPES) {
  googleAuthProvider.addScope(scope);
}

// In-memory OAuth access token cache (never stored in localStorage/sessionStorage)
let cachedWorkspaceToken: string | null = null;
let isSigningIn = false;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

export function initFirebaseAuthListener(
  onUserChange: (user: User | null, workspaceToken: string | null) => void
) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedWorkspaceToken = null;
    }
    if (!isSigningIn) {
      onUserChange(user, cachedWorkspaceToken);
    }
  });
}

export async function signInWithGoogleWorkspace(): Promise<{
  user: User;
  idToken: string;
  workspaceAccessToken: string | null;
}> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedWorkspaceToken = credential?.accessToken ?? null;
    const idToken = await result.user.getIdToken();
    return {
      user: result.user,
      idToken,
      workspaceAccessToken: cachedWorkspaceToken,
    };
  } finally {
    isSigningIn = false;
  }
}

export function getCachedWorkspaceToken(): string | null {
  return cachedWorkspaceToken;
}

export async function signOutFirebase() {
  cachedWorkspaceToken = null;
  await signOut(auth);
}

export async function syncUserPassportToFirestore(params: {
  uid: string;
  displayName: string;
  email: string;
  scholarOsId: string;
  department: string;
  theme: string;
  fontScale: 'small' | 'default' | 'large' | 'xl';
}) {
  const userPath = `users/${params.uid}`;
  try {
    await setDoc(
      doc(db, 'users', params.uid),
      {
        uid: params.uid,
        displayName: params.displayName.slice(0, 100),
        role: 'student',
        scholarOsId: params.scholarOsId,
        department: params.department.slice(0, 100),
        theme: params.theme,
        fontScale: params.fontScale,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export function subscribeUserNotifications(
  uid: string,
  onItems: (items: Array<{ id: string; title: string; body: string; category: string; read: boolean }>) => void
) {
  const notifPath = `users/${uid}/notifications`;
  const q = query(
    collection(db, notifPath),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(
    q,
    (snap) => {
      onItems(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as { title: string; body: string; category: string; read: boolean }),
        }))
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, notifPath);
    }
  );
}
