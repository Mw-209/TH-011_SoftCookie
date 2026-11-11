# Requirements-to-Feature-to-Sprint Traceability Matrix

**Course:** CPE 334 — Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Project Theme:** Theme 3 — Event Registration and Attendance System (University Skill-Building Context)  
**Team Name:** TH-011_SoftCookie  
**Document Version:** 1.1 (Engineering Baseline — Aligned with CPE 334 SDD/TDD Conventions)  
**Last Updated:** 2026-11-11  

---

## 1. Traceability Overview

This matrix links every baseline Functional Requirement (`FR-01`–`FR-12`), Business Rule (`BR-01`–`BR-10`), and Non-Functional Requirement (`NFR-01`–`NFR-05`) from [`docs/srs.md`](./srs.md) to its owning feature(s) in [`docs/features.md`](./features.md), target sprint, Acceptance Criteria (`AC-01`–`AC-20`), planned Test IDs (`UNIT-xx`, `API-xx`, `UI-xx`, `E2E-xx`), and automated test file paths.

* **Sprint 1 Requirements:** Mapped to complete `Given-When-Then` Acceptance Criteria (`AC-01`–`AC-20`) and planned automated tests across Unit, API/Integration, UI Component/Style, and E2E levels in [`docs/sprints/sprint-1/README.md`](./sprints/sprint-1/README.md).
* **Sprint 2 & Sprint 3 Requirements:** Mapped to their owning features (`F-05`–`F-08`) and target sprints now; full feature-level AC and executable tests will be elaborated before implementation in Sprint 2 and Sprint 3 respectively.

---

## 2. Functional Requirements Traceability (`FR-01` to `FR-12`)

| Requirement ID & Summary | Feature or Responsibility | Target Sprint | Acceptance Criteria & Planned Tests (`Test ID [Type] — Test File`) | Current Status |
| :--- | :--- | :---: | :--- | :--- |
| **FR-01:** User Authentication & Session Lifecycle | **F-01** Authentication, Session Lifecycle & RBAC | **Sprint 1** | `AC-01` (`API-01`, `API-02`, `UI-01`, `E2E-01` — `tests/api/auth.api.test.ts`, `e2e/sprint-1/auth-and-access.spec.ts`)<br/>`AC-02` (`API-03`, `UI-02` — `tests/api/auth.api.test.ts`, `tests/ui/Login.test.tsx`)<br/>`AC-03` (`API-04` — `tests/api/auth.api.test.ts`)<br/>`AC-04` (`API-05`, `E2E-01` — `tests/api/auth.api.test.ts`, `e2e/sprint-1/auth-and-access.spec.ts`) | Specified in Sprint 1 (`F-01`) |
| **FR-02:** Event Creation & Publication | **F-02** Event Creation, Publication & Discovery | **Sprint 1** | `AC-06` (`UNIT-02`, `API-06`, `E2E-02` — `tests/unit/event-rules.unit.test.ts`, `tests/api/events.api.test.ts`, `e2e/sprint-1/organizer-journey.spec.ts`)<br/>`AC-07` (`UNIT-03`, `API-07`, `UI-03` — `tests/unit/event-rules.unit.test.ts`, `tests/api/events.api.test.ts`, `tests/ui/CreateEvent.test.tsx`) | Specified in Sprint 1 (`F-02`) |
| **FR-03:** Event Discovery & Detail View | **F-02** Event Creation, Publication & Discovery | **Sprint 1** | `AC-09` (`API-09`, `UI-04`, `E2E-02` — `tests/api/events.api.test.ts`, `tests/ui/EventCatalog.test.tsx`, `e2e/sprint-1/organizer-journey.spec.ts`) | Specified in Sprint 1 (`F-02`) |
| **FR-04:** Participant Event Registration | **F-03** Event Registration & Capacity Enforcement | **Sprint 1** | `AC-10` (`UNIT-04`, `API-10`, `E2E-04` — `tests/unit/registration-rules.unit.test.ts`, `tests/api/registrations.api.test.ts`, `e2e/sprint-1/participant-journey.spec.ts`) | Specified in Sprint 1 (`F-03`) |
| **FR-05:** Participant My Registrations & Owned Detail | **F-03** Event Registration & Capacity Enforcement | **Sprint 1** | `AC-14` (`API-15`, `UI-05`, `E2E-04` — `tests/api/registrations.api.test.ts`, `tests/ui/MyRegistrations.test.tsx`, `e2e/sprint-1/participant-journey.spec.ts`) | Specified in Sprint 1 (`F-03`) |
| **FR-06:** Organizer Event Roster Inspection | **F-04** Organizer Event Registrations Inspection | **Sprint 1** | `AC-16` (`API-17`, `UI-06`, `E2E-02` — `tests/api/organizer-roster.api.test.ts`, `tests/ui/OrganizerRoster.test.tsx`, `e2e/sprint-1/organizer-journey.spec.ts`) | Specified in Sprint 1 (`F-04`) |
| **FR-07:** Organizer Capacity & Deadline Update | **F-05** Registration Deadlines & Event Capacity Management | **Sprint 2** | Planned for Sprint 2 Contract (`F-05`): `PATCH /api/events/:id` capacity & deadline update tests | Allocated to Sprint 2 |
| **FR-08:** Registration Deadline Enforcement | **F-05** Registration Deadlines & Event Capacity Management | **Sprint 2** | Planned for Sprint 2 Contract (`F-05`): Boundary timestamp unit & API integration tests | Allocated to Sprint 2 |
| **FR-09:** Participant Registration Cancellation & Re-Registration | **F-06** Participant Registration Cancellation & Re-Registration | **Sprint 2** | Planned for Sprint 2 Contract (`F-06`): Cancellation seat-release & re-registration integration/E2E tests | Allocated to Sprint 2 |
| **FR-10:** Organizer Participant Check-In | **F-07** Participant Check-In & Attendance Recording | **Sprint 2** | Planned for Sprint 2 Contract (`F-07`): Check-in state transition & ownership integration/E2E tests | Allocated to Sprint 2 |
| **FR-11:** Organizer Attendance Summary & Reporting | **F-08** Attendance Reporting, Event Summaries & Filtering | **Sprint 3** | Planned for Sprint 3 Contract (`F-08`): Attendance metric calculation unit, API & E2E tests | Allocated to Sprint 3 |
| **FR-12:** Event Search, Filtering & Sorting | **F-08** Attendance Reporting, Event Summaries & Filtering | **Sprint 3** | Planned for Sprint 3 Contract (`F-08`): Query filter, search & sort API/UI tests | Allocated to Sprint 3 |

---

## 3. Business Rules Traceability (`BR-01` to `BR-10`)

| Business Rule ID & Summary | Feature or Responsibility | Target Sprint | Acceptance Criteria & Planned Tests (`Test ID [Type] — Test File`) | Current Status |
| :--- | :--- | :---: | :--- | :--- |
| **BR-01:** Positive Capacity ($1\text{–}1000$), Positive Skill Hours ($1\text{–}40$), Valid Schedule Ordering & Backend-Generated Codes | **F-02**, **F-03** | **Sprint 1** | `AC-06` (`UNIT-02`, `API-06`),<br/>`AC-07` (`UNIT-03`, `API-07`, `UI-03`),<br/>`AC-10` (`UNIT-04`, `API-10`) | Specified in Sprint 1 (`F-02`, `F-03`) |
| **BR-02:** Strict Capacity Limit & Atomic Last-Seat Concurrency Protection | **F-03** Event Registration & Capacity Enforcement | **Sprint 1** | `AC-12` (`API-12` [Boundary Full Event], `API-13` [Concurrent Last-Seat Race], `E2E-05` — `tests/api/registrations.api.test.ts`, `e2e/sprint-1/participant-journey.spec.ts`) | Specified in Sprint 1 (`F-03`) |
| **BR-03:** Single Active Registration per Participant per Event | **F-03** Event Registration & Capacity Enforcement | **Sprint 1** | `AC-11` (`UNIT-05`, `API-11` — `tests/unit/registration-rules.unit.test.ts`, `tests/api/registrations.api.test.ts`) | Specified in Sprint 1 (`F-03`) |
| **BR-04:** Server-Derived Identity & Strict Role Separation (`PARTICIPANT` vs. `ORGANIZER`) | **F-01**, **F-02**, **F-03**, **F-04** | **Sprint 1** | `AC-08` (`API-08`, `E2E-03`),<br/>`AC-13` (`API-14`),<br/>`AC-18` (`API-19` — `tests/api/organizer-roster.api.test.ts`) | Specified in Sprint 1 (`F-01`–`F-04`) |
| **BR-05:** Event Ownership & Participant Privacy Isolation | **F-01**, **F-03**, **F-04** | **Sprint 1** | `AC-15` (`API-16` [Cross-Participant Isolation] — `tests/api/registrations.api.test.ts`),<br/>`AC-17` (`API-18`, `E2E-06` [Cross-Organizer Isolation] — `tests/api/organizer-roster.api.test.ts`, `e2e/sprint-1/auth-and-access.spec.ts`) | Specified in Sprint 1 (`F-01`, `F-03`, `F-04`) |
| **BR-06:** Registration & Cancellation Deadline Cutoff ($\text{NOW()} \le \text{registrationDeadline}$) | **F-05**, **F-06** | **Sprint 2** | Planned for Sprint 2 Contracts (`F-05`, `F-06`): Reject late registration/cancellation (`409 DEADLINE_PASSED`) | Allocated to Sprint 2 |
| **BR-07:** Safe Capacity Reduction Floor ($\text{newCapacity} \ge \text{activeRegistrationsCount}$) | **F-05** | **Sprint 2** | Planned for Sprint 2 Contract (`F-05`): Reject capacity reduction below active registration count (`409 CAPACITY_BELOW_ACTIVE_COUNT`) | Allocated to Sprint 2 |
| **BR-08:** Cancellation Seat Release & Re-Registration Lifecycle | **F-06** | **Sprint 2** | Planned for Sprint 2 Contract (`F-06`): Verify seat released on cancel and re-registration allowed before deadline | Allocated to Sprint 2 |
| **BR-09:** Valid Attendance Check-In State Transitions (`REGISTERED` $\rightarrow$ `ATTENDED`) | **F-07** | **Sprint 2** | Planned for Sprint 2 Contract (`F-07`): Reject check-in of `CANCELLED`/`ATTENDED` and reject cancellation of `ATTENDED` | Allocated to Sprint 2 |
| **BR-10:** Server-Authoritative Attendance Summary Metrics | **F-08** | **Sprint 3** | Planned for Sprint 3 Contract (`F-08`): Verify server-computed counts, rate %, and skill-hours calculation | Allocated to Sprint 3 |

---

## 4. Non-Functional Requirements Traceability (`NFR-01` to `NFR-05`)

| NFR ID & Category | Feature or System Responsibility | Verification Sprint | Acceptance Criteria & Verification Method (`Test ID — Test File`) | Current Status |
| :--- | :--- | :---: | :--- | :--- |
| **NFR-01:** Authentication & Credential Security (`bcrypt` cost $\ge 10$, `HttpOnly` cookie, `401` on unauthenticated access) | **F-01** Authentication, Session Lifecycle & RBAC | **Sprint 1** | `AC-01` (`API-02`), `AC-02` (`API-03`), `AC-03` (`API-04`), `AC-04` (`API-05`), `AC-05` (`UNIT-01` — `tests/unit/password-and-auth.unit.test.ts`) | Specified in Sprint 1 (`F-01`) |
| **NFR-02:** Backend Authorization & Ownership Protection (`403 Forbidden`, zero data leak) | **F-01**, **F-02**, **F-03**, **F-04** | **Sprint 1** (and Sprints 2–3) | `AC-08` (`API-08`, `E2E-03`), `AC-13` (`API-14`), `AC-15` (`API-16`), `AC-17` (`API-18`, `E2E-06`), `AC-18` (`API-19`) | Specified in Sprint 1 (`F-01`–`F-04`) |
| **NFR-03:** Transactional Persistence & Concurrency Safety ($\text{activeCount} \le \text{capacity}$ under parallel requests) | **F-02**, **F-03** | **Sprint 1** & **Lab 5** | `AC-06` (`API-06`), `AC-10` (`API-10`), `AC-12` (`API-12`, `API-13` [Parallel Race Test] — `tests/api/registrations.api.test.ts`) | Specified in Sprint 1 (`F-02`, `F-03`) |
| **NFR-04:** API Responsiveness ($< 500\text{ ms}$ per core API request) | **F-01**, **F-02**, **F-03**, **F-08** | **Sprint 1** & **Sprint 3** | `AC-01` (`API-01`, `API-02`), `AC-09` (`API-09`), `AC-10` (`API-10`) duration assertions | Specified in Sprint 1 STS |
| **NFR-05:** Responsive UI, Visual Consistency & Container Reproducibility (`Desktop`, `Tablet`, `Mobile`, Docker, `.env.example`) | Cross-cutting UI & Deployment Architecture (`docs/system-sds.md`) | **Sprint 1** & **Lab 5** | `AC-19` (`UI-07` — `tests/ui/ResponsiveAndTheme.test.tsx`), `AC-20` (`E2E-07` — `e2e/sprint-1/responsive-and-states.spec.ts`) | Specified in `docs/system-sds.md` & Sprint 1 STS |

---

## 5. Coverage Summary and Gap Analysis

| Metric | Count | Coverage % | Notes |
| :--- | :---: | :---: | :--- |
| **Functional Requirements (`FR-01`–`FR-12`)** | 12 / 12 | **100%** | 6 allocated to Sprint 1 (`FR-01`–`FR-06`), 4 to Sprint 2 (`FR-07`–`FR-10`), 2 to Sprint 3 (`FR-11`–`FR-12`). |
| **Business Rules (`BR-01`–`BR-10`)** | 10 / 10 | **100%** | 5 established & verified in Sprint 1 (`BR-01`–`BR-05`), 4 in Sprint 2 (`BR-06`–`BR-09`), 1 in Sprint 3 (`BR-10`). |
| **Non-Functional Requirements (`NFR-01`–`NFR-05`)** | 5 / 5 | **100%** | All 5 mapped to Sprint 1 design/tests and extended across Lab 5 & Sprints 2–3. |
| **Sprint 1 Acceptance Criteria (`AC-01`–`AC-20`)** | 20 / 20 | **100%** | Every `AC-xx` is written in `Given-When-Then` format and mapped to $\ge 1$ planned test (`TEST-01`–`TEST-33`). |
| **Uncovered Baseline Requirements** | 0 | **0%** | No coverage gaps exist in the baseline. |
