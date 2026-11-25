# Discivium — BCS305 coursework prototype

**Architecture rebuild branch.** A runnable local university coursework system, using fictional accounts. The original Google AI Studio React/Firebase/Express files are retained for comparison but are **not** part of the assessed runtime. Do not run the legacy server for this demonstration.

## Run (Python 3.11+; no third-party packages)

From the repository root:
```sh
python -m prototype.app
```
Open http://127.0.0.1:8000 in a browser. On Windows use `py -3` instead of `python` if needed. All demo accounts share **DemoOnly!2026**. They are deliberately public and must never be used in a deployment.

| Account | Responsibility |
| --- | --- |
| lecturer | BCS305 assigned lecturer |
| student | Enrolled in BCS305 |
| other | Not enrolled in BCS305; enrolled in BCS306 |
| lecturer2 | BCS306 assigned lecturer |
| admin | Enroll students |
| advisor | Explicitly out-of-scope advising page |

## Live demo

1. Sign in as lecturer and publish an assignment with a future deadline (UAE time), 30 points, strict or allow-late policy.
2. Sign out; sign in as student. Open BCS305 and upload a real small PDF or DOCX.
3. Sign in as lecturer; download the actual uploaded file, enter 27/30 and feedback, release it.
4. Sign in as student again; verify the score, feedback and notifications. Restart the server and verify persistence.
5. Demonstrate rejection: other cannot view BCS305 or download its submission; lecturer2 cannot grade it. Submit a wrong file type or duplicate; try an expired strict deadline.
6. Optional: admin enrolls another student; advisor page clearly labels unimplemented functionality.

## Tests
```sh
python -m unittest prototype.tests -v
```
Tests cover service rules and a full HTTP workflow with a temporary database. Do not claim passing results until the command has been run. Reset the demo by stopping the app and deleting only `prototype/runtime/discivium.sqlite3` (destroys local demo data).

## Scope and architecture

Layered modular monolith: browser / presentation, Identity, Courses, Learning, data access and SQLite. Files are stored as BLOBs atomically with submissions. Four patterns: Facade, Strategy, Adapter, Observer. See [project design and report draft](docs/REPORT.md), [diagram sources](docs/uml), and [decision records](docs/ADR.md).

Local loopback only: Python HTTPServer is not production-grade; sessions are in memory, credentials are fictional, basic file signature validation is not malware scanning, no TLS or university integration. Finance, registration self-service, transcripts, AI, attendance and advising are not implemented. The legacy UI is not a working production alternative.

AI assistance: ChatGPT generated the rebuild and draft documentation from the course materials and existing repository; team must review, run tests and record actual contributions and modifications before submission. No real student data or secrets in this repository.
