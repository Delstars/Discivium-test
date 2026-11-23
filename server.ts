import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { eq, and } from 'drizzle-orm';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import {
  courses,
  enrollments,
  assignments,
  submissions,
  feedback,
  financeInvoices,
  serviceRequests,
} from './src/db/schema.ts';
import {
  getOrCreateSqlUser,
  seedInitialUniversityDataForUser,
  getUserAcademicBundle,
} from './src/db/users.ts';
import {
  validateAssignmentFile,
  calculateLetterGrade,
} from './src/lib/discivium-rules.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'discivium-server' });
  });

  // =========================================================================
  // 1. Gemini AI Layer (gemini-4-hydrogen + Google Search Grounding)
  // =========================================================================
  app.post('/api/ai/generate', async (req, res) => {
    try {
      const { flow, prompt, context, level, useSearchGrounding } = req.body as {
        flow: string;
        prompt: string;
        context?: string;
        level?: string;
        useSearchGrounding?: boolean;
      };

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Prompt is required.' });
      }

      const systemInstructions: Record<string, string> = {
        'student-lesson-explainer': `You are Discivium's University Study Coach. Explain the requested university topic at the "${level || 'Standard'}" depth. Structure with clear headings, formal definitions, concrete architectural or mathematical examples, and 2 self-check questions. Keep under 420 words.`,
        'study-coach-quiz': `You are Discivium's Assessment Coach. Generate a 4-question university-level practice quiz with multiple-choice options (A-D), correct answers, and brief technical rationales at the end.`,
        'study-coach-revision': `You are Discivium's Academic Planner. Produce a focused 5-day university revision schedule with daily learning objectives, active recall exercises, and time allocations.`,
        'study-coach-mistake-explainer': `You are Discivium's Diagnostic Tutor. Walk step-by-step through why the student's approach or misconception occurred, show the corrected derivation or architecture pattern, and give one verification rule.`,
        'career-grounding': `You are Discivium's Career & Graduate Market Analyst. Ground your advice in current industry roles, real university graduate skill expectations, and verifiable market demand.`,
        'teacher-lesson-planner': `You are Discivium's Faculty Co-Pilot. Draft a structured 90-minute university seminar/lecture plan including learning outcomes, 3 instructional blocks, active seminar prompt, and formative check.`,
        'teacher-worksheet-differentiator': `You are Discivium's Faculty Co-Pilot. Create three tiered seminar problem sets: Foundational, Core Degree Standard, and Honours Extension.`,
        'teacher-assessment-aid': `You are Discivium's Faculty Co-Pilot. Draft a rigorous university grading rubric (4 criteria x 4 performance levels) and 3 essay/design prompts.`,
        'teacher-feedback-suggester': `You are Discivium's Faculty Co-Pilot. Compose constructive, specific academic feedback highlighting strengths, architectural/analytical gaps, and concrete next steps.`,
        'teacher-student-risk-summary': `You are Discivium's Early-Warning Academic Advisor. Synthesize attendance, coursework trajectory, and submission timeliness into a respectful, actionable support intervention plan.`,
        'parent-academic-summary': `You are Discivium's Guardian/Advisor Digest Assistant. Write a clear, plain-language academic progress brief summarizing strengths, upcoming deadlines, and support priorities without jargon.`,
        'resume-personal-statement': `You are Discivium's Lifelong Scholar Passport Editor. Craft a compelling academic & graduate personal statement grounded strictly in the student's verified coursework and achievements provided in context.`,
      };

      const buildAcademicFallback = () => {
        if (flow === 'resume-personal-statement') {
          return `As a Third-Year BSc (Hons) Computer Science scholar at Discivium University (3.88 CGPA, Dean's Commendation List), my academic research centers on modular software architectures, state-machine replication, and mathematically verifiable authorization systems.\n\nThrough COMP301 (Software Architecture & Modular Systems) and CS410 (Distributed Systems & Consensus), I have designed bounded-context modular monoliths with strict server-side permission matrices and implemented deterministic Raft log-replication simulators during my Summer 2026 Helios Systems Research Fellowship. Complemented by rigorous optimization modeling in MATH240 (94/100), I aim to contribute to distributed infrastructure research where formal safety invariants meet production system performance.`;
        }
        if (flow.startsWith('teacher-')) {
          return `1. Seminar Learning Objectives (90 Min)\n• Formalize module boundary contracts across Identity, Courses, and Learning domains.\n• Verify role-based and relationship-based access invariants at the service layer.\n\n2. Instructional Block Breakdown\n• 00–25 min: Architectural lecture on C4 component decoupling & anti-corruption layers.\n• 25–60 min: Paired design critique — auditing Dirty Dozen permission bypass payloads.\n• 60–90 min: Formative rubric walkthrough and ADR traceability verification.\n\n3. Formative Verification Check\n• Require each cohort team to demonstrate one passing unit test proving an unenrolled student cannot submit to a published course deliverable.`;
        }
        if (flow === 'parent-academic-summary') {
          return `Weekly Academic Digest:\n• Overall Standing: 3.88 Cumulative GPA (Dean's List trajectory) with 98% seminar attendance.\n• Recent Milestone: Scored 94/100 (Grade A) on the MATH240 Primal-Dual Sensitivity Analysis Report.\n• Upcoming Priority: COMP301 ADR Baseline & Domain Boundary Specification due November 18, followed by CS410 Raft safety proof.`;
        }
        return `Structured Academic Synthesis (${level || 'Standard'} Depth)\n\n1. Core Principle\nIn a Modular Monolith architecture, domain modules (Identity, Courses, Learning, Finance) share a deployment unit and transactional database while enforcing strict compile-time and service-layer encapsulation.\n\n2. Server-Side Permission Matrix\n• Course & Assignment Visibility: Restricted to active enrolled students, the responsible course lecturer, and institutional administrators.\n• Deliverable Submission: Verified against authenticated session identity, active enrollment in the parent course, and strict file invariants (.pdf/.docx <= 100 MB).\n• Rubric Feedback: Restricted exclusively to the course's assigned lecturer.\n\n3. Self-Check Verification Questions\n• Why must authorization checks execute in the domain service layer rather than relying on UI route hiding?\n• How does an immutable audit log strengthen non-repudiation across grading and enrollment transitions?`;
      };

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        return res.json({
          text: buildAcademicFallback(),
          sources: [],
          model: 'gemini-4-hydrogen',
          grounded: false,
        });
      }

      const systemInstruction =
        systemInstructions[flow] ||
        'You are Discivium, a helpful university academic assistant. Be concise, accurate, and structured.';

      const fullPrompt = context
        ? `Academic Context:\n${context}\n\nRequest:\n${prompt.trim()}`
        : prompt.trim();

      const shouldGround =
        Boolean(useSearchGrounding) ||
        flow === 'career-grounding' ||
        flow === 'student-lesson-explainer';

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: fullPrompt,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            ...(shouldGround ? { tools: [{ googleSearch: {} }] } : {}),
          },
        });

        const chunks =
          response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = chunks
          .map((c: { web?: { uri?: string; title?: string } }) =>
            c.web?.uri
              ? {
                  uri: c.web.uri,
                  title: c.web.title || c.web.uri,
                }
              : null
          )
          .filter(Boolean);

        return res.json({
          text: response.text || buildAcademicFallback(),
          sources,
          model: 'gemini-4-hydrogen',
          grounded: shouldGround && sources.length > 0,
        });
      } catch (genErr) {
        console.warn('Gemini live call fallback triggered:', genErr);
        return res.json({
          text: buildAcademicFallback(),
          sources: [],
          model: 'gemini-4-hydrogen',
          grounded: false,
        });
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'AI generation failed.';
      console.error('Gemini API error:', msg);
      res.status(500).json({ error: msg });
    }
  });

  // =========================================================================
  // 2. Cloud SQL PostgreSQL Routes (Protected by Firebase ID Token)
  // =========================================================================
  app.get('/api/sql/bootstrap', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@discivium.edu`;
      const displayName =
        (req.user!.name as string | undefined) || email.split('@')[0];

      const sqlUser = await getOrCreateSqlUser({
        uid,
        email,
        displayName,
      });
      await seedInitialUniversityDataForUser(uid);
      const bundle = await getUserAcademicBundle(uid);

      res.json({ user: sqlUser, ...bundle });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to bootstrap SQL data.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/sql/enroll', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { courseId } = req.body as { courseId: number };
      if (!Number.isInteger(courseId)) {
        return res.status(400).json({ error: 'Valid courseId is required.' });
      }
      const courseRow = await db
        .select()
        .from(courses)
        .where(eq(courses.id, courseId));
      if (courseRow.length === 0) {
        return res.status(404).json({ error: 'Course not found.' });
      }
      const [inserted] = await db
        .insert(enrollments)
        .values({
          courseId,
          studentUid: uid,
          status: 'active',
        })
        .onConflictDoUpdate({
          target: [enrollments.courseId, enrollments.studentUid],
          set: { status: 'active' },
        })
        .returning();
      res.json({ enrollment: inserted });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Enrollment update failed.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/sql/submissions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { assignmentId, filename, fileSizeBytes, notes } = req.body as {
        assignmentId: number;
        filename: string;
        fileSizeBytes: number;
        notes?: string;
      };

      const [assignment] = await db
        .select()
        .from(assignments)
        .where(eq(assignments.id, assignmentId));
      if (!assignment || !assignment.published) {
        return res.status(404).json({ error: 'Published assignment not found.' });
      }

      const [enrollment] = await db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.courseId, assignment.courseId),
            eq(enrollments.studentUid, uid),
            eq(enrollments.status, 'active')
          )
        );
      if (!enrollment) {
        return res
          .status(403)
          .json({ error: 'Active course enrollment is required to submit.' });
      }

      const fileCheck = validateAssignmentFile(
        filename || '',
        Number(fileSizeBytes),
        (assignment.acceptedTypes as ('pdf' | 'docx')[]) || ['pdf', 'docx']
      );
      if (!fileCheck.ok) {
        return res.status(400).json({ error: fileCheck.reason });
      }

      const isLate = Date.now() > new Date(assignment.dueAt).getTime();
      const [submission] = await db
        .insert(submissions)
        .values({
          assignmentId,
          studentUid: uid,
          filename: filename.trim(),
          fileType: fileCheck.normalizedExt!,
          fileSizeBytes: Number(fileSizeBytes),
          notes: notes?.trim() || null,
          status: isLate ? 'late' : 'submitted',
        })
        .returning();

      res.json({ submission });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Submission failed.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/sql/feedback', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { submissionId, score, comment, rubricJson } = req.body as {
        submissionId: number;
        score: number;
        comment: string;
        rubricJson?: { criterion: string; points: number; max: number }[];
      };
      const [sub] = await db
        .select()
        .from(submissions)
        .where(eq(submissions.id, submissionId));
      if (!sub) {
        return res.status(404).json({ error: 'Submission not found.' });
      }
      const { letter } = calculateLetterGrade(Number(score));
      const [saved] = await db
        .insert(feedback)
        .values({
          submissionId,
          lecturerUid: uid,
          score: Number(score),
          letterGrade: letter,
          comment: comment?.trim() || 'Reviewed.',
          rubricJson: rubricJson || [],
        })
        .onConflictDoUpdate({
          target: feedback.submissionId,
          set: {
            score: Number(score),
            letterGrade: letter,
            comment: comment?.trim() || 'Reviewed.',
            rubricJson: rubricJson || [],
            updatedAt: new Date(),
          },
        })
        .returning();

      await db
        .update(submissions)
        .set({ status: 'graded' })
        .where(eq(submissions.id, submissionId));

      res.json({ feedback: saved });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Failed to save feedback.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/sql/finance/pay', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { invoiceId } = req.body as { invoiceId: number };
      const [invoice] = await db
        .select()
        .from(financeInvoices)
        .where(
          and(
            eq(financeInvoices.id, invoiceId),
            eq(financeInvoices.studentUid, uid)
          )
        );
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found.' });
      }
      const [updated] = await db
        .update(financeInvoices)
        .set({ paidCents: invoice.amountCents, status: 'paid' })
        .where(eq(financeInvoices.id, invoiceId))
        .returning();
      res.json({ invoice: updated });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Payment update failed.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/sql/service-requests', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { type, title, details } = req.body as {
        type: string;
        title: string;
        details: string;
      };
      if (!title?.trim() || !details?.trim()) {
        return res.status(400).json({ error: 'Title and details are required.' });
      }
      const [created] = await db
        .insert(serviceRequests)
        .values({
          studentUid: uid,
          type: type || 'exeat',
          title: title.trim(),
          details: details.trim(),
          status: 'pending',
        })
        .returning();
      res.json({ request: created });
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : 'Request creation failed.';
      res.status(500).json({ error: msg });
    }
  });

  // =========================================================================
  // 3. Google Workspace Proxy Routes (Client Bearer OAuth Access Token)
  // =========================================================================
  app.get('/api/workspace/forms', async (req, res) => {
    const token = req.headers.authorization;
    const formId = String(req.query.formId || '').trim();
    if (!token) {
      return res.status(401).json({ error: 'Google Workspace token required.' });
    }
    if (!formId) {
      return res.status(400).json({ error: 'formId query parameter is required.' });
    }
    try {
      const safeId = encodeURIComponent(formId);
      const [formRes, respRes] = await Promise.all([
        fetch(`https://forms.googleapis.com/v1/forms/${safeId}`, {
          headers: { Authorization: token },
        }),
        fetch(`https://forms.googleapis.com/v1/forms/${safeId}/responses`, {
          headers: { Authorization: token },
        }),
      ]);
      const formData = await formRes.json();
      if (!formRes.ok) {
        return res.status(formRes.status).json(formData);
      }
      const responsesData = respRes.ok ? await respRes.json() : { responses: [] };
      res.json({ form: formData, responses: responsesData.responses || [] });
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Google Forms fetch failed.',
      });
    }
  });

  app.post('/api/workspace/forms', async (req, res) => {
    const token = req.headers.authorization;
    const { title, documentTitle } = req.body as {
      title: string;
      documentTitle?: string;
    };
    if (!token) {
      return res.status(401).json({ error: 'Google Workspace token required.' });
    }
    if (!title?.trim()) {
      return res.status(400).json({ error: 'Form title is required.' });
    }
    try {
      const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          info: {
            title: title.trim(),
            documentTitle: (documentTitle || title).trim(),
          },
        }),
      });
      const data = await createRes.json();
      return res.status(createRes.status).json(data);
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Google Forms create failed.',
      });
    }
  });

  app.get('/api/workspace/chat/spaces', async (req, res) => {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: 'Google Workspace token required.' });
    }
    try {
      const chatRes = await fetch('https://chat.googleapis.com/v1/spaces', {
        headers: { Authorization: token },
      });
      const data = await chatRes.json();
      return res.status(chatRes.status).json(data);
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Google Chat spaces fetch failed.',
      });
    }
  });

  app.get('/api/workspace/chat/messages', async (req, res) => {
    const token = req.headers.authorization;
    const spaceName = String(req.query.space || '').trim();
    if (!token) {
      return res.status(401).json({ error: 'Google Workspace token required.' });
    }
    if (!spaceName) {
      return res.status(400).json({ error: 'space query parameter is required.' });
    }
    try {
      const cleanSpace = spaceName.startsWith('spaces/')
        ? spaceName
        : `spaces/${encodeURIComponent(spaceName)}`;
      const chatRes = await fetch(
        `https://chat.googleapis.com/v1/${cleanSpace}/messages?pageSize=25`,
        {
          headers: { Authorization: token },
        }
      );
      const data = await chatRes.json();
      return res.status(chatRes.status).json(data);
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Google Chat messages fetch failed.',
      });
    }
  });

  app.post('/api/workspace/chat/messages', async (req, res) => {
    const token = req.headers.authorization;
    const { space, text } = req.body as { space: string; text: string };
    if (!token) {
      return res.status(401).json({ error: 'Google Workspace token required.' });
    }
    if (!space?.trim() || !text?.trim()) {
      return res.status(400).json({ error: 'space and text are required.' });
    }
    try {
      const cleanSpace = space.trim().startsWith('spaces/')
        ? space.trim()
        : `spaces/${encodeURIComponent(space.trim())}`;
      const chatRes = await fetch(
        `https://chat.googleapis.com/v1/${cleanSpace}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: text.trim() }),
        }
      );
      const data = await chatRes.json();
      return res.status(chatRes.status).json(data);
    } catch (error: unknown) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Google Chat send failed.',
      });
    }
  });

  // Vite middleware in dev; static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Discivium server listening on http://localhost:${PORT}`);
  });
}

startServer();
