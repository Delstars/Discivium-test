import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default('University Scholar'),
  role: text('role').notNull().default('student'),
  scholarOsId: text('scholar_os_id').notNull().default('DISC-2026-0001'),
  department: text('department').notNull().default('Computer Science'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  credits: integer('credits').notNull().default(4),
  semester: text('semester').notNull().default('Autumn 2026'),
  lecturerUid: text('lecturer_uid').notNull(),
  department: text('department').notNull(),
  capacity: integer('capacity').notNull().default(45),
  schedule: text('schedule').notNull(),
  description: text('description').notNull(),
  accentColor: text('accent_color').notNull().default('#CE5D8C'),
  motto: text('motto').notNull().default('Precision through structured design'),
  prerequisites: jsonb('prerequisites').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const enrollments = pgTable(
  'enrollments',
  {
    id: serial('id').primaryKey(),
    courseId: integer('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    studentUid: text('student_uid').notNull(),
    status: text('status').notNull().default('active'),
    enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('enrollments_course_student_idx').on(table.courseId, table.studentUid)]
);

export const assignments = pgTable('assignments', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  dueAt: timestamp('due_at').notNull(),
  maxPoints: integer('max_points').notNull().default(100),
  published: boolean('published').notNull().default(true),
  acceptedTypes: jsonb('accepted_types').$type<string[]>().notNull().default(['pdf', 'docx']),
  createdByUid: text('created_by_uid').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  assignmentId: integer('assignment_id')
    .references(() => assignments.id, { onDelete: 'cascade' })
    .notNull(),
  studentUid: text('student_uid').notNull(),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(),
  fileSizeBytes: integer('file_size_bytes').notNull(),
  notes: text('notes'),
  status: text('status').notNull().default('submitted'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
});

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id')
    .references(() => submissions.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  lecturerUid: text('lecturer_uid').notNull(),
  score: integer('score').notNull(),
  letterGrade: text('letter_grade').notNull(),
  comment: text('comment').notNull(),
  rubricJson: jsonb('rubric_json')
    .$type<{ criterion: string; points: number; max: number }[]>()
    .notNull()
    .default([]),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const financeInvoices = pgTable('finance_invoices', {
  id: serial('id').primaryKey(),
  studentUid: text('student_uid').notNull(),
  semester: text('semester').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  amountCents: integer('amount_cents').notNull(),
  paidCents: integer('paid_cents').notNull().default(0),
  status: text('status').notNull().default('pending'),
  dueAt: timestamp('due_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const serviceRequests = pgTable('service_requests', {
  id: serial('id').primaryKey(),
  studentUid: text('student_uid').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  details: text('details').notNull(),
  status: text('status').notNull().default('pending'),
  reviewedByUid: text('reviewed_by_uid'),
  decisionNote: text('decision_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(enrollments),
  submissions: many(submissions),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  enrollments: many(enrollments),
  assignments: many(assignments),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  course: one(courses, {
    fields: [assignments.courseId],
    references: [courses.id],
  }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  feedback: one(feedback, {
    fields: [submissions.id],
    references: [feedback.submissionId],
  }),
}));
