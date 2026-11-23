import React, { useState } from 'react';
import {
  Check,
  X,
  ShieldCheck,
  SlidersHorizontal,
  Plus,
  Download,
  RotateCcw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useDiscivium } from '../context/DisciviumContext';

const FINANCE_COLLECTION = [
  { term: 'Aut 25', collected: 412, pending: 18 },
  { term: 'Spr 26', collected: 428, pending: 12 },
  { term: 'Aut 26', collected: 446, pending: 29 },
];

export function AdminPortal() {
  const {
    activeTab,
    accentColor,
    courses,
    createCourse,
    serviceRequests,
    decideServiceRequest,
    passport,
    resolvePassportDispute,
    aiEnabled,
    setAiEnabled,
    formsEnabled,
    setFormsEnabled,
    chatEnabled,
    setChatEnabled,
    auditLogs,
    appendAuditLog,
    resetDemoData,
  } = useDiscivium();

  const [visibleWidgets, setVisibleWidgets] = useState({
    alerts: true,
    backlog: true,
    pipeline: true,
    finance: true,
  });

  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDept, setNewDept] = useState('Computer Science');
  const [newCredits, setNewCredits] = useState(15);
  const [newCapacity, setNewCapacity] = useState(40);
  const [newSchedule, setNewSchedule] = useState('Wed 14:00 - 16:00 · Room B-204');
  const [courseAddedMsg, setCourseAddedMsg] = useState(false);

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newTitle.trim()) return;
    createCourse({
      code: newCode.trim().toUpperCase(),
      title: newTitle.trim(),
      department: newDept.trim(),
      credits: Number(newCredits) || 15,
      capacity: Number(newCapacity) || 40,
      schedule: newSchedule.trim(),
    });
    setNewCode('');
    setNewTitle('');
    setCourseAddedMsg(true);
    setTimeout(() => setCourseAddedMsg(false), 3000);
  };

  const handleExportAuditCsv = () => {
    const header = 'ID,Timestamp,Actor,Action,Target\n';
    const rows = auditLogs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.actor}","${l.action.replace(/"/g, '""')}","${l.target.replace(/"/g, '""')}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'discivium-immutable-audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">
              Institutional Terminal · Office of the Academic Registrar
            </p>
            <h1 className="font-display text-3xl font-bold mt-1">Campus Pulse</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['alerts', 'Critical Alerts'],
                ['backlog', 'Grading Backlog'],
                ['pipeline', 'Enrollment'],
                ['finance', 'Tuition Ledger'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setVisibleWidgets((w) => ({ ...w, [key]: !w[key] }))
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  visibleWidgets[key]
                    ? 'text-white border-transparent'
                    : 'border-[var(--border-hairline)] text-[var(--text-secondary)]'
                }`}
                style={visibleWidgets[key] ? { backgroundColor: accentColor } : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleWidgets.alerts && (
            <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-2">
              <p className="text-xs text-[var(--text-muted)]">Critical Academic Alerts</p>
              <p className="font-mono text-3xl font-bold tabular-nums">3 Scholars</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Flagged for attendance &lt; 80% or 2+ late coursework deliverables.
              </p>
            </div>
          )}
          {visibleWidgets.backlog && (
            <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-2">
              <p className="text-xs text-[var(--text-muted)]">Faculty Grading Backlog</p>
              <p className="font-mono text-3xl font-bold tabular-nums">14 Submissions</p>
              <p className="text-xs text-[var(--text-secondary)]">
                94.2% of Autumn Week 8 coursework graded within 48h SLA.
              </p>
            </div>
          )}
          {visibleWidgets.pipeline && (
            <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-2">
              <p className="text-xs text-[var(--text-muted)]">Spring 2027 Registration Pipeline</p>
              <p className="font-mono text-3xl font-bold tabular-nums">1,284 Active</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Prerequisite verification rules synchronized across 4 departments.
              </p>
            </div>
          )}
          {visibleWidgets.finance && (
            <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-2">
              <p className="text-xs text-[var(--text-muted)]">Tuition &amp; Housing Collection</p>
              <p className="font-mono text-3xl font-bold tabular-nums">93.9%</p>
              <p className="text-xs text-[var(--text-secondary)]">
                $4.46M settled · $290k pending installment schedules (demo figures).
              </p>
            </div>
          )}
        </section>
      </div>
    );
  }

  if (activeTab === 'structure') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Academic Structure &amp; Curriculum</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            University module catalog, credit weightings, and prerequisite graph.
          </p>
        </div>

        {/* Add University Module Form */}
        <form
          onSubmit={handleAddCourse}
          className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" style={{ color: accentColor }} />
              Add University Module to Catalog
            </h2>
            {courseAddedMsg && (
              <span className="text-xs font-semibold text-emerald-600">
                Module added to catalog &amp; audit log
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                Module Code
              </label>
              <input
                type="text"
                placeholder="e.g. CS450"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                Module Title
              </label>
              <input
                type="text"
                placeholder="Formal Verification & Cryptography"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                Department
              </label>
              <input
                type="text"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                Credits / Cap
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={newCredits}
                  onChange={(e) => setNewCredits(Number(e.target.value))}
                  className="w-1/2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-2.5 py-2 text-xs font-mono tabular-nums"
                />
                <input
                  type="number"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="w-1/2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-2.5 py-2 text-xs font-mono tabular-nums"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-white whitespace-nowrap"
                style={{ backgroundColor: accentColor }}
              >
                Add Module
              </button>
            </div>
          </div>
        </form>

        <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
                <th className="py-3.5 px-5 font-medium">Code</th>
                <th className="py-3.5 px-4 font-medium">Module Title</th>
                <th className="py-3.5 px-4 font-medium">Department</th>
                <th className="py-3.5 px-4 font-medium">Lecturer</th>
                <th className="py-3.5 px-4 font-medium text-right">Credits</th>
                <th className="py-3.5 px-5 font-medium text-right">Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
              {courses.map((c) => (
                <tr key={c.id}>
                  <td className="py-3.5 px-5 font-mono text-xs font-semibold">{c.code}</td>
                  <td className="py-3.5 px-4 font-medium">{c.title}</td>
                  <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)]">{c.department}</td>
                  <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)]">{c.lecturerName}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">{c.credits}</td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums">{c.capacity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeTab === 'people') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">People, Admissions &amp; Service Decisions</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Approve or decline student exeat passes, transcript requests, and credential disputes.
          </p>
        </div>

        <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)]">
          {serviceRequests.map((req) => (
            <div key={req.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-[var(--text-muted)]">
                  {req.studentName} · {req.type.toUpperCase()} · {req.createdAt}
                </p>
                <p className="text-sm font-semibold mt-0.5">{req.title}</p>
                <p className="text-xs text-[var(--text-secondary)]">{req.details}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {req.status === 'pending' ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        decideServiceRequest(req.id, 'approved', 'Approved by Registrar.')
                      }
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white inline-flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        decideServiceRequest(req.id, 'rejected', 'Additional docs needed.')
                      }
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white inline-flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                  </>
                ) : (
                  <span className="text-xs font-semibold capitalize">{req.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Scholar Passport Credential Disputes */}
        <section className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4">
          <h2 className="font-display text-base font-bold">
            Scholar Passport Grade &amp; Attestation Disputes
          </h2>
          {passport.disputes.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)]">
              No active grade or credential disputes queued with the Academic Registry.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {passport.disputes.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <span className="font-mono font-semibold">{d.courseCode}</span> · {d.reason}
                  </div>
                  {d.status === 'open' ? (
                    <button
                      type="button"
                      onClick={() => resolvePassportDispute(d.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white"
                    >
                      Resolve &amp; Attest
                    </button>
                  ) : (
                    <span className="font-mono text-emerald-600 uppercase font-semibold">
                      Resolved
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  if (activeTab === 'finance') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Institutional Finance &amp; Fee Ledger</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Semester tuition collection vs pending installments ($ thousands, demo ledger).
          </p>
        </div>

        <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FINANCE_COLLECTION}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hairline)" />
                <XAxis dataKey="term" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" />
                <Tooltip />
                <Bar dataKey="collected" name="Collected ($k)" fill={accentColor} radius={[8, 8, 0, 0]} />
                <Bar dataKey="pending" name="Pending ($k)" fill="#94A3B8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'governance') {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">
              Feature Control, AI Transparency &amp; Audit Log
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Institutional capability flags and immutable governance event ledger.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportAuditCsv}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--surface-bg)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Audit CSV
            </button>
            <button
              type="button"
              onClick={resetDemoData}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--surface-bg)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-1.5 text-rose-600"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demo State
            </button>
          </div>
        </div>

        <section className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4">
          <h2 className="font-display text-base font-bold flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" style={{ color: accentColor }} />
            Feature Control Terminal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] cursor-pointer">
              <div>
                <p className="text-xs font-semibold">Institutional AI Layer (aiEnabled)</p>
                <p className="text-[11px] text-[var(--text-muted)]">Gates Study Coach &amp; Co-Pilot</p>
              </div>
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => {
                  setAiEnabled(e.target.checked);
                  appendAuditLog('Toggled Institutional AI', `aiEnabled = ${e.target.checked}`);
                }}
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] cursor-pointer">
              <div>
                <p className="text-xs font-semibold">Google Forms Integration</p>
                <p className="text-[11px] text-[var(--text-muted)]">Coursework surveys &amp; quizzes</p>
              </div>
              <input
                type="checkbox"
                checked={formsEnabled}
                onChange={(e) => {
                  setFormsEnabled(e.target.checked);
                  appendAuditLog('Toggled Google Forms', `formsEnabled = ${e.target.checked}`);
                }}
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] cursor-pointer">
              <div>
                <p className="text-xs font-semibold">Google Chat Spaces</p>
                <p className="text-[11px] text-[var(--text-muted)]">Cohort seminar channels</p>
              </div>
              <input
                type="checkbox"
                checked={chatEnabled}
                onChange={(e) => {
                  setChatEnabled(e.target.checked);
                  appendAuditLog('Toggled Google Chat', `chatEnabled = ${e.target.checked}`);
                }}
              />
            </label>
          </div>
        </section>

        <section className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] overflow-hidden">
          <div className="p-5 border-b border-[var(--border-hairline)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" style={{ color: accentColor }} />
            <h2 className="font-display text-base font-bold">System Audit Log (Immutable)</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
                <th className="py-3 px-5 font-medium">Timestamp</th>
                <th className="py-3 px-4 font-medium">Actor</th>
                <th className="py-3 px-4 font-medium">Action</th>
                <th className="py-3 px-5 font-medium">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-xs">
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 px-5 font-mono text-[var(--text-muted)]">{log.timestamp}</td>
                  <td className="py-3 px-4 font-medium">{log.actor}</td>
                  <td className="py-3 px-4">{log.action}</td>
                  <td className="py-3 px-5 font-mono text-[var(--text-secondary)]">{log.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    );
  }

  return null;
}
