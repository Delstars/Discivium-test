import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CalendarCheck,
  Check,
  Download,
  FileText,
  Lock,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  Upload,
  Vote,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ApiError } from '../../lib/apiClient';
import type {
  AssignmentItem,
  AttendanceStatus,
  SubmissionItem,
} from '../../types/api';
import {
  asBoolean,
  formatIsoDateTimeUae,
  formatStatusLabel,
  formatTimeRange,
  normalizeDueAtUae,
  weekdayName,
} from '../../lib/formatters';
import {
  ConfirmDialog,
  EmptyState,
  ErrorBanner,
  Field,
  Modal,
  PageHeader,
  SectionCard,
  StatusBadge,
  inputClass,
  primaryBtnClass,
  secondaryBtnClass,
} from '../ui/Primitives';

type LecturerTab = 'coursework' | 'resources' | 'attendance' | 'workspace';

export function LecturerCourseDetail({ courseId }: { courseId: number }) {
  const { state, navigate, executeAction, executeUpload, executeDownload } = useApp();
  const [tab, setTab] = useState<LecturerTab>('coursework');

  // Publish assignment modal
  const [pubOpen, setPubOpen] = useState(false);
  const [pubTitle, setPubTitle] = useState('');
  const [pubDesc, setPubDesc] = useState('');
  const [pubDue, setPubDue] = useState('2026-12-15T23:59');
  const [pubMax, setPubMax] = useState('30');
  const [pubPolicy, setPubPolicy] = useState<'strict' | 'allow_late'>('strict');
  const [pubBusy, setPubBusy] = useState(false);
  const [pubError, setPubError] = useState<string | null>(null);

  // Grade submission modal
  const [gradeTarget, setGradeTarget] = useState<{
    assignment: AssignmentItem;
    submission: SubmissionItem;
  } | null>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeComment, setGradeComment] = useState('');
  const [gradeBusy, setGradeBusy] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  // Release final course result confirmation
  const [releaseStudent, setReleaseStudent] = useState<{ id: number; name: string } | null>(null);
  const [releaseBusy, setReleaseBusy] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  // Publish resource modal
  const [resOpen, setResOpen] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resFile, setResFile] = useState<File | null>(null);
  const [resBusy, setResBusy] = useState(false);
  const [resProgress, setResProgress] = useState<number | null>(null);
  const [resError, setResError] = useState<string | null>(null);

  // Attendance session creation & marking
  const [attDate, setAttDate] = useState('2026-11-25');
  const [attTitle, setAttTitle] = useState('');
  const [attBusy, setAttBusy] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);
  const [markingKey, setMarkingKey] = useState<string | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);

  // Course discussion & poll builder
  const [msgBody, setMsgBody] = useState('');
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  const [pollOpen, setPollOpen] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Option A', 'Option B']);
  const [pollBusy, setPollBusy] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);

  const [closingPollId, setClosingPollId] = useState<number | null>(null);
  const [closePollBusy, setClosePollBusy] = useState(false);
  const [closePollError, setClosePollError] = useState<string | null>(null);

  const course = useMemo(
    () => (state?.courses ?? []).find((c) => c.id === courseId) ?? null,
    [state?.courses, courseId]
  );

  const slot = useMemo(
    () => (state?.timetable ?? []).find((t) => t.id === courseId) ?? null,
    [state?.timetable, courseId]
  );

  if (!state) return null;

  if (!course) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('courses')}
          className={secondaryBtnClass}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Assigned Courses
        </button>
        <EmptyState
          title="Course not assigned to your account"
          description="Instructors can view and manage only their own assigned courses."
        />
      </div>
    );
  }

  const roster = course.roster ?? [];
  const sessions = course.attendance_sessions ?? [];
  const releasedResults = course.released_results ?? [];
  const courseHasReleasedResults = releasedResults.length > 0;

  const handlePublishAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const maxPts = Number(pubMax);
    if (!pubTitle.trim() || !pubDesc.trim() || !pubDue || !Number.isInteger(maxPts) || maxPts < 1) {
      setPubError('Complete title, description, UAE deadline, and valid maximum marks (1–1000).');
      return;
    }
    setPubError(null);
    setPubBusy(true);
    try {
      await executeAction(
        'publish',
        {
          course_id: course.id,
          title: pubTitle.trim(),
          description: pubDesc.trim(),
          due_at: normalizeDueAtUae(pubDue),
          max_points: maxPts,
          policy: pubPolicy,
        },
        `Published assignment "${pubTitle.trim()}".`
      );
      setPubTitle('');
      setPubDesc('');
      setPubOpen(false);
    } catch (err) {
      setPubError(err instanceof ApiError ? err.message : 'Unable to publish assignment.');
    } finally {
      setPubBusy(false);
    }
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeTarget) return;
    const score = Number(gradeScore);
    if (
      gradeScore.trim() === '' ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > gradeTarget.assignment.max_points
    ) {
      setGradeError(`Enter an integer score between 0 and ${gradeTarget.assignment.max_points}.`);
      return;
    }
    if (!gradeComment.trim()) {
      setGradeError('Provide written feedback before releasing a grade.');
      return;
    }
    setGradeError(null);
    setGradeBusy(true);
    try {
      await executeAction(
        'grade',
        {
          submission_id: gradeTarget.submission.id,
          score,
          comment: gradeComment.trim(),
        },
        `Released grade (${score}/${gradeTarget.assignment.max_points}) to ${gradeTarget.submission.name}.`
      );
      setGradeTarget(null);
      setGradeScore('');
      setGradeComment('');
    } catch (err) {
      setGradeError(err instanceof ApiError ? err.message : 'Unable to grade submission.');
    } finally {
      setGradeBusy(false);
    }
  };

  const handleConfirmReleaseResult = async () => {
    if (!releaseStudent) return;
    setReleaseError(null);
    setReleaseBusy(true);
    try {
      await executeAction(
        'release-result',
        { course_id: course.id, student_id: releaseStudent.id },
        `Final course result released for ${releaseStudent.name}.`
      );
      setReleaseStudent(null);
    } catch (err) {
      setReleaseError(err instanceof ApiError ? err.message : 'Unable to release course result.');
    } finally {
      setReleaseBusy(false);
    }
  };

  const handleUploadResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim() || !resFile) {
      setResError('Provide a resource title and select a PDF or DOCX file.');
      return;
    }
    setResError(null);
    setResBusy(true);
    setResProgress(0);
    try {
      const formData = new FormData();
      formData.append('course_id', String(course.id));
      formData.append('title', resTitle.trim());
      formData.append('file', resFile);
      await executeUpload(
        'resource',
        formData,
        (pct) => setResProgress(pct),
        `Published course resource "${resTitle.trim()}".`
      );
      setResTitle('');
      setResFile(null);
      setResProgress(null);
      setResOpen(false);
    } catch (err) {
      setResError(err instanceof ApiError ? err.message : 'Resource upload failed.');
    } finally {
      setResBusy(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attDate.trim() || !attTitle.trim()) {
      setAttError('Enter both session date (YYYY-MM-DD) and title.');
      return;
    }
    setAttError(null);
    setAttBusy(true);
    try {
      await executeAction(
        'attendance-session',
        { course_id: course.id, date: attDate.trim(), title: attTitle.trim() },
        `Created attendance session "${attTitle.trim()}".`
      );
      setAttTitle('');
    } catch (err) {
      setAttError(err instanceof ApiError ? err.message : 'Unable to create session.');
    } finally {
      setAttBusy(false);
    }
  };

  const handleMarkAttendance = async (
    sessionId: number,
    studentId: number,
    status: AttendanceStatus
  ) => {
    const key = `${sessionId}-${studentId}`;
    setMarkError(null);
    setMarkingKey(key);
    try {
      await executeAction(
        'attendance-mark',
        { session_id: sessionId, student_id: studentId, status },
        `Attendance updated to ${formatStatusLabel(status)}.`
      );
    } catch (err) {
      setMarkError(err instanceof ApiError ? err.message : 'Unable to record attendance.');
    } finally {
      setMarkingKey(null);
    }
  };

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgBody.trim()) {
      setMsgError('Enter a message before posting.');
      return;
    }
    setMsgError(null);
    setMsgBusy(true);
    try {
      await executeAction(
        'message',
        { course_id: course.id, body: msgBody.trim() },
        'Posted course message.'
      );
      setMsgBody('');
    } catch (err) {
      setMsgError(err instanceof ApiError ? err.message : 'Unable to post message.');
    } finally {
      setMsgBusy(false);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (!pollTitle.trim() || !pollQuestion.trim()) {
      setPollError('Enter both a poll title and question.');
      return;
    }
    if (cleaned.length < 2 || cleaned.length > 8) {
      setPollError('Provide between 2 and 8 non-empty options.');
      return;
    }
    if (new Set(cleaned).size !== cleaned.length) {
      setPollError('All poll options must be unique.');
      return;
    }
    setPollError(null);
    setPollBusy(true);
    try {
      await executeAction(
        'form',
        {
          course_id: course.id,
          title: pollTitle.trim(),
          question: pollQuestion.trim(),
          options: cleaned,
        },
        `Published poll "${pollTitle.trim()}".`
      );
      setPollTitle('');
      setPollQuestion('');
      setPollOptions(['Option A', 'Option B']);
      setPollOpen(false);
    } catch (err) {
      setPollError(err instanceof ApiError ? err.message : 'Unable to create poll.');
    } finally {
      setPollBusy(false);
    }
  };

  const handleConfirmClosePoll = async () => {
    if (!closingPollId) return;
    setClosePollError(null);
    setClosePollBusy(true);
    try {
      await executeAction('form-close', { form_id: closingPollId }, 'Poll closed.');
      setClosingPollId(null);
    } catch (err) {
      setClosePollError(err instanceof ApiError ? err.message : 'Unable to close poll.');
    } finally {
      setClosePollBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => navigate('courses')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          Back to Assigned Courses
        </button>

        <PageHeader
          eyebrow={
            slot
              ? `${course.code} · ${weekdayName(slot.weekday)} ${formatTimeRange(slot.start_min, slot.end_min)} · Room ${slot.room} · ${roster.length} enrolled`
              : `${course.code} · ${roster.length} enrolled`
          }
          title={course.title}
          actions={
            <>
              <button
                type="button"
                onClick={() => {
                  setResError(null);
                  setResOpen(true);
                }}
                className={secondaryBtnClass}
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                Publish Resource
              </button>
              <button
                type="button"
                disabled={courseHasReleasedResults}
                title={
                  courseHasReleasedResults
                    ? 'Cannot publish new assignments after a final result has been released'
                    : undefined
                }
                onClick={() => {
                  setPubError(null);
                  setPubOpen(true);
                }}
                className={primaryBtnClass}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Publish Assignment
              </button>
            </>
          }
        />
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Lecturer course tools"
        className="flex flex-wrap gap-1 border-b border-[var(--border)]"
      >
        {(
          [
            ['coursework', `Coursework & Results (${course.assignments.length})`, FileText],
            ['resources', `Resources (${course.resources.length})`, Download],
            ['attendance', `Roster & Attendance (${roster.length})`, CalendarCheck],
            [
              'workspace',
              `Discussion & Polls (${course.workspace.messages.length + course.workspace.forms.length})`,
              MessageSquare,
            ],
          ] as Array<[LecturerTab, string, React.ComponentType<{ className?: string }>]>
        ).map(([id, label, Icon]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Coursework, Submissions & Final Result Release */}
      {tab === 'coursework' && (
        <div className="space-y-6">
          {courseHasReleasedResults && (
            <div className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber-soft)] px-4 py-3 text-xs text-[var(--amber)]">
              One or more final course results have been released for {course.code}. Publishing
              additional assignments is locked server-side to preserve grade calculation integrity.
            </div>
          )}

          {course.assignments.length === 0 ? (
            <EmptyState
              title="No assignments published yet"
              description="Publish an assignment with a UAE deadline, maximum marks, and strict or allow-late policy."
              action={
                <button
                  type="button"
                  disabled={courseHasReleasedResults}
                  onClick={() => setPubOpen(true)}
                  className={primaryBtnClass}
                >
                  Publish First Assignment
                </button>
              }
            />
          ) : (
            <div className="space-y-4">
              {course.assignments.map((a) => (
                <SectionCard
                  key={a.id}
                  title={a.title}
                  subtitle={`Due ${formatIsoDateTimeUae(a.due_at)} · Max ${a.max_points} marks · ${
                    a.policy === 'strict' ? 'Strict deadline' : 'Late allowed'
                  }`}
                  action={
                    <StatusBadge variant="neutral">
                      {a.submissions.length} submission(s)
                    </StatusBadge>
                  }
                >
                  <p className="text-sm text-[var(--ink-secondary)] whitespace-pre-wrap mb-4">
                    {a.description}
                  </p>

                  {a.submissions.length === 0 ? (
                    <p className="text-xs text-[var(--ink-muted)] py-3 border-t border-[var(--border)]">
                      No student submissions received yet for this assignment.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border-t border-[var(--border)] pt-3">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border)] text-xs text-[var(--ink-muted)]">
                            <th className="py-2 pr-4 font-medium">Student</th>
                            <th className="py-2 px-3 font-medium">Document</th>
                            <th className="py-2 px-3 font-medium">Submitted (UAE)</th>
                            <th className="py-2 px-3 font-medium">Status</th>
                            <th className="py-2 pl-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)] text-xs">
                          {a.submissions.map((sub) => (
                            <tr key={sub.id}>
                              <td className="py-3 pr-4 font-medium text-[var(--ink)]">
                                {sub.name}
                              </td>
                              <td className="py-3 px-3 font-mono text-[var(--ink-secondary)]">
                                {sub.filename}
                              </td>
                              <td className="py-3 px-3 font-mono tabular-nums text-[var(--ink-muted)] whitespace-nowrap">
                                {formatIsoDateTimeUae(sub.submitted_at)}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                {sub.status === 'graded' ? (
                                  <StatusBadge variant="success">
                                    Graded {sub.score}/{a.max_points}
                                  </StatusBadge>
                                ) : (
                                  <StatusBadge variant={asBoolean(sub.late) ? 'warning' : 'accent'}>
                                    {asBoolean(sub.late) ? 'Submitted (Late)' : 'Needs grading'}
                                  </StatusBadge>
                                )}
                              </td>
                              <td className="py-3 pl-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      executeDownload(`/api/download?id=${sub.id}`, sub.filename)
                                    }
                                    className={secondaryBtnClass}
                                  >
                                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                                    File
                                  </button>
                                  {sub.status !== 'graded' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGradeError(null);
                                        setGradeScore('');
                                        setGradeComment('');
                                        setGradeTarget({ assignment: a, submission: sub });
                                      }}
                                      className={primaryBtnClass}
                                    >
                                      Grade
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>
              ))}
            </div>
          )}

          {/* Final Course Result Release Workflow */}
          <SectionCard
            title="Final Course Result Release"
            subtitle="Requires all published assignments for the student to be graded. Once released, the final percentage is immutable and feeds the student's GPA."
            noPadding
          >
            {roster.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No students enrolled"
                  description="Students enrolled in this course will appear here for final result release."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs text-[var(--ink-muted)]">
                      <th className="py-3 px-5 font-medium">Student</th>
                      <th className="py-3 px-4 font-medium">Graded Progress</th>
                      <th className="py-3 px-4 font-medium">Released Standing</th>
                      <th className="py-3 px-5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-sm">
                    {roster.map((student) => {
                      const rel = releasedResults.find((r) => r.student_id === student.id);
                      const gradedAssignments = course.assignments.filter((a) =>
                        a.submissions.some(
                          (s) => s.student_id === student.id && s.status === 'graded'
                        )
                      ).length;
                      return (
                        <tr key={student.id}>
                          <td className="py-3.5 px-5 font-medium text-[var(--ink)]">
                            {student.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-[var(--ink-secondary)]">
                            {gradedAssignments} / {course.assignments.length} assignments graded
                          </td>
                          <td className="py-3.5 px-4">
                            {rel ? (
                              <span className="inline-flex items-center gap-2 text-xs">
                                <StatusBadge variant="success">
                                  {rel.percentage.toFixed(2)}%
                                </StatusBadge>
                                <span className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
                                  {formatIsoDateTimeUae(rel.released_at)}
                                </span>
                              </span>
                            ) : (
                              <StatusBadge variant="neutral">Not released</StatusBadge>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            {rel ? (
                              <span className="inline-flex items-center gap-1 text-xs text-[var(--ink-muted)]">
                                <Lock className="w-3 h-3" aria-hidden="true" />
                                Immutable
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setReleaseError(null);
                                  setReleaseStudent(student);
                                }}
                                className={secondaryBtnClass}
                              >
                                <Award className="w-3.5 h-3.5" aria-hidden="true" />
                                Release Final Result
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Tab 2: Course Resources */}
      {tab === 'resources' && (
        <SectionCard
          title="Published Course Resources"
          subtitle="PDF and DOCX documents available to students enrolled in this course."
          action={
            <button
              type="button"
              onClick={() => {
                setResError(null);
                setResOpen(true);
              }}
              className={primaryBtnClass}
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              Publish Resource
            </button>
          }
        >
          {course.resources.length === 0 ? (
            <EmptyState
              title="No resources published"
              description="Upload PDF or DOCX lecture slides, reading packets, or specifications."
            />
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {course.resources.map((res) => (
                <div
                  key={res.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{res.title}</p>
                    <p className="text-xs font-mono text-[var(--ink-muted)] mt-0.5">
                      {res.filename} · {formatIsoDateTimeUae(res.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      executeDownload(`/api/resource-download?id=${res.id}`, res.filename)
                    }
                    className={secondaryBtnClass}
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* Tab 3: Roster & Attendance */}
      {tab === 'attendance' && (
        <div className="space-y-6">
          <SectionCard
            title="Create Attendance Session"
            subtitle="Open a dated lecture or lab session, then mark attendance per enrolled student."
          >
            <form onSubmit={handleCreateSession} className="space-y-4">
              {attError && (
                <ErrorBanner message={attError} onDismiss={() => setAttError(null)} />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <Field id="att-date" label="Session Date (YYYY-MM-DD)" required>
                    <input
                      id="att-date"
                      type="date"
                      value={attDate}
                      onChange={(e) => setAttDate(e.target.value)}
                      className={inputClass}
                      disabled={attBusy}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-6">
                  <Field id="att-title" label="Session Title" required>
                    <input
                      id="att-title"
                      type="text"
                      maxLength={120}
                      value={attTitle}
                      onChange={(e) => setAttTitle(e.target.value)}
                      placeholder="e.g. Week 09 — Architecture Tradeoffs Studio"
                      className={inputClass}
                      disabled={attBusy}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={attBusy}
                    className={`${primaryBtnClass} w-full py-2.5`}
                  >
                    {attBusy ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          </SectionCard>

          {markError && (
            <ErrorBanner message={markError} onDismiss={() => setMarkError(null)} />
          )}

          {sessions.length === 0 ? (
            <EmptyState
              title="No attendance sessions yet"
              description="Create your first attendance session above to record student presence, tardiness, or excused absences."
            />
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <SectionCard
                  key={session.id}
                  title={session.title}
                  subtitle={`Session date: ${session.session_date} · ${session.marks.length}/${roster.length} marked`}
                >
                  {roster.length === 0 ? (
                    <p className="text-xs text-[var(--ink-muted)]">
                      No students enrolled in this course to mark.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--border)]">
                      {roster.map((student) => {
                        const existing = session.marks.find(
                          (m) => m.student_id === student.id
                        );
                        const busyKey = `${session.id}-${student.id}`;
                        const isSaving = markingKey === busyKey;
                        return (
                          <div
                            key={student.id}
                            className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm font-medium text-[var(--ink)]">
                                {student.name}
                              </span>
                              {existing ? (
                                <StatusBadge
                                  variant={
                                    existing.status === 'present'
                                      ? 'success'
                                      : existing.status === 'late'
                                        ? 'warning'
                                        : existing.status === 'absent'
                                          ? 'danger'
                                          : 'neutral'
                                  }
                                >
                                  {formatStatusLabel(existing.status)}
                                </StatusBadge>
                              ) : (
                                <StatusBadge variant="neutral">Unmarked</StatusBadge>
                              )}
                            </div>

                            <div
                              className="flex flex-wrap gap-1.5"
                              role="group"
                              aria-label={`Attendance status for ${student.name}`}
                            >
                              {(
                                ['present', 'late', 'absent', 'excused'] as AttendanceStatus[]
                              ).map((st) => {
                                const selected = existing?.status === st;
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() =>
                                      handleMarkAttendance(session.id, student.id, st)
                                    }
                                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                                      selected
                                        ? 'bg-[var(--accent)] text-white border-transparent'
                                        : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink-secondary)] hover:bg-[var(--surface-subtle)]'
                                    }`}
                                  >
                                    {selected && (
                                      <Check
                                        className="w-3 h-3 inline mr-1"
                                        aria-hidden="true"
                                      />
                                    )}
                                    {formatStatusLabel(st)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Discussion & Polls */}
      {tab === 'workspace' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <SectionCard
              title="Course Discussion"
              subtitle="Internal course board shared with enrolled students."
            >
              <form
                onSubmit={handlePostMessage}
                className="space-y-3 pb-4 border-b border-[var(--border)]"
              >
                {msgError && (
                  <ErrorBanner message={msgError} onDismiss={() => setMsgError(null)} />
                )}
                <Field id="lec-course-msg" label="Post announcement or reply" required>
                  <textarea
                    id="lec-course-msg"
                    rows={3}
                    maxLength={2000}
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    placeholder="Share studio reminders, reading notes, or clarifications…"
                    className={inputClass}
                    disabled={msgBusy}
                  />
                </Field>
                <div className="flex justify-end">
                  <button type="submit" disabled={msgBusy} className={primaryBtnClass}>
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    {msgBusy ? 'Posting…' : 'Post Message'}
                  </button>
                </div>
              </form>

              <div className="pt-4">
                {course.workspace.messages.length === 0 ? (
                  <EmptyState
                    title="No messages yet"
                    description="Post the first announcement for this course."
                  />
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {course.workspace.messages.map((m) => (
                      <div key={m.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-[var(--ink)]">{m.author_name}</span>
                          <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                            {formatIsoDateTimeUae(m.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--ink-secondary)] whitespace-pre-wrap">
                          {m.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <SectionCard
              title="Course Polls"
              subtitle="Single-question polls with live response counts."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setPollError(null);
                    setPollOpen(true);
                  }}
                  className={primaryBtnClass}
                >
                  <Vote className="w-3.5 h-3.5" aria-hidden="true" />
                  Create Poll
                </button>
              }
            >
              {course.workspace.forms.length === 0 ? (
                <EmptyState
                  title="No course polls created"
                  description="Create a single-question poll with 2 to 8 distinct options to gather student responses."
                />
              ) : (
                <div className="space-y-4">
                  {course.workspace.forms.map((poll) => {
                    const isOpen = asBoolean(poll.open);
                    const counts = poll.counts ?? poll.options.map(() => 0);
                    const totalVotes = counts.reduce((sum, c) => sum + c, 0);
                    return (
                      <div
                        key={poll.id}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)]/35 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-semibold text-[var(--ink)]">
                              {poll.title}
                            </h3>
                            <p className="text-xs text-[var(--ink-secondary)] mt-0.5">
                              {poll.question}
                            </p>
                          </div>
                          <StatusBadge variant={isOpen ? 'success' : 'neutral'}>
                            {isOpen ? 'Open' : 'Closed'}
                          </StatusBadge>
                        </div>

                        <div className="space-y-2">
                          {poll.options.map((opt, idx) => {
                            const count = counts[idx] ?? 0;
                            const pct =
                              totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                            return (
                              <div key={`${poll.id}-${idx}`} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-[var(--ink)]">{opt}</span>
                                  <span className="font-mono tabular-nums text-[var(--ink-muted)]">
                                    {count} ({pct}%)
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--accent)]"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--ink-muted)]">
                          <span className="font-mono tabular-nums">
                            {totalVotes} total response(s)
                          </span>
                          {isOpen && (
                            <button
                              type="button"
                              onClick={() => {
                                setClosePollError(null);
                                setClosingPollId(poll.id);
                              }}
                              className={secondaryBtnClass}
                            >
                              Close Poll
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}

      {/* Modal: Publish Assignment */}
      <Modal
        open={pubOpen}
        onClose={() => {
          if (!pubBusy) setPubOpen(false);
        }}
        title={`Publish Assignment — ${course.code}`}
        subtitle="Published immediately to all enrolled students. Deadline interpreted in UAE Standard Time (UTC+4)."
      >
        <form onSubmit={handlePublishAssignment} className="space-y-4">
          {pubError && <ErrorBanner message={pubError} />}
          <Field id="pub-title" label="Assignment Title" required>
            <input
              id="pub-title"
              type="text"
              maxLength={200}
              value={pubTitle}
              onChange={(e) => setPubTitle(e.target.value)}
              placeholder="e.g. Architecture Decision Record & Layered Diagram"
              className={inputClass}
              disabled={pubBusy}
            />
          </Field>

          <Field id="pub-desc" label="Instructions & Deliverables" required>
            <textarea
              id="pub-desc"
              rows={4}
              value={pubDesc}
              onChange={(e) => setPubDesc(e.target.value)}
              placeholder="Specify expected PDF/DOCX structure, rubric weights, and submission constraints…"
              className={inputClass}
              disabled={pubBusy}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              id="pub-due"
              label="Deadline (UAE Time, UTC+4)"
              hint="Stored with explicit +04:00 timezone offset."
              required
            >
              <input
                id="pub-due"
                type="datetime-local"
                value={pubDue}
                onChange={(e) => setPubDue(e.target.value)}
                className={inputClass}
                disabled={pubBusy}
              />
            </Field>

            <Field id="pub-max" label="Maximum Marks (1–1000)" required>
              <input
                id="pub-max"
                type="number"
                min={1}
                max={1000}
                value={pubMax}
                onChange={(e) => setPubMax(e.target.value)}
                className={`${inputClass} font-mono tabular-nums`}
                disabled={pubBusy}
              />
            </Field>
          </div>

          <Field id="pub-policy" label="Deadline Policy" required>
            <select
              id="pub-policy"
              value={pubPolicy}
              onChange={(e) => setPubPolicy(e.target.value as 'strict' | 'allow_late')}
              className={inputClass}
              disabled={pubBusy}
            >
              <option value="strict">Strict — Reject uploads after deadline (HTTP 409)</option>
              <option value="allow_late">Allow Late — Accept and flag late submissions</option>
            </select>
          </Field>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={pubBusy}
              onClick={() => setPubOpen(false)}
              className={secondaryBtnClass}
            >
              Cancel
            </button>
            <button type="submit" disabled={pubBusy} className={primaryBtnClass}>
              {pubBusy ? 'Publishing…' : 'Publish Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Grade Submission */}
      <Modal
        open={gradeTarget !== null}
        onClose={() => {
          if (!gradeBusy) setGradeTarget(null);
        }}
        title="Grade Submission & Release Feedback"
        subtitle={
          gradeTarget
            ? `${gradeTarget.submission.name} · ${gradeTarget.assignment.title}`
            : undefined
        }
      >
        {gradeTarget && (
          <form onSubmit={handleGradeSubmit} className="space-y-4">
            {gradeError && <ErrorBanner message={gradeError} />}
            <div className="rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
              <span className="font-mono truncate">{gradeTarget.submission.filename}</span>
              <button
                type="button"
                onClick={() =>
                  executeDownload(
                    `/api/download?id=${gradeTarget.submission.id}`,
                    gradeTarget.submission.filename
                  )
                }
                className="text-[var(--accent)] font-semibold hover:underline shrink-0"
              >
                Download file
              </button>
            </div>

            <Field
              id="grade-score"
              label={`Score (0 to ${gradeTarget.assignment.max_points})`}
              hint="Each submission can be graded only once."
              required
            >
              <input
                id="grade-score"
                type="number"
                min={0}
                max={gradeTarget.assignment.max_points}
                value={gradeScore}
                onChange={(e) => setGradeScore(e.target.value)}
                className={`${inputClass} font-mono tabular-nums`}
                disabled={gradeBusy}
              />
            </Field>

            <Field id="grade-comment" label="Written Feedback" required>
              <textarea
                id="grade-comment"
                rows={4}
                value={gradeComment}
                onChange={(e) => setGradeComment(e.target.value)}
                placeholder="Provide clear, constructive academic feedback…"
                className={inputClass}
                disabled={gradeBusy}
              />
            </Field>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={gradeBusy}
                onClick={() => setGradeTarget(null)}
                className={secondaryBtnClass}
              >
                Cancel
              </button>
              <button type="submit" disabled={gradeBusy} className={primaryBtnClass}>
                {gradeBusy ? 'Saving…' : 'Release Grade & Feedback'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Publish Resource */}
      <Modal
        open={resOpen}
        onClose={() => {
          if (!resBusy) setResOpen(false);
        }}
        title={`Publish Course Resource — ${course.code}`}
        subtitle="Upload a PDF or DOCX document for enrolled students."
      >
        <form onSubmit={handleUploadResource} className="space-y-4">
          {resError && <ErrorBanner message={resError} />}
          <Field id="res-title" label="Resource Title" required>
            <input
              id="res-title"
              type="text"
              maxLength={150}
              value={resTitle}
              onChange={(e) => setResTitle(e.target.value)}
              placeholder="e.g. Week 06 Lecture Notes — Layered Monoliths"
              className={inputClass}
              disabled={resBusy}
            />
          </Field>

          <Field id="res-file" label="PDF or DOCX File (max 100 MB)" required>
            <input
              id="res-file"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setResFile(e.target.files?.[0] ?? null)}
              disabled={resBusy}
              className="block w-full text-xs text-[var(--ink-secondary)] file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border file:border-[var(--border-strong)] file:bg-[var(--surface-subtle)] file:text-xs file:font-semibold file:text-[var(--ink)]"
            />
          </Field>

          {resBusy && (
            <div className="space-y-1.5" role="status">
              <div className="flex justify-between text-xs text-[var(--ink-secondary)]">
                <span>Uploading resource…</span>
                <span className="font-mono tabular-nums">
                  {resProgress !== null ? `${resProgress}%` : 'Working'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                <div
                  className={`h-full bg-[var(--accent)] ${
                    resProgress === null ? 'w-1/2 animate-pulse' : ''
                  }`}
                  style={resProgress !== null ? { width: `${resProgress}%` } : undefined}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={resBusy}
              onClick={() => setResOpen(false)}
              className={secondaryBtnClass}
            >
              Cancel
            </button>
            <button type="submit" disabled={resBusy || !resFile} className={primaryBtnClass}>
              {resBusy ? 'Publishing…' : 'Publish Resource'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Single-Question Poll */}
      <Modal
        open={pollOpen}
        onClose={() => {
          if (!pollBusy) setPollOpen(false);
        }}
        title={`Create Course Poll — ${course.code}`}
        subtitle="Provide 2 to 8 distinct answer options."
      >
        <form onSubmit={handleCreatePoll} className="space-y-4">
          {pollError && <ErrorBanner message={pollError} />}
          <Field id="poll-title" label="Poll Title" required>
            <input
              id="poll-title"
              type="text"
              maxLength={150}
              value={pollTitle}
              onChange={(e) => setPollTitle(e.target.value)}
              placeholder="e.g. Lab Session Time Preference"
              className={inputClass}
              disabled={pollBusy}
            />
          </Field>

          <Field id="poll-question" label="Question" required>
            <textarea
              id="poll-question"
              rows={2}
              maxLength={500}
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="What single question should students answer?"
              className={inputClass}
              disabled={pollBusy}
            />
          </Field>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--ink)]">
                Options ({pollOptions.length}/8)
              </span>
              {pollOptions.length < 8 && (
                <button
                  type="button"
                  onClick={() => setPollOptions((prev) => [...prev, ''])}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  + Add option
                </button>
              )}
            </div>
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={`Option ${idx + 1}`}
                  maxLength={100}
                  value={opt}
                  onChange={(e) =>
                    setPollOptions((prev) =>
                      prev.map((item, i) => (i === idx ? e.target.value : item))
                    )
                  }
                  placeholder={`Option ${idx + 1}`}
                  className={inputClass}
                  disabled={pollBusy}
                />
                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    aria-label={`Remove option ${idx + 1}`}
                    onClick={() =>
                      setPollOptions((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="p-2 rounded-lg text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={pollBusy}
              onClick={() => setPollOpen(false)}
              className={secondaryBtnClass}
            >
              Cancel
            </button>
            <button type="submit" disabled={pollBusy} className={primaryBtnClass}>
              {pollBusy ? 'Creating…' : 'Create Poll'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Release Final Course Result */}
      <ConfirmDialog
        open={releaseStudent !== null}
        onClose={() => {
          if (!releaseBusy) setReleaseStudent(null);
        }}
        onConfirm={handleConfirmReleaseResult}
        title="Release Final Course Result"
        description={
          releaseStudent
            ? `Release the final course result for ${releaseStudent.name} in ${course.code}? The server computes total earned / total available marks across all published assignments.`
            : ''
        }
        note="This action is permanent and immutable. Once any result is released for this course, new assignments and new enrollments are locked."
        confirmLabel="Release Final Result"
        busy={releaseBusy}
        error={releaseError}
      />

      {/* Confirm Close Poll */}
      <ConfirmDialog
        open={closingPollId !== null}
        onClose={() => {
          if (!closePollBusy) setClosingPollId(null);
        }}
        onConfirm={handleConfirmClosePoll}
        title="Close Course Poll"
        description="Close this poll to prevent further student responses? Recorded response counts will remain visible."
        confirmLabel="Close Poll"
        destructive
        busy={closePollBusy}
        error={closePollError}
      />
    </div>
  );
}
