import React, { useState } from 'react';
import { MessageSquare, ClipboardCheck, Send, Plus, AlertTriangle, ExternalLink } from 'lucide-react';
import { useDiscivium } from '../context/DisciviumContext';

export function WorkspaceHub() {
  const { workspaceToken, authMode, loginGoogle, accentColor, formsEnabled, chatEnabled, courses } =
    useDiscivium();

  // Google Forms state
  const [formIdInput, setFormIdInput] = useState('');
  const [newFormTitle, setNewFormTitle] = useState('COMP301 Peer Architecture Review Survey');
  const [loadedForm, setLoadedForm] = useState<{ title: string; id: string; responses: number } | null>(
    null
  );
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [confirmFormCreateOpen, setConfirmFormCreateOpen] = useState(false);

  // Google Chat state
  const [spaces, setSpaces] = useState<{ name: string; displayName: string }[]>([]);
  const [selectedSpace, setSelectedSpace] = useState('');
  const [messages, setMessages] = useState<{ name: string; sender: string; text: string }[]>([
    {
      name: 'demo-msg-1',
      sender: 'Prof. Eleanor Vance',
      text: 'Welcome to COMP301 Architecture Seminar Chat. Please submit your ADR baseline PDF before Friday 23:59.',
    },
    {
      name: 'demo-msg-2',
      sender: 'Maya Chen',
      text: 'Confirmed — C4 component diagrams are attached in our team draft.',
    },
  ]);
  const [draftMsg, setDraftMsg] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [confirmChatSendOpen, setConfirmChatSendOpen] = useState(false);

  const handleLoadForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIdInput.trim()) return;
    setFormNotice(null);
    if (!workspaceToken) {
      setLoadedForm({
        title: `Preview Form (${formIdInput.trim()})`,
        id: formIdInput.trim(),
        responses: 24,
      });
      setFormNotice('Sign in with Google to query live Google Forms responses.');
      return;
    }
    try {
      const res = await fetch(
        `/api/workspace/forms?formId=${encodeURIComponent(formIdInput.trim())}`,
        { headers: { Authorization: `Bearer ${workspaceToken}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'Could not load form.');
      setLoadedForm({
        title: data.form?.info?.title || 'Untitled Google Form',
        id: data.form?.formId || formIdInput.trim(),
        responses: Array.isArray(data.responses) ? data.responses.length : 0,
      });
    } catch (err: unknown) {
      setFormNotice(err instanceof Error ? err.message : 'Failed to fetch form.');
    }
  };

  const executeCreateForm = async () => {
    setConfirmFormCreateOpen(false);
    setFormNotice(null);
    if (!workspaceToken) {
      setLoadedForm({
        title: newFormTitle.trim(),
        id: `demo_form_${Date.now()}`,
        responses: 0,
      });
      setFormNotice('Created in local preview. Sign in with Google to create a live Google Form.');
      return;
    }
    try {
      const res = await fetch('/api/workspace/forms', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${workspaceToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newFormTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.error || 'Create form failed.');
      setLoadedForm({
        title: data.info?.title || newFormTitle.trim(),
        id: data.formId,
        responses: 0,
      });
      setFormIdInput(data.formId);
      setFormNotice(`Live Google Form created (ID: ${data.formId}).`);
    } catch (err: unknown) {
      setFormNotice(err instanceof Error ? err.message : 'Failed to create Google Form.');
    }
  };

  const handleLoadChatSpaces = async () => {
    setChatError(null);
    if (!workspaceToken) {
      setSpaces(
        courses.map((c) => ({
          name: `spaces/${c.code.toLowerCase()}`,
          displayName: `${c.code} · ${c.title}`,
        }))
      );
      setSelectedSpace(`spaces/${courses[0]?.code.toLowerCase() || 'comp301'}`);
      return;
    }
    try {
      const res = await fetch('/api/workspace/chat/spaces', {
        headers: { Authorization: `Bearer ${workspaceToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error?.message || data.error || 'Google Chat API error.';
        setChatError(msg);
        return;
      }
      const list = Array.isArray(data.spaces) ? data.spaces : [];
      setSpaces(list);
      if (list[0]?.name) setSelectedSpace(list[0].name);
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : 'Failed to load Google Chat spaces.');
    }
  };

  const executeSendChatMessage = async () => {
    setConfirmChatSendOpen(false);
    if (!draftMsg.trim()) return;
    if (!workspaceToken || !selectedSpace.startsWith('spaces/')) {
      setMessages((prev) => [
        ...prev,
        { name: `msg_${Date.now()}`, sender: 'You (Course Preview)', text: draftMsg.trim() },
      ]);
      setDraftMsg('');
      return;
    }
    try {
      const res = await fetch('/api/workspace/chat/messages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${workspaceToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ space: selectedSpace, text: draftMsg.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Message failed.');
      }
      setMessages((prev) => [
        ...prev,
        { name: data.name || `msg_${Date.now()}`, sender: 'You', text: draftMsg.trim() },
      ]);
      setDraftMsg('');
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : 'Failed to send Google Chat message.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Google Forms &amp; Google Chat</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Course evaluation forms, quiz response tracking, and seminar chat spaces.
          </p>
        </div>
        {authMode !== 'google' && (
          <button
            type="button"
            onClick={() => void loginGoogle()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white whitespace-nowrap shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            Connect Google Workspace
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Google Forms Panel */}
        <section className="lg:col-span-6 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" style={{ color: accentColor }} />
              Google Forms Course Surveys
            </h2>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              {formsEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <form onSubmit={handleLoadForm} className="flex gap-2">
            <input
              type="text"
              value={formIdInput}
              onChange={(e) => setFormIdInput(e.target.value)}
              placeholder="Paste Google Form ID..."
              aria-label="Google Form ID"
              className="flex-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] hover:bg-[var(--surface-subtle)] whitespace-nowrap"
            >
              Load Form
            </button>
          </form>

          <div className="pt-4 border-t border-[var(--border-hairline)] space-y-3">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Create New Coursework / Evaluation Form
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                className="flex-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => setConfirmFormCreateOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap"
                style={{ backgroundColor: accentColor }}
              >
                <Plus className="w-3.5 h-3.5" />
                Create Form
              </button>
            </div>
          </div>

          {formNotice && <p className="text-xs text-[var(--text-secondary)]">{formNotice}</p>}

          {loadedForm && (
            <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] space-y-1">
              <p className="text-xs font-mono text-[var(--text-muted)]">ID: {loadedForm.id}</p>
              <p className="text-sm font-semibold">{loadedForm.title}</p>
              <p className="text-xs text-[var(--text-secondary)] font-mono tabular-nums">
                Recorded Responses: {loadedForm.responses}
              </p>
            </div>
          )}
        </section>

        {/* Google Chat Panel */}
        <section className="lg:col-span-6 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-5 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" style={{ color: accentColor }} />
              Google Chat Course Spaces
            </h2>
            <button
              type="button"
              onClick={() => void handleLoadChatSpaces()}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-[var(--border-hairline)] hover:bg-[var(--surface-subtle)] whitespace-nowrap"
            >
              {chatEnabled ? 'Sync Spaces' : 'Disabled'}
            </button>
          </div>

          {chatError && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{chatError}</span>
              </div>
              <p className="text-[11px]">
                Google Chat API requires a Business or Enterprise Workspace account and a configured
                Chat App in Google Cloud Console:
              </p>
              <a
                href="https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat?project=gen-lang-client-0588733104"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold underline"
              >
                Open Google Chat API Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {spaces.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {spaces.map((sp) => (
                <button
                  key={sp.name}
                  type="button"
                  onClick={() => setSelectedSpace(sp.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    selectedSpace === sp.name
                      ? 'text-white border-transparent'
                      : 'border-[var(--border-hairline)] text-[var(--text-secondary)]'
                  }`}
                  style={selectedSpace === sp.name ? { backgroundColor: accentColor } : undefined}
                >
                  {sp.displayName || sp.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 min-h-[180px] max-h-64 overflow-y-auto space-y-3 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)]">
            {messages.map((m) => (
              <div key={m.name} className="space-y-0.5">
                <p className="text-xs font-semibold">{m.sender}</p>
                <p className="text-xs text-[var(--text-secondary)]">{m.text}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={draftMsg}
              onChange={(e) => setDraftMsg(e.target.value)}
              placeholder="Write a message to the course space..."
              aria-label="Course chat message"
              className="flex-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (draftMsg.trim()) setConfirmChatSendOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap"
              style={{ backgroundColor: accentColor }}
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </div>
        </section>
      </div>

      {/* Explicit Confirmation Modal for Creating Google Form */}
      {confirmFormCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-lg font-bold">Confirm Google Form Creation</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Create a new Google Form titled <strong>{newFormTitle}</strong> in your connected
              Google Workspace account?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmFormCreateOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border-hairline)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeCreateForm()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: accentColor }}
              >
                Confirm &amp; Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Confirmation Modal for Sending Google Chat Message */}
      {confirmChatSendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4 shadow-xl"
          >
            <h3 className="font-display text-lg font-bold">Confirm Sending Chat Message</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Post the following message to <strong>{selectedSpace || 'Course Space'}</strong>?
            </p>
            <blockquote className="p-3 rounded-xl bg-[var(--surface-subtle)] text-xs">
              {draftMsg}
            </blockquote>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmChatSendOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border-hairline)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void executeSendChatMessage()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: accentColor }}
              >
                Confirm &amp; Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
