import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  AssignmentRecord,
  DomainUser,
  EnrollmentRecord,
  FeedbackRecord,
  SubmissionRecord,
  UserRole,
  createAuthorizedSubmission,
  calculateLetterGrade,
  checkRegistrationEligibility,
} from '../lib/discivium-rules';
import {
  DEMO_USERS,
  INITIAL_ASSIGNMENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_COURSES,
  INITIAL_ENROLLMENTS,
  INITIAL_FEEDBACK,
  INITIAL_INVOICES,
  INITIAL_SERVICE_REQUESTS,
  INITIAL_SUBMISSIONS,
  ROLE_ACCENTS,
  type ExtendedCourse,
  type InvoiceItem,
  type ServiceRequestItem,
} from '../data/seedData';
import {
  initFirebaseAuthListener,
  signInWithGoogleWorkspace,
  signOutFirebase,
  testFirestoreConnection,
  syncUserPassportToFirestore,
  getCachedWorkspaceToken,
} from '../lib/firebase';

export type ThemeId =
  | 'light'
  | 'dark'
  | 'midnight'
  | 'galaxy'
  | 'aurora'
  | 'solar'
  | 'forest'
  | 'deep-space';

export type FontScale = 'small' | 'default' | 'large' | 'xl';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'deadline' | 'grade' | 'service' | 'finance' | 'system';
  time: string;
  read: boolean;
}

export interface PassportState {
  scholarOsId: string;
  holderName: string;
  institution: string;
  degreeTrack: string;
  shareWithEmployers: boolean;
  shareWithUniversities: boolean;
  shareGpa: boolean;
  personalStatement: string;
  disputes: {
    id: string;
    courseCode: string;
    reason: string;
    status: 'open' | 'resolved';
    createdAt: string;
  }[];
}

interface DisciviumContextValue {
  user: DomainUser | null;
  authMode: 'none' | 'demo' | 'google';
  firebaseUser: User | null;
  workspaceToken: string | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
  fontScale: FontScale;
  setFontScale: (s: FontScale) => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
  aiEnabled: boolean;
  setAiEnabled: (v: boolean) => void;
  formsEnabled: boolean;
  setFormsEnabled: (v: boolean) => void;
  chatEnabled: boolean;
  setChatEnabled: (v: boolean) => void;
  privacyMode: boolean;
  setPrivacyMode: (v: boolean) => void;
  prefillAiTopic: string;
  setPrefillAiTopic: (t: string) => void;

  courses: ExtendedCourse[];
  enrollments: EnrollmentRecord[];
  assignments: AssignmentRecord[];
  submissions: SubmissionRecord[];
  feedbackList: FeedbackRecord[];
  invoices: InvoiceItem[];
  serviceRequests: ServiceRequestItem[];
  notifications: NotificationItem[];
  auditLogs: { id: string; timestamp: string; actor: string; action: string; target: string }[];
  passport: PassportState;

  loginDemoRole: (role: UserRole) => void;
  loginGoogle: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  logout: () => Promise<void>;

  publishAssignment: (payload: {
    courseId: string;
    title: string;
    description: string;
    dueAt: string;
    maxPoints: number;
    published: boolean;
  }) => { ok: boolean; error?: string };
  toggleAssignmentPublished: (assignmentId: string) => void;

  submitAssignment: (payload: {
    assignmentId: string;
    filename: string;
    fileSizeBytes: number;
    notes?: string;
  }) => Promise<{ ok: boolean; error?: string }>;

  saveFeedback: (payload: {
    submissionId: string;
    score: number;
    comment: string;
    rubricBreakdown: { criterion: string; points: number; max: number }[];
  }) => Promise<{ ok: boolean; error?: string }>;

  enrollInCourse: (courseId: string) => Promise<{ ok: boolean; error?: string }>;
  toggleCourseObjective: (courseId: string, objectiveId: string) => void;
  customizeCourse: (courseId: string, patch: { accentColor?: string; motto?: string }) => void;
  createCourse: (payload: {
    code: string;
    title: string;
    department: string;
    credits: number;
    capacity: number;
    schedule: string;
  }) => { ok: boolean; error?: string };
  payInvoice: (invoiceId: string) => Promise<void>;
  createServiceRequest: (payload: {
    type: ServiceRequestItem['type'];
    title: string;
    details: string;
  }) => Promise<void>;
  decideServiceRequest: (id: string, status: 'approved' | 'rejected', note: string) => void;
  markAllNotificationsRead: () => void;
  updatePassportSharing: (patch: Partial<PassportState>) => void;
  submitPassportDispute: (courseCode: string, reason: string) => void;
  resolvePassportDispute: (disputeId: string) => void;
  appendAuditLog: (action: string, target: string) => void;
  resetDemoData: () => void;
}

const STORAGE_KEY = 'discivium_prod_state_v1';

const DisciviumContext = createContext<DisciviumContextValue | null>(null);

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'COMP301 Deadline Approaching',
    body: 'ADR Baseline & Domain Boundary Specification is due Nov 18 at 23:59.',
    category: 'deadline',
    time: '14m ago',
    read: false,
  },
  {
    id: 'n2',
    title: 'MATH240 Feedback Published',
    body: 'Dr. Rohan Patel graded Primal-Dual Sensitivity Analysis Report (94/100 · A).',
    category: 'grade',
    time: '2h ago',
    read: false,
  },
  {
    id: 'n3',
    title: 'Exeat Pass Approved',
    body: 'Weekend Hackathon Travel Leave (Cambridge) approved by North Quad Warden.',
    category: 'service',
    time: 'Yesterday',
    read: true,
  },
];

const DEFAULT_PASSPORT: PassportState = {
  scholarOsId: 'DISC-2026-8841',
  holderName: 'Maya Chen',
  institution: 'Discivium University',
  degreeTrack: 'BSc (Hons) Computer Science · Systems & Architecture',
  shareWithEmployers: true,
  shareWithUniversities: true,
  shareGpa: true,
  personalStatement:
    'Computer Science undergraduate specializing in modular software architectures, distributed consensus protocols, and mathematically verifiable authorization systems.',
  disputes: [],
};

function loadPersistedSlice<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && parsed[key] !== undefined ? (parsed[key] as T) : fallback;
  } catch {
    return fallback;
  }
}

export function DisciviumProvider({ children }: { children: React.ReactNode }) {
  const [authMode, setAuthMode] = useState<'none' | 'demo' | 'google'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'demo';
    }
    return loadPersistedSlice<'none' | 'demo' | 'google'>('authMode', 'none');
  });
  const [user, setUser] = useState<DomainUser | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return DEMO_USERS.student;
    }
    return loadPersistedSlice<DomainUser | null>('user', null);
  });
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [workspaceToken, setWorkspaceToken] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<ThemeId>(() => loadPersistedSlice<ThemeId>('theme', 'light'));
  const [fontScale, setFontScale] = useState<FontScale>(() =>
    loadPersistedSlice<FontScale>('fontScale', 'default')
  );
  const [accentColor, setAccentColor] = useState<string>(() =>
    loadPersistedSlice<string>('accentColor', ROLE_ACCENTS.student)
  );
  const [aiEnabled, setAiEnabled] = useState<boolean>(() =>
    loadPersistedSlice<boolean>('aiEnabled', true)
  );
  const [formsEnabled, setFormsEnabled] = useState<boolean>(() =>
    loadPersistedSlice<boolean>('formsEnabled', true)
  );
  const [chatEnabled, setChatEnabled] = useState<boolean>(() =>
    loadPersistedSlice<boolean>('chatEnabled', true)
  );
  const [privacyMode, setPrivacyMode] = useState(false);
  const [prefillAiTopic, setPrefillAiTopic] = useState('');

  const [courses, setCourses] = useState<ExtendedCourse[]>(() =>
    loadPersistedSlice('courses', INITIAL_COURSES)
  );
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>(() =>
    loadPersistedSlice('enrollments', INITIAL_ENROLLMENTS)
  );
  const [assignments, setAssignments] = useState<AssignmentRecord[]>(() =>
    loadPersistedSlice('assignments', INITIAL_ASSIGNMENTS)
  );
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>(() =>
    loadPersistedSlice('submissions', INITIAL_SUBMISSIONS)
  );
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>(() =>
    loadPersistedSlice('feedbackList', INITIAL_FEEDBACK)
  );
  const [invoices, setInvoices] = useState<InvoiceItem[]>(() =>
    loadPersistedSlice('invoices', INITIAL_INVOICES)
  );
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestItem[]>(() =>
    loadPersistedSlice('serviceRequests', INITIAL_SERVICE_REQUESTS)
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    loadPersistedSlice('notifications', INITIAL_NOTIFICATIONS)
  );
  const [auditLogs, setAuditLogs] = useState(() =>
    loadPersistedSlice('auditLogs', INITIAL_AUDIT_LOGS)
  );
  const [passport, setPassport] = useState<PassportState>(() =>
    loadPersistedSlice('passport', DEFAULT_PASSPORT)
  );

  // Persist state across reloads
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const snapshot = {
        authMode,
        user,
        theme,
        fontScale,
        accentColor,
        aiEnabled,
        formsEnabled,
        chatEnabled,
        courses,
        enrollments,
        assignments,
        submissions,
        feedbackList,
        invoices,
        serviceRequests,
        notifications,
        auditLogs,
        passport,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Ignore quota errors in private mode
    }
  }, [
    authMode,
    user,
    theme,
    fontScale,
    accentColor,
    aiEnabled,
    formsEnabled,
    chatEnabled,
    courses,
    enrollments,
    assignments,
    submissions,
    feedbackList,
    invoices,
    serviceRequests,
    notifications,
    auditLogs,
    passport,
  ]);

  // Apply theme & font scale to document root
  useEffect(() => {
    const root = document.documentElement;
    const isDarkTheme = !['light', 'solar'].includes(theme);
    root.classList.toggle('dark', isDarkTheme);
    root.setAttribute('data-theme', theme);
    const scaleMap: Record<FontScale, string> = {
      small: '0.92',
      default: '1',
      large: '1.08',
      xl: '1.16',
    };
    root.style.setProperty('--ui-scale', scaleMap[fontScale]);
    root.style.setProperty('--role-accent', accentColor);
  }, [theme, fontScale, accentColor]);

  // Verify Firestore connection on boot
  useEffect(() => {
    void testFirestoreConnection();
    const unsub = initFirebaseAuthListener((fbUser, token) => {
      setFirebaseUser(fbUser);
      setWorkspaceToken(token || getCachedWorkspaceToken());
    });
    return () => unsub();
  }, []);

  const appendAuditLog = useCallback(
    (action: string, target: string) => {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      setAuditLogs((prev) => [
        {
          id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: now,
          actor: user?.displayName || 'System',
          action,
          target,
        },
        ...prev,
      ]);
    },
    [user?.displayName]
  );

  const loginDemoRole = useCallback((role: UserRole) => {
    const targetUser = DEMO_USERS[role];
    setUser(targetUser);
    setAuthMode('demo');
    setAccentColor(ROLE_ACCENTS[role]);
    setActiveTab('dashboard');
  }, []);

  const switchRole = useCallback(
    (role: UserRole) => {
      if (authMode === 'google' && firebaseUser) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                role,
              }
            : {
                ...DEMO_USERS[role],
                uid: firebaseUser.uid,
                email: firebaseUser.email || DEMO_USERS[role].email,
                displayName: firebaseUser.displayName || DEMO_USERS[role].displayName,
                role,
              }
        );
      } else {
        setUser(DEMO_USERS[role]);
        setAuthMode('demo');
      }
      setAccentColor(ROLE_ACCENTS[role]);
      setActiveTab('dashboard');
      appendAuditLog('Switched Active Role', `Role -> ${role}`);
    },
    [authMode, firebaseUser, appendAuditLog]
  );

  const loginGoogle = useCallback(async () => {
    const { user: fbUser, idToken, workspaceAccessToken } = await signInWithGoogleWorkspace();
    setFirebaseUser(fbUser);
    setWorkspaceToken(workspaceAccessToken);
    const domainUser: DomainUser = {
      uid: fbUser.uid,
      email: fbUser.email || 'scholar@discivium.edu',
      displayName: fbUser.displayName || 'University Scholar',
      role: 'student',
      scholarOsId: `DISC-2026-${fbUser.uid.slice(0, 4).toUpperCase()}`,
      department: 'BSc Computer Science · Year 3',
    };
    setUser(domainUser);
    setAuthMode('google');
    setAccentColor(ROLE_ACCENTS.student);
    setActiveTab('dashboard');
    setPassport((p) => ({
      ...p,
      scholarOsId: domainUser.scholarOsId,
      holderName: domainUser.displayName,
    }));

    try {
      await syncUserPassportToFirestore({
        uid: domainUser.uid,
        displayName: domainUser.displayName,
        email: domainUser.email,
        scholarOsId: domainUser.scholarOsId,
        department: domainUser.department,
        theme,
        fontScale,
      });
    } catch (e) {
      console.warn('Firestore profile sync skipped:', e);
    }

    try {
      const res = await fetch('/api/sql/bootstrap', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const sqlData = await res.json();
        if (Array.isArray(sqlData.enrollments) && sqlData.enrollments.length > 0) {
          appendAuditLog('Synced Cloud SQL Session', domainUser.email);
        }
      }
    } catch (e) {
      console.warn('Cloud SQL bootstrap fallback:', e);
    }
  }, [theme, fontScale, appendAuditLog]);

  const logout = useCallback(async () => {
    if (authMode === 'google') {
      await signOutFirebase();
    }
    setUser(null);
    setAuthMode('none');
    setWorkspaceToken(null);
  }, [authMode]);

  const publishAssignment = useCallback(
    (payload: {
      courseId: string;
      title: string;
      description: string;
      dueAt: string;
      maxPoints: number;
      published: boolean;
    }) => {
      if (!user || user.role !== 'lecturer') {
        return { ok: false, error: 'Only course lecturers may publish assignments.' };
      }
      const course = courses.find((c) => c.id === payload.courseId);
      if (!course || course.lecturerUid !== user.uid) {
        return { ok: false, error: 'You are not the responsible lecturer for this course.' };
      }
      if (!payload.title.trim()) {
        return { ok: false, error: 'Assignment title is required.' };
      }
      const newAsg: AssignmentRecord = {
        id: `asg_${Date.now()}`,
        courseId: payload.courseId,
        title: payload.title.trim(),
        description: payload.description.trim() || 'Coursework specification.',
        dueAt: payload.dueAt || new Date(Date.now() + 7 * 86400000).toISOString(),
        maxPoints: payload.maxPoints || 100,
        published: payload.published,
        acceptedTypes: ['pdf', 'docx'],
        createdByUid: user.uid,
      };
      setAssignments((prev) => [newAsg, ...prev]);
      appendAuditLog(
        payload.published ? 'Published Assignment' : 'Saved Draft Assignment',
        `${course.code} · ${newAsg.title}`
      );
      return { ok: true };
    },
    [user, courses, appendAuditLog]
  );

  const toggleAssignmentPublished = useCallback(
    (assignmentId: string) => {
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? { ...a, published: !a.published } : a))
      );
      appendAuditLog('Toggled Assignment Visibility', assignmentId);
    },
    [appendAuditLog]
  );

  const submitAssignment = useCallback(
    async (payload: {
      assignmentId: string;
      filename: string;
      fileSizeBytes: number;
      notes?: string;
    }) => {
      const assignment = assignments.find((a) => a.id === payload.assignmentId);
      if (!assignment) return { ok: false, error: 'Assignment not found.' };
      const course = courses.find((c) => c.id === assignment.courseId);
      if (!course) return { ok: false, error: 'Course not found.' };

      const result = createAuthorizedSubmission({
        authenticatedUser: user,
        assignment,
        course,
        enrollments,
        filename: payload.filename,
        fileSizeBytes: payload.fileSizeBytes,
        nowIso: new Date().toISOString(),
        notes: payload.notes,
      });

      if (!result.ok) {
        return { ok: false, error: result.error };
      }

      setSubmissions((prev) => {
        const filtered = prev.filter(
          (s) => !(s.assignmentId === assignment.id && s.studentUid === user!.uid)
        );
        return [result.submission, ...filtered];
      });
      setNotifications((prev) => [
        {
          id: `notif_${Date.now()}`,
          title: 'Assignment Submitted',
          body: `${course.code}: ${payload.filename} recorded for ${assignment.title}.`,
          category: 'deadline',
          time: 'Just now',
          read: false,
        },
        ...prev,
      ]);
      appendAuditLog('Submitted Assignment', `${course.code} · ${payload.filename}`);
      return { ok: true };
    },
    [assignments, courses, enrollments, user, appendAuditLog]
  );

  const saveFeedback = useCallback(
    async (payload: {
      submissionId: string;
      score: number;
      comment: string;
      rubricBreakdown: { criterion: string; points: number; max: number }[];
    }) => {
      if (!user || user.role !== 'lecturer') {
        return { ok: false, error: 'Only course lecturers may record feedback.' };
      }
      const sub = submissions.find((s) => s.id === payload.submissionId);
      if (!sub) return { ok: false, error: 'Submission not found.' };
      const course = courses.find((c) => c.id === sub.courseId);
      if (!course || course.lecturerUid !== user.uid) {
        return { ok: false, error: 'Only the responsible lecturer for this course may grade.' };
      }
      const assignment = assignments.find((a) => a.id === sub.assignmentId);
      const maxPoints = assignment?.maxPoints || 100;
      const pct = Math.round((payload.score / maxPoints) * 100);
      const { letter } = calculateLetterGrade(pct);

      const newFb: FeedbackRecord = {
        id: `fb_${sub.id}`,
        submissionId: sub.id,
        courseId: sub.courseId,
        lecturerUid: user.uid,
        score: payload.score,
        maxPoints,
        comment: payload.comment.trim() || 'Reviewed and graded.',
        rubricBreakdown: payload.rubricBreakdown,
        updatedAt: new Date().toISOString(),
      };

      setFeedbackList((prev) => [newFb, ...prev.filter((f) => f.submissionId !== sub.id)]);
      setNotifications((prev) => [
        {
          id: `notif_${Date.now()}`,
          title: `Grade Released (${course.code})`,
          body: `Scored ${payload.score}/${maxPoints} (${letter}) on ${sub.filename}.`,
          category: 'grade',
          time: 'Just now',
          read: false,
        },
        ...prev,
      ]);
      appendAuditLog(
        'Recorded Rubric Feedback',
        `${course.code} · ${sub.filename} (${payload.score}/${maxPoints})`
      );
      return { ok: true };
    },
    [user, submissions, courses, assignments, appendAuditLog]
  );

  const enrollInCourse = useCallback(
    async (courseId: string) => {
      if (!user) return { ok: false, error: 'Authentication required.' };
      const course = courses.find((c) => c.id === courseId);
      if (!course) return { ok: false, error: 'Course not found.' };

      const eligibility = checkRegistrationEligibility({
        course,
        currentEnrollments: enrollments,
        completedCourseCodes: ['COMP201', 'CS102', 'MATH110'],
        studentUid: user.uid,
      });
      if (!eligibility.eligible) {
        return { ok: false, error: eligibility.reason };
      }

      setEnrollments((prev) => [
        ...prev,
        {
          id: `enr_${Date.now()}`,
          courseId,
          studentUid: user.uid,
          status: 'active',
        },
      ]);
      appendAuditLog('Enrolled in Module', `${course.code} · ${course.title}`);
      return { ok: true };
    },
    [user, courses, enrollments, appendAuditLog]
  );

  const toggleCourseObjective = useCallback(
    (courseId: string, objectiveId: string) => {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? {
                ...c,
                objectives: c.objectives.map((o) =>
                  o.id === objectiveId ? { ...o, completed: !o.completed } : o
                ),
              }
            : c
        )
      );
    },
    []
  );

  const customizeCourse = useCallback(
    (courseId: string, patch: { accentColor?: string; motto?: string }) => {
      setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, ...patch } : c)));
    },
    []
  );

  const createCourse = useCallback(
    (payload: {
      code: string;
      title: string;
      department: string;
      credits: number;
      capacity: number;
      schedule: string;
    }) => {
      if (!payload.code.trim() || !payload.title.trim()) {
        return { ok: false, error: 'Course code and title are required.' };
      }
      const codeUpper = payload.code.trim().toUpperCase();
      if (courses.some((c) => c.code.toUpperCase() === codeUpper)) {
        return { ok: false, error: `Module ${codeUpper} already exists in the catalog.` };
      }
      const created: ExtendedCourse = {
        id: `course_${codeUpper.toLowerCase()}_${Date.now()}`,
        code: codeUpper,
        title: payload.title.trim(),
        credits: Number(payload.credits) || 3,
        semester: 'Spring 2027',
        lecturerUid: 'faculty-vance',
        lecturerName: 'Prof. Eleanor Vance',
        department: payload.department.trim() || 'Computer Science',
        capacity: Number(payload.capacity) || 40,
        schedule: payload.schedule.trim() || 'Tue / Thu · 11:00–12:30 · Turing Hall 108',
        prerequisites: [],
        description: 'University honours module added via Academic Structure registry.',
        accentColor: '#6366F1',
        motto: 'Rigorous inquiry and verified execution',
        objectives: [
          { id: `obj_${Date.now()}_1`, label: 'Master core theoretical foundations', completed: false },
          { id: `obj_${Date.now()}_2`, label: 'Deliver peer-reviewed seminar artifact', completed: false },
        ],
        materials: [
          { id: `mat_${Date.now()}`, title: `${codeUpper} Module Syllabus & Reading List`, format: 'PDF', size: '1.2 MB' },
        ],
      };
      setCourses((prev) => [...prev, created]);
      appendAuditLog('Created Catalog Module', `${codeUpper} · ${created.title}`);
      return { ok: true };
    },
    [courses, appendAuditLog]
  );

  const payInvoice = useCallback(
    async (invoiceId: string) => {
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, paidCents: inv.amountCents, status: 'paid' } : inv
        )
      );
      appendAuditLog('Settled Student Invoice', `Invoice ${invoiceId}`);
    },
    [appendAuditLog]
  );

  const createServiceRequest = useCallback(
    async (payload: { type: ServiceRequestItem['type']; title: string; details: string }) => {
      const req: ServiceRequestItem = {
        id: `req_${Date.now()}`,
        studentUid: user?.uid || 'demo_student_maya',
        studentName: user?.displayName || 'Maya Chen',
        type: payload.type,
        title: payload.title.trim(),
        details: payload.details.trim(),
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setServiceRequests((prev) => [req, ...prev]);
      appendAuditLog('Submitted Student Service Request', `${payload.type} · ${payload.title}`);
    },
    [user, appendAuditLog]
  );

  const decideServiceRequest = useCallback(
    (id: string, status: 'approved' | 'rejected', note: string) => {
      setServiceRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status, decisionNote: note } : r))
      );
      appendAuditLog(`Service Request ${status}`, `Request ${id}`);
    },
    [appendAuditLog]
  );

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const updatePassportSharing = useCallback(
    (patch: Partial<PassportState>) => {
      setPassport((prev) => ({ ...prev, ...patch }));
      appendAuditLog('Updated Scholar Passport Consent', 'Sharing permissions updated');
    },
    [appendAuditLog]
  );

  const submitPassportDispute = useCallback(
    (courseCode: string, reason: string) => {
      setPassport((prev) => ({
        ...prev,
        disputes: [
          {
            id: `disp_${Date.now()}`,
            courseCode: courseCode.trim().toUpperCase(),
            reason: reason.trim(),
            status: 'open',
            createdAt: new Date().toISOString().slice(0, 10),
          },
          ...prev.disputes,
        ],
      }));
      appendAuditLog('Filed Credential Dispute', courseCode.trim().toUpperCase());
    },
    [appendAuditLog]
  );

  const resolvePassportDispute = useCallback(
    (disputeId: string) => {
      setPassport((prev) => ({
        ...prev,
        disputes: prev.disputes.map((d) =>
          d.id === disputeId ? { ...d, status: 'resolved' } : d
        ),
      }));
      appendAuditLog('Resolved Credential Dispute', disputeId);
    },
    [appendAuditLog]
  );

  const resetDemoData = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setCourses(INITIAL_COURSES);
    setEnrollments(INITIAL_ENROLLMENTS);
    setAssignments(INITIAL_ASSIGNMENTS);
    setSubmissions(INITIAL_SUBMISSIONS);
    setFeedbackList(INITIAL_FEEDBACK);
    setInvoices(INITIAL_INVOICES);
    setServiceRequests(INITIAL_SERVICE_REQUESTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setPassport(DEFAULT_PASSPORT);
    appendAuditLog('Reset Institutional Demo State', 'Factory Seed Restored');
  }, [appendAuditLog]);

  return (
    <DisciviumContext.Provider
      value={{
        user,
        authMode,
        firebaseUser,
        workspaceToken,
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        theme,
        setTheme,
        fontScale,
        setFontScale,
        accentColor,
        setAccentColor,
        aiEnabled,
        setAiEnabled,
        formsEnabled,
        setFormsEnabled,
        chatEnabled,
        setChatEnabled,
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
        notifications,
        auditLogs,
        passport,
        loginDemoRole,
        loginGoogle,
        switchRole,
        logout,
        publishAssignment,
        toggleAssignmentPublished,
        submitAssignment,
        saveFeedback,
        enrollInCourse,
        toggleCourseObjective,
        customizeCourse,
        createCourse,
        payInvoice,
        createServiceRequest,
        decideServiceRequest,
        markAllNotificationsRead,
        updatePassportSharing,
        submitPassportDispute,
        resolvePassportDispute,
        appendAuditLog,
        resetDemoData,
      }}
    >
      {children}
    </DisciviumContext.Provider>
  );
}

export function useDiscivium() {
  const ctx = useContext(DisciviumContext);
  if (!ctx) throw new Error('useDiscivium must be used within DisciviumProvider');
  return ctx;
}
