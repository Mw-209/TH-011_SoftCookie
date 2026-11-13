# Sprint 1 AI Agent Usage & Engineering Reflection

**Course:** CPE 334 — Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Project Theme:** Theme 3 — Event Registration and Attendance System (University Skill-Building Context)  
**Team Name:** TH-011_SoftCookie  
**Sprint:** Sprint 1 Baseline Delivery  
**Document Version:** 1.0  
**Last Updated:** 2026-11-13  

---

## 1. AI Agent Declaration

In accordance with CPE 334 Academic Integrity and AI Policy, the development team declares the use of the following AI Agent environment during Sprint 1:

- **AI Agent Tool:** Google Antigravity (Agentic Software Engineering Assistant)
- **Underlying Models:** Google Gemini 3.8 Flash / Claude 3.5/3.7 Sonnet
- **Primary Roles:** Architecture consistency enforcement, TDD test suite scaffolding, TypeScript type definitions, Vite/Docker setup debugging, automated test execution, and peer review assistance.
- **Human Authorship & Accountability:** All requirements, business logic rules (`BR-01`–`BR-05`), acceptance criteria (`AC-01`–`AC-20`), code reviews, and commit approvals were directed, verified, and approved by team members **Kusumas Kerdbankram** and **Thitikan Tiranobpakan**.

---

## 2. Scope of AI Assistance

| Area | AI Agent Role | Human Engineer Verification & Control |
| :--- | :--- | :--- |
| **Requirements & Specifications** | Formatted Markdown tables, checked SRS-SDS traceability consistency. | Defined problem scope, university skill-building business rules (`BR-01`–`BR-05`), and acceptance criteria. |
| **Backend Engineering** | Scaffolded Express routes, Prisma transaction queries (`SELECT ... FOR UPDATE`), and password hashing utilities. | Reviewed query concurrency logic, confirmed status transitions, validated ownership checks (`BR-05`). |
| **Frontend Engineering** | Built React components with SoftCookie Warm Bakery theme tokens, responsive layouts (table vs. card stack). | Tested interactive behavior, form validations, accessibility feedback, and responsive layout across devices. |
| **Automated Testing** | Generated initial test skeletons for Vitest and Playwright (`TEST-01`–`TEST-38`). | Verified test assertions against SRS acceptance criteria; ensured zero tests were skipped or weakened. |
| **Peer Review & Refactoring** | Assisted in drafting review feedback, identifying dead code, and optimizing redundant database queries. | Evaluated review comments, verified fixes against live test suite, and approved pull requests into staging. |

---

## 3. Selected Key Prompts Table

| # | Prompt / Request Summary | Context & Goal | AI Output & Assistance | Human Verification & Adjustment |
| :-: | :--- | :--- | :--- | :--- |
| **1** | *"We have up to Issue 5 on our local setup. Issue 6 is our task next; what do we need to do to implement it?"* | Planning Issue 6 (F-04 Organizer Roster) | Analyzed git history and SRS specifications; broke down F-04 into 5 concrete deliverables: API endpoint, ownership check (`BR-05`), roster UI, test suites, and manual verification steps. | Verified branch isolation: ensured we cleanly exited `feature/5` and created `feature/6-f04-organizer-roster` from the latest staging baseline. |
| **2** | *"npm run dev fails with Error: listen EADDRINUSE: address already in use :::3000 — please help resolve this."* | Debugging port conflict when starting backend | Identified an existing background daemon holding TCP port 3000; terminated the daemon and established clear terminal execution guidance. | Verified the backend restarted cleanly and responded with `{"status":"ok"}` on `/api/health`. |
| **3** | *"What are all the required behaviors and UI states that Feature 6 must demonstrate?"* | Manual verification of F-04 behavior | Provided 5 step-by-step verification flows: owner button visibility, populated roster table, empty state, 403 forbidden state, and mobile/desktop responsive layout. | Logged in as both `student3` and `organizer1` to test the live registration flow and verify real-time roster updates. |
| **4** | *"Can we add a browser tab favicon? ... Remove the white square background so it looks clean like other tabs."* | Enhancing SoftCookie branding immersion | Resized the custom cookie graphic, removed white background padding, and converted it into an optimized Base64 Data URL embedded in `client/index.html`. | Eliminated extra file/folder dependencies (`public/`); verified transparent cookie rendering in dark mode across browser tabs. |
| **5** | *"Unused import ... Avoid querying registrations twice ... Single source of truth ... Consistency in event.service.ts — how to resolve peer review?"* | Addressing Peer Review cleanups on PR #13 | Refactored `event.service.ts` to eliminate duplicate query in `findUnique`, imported `ACTIVE_REGISTRATION_STATUSES`, typed status with `RegistrationStatus`, and removed unused `ClockIcon`. | Verified that all 107 server and 73 client tests passed without regressions; pushed commit `4312936` to GitHub. |

---

## 4. Engineering Reflection

### What Worked Well
1. **Accelerated TDD Red-to-Green Cycles:** Using the AI agent to write exhaustive unit and API tests strictly against `AC-xx` specifications before implementation ensured our business logic (especially seat locking and ownership isolation) was rock solid from day one.
2. **High Code Quality via Automated Pre-commit Checks:** Coupling the AI agent with Vitest allowed instantaneous regression detection whenever refactoring services or components.
3. **Responsive Visual Consistency:** The agent helped maintain strict conformance to the SoftCookie Warm Bakery design tokens (`bg-cookie-cocoa`, `bg-cookie-caramel`, `bg-cookie-amber`, `bg-cookie-cream`) across all viewport breakpoints.

### Challenges & AI Hallucination Controls
1. **EADDRINUSE Port Lockups:** When running server processes in the background, child processes occasionally detached or held TCP ports. We resolved this by establishing clear process lifecycles and having the developer run long-lived dev servers directly in their terminal.
2. **Database Test State Contamination:** Manual exploratory testing in localhost inserted live rows that caused subsequent assertion mismatches (e.g., expected 19 remaining seats, received 18). We addressed this by ensuring tests run against an idempotent seed baseline.
3. **Strict Zero-Weaken Testing Policy:** We strictly forbade modifying test assertions to mask bugs; all fixes were applied directly to application code until 100% of the planned tests passed cleanly.

