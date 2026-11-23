import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  BookOpen,
  Calendar,
  Award,
  FileCheck2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useDiscivium } from '../context/DisciviumContext';
import { STUDENT_RISK_ROSTER } from '../data/seedData';
import { assessAcademicRisk, calculateLetterGrade } from '../lib/discivium-rules';
import { ExplainableAiCard } from './ExplainableAiCard';

const STUDENT_NAMES: Record<string, string> = {
  demo_student_maya: 'Maya Chen · DISC-2026-8841',
  demo_student_liam: 'Liam Okafor · DISC-2026-9012',
  demo_student_nadia: 'Nadia Al-Mansoor · DISC-2026-8754',
};

export function LecturerPortal() {
  const {
    user,
    activeTab,
    setActiveTab,
    accentColor,
    courses,
    assignments,
    submissions,
    feedbackList,
    publishAssignment,
    toggleAssignmentPublished,
    saveFeedback,
    customizeCourse,
    appendAuditLog,
  } = useDiscivium();

  const myCourses = useMemo(
    () => courses.filter((c) => c.lecturerUid === user?.uid),
    [courses, user?.uid]
  );

  // Assignment publisher state
  const [newCourseId, setNewCourseId] = useState(myCourses[0]?.id || 'course_comp301');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDue, setNewDue] = useState('2026-11-28');
  const [newPublished, setNewPublished] = useState(true);
  const [publishNotice, setPublishNotice] = useState<string | null>(null);

  // Interactive 3-Criterion Rubric grading state
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [critArchitecture, setCritArchitecture] = useState(36); // max 40
  const [critVerification, setCritVerification] = useState(31); // max 35
  const [critProse, setCritProse] = useState(21); // max 25
  const [commentInput, setCommentInput] = useState(
    'Strong structural boundaries and complete permission verification.'
  );
  const [gradeNotice, setGradeNotice] = useState<string | null>(null);

  const computedTotalScore = critArchitecture + critVerification + critProse;

  // Room booking & commendation quick state
  const [bookedRoom, setBookedRoom] = useState('Turing Hall 204 · Thu 15:00');
  const [commendationStudent, setCommendationStudent] = useState('Maya Chen');
  const [commendationNote, setCommendationNote] = useState('');
  const [commendationSaved, setCommendationSaved] = useState(false);

  const myCourseIds = useMemo(() => new Set(myCourses.map((c) => c.id)), [myCourses]);
  const myAssignments = useMemo(
    () => assignments.filter((a) => myCourseIds.has(a.courseId)),
    [assignments, myCourseIds]
  );
  const mySubmissions = useMemo(
    () => submissions.filter((s) => myCourseIds.has(s.courseId)),
    [submissions, myCourseIds]
  );

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    const res = publishAssignment({
      courseId: newCourseId,
      title: newTitle,
      description: newDesc,
      dueAt: `${newDue}T23:59:00Z`,
      maxPoints: 100,
      published: newPublished,
    });
    if (res.ok) {
      setPublishNotice(
        newPublished
          ? `Published "${newTitle}" to enrolled students.`
          : `Saved "${newTitle}" as an unpublished lecturer draft.`
      );
      setNewTitle('');
      setNewDesc('');
    } else {
      setPublishNotice(res.error || 'Could not publish.');
    }
  };

  const handleSelectSubmissionForGrading = (subId: string) => {
    setSelectedSubId(subId);
    setGradeNotice(null);
    const existingFb = feedbackList.find((f) => f.submissionId === subId);
    if (existingFb && existingFb.rubricBreakdown?.length === 3) {
      setCritArchitecture(existingFb.rubricBreakdown[0].points);
      setCritVerification(existingFb.rubricBreakdown[1].points);
      setCritProse(existingFb.rubricBreakdown[2].points);
      setCommentInput(existingFb.comment);
    } else if (existingFb) {
      setCritArchitecture(Math.round(existingFb.score * 0.4));
      setCritVerification(Math.round(existingFb.score * 0.35));
      setCritProse(existingFb.score - Math.round(existingFb.score * 0.4) - Math.round(existingFb.score * 0.35));
      setCommentInput(existingFb.comment);
    } else {
      setCritArchitecture(36);
      setCritVerification(31);
      setCritProse(21);
      setCommentInput('Strong structural boundaries and complete permission verification.');
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId) return;
    const res = await saveFeedback({
      submissionId: selectedSubId,
      score: computedTotalScore,
      comment: commentInput,
      rubricBreakdown: [
        { criterion: 'Architectural Clarity', points: critArchitecture, max: 40 },
        { criterion: 'Verification & Rules', points: critVerification, max: 35 },
        { criterion: 'Technical Prose', points: critProse, max: 25 },
      ],
    });
    if (res.ok) {
      setGradeNotice(`Released ${computedTotalScore}/100 (${calculateLetterGrade(computedTotalScore).letter}) rubric feedback to student.`);
    } else {
      setGradeNotice(res.error || 'Failed to save feedback.');
    }
  };

  if (activeTab === 'dashboard') {
    const ungradedCount = mySubmissions.filter(
      (s) => !feedbackList.some((f) => f.submissionId === s.id)
    ).length;

    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">
              Faculty Management · School of Computing &amp; Systems
            </p>
            <h1 className="font-display text-3xl font-bold mt-1">
              Welcome, {user?.displayName}.
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('gradebook')}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white whitespace-nowrap shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            Review Grading Queue ({ungradedCount})
          </button>
        </div>

        {/* KPI Row */}
        <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5">
            <p className="text-xs text-[var(--text-muted)]">Active Courses</p>
            <p className="font-mono text-3xl font-bold tabular-nums mt-2">{myCourses.length}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Autumn 2026 Load</p>
          </div>
          <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5">
            <p className="text-xs text-[var(--text-muted)]">Ungraded Submissions</p>
            <p className="font-mono text-3xl font-bold tabular-nums mt-2">{ungradedCount}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Awaiting Rubric Feedback</p>
          </div>
          <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5">
            <p className="text-xs text-[var(--text-muted)]">CPD Hours Logged</p>
            <p className="font-mono text-3xl font-bold tabular-nums mt-2">18.5h</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Target: 24h Academic Year</p>
          </div>
          <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-5">
            <p className="text-xs text-[var(--text-muted)]">Next Reserved Room</p>
            <p className="font-mono text-sm font-bold mt-3">{bookedRoom}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Seminar Office Hours</p>
          </div>
        </section>

        {/* Student Risk Radar + Quick Commendation / Room Booking */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Early-Warning Student Risk Radar</h2>
            <div className="divide-y divide-[var(--border-hairline)]">
              {STUDENT_RISK_ROSTER.map((stu) => {
                const assessment = assessAcademicRisk({
                  averagePercentage: stu.average,
                  attendanceRate: stu.attendance,
                  lateSubmissionsCount: stu.lateCount,
                });
                return (
                  <div key={stu.uid} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {stu.name}{' '}
                        <span className="font-mono text-xs text-[var(--text-muted)]">
                          · {stu.scholarOsId}
                        </span>
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {stu.course} · Avg {stu.average}% · Attendance {stu.attendance}%
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
                        assessment.level === 'at-risk'
                          ? 'text-rose-600'
                          : assessment.level === 'watch'
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                      }`}
                    >
                      {assessment.level === 'nominal' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      {assessment.level === 'at-risk'
                        ? 'At-Risk'
                        : assessment.level === 'watch'
                          ? 'Watch'
                          : 'Nominal'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="lg:col-span-5 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-5">
            <h2 className="font-display text-lg font-bold">Seminar Room &amp; Commendations</h2>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Quick Seminar Room Reservation
              </label>
              <select
                value={bookedRoom}
                onChange={(e) => {
                  setBookedRoom(e.target.value);
                  appendAuditLog('Reserved Seminar Room', e.target.value);
                }}
                className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              >
                <option>Turing Hall 204 · Thu 15:00</option>
                <option>Ada Wing 110 · Fri 11:00</option>
                <option>Senate Seminar 12 · Mon 16:00</option>
              </select>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!commendationNote.trim()) return;
                appendAuditLog(
                  'Logged Academic Commendation',
                  `${commendationStudent}: ${commendationNote}`
                );
                setCommendationNote('');
                setCommendationSaved(true);
                setTimeout(() => setCommendationSaved(false), 2500);
              }}
              className="space-y-2.5 pt-3 border-t border-[var(--border-hairline)]"
            >
              <label className="block text-xs font-medium text-[var(--text-secondary)]">
                Log Academic Commendation or Conduct Note
              </label>
              <div className="flex gap-2">
                <select
                  value={commendationStudent}
                  onChange={(e) => setCommendationStudent(e.target.value)}
                  className="rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-2.5 py-2 text-xs"
                >
                  <option>Maya Chen</option>
                  <option>Liam Okafor</option>
                  <option>Nadia Al-Mansoor</option>
                </select>
                <input
                  type="text"
                  value={commendationNote}
                  onChange={(e) => setCommendationNote(e.target.value)}
                  placeholder="Exemplary seminar critique..."
                  className="flex-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-xl text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5"
                style={{ backgroundColor: accentColor }}
              >
                <Award className="w-3.5 h-3.5" />
                Record Commendation
              </button>
              {commendationSaved && (
                <p className="text-xs text-emerald-600">Recorded to student conduct &amp; audit log.</p>
              )}
            </form>
          </section>
        </div>
      </div>
    );
  }

  if (activeTab === 'gradebook') {
    const activeSub = mySubmissions.find((s) => s.id === selectedSubId) || null;

    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Assignments &amp; Rubric Gradebook</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Publish coursework to enrolled students, manage draft visibility, and evaluate PDF/DOCX deliverables with multi-criterion rubrics.
          </p>
        </div>

        {/* Publish Assignment Form */}
        <form
          onSubmit={handlePublish}
          className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4" style={{ color: accentColor }} />
              Publish New Coursework Assignment
            </h2>
            <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={newPublished}
                onChange={(e) => setNewPublished(e.target.checked)}
              />
              <span>Publish immediately to enrolled students</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Course Module
              </label>
              <select
                value={newCourseId}
                onChange={(e) => setNewCourseId(e.target.value)}
                className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              >
                {myCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Assignment Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g., Component Boundary Proof"
                className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Specification &amp; Deliverable Rules
              </label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Describe acceptance criteria and required PDF/DOCX artifacts..."
                className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white whitespace-nowrap shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {newPublished ? 'Publish Assignment' : 'Save Draft'}
            </button>
          </div>
          {publishNotice && <p className="text-xs text-emerald-600">{publishNotice}</p>}
        </form>

        {/* Submissions & Rubric Grading Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4">
              <h2 className="font-display text-base font-bold">Student Submissions Queue</h2>
              <div className="divide-y divide-[var(--border-hairline)]">
                {mySubmissions.map((sub) => {
                  const asg = assignments.find((a) => a.id === sub.assignmentId);
                  const course = courses.find((c) => c.id === sub.courseId);
                  const fb = feedbackList.find((f) => f.submissionId === sub.id);
                  const studentLabel = STUDENT_NAMES[sub.studentUid] || sub.studentUid;
                  return (
                    <div key={sub.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-[var(--text-muted)]">
                          {course?.code} · {studentLabel}
                        </p>
                        <p className="text-sm font-semibold truncate">{sub.filename}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{asg?.title}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectSubmissionForGrading(sub.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white whitespace-nowrap shrink-0"
                        style={{ backgroundColor: accentColor }}
                      >
                        {fb ? `Graded (${fb.score}/100)` : 'Grade & Feedback'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coursework Visibility Manager */}
            <div className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-3">
              <h2 className="font-display text-base font-bold">Coursework Visibility &amp; Drafts</h2>
              <div className="divide-y divide-[var(--border-hairline)] text-xs">
                {myAssignments.map((asg) => {
                  const course = courses.find((c) => c.id === asg.courseId);
                  return (
                    <div key={asg.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="font-mono text-[var(--text-muted)] mr-2">{course?.code}</span>
                        <span className="font-semibold text-[var(--text-primary)]">{asg.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleAssignmentPublished(asg.id)}
                        className="px-3 py-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--surface-subtle)] font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        {asg.published ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Published</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                            <span>Draft (Hidden)</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4 self-start sticky top-24">
            {activeSub ? (
              <form onSubmit={handleSaveGrade} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono text-[var(--text-muted)]">{activeSub.filename}</p>
                    <h3 className="font-display text-lg font-bold mt-1">Rubric Evaluation</h3>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xl font-bold tabular-nums">
                      {computedTotalScore}/100
                    </span>
                    <p className="text-xs font-mono text-[var(--text-muted)]">
                      Letter: {calculateLetterGrade(computedTotalScore).letter}
                    </p>
                  </div>
                </div>

                {/* Interactive 3-Criterion Sliders */}
                <div className="space-y-3 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <label htmlFor="crit-arch" className="font-medium">
                        1. Architectural Clarity &amp; Boundaries
                      </label>
                      <span className="font-mono font-semibold tabular-nums">
                        {critArchitecture} / 40
                      </span>
                    </div>
                    <input
                      id="crit-arch"
                      type="range"
                      min={0}
                      max={40}
                      value={critArchitecture}
                      onChange={(e) => setCritArchitecture(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label htmlFor="crit-verif" className="font-medium">
                        2. Verification &amp; Permission Invariants
                      </label>
                      <span className="font-mono font-semibold tabular-nums">
                        {critVerification} / 35
                      </span>
                    </div>
                    <input
                      id="crit-verif"
                      type="range"
                      min={0}
                      max={35}
                      value={critVerification}
                      onChange={(e) => setCritVerification(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label htmlFor="crit-prose" className="font-medium">
                        3. Technical Prose &amp; Traceability
                      </label>
                      <span className="font-mono font-semibold tabular-nums">
                        {critProse} / 25
                      </span>
                    </div>
                    <input
                      id="crit-prose"
                      type="range"
                      min={0}
                      max={25}
                      value={critProse}
                      onChange={(e) => setCritProse(Number(e.target.value))}
                      className="w-full accent-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rubric-comment-input"
                    className="block text-xs font-medium text-[var(--text-secondary)] mb-1"
                  >
                    Written Feedback
                  </label>
                  <textarea
                    id="rubric-comment-input"
                    rows={3}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
                  />
                </div>
                {gradeNotice && <p className="text-xs text-emerald-600">{gradeNotice}</p>}
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Save &amp; Release Feedback
                </button>
              </form>
            ) : (
              <div className="py-10 text-center space-y-2">
                <FileCheck2 className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                <p className="text-sm font-semibold">Select a Submission</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Pick a student deliverable from the queue to score rubric criteria and release
                  feedback.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'courses') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">My Courses &amp; Classroom Customizer</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Personalize module mottos and visual identifiers across student portals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myCourses.map((c) => (
            <div
              key={c.id}
              className="rounded-[24px] bg-[var(--surface-bg)] border border-[var(--border-hairline)] p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-mono text-[var(--text-muted)]">{c.code}</p>
                  <h2 className="font-display text-lg font-bold">{c.title}</h2>
                </div>
                <BookOpen className="w-5 h-5" style={{ color: c.accentColor }} />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                  Course Motto
                </label>
                <input
                  type="text"
                  value={c.motto}
                  onChange={(e) => customizeCourse(c.id, { motto: e.target.value })}
                  className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-hairline)] px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)]">Theme Color:</span>
                {['#CE5D8C', '#10B981', '#6366F1', '#F59E0B'].map((col) => (
                  <button
                    key={col}
                    type="button"
                    aria-label={`Set ${c.code} color ${col}`}
                    onClick={() => customizeCourse(c.id, { accentColor: col })}
                    className={`w-6 h-6 rounded-full border-2 ${
                      c.accentColor === col ? 'border-slate-900 dark:border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>

              <p className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {c.schedule}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === 'ai-copilot') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Faculty AI Co-Pilot</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Draft seminar plans, tiered worksheets, rubrics, and early-warning intervention briefs.
          </p>
        </div>

        <ExplainableAiCard
          title="TeacherCopilotTerminal"
          subtitle="Powered by gemini-4-hydrogen with optional Google Search grounding."
          flowOptions={[
            {
              id: 'teacher-lesson-planner',
              label: 'Lesson Planner',
              description: 'Module topic and learning goals for a 90-minute seminar plan',
            },
            {
              id: 'teacher-worksheet-differentiator',
              label: 'Tiered Worksheets',
              description: 'Concept to differentiate across Foundational, Standard, and Honours tiers',
            },
            {
              id: 'teacher-assessment-aid',
              label: 'Rubric & Prompts',
              description: 'Assessment focus to generate a 4x4 rubric and essay prompts',
            },
            {
              id: 'teacher-feedback-suggester',
              label: 'Feedback Drafter',
              description: 'Summarize student strengths and gaps to draft constructive feedback',
            },
            {
              id: 'teacher-student-risk-summary',
              label: 'Risk Summary',
              description: 'Student profile metrics to synthesize an academic support plan',
            },
          ]}
          defaultPrompt="Design a 90-minute seminar plan for COMP301 on enforcing authorization matrices in modular monoliths."
          contextData={myCourses.map((c) => `${c.code}: ${c.title}`).join(', ')}
        />
      </div>
    );
  }

  return null;
}
