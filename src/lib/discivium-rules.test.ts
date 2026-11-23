import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DomainUser,
  CourseRecord,
  EnrollmentRecord,
  AssignmentRecord,
  SubmissionRecord,
  canViewCourse,
  canViewAssignment,
  canPublishOrEditAssignment,
  canSubmitAssignment,
  createAuthorizedSubmission,
  canViewSubmission,
  canGiveFeedback,
  canViewFeedback,
  calculateWeightedGpa,
  assessAcademicRisk,
  checkRegistrationEligibility,
} from './discivium-rules';

const studentA: DomainUser = {
  uid: 'stu_a',
  email: 'maya.chen@discivium.edu',
  displayName: 'Maya Chen',
  role: 'student',
  scholarOsId: 'DISC-2026-8841',
  department: 'Computer Science',
};

const studentB: DomainUser = {
  uid: 'stu_b',
  email: 'liam.okafor@discivium.edu',
  displayName: 'Liam Okafor',
  role: 'student',
  scholarOsId: 'DISC-2026-9012',
  department: 'Computer Science',
};

const lecturerMain: DomainUser = {
  uid: 'lec_1',
  email: 'e.vance@discivium.edu',
  displayName: 'Prof. Eleanor Vance',
  role: 'lecturer',
  scholarOsId: 'FAC-2019-0142',
  department: 'Computer Science',
};

const lecturerOther: DomainUser = {
  uid: 'lec_2',
  email: 'r.patel@discivium.edu',
  displayName: 'Dr. Rohan Patel',
  role: 'lecturer',
  scholarOsId: 'FAC-2021-0318',
  department: 'Mathematics',
};

const comp301: CourseRecord = {
  id: 'course_comp301',
  code: 'COMP301',
  title: 'Software Architecture',
  credits: 4,
  semester: 'Autumn 2026',
  lecturerUid: lecturerMain.uid,
  department: 'Computer Science',
  capacity: 40,
  schedule: 'Mon/Wed 10:00',
  prerequisites: ['COMP201'],
};

const enrollments: EnrollmentRecord[] = [
  { id: 'enr_1', courseId: comp301.id, studentUid: studentA.uid, status: 'active' },
];

const publishedAssignment: AssignmentRecord = {
  id: 'asg_1',
  courseId: comp301.id,
  title: 'Architectural Decision Records & C4 Diagrams',
  description: 'Submit ADRs for the modular monolith.',
  dueAt: '2026-11-20T23:59:00Z',
  maxPoints: 100,
  published: true,
  acceptedTypes: ['pdf', 'docx'],
  createdByUid: lecturerMain.uid,
};

const draftAssignment: AssignmentRecord = {
  ...publishedAssignment,
  id: 'asg_draft',
  published: false,
};

const submissionA: SubmissionRecord = {
  id: 'sub_asg_1_stu_a',
  assignmentId: publishedAssignment.id,
  courseId: comp301.id,
  studentUid: studentA.uid,
  filename: 'comp301_adr_maya.pdf',
  fileType: 'pdf',
  fileSizeBytes: 2450000,
  submittedAt: '2026-11-12T14:00:00Z',
  isLate: false,
};

test('test_course_visibility_by_membership', () => {
  assert.equal(canViewCourse(studentA, comp301, enrollments), true);
  assert.equal(canViewCourse(studentB, comp301, enrollments), false);
  assert.equal(canViewCourse(lecturerMain, comp301, enrollments), true);
  assert.equal(canViewCourse(lecturerOther, comp301, enrollments), false);
  assert.equal(canViewCourse(null, comp301, enrollments), false);
});

test('test_assignment_visibility and test_unpublished_assignment_is_hidden', () => {
  assert.equal(canViewAssignment(studentA, publishedAssignment, comp301, enrollments), true);
  assert.equal(canViewAssignment(studentA, draftAssignment, comp301, enrollments), false);
  assert.equal(canViewAssignment(studentB, publishedAssignment, comp301, enrollments), false);
  assert.equal(canViewAssignment(lecturerMain, draftAssignment, comp301, enrollments), true);
});

test('test_only_course_lecturer_can_publish', () => {
  assert.equal(canPublishOrEditAssignment(lecturerMain, comp301), true);
  assert.equal(canPublishOrEditAssignment(lecturerOther, comp301), false);
  assert.equal(canPublishOrEditAssignment(studentA, comp301), false);
});

test('test_student_can_submit_when_enrolled and test_unenrolled_student_cannot_submit', () => {
  assert.equal(canSubmitAssignment(studentA, publishedAssignment, comp301, enrollments).allowed, true);
  assert.equal(canSubmitAssignment(studentB, publishedAssignment, comp301, enrollments).allowed, false);
  assert.equal(canSubmitAssignment(lecturerMain, publishedAssignment, comp301, enrollments).allowed, false);
  assert.equal(canSubmitAssignment(studentA, draftAssignment, comp301, enrollments).allowed, false);
});

test('test_submission_uses_authenticated_user and validates PDF/DOCX <= 100MB', () => {
  const res = createAuthorizedSubmission({
    authenticatedUser: studentA,
    submittedClientUserId: studentB.uid, // attempted spoof
    assignment: publishedAssignment,
    course: comp301,
    enrollments,
    filename: 'architecture_report.pdf',
    fileSizeBytes: 1024 * 500,
    nowIso: '2026-11-12T18:00:00Z',
  });
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.submission.studentUid, studentA.uid);
    assert.equal(res.submission.isLate, false);
  }

  const badExt = createAuthorizedSubmission({
    authenticatedUser: studentA,
    assignment: publishedAssignment,
    course: comp301,
    enrollments,
    filename: 'malware.exe',
    fileSizeBytes: 1024,
    nowIso: '2026-11-12T18:00:00Z',
  });
  assert.equal(badExt.ok, false);

  const tooBig = createAuthorizedSubmission({
    authenticatedUser: studentA,
    assignment: publishedAssignment,
    course: comp301,
    enrollments,
    filename: 'huge.pdf',
    fileSizeBytes: 101 * 1024 * 1024,
    nowIso: '2026-11-12T18:00:00Z',
  });
  assert.equal(tooBig.ok, false);
});

test('test_submission_visibility_by_role', () => {
  assert.equal(canViewSubmission(studentA, submissionA, comp301), true);
  assert.equal(canViewSubmission(studentB, submissionA, comp301), false);
  assert.equal(canViewSubmission(lecturerMain, submissionA, comp301), true);
  assert.equal(canViewSubmission(lecturerOther, submissionA, comp301), false);
});

test('test_only_course_lecturer_can_give_feedback and test_feedback_visibility_by_role', () => {
  assert.equal(canGiveFeedback(lecturerMain, comp301), true);
  assert.equal(canGiveFeedback(lecturerOther, comp301), false);
  assert.equal(canGiveFeedback(studentA, comp301), false);

  assert.equal(canViewFeedback(studentA, submissionA, comp301), true);
  assert.equal(canViewFeedback(studentB, submissionA, comp301), false);
  assert.equal(canViewFeedback(lecturerMain, submissionA, comp301), true);
  assert.equal(canViewFeedback(lecturerOther, submissionA, comp301), false);
});

test('GPA, risk assessment, and registration prerequisite checks', () => {
  const gpa = calculateWeightedGpa([
    { credits: 4, percentage: 94 }, // A = 4.0
    { credits: 4, percentage: 85 }, // B = 3.0
  ]);
  assert.equal(gpa, 3.5);

  const risk = assessAcademicRisk({
    averagePercentage: 58,
    attendanceRate: 74,
    lateSubmissionsCount: 2,
  });
  assert.equal(risk.level, 'at-risk');

  const regDenied = checkRegistrationEligibility({
    course: comp301,
    currentEnrollments: enrollments,
    completedCourseCodes: [],
    studentUid: studentB.uid,
  });
  assert.equal(regDenied.eligible, false);
  assert.match(regDenied.reason || '', /COMP201/);

  const regAllowed = checkRegistrationEligibility({
    course: comp301,
    currentEnrollments: enrollments,
    completedCourseCodes: ['COMP201'],
    studentUid: studentB.uid,
  });
  assert.equal(regAllowed.eligible, true);
});
