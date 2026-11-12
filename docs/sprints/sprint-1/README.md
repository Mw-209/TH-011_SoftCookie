# Sprint 1 Engineering Contracts, Test Plan (STS) & Definition of Done

**Course:** CPE 334 — Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Project Theme:** Theme 3 — Event Registration and Attendance System (University Skill-Building Context)  
**Team Name:** TH-011_SoftCookie  
**Sprint:** Sprint 1 (Small Deployable Product)  
**Contract Version:** 1.1 (Pre-Implementation Baseline — Aligned with CPE 334 SDD/TDD Conventions)  
**Last Updated:** 2026-11-11  

---

## 1. Sprint 1 Goal and Contract Index

### 1.1 Sprint 1 Goal
Build and verify a complete, persistent full-stack vertical slice (`React + Vite UI in client/` $\rightarrow$ `Express REST API & Domain Layer in server/` $\rightarrow$ `Prisma & PostgreSQL DB`) with real `bcrypt`/session authentication, server-side `PARTICIPANT` and `ORGANIZER` role/ownership enforcement, event publication with positive capacity, atomic participant registration with last-seat concurrency protection, and organizer registration roster inspection.

### 1.2 Sprint 1 Feature Contracts

| Feature ID | Feature Name | Contract Document | Linked Requirements | Acceptance Criteria | Planned Tests |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | Authentication, Session Lifecycle & Role-Based Access Control | [`F-01-authentication-and-access.md`](./F-01-authentication-and-access.md) | `FR-01`, `BR-04`, `BR-05`, `NFR-01`, `NFR-02`, `NFR-04`, `NFR-05` | `AC-01` – `AC-05` | `TEST-01` – `TEST-09` (`UNIT-01`, `API-01`–`05`, `UI-01`–`02`, `E2E-01`) |
| **F-02** | Event Creation, Publication & Discovery | [`F-02-event-publication-and-discovery.md`](./F-02-event-publication-and-discovery.md) | `FR-02`, `FR-03`, `BR-01`, `BR-04`, `NFR-02`, `NFR-03`, `NFR-04`, `NFR-05` | `AC-06` – `AC-09` | `TEST-10` – `TEST-19` (`UNIT-02`–`03`, `API-06`–`09`, `UI-03`–`04`, `E2E-02`–`03`) |
| **F-03** | Event Registration & Capacity Enforcement | [`F-03-event-registration.md`](./F-03-event-registration.md) | `FR-04`, `FR-05`, `BR-01`, `BR-02`, `BR-03`, `BR-04`, `BR-05`, `NFR-02`, `NFR-03`, `NFR-04`, `NFR-05` | `AC-10` – `AC-15` | `TEST-20` – `TEST-31` (`UNIT-04`–`05`, `API-10`–`16`, `UI-05`, `E2E-04`–`05`) |
| **F-04** | Organizer Event Registrations Inspection | [`F-04-organizer-registration-inspection.md`](./F-04-organizer-registration-inspection.md) | `FR-06`, `BR-04`, `BR-05`, `NFR-02`, `NFR-05` | `AC-16` – `AC-20` | `TEST-32` – `TEST-38` (`API-17`–`19`, `UI-06`–`07`, `E2E-06`–`07`) |

* **Companion Sprint 1 Process Documents:**
  * [`reviewer.md`](./reviewer.md) — Peer Review Log, Issue/PR Chain Record, and Team Contribution Table.
  * [`ai-use.md`](./ai-use.md) — AI Agent Declaration, Selected Key Prompts Table, and Engineering Reflection.

---

## 2. Complete Sprint 1 Acceptance Criteria (Given–When–Then)

| AC ID | Feature | Given–When–Then Acceptance Criterion | Mapped Planned Tests |
| :--- | :---: | :--- | :--- |
| **AC-01** | `F-01` | **Given** an active seeded `ORGANIZER` or `PARTICIPANT` account, **when** the user submits valid credentials to `POST /api/auth/login`, **then** a `Session` record is saved in PostgreSQL, an `HttpOnly` session cookie is set, and `200 OK` is returned with `{ id, email, name, role }` and without `passwordHash`. | `TEST-03` (`API-02`), `TEST-07` (`UI-01`), `TEST-09` (`E2E-01`) |
| **AC-02** | `F-01` | **Given** an invalid password, unknown email, inactive account (`isActive = false`), or empty required field, **when** a login request is submitted to `POST /api/auth/login`, **then** the request is rejected with `401`/`403`/`400`, no `Session` row is created, and the UI displays an error message while preserving the entered email. | `TEST-04` (`API-03`), `TEST-07` (`UI-01`), `TEST-08` (`UI-02`) |
| **AC-03** | `F-01` | **Given** a client request to `GET /api/auth/me` or any protected endpoint, **when** a valid active session cookie is present **then** `200 OK` is returned with the authenticated user's profile; **when** no valid session cookie is present **then** `401 Unauthorized` is returned without exposing private data. | `TEST-05` (`API-04`) |
| **AC-04** | `F-01` | **Given** an authenticated user with an active session, **when** the user invokes `POST /api/auth/logout`, **then** the `Session` record is deleted from PostgreSQL, the session cookie is cleared, and any subsequent request replaying that session token is rejected with `401 Unauthorized`. | `TEST-06` (`API-05`), `TEST-09` (`E2E-01`) |
| **AC-05** | `F-01` | **Given** user records persisted in PostgreSQL, **when** user credentials are created or inspected in the database, **then** every `passwordHash` is stored as a valid `bcrypt` hash (`$2a$` / `$2b$`, cost $\ge 10$) and never in plaintext. | `TEST-01` (`UNIT-01`) |
| **AC-06** | `F-02` | **Given** an authenticated `ORGANIZER` and valid event data with `capacity >= 1` and `skillHours >= 1`, **when** the organizer submits `POST /api/events`, **then** one `Event` is saved in PostgreSQL with `organizerId = currentUser.id` and a unique `eventCode` (`EVT-YYYY-NNNN`), and `201 Created` is returned. | `TEST-10` (`UNIT-02`), `TEST-12` (`API-06`), `TEST-18` (`E2E-02`) |
| **AC-07** | `F-02` | **Given** event data with `capacity <= 0`, non-integer capacity, `skillHours <= 0`, missing required fields, or `registrationDeadline > startAt`, **when** `POST /api/events` is submitted, **then** the request is rejected with `400 Bad Request`, no event is saved, and field-level validation messages are displayed while preserving entered form values. | `TEST-11` (`UNIT-03`), `TEST-13` (`API-07`), `TEST-16` (`UI-03`) |
| **AC-08** | `F-02` | **Given** an authenticated `PARTICIPANT` account, **when** the participant attempts to create an event via `POST /api/events` or open `/events/new`, **then** the backend rejects the request with `403 Forbidden` (`FORBIDDEN_ROLE`) and the UI displays an access denied state. | `TEST-14` (`API-08`), `TEST-19` (`E2E-03`) |
| **AC-09** | `F-02` | **Given** an authenticated `PARTICIPANT` or `ORGANIZER`, **when** the user requests `GET /api/events` or `GET /api/events/:id`, **then** `200 OK` is returned with the published event information and authoritative `capacity`, `activeRegistrationsCount`, and `remainingSeats`. | `TEST-15` (`API-09`), `TEST-17` (`UI-04`), `TEST-18` (`E2E-02`) |
| **AC-10** | `F-03` | **Given** an authenticated `PARTICIPANT` and a published event with `remainingSeats >= 1` for which the participant has no active registration, **when** the participant submits `POST /api/events/:id/registrations`, **then** one `Registration` is saved in PostgreSQL with status `REGISTERED` and a unique `registrationNumber` (`REG-YYYY-NNNN`), `remainingSeats` decreases by 1, and `201 Created` is returned. | `TEST-20` (`UNIT-04`), `TEST-22` (`API-10`), `TEST-29` (`UI-05`), `TEST-30` (`E2E-04`) |
| **AC-11** | `F-03` | **Given** an authenticated `PARTICIPANT` who already holds an active (`REGISTERED`) registration for an event, **when** the participant submits another `POST /api/events/:id/registrations` request for the same event, **then** the backend rejects the request with `409 Conflict` (`DUPLICATE_REGISTRATION`) and no second registration is stored. | `TEST-21` (`UNIT-05`), `TEST-23` (`API-11`), `TEST-31` (`E2E-05`) |
| **AC-12** | `F-03` | **Given** a published event with `remainingSeats === 0` (or `capacity = 1` receiving two competing registration requests simultaneously), **when** `POST /api/events/:id/registrations` is submitted, **then** at most one request succeeds for the last seat (`201 Created`) and any request exceeding `capacity` is rejected with `409 Conflict` (`EVENT_FULL`). | `TEST-21` (`UNIT-05`), `TEST-24` (`API-12`), `TEST-25` (`API-13`), `TEST-31` (`E2E-05`) |
| **AC-13** | `F-03` | **Given** an authenticated `ORGANIZER` account, **when** the organizer attempts to register for an event via `POST /api/events/:id/registrations` or access `GET /api/registrations/my`, **then** the backend rejects the request with `403 Forbidden` (`FORBIDDEN_ROLE`). | `TEST-26` (`API-14`) |
| **AC-14** | `F-03` | **Given** an authenticated `PARTICIPANT` who has registered for an event, **when** the participant opens `My Registrations` (`GET /api/registrations/my`) or their registration detail (`GET /api/registrations/:id`), **then** only registrations belonging to `currentUser.id` are returned (`200 OK`) with their official `registrationNumber` and `REGISTERED` status. | `TEST-27` (`API-15`), `TEST-29` (`UI-05`), `TEST-30` (`E2E-04`) |
| **AC-15** | `F-03` | **Given** `Participant B` is authenticated, **when** a registration belonging to `Participant A` is requested via `GET /api/registrations/:regIdOfParticipantA` (or when a spoofed `participantId` is supplied), **then** the backend rejects the access with `403 Forbidden` (`FORBIDDEN_OWNERSHIP`) and returns no registration data. | `TEST-27` (`API-15`), `TEST-28` (`API-16`) |
| **AC-16** | `F-04` | **Given** `Organizer 1` is authenticated and owns `Event 1`, **when** `Organizer 1` requests `GET /api/events/:event1Id/registrations` or opens `/organizer/events/:event1Id/registrations`, **then** `200 OK` is returned and the UI displays the complete registration roster (`registrationNumber`, participant `name`, `email`, `status`, and `registeredAt`). | `TEST-32` (`API-17`), `TEST-35` (`UI-06`), `TEST-37` (`E2E-06`) |
| **AC-17** | `F-04` | **Given** `Organizer 2` is authenticated and `Event 1` belongs to `Organizer 1`, **when** `Organizer 2` requests `GET /api/events/:event1Id/registrations` or opens `/organizer/events/:event1Id/registrations`, **then** the backend rejects the request with `403 Forbidden` (`FORBIDDEN_OWNERSHIP`) and zero registration records are returned. | `TEST-33` (`API-18`), `TEST-35` (`UI-06`), `TEST-37` (`E2E-06`) |
| **AC-18** | `F-04` | **Given** an authenticated `PARTICIPANT` account, **when** the participant requests `GET /api/events/:event1Id/registrations` or opens `/organizer/events/:event1Id/registrations`, **then** the backend rejects the request with `403 Forbidden` (`FORBIDDEN_ROLE`) and zero registration records are returned. | `TEST-34` (`API-19`), `TEST-37` (`E2E-06`) |
| **AC-19** | `F-01`–`F-04` | **Given** any Sprint 1 screen, **when** rendered in the browser, **then** all controls follow the SoftCookie Warm Bakery theme tokens (`#603928` header, `#A85F34` primary actions, `#D37D30` hover/focus, `#F2B366` warm accents, `#F0F0F0` background & read-only fields, `#FFFFFF` editable fields, red `*` required markers, inline field validation, and non-color badges). | `TEST-36` (`UI-07`), `TEST-38` (`E2E-07`) |
| **AC-20** | `F-01`–`F-04` | **Given** Desktop ($\ge 992\text{ px}$), Tablet ($768\text{–}991\text{ px}$), and Mobile ($< 768\text{ px}$) viewports, **when** each Sprint 1 screen is inspected, **then** the layout adapts cleanly without clipped labels, overlapping controls, or horizontal page scrolling. | `TEST-38` (`E2E-07`) |

---

## 3. Master Planned-Test Table (Sprint 1 Software Test Specification)

Every Acceptance Criterion (`AC-01`–`AC-20`) maps to concrete automated tests across **Unit (`UNIT-01`–`05`)**, **API/Database Integration (`API-01`–`19`)**, **UI Component & Style (`UI-01`–`07`)**, and **End-to-End (`E2E-01`–`07`)** levels:

| Test ID | Type ID | Level | Req / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- | :---: |
| **TEST-01** | `UNIT-01` | Unit | `AC-05`, `NFR-01` | Password hashing & `bcrypt` verification helper | Hashes use `$2a$`/`$2b$` (`cost >= 10`); never plaintext | `server/tests/unit/password-and-auth.unit.test.ts` | Planned |
| **TEST-02** | `API-01` | API | `NFR-04` | `GET /api/health` (liveness) & `GET /api/ready` (DB readiness) probes | `/api/health` returns `200 { status: "ok" }`; `/api/ready` returns `200 { status: "ready", db: "connected" }` (`503` if DB down), `< 500 ms` | `server/tests/api/health.api.test.ts` | Planned |
| **TEST-03** | `API-02` | API | `AC-01`, `NFR-04` | Valid login (`ORGANIZER` & `PARTICIPANT`) | `200 OK` (`< 500 ms`), `HttpOnly` cookie set, DB `Session` saved | `server/tests/api/auth.api.test.ts` | Planned |
| **TEST-04** | `API-03` | API | `AC-02`, `NFR-01` | Invalid login (wrong password, unknown email, inactive user, empty input) | `401` / `403` / `400`; zero `Session` rows created | `server/tests/api/auth.api.test.ts` | Planned |
| **TEST-05** | `API-04` | API | `AC-03`, `NFR-01` | `GET /api/auth/me` authenticated vs. unauthenticated | `200 OK` with user profile when valid; `401` when missing/invalid | `server/tests/api/auth.api.test.ts` | Planned |
| **TEST-06** | `API-05` | API | `AC-04`, `NFR-01` | `POST /api/auth/logout` & token replay check | `200 OK`, DB session deleted; replay returns `401` | `server/tests/api/auth.api.test.ts` | Planned |
| **TEST-07** | `UI-01` | UI | `AC-01`, `AC-02` | Login form labels, asterisks (`*`), busy state, inline validation | Busy button disables; field error appears below control | `client/tests/Login.test.tsx` | Planned |
| **TEST-08** | `UI-02` | UI | `AC-02` | Login error preserves entered email | Alert banner shown; typed email retained | `client/tests/Login.test.tsx` | Planned |
| **TEST-09** | `E2E-01` | E2E | `AC-01`, `AC-04` | Browser login $\rightarrow$ role navbar $\rightarrow$ logout $\rightarrow$ redirect | Logs in, shows role badge, logs out, blocks `/events` | `e2e/tests/auth-and-access.spec.ts` | Planned |
| **TEST-10** | `UNIT-02` | Unit | `AC-06`, `BR-01` | `eventCode` generator (`EVT-YYYY-NNNN`) & string trimming | Produces unique `EVT-2026-NNNN` and trims whitespace | `server/tests/unit/event-rules.unit.test.ts` | Planned |
| **TEST-11** | `UNIT-03` | Unit | `AC-07`, `BR-01` | Event validator (`capacity <= 0`, non-int, `skillHours <= 0`, invalid dates) (**TDD #1**) | Throws `VALIDATION_ERROR` with field-level details | `server/tests/unit/event-rules.unit.test.ts` | Planned |
| **TEST-12** | `API-06` | API | `AC-06`, `FR-02` | `POST /api/events` as `organizer1` with valid data | `201 Created`; saved in DB with `EVT-2026-NNNN` & `organizerId` | `server/tests/api/events.api.test.ts` | Planned |
| **TEST-13** | `API-07` | API | `AC-07`, `BR-01` | `POST /api/events` with `capacity: 0`, `-5`, or bad dates | `400 Bad Request`; no event saved in DB | `server/tests/api/events.api.test.ts` | Planned |
| **TEST-14** | `API-08` | API | `AC-08`, `BR-04` | `POST /api/events` as `PARTICIPANT` or `ANONYMOUS` | `403 Forbidden` for `PARTICIPANT`; `401` for `ANONYMOUS` | `server/tests/api/events.api.test.ts` | Planned |
| **TEST-15** | `API-09` | API | `AC-09`, `NFR-04` | `GET /api/events` & `GET /api/events/:id` | `200 OK` (`< 500 ms`) with authoritative `remainingSeats`; `404` if missing | `server/tests/api/events.api.test.ts` | Planned |
| **TEST-16** | `UI-03` | UI | `AC-07` | `CreateEvent` form validation, read-only fields, busy state & data retention | Inline errors under fields; form data preserved on failure | `client/tests/CreateEvent.test.tsx` | Planned |
| **TEST-17** | `UI-04` | UI | `AC-09` | `EventCatalog` & `EventDetail` loading, empty, error & seat badge states | Renders loading, empty message, and `remainingSeats / capacity` | `client/tests/EventCatalog.test.tsx` | Planned |
| **TEST-18** | `E2E-02` | E2E | `AC-06`, `AC-09` | Organizer creates event in UI & verifies detail/catalog | Saved event displays `EVT-2026-NNNN` and seat count | `e2e/tests/organizer-journey.spec.ts` | Planned |
| **TEST-19** | `E2E-03` | E2E | `AC-08`, `NFR-02` | Participant attempts to open `/events/new` | Displays `403 Access Denied` UI | `e2e/tests/auth-and-access.spec.ts` | Planned |
| **TEST-20** | `UNIT-04` | Unit | `AC-10`, `BR-01` | `registrationNumber` generator (`REG-YYYY-NNNN`) & seat math | Formats `REG-2026-NNNN` and calculates remaining seats | `server/tests/unit/registration-rules.unit.test.ts` | Planned |
| **TEST-21** | `UNIT-05` | Unit | `AC-11`, `AC-12` | Registration rule evaluator (duplicate & full capacity) (**TDD #2**) | Rejects duplicate active status and `activeCount >= capacity` | `server/tests/unit/registration-rules.unit.test.ts` | Planned |
| **TEST-22** | `API-10` | API | `AC-10`, `NFR-04` | Valid `POST /api/events/:id/registrations` by `student1` | `201 Created` (`< 500 ms`), saves `REGISTERED` row, decrements seat | `server/tests/api/registrations.api.test.ts` | Planned |
| **TEST-23** | `API-11` | API | `AC-11`, `BR-03` | Duplicate registration attempt by `student1` on same event | `409 Conflict` (`DUPLICATE_REGISTRATION`); 1 row in DB | `server/tests/api/registrations.api.test.ts` | Planned |
| **TEST-24** | `API-12` | API | `AC-12`, `BR-02` | Registration attempt on full 1-seat event (`EVT-2026-0002`) (**TDD #3**) | `409 Conflict` (`EVENT_FULL`); active count remains `1` | `server/tests/api/registrations.api.test.ts` | Planned |
| **TEST-25** | `API-13` | API | `AC-12`, `NFR-03` | Competing parallel requests (`Promise.all`) for last seat (`capacity = 1`) | Exactly one `201 Created` and one `409 Conflict`; DB count `= 1` | `server/tests/api/registrations.api.test.ts` | Planned |
| **TEST-26** | `API-14` | API | `AC-13`, `BR-04` | `ORGANIZER` attempts participant registration or `GET /api/registrations/my` | `403 Forbidden` (`FORBIDDEN_ROLE`) | `server/tests/api/registrations.api.test.ts` | Planned |
| **TEST-27** | `API-15` | API | `AC-14`, `BR-04` | `student1` retrieves `GET /api/registrations/my` & `/:id` (ignores spoofed ID) | `200 OK` with owned registrations only | `server/tests/api/registrations.api.test.ts` | Planned |
| **TEST-28** | `API-16` | API | `AC-15`, `BR-05` | `student2` requests `student1`'s private registration (`GET /api/registrations/:id`) (**TDD #4a**) | `403 Forbidden` (`FORBIDDEN_OWNERSHIP`); zero data leaked | `server/tests/api/registrations.api.test.ts` | Planned |
| **TEST-29** | `UI-05` | UI | `AC-10`, `AC-14` | `MyRegistrations` & registration button states (busy, registered, full, empty) | Disables button when busy; renders `REG-2026-NNNN` and empty state | `client/tests/MyRegistrations.test.tsx` | Planned |
| **TEST-30** | `E2E-04` | E2E | `AC-10`, `AC-14` | Participant registers on `/events/:id` & views `/my-registrations` | Confirmation shows `REG-2026-NNNN`; listed in `My Registrations` | `e2e/tests/participant-journey.spec.ts` | Planned |
| **TEST-31** | `E2E-05` | E2E | `AC-11`, `AC-12` | E2E duplicate registration & full-event rejection on 1-seat event | UI blocks/rejects duplicate and full-event sign-ups clearly | `e2e/tests/participant-journey.spec.ts` | Planned |
| **TEST-32** | `API-17` | API | `AC-16`, `FR-06` | Owning `organizer1` requests `GET /api/events/:event1Id/registrations` | `200 OK` with participant roster for Event 1 | `server/tests/api/organizer-roster.api.test.ts` | Planned |
| **TEST-33** | `API-18` | API | `AC-17`, `BR-05` | Non-owner `organizer2` requests `GET /api/events/:event1Id/registrations` (**TDD #4b**) | `403 Forbidden` (`FORBIDDEN_OWNERSHIP`); no roster returned | `server/tests/api/organizer-roster.api.test.ts` | Planned |
| **TEST-34** | `API-19` | API | `AC-18`, `BR-04` | `student1` (`PARTICIPANT`) requests `GET /api/events/:event1Id/registrations` | `403 Forbidden` (`FORBIDDEN_ROLE`); no roster returned | `server/tests/api/organizer-roster.api.test.ts` | Planned |
| **TEST-35** | `UI-06` | UI | `AC-16`, `AC-17` | `OrganizerRoster` populated table, empty roster, and `403` state | Renders roster rows, empty message, or `403` alert accurately | `client/tests/OrganizerRoster.test.tsx` | Planned |
| **TEST-36** | `UI-07` | UI Style | `AC-19`, `NFR-05` | SoftCookie Warm Bakery theme token, read-only shading, asterisk (`*`) & badge checks | Confirms `#603928` header, `#A85F34` primary, `#F0F0F0` read-only, and text badges | `client/tests/ResponsiveAndTheme.test.tsx` | Planned |
| **TEST-37** | `E2E-06` | E2E | `AC-16`–`AC-18` | `organizer1` inspects owned roster (`200`); `organizer2` & `student1` blocked (`403`) | Owner sees roster; non-owner organizer & participant see `403` | `e2e/tests/auth-and-access.spec.ts` | Planned |
| **TEST-38** | `E2E-07` | E2E | `AC-19`, `AC-20` | Multi-viewport check at Desktop (`1280px`), Tablet (`820px`), Mobile (`375px`) | Zero horizontal overflow, no clipped labels, usable controls | `e2e/tests/responsive-and-states.spec.ts` | Planned |

---

## 4. Responsive and Visual Inspection Checklist (SoftCookie Warm Bakery UI)

Before declaring Sprint 1 complete, every screen must pass this visual and responsive checklist:
- [ ] **Color Tokens:** App header uses `#603928`, primary action buttons use `#A85F34` (hover `#D37D30`), warm highlights use `#F2B366`, page background uses `#F0F0F0`, cards use `#FFFFFF`, and success badges use `#EAF6EF` (`#065F46` text).
- [ ] **Editable vs. Read-Only Controls:** Editable inputs have `#FFFFFF` background with `#C4B5AB` borders; system-generated/read-only fields (`Event Code`, `Registration No.`, `Organizer`, `Remaining Seats`) use distinct `#F0F0F0` shading.
- [ ] **Labels, Asterisks, and Inline Validation:** Labels appear above controls; required fields display a red asterisk (`*`); validation messages render immediately below the associated field in `#B91C1C`.
- [ ] **Busy Submit State & Data Retention:** Submit buttons disable and show busy text while requests are in flight; form inputs retain user-typed values after validation or API errors.
- [ ] **Desktop ($\ge 992\text{ px}$), Tablet ($768\text{–}991\text{ px}$), and Mobile ($< 768\text{ px}$):** No clipped text, overlapping badges, hidden action buttons, or horizontal page scrolling at any viewport size.

---

## 5. Two-Part Definition of Done (DoD) for Sprint 1

### 5.1 Part 1: Product Completion Definition of Done
The coding agent and development team may report Sprint 1 product work as complete only when:
- [ ] All Sprint 1 features (`F-01`, `F-02`, `F-03`, `F-04`) and requirements (`FR-01`–`FR-06`, `BR-01`–`BR-05`, `NFR-01`–`NFR-05`) are implemented according to the approved contracts.
- [ ] All 20 Acceptance Criteria (`AC-01`–`AC-20`) are satisfied by observable application behavior.
- [ ] All 38 planned automated tests (`TEST-01`–`TEST-38` across Unit, API/Integration, UI Component/Style, and Playwright E2E) pass from documented commands on the final `main` branch.
- [ ] Zero required tests are skipped, disabled, weakened, or commented out.
- [ ] TDD Red $\rightarrow$ Green evidence is recorded for key business rules (`BR-01`, `BR-02`, `BR-03`) and ownership restrictions (`BR-04`, `BR-05`).
- [ ] `README.md` setup, migration, idempotent seed, and test execution instructions are complete and accurate, and `.gitignore` + `.env.example` ensure zero secrets are committed.

### 5.2 Part 2: Course Delivery and Engineering Process Definition of Done
- [ ] Sprint 1 work is tracked via GitHub Issues (`Issue #1`–`Issue #7`) on the GitHub Project Kanban board (`Backlog` $\rightarrow$ `Specified` $\rightarrow$ `Started` $\rightarrow$ `PR Review` $\rightarrow$ `Fixing` $\rightarrow$ `Done`).
- [ ] Every Issue is implemented on its dedicated feature branch from `sprint1-staging` and merged via a teammate-reviewed Pull Request (authors never approve their own PRs).
- [ ] Peer review details, comments given/received, responses, approvals, and team contribution table are recorded in [`docs/sprints/sprint-1/reviewer.md`](./reviewer.md).
- [ ] AI agent usage, selected key prompts, and reflection are documented in [`docs/sprints/sprint-1/ai-use.md`](./ai-use.md).
- [ ] `sprint1-staging` is merged into `main` via a reviewed release PR, tagged (`v1.0.0-sprint1`), and documented in the self-contained Project Deliverable 1 PDF (`Parts A–F`).
