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
| **1** | *"ตอนนี้ในเครื่องเรามีถึง issue5 ใช่มะ ต่อไป issue6 เป็นของเราทำต่อให้หน่อยต้องทำไรบ้างอะ"* | Planning Issue 6 (F-04 Organizer Roster) | Analyzed git log and requirements; outlined 5 specific deliverables: API endpoint, ownership isolation, roster UI, tests, and demo steps. | Confirmed branch isolation: ensured we cleanly exited `feature/5` before starting `feature/6-f04-organizer-roster`. |
| **2** | *"PS ... npm run dev ... Error: listen EADDRINUSE: address already in use :::3000"* | Debugging port conflict when starting backend | Identified background daemon holding port 3000; terminated orphan process and explained daemon vs. terminal execution. | Verified backend restarted cleanly and responded `{"status":"ok"}` on `/api/health`. |
| **3** | *"มันต้องโชอะไรได้บ้าง feature6"* | Manual verification of F-04 behavior | Provided 5 step-by-step verification scenarios: owner button visibility, roster table, empty state, 403 access denied, and responsive layout. | Logged in as both `student3` and `organizer1` to observe live registration flow and roster table updates. |
| **4** | *"https://dev.to/... ทำได้ปะ ... เอากรอบสีขาวๆรอบนอกออก"* | Adding SoftCookie branding favicon to browser tab | Converted user's custom cookie graphic into a transparent PNG, resized it, and embedded it as an optimized Base64 Data URL directly in `index.html`. | Eliminated need for extra `public/` directory; tested tab icon rendering in dark mode across browser tabs. |
| **5** | *"Unused import ... Avoid querying registrations twice ... Single source of truth ... Consistency in event.service.ts"* | Addressing Peer Review Cleanups on PR #13 | Refactored `event.service.ts` to drop redundant query in `findUnique`, imported `ACTIVE_REGISTRATION_STATUSES`, typed status with `RegistrationStatus`, and removed unused import. | Re-ran full test suite (Server: 107/107, Client: 73/73) and pushed commit `4312936` to GitHub. |

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
