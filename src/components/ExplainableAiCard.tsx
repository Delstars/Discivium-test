import React, { useState } from 'react';
import {
  Sparkles,
  Globe,
  ExternalLink,
  AlertCircle,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { useDiscivium } from '../context/DisciviumContext';

interface SourceLink {
  uri: string;
  title: string;
}

interface ExplainableAiCardProps {
  title: string;
  subtitle: string;
  flowOptions: { id: string; label: string; description: string }[];
  defaultPrompt?: string;
  contextData?: string;
  allowSearchGrounding?: boolean;
  defaultGrounded?: boolean;
}

export function ExplainableAiCard({
  title,
  subtitle,
  flowOptions,
  defaultPrompt = '',
  contextData = '',
  allowSearchGrounding = true,
  defaultGrounded = true,
}: ExplainableAiCardProps) {
  const { aiEnabled, accentColor } = useDiscivium();
  const [selectedFlow, setSelectedFlow] = useState(flowOptions[0]?.id || 'student-lesson-explainer');
  const [level, setLevel] = useState<'Simple' | 'Standard' | 'Advanced'>('Standard');
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [useGrounding, setUseGrounding] = useState(defaultGrounded);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    text: string;
    sources: SourceLink[];
    model: string;
    grounded: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (defaultPrompt) setPrompt(defaultPrompt);
  }, [defaultPrompt]);

  if (!aiEnabled) {
    return (
      <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-base font-bold">Institutional AI Layer Paused</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              An institutional administrator has disabled AI features in the Governance Feature
              Control Terminal. Re-enable <strong>aiEnabled</strong> under Registrar / Admin
              Governance to resume Gemini workflows.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Please enter a topic, question, or context to analyze.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: selectedFlow,
          prompt: prompt.trim(),
          context: contextData,
          level,
          useSearchGrounding: allowSearchGrounding && useGrounding,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI response.');
      }
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to reach Gemini endpoint.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOutput = () => {
    if (!result?.text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(result.text).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: accentColor }} />
            {title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
        </div>
        <div className="text-xs font-mono text-[var(--text-muted)]">
          Model: gemini-3-flash-preview · Explainable AI
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)]">
        {flowOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelectedFlow(opt.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              selectedFlow === opt.id
                ? 'bg-[var(--surface-bg)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {selectedFlow === 'student-lesson-explainer' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--text-secondary)] font-medium">Depth:</span>
              {(['Simple', 'Standard', 'Advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLevel(lvl)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    level === lvl
                      ? 'text-white border-transparent'
                      : 'border-[var(--border-hairline)] text-[var(--text-secondary)]'
                  }`}
                  style={level === lvl ? { backgroundColor: accentColor } : undefined}
                >
                  {lvl}
                </button>
              ))}
            </div>
          )}

          {allowSearchGrounding && (
            <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={useGrounding}
                onChange={(e) => setUseGrounding(e.target.checked)}
                className="rounded"
              />
              <Globe className="w-3.5 h-3.5" />
              <span>Ground with Google Search</span>
            </label>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            {flowOptions.find((o) => o.id === selectedFlow)?.description || 'Prompt'}
          </label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a course concept, assignment criteria, or research question..."
            className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-[var(--text-muted)]">
            Server-side GenAI · No private student identifiers transmitted.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 whitespace-nowrap shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loading ? 'Generating...' : 'Run Assistant'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}

      {result && (
        <div className="pt-4 border-t border-[var(--border-hairline)] space-y-4">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>
              Response · {result.model} ·{' '}
              {result.grounded ? 'Google Search Grounded' : 'Course Context Synthesis'}
            </span>
            <button
              type="button"
              onClick={handleCopyOutput}
              className="px-2.5 py-1 rounded-lg border border-[var(--border-hairline)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-1 text-[var(--text-secondary)]"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy Output
                </>
              )}
            </button>
          </div>
          <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
            {result.text}
          </div>

          {result.sources && result.sources.length > 0 && (
            <div className="pt-3 border-t border-[var(--border-hairline)]">
              <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                Verified Search Sources
              </div>
              <ul className="space-y-1.5">
                {result.sources.map((src, idx) => (
                  <li key={`${src.uri}_${idx}`}>
                    <a
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-md">{src.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
