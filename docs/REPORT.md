# Discivium
## BCS305 — Software Architecture course project
Draft for team verification • Fall 2026 • Canadian University Dubai

**Team:** [insert registered team number and names]  
**Instructor:** Dr. Khaled Ammar  
**Repository:** https://github.com/Delstars/Discivium-test/tree/architecture-rebuild

This report describes the local coursework implementation on the architecture-rebuild branch. It is not a claim that the full university platform is complete or that every proposed quality target has been measured. Replace bracketed fields with verified team information before submitting.

## 1. Introduction and problem statement

Students and lecturers may need separate tools for coursework, deadlines, academic records and campus services. Fragmented workflows create avoidable context switching and make it harder to track the status of assignments and feedback. Discivium proposes a unified university portal for a UAE university context. The implemented release focuses on the coursework journey: a lecturer publishes an assignment, an enrolled student uploads a document, the lecturer downloads and grades it, and the student sees the feedback. Administrators can enroll students. The advisor interface explicitly states that advising is not implemented.

Scope exclusions: real university integration, financial transactions, self-service registration, official transcripts, attendance, live AI, cloud deployment and production security. The prototype is an independent local demonstration with fictional data; stakeholder validation and institutional adoption are not claimed.

## 2. Stakeholders and requirements

| Stakeholder | Interest | Architectural implication |
|---|---|---|
| Student | Reliable submission and private feedback | Ownership checks; persistent submission bytes |
| Lecturer | Publish, review and grade their courses | Relationship-based authorisation |
| Administrator | Maintain enrollments | Restricted admin operations |
| Advisor | Appropriate access to academic progression | No private access until consent and assignment rules are designed |
| University IT / assessor | Reproducible, explainable, secure design | Local setup, documentation, traceability |

### Functional requirements

| ID | Testable requirement | Source |
|---|---|---|
| FR1 | Authenticate a fictional account and resolve role on the server; reject invalid credentials. | All actors |
| FR2 | Assigned lecturers can publish an assignment with title, description, timezone-aware deadline, maximum score and policy. | Lecturer |
| FR3 | An enrolled student can submit one PDF or DOCX of up to 100 MB; reject invalid type, duplicate and strict late submission. | Student |
| FR4 | A lecturer assigned to the course can download the submitted bytes and grade once within 0 to maximum points, with feedback. | Lecturer |
| FR5 | Students can see their own released grade and feedback but not another student's submission. | Student |
| FR6 | Administrators can enroll a student; others cannot perform this operation. | Administrator |
| FR7 | Publish, submit and grade produce persistent audit events and recipient notifications in the same transaction. | University IT |
| FR8 | Users can view permitted coursework and download authorised documents only. | Student / lecturer |

### Quality attribute scenarios

Targets below are proposed acceptance criteria, not measured results. Source, stimulus, artefact, environment, response and measure are explicit.

| Attribute | Source and stimulus | Artefact and environment | Response and measure |
|---|---|---|---|
| Security | Unenrolled student requests another course's submission | Learning facade; logged in locally | Reject with 403; no file bytes returned or writes in every attempted test |
| Performance | Student uploads a 1 MB PDF | Local server and SQLite; one active user | Store and confirm; target 95% within 3 seconds over 20 runs |
| Reliability | Observer fails after document storage | Submission transaction; simulated exception | Roll back all writes; zero partial records in fault-injection test |
| Modifiability | Lecturer requests another deadline rule | Learning module; development | Add policy implementation and registration without changing the submit workflow; one new class plus registration |
| Availability | Team restarts process | Local deployment; database file intact | Server restarts and previously committed data is readable; target within 30 seconds in rehearsal |

Constraints: local loopback, fictional records only, no third-party runtime packages, 100 MB maximum document, deadline input UAE time, fixed seeded roles. No production availability or scalability guarantee.

## 3. Planning and development process

Incremental development is selected: requirements and models establish boundaries, then a vertical workflow proves them, then failure paths and documentation are aligned. This suits a small team and short course deadline; unlike a single waterfall delivery, each increment can be reviewed independently.

Actual evidence: the original Discivium repository documents an initial planning and architecture baseline, the AI Studio test scaffold commit is dated 23 November 2026, and the architecture rebuild was initiated 25 November 2026. The original roadmap records presentation sessions 4 and 11 December. The requested internal completion target is Friday 27 November. No unverified team activity is represented as completed.

| Period | Status / next action |
|---|---|
| Original planning period | Existing roadmap, UML sources and architecture proposal available |
| 23 November | AI Studio scaffold recorded in Git |
| 25 November | Rebuild branch, coursework implementation and draft model set |
| 26–27 November | Planned team review, test execution, demo rehearsal, verify report and export UML PDFs |
| Assigned presentation | Confirm team slot and Moodle deadline; every member rehearses |

## 4. Analysis models

Use-case diagram (UC1–UC8), activity for UC2, separate black-box SSDs for UC1, UC2 and UC3, and submission state machine are in the appendix. Logical observer work in the activity is shown as a fork/join of independent required effects; the implementation invokes observers serially inside a single transaction. This deliberately does not claim parallel runtime execution.

### UC1 — Publish assignment (FR2, FR7)
Actor: assigned lecturer. Goal: make coursework visible to enrolled students. Preconditions: authenticated; lecturer assigned to course. Main: (1) select course; (2) enter title, description, deadline, points, policy; (3) system validates role, relationship and fields; (4) system creates assignment, audit event and notifications; (5) commit and show assignment. Alternative: lecturer chooses strict or allow-late policy. Exceptions: wrong lecturer -> 403; invalid fields -> 400; write failure -> rollback. Postconditions: assignment visible and required events committed.

### UC2 — Submit assignment (FR3, FR7)
Actor: enrolled student. Goal: submit an actual document. Preconditions: authenticated and assignment exists. Main: (1) view course; (2) choose assignment and document; (3) system checks session, membership, file, policy and duplicates; (4) create submission and store bytes; (5) record audit and notify lecturer; (6) commit and display submitted status. Alternative: allow-late policy accepts and marks late. Exceptions: missing membership -> 403; invalid document -> 400; strict late/duplicate -> 409; storage or event failure -> rollback. Postconditions: one submission with real document and persistent audit/notification, or no partial change.

### UC3 — Release feedback (FR4, FR5, FR7)
Actor: assigned lecturer. Goal: release scored feedback. Preconditions: authenticated; ungraded submission exists; course assignment. Main: (1) view submissions; (2) download and review document; (3) enter score and comment; (4) validate lecturer, range and state; (5) create feedback, set state graded, notify student and audit; (6) commit and show feedback. Alternative: no alternative success path; score can be any integer within range. Exceptions: wrong lecturer -> 403; invalid score/comment -> 400; already graded -> 409; write failure -> rollback. Postconditions: student sees released feedback, no second grade.

### Model consistency

Student and lecturer are external actors; Discivium is the system lane. SSDs show only external requests/responses, while the internal sequence exposes components. State-changing learning operations are publish, submit and grade; publish creates an assignment, submit creates Submitted and grade transitions to Graded. Reading and downloading are non-mutating. Graded is terminal; late is a flag rather than an independent state. Enrollment is a separate record without a lifecycle in this prototype. Model vocabulary follows the code and database, not the legacy UI.

## 5. Domain and structural models

Conceptual domain: User, Course, Enrollment, Assignment, Submission, Feedback, Notification and AuditEntry. The domain model omits database keys and service operations. A course has one lecturer, many enrollments and assignments; each enrollment joins one student and one course. Each assignment has many submissions, but at most one per student. Each submission has zero or one feedback. These cardinalities are represented by foreign keys and uniqueness constraints in SQLite. Actual service classes and their operations are documented separately in the class diagram.

| Component | Responsibility | Interface / implementation |
|---|---|---|
| Web presentation | Request parsing, escaped HTML, CSRF, redirects, transaction boundary | app.py, views.py |
| Identity | Verify password and server-side role, session | IdentityService |
| Courses | Course ownership and enrollment checks | CourseService |
| Learning | Publication, submission, download, grading and read access | LearningFacade |
| Persistence | Database connection, schema, submission repository, file storage | Database, LearningRepository, SQLiteFileAdapter |
| Events | Audit and recipient notifications | EventBus, AuditObserver, NotificationObserver |

The architecture is layered but pragmatic: identity/course services and some learning/read-view operations use parameterised SQL directly, rather than having a repository class for every table. This is a known limitation of strict layering. The component diagram includes these dependencies. The deployment is one browser and one Python process on a local machine with a SQLite file; no external service is needed. The 4+1 views are represented by class/domain (logical), internal sequence (process interaction, single process), module/component (development), deployment (physical) and use cases (scenarios).

## 6. Architectural analysis and trade-offs

Candidate A: layered modular monolith, one deployable runtime, in-process interfaces, shared relational store. Candidate B: microservices, separate deployed identity/course/learning services and network interfaces. Candidate C: event-driven architecture, components exchanging events asynchronously. Observer is used within A, not a claim of distributed event-driven deployment.

| Criterion | A: layered monolith | B: microservices | C: asynchronous events |
|---|---|---|---|
| Security | Central session and service permission checks; fewer exposed interfaces | More service credentials and network boundaries | Must secure broker, publishers and subscribers |
| Performance | In-process calls; no network latency; SQLite single writer | Network and serialisation overhead | Fast acknowledgement possible, but eventual processing |
| Reliability | One transaction covers file, submission, audit | Distributed consistency requires orchestration | Durable broker and idempotency required |
| Modifiability | Explicit module seams; shared release | Independently deployable services | Decoupled handlers, harder end-to-end tracing |
| Availability | One process is a single failure point | Potential isolation, additional infrastructure | Broker dependency; recovery and backlog issues |
| Team effort | Local Python, no external runtime dependencies | Multiple deployments and contracts | Broker and event schema management |

Decision: A best supports the local deadline, reproducibility and atomicity requirements; accept the single-process bottleneck. The alternatives may become appropriate if independently measured workload or availability needs demand them. No benchmark is claimed.

Tactics: server-side session validation and relationship checks (security, adds query cost); transaction with immediate write lock (consistency, serializes writes); separated policies and storage interface (modifiability, adds indirection); persistent local store (restart recovery, not high availability). See ADR.md for three recorded decisions.

## 7. Design patterns applied

Each pattern has an actual call site in learning.py and a corresponding class diagram.

| Pattern | Problem | Implemented solution | Consequence |
|---|---|---|---|
| Facade (structural) | Handler would coordinate several learning operations | LearningFacade.submit coordinates CourseService, repository, validation, policy, storage and events | Simple web interface; facade can grow and needs decomposition |
| Strategy (behavioural) | Deadlines have different business rules | DeadlinePolicy.evaluate implemented by StrictDeadlinePolicy and AllowLatePolicy, selected by assignment policy | New rules isolated; policy registration and tests required |
| Adapter (structural) | Learning should not depend on SQLite BLOB API | SQLiteFileAdapter implements FileStorage.save/load by translating to parameterised SQL | Replacement interface; cloud adapter would need a different transaction strategy |
| Observer (behavioural) | Audit and notifications react to learning actions | EventBus.subscribe/publish invokes AuditObserver and NotificationObserver via update | Learning does not name individual observers; synchronous observer failure rolls back transaction |

Factory Method and Singleton were not forced into the solution: no complex creation family or shared global instance is required. Observer protocol is structural (duck typing in Python).

## 8. Prototype and verification

Run from repository root: python -m prototype.app. Open http://127.0.0.1:8000. All fictional accounts use DemoOnly!2026; see README for roles and exact demo. The legacy AI Studio application is retained but excluded from this runtime. Standard-library Python was selected over the previously proposed Django/SQLite and AI Studio React/Express/Firebase setup because it requires no package installation or cloud credentials for the demonstration. This trades away framework security and production features; HTTPServer is loopback-only, not production-grade.

Actual document bytes are stored in the SQLite file, linked to the submission. SQLite transactions cover the write operations and observers. Basic PDF/DOCX signature validation is not malware scanning. Shared demo password, HTTP, in-memory sessions, single server and no rate limiting are prototype limitations; do not use real accounts or publish the server.

| Requirement | Code / verification |
|---|---|
| FR1 | IdentityService; HTTP login and CSRF test |
| FR2 | LearningFacade.publish_assignment; workflow and permission tests |
| FR3 | LearningFacade.submit; validation, strategy and duplicate tests |
| FR4–5 | LearningFacade.grade/download/submissions; workflow, permission, HTTP tests |
| FR6 | CourseService.enroll; manual administrator demonstration |
| FR7 | EventBus / observers; workflow counts and rollback injection |
| FR8 | CourseService.visible, LearningFacade read operations; HTTP and permission tests |

Run python -m unittest prototype.tests -v. Record observed output here: 25 November 2026 — automated unittest step succeeded on commit fe36b97ce3ba4ca3484eaf509c43b314c48d657a, GitHub Actions run 45602361622. Individual log inspection was unavailable when this note was recorded; PDF export and team-machine rehearsal were not yet confirmed.. Performance scenario, restart timing, DOCX sample and team-machine rehearsal require manual verification. Test cases are not test results.

## 9. Reflection

The initial prototype emphasized breadth and interface presentation rather than actual authoritative persistence. The rebuild instead prioritizes a demonstrable vertical workflow and consistent security boundaries. A future iteration should integrate selected UI assets, introduce a production web framework, move residual SQL to repositories, add stronger validation and deployment security, and implement controlled advising and registration only after requirements are verified. Scope reductions and unmeasured quality targets are explicitly acknowledged.

## 10. Contribution statement and AI use

Complete this with actual contributions and signatures; do not invent participation.

| Team member | Actual contribution / evidence | Signature |
|---|---|---|
| [Name] | [Tasks, commits, reviews] | [Sign] |
| [Name] | [Tasks, commits, reviews] | [Sign] |
| [Name] | [Tasks, commits, reviews] | [Sign] |
| [Name if applicable] | [Tasks, commits, reviews] | [Sign] |

Google AI Studio generated the earlier prototype. ChatGPT inspected the project brief, lecture materials and two repositories, generated the rebuild code, tests, model sources, ADRs and this report draft. The team must record its actual review, edits, validation and individual contributions. The team remains responsible for explaining every diagram, pattern and decision.

Course references: BCS305 official project description; Modules 02 (SDLC), 03 (Requirements Engineering), 04 (System Analysis Models), 06 (Structure, Interaction & Views), 07 (Architectural Design), 09 (Quality Attributes, Trade-offs & Styles), 11 (Design Patterns in Python), and Week 6 Model Set Studio. No lecture files are redistributed in the repository.

## Appendix — UML diagram set

See docs/uml for editable PlantUML sources. Export using the instructions in docs/EXPORT.md. 
