import React, { useState } from 'react';
import { GraduationCap, BookOpen, ShieldCheck, Users, ArrowRight } from 'lucide-react';
import { useDiscivium } from '../context/DisciviumContext';
import { ASSETS } from '../data/seedData';
import type { UserRole } from '../lib/discivium-rules';

export function LoginScreen() {
  const { loginDemoRole, loginGoogle } = useDiscivium();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setLoadingGoogle(true);
    try {
      await loginGoogle();
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Google sign-in popup was cancelled or blocked. You can also explore any role via Quick Demo Access below.'
      );
    } finally {
      setLoadingGoogle(false);
    }
  };

  const demoRoles: {
    role: UserRole;
    label: string;
    subtitle: string;
    accent: string;
    icon: React.ReactNode;
  }[] = [
    {
      role: 'student',
      label: 'Student Portal',
      subtitle: 'Coursework, registration, finance & Scholar Passport',
      accent: '#CE5D8C',
      icon: <GraduationCap className="w-4 h-4" />,
    },
    {
      role: 'lecturer',
      label: 'Lecturer / Faculty',
      subtitle: 'Publish assignments, rubric grading & AI Co-Pilot',
      accent: '#10B981',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      role: 'admin',
      label: 'Registrar / Admin',
      subtitle: 'Campus Pulse, curriculum, finance ledger & audit logs',
      accent: '#6366F1',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      role: 'advisor',
      label: 'Advisor / Guardian',
      subtitle: 'Mirror view, weekly digest, consent & fee overview',
      accent: '#F59E0B',
      icon: <Users className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[var(--canvas-bg)]">
      {/* Left Branded Architectural Panel (#1E2535) */}
      <section className="lg:col-span-6 relative bg-[#1E2535] text-white flex flex-col justify-between p-8 lg:p-14 overflow-hidden">
        <img
          src={ASSETS.campusHero}
          alt="Discivium University Courtyard at Dusk"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E2535] via-[#1E2535]/75 to-[#1E2535]/60" />

        <div className="relative z-10 flex items-center gap-3">
          <img
            src={ASSETS.passportCrest}
            alt="Discivium Institutional Crest"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover border border-white/15"
          />
          <span className="font-display text-xl font-bold tracking-tight">Discivium</span>
        </div>

        <div className="relative z-10 my-12 max-w-xl">
          <p className="text-xs font-medium tracking-wide text-slate-300 mb-3">
            University Academic OS · ScholarOS Passport Kernel
          </p>
          <h1 className="font-display text-4xl lg:text-5xl font-bold tracking-tight leading-[1.12] text-balance mb-5">
            One Platform. Every Role. Every University.
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Unifying coursework publishing and submission workflows, course registration, student
            finance ledgers, and cryptographically verifiable Lifelong Scholar Passports in one
            coherent academic workspace.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6 pt-6 border-t border-white/15 text-sm">
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums">4 Portals</p>
            <p className="text-slate-400 text-xs">Student · Faculty · Registrar · Advisor</p>
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums">SQL + NoSQL</p>
            <p className="text-slate-400 text-xs">Cloud SQL Ledger & Firestore Sync</p>
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums">Grounded AI</p>
            <p className="text-slate-400 text-xs">Study Coach & Faculty Co-Pilot</p>
          </div>
        </div>
      </section>

      {/* Right Authentication & Quick Role Access Panel */}
      <main className="lg:col-span-6 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md bg-[var(--surface-bg)] border border-[var(--border-hairline)] rounded-[24px] p-8 shadow-sm">
          <div className="mb-7">
            <h2 className="font-display text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Sign in to Discivium
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Authenticate with Google for live Cloud SQL, Firestore, Forms &amp; Chat sync, or
              launch an interactive demo role below.
            </p>
          </div>

          {authError && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-200"
            >
              {authError}
            </div>
          )}

          {/* Official Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle}
            className="gsi-material-button"
          >
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {loadingGoogle ? 'Connecting Google Workspace...' : 'Sign in with Google'}
              </span>
            </div>
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--border-hairline)]" />
            <span className="text-xs text-[var(--text-muted)]">Quick Demo Access</span>
            <div className="h-px flex-1 bg-[var(--border-hairline)]" />
          </div>

          <div className="space-y-2.5">
            {demoRoles.map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => loginDemoRole(item.role)}
                className="w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)] hover:border-slate-400 dark:hover:border-slate-600 transition-colors text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: item.accent }}
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {item.label}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] truncate">{item.subtitle}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            ))}
          </div>

          <p className="mt-6 text-xs text-[var(--text-muted)] text-center">
            Demo mode uses clearly labeled fictional university records for immediate exploration.
          </p>
        </div>
      </main>
    </div>
  );
}
