import React, { useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  Upload,
  CheckCircle2,
  Clock,
  FileText,
  X,
  BookOpen,
  CreditCard,
  ShieldCheck,
  Briefcase,
  Calendar,
  Download,
  CheckSquare,
  Square,
  Receipt,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useDiscivium } from '../context/DisciviumContext';
import {
  ACADEMIC_TIMELINE,
  CAMPUS_NEWS,
  GPA_HISTORY,
  type InvoiceItem,
  type NewsArticle,
} from '../data/seedData';
import {
  calculateLetterGrade,
  checkRegistrationEligibility,
  validateAssignmentFile,
} from '../lib/discivium-rules';
import { ExplainableAiCard } from './ExplainableAiCard';

const WEEKLY_TIMETABLE = [
  { day: 'Monday', time: '10:00 – 11:30', code: 'COMP301', title: 'Software Architecture Seminar', room: 'Turing Hall 204' },
  { day: 'Monday', time: '14:00 – 15:15', code: 'MATH240', title: 'Convex Optimization Lecture', room: 'Euler Pavilion 302' },
  { day: 'Tuesday', time: '13:30 – 15:00', code: 'CS410', title: 'Distributed Consensus Lab', room: 'Ada Wing 110' },
  { day: 'Wednesday', time: '10:00 – 11:30', code: 'COMP301', title: 'Architecture ADR Studio', room: 'Turing Hall 204' },
  { day: 'Thursday', time: '09:30 – 11:30', code: 'ENG205', title: 'Technical Rhetoric Workshop', room: 'Senate Seminar 12' },
  { day: 'Thursday', time: '13:30 – 15:00', code: 'CS410', title: 'State-Machine Replication', room: 'Ada Wing 110' },
  { day: 'Friday', time: '14:00 – 15:15', code: 'MATH240', title: 'Duality & KKT Problem Session', room: 'Euler Pavilion 302' },
];

export function StudentPortal() {
  const {
    user,
    activeTab,
    setActiveTab,
    searchQuery,
    accentColor,
    privacyMode,
    setPrivacyMode,
    prefillAiTopic,
    setPrefillAiTopic,
    courses,
    enrollments,
    assignments,
    submissions,
    feedbackList,
    invoices,
    serviceRequests,
    submitAssignment,
    enrollInCourse,
    toggleCourseObjective,
    payInvoice,
    createServiceRequest,
  } = useDiscivium();

  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<{
    courseCode: string;
    title: string;
    format: string;
    size: string;
  } | null>(null);
  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<InvoiceItem | null>(null);

  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [uploadFilename, setUploadFilename] = useState('comp301_adr_submission.pdf');
  const [uploadSizeBytes, setUploadSizeBytes] = useState(1420000);
  const [uploadNotes, setUploadNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [regMessage, setRegMessage] = useState<string | null>(null);

  // Exeat / service request form state
  const [reqType, setReqType] = useState<'exeat' | 'transcript' | 'housing'>('exeat');
  const [reqTitle, setReqTitle] = useState('');
  const [reqDetails, setReqDetails] = useState('');
  const [reqNotice, setReqNotice] = useState<string | null>(null);

  const firstName = user?.displayName.split(' ')[0] || 'Scholar';
  const enrolledCourseIds = useMemo(
    () =>
      new Set(
        enrollments
          .filter((e) => e.studentUid === user?.uid && e.status === 'active')
          .map((e) => e.courseId)
      ),
    [enrollments, user?.uid]
  );

  const myCourses = useMemo(
    () =>
      courses.filter(
        (c) =>
          enrolledCourseIds.has(c.id) &&
          (!searchQuery ||
            `${c.code} ${c.title} ${c.department}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      ),
    [courses, enrolledCourseIds, searchQuery]
  );

  const visibleAssignments = useMemo(
    () =>
      assignments.filter(
        (a) =>
          a.published &&
          enrolledCourseIds.has(a.courseId) &&
          (!searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [assignments, enrolledCourseIds, searchQuery]
  );

  const mySubmissions = useMemo(
    () => submissions.filter((s) => s.studentUid === user?.uid),
    [submissions, user?.uid]
  );

  const filteredAssignments = useMemo(() => {
    return visibleAssignments.filter((asg) => {
      const sub = mySubmissions.find((s) => s.assignmentId === asg.id);
      const fb = sub ? feedbackList.find((f) => f.submissionId === sub.id) : undefined;
      if (assignmentFilter === 'pending') return !sub;
      if (assignmentFilter === 'submitted') return Boolean(sub) && !fb;
      if (assignmentFilter === 'graded') return Boolean(fb);
      return true;
    });
  }, [visibleAssignments, mySubmissions, feedbackList, assignmentFilter]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFilename(file.name);
    setUploadSizeBytes(file.size);
    setSubmitMessage(null);
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentId) return;
    const precheck = validateAssignmentFile(uploadFilename, uploadSizeBytes);
    if (!precheck.ok) {
      setSubmitMessage({ type: 'err', text: precheck.reason || 'Invalid file.' });
      return;
    }
    setSubmitting(true);
    setSubmitMessage(null);
    const res = await submitAssignment({
      assignmentId: selectedAssignmentId,
      filename: uploadFilename,
      fileSizeBytes: uploadSizeBytes,
      notes: uploadNotes,
    });
    setSubmitting(false);
    if (res.ok) {
      setSubmitMessage({
        type: 'ok',
        text: `Submitted "${uploadFilename}" cleanly. Status is now recorded for lecturer review.`,
      });
      setUploadNotes('');
    } else {
      setSubmitMessage({ type: 'err', text: res.error || 'Submission failed.' });
    }
  };

  // =========================================================================
  // TAB: OVERVIEW DASHBOARD
  // =========================================================================
  if (activeTab === 'dashboard') {
    const pendingCount = visibleAssignments.filter(
      (a) => !mySubmissions.some((s) => s.assignmentId === a.id)
    ).length;
    const totalBalanceCents = invoices.reduce(
      (sum, inv) => sum + (inv.amountCents - inv.paidCents),
      0
    );

    return (
      <div className="space-y-8">
        {/* Stacked Greeting + Date + Timetable Anchor */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Friday, November 13, 2026 · Autumn Semester Week 8
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-1 text-balance">
              Good Morning, {firstName}.
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Next seminar: <span className="font-semibold text-[var(--text-primary)]">MATH240 Duality &amp; KKT Problem Session</span> · 14:00 in Euler Pavilion 302
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setPrivacyMode(!privacyMode)}
              className="px-3.5 py-2 rounded-xl text-xs font-medium border border-[var(--border-hairline)] bg-[var(--surface-bg)] text-[var(--text-secondary)] inline-flex items-center gap-2 whitespace-nowrap"
            >
              {privacyMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {privacyMode ? 'Show Figures' : 'Privacy Mask'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assignments')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap"
              style={{ backgroundColor: accentColor }}
            >
              <span>{pendingCount} Due Tasks</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Interactive Campus News Ticker */}
        <section
          aria-label="Campus News Ticker"
          className="rounded-[20px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-4 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              University Bulletin
            </span>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              Click any brief to read
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {CAMPUS_NEWS.map((art) => (
              <button
                key={art.id}
                type="button"
                onClick={() => setSelectedArticle(art)}
                className="text-left text-xs px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)] hover:border-slate-400 transition-colors truncate"
              >
                <span className="font-mono text-[11px] text-[var(--text-muted)] mr-1.5">
                  {art.category} ·
                </span>
                {art.title}
              </button>
            ))}
          </div>
        </section>

        {/* 4-Column KPI Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5">
            <p className="text-xs text-[var(--text-muted)]">Cumulative GPA</p>
            <p className="font-mono text-3xl font-bold tabular-nums mt-2">
              {privacyMode ? '•.••' : '3.88'}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              4.00 Scale · Dean’s List Standing
            </p>
          </div>

          <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5">
            <p className="text-xs text-[var(--text-muted)]">Lecture Attendance</p>
            <p className="font-mono text-3xl font-bold tabular-nums mt-2">
              {privacyMode ? '••%' : '98%'}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              41 of 42 Autumn sessions attended
            </p>
          </div>

          <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5">
            <p className="text-xs text-[var(--text-muted)]">Cohort Rank &amp; Credits</p>
            <p className="font-mono text-3xl font-bold tabular-nums mt-2">
              {privacyMode ? 'Top •%' : 'Top 6%'}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              71 / 120 Honours Credits Completed
            </p>
          </div>

          <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5">
            <p className="text-xs text-[var(--text-muted)]">Student Finance Balance</p>
            <p className="font-mono text-3xl font-bold tabular-nums mt-2">
              {privacyMode ? '$•,•••' : `$${(totalBalanceCents / 100).toLocaleString()}`}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Fictional Demo Ledger · Due Nov 30
            </p>
          </div>
        </section>

        {/* Main 2-Column Split: GPA Trajectory + Recommended Study Coach Topic */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-bold">Academic Trajectory</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Term-by-term verified GPA across Discivium University
                </p>
              </div>
              <span className="font-mono text-xs text-[var(--text-secondary)]">+0.26 since Yr 1</span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={GPA_HISTORY} margin={{ top: 10, right: 24, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-hairline)" />
                  <XAxis dataKey="term" tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
                  <YAxis domain={[3.2, 4.0]} tick={{ fontSize: 12 }} stroke="var(--text-muted)" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="gpa"
                    stroke={accentColor}
                    fill={accentColor}
                    fillOpacity={0.14}
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 flex flex-col justify-between space-y-5">
            <div>
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Recommended Focus · COMP301
              </p>
              <h2 className="font-display text-xl font-bold mt-1">
                Modular Monolith Authorization Boundaries
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                Your ADR Baseline assignment is due Nov 18. Practice formulating server-side
                permission matrices and invariant tests with the AI Study Coach.
              </p>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-[var(--border-hairline)]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Active Modules</span>
                <span className="font-mono font-semibold tabular-nums">{myCourses.length} Enrolled</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Submitted Deliverables</span>
                <span className="font-mono font-semibold tabular-nums">
                  {mySubmissions.length} / {visibleAssignments.length}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPrefillAiTopic(
                  'Explain how a Modular Monolith enforces server-side permission matrices across Identity, Courses, and Learning modules.'
                );
                setActiveTab('ai-coach');
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              Launch AI Study Coach on This Topic
            </button>
          </div>
        </section>

        {/* Weekly Seminar & Lecture Timetable */}
        <section className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: accentColor }} />
                Weekly Academic Timetable
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Autumn 2026 scheduled lectures, labs, and studio blocks
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('courses')}
              className="text-xs font-semibold hover:underline"
              style={{ color: accentColor }}
            >
              Open Module Classrooms →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {WEEKLY_TIMETABLE.map((slot, idx) => (
              <button
                key={`${slot.code}_${idx}`}
                type="button"
                onClick={() => setActiveTab('courses')}
                className="text-left p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] hover:border-slate-400 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                  <span>{slot.day}</span>
                  <span>{slot.time}</span>
                </div>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  <span className="font-mono mr-1.5">{slot.code}</span>
                  {slot.title}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">{slot.room}</p>
              </button>
            ))}
          </div>
        </section>

        {/* News Modal */}
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={selectedArticle.title}
              className="w-full max-w-lg rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {selectedArticle.category} · {selectedArticle.date}
                  </p>
                  <h3 className="font-display text-xl font-bold mt-1">{selectedArticle.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  aria-label="Close news article"
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {selectedArticle.body}
              </p>
              <p className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-hairline)]">
                Published by {selectedArticle.author}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // TAB: MY MODULES
  // =========================================================================
  if (activeTab === 'courses') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">My Enrolled Modules</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Interactive learning objective checklists, syllabus packets, and classroom schedules.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('registration')}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white whitespace-nowrap shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            Browse Module Catalog
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myCourses.map((course) => {
            const doneCount = course.objectives.filter((o) => o.completed).length;
            const totalObj = course.objectives.length || 1;
            const pct = Math.round((doneCount / totalObj) * 100);

            return (
              <article
                key={course.id}
                className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono text-[var(--text-muted)]">
                        {course.code} · {course.credits} Credits · {course.semester}
                      </p>
                      <h2 className="font-display text-lg font-bold mt-1">{course.title}</h2>
                      <p className="text-xs italic text-[var(--text-muted)] mt-0.5">
                        “{course.motto}”
                      </p>
                    </div>
                    <span
                      className="w-3 h-3 rounded-full shrink-0 mt-1.5"
                      style={{ backgroundColor: course.accentColor }}
                    />
                  </div>

                  <p className="text-sm text-[var(--text-secondary)]">{course.description}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {course.lecturerName} · {course.schedule}
                  </p>

                  {/* Interactive Learning Objectives Checklist */}
                  <div className="pt-3 border-t border-[var(--border-hairline)] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">
                        Learning Objectives Checklist
                      </span>
                      <span className="font-mono text-[var(--text-muted)] tabular-nums">
                        {doneCount}/{course.objectives.length} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{ width: `${pct}%`, backgroundColor: course.accentColor }}
                      />
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {course.objectives.map((obj) => (
                        <button
                          key={obj.id}
                          type="button"
                          onClick={() => toggleCourseObjective(course.id, obj.id)}
                          className="w-full flex items-center gap-2.5 text-left text-xs py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          {obj.completed ? (
                            <CheckSquare className="w-3.5 h-3.5 shrink-0" style={{ color: course.accentColor }} />
                          ) : (
                            <Square className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                          )}
                          <span className={obj.completed ? 'line-through opacity-75' : ''}>
                            {obj.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Clickable Syllabus Materials */}
                <div className="pt-3 border-t border-[var(--border-hairline)] space-y-2">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Syllabus &amp; Seminar Packets
                  </p>
                  {course.materials.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setSelectedMaterial({
                          courseCode: course.code,
                          title: m.title,
                          format: m.format,
                          size: m.size,
                        })
                      }
                      className="w-full flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-1.5 px-2.5 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors"
                    >
                      <span className="inline-flex items-center gap-2 truncate">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{m.title}</span>
                      </span>
                      <span className="font-mono text-[var(--text-muted)] shrink-0 ml-2">
                        {m.format} · {m.size}
                      </span>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        {/* Syllabus Material Reader Modal */}
        {selectedMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={selectedMaterial.title}
              className="w-full max-w-lg rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-mono text-[var(--text-muted)]">
                    {selectedMaterial.courseCode} · {selectedMaterial.format} ({selectedMaterial.size})
                  </p>
                  <h3 className="font-display text-lg font-bold mt-1">{selectedMaterial.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMaterial(null)}
                  aria-label="Close material preview"
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] text-xs text-[var(--text-secondary)] space-y-2 leading-relaxed">
                <p className="font-semibold text-[var(--text-primary)]">
                  Document Abstract &amp; Seminar Guidance
                </p>
                <p>
                  This official Discivium University course packet outlines the formal invariants,
                  architectural trade-offs, and required verification steps for{' '}
                  <strong>{selectedMaterial.courseCode}</strong>. Review all sections prior to
                  submitting your PDF or DOCX coursework artifact.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMaterial(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--border-hairline)]"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob(
                      [
                        `Discivium University Course Material\nModule: ${selectedMaterial.courseCode}\nTitle: ${selectedMaterial.title}\nFormat: ${selectedMaterial.format} (${selectedMaterial.size})\n`,
                      ],
                      { type: 'text/plain;charset=utf-8' }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selectedMaterial.courseCode}_${selectedMaterial.title.replace(/\s+/g, '_')}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5"
                  style={{ backgroundColor: accentColor }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Packet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // TAB: ASSIGNMENTS & COURSEWORK SUBMISSION (Discivium Core Workflow)
  // =========================================================================
  if (activeTab === 'assignments') {
    const activeAsg = visibleAssignments.find((a) => a.id === selectedAssignmentId) || null;
    const activeCourse = activeAsg
      ? courses.find((c) => c.id === activeAsg.courseId) || null
      : null;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Assignments &amp; Submissions</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Submit PDF or DOCX deliverables (max 100 MB) and review criterion-level lecturer rubrics.
            </p>
          </div>

          {/* Interactive Status Filter Bar */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] self-start sm:self-auto">
            {(
              [
                ['all', 'All'],
                ['pending', 'Pending'],
                ['submitted', 'Submitted'],
                ['graded', 'Graded'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAssignmentFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  assignmentFilter === key
                    ? 'bg-[var(--surface-bg)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Assignment List */}
          <div className="lg:col-span-7 space-y-4">
            {filteredAssignments.map((asg) => {
              const course = courses.find((c) => c.id === asg.courseId);
              const sub = mySubmissions.find((s) => s.assignmentId === asg.id);
              const fb = sub ? feedbackList.find((f) => f.submissionId === sub.id) : undefined;
              const isSelected = selectedAssignmentId === asg.id;

              return (
                <div
                  key={asg.id}
                  className={`rounded-[24px] bg-[var(--surface-bg)] border p-5 space-y-3 transition-colors ${
                    isSelected
                      ? 'border-slate-900 dark:border-white'
                      : 'border-[var(--border-hairline)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono text-[var(--text-muted)]">
                        {course?.code} · Due {new Date(asg.dueAt).toLocaleDateString()} · {asg.maxPoints} pts
                      </p>
                      <h2 className="font-display text-base font-bold mt-1">{asg.title}</h2>
                    </div>
                    <div className="text-xs font-semibold whitespace-nowrap shrink-0">
                      {fb ? (
                        <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Graded ({fb.score}/{fb.maxPoints})
                        </span>
                      ) : sub ? (
                        <span className="text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Submitted
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Awaiting Submission
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {asg.description}
                  </p>

                  {sub && (
                    <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] text-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium inline-flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          {sub.filename}
                        </span>
                        <span className="font-mono text-[var(--text-muted)] tabular-nums">
                          {(sub.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>

                      {fb && (
                        <div className="pt-2.5 border-t border-[var(--border-hairline)] space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-[var(--text-primary)]">
                              Lecturer Feedback · Grade{' '}
                              {calculateLetterGrade((fb.score / fb.maxPoints) * 100).letter}
                            </p>
                            <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                              {fb.score} / {fb.maxPoints} pts
                            </span>
                          </div>
                          <p className="text-[var(--text-secondary)]">{fb.comment}</p>

                          {fb.rubricBreakdown && fb.rubricBreakdown.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                              {fb.rubricBreakdown.map((r, i) => (
                                <div
                                  key={i}
                                  className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-bg)] border border-[var(--border-hairline)] flex items-center justify-between"
                                >
                                  <span className="text-[11px] text-[var(--text-secondary)] truncate mr-2">
                                    {r.criterion}
                                  </span>
                                  <span className="font-mono text-[11px] font-semibold tabular-nums">
                                    {r.points}/{r.max}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssignmentId(asg.id);
                        setSubmitMessage(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white whitespace-nowrap"
                      style={{ backgroundColor: accentColor }}
                    >
                      {sub ? 'Resubmit Deliverable' : 'Open Submission Drawer'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submission Panel */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4">
              {activeAsg ? (
                <>
                  <div>
                    <p className="text-xs font-mono text-[var(--text-muted)]">
                      {activeCourse?.code} · Accepted: .pdf, .docx (max 100 MB)
                    </p>
                    <h3 className="font-display text-lg font-bold mt-1">{activeAsg.title}</h3>
                  </div>

                  <form onSubmit={handleSubmitResponse} className="space-y-4">
                    <div>
                      <label
                        htmlFor="file-upload-input"
                        className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                      >
                        Upload PDF or DOCX File
                      </label>
                      <input
                        id="file-upload-input"
                        type="file"
                        accept=".pdf,.docx"
                        onChange={handleFileInputChange}
                        className="block w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--surface-subtle)] file:text-[var(--text-primary)]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="submission-filename"
                        className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                      >
                        Deliverable Filename
                      </label>
                      <input
                        id="submission-filename"
                        type="text"
                        value={uploadFilename}
                        onChange={(e) => setUploadFilename(e.target.value)}
                        className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="submission-notes"
                        className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
                      >
                        Submission Notes (Optional)
                      </label>
                      <textarea
                        id="submission-notes"
                        rows={2}
                        value={uploadNotes}
                        onChange={(e) => setUploadNotes(e.target.value)}
                        placeholder="Summary of architecture decisions or group notes..."
                        className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
                      />
                    </div>

                    {submitMessage && (
                      <div
                        role="status"
                        className={`p-3 rounded-xl text-xs ${
                          submitMessage.type === 'ok'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {submitMessage.text}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white inline-flex items-center justify-center gap-2"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {submitting ? 'Submitting...' : 'Confirm Assignment Submission'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="py-10 text-center space-y-2">
                  <FileText className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                  <p className="text-sm font-semibold">Select an Assignment</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Choose an open module deliverable on the left to attach and submit your PDF or
                    DOCX file.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAB: COURSE REGISTRATION
  // =========================================================================
  if (activeTab === 'registration') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Module Registration</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Prerequisite verification, seat availability, and Autumn/Spring course enrollment.
          </p>
        </div>

        {regMessage && (
          <div className="p-3.5 rounded-2xl bg-[var(--surface-bg)] border border-[var(--border-hairline)] text-xs font-medium">
            {regMessage}
          </div>
        )}

        <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
                <th className="py-3.5 px-5 font-medium">Module</th>
                <th className="py-3.5 px-4 font-medium">Schedule</th>
                <th className="py-3.5 px-4 font-medium">Prerequisites</th>
                <th className="py-3.5 px-4 font-medium text-right">Credits</th>
                <th className="py-3.5 px-5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
              {courses.map((c) => {
                const eligibility = checkRegistrationEligibility({
                  course: c,
                  currentEnrollments: enrollments,
                  completedCourseCodes: ['COMP201', 'CS102', 'MATH110'],
                  studentUid: user?.uid || '',
                });
                const enrolled = enrolledCourseIds.has(c.id);

                return (
                  <tr key={c.id} className="hover:bg-[var(--surface-subtle)]">
                    <td className="py-4 px-5">
                      <div className="font-mono text-xs text-[var(--text-muted)]">{c.code}</div>
                      <div className="font-semibold">{c.title}</div>
                    </td>
                    <td className="py-4 px-4 text-xs text-[var(--text-secondary)]">{c.schedule}</td>
                    <td className="py-4 px-4 text-xs font-mono text-[var(--text-muted)]">
                      {c.prerequisites.length ? c.prerequisites.join(', ') : 'None'}
                    </td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums">{c.credits}</td>
                    <td className="py-4 px-5 text-right">
                      {enrolled ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Enrolled
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!eligibility.eligible}
                          onClick={async () => {
                            const r = await enrollInCourse(c.id);
                            setRegMessage(
                              r.ok
                                ? `Successfully enrolled in ${c.code} — ${c.title}.`
                                : r.error || 'Could not enroll.'
                            );
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-40 whitespace-nowrap"
                          style={{ backgroundColor: accentColor }}
                        >
                          Enroll
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAB: STUDENT FINANCE
  // =========================================================================
  if (activeTab === 'finance') {
    const totalAmount = invoices.reduce((s, i) => s + i.amountCents, 0);
    const totalPaid = invoices.reduce((s, i) => s + i.paidCents, 0);
    const outstanding = totalAmount - totalPaid;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Student Finance Ledger</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Demonstrative university tuition, housing, and laboratory fee ledger (fictional demo billing).
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Outstanding Balance</p>
            <p className="font-mono text-2xl font-bold tabular-nums">
              ${(outstanding / 100).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] text-xs text-[var(--text-muted)]">
                <th className="py-3.5 px-5 font-medium">Description</th>
                <th className="py-3.5 px-4 font-medium">Category</th>
                <th className="py-3.5 px-4 font-medium">Due Date</th>
                <th className="py-3.5 px-4 font-medium text-right">Amount</th>
                <th className="py-3.5 px-4 font-medium text-right">Paid</th>
                <th className="py-3.5 px-5 font-medium text-right">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] text-sm">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[var(--surface-subtle)]">
                  <td className="py-4 px-5 font-medium">{inv.title}</td>
                  <td className="py-4 px-4 text-xs text-[var(--text-secondary)]">{inv.category}</td>
                  <td className="py-4 px-4 text-xs font-mono text-[var(--text-muted)]">{inv.dueAt}</td>
                  <td className="py-4 px-4 text-right font-mono tabular-nums">
                    ${(inv.amountCents / 100).toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right font-mono tabular-nums">
                    ${(inv.paidCents / 100).toLocaleString()}
                  </td>
                  <td className="py-4 px-5 text-right">
                    {inv.status === 'paid' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptInvoice(inv)}
                        className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Settled · Receipt
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void payInvoice(inv.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white inline-flex items-center gap-1.5 whitespace-nowrap"
                        style={{ backgroundColor: accentColor }}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay Balance
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Official Payment Receipt Modal */}
        {selectedReceiptInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Official Bursar Receipt"
              className="w-full max-w-md rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4 shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono text-[var(--text-muted)]">
                    Discivium Bursar · Receipt #{selectedReceiptInvoice.id.toUpperCase()}
                  </p>
                  <h3 className="font-display text-lg font-bold mt-1">
                    Official Tuition &amp; Fee Receipt
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptInvoice(null)}
                  aria-label="Close receipt"
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Scholar</span>
                  <span className="font-semibold">{user?.displayName} ({user?.scholarOsId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Item</span>
                  <span className="font-medium text-right">{selectedReceiptInvoice.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Amount Settled</span>
                  <span className="font-mono font-bold text-emerald-600 tabular-nums">
                    ${(selectedReceiptInvoice.paidCents / 100).toLocaleString()}.00
                  </span>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedReceiptInvoice(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // TAB: CAMPUS SERVICES (Exeat, Health, Library, Career Match)
  // =========================================================================
  if (activeTab === 'services') {
    const handleCreateReq = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!reqTitle.trim() || !reqDetails.trim()) {
        setReqNotice('Please fill out both a request title and details.');
        return;
      }
      await createServiceRequest({ type: reqType, title: reqTitle, details: reqDetails });
      setReqTitle('');
      setReqDetails('');
      setReqNotice('Service request submitted to Campus Registry / Warden.');
    };

    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Campus Services &amp; Student Wellbeing</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Exeat passes, official transcript requests, residence &amp; health records, and career alignment.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Submit Exeat / Service Request */}
          <form
            onSubmit={handleCreateReq}
            className="lg:col-span-5 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold">New Campus Service / Exeat Request</h2>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Request Category
              </label>
              <select
                value={reqType}
                onChange={(e) => setReqType(e.target.value as 'exeat' | 'transcript' | 'housing')}
                className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              >
                <option value="exeat">Off-Campus Exeat / Travel Pass</option>
                <option value="transcript">Official Academic Transcript Request</option>
                <option value="housing">North Quad Residence Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Subject / Destination
              </label>
              <input
                type="text"
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                placeholder="e.g., Inter-University Systems Symposium (Oxford)"
                className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Dates &amp; Supporting Details
              </label>
              <textarea
                rows={3}
                value={reqDetails}
                onChange={(e) => setReqDetails(e.target.value)}
                placeholder="Include departure/return dates or certification recipient..."
                className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-sm"
              />
            </div>
            {reqNotice && <p className="text-xs text-emerald-600 dark:text-emerald-400">{reqNotice}</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-white"
              style={{ backgroundColor: accentColor }}
            >
              Submit Request
            </button>
          </form>

          {/* Request History + Health/Library Summary */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4">
              <h2 className="font-display text-lg font-bold">My Active Passes &amp; Requests</h2>
              <div className="divide-y divide-[var(--border-hairline)]">
                {serviceRequests.map((req) => (
                  <div key={req.id} className="py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono text-[var(--text-muted)]">
                        {req.type.toUpperCase()} · {req.createdAt}
                      </p>
                      <p className="text-sm font-semibold">{req.title}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{req.details}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold capitalize shrink-0 ${
                        req.status === 'approved'
                          ? 'text-emerald-600'
                          : req.status === 'rejected'
                            ? 'text-rose-600'
                            : 'text-amber-600'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5 space-y-2">
                <div className="flex items-center gap-2 font-display font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Health &amp; Residence Clearance
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  North Quad Suite 4B · Emergency Contact Verified · Immunizations Current
                </p>
              </div>
              <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5 space-y-2">
                <div className="flex items-center gap-2 font-display font-bold text-sm">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Career Match Alignment
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  94% Systems Architect · 91% Distributed Infrastructure Engineer · 87% Quantitative
                  Operations
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Career Search Grounding */}
        <ExplainableAiCard
          title="Career & Graduate Market Explorer"
          subtitle="Grounds your academic strengths against live graduate roles using Google Search."
          flowOptions={[
            {
              id: 'career-grounding',
              label: 'Graduate Market Match',
              description: 'Target role or industry track to evaluate against your transcript',
            },
          ]}
          defaultPrompt="What software architecture and distributed systems skills are top graduate engineering teams hiring for in 2026?"
          contextData={ACADEMIC_TIMELINE.map((t) => `${t.credential}: ${t.detail}`).join('\n')}
          defaultGrounded={true}
        />
      </div>
    );
  }

  // =========================================================================
  // TAB: AI STUDY COACH
  // =========================================================================
  if (activeTab === 'ai-coach') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Student AI Study Coach</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Powered by Gemini (`gemini-4-hydrogen`) with optional Google Search Grounding for live
            literature and standards verification.
          </p>
        </div>

        <ExplainableAiCard
          title="StudyCoachTerminal"
          subtitle="Interactive topic explanations, practice quizzes, revision schedules, and mistake breakdowns."
          flowOptions={[
            {
              id: 'student-lesson-explainer',
              label: 'Lesson Explainer',
              description: 'Topic to explain (supports Simple, Standard, or Advanced depth)',
            },
            {
              id: 'study-coach-quiz',
              label: 'Practice Quiz',
              description: 'Module or concept to generate a 4-question university check',
            },
            {
              id: 'study-coach-revision',
              label: 'Revision Planner',
              description: 'Upcoming exams or deliverables to structure into a 5-day plan',
            },
            {
              id: 'study-coach-mistake-explainer',
              label: 'Mistake Diagnostics',
              description: 'Paste a proof error, compiler trace, or design flaw for breakdown',
            },
          ]}
          defaultPrompt={
            prefillAiTopic ||
            'Explain how a Modular Monolith enforces server-side permission matrices across Identity, Courses, and Learning modules.'
          }
          contextData={myCourses.map((c) => `${c.code}: ${c.title}`).join(', ')}
          defaultGrounded={true}
        />
      </div>
    );
  }

  return null;
}
