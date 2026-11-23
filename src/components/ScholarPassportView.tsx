import React, { useState } from 'react';
import {
  QrCode,
  ShieldCheck,
  Share2,
  AlertTriangle,
  X,
  Sparkles,
  Check,
  Download,
  FileText,
  Copy,
} from 'lucide-react';
import { useDiscivium } from '../context/DisciviumContext';
import { ACADEMIC_TIMELINE, ASSETS } from '../data/seedData';
import { ExplainableAiCard } from './ExplainableAiCard';

export function ScholarPassportView() {
  const {
    passport,
    updatePassportSharing,
    submitPassportDispute,
    accentColor,
    courses,
    enrollments,
    user,
  } = useDiscivium();

  const [qrOpen, setQrOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [disputeCourse, setDisputeCourse] = useState('COMP301');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSaved, setDisputeSaved] = useState(false);

  const handleTriggerConfetti = () => {
    setConfettiBurst(true);
    setTimeout(() => setConfettiBurst(false), 1800);
  };

  const handleCopyVerifyLink = () => {
    const verifyUrl = `${window.location.origin}/?verify=${passport.scholarOsId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(verifyUrl).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleExportCredentialJson = () => {
    const credentialPayload = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential', 'ScholarPassportCredential'],
      issuer: 'did:web:veritas.discivium.edu',
      issuanceDate: '2026-11-12T09:00:00Z',
      credentialSubject: {
        id: `did:discivium:${passport.scholarOsId}`,
        scholarOsId: passport.scholarOsId,
        holderName: passport.holderName,
        institution: passport.institution,
        degreeTrack: passport.degreeTrack,
        cgpa: passport.shareGpa ? '3.88' : 'Redacted by Holder Consent',
        verifiedTimeline: ACADEMIC_TIMELINE,
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: '2026-11-12T09:00:00Z',
        verificationMethod: 'did:web:veritas.discivium.edu#key-1',
        proofPurpose: 'assertionMethod',
        jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..9f82b1c4e9a701d',
      },
    };
    const blob = new Blob([JSON.stringify(credentialPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${passport.scholarOsId}-verifiable-credential.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmitDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    submitPassportDispute(disputeCourse, disputeReason);
    setDisputeReason('');
    setDisputeSaved(true);
    setTimeout(() => setDisputeSaved(false), 3000);
  };

  const activeEnrollments = enrollments.filter(
    (e) => e.studentUid === (user?.uid || 'demo_student_maya') && e.status === 'active'
  );
  const activeCourseCount = activeEnrollments.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Lifelong Scholar Passport</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Cryptographically verifiable university credential identity, cross-institution timeline,
            and consent controls.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTranscriptOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--surface-bg)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            Official Transcript
          </button>
          <button
            type="button"
            onClick={handleExportCredentialJson}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--surface-bg)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export W3C JSON
          </button>
        </div>
      </div>

      {/* Identity Card + QR Trigger */}
      <section className="rounded-[24px] bg-[#1E2535] text-white p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={ASSETS.passportCrest}
            alt="Veritas Seal"
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-2xl object-cover border border-white/20 shrink-0"
          />
          <div>
            <p className="text-xs font-mono text-slate-300">
              {passport.scholarOsId} · Passport Integrity: 100% Verified
            </p>
            <h2 className="font-display text-2xl font-bold mt-1">{passport.holderName}</h2>
            <p className="text-sm text-slate-300 mt-0.5">
              {passport.institution} · {passport.degreeTrack}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyVerifyLink}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Verification Link Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Verification Link
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-2 whitespace-nowrap"
            style={{ backgroundColor: accentColor }}
          >
            <QrCode className="w-4 h-4" />
            QR Enrollment Card
          </button>
        </div>
      </section>

      {/* Academic Timeline + Granular Sharing Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Verified Academic Timeline</h3>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              Ed25519 Attested
            </span>
          </div>
          <div className="divide-y divide-[var(--border-hairline)]">
            {ACADEMIC_TIMELINE.map((item) => (
              <div key={item.id} className="py-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>
                    {item.period} · {item.institution}
                  </span>
                  <span className="font-mono">{item.verifiedHash}</span>
                </div>
                <p className="text-sm font-semibold">{item.credential}</p>
                <p className="text-xs text-[var(--text-secondary)]">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4" style={{ color: accentColor }} />
            <h3 className="font-display text-lg font-bold">Employer &amp; University Sharing</h3>
          </div>
          <div className="space-y-3 text-sm">
            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] cursor-pointer">
              <div>
                <div className="font-medium text-xs">Graduate Employers</div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Allow verified competency checks via QR token
                </div>
              </div>
              <input
                type="checkbox"
                checked={passport.shareWithEmployers}
                onChange={(e) =>
                  updatePassportSharing({ shareWithEmployers: e.target.checked })
                }
              />
            </label>

            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] cursor-pointer">
              <div>
                <div className="font-medium text-xs">Partner Universities</div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Enable instant ECTS / credit transfer verification
                </div>
              </div>
              <input
                type="checkbox"
                checked={passport.shareWithUniversities}
                onChange={(e) =>
                  updatePassportSharing({ shareWithUniversities: e.target.checked })
                }
              />
            </label>

            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] cursor-pointer">
              <div>
                <div className="font-medium text-xs">Include Numerical GPA</div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Display 3.88 CGPA alongside letter standing
                </div>
              </div>
              <input
                type="checkbox"
                checked={passport.shareGpa}
                onChange={(e) => updatePassportSharing({ shareGpa: e.target.checked })}
              />
            </label>
          </div>
        </section>
      </div>

      {/* Smart Resume Personal Statement AI */}
      <ExplainableAiCard
        title="Smart Resume & Personal Statement Generator"
        subtitle="Synthesizes verified Scholar Passport credentials into a tailored graduate or fellowship statement."
        flowOptions={[
          {
            id: 'resume-personal-statement',
            label: 'Personal Statement',
            description: 'Target degree program, research lab, or engineering fellowship',
          },
        ]}
        defaultPrompt="Draft a concise 200-word personal statement for a Distributed Systems & Software Architecture summer research fellowship."
        contextData={`Scholar: ${passport.holderName} (${passport.scholarOsId})\nActive Modules: ${activeCourseCount}\nCourses: ${courses.map((c) => c.title).join(', ')}`}
        allowSearchGrounding={false}
      />

      {/* Grade / Credential Dispute Wizard */}
      <section className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h3 className="font-display text-lg font-bold">Academic Record Dispute Wizard</h3>
        </div>
        <form onSubmit={handleSubmitDispute} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Module Code
            </label>
            <input
              type="text"
              value={disputeCourse}
              onChange={(e) => setDisputeCourse(e.target.value)}
              className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono"
            />
          </div>
          <div className="md:col-span-7">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Discrepancy or Grade Review Rationale
            </label>
            <input
              type="text"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe the missing credit, rubric discrepancy, or attestation issue..."
              className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-white whitespace-nowrap"
              style={{ backgroundColor: accentColor }}
            >
              Submit Dispute
            </button>
          </div>
        </form>

        {disputeSaved && (
          <p className="text-xs text-emerald-600 inline-flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            Dispute logged with Academic Registry and appended to audit history.
          </p>
        )}

        {passport.disputes.length > 0 && (
          <div className="pt-3 border-t border-[var(--border-hairline)] space-y-2">
            {passport.disputes.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-xs">
                <span>
                  <strong className="font-mono">{d.courseCode}</strong> · {d.reason}
                </span>
                <span
                  className={`font-mono uppercase font-semibold ${
                    d.status === 'resolved' ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Official Academic Transcript Modal */}
      {transcriptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Official Academic Transcript"
            className="w-full max-w-2xl rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 sm:p-8 space-y-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
              <div>
                <p className="text-xs font-mono text-[var(--text-muted)]">
                  OFFICE OF THE UNIVERSITY REGISTRAR · OFFICIAL RECORD
                </p>
                <h2 className="font-display text-xl font-bold mt-1">
                  {passport.institution} — Certified Academic Transcript
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Scholar: <strong>{passport.holderName}</strong> ({passport.scholarOsId}) ·{' '}
                  {passport.degreeTrack}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTranscriptOpen(false)}
                aria-label="Close transcript"
                className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] text-[var(--text-muted)]">
                    <th className="py-2.5 pr-3 font-medium">Code</th>
                    <th className="py-2.5 px-3 font-medium">Module Title</th>
                    <th className="py-2.5 px-3 font-medium text-right">Credits</th>
                    <th className="py-2.5 px-3 font-medium text-right">Numeric</th>
                    <th className="py-2.5 pl-3 font-medium text-right">Standing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)]">
                  {courses.map((course) => {
                    const isEnrolled = activeEnrollments.some((e) => e.courseId === course.id);
                    if (!isEnrolled) return null;
                    const standingMap: Record<string, { score: number; grade: string }> = {
                      COMP301: { score: 92, grade: 'A' },
                      CS410: { score: 89, grade: 'A-' },
                      MATH240: { score: 94, grade: 'A' },
                      ENG205: { score: 91, grade: 'A' },
                    };
                    const standing = standingMap[course.code] || { score: 90, grade: 'A' };
                    return (
                      <tr key={course.id}>
                        <td className="py-2.5 pr-3 font-mono font-semibold">{course.code}</td>
                        <td className="py-2.5 px-3">{course.title}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {course.credits}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {standing.score}%
                        </td>
                        <td className="py-2.5 pl-3 text-right font-mono font-bold">
                          {standing.grade}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[var(--text-muted)]">Cumulative Standing: </span>
                <strong className="font-mono tabular-nums">
                  {passport.shareGpa ? '3.88 / 4.00 CGPA (First-Class Honours)' : 'First-Class Honours'}
                </strong>
              </div>
              <span className="font-mono text-[11px] text-emerald-600">
                SHA-256: 0x94f2...c81a · Verified
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleExportCredentialJson}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] hover:bg-[var(--surface-subtle)] inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Signed JSON
              </button>
              <button
                type="button"
                onClick={() => setTranscriptOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ backgroundColor: accentColor }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Enrollment Card Modal with Interactive Confetti Easter Egg */}
      {qrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="QR Enrollment Card"
            className="relative w-full max-w-sm rounded-[24px] bg-[#1E2535] text-white p-6 space-y-5 shadow-2xl border border-white/15 overflow-hidden"
          >
            {confettiBurst && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-6 gap-3 opacity-90 animate-bounce">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{
                        backgroundColor: ['#CE5D8C', '#10B981', '#6366F1', '#F59E0B'][i % 4],
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Verified Campus Credential
              </div>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                aria-label="Close QR card"
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white rounded-2xl p-5 flex flex-col items-center text-slate-900">
              {/* Deterministic SVG QR Code Pattern */}
              <svg
                viewBox="0 0 120 120"
                className="w-40 h-40"
                role="img"
                aria-label={`QR verification code for ${passport.scholarOsId}`}
              >
                <rect width="120" height="120" fill="#ffffff" />
                <rect x="8" y="8" width="28" height="28" fill="#1E2535" />
                <rect x="14" y="14" width="16" height="16" fill="#ffffff" />
                <rect x="18" y="18" width="8" height="8" fill="#1E2535" />
                <rect x="84" y="8" width="28" height="28" fill="#1E2535" />
                <rect x="90" y="14" width="16" height="16" fill="#ffffff" />
                <rect x="94" y="18" width="8" height="8" fill="#1E2535" />
                <rect x="8" y="84" width="28" height="28" fill="#1E2535" />
                <rect x="14" y="90" width="16" height="16" fill="#ffffff" />
                <rect x="18" y="94" width="8" height="8" fill="#1E2535" />
                <rect x="46" y="14" width="8" height="8" fill="#1E2535" />
                <rect x="62" y="14" width="12" height="8" fill="#1E2535" />
                <rect x="46" y="30" width="16" height="8" fill="#1E2535" />
                <rect x="16" y="48" width="12" height="8" fill="#1E2535" />
                <rect x="38" y="48" width="20" height="12" fill="#1E2535" />
                <rect x="68" y="48" width="14" height="8" fill="#1E2535" />
                <rect x="92" y="48" width="12" height="16" fill="#1E2535" />
                <rect x="48" y="70" width="16" height="16" fill="#1E2535" />
                <rect x="74" y="74" width="12" height="12" fill="#1E2535" />
                <rect x="94" y="88" width="16" height="16" fill="#1E2535" />
                <rect x="52" y="96" width="22" height="12" fill="#1E2535" />
              </svg>
              <p className="font-mono text-xs font-semibold mt-3">{passport.scholarOsId}</p>
            </div>

            <button
              type="button"
              onClick={handleTriggerConfetti}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Verify &amp; Celebrate Credential
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
