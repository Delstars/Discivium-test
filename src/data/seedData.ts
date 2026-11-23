import type {
  AssignmentRecord,
  CourseRecord,
  DomainUser,
  EnrollmentRecord,
  FeedbackRecord,
  SubmissionRecord,
} from '../lib/discivium-rules';

export const ASSETS = {
  campusHero: '/src/assets/images/campus_login_hero_1794541819013.jpg',
  studentAvatar: '/src/assets/images/avatar_student_1794541819798.jpg',
  lecturerAvatar: '/src/assets/images/avatar_lecturer_1794541819390.jpg',
  passportCrest: '/src/assets/images/passport_crest_1794541818568.jpg',
};

export const ROLE_ACCENTS = {
  student: '#CE5D8C',
  lecturer: '#10B981',
  admin: '#6366F1',
  advisor: '#F59E0B',
} as const;

export const DEMO_USERS: Record<'student' | 'lecturer' | 'admin' | 'advisor', DomainUser> = {
  student: {
    uid: 'demo_student_maya',
    email: 'maya.chen@discivium.edu',
    displayName: 'Maya Chen',
    role: 'student',
    scholarOsId: 'DISC-2026-8841',
    department: 'BSc Computer Science · Year 3',
  },
  lecturer: {
    uid: 'faculty-vance',
    email: 'e.vance@discivium.edu',
    displayName: 'Prof. Eleanor Vance',
    role: 'lecturer',
    scholarOsId: 'FAC-2019-0142',
    department: 'School of Computing & Systems',
  },
  admin: {
    uid: 'admin-registrar',
    email: 'registrar@discivium.edu',
    displayName: 'Dr. Julian Mercer',
    role: 'admin',
    scholarOsId: 'REG-2017-0008',
    department: 'Academic Registry & Governance',
  },
  advisor: {
    uid: 'advisor-chen',
    email: 'd.chen.family@discivium.edu',
    displayName: 'David Chen (Guardian / Advisor)',
    role: 'advisor',
    scholarOsId: 'ADV-2024-4410',
    department: 'Parent & Advisee Mirror',
  },
};

export interface ExtendedCourse extends CourseRecord {
  description: string;
  accentColor: string;
  motto: string;
  lecturerName: string;
  objectives: { id: string; label: string; completed: boolean }[];
  materials: { id: string; title: string; format: string; size: string }[];
}

export const INITIAL_COURSES: ExtendedCourse[] = [
  {
    id: 'course_comp301',
    code: 'COMP301',
    title: 'Software Architecture & Modular Systems',
    credits: 4,
    semester: 'Autumn 2026',
    lecturerUid: 'faculty-vance',
    lecturerName: 'Prof. Eleanor Vance',
    department: 'Computer Science',
    capacity: 45,
    schedule: 'Mon / Wed · 10:00–11:30 · Turing Hall 204',
    prerequisites: ['COMP201'],
    description:
      'Modular monoliths, C4 architectural modeling, domain ownership boundaries, and permission-matrix verification.',
    accentColor: '#CE5D8C',
    motto: 'Clarity at every module boundary',
    objectives: [
      { id: 'obj1', label: 'Define bounded contexts & dependency direction', completed: true },
      { id: 'obj2', label: 'Author PlantUML component and sequence baselines', completed: true },
      { id: 'obj3', label: 'Enforce server-side authorization matrices', completed: false },
    ],
    materials: [
      { id: 'mat1', title: 'Lecture 04: Modular Monoliths vs Microservices', format: 'PDF', size: '3.2 MB' },
      { id: 'mat2', title: 'Discivium ADR & Traceability Template', format: 'DOCX', size: '640 KB' },
    ],
  },
  {
    id: 'course_cs410',
    code: 'CS410',
    title: 'Distributed Systems & Consensus',
    credits: 4,
    semester: 'Autumn 2026',
    lecturerUid: 'faculty-vance',
    lecturerName: 'Prof. Eleanor Vance',
    department: 'Computer Science',
    capacity: 35,
    schedule: 'Tue / Thu · 13:30–15:00 · Ada Wing 110',
    prerequisites: ['COMP201'],
    description:
      'State-machine replication, Raft leader election, Lamport clocks, and linearizable storage.',
    accentColor: '#6366F1',
    motto: 'Fault tolerance by mathematical invariant',
    objectives: [
      { id: 'obj4', label: 'Implement Raft log replication invariants', completed: true },
      { id: 'obj5', label: 'Analyze network partition safety vs liveness', completed: false },
    ],
    materials: [
      { id: 'mat3', title: 'Raft Paper Annotated Seminar Notes', format: 'PDF', size: '4.1 MB' },
    ],
  },
  {
    id: 'course_math240',
    code: 'MATH240',
    title: 'Linear Optimization & Convexity',
    credits: 3,
    semester: 'Autumn 2026',
    lecturerUid: 'faculty-patel',
    lecturerName: 'Dr. Rohan Patel',
    department: 'Mathematics',
    capacity: 60,
    schedule: 'Mon / Fri · 14:00–15:15 · Euler Pavilion 302',
    prerequisites: [],
    description:
      'Simplex tableaux, strong duality, KKT conditions, and convex modeling in resource scheduling.',
    accentColor: '#10B981',
    motto: 'Optimal structures under constraint',
    objectives: [
      { id: 'obj6', label: 'Formulate primal-dual linear programs', completed: true },
      { id: 'obj7', label: 'Solve interior-point barrier problems', completed: false },
    ],
    materials: [
      { id: 'mat4', title: 'Convexity Problem Set 03', format: 'PDF', size: '1.8 MB' },
    ],
  },
  {
    id: 'course_eng205',
    code: 'ENG205',
    title: 'Technical Documentation & Research Rhetoric',
    credits: 3,
    semester: 'Autumn 2026',
    lecturerUid: 'faculty-vance',
    lecturerName: 'Prof. Eleanor Vance',
    department: 'Humanities & Computing',
    capacity: 30,
    schedule: 'Thu · 09:30–11:30 · Senate Seminar 12',
    prerequisites: [],
    description:
      'RFC drafting, architectural traceability prose, and executive technical communication.',
    accentColor: '#F59E0B',
    motto: 'Precision prose for complex systems',
    objectives: [
      { id: 'obj8', label: 'Draft peer-reviewed architecture RFC', completed: false },
    ],
    materials: [
      { id: 'mat5', title: 'RFC Style & Evidence Guide', format: 'PDF', size: '980 KB' },
    ],
  },
];

export const INITIAL_ENROLLMENTS: EnrollmentRecord[] = [
  { id: 'enr_1', courseId: 'course_comp301', studentUid: 'demo_student_maya', status: 'active' },
  { id: 'enr_2', courseId: 'course_cs410', studentUid: 'demo_student_maya', status: 'active' },
  { id: 'enr_3', courseId: 'course_math240', studentUid: 'demo_student_maya', status: 'active' },
];

export const INITIAL_ASSIGNMENTS: AssignmentRecord[] = [
  {
    id: 'asg_comp301_1',
    courseId: 'course_comp301',
    title: 'ADR Baseline & Domain Boundary Specification',
    description:
      'Author the modular monolith architecture document covering Identity, Courses, and Learning boundaries along with the initial permission matrix.',
    dueAt: '2026-11-18T23:59:00Z',
    maxPoints: 100,
    published: true,
    acceptedTypes: ['pdf', 'docx'],
    createdByUid: 'faculty-vance',
  },
  {
    id: 'asg_comp301_2',
    courseId: 'course_comp301',
    title: 'PlantUML Sequence & Submission State Diagrams',
    description:
      'Deliver the C4 component diagram, submission state machine, and traceability evidence table.',
    dueAt: '2026-11-26T23:59:00Z',
    maxPoints: 100,
    published: true,
    acceptedTypes: ['pdf', 'docx'],
    createdByUid: 'faculty-vance',
  },
  {
    id: 'asg_cs410_1',
    courseId: 'course_cs410',
    title: 'Raft Leader Election & Split-Brain Proof',
    description:
      'Formal safety argument for Election Safety and Log Matching invariants under asymmetric network delays.',
    dueAt: '2026-11-15T23:59:00Z',
    maxPoints: 100,
    published: true,
    acceptedTypes: ['pdf', 'docx'],
    createdByUid: 'faculty-vance',
  },
  {
    id: 'asg_math240_1',
    courseId: 'course_math240',
    title: 'Primal-Dual Sensitivity Analysis Report',
    description:
      'Compute shadow prices and reduced costs for the university timetabling linear program.',
    dueAt: '2026-11-10T23:59:00Z',
    maxPoints: 100,
    published: true,
    acceptedTypes: ['pdf', 'docx'],
    createdByUid: 'faculty-patel',
  },
];

export const INITIAL_SUBMISSIONS: SubmissionRecord[] = [
  {
    id: 'sub_math240_maya',
    assignmentId: 'asg_math240_1',
    courseId: 'course_math240',
    studentUid: 'demo_student_maya',
    filename: 'maya_chen_math240_duality.pdf',
    fileType: 'pdf',
    fileSizeBytes: 1842000,
    submittedAt: '2026-11-09T18:42:00Z',
    isLate: false,
    notes: 'Includes full tableau steps and sensitivity intervals.',
  },
  {
    id: 'sub_comp301_liam',
    assignmentId: 'asg_comp301_1',
    courseId: 'course_comp301',
    studentUid: 'demo_student_liam',
    filename: 'liam_okafor_comp301_adr.docx',
    fileType: 'docx',
    fileSizeBytes: 940000,
    submittedAt: '2026-11-12T10:15:00Z',
    isLate: false,
    notes: 'First draft of modular monolith boundaries.',
  },
];

export const INITIAL_FEEDBACK: FeedbackRecord[] = [
  {
    id: 'fb_math240_maya',
    submissionId: 'sub_math240_maya',
    courseId: 'course_math240',
    lecturerUid: 'faculty-patel',
    score: 94,
    maxPoints: 100,
    comment:
      'Crisp dual formulation and complete complementary slackness proof. Minor rounding drift in tableau iteration 3.',
    rubricBreakdown: [
      { criterion: 'Primal-Dual Formulation', points: 34, max: 35 },
      { criterion: 'Complementary Slackness Proof', points: 35, max: 35 },
      { criterion: 'Sensitivity Interpretation', points: 25, max: 30 },
    ],
    updatedAt: '2026-11-11T16:20:00Z',
  },
];

export interface InvoiceItem {
  id: string;
  semester: string;
  title: string;
  category: 'Tuition' | 'Housing' | 'Laboratory' | 'Library';
  amountCents: number;
  paidCents: number;
  status: 'paid' | 'pending' | 'overdue';
  dueAt: string;
}

export const INITIAL_INVOICES: InvoiceItem[] = [
  {
    id: 'inv_tuition_2026',
    semester: 'Autumn 2026',
    title: 'Autumn Semester Undergraduate Tuition (11 Credits)',
    category: 'Tuition',
    amountCents: 462500,
    paidCents: 462500,
    status: 'paid',
    dueAt: '2026-09-15',
  },
  {
    id: 'inv_housing_2026',
    semester: 'Autumn 2026',
    title: 'North Quad Residence Hall — Suite 4B',
    category: 'Housing',
    amountCents: 185000,
    paidCents: 92500,
    status: 'pending',
    dueAt: '2026-11-30',
  },
  {
    id: 'inv_lab_2026',
    semester: 'Autumn 2026',
    title: 'Distributed Computing Cluster Allocation Fee',
    category: 'Laboratory',
    amountCents: 24000,
    paidCents: 0,
    status: 'pending',
    dueAt: '2026-12-05',
  },
];

export interface ServiceRequestItem {
  id: string;
  studentUid: string;
  studentName: string;
  type: 'exeat' | 'transcript' | 'housing' | 'dispute' | 'room_booking';
  title: string;
  details: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  decisionNote?: string;
}

export const INITIAL_SERVICE_REQUESTS: ServiceRequestItem[] = [
  {
    id: 'req_1',
    studentUid: 'demo_student_maya',
    studentName: 'Maya Chen',
    type: 'exeat',
    title: 'Weekend Hackathon Travel Leave (Cambridge)',
    details: 'Departing Friday 17:00, returning Sunday 21:00. Emergency contact verified.',
    status: 'approved',
    createdAt: '2026-11-08',
    decisionNote: 'Approved by Senior Warden · North Quad.',
  },
  {
    id: 'req_2',
    studentUid: 'demo_student_maya',
    studentName: 'Maya Chen',
    type: 'transcript',
    title: 'Official Interim Transcript for Summer Research Fellowship',
    details: 'Certified PDF + QR Scholar Passport attestation requested for faculty sponsor.',
    status: 'pending',
    createdAt: '2026-11-12',
  },
];

export interface NewsArticle {
  id: string;
  category: string;
  date: string;
  title: string;
  summary: string;
  body: string;
  author: string;
}

export const CAMPUS_NEWS: NewsArticle[] = [
  {
    id: 'news_1',
    category: 'Academic Registry',
    date: 'Nov 12, 2026',
    title: 'Spring 2027 Module Registration Window Opens November 24',
    summary: 'Prerequisite audits and timetable clash detection are live in the Registration portal.',
    body: 'Students across Computer Science and Mathematics can now preview Spring 2027 module offerings and verify prerequisite completion inside Discivium Registration. Priority registration opens November 24 at 09:00 GMT based on completed credit standing.',
    author: 'Office of the Academic Registrar',
  },
  {
    id: 'news_2',
    category: 'Research & Careers',
    date: 'Nov 11, 2026',
    title: 'Lifelong Scholar Passport Employer Verification Live for 2026 Cohort',
    summary: 'Graduating and Year 3 students can share cryptographically signed transcripts with partner labs.',
    body: 'Partner engineering employers and graduate admissions boards can now inspect verified course competencies and QR credential cards directly from your Scholar Passport sharing panel with granular GPA visibility.',
    author: 'Career & Credentialing Directorate',
  },
  {
    id: 'news_3',
    category: 'Campus Operations',
    date: 'Nov 10, 2026',
    title: 'Turing Hall Extended Quiet Study Hours Through Exam Period',
    summary: 'Seminar rooms 201–208 are open until 01:00 daily via campus room booking.',
    body: 'In preparation for Autumn coursework deadlines and project demonstrations, Turing Hall upper study bays remain open until 01:00 with instant group room reservations enabled.',
    author: 'Campus Estates & Library Services',
  },
];

export const GPA_HISTORY = [
  { term: 'Aut 2024', gpa: 3.62, credits: 14, attendance: 95 },
  { term: 'Spr 2025', gpa: 3.74, credits: 15, attendance: 96 },
  { term: 'Aut 2025', gpa: 3.81, credits: 15, attendance: 97 },
  { term: 'Spr 2026', gpa: 3.85, credits: 16, attendance: 96 },
  { term: 'Aut 2026', gpa: 3.88, credits: 11, attendance: 98 },
];

export const ACADEMIC_TIMELINE = [
  {
    id: 'tl_1',
    period: 'Autumn 2026',
    institution: 'Discivium University',
    credential: 'BSc (Hons) Computer Science — Year 3 Standing',
    detail: 'Dean’s Commendation List · 3.88 CGPA · Software Architecture Lead Cohort',
    verifiedHash: 'sha256:9f84b2c1...e71a',
  },
  {
    id: 'tl_2',
    period: 'Summer 2026',
    institution: 'Helios Systems Research Lab',
    credential: 'Verified Undergraduate Systems Fellowship',
    detail: 'Built deterministic Raft state-machine simulator and benchmark harness.',
    verifiedHash: 'sha256:4a11d90f...c03b',
  },
  {
    id: 'tl_3',
    period: '2024 – 2026',
    institution: 'Discivium University',
    credential: 'Foundations in Algorithms, Linear Algebra & Operating Systems',
    detail: 'Completed 60 credits with 94% coursework completion rate.',
    verifiedHash: 'sha256:72c0e3a4...19d2',
  },
];

export const STUDENT_RISK_ROSTER = [
  {
    uid: 'demo_student_maya',
    name: 'Maya Chen',
    scholarOsId: 'DISC-2026-8841',
    course: 'COMP301',
    average: 92,
    attendance: 98,
    lateCount: 0,
    submissionStatus: 'On Schedule',
  },
  {
    uid: 'demo_student_liam',
    name: 'Liam Okafor',
    scholarOsId: 'DISC-2026-9012',
    course: 'COMP301',
    average: 71,
    attendance: 84,
    lateCount: 1,
    submissionStatus: 'Draft Submitted',
  },
  {
    uid: 'demo_student_nadia',
    name: 'Nadia Al-Mansoor',
    scholarOsId: 'DISC-2026-8754',
    course: 'CS410',
    average: 58,
    attendance: 72,
    lateCount: 2,
    submissionStatus: '2 Overdue Tasks',
  },
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'aud_1',
    timestamp: '2026-11-12 18:14:02',
    actor: 'Dr. Julian Mercer (Registrar)',
    action: 'Updated Institutional AI Policy',
    target: 'aiEnabled = true · Search Grounding Active',
  },
  {
    id: 'aud_2',
    timestamp: '2026-11-12 16:40:19',
    actor: 'Prof. Eleanor Vance',
    action: 'Published Assignment',
    target: 'COMP301 · ADR Baseline & Domain Boundary Specification',
  },
  {
    id: 'aud_3',
    timestamp: '2026-11-11 16:20:08',
    actor: 'Dr. Rohan Patel',
    action: 'Recorded Rubric Feedback',
    target: 'MATH240 · Submission #sub_math240_maya (94/100)',
  },
];
