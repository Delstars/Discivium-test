/**
 * Discivium + ScholarOS Pure Domain Logic & Permission Matrix
 * Zero DOM/browser/database dependencies so every rule is deterministically unit-testable.
 */

export type UserRole = 'student' | 'lecturer' | 'admin' | 'advisor';

export interface DomainUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  scholarOsId: string;
  department: string;
}

export interface CourseRecord {
  id: string;
  code: string;
  title: string;
  credits: number;
  semester: string;
  lecturerUid: string;
  department: string;
  capacity: number;
  schedule: string;
  prerequisites: string[];
}

export interface EnrollmentRecord {
  id: string;
  courseId: string;
  studentUid: string;
  status: 'active' | 'dropped' | 'completed';
}

export interface AssignmentRecord {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueAt: string;
  maxPoints: number;
  published: boolean;
  acceptedTypes: ('pdf' | 'docx')[];
  createdByUid: string;
}

export interface SubmissionRecord {
  id: string;
  assignmentId: string;
  courseId: string;
  studentUid: string;
  filename: string;
  fileType: string;
  fileSizeBytes: number;
  submittedAt: string;
  isLate: boolean;
  notes?: string;
}

export interface FeedbackRecord {
  id: string;
  submissionId: string;
  courseId: string;
  lecturerUid: string;
  score: number;
  maxPoints: number;
  comment: string;
  rubricBreakdown: { criterion: string; points: number; max: number }[];
  updatedAt: string;
}

export const MAX_SUBMISSION_BYTES = 100 * 1024 * 1024; // 100 MB per Discivium architecture spec
export const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx']);

export function isEnrolled(
  userUid: string,
  courseId: string,
  enrollments: EnrollmentRecord[]
): boolean {
  return enrollments.some(
    (e) => e.studentUid === userUid && e.courseId === courseId && e.status === 'active'
  );
}

export function isCourseLecturer(
  user: DomainUser,
  course: CourseRecord
): boolean {
  return user.role === 'lecturer' && course.lecturerUid === user.uid;
}

export function canViewCourse(
  user: DomainUser | null,
  course: CourseRecord,
  enrollments: EnrollmentRecord[]
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (isCourseLecturer(user, course)) return true;
  if (user.role === 'student') return isEnrolled(user.uid, course.id, enrollments);
  return false;
}

export function canViewAssignment(
  user: DomainUser | null,
  assignment: AssignmentRecord,
  course: CourseRecord,
  enrollments: EnrollmentRecord[]
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (isCourseLecturer(user, course)) return true;
  if (user.role === 'student') {
    return assignment.published && isEnrolled(user.uid, course.id, enrollments);
  }
  return false;
}

export function canPublishOrEditAssignment(
  user: DomainUser | null,
  course: CourseRecord
): boolean {
  if (!user) return false;
  return isCourseLecturer(user, course);
}

export interface SubmissionValidationResult {
  ok: boolean;
  reason?: string;
  normalizedExt?: 'pdf' | 'docx';
}

export function validateAssignmentFile(
  filename: string,
  fileSizeBytes: number,
  acceptedTypes: ('pdf' | 'docx')[] = ['pdf', 'docx']
): SubmissionValidationResult {
  const trimmed = filename.trim();
  if (!trimmed) {
    return { ok: false, reason: 'A valid filename is required.' };
  }
  const dotIdx = trimmed.lastIndexOf('.');
  if (dotIdx < 1) {
    return { ok: false, reason: 'File must include a .pdf or .docx extension.' };
  }
  const ext = trimmed.slice(dotIdx + 1).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext) || !acceptedTypes.includes(ext as 'pdf' | 'docx')) {
    return {
      ok: false,
      reason: `Unsupported file type ".${ext}". Accepted formats: ${acceptedTypes.map((t) => `.${t}`).join(', ')}.`,
    };
  }
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return { ok: false, reason: 'Uploaded file cannot be empty.' };
  }
  if (fileSizeBytes > MAX_SUBMISSION_BYTES) {
    return { ok: false, reason: 'File exceeds the 100 MB maximum submission size.' };
  }
  return { ok: true, normalizedExt: ext as 'pdf' | 'docx' };
}

export function canSubmitAssignment(
  user: DomainUser | null,
  assignment: AssignmentRecord,
  course: CourseRecord,
  enrollments: EnrollmentRecord[]
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: 'Authentication required.' };
  if (user.role !== 'student') {
    return { allowed: false, reason: 'Only enrolled students may submit assignment responses.' };
  }
  if (!assignment.published) {
    return { allowed: false, reason: 'Assignment is not yet published.' };
  }
  if (!isEnrolled(user.uid, course.id, enrollments)) {
    return { allowed: false, reason: 'Student does not hold an active enrollment in this course.' };
  }
  return { allowed: true };
}

export function createAuthorizedSubmission(params: {
  authenticatedUser: DomainUser | null;
  submittedClientUserId?: string;
  assignment: AssignmentRecord;
  course: CourseRecord;
  enrollments: EnrollmentRecord[];
  filename: string;
  fileSizeBytes: number;
  nowIso: string;
  notes?: string;
}): { ok: true; submission: SubmissionRecord } | { ok: false; status: 401 | 403 | 400; error: string } {
  if (!params.authenticatedUser) {
    return { ok: false, status: 401, error: 'Authentication required.' };
  }
  const perm = canSubmitAssignment(
    params.authenticatedUser,
    params.assignment,
    params.course,
    params.enrollments
  );
  if (!perm.allowed) {
    return { ok: false, status: 403, error: perm.reason || 'Forbidden.' };
  }
  const fileCheck = validateAssignmentFile(
    params.filename,
    params.fileSizeBytes,
    params.assignment.acceptedTypes
  );
  if (!fileCheck.ok) {
    return { ok: false, status: 400, error: fileCheck.reason || 'Invalid file.' };
  }
  // Security invariant: NEVER trust submittedClientUserId; always bind owner to authenticatedUser.uid
  const isLate = new Date(params.nowIso).getTime() > new Date(params.assignment.dueAt).getTime();
  return {
    ok: true,
    submission: {
      id: `sub_${params.assignment.id}_${params.authenticatedUser.uid}`,
      assignmentId: params.assignment.id,
      courseId: params.course.id,
      studentUid: params.authenticatedUser.uid,
      filename: params.filename.trim(),
      fileType: fileCheck.normalizedExt!,
      fileSizeBytes: params.fileSizeBytes,
      submittedAt: params.nowIso,
      isLate,
      notes: params.notes?.trim() || undefined,
    },
  };
}

export function canViewSubmission(
  user: DomainUser | null,
  submission: SubmissionRecord,
  course: CourseRecord
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'student') return submission.studentUid === user.uid;
  if (isCourseLecturer(user, course)) return true;
  return false;
}

export function canGiveFeedback(
  user: DomainUser | null,
  course: CourseRecord
): boolean {
  if (!user) return false;
  return isCourseLecturer(user, course);
}

export function canViewFeedback(
  user: DomainUser | null,
  submission: SubmissionRecord,
  course: CourseRecord
): boolean {
  return canViewSubmission(user, submission, course);
}

export function calculateLetterGrade(percentage: number): { letter: string; gradePoints: number } {
  if (percentage >= 93) return { letter: 'A', gradePoints: 4.0 };
  if (percentage >= 90) return { letter: 'A-', gradePoints: 3.7 };
  if (percentage >= 87) return { letter: 'B+', gradePoints: 3.3 };
  if (percentage >= 83) return { letter: 'B', gradePoints: 3.0 };
  if (percentage >= 80) return { letter: 'B-', gradePoints: 2.7 };
  if (percentage >= 77) return { letter: 'C+', gradePoints: 2.3 };
  if (percentage >= 73) return { letter: 'C', gradePoints: 2.0 };
  if (percentage >= 70) return { letter: 'C-', gradePoints: 1.7 };
  if (percentage >= 60) return { letter: 'D', gradePoints: 1.0 };
  return { letter: 'F', gradePoints: 0.0 };
}

export function calculateWeightedGpa(
  gradedCourses: { credits: number; percentage: number }[]
): number {
  const totalCredits = gradedCourses.reduce((acc, c) => acc + c.credits, 0);
  if (totalCredits <= 0) return 0;
  const totalPoints = gradedCourses.reduce((acc, c) => {
    const { gradePoints } = calculateLetterGrade(c.percentage);
    return acc + gradePoints * c.credits;
  }, 0);
  return Math.round((totalPoints / totalCredits) * 100) / 100;
}

export function assessAcademicRisk(params: {
  averagePercentage: number;
  attendanceRate: number;
  lateSubmissionsCount: number;
}): { level: 'nominal' | 'watch' | 'at-risk'; reasons: string[] } {
  const reasons: string[] = [];
  if (params.averagePercentage < 65) reasons.push('Coursework average below 65% threshold');
  if (params.attendanceRate < 80) reasons.push('Attendance below 80% minimum');
  if (params.lateSubmissionsCount >= 2) reasons.push(`${params.lateSubmissionsCount} late submissions recorded`);

  if (reasons.length >= 2 || params.averagePercentage < 55 || params.attendanceRate < 70) {
    return { level: 'at-risk', reasons };
  }
  if (reasons.length === 1 || params.averagePercentage < 72) {
    return { level: 'watch', reasons: reasons.length ? reasons : ['Borderline standing (< 72%)'] };
  }
  return { level: 'nominal', reasons: ['On track across coursework and attendance'] };
}

export function checkRegistrationEligibility(params: {
  course: CourseRecord;
  currentEnrollments: EnrollmentRecord[];
  completedCourseCodes: string[];
  studentUid: string;
}): { eligible: boolean; reason?: string } {
  if (isEnrolled(params.studentUid, params.course.id, params.currentEnrollments)) {
    return { eligible: false, reason: 'Already actively enrolled in this module.' };
  }
  const activeSeats = params.currentEnrollments.filter(
    (e) => e.courseId === params.course.id && e.status === 'active'
  ).length;
  if (activeSeats >= params.course.capacity) {
    return { eligible: false, reason: 'Module seat capacity has been reached.' };
  }
  const missingPrereqs = params.course.prerequisites.filter(
    (code) => !params.completedCourseCodes.includes(code)
  );
  if (missingPrereqs.length > 0) {
    return {
      eligible: false,
      reason: `Missing prerequisite(s): ${missingPrereqs.join(', ')}`,
    };
  }
  return { eligible: true };
}
