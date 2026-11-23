import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useDiscivium } from '../context/DisciviumContext';
import { ACADEMIC_TIMELINE, GPA_HISTORY } from '../data/seedData';
import { ExplainableAiCard } from './ExplainableAiCard';

const LINKED_SCHOLARS = [
  { id: 'maya', name: 'Maya Chen', track: 'BSc Computer Science · Year 3', gpa: '3.88', attendance: '98%' },
  { id: 'ethan', name: 'Ethan Chen', track: 'MEng Robotics · Year 1', gpa: '3.64', attendance: '94%' },
];

export function AdvisorPortal() {
  const { activeTab, accentColor, invoices, passport, updatePassportSharing } = useDiscivium();
  const [selectedScholar, setSelectedScholar] = useState(LINKED_SCHOLARS[0].id);
  const [density, setDensity] = useState<'detailed' | 'summary' | 'minimal'>('detailed');
  const [tripConsent, setTripConsent] = useState(true);
  const [medicalConsent, setMedicalConsent] = useState(true);
  const [advisorNote, setAdvisorNote] = useState('');
  const [sentNotes, setSentNotes] = useState<string[]>([
    'Confirmed Autumn travel exeat itinerary with North Quad Warden.',
  ]);

  const scholar = LINKED_SCHOLARS.find((s) => s.id === selectedScholar) || LINKED_SCHOLARS[0];

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Advisor &amp; Guardian Mirror</p>
            <h1 className="font-display text-3xl font-bold mt-1">{scholar.name}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{scholar.track}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select linked scholar"
              value={selectedScholar}
              onChange={(e) => setSelectedScholar(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--surface-bg)] border border-[var(--border-hairline)]"
            >
              {LINKED_SCHOLARS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="flex p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)]">
              {(['detailed', 'summary', 'minimal'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDensity(d)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize ${
                    density === d ? 'bg-[var(--surface-bg)] shadow-sm' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5">
            <p className="text-xs text-[var(--text-muted)]">Current CGPA</p>
            <p className="font-mono text-3xl font-bold tabular-nums mt-2">{scholar.gpa}</p>
          </div>
          <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5">
            <p className="text-xs text-[var(--text-muted)]">Attendance Rate</p>
            <p className="font-mono text-3xl font-bold tabular-nums mt-2">{scholar.attendance}</p>
          </div>
          <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5">
            <p className="text-xs text-[var(--text-muted)]">Academic Standing</p>
            <p className="font-display text-xl font-bold mt-3">Good Standing</p>
          </div>
        </div>

        {density !== 'minimal' && (
          <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6">
            <h2 className="font-display text-lg font-bold mb-4">Term GPA &amp; Attendance Trend</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={GPA_HISTORY} margin={{ top: 10, right: 24, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hairline)" />
                  <XAxis dataKey="term" tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
                  <YAxis domain={[3.2, 4.0]} tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
                  <Tooltip />
                  <Line type="monotone" dataKey="gpa" stroke={accentColor} strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'history') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Academic History &amp; Weekly Digest</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Verified milestones and weekly summary for {scholar.name}.
          </p>
        </div>

        <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 divide-y divide-[var(--border-hairline)]">
          {ACADEMIC_TIMELINE.map((item) => (
            <div key={item.id} className="py-4 space-y-1">
              <p className="text-xs font-mono text-[var(--text-muted)]">
                {item.period} · {item.institution}
              </p>
              <p className="text-sm font-semibold">{item.credential}</p>
              <p className="text-xs text-[var(--text-secondary)]">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'consent') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Wellbeing &amp; Consent Panel</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Manage field trip permissions, medical emergency authorizations, and passport visibility.
          </p>
        </div>

        <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-3">
          <label className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] cursor-pointer">
            <span className="text-sm font-medium">Academic Trips &amp; Symposium Travel Consent</span>
            <input
              type="checkbox"
              checked={tripConsent}
              onChange={(e) => setTripConsent(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] cursor-pointer">
            <span className="text-sm font-medium">Campus Health Clinic Emergency Authorization</span>
            <input
              type="checkbox"
              checked={medicalConsent}
              onChange={(e) => setMedicalConsent(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] cursor-pointer">
            <span className="text-sm font-medium">Share Scholar Passport with Partner Universities</span>
            <input
              type="checkbox"
              checked={passport.shareWithUniversities}
              onChange={(e) =>
                updatePassportSharing({ shareWithUniversities: e.target.checked })
              }
            />
          </label>
        </div>
      </div>
    );
  }

  if (activeTab === 'ai-support') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Guardian &amp; Advisor AI Digest</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Plain-language academic summary grounded in current coursework and attendance records.
          </p>
        </div>

        <ExplainableAiCard
          title="ParentAcademicSummary"
          subtitle="Translates university module progress into clear advisor guidance."
          flowOptions={[
            {
              id: 'parent-academic-summary',
              label: 'Weekly Plain-Language Digest',
              description: 'Specific question or focus area for the weekly digest',
            },
          ]}
          defaultPrompt={`Summarize ${scholar.name}'s Autumn 2026 academic progress, strengths, and upcoming coursework deadlines.`}
          contextData={`CGPA: ${scholar.gpa}, Attendance: ${scholar.attendance}, Track: ${scholar.track}`}
          allowSearchGrounding={false}
        />
      </div>
    );
  }

  if (activeTab === 'finance') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Tuition Overview &amp; Faculty Messaging</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Review semester fee balances and send direct notes to module conveners.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-3">
            <h2 className="font-display text-base font-bold">Fee Summary (Fictional Demo)</h2>
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between py-2 border-b border-[var(--border-hairline)] last:border-0 text-xs"
              >
                <span>{inv.title}</span>
                <span className="font-mono tabular-nums">
                  ${(inv.paidCents / 100).toLocaleString()} / ${(inv.amountCents / 100).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div className="lg:col-span-6 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4">
            <h2 className="font-display text-base font-bold">Faculty &amp; Warden Messaging</h2>
            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              {sentNotes.map((n, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[var(--surface-subtle)]">
                  {n}
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!advisorNote.trim()) return;
                setSentNotes((prev) => [...prev, advisorNote.trim()]);
                setAdvisorNote('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={advisorNote}
                onChange={(e) => setAdvisorNote(e.target.value)}
                placeholder="Message Prof. Vance or Senior Warden..."
                className="flex-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: accentColor }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
