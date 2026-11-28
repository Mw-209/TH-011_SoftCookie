# Requirements-to-Feature-to-Sprint Traceability Matrix

**Course:** CPE 334 — Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Project Theme:** Theme 3 — Event Registration and Attendance System (University Skill-Building Context)  
**Team Name:** TH-011_SoftCookie  
**Document Version:** 1.2 (Sprint 2 Contracts Mapped)  
**Last Updated:** 2026-11-28  

---

## 1. Traceability Overview

This matrix links every baseline Functional Requirement (`FR-01`–`FR-12`), Business Rule (`BR-01`–`BR-10`), and Non-Functional Requirement (`NFR-01`–`NFR-05`) from [`docs/srs.md`](./srs.md) to its owning feature(s) in [`docs/features.md`](./features.md), target sprint, Acceptance Criteria (`AC-01`–`AC-34`), planned Test IDs (`UNIT-xx`, `API-xx`, `UI-xx`, `E2E-xx`), and automated test file paths.

* **Sprint 1 Requirements:** Mapped to complete `Given-When-Then` Acceptance Criteria (`AC-01`–`AC-20`) and planned automated tests across Unit, API/Integration, UI Component/Style, and E2E levels in [`docs/sprints/sprint-1/README.md`](./sprints/sprint-1/README.md).
* **Sprint 2 Requirements:** Mapped to `Given-When-Then` Acceptance Criteria (`AC-21`–`AC-34`) and planned tests (`TEST-39`–`TEST-58`) in [`docs/sprints/sprint-2/README.md`](./sprints/sprint-2/README.md).
* **Sprint 3 Requirements:** Mapped to their owning feature (`F-08`) and target sprint now; full feature-level AC and executable tests will be elaborated before implementation in Sprint 3.

---

## 2. Functional Requirements Traceability (`FR-01` to `FR-12`)

| Requirement ID & Summary | Feature or Responsibility | Target Sprint | Acceptance Criteria & Planned Tests (`Test ID [Type] — Test File`) | Current Status |
| :--- | :--- | :---: | :--- | :--- |
| **FR-01:** User Authentication & Session Lifecycle | **F-01** Authentication, Session Lifecycle & RBAC | **Sprint 1** | `AC-01` (`API-02`, `UI-01`, `E2E-01` — `server/tests/api/auth.api.test.ts`, `e2e/tests/auth-and-access.spec.ts`)<br/>`AC-02` (`API-03`, `UI-02` — `server/tests/api/auth.api.test.ts`, `client/tests/Login.test.tsx`)<br/>`AC-03` (`API-04` — `server/tests/api/auth.api.test.ts`)<br/>`AC-04` (`API-05`, `E2E-01` — `server/tests/api/auth.api.test.ts`, `e2e/tests/auth-and-access.spec.ts`) | Implemented & Verified (Passed in Sprint 1) |
| **FR-02:** Event Creation & Publication | **F-02** Event Creation, Publication & Discovery | **Sprint 1** | `AC-06` (`UNIT-02`, `API-06`, `E2E-02` — `server/tests/unit/event-rules.unit.test.ts`, `server/tests/api/events.api.test.ts`, `e2e/tests/organizer-journey.spec.ts`)<br/>`AC-07` (`UNIT-03`, `API-07`, `UI-03` — `server/tests/unit/event-rules.unit.test.ts`, `server/tests/api/events.api.test.ts`, `client/tests/CreateEvent.test.tsx`) | Implemented & Verified (Passed in Sprint 1) |
| **FR-03:** Event Discovery & Detail View | **F-02** Event Creation, Publication & Discovery | **Sprint 1** | `AC-09` (`API-09`, `UI-04`, `E2E-02` — `server/tests/api/events.api.test.ts`, `client/tests/EventCatalog.test.tsx`, `e2e/tests/organizer-journey.spec.ts`) | Implemented & Verified (Passed in Sprint 1) |
| **FR-04:** Participant Event Registration | **F-03** Event Registration & Capacity Enforcement | **Sprint 1** | `AC-10` (`UNIT-04`, `API-10`, `E2E-04` — `server/tests/unit/registration-rules.unit.test.ts`, `server/tests/api/registrations.api.test.ts`, `e2e/tests/participant-journey.spec.ts`) | Implemented & Verified (Passed in Sprint 1) |
| **FR-05:** Participant My Registrations & Owned Detail | **F-03** Event Registration & Capacity Enforcement | **Sprint 1** | `AC-14` (`API-15`, `UI-05`, `E2E-04` — `server/tests/api/registrations.api.test.ts`, `client/tests/MyRegistrations.test.tsx`, `e2e/tests/participant-journey.spec.ts`) | Implemented & Verified (Passed in Sprint 1) |
| **FR-06:** Organizer Event Roster Inspection | **F-04** Organizer Event Registrations Inspection | **Sprint 1** | `AC-16` (`API-17`, `UI-06`, `E2E-06` — `server/tests/api/organizer-roster.api.test.ts`, `client/tests/OrganizerRoster.test.tsx`, `e2e/tests/auth-and-access.spec.ts`) | Implemented & Verified (Passed in Sprint 1) |
| **FR-07:** Organizer Capacity & Deadline Update | **F-05** Registration Deadlines & Event Capacity Management | **Sprint 2** | `AC-21` (`UNIT-06`, `API-20`, `UI-08`, `E2E-08` — `server/tests/unit/event-update-and-deadline.unit.test.ts`, `server/tests/api/events-update.api.test.ts`, `client/tests/EventEditAndDeadline.test.tsx`, `e2e/tests/sprint2-lifecycle.spec.ts`)<br/>`AC-22`, `AC-23` (`UNIT-06`, `API-21`, `UI-08`)<br/>`AC-24` (`API-22`) | Specified (Sprint 2 contract) |
| **FR-08:** Registration Deadline Enforcement | **F-05** Registration Deadlines & Event Capacity Management | **Sprint 2** | `AC-25` (`UNIT-06`, `API-23`, `UI-08`, `E2E-08` — `server/tests/unit/event-update-and-deadline.unit.test.ts`, `server/tests/api/events-update.api.test.ts`, `client/tests/EventEditAndDeadline.test.tsx`, `e2e/tests/sprint2-lifecycle.spec.ts`) | Specified (Sprint 2 contract) |
| **FR-09:** Participant Registration Cancellation & Re-Registration | **F-06** Participant Registration Cancellation & Re-Registration | **Sprint 2** | `AC-26` (`UNIT-07`, `API-24`, `UI-09`, `E2E-09` — `server/tests/unit/registration-lifecycle.unit.test.ts`, `server/tests/api/registration-cancel.api.test.ts`, `client/tests/RegistrationCancel.test.tsx`, `e2e/tests/sprint2-lifecycle.spec.ts`)<br/>`AC-27`, `AC-28` (`UNIT-07`, `API-25`)<br/>`AC-29` (`API-26`)<br/>`AC-30` (`UNIT-07`, `API-27`, `UI-09`, `E2E-09`) | Specified (Sprint 2 contract) |
| **FR-10:** Organizer Participant Check-In | **F-07** Participant Check-In & Attendance Recording | **Sprint 2** | `AC-31` (`UNIT-08`, `API-28`, `UI-10`, `E2E-10` — `server/tests/unit/registration-lifecycle.unit.test.ts`, `server/tests/api/checkin.api.test.ts`, `client/tests/OrganizerCheckIn.test.tsx`, `e2e/tests/sprint2-lifecycle.spec.ts`)<br/>`AC-32` (`UNIT-08`, `API-29`)<br/>`AC-33` (`API-29`, `API-30`)<br/>`AC-34` (`UI-10`, `E2E-10`) | Specified (Sprint 2 contract) |
| **FR-11:** Organizer Attendance Summary & Reporting | **F-08** Attendance Reporting, Event Summaries & Filtering | **Sprint 3** | Planned for Sprint 3 Contract (`F-08`): Attendance metric calculation unit, API & E2E tests | Allocated to Sprint 3 |
| **FR-12:** Event Search, Filtering & Sorting | **F-08** Attendance Reporting, Event Summaries & Filtering | **Sprint 3** | Planned for Sprint 3 Contract (`F-08`): Query filter, search & sort API/UI tests | Allocated to Sprint 3 |

---

## 3. Business Rules Traceability (`BR-01` to `BR-10`)

| Business Rule ID & Summary | Feature or Responsibility | Target Sprint | Acceptance Criteria & Planned Tests (`Test ID [Type] — Test File`) | Current Status |
| :--- | :--- | :---: | :--- | :--- |
| **BR-01:** Positive Capacity ($1\text{–}1000$), Positive Skill Hours ($1\text{–}40$), Valid Schedule Ordering & Backend-Generated Codes | **F-02**, **F-03** | **Sprint 1** | `AC-06` (`UNIT-02`, `API-06`),<br/>`AC-07` (`UNIT-03`, `API-07`, `UI-03`),<br/>`AC-10` (`UNIT-04`, `API-10`) | Implemented & Verified (Passed in Sprint 1) |
| **BR-02:** Strict Capacity Limit & Atomic Last-Seat Concurrency Protection | **F-03** Event Registration & Capacity Enforcement | **Sprint 1** | `AC-12` (`API-12` [Boundary Full Event], `API-13` [Concurrent Last-Seat Race], `E2E-05` — `server/tests/api/registrations.api.test.ts`, `e2e/tests/participant-journey.spec.ts`) | Implemented & Verified (Passed in Sprint 1) |
| **BR-03:** Single Active Registration per Participant per Event | **F-03** Event Registration & Capacity Enforcement | **Sprint 1** | `AC-11` (`UNIT-05`, `API-11` — `server/tests/unit/registration-rules.unit.test.ts`, `server/tests/api/registrations.api.test.ts`) | Implemented & Verified (Passed in Sprint 1) |
| **BR-04:** Server-Derived Identity & Strict Role Separation (`PARTICIPANT` vs. `ORGANIZER`) | **F-01**–**F-07** | **Sprint 1** & **Sprint 2** | `AC-08` (`API-08`, `E2E-03`),<br/>`AC-13` (`API-14`),<br/>`AC-18` (`API-19` — `server/tests/api/organizer-roster.api.test.ts`),<br/>`AC-24` (`API-22` — `server/tests/api/events-update.api.test.ts`),<br/>`AC-29` (`API-26` — `server/tests/api/registration-cancel.api.test.ts`),<br/>`AC-33` (`API-30` — `server/tests/api/checkin.api.test.ts`) | Sprint 1: Implemented & Verified; Sprint 2: Specified |
| **BR-05:** Event Ownership & Participant Privacy Isolation | **F-01**, **F-03**–**F-07** | **Sprint 1** & **Sprint 2** | `AC-15` (`API-16` [Cross-Participant Isolation] — `server/tests/api/registrations.api.test.ts`),<br/>`AC-17` (`API-18`, `E2E-06` [Cross-Organizer Isolation] — `server/tests/api/organizer-roster.api.test.ts`, `e2e/tests/auth-and-access.spec.ts`),<br/>`AC-24` (`API-22`),<br/>`AC-29` (`API-26`),<br/>`AC-33` (`API-29`, `API-30`) | Sprint 1: Implemented & Verified; Sprint 2: Specified |
| **BR-06:** Registration & Cancellation Deadline Cutoff ($\text{NOW()} \le \text{registrationDeadline}$) | **F-05**, **F-06** | **Sprint 2** | `AC-25` (`UNIT-06`, `API-23`, `UI-08`, `E2E-08`),<br/>`AC-27` (`UNIT-07`, `API-25`),<br/>`AC-30` (`API-27` [expired re-registration]) | Specified (Sprint 2 contract) |
| **BR-07:** Safe Capacity Reduction Floor ($\text{newCapacity} \ge \text{activeRegistrationsCount}$) | **F-05** | **Sprint 2** | `AC-22` (`UNIT-06`, `API-21`, `UI-08` — `409 CAPACITY_BELOW_ACTIVE_COUNT`) | Specified (Sprint 2 contract) |
| **BR-08:** Cancellation Seat Release & Re-Registration Lifecycle | **F-06** | **Sprint 2** | `AC-26` (`UNIT-07`, `API-24`, `E2E-09` [seat release]),<br/>`AC-28` (`API-25` [invalid state]),<br/>`AC-30` (`UNIT-07`, `API-27`, `UI-09`, `E2E-09` [re-registration]) | Specified (Sprint 2 contract) |
| **BR-09:** Valid Attendance Check-In State Transitions (`REGISTERED` $\rightarrow$ `ATTENDED`) | **F-07** | **Sprint 2** | `AC-31` (`UNIT-08`, `API-28`),<br/>`AC-32` (`UNIT-08`, `API-29` [reject `CANCELLED`/`ATTENDED` check-in]),<br/>`AC-28` (`API-25` [reject cancellation of `ATTENDED`]) | Specified (Sprint 2 contract) |
| **BR-10:** Server-Authoritative Attendance Summary Metrics | **F-08** | **Sprint 3** | Planned for Sprint 3 Contract (`F-08`): Verify server-computed counts, rate %, and skill-hours calculation | Allocated to Sprint 3 |

---

## 4. Non-Functional Requirements Traceability (`NFR-01` to `NFR-05`)

| NFR ID & Category | Feature or System Responsibility | Verification Sprint | Acceptance Criteria & Verification Method (`Test ID — Test File`) | Current Status |
| :--- | :--- | :---: | :--- | :--- |
| **NFR-01:** Authentication & Credential Security (`bcrypt` cost $\ge 10$, `HttpOnly` cookie, `401` on unauthenticated access) | **F-01** Authentication, Session Lifecycle & RBAC | **Sprint 1** | `AC-01` (`API-02`), `AC-02` (`API-03`), `AC-03` (`API-04`), `AC-04` (`API-05`), `AC-05` (`UNIT-01` — `server/tests/unit/password-and-auth.unit.test.ts`) | Implemented & Verified (Passed in Sprint 1) |
| **NFR-02:** Backend Authorization & Ownership Protection (`403 Forbidden`, zero data leak) | **F-01**, **F-02**, **F-03**, **F-04** | **Sprint 1** (and Sprints 2–3) | `AC-08` (`API-08`, `E2E-03`), `AC-13` (`API-14`), `AC-15` (`API-16`), `AC-17` (`API-18`, `E2E-06`), `AC-18` (`API-19`), `AC-24` (`API-22`), `AC-29` (`API-26`), `AC-33` (`API-29`, `API-30`) | Sprint 1: Implemented & Verified; Sprint 2: Specified |
| **NFR-03:** Transactional Persistence & Concurrency Safety ($\text{activeCount} \le \text{capacity}$ under parallel requests) | **F-02**, **F-03** | **Sprint 1** & **Lab 5** | `AC-06` (`API-06`), `AC-10` (`API-10`), `AC-12` (`API-12`, `API-13` [Parallel Race Test] — `server/tests/api/registrations.api.test.ts`), `AC-21` (`API-20`), `AC-22` (`API-21`), `AC-26` (`API-24`), `AC-30` (`API-27`), `AC-31` (`API-28`) | Sprint 1: Implemented & Verified; Sprint 2: Specified |
| **NFR-04:** API Responsiveness ($< 500\text{ ms}$ per core API request) | **F-01**, **F-02**, **F-03**, **F-08** | **Sprint 1** & **Sprint 3** | `API-01` (Health & Ready Probes — `server/tests/api/health.api.test.ts`), `AC-01` (`API-02`), `AC-09` (`API-09`), `AC-10` (`API-10`) duration assertions | Implemented & Verified (Passed in Sprint 1) |
| **NFR-05:** Responsive UI, Visual Consistency & Container Reproducibility (`Desktop`, `Tablet`, `Mobile`, Docker, `.env.example`) | Cross-cutting UI & Deployment Architecture (`docs/system-sds.md`) | **Sprint 1** & **Lab 5** | `AC-19` (`UI-07` — `client/tests/ResponsiveAndTheme.test.tsx`), `AC-20` (`E2E-07` — `e2e/tests/responsive-and-states.spec.ts`), `AC-34` (`UI-10`, `E2E-10`) | Sprint 1: Implemented & Verified; Sprint 2: Specified |

---

## 5. Coverage Summary and Gap Analysis

| Metric | Count | Coverage % | Notes |
| :--- | :---: | :---: | :--- |
| **Functional Requirements (`FR-01`–`FR-12`)** | 12 / 12 | **100%** | 6 allocated to Sprint 1 (`FR-01`–`FR-06`), 4 to Sprint 2 (`FR-07`–`FR-10`), 2 to Sprint 3 (`FR-11`–`FR-12`). |
| **Business Rules (`BR-01`–`BR-10`)** | 10 / 10 | **100%** | 5 established & verified in Sprint 1 (`BR-01`–`BR-05`), 4 in Sprint 2 (`BR-06`–`BR-09`), 1 in Sprint 3 (`BR-10`). |
| **Non-Functional Requirements (`NFR-01`–`NFR-05`)** | 5 / 5 | **100%** | All 5 mapped to Sprint 1 design/tests and extended across Lab 5 & Sprints 2–3. |
| **Sprint 1 Acceptance Criteria (`AC-01`–`AC-20`)** | 20 / 20 | **100%** | Every `AC-xx` is written in `Given-When-Then` format and mapped to $\ge 1$ planned test (`TEST-01`–`TEST-38`). |
| **Sprint 2 Acceptance Criteria (`AC-21`–`AC-34`)** | 14 / 14 | **100%** | Every `AC-xx` is written in `Given-When-Then` format and mapped to $\ge 1$ planned test (`TEST-39`–`TEST-58`). |
| **Uncovered Baseline Requirements** | 0 | **0%** | No coverage gaps exist in the baseline. |
