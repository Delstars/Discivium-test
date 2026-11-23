import { db } from './index.ts';
import {
  users,
  courses,
  enrollments,
  assignments,
  submissions,
  feedback,
  financeInvoices,
  serviceRequests,
} from './schema.ts';
import { eq, desc } from 'drizzle-orm';

export async function getOrCreateSqlUser(params: {
  uid: string;
  email: string;
  displayName?: string;
  role?: string;
}) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email,
        displayName: params.displayName || params.email.split('@')[0],
        role: params.role || 'student',
        scholarOsId: `DISC-2026-${params.uid.slice(0, 4).toUpperCase()}`,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: params.email,
          displayName: params.displayName || params.email.split('@')[0],
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateSqlUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function seedInitialUniversityDataForUser(uid: string) {
  try {
    const existingCourses = await db.select().from(courses);
    let comp301 = existingCourses.find((c) => c.code === 'COMP301');

    if (!comp301) {
      const inserted = await db
        .insert(courses)
        .values([
          {
            code: 'COMP301',
            title: 'Software Architecture & Modular Systems',
            credits: 4,
            semester: 'Autumn 2026',
            lecturerUid: 'faculty-vance',
            department: 'Computer Science',
            capacity: 45,
            schedule: 'Mon/Wed 10:00 · Turing Hall 204',
            description:
              'Modular monoliths, C4 architectural modeling, domain boundaries, and verifiable authorization matrices.',
            accentColor: '#CE5D8C',
            motto: 'Clarity at every module boundary',
            prerequisites: ['COMP201'],
          },
          {
            code: 'CS410',
            title: 'Distributed Systems & Consensus',
            credits: 4,
            semester: 'Autumn 2026',
            lecturerUid: 'faculty-vance',
            department: 'Computer Science',
            capacity: 35,
            schedule: 'Tue/Thu 13:30 · Ada Wing 110',
            description: 'State-machine replication, Raft consensus, and fault-tolerant storage.',
            accentColor: '#6366F1',
            motto: 'Fault tolerance by mathematical invariant',
            prerequisites: ['COMP301'],
          },
          {
            code: 'MATH240',
            title: 'Linear Optimization & Convexity',
            credits: 3,
            semester: 'Autumn 2026',
            lecturerUid: 'faculty-patel',
            department: 'Mathematics',
            capacity: 60,
            schedule: 'Mon/Fri 14:00 · Euler Pavilion 302',
            description: 'Simplex algorithms, duality theory, and convex optimization in engineering.',
            accentColor: '#10B981',
            motto: 'Optimal structures under constraint',
            prerequisites: [],
          },
        ])
        .onConflictDoNothing()
        .returning();
      comp301 = inserted[0] || (await db.select().from(courses).where(eq(courses.code, 'COMP301')))[0];
    }

    if (comp301) {
      await db
        .insert(enrollments)
        .values({
          courseId: comp301.id,
          studentUid: uid,
          status: 'active',
        })
        .onConflictDoNothing();

      const existingAssignments = await db
        .select()
        .from(assignments)
        .where(eq(assignments.courseId, comp301.id));

      if (existingAssignments.length === 0) {
        await db.insert(assignments).values([
          {
            courseId: comp301.id,
            title: 'ADR Baseline & Domain Boundary Specification',
            description:
              'Document the modular monolith internal boundaries, permission matrix, and request-flow evidence in PDF or DOCX format.',
            dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            maxPoints: 100,
            published: true,
            acceptedTypes: ['pdf', 'docx'],
            createdByUid: 'faculty-vance',
          },
          {
            courseId: comp301.id,
            title: 'UML Sequence & State Transitions Portfolio',
            description:
              'Provide PlantUML component, deployment, and submission state diagrams with traceability links.',
            dueAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
            maxPoints: 100,
            published: true,
            acceptedTypes: ['pdf', 'docx'],
            createdByUid: 'faculty-vance',
          },
        ]);
      }
    }

    const existingInvoices = await db
      .select()
      .from(financeInvoices)
      .where(eq(financeInvoices.studentUid, uid));

    if (existingInvoices.length === 0) {
      await db.insert(financeInvoices).values([
        {
          studentUid: uid,
          semester: 'Autumn 2026',
          title: 'Autumn Semester Tuition & Laboratory Levy',
          category: 'Tuition',
          amountCents: 462500,
          paidCents: 462500,
          status: 'paid',
          dueAt: new Date('2026-09-15T00:00:00Z'),
        },
        {
          studentUid: uid,
          semester: 'Autumn 2026',
          title: 'Campus Residence Hall — North Quad Suite',
          category: 'Housing',
          amountCents: 185000,
          paidCents: 92500,
          status: 'pending',
          dueAt: new Date('2026-11-30T00:00:00Z'),
        },
      ]);
    }
  } catch (error) {
    console.error('Database query failed in seedInitialUniversityDataForUser:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getUserAcademicBundle(uid: string) {
  try {
    const [allCourses, userEnrollments, allAssignments, userSubmissions, userFeedback, invoices, requests] =
      await Promise.all([
        db.select().from(courses),
        db.select().from(enrollments).where(eq(enrollments.studentUid, uid)),
        db.select().from(assignments).orderBy(desc(assignments.dueAt)),
        db.select().from(submissions).where(eq(submissions.studentUid, uid)),
        db.select().from(feedback),
        db.select().from(financeInvoices).where(eq(financeInvoices.studentUid, uid)),
        db.select().from(serviceRequests).where(eq(serviceRequests.studentUid, uid)),
      ]);
    return {
      courses: allCourses,
      enrollments: userEnrollments,
      assignments: allAssignments,
      submissions: userSubmissions,
      feedback: userFeedback,
      invoices,
      requests,
    };
  } catch (error) {
    console.error('Database query failed in getUserAcademicBundle:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
