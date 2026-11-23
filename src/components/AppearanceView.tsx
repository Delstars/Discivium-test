import React from 'react';
import { useDiscivium, type FontScale, type ThemeId } from '../context/DisciviumContext';

const THEMES: { id: ThemeId; label: string; preview: string }[] = [
  { id: 'light', label: 'Light Canvas', preview: '#F3F6F8' },
  { id: 'dark', label: 'Dark Slate', preview: '#0B1120' },
  { id: 'midnight', label: 'Midnight', preview: '#090D16' },
  { id: 'galaxy', label: 'Galaxy', preview: '#161229' },
  { id: 'aurora', label: 'Aurora', preview: '#0D2026' },
  { id: 'solar', label: 'Solar Cream', preview: '#FAF7F2' },
  { id: 'forest', label: 'Forest', preview: '#0F231B' },
  { id: 'deep-space', label: 'Deep Space', preview: '#05070C' },
];

const ACCENTS = [
  { label: 'Raspberry (Student)', hex: '#CE5D8C' },
  { label: 'Emerald (Faculty)', hex: '#10B981' },
  { label: 'Indigo (Registrar)', hex: '#6366F1' },
  { label: 'Amber (Advisor)', hex: '#F59E0B' },
  { label: 'Azure', hex: '#0284C7' },
];

export function AppearanceView() {
  const { theme, setTheme, fontScale, setFontScale, accentColor, setAccentColor } = useDiscivium();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Appearance &amp; Accessibility</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Customize workspace theme, role accent color, and typography scale.
        </p>
      </div>

      <section className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4">
        <h2 className="font-display text-base font-bold">Workspace Theme</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={`p-3.5 rounded-2xl border text-left transition-colors ${
                theme === t.id
                  ? 'border-slate-900 dark:border-white bg-[var(--surface-subtle)]'
                  : 'border-[var(--border-hairline)] hover:border-slate-400'
              }`}
            >
              <span
                className="block w-full h-10 rounded-xl border border-slate-300/40 mb-2.5"
                style={{ backgroundColor: t.preview }}
              />
              <span className="text-xs font-semibold block">{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4">
          <h2 className="font-display text-base font-bold">Accent Color</h2>
          <div className="space-y-2">
            {ACCENTS.map((a) => (
              <button
                key={a.hex}
                type="button"
                onClick={() => setAccentColor(a.hex)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium ${
                  accentColor === a.hex
                    ? 'border-slate-900 dark:border-white bg-[var(--surface-subtle)]'
                    : 'border-[var(--border-hairline)]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: a.hex }} />
                  {a.label}
                </span>
                <span className="font-mono text-[var(--text-muted)]">{a.hex}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4">
          <h2 className="font-display text-base font-bold">Typography Scale</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {(['small', 'default', 'large', 'xl'] as FontScale[]).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setFontScale(sz)}
                className={`py-3 px-4 rounded-xl border text-xs font-semibold capitalize ${
                  fontScale === sz
                    ? 'text-white border-transparent'
                    : 'border-[var(--border-hairline)] text-[var(--text-secondary)]'
                }`}
                style={fontScale === sz ? { backgroundColor: accentColor } : undefined}
              >
                {sz}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
