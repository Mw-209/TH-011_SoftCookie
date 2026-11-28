# Sprint 2 Engineering Contracts, Test Plan (STS) & Definition of Done

**Course:** CPE 334 — Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Project Theme:** Theme 3 — Event Registration and Attendance System (University Skill-Building Context)  
**Team Name:** TH-011_SoftCookie  
**Sprint:** Sprint 2 (Core Domain Lifecycle Expansion)  
**Contract Version:** 1.0 (Pre-Implementation Specification — Baseline from `main` `ef41b8d`)  
**Last Updated:** 2026-11-28  
**Integration Branch:** `sprint2-staging` (created from `main` `ef41b8d`; feature PRs target `sprint2-staging`, release PR `sprint2-staging` $\rightarrow$ `main`)  

---

## 1. Sprint 2 Goal and Contract Index

### 1.1 Sprint 2 Goal
Expand the verified Sprint 1 vertical slice (`F-01`–`F-04`) with the full event-registration lifecycle backed by PostgreSQL persistence and strict server-side authorization:
1. Organizer capacity and registration-deadline updates with safe capacity floor enforcement and registration deadline cutoffs (**F-05**).
2. Participant self-cancellation prior to the deadline with immediate seat release and re-registration support (**F-06**).
3. Owning-organizer participant check-in (`REGISTERED` $\rightarrow$ `ATTENDED`) with strict state-transition validation (**F-07**).

### 1.2 Sprint 2 Feature Contracts

| Feature ID | Feature Name | Contract Document | Linked Requirements | Acceptance Criteria | Planned Tests |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-05** | Registration Deadlines & Event Capacity Management | [`F-05-deadlines-and-capacity-management.md`](./F-05-deadlines-and-capacity-management.md) | `FR-07`, `FR-08`, `BR-01`, `BR-04`, `BR-05`, `BR-06`, `BR-07`, `NFR-02`, `NFR-03` | `AC-21` – `AC-25` | `TEST-39` – `TEST-45` (`UNIT-06`, `API-20`–`23`, `UI-08`, `E2E-08`) |
| **F-06** | Participant Registration Cancellation & Re-Registration | [`F-06-registration-cancellation-and-reregistration.md`](./F-06-registration-cancellation-and-reregistration.md) | `FR-09`, `BR-02`, `BR-03`, `BR-04`, `BR-05`, `BR-06`, `BR-08`, `NFR-02`, `NFR-03` | `AC-26` – `AC-30` | `TEST-46` – `TEST-52` (`UNIT-07`, `API-24`–`27`, `UI-09`, `E2E-09`) |
| **F-07** | Participant Check-In & Attendance Recording | [`F-07-participant-checkin-and-attendance.md`](./F-07-participant-checkin-and-attendance.md) | `FR-10`, `BR-04`, `BR-05`, `BR-09`, `NFR-02`, `NFR-03`, `NFR-05` | `AC-31` – `AC-34` | `TEST-53` – `TEST-58` (`UNIT-08`, `API-28`–`30`, `UI-10`, `E2E-10`) |

### 1.3 Cross-Feature Data & API Notes
* **Database Layer (No Migration Required):** `server/prisma/schema.prisma` already includes `Event.capacity`, `Event.registrationDeadline`, `RegistrationStatus` (`REGISTERED`, `CANCELLED`, `ATTENDED`), `Registration.cancelledAt`, `Registration.checkedInAt`, and `@@unique([eventId, participantId])`. No Prisma schema migration is needed for Sprint 2.
* **New API Error Codes (`server/src/lib/errors.ts`):**
  * `DEADLINE_PASSED` (`409 Conflict`): Registration or cancellation submitted after `event.registrationDeadline` (`BR-06`).
  * `CAPACITY_BELOW_ACTIVE_COUNT` (`409 Conflict`): Capacity update lower than current active (`REGISTERED` + `ATTENDED`) count (`BR-07`).
  * `INVALID_STATE_TRANSITION` (`409 Conflict`): Disallowed registration status transition (`BR-08`, `BR-09`).
* **Additive Response Fields:** `PublicRegistration` and `EventRosterRegistration` responses now include `cancelledAt: string | null` and `checkedInAt: string | null` without breaking Sprint 1 consumers.
* **Additive Event Field on Registrations:** `GET /api/registrations/my` and `GET /api/registrations/:id` add `event.registrationDeadline: string` (ISO 8601) to the embedded event, so `/my-registrations` can show the Cancel button only while `NOW() <= event.registrationDeadline` (`F-06`). Existing fields are unchanged.

---

## 2. Complete Sprint 2 Acceptance Criteria (Given–When–Then)

| AC ID | Feature | Given–When–Then Acceptance Criterion | Mapped Planned Tests |
| :--- | :---: | :--- | :--- |
| **AC-21** | `F-05` | **Given** an authenticated owning `ORGANIZER` of an event with `activeCount` active registrations, **when** the organizer submits `PATCH /api/events/:id` with a valid `capacity` ($1 \le \text{capacity} \le 1000$, $\text{capacity} \ge \text{activeCount}$) and/or `registrationDeadline` ($\le \text{startAt}$), **then** the update is persisted in PostgreSQL and `200 OK` returns the updated event with recalculated `remainingSeats`. | `TEST-39` (`UNIT-06`), `TEST-40` (`API-20`), `TEST-44` (`UI-08`), `TEST-45` (`E2E-08`) |
| **AC-22** | `F-05` | **Given** an event with `activeCount >= 1` active registrations (`REGISTERED` + `ATTENDED`), **when** the owning `ORGANIZER` calls `PATCH /api/events/:id` with `capacity < activeCount`, **then** the backend rejects the request with `409 Conflict` (`CAPACITY_BELOW_ACTIVE_COUNT`), leaves the event unchanged, and the UI preserves entered form values alongside an error banner. | `TEST-39` (`UNIT-06`), `TEST-41` (`API-21`), `TEST-44` (`UI-08`) |
| **AC-23** | `F-05` | **Given** an authenticated owning `ORGANIZER`, **when** `PATCH /api/events/:id` is submitted with `capacity < 1`, `capacity > 1000`, non-integer `capacity`, `registrationDeadline > startAt`, invalid timestamp, or no updatable fields, **then** the backend rejects with `400 Bad Request` (`VALIDATION_ERROR`) with field-level details and no database change. | `TEST-39` (`UNIT-06`), `TEST-41` (`API-21`), `TEST-44` (`UI-08`) |
| **AC-24** | `F-05` | **Given** a non-owning `ORGANIZER` or a `PARTICIPANT`, **when** they call `PATCH /api/events/:id`, **then** the backend rejects with `403 Forbidden` (`FORBIDDEN_OWNERSHIP` for non-owner organizer, `FORBIDDEN_ROLE` for participant) and leaves the event unchanged. | `TEST-42` (`API-22`) |
| **AC-25** | `F-05` | **Given** a published event whose `registrationDeadline` is in the past ($\text{NOW()} > \text{registrationDeadline}$), **when** a `PARTICIPANT` submits `POST /api/events/:id/registrations`, **then** the backend rejects with `409 Conflict` (`DEADLINE_PASSED`), creates no registration, and the UI shows a closed-registration state with no active Register button. | `TEST-39` (`UNIT-06`), `TEST-43` (`API-23`), `TEST-44` (`UI-08`), `TEST-45` (`E2E-08`) |
| **AC-26** | `F-06` | **Given** an authenticated `PARTICIPANT` holding a `REGISTERED` registration for an event whose `registrationDeadline` has not passed, **when** the participant calls `POST /api/registrations/:id/cancel`, **then** the backend transitions `status` to `CANCELLED`, sets `cancelledAt`, frees 1 seat immediately (`remainingSeats + 1`), and returns `200 OK`. | `TEST-46` (`UNIT-07`), `TEST-47` (`API-24`), `TEST-51` (`UI-09`), `TEST-52` (`E2E-09`) |
| **AC-27** | `F-06` | **Given** an owning `PARTICIPANT` with a `REGISTERED` registration for an event whose `registrationDeadline` has passed ($\text{NOW()} > \text{registrationDeadline}$), **when** the participant calls `POST /api/registrations/:id/cancel`, **then** the backend rejects with `409 Conflict` (`DEADLINE_PASSED`) and keeps status `REGISTERED`. | `TEST-46` (`UNIT-07`), `TEST-48` (`API-25`) |
| **AC-28** | `F-06` | **Given** an owning `PARTICIPANT` whose registration is already `CANCELLED` or `ATTENDED`, **when** the participant calls `POST /api/registrations/:id/cancel`, **then** the backend rejects with `409 Conflict` (`INVALID_STATE_TRANSITION`) and leaves the record unchanged. | `TEST-46` (`UNIT-07`), `TEST-48` (`API-25`) |
| **AC-29** | `F-06` | **Given** another `PARTICIPANT` (non-owner) or an `ORGANIZER`, **when** they call `POST /api/registrations/:id/cancel`, **then** the backend rejects with `403 Forbidden` (`FORBIDDEN_OWNERSHIP` for non-owner participant, `FORBIDDEN_ROLE` for organizer) and leaves the registration unchanged. | `TEST-49` (`API-26`) |
| **AC-30** | `F-06` | **Given** a `PARTICIPANT` whose registration for an event is `CANCELLED`, **when** the participant submits `POST /api/events/:id/registrations` before `registrationDeadline` while `remainingSeats >= 1`, **then** the backend reactivates the existing row to `REGISTERED` (`cancelledAt = null`, refreshed `registeredAt`), decrements `remainingSeats` by 1, and returns `201 Created`; if full or past deadline, it rejects with `409` (`EVENT_FULL` / `DEADLINE_PASSED`). | `TEST-46` (`UNIT-07`), `TEST-50` (`API-27`), `TEST-51` (`UI-09`), `TEST-52` (`E2E-09`) |
| **AC-31** | `F-07` | **Given** an authenticated owning `ORGANIZER` and a participant registration in `REGISTERED` status for that event, **when** the organizer calls `POST /api/events/:id/registrations/:regId/check-in`, **then** the backend sets `status = 'ATTENDED'` and `checkedInAt = NOW()`, keeps `remainingSeats` unchanged, and returns `200 OK`. | `TEST-53` (`UNIT-08`), `TEST-54` (`API-28`), `TEST-57` (`UI-10`), `TEST-58` (`E2E-10`) |
| **AC-32** | `F-07` | **Given** an owning `ORGANIZER` and a registration in `CANCELLED` or already `ATTENDED` status, **when** the organizer calls `POST /api/events/:id/registrations/:regId/check-in`, **then** the backend rejects with `409 Conflict` (`INVALID_STATE_TRANSITION`) and leaves the record unchanged. | `TEST-53` (`UNIT-08`), `TEST-55` (`API-29`) |
| **AC-33** | `F-07` | **Given** a non-owning `ORGANIZER` or a `PARTICIPANT`, **when** they call `POST /api/events/:id/registrations/:regId/check-in`, **then** the backend rejects with `403 Forbidden` (`FORBIDDEN_OWNERSHIP` / `FORBIDDEN_ROLE`); if `:regId` does not belong to event `:id`, it returns `404 NOT_FOUND`. | `TEST-55` (`API-29`), `TEST-56` (`API-30`) |
| **AC-34** | `F-07` | **Given** an owning `ORGANIZER` on `/organizer/events/:id/registrations`, **when** viewing registrations with mixed statuses (`REGISTERED`, `ATTENDED`, `CANCELLED`), **then** only `REGISTERED` rows display a **Check-In** button, clicking it transitions the row to `ATTENDED` with `checkedInAt` persisted across reload, and `My Registrations` shows `ATTENDED` without a Cancel button. | `TEST-57` (`UI-10`), `TEST-58` (`E2E-10`) |

---

## 3. Master Planned-Test Table (Sprint 2 STS)

| Test ID | Type ID | Level | Req / AC | What It Tests | Expected Result | Planned Test File | Status |
| :--- | :---: | :---: | :---: | :--- | :--- | :--- | :---: |
| **TEST-39** | `UNIT-06` | Unit | `AC-21`–`23`, `AC-25` | Event update validator, capacity floor (`BR-07`), and deadline cutoff (`BR-06`) (**TDD #1**) | Accepts valid updates; rejects out-of-range/bad dates (`400`), below-active capacity (`409`), past deadline (`409`) | `server/tests/unit/event-update-and-deadline.unit.test.ts` | Planned |
| **TEST-40** | `API-20` | API | `AC-21`, `FR-07` | `PATCH /api/events/:id` valid capacity increase, safe decrease, and deadline update | `200 OK`; persisted in PostgreSQL with updated `remainingSeats` | `server/tests/api/events-update.api.test.ts` | Planned |
| **TEST-41** | `API-21` | API | `AC-22`, `AC-23` | `PATCH /api/events/:id` capacity below active count (`409`) & invalid inputs (`400`) | `409 CAPACITY_BELOW_ACTIVE_COUNT` and `400 VALIDATION_ERROR`; DB unchanged | `server/tests/api/events-update.api.test.ts` | Planned |
| **TEST-42** | `API-22` | API | `AC-24`, `BR-04`, `BR-05` | `PATCH /api/events/:id` as `organizer2`, `student1`, unauthenticated client, and unknown ID | `403 FORBIDDEN_OWNERSHIP`, `403 FORBIDDEN_ROLE`, `401 UNAUTHENTICATED`, `404 NOT_FOUND` | `server/tests/api/events-update.api.test.ts` | Planned |
| **TEST-43** | `API-23` | API | `AC-25`, `FR-08`, `BR-06` | `POST /api/events/:id/registrations` after `registrationDeadline` | `409 DEADLINE_PASSED`; zero rows inserted | `server/tests/api/events-update.api.test.ts` | Planned |
| **TEST-44** | `UI-08` | UI | `AC-21`–`23`, `AC-25` | Event edit capacity/deadline form (validation, `409` preservation, busy) & closed deadline panel | Inline validation, error banner with preserved inputs, closed state hides Register button | `client/tests/EventEditAndDeadline.test.tsx` | Planned |
| **TEST-45** | `E2E-08` | E2E | `AC-21`, `AC-25` | Organizer updates capacity/deadline on `/events/:id`; reload verifies persistence; expired event shows closed | Updated seats/deadline persist; participant cannot register on expired event | `e2e/tests/sprint2-lifecycle.spec.ts` | Planned |
| **TEST-46** | `UNIT-07` | Unit | `AC-26`–`28`, `AC-30` | Cancellation eligibility & re-registration transition rules (`BR-06`, `BR-08`) (**TDD #2**) | Permits `REGISTERED` cancel before deadline and `CANCELLED` re-register; blocks late/invalid states | `server/tests/unit/registration-lifecycle.unit.test.ts` | Planned |
| **TEST-47** | `API-24` | API | `AC-26`, `FR-09`, `BR-08` | `POST /api/registrations/:id/cancel` before deadline frees last seat for `student2` | `200 OK` (`CANCELLED`, `cancelledAt != null`); `student2` claims freed seat (`201`) | `server/tests/api/registration-cancel.api.test.ts` | Planned |
| **TEST-48** | `API-25` | API | `AC-27`, `AC-28`, `BR-06` | `POST /api/registrations/:id/cancel` after deadline, already `CANCELLED`, or `ATTENDED` | `409 DEADLINE_PASSED` and `409 INVALID_STATE_TRANSITION`; DB unchanged | `server/tests/api/registration-cancel.api.test.ts` | Planned |
| **TEST-49** | `API-26` | API | `AC-29`, `BR-04`, `BR-05` | `POST /api/registrations/:id/cancel` as `student2`, `organizer1`, and unknown ID | `403 FORBIDDEN_OWNERSHIP`, `403 FORBIDDEN_ROLE`, `404 NOT_FOUND` | `server/tests/api/registration-cancel.api.test.ts` | Planned |
| **TEST-50** | `API-27` | API | `AC-30`, `FR-09`, `BR-08` | Re-registration after cancel (`CANCELLED` $\rightarrow$ `REGISTERED`) + full/expired rejections | `201 Created` reusing unique row (`cancelledAt = null`); `409` if full or expired | `server/tests/api/registration-cancel.api.test.ts` | Planned |
| **TEST-51** | `UI-09` | UI | `AC-26`, `AC-30` | `MyRegistrations` & `RegistrationPanel` cancel action, `CANCELLED` badge, re-register button & `409` alert | Renders Cancel for `REGISTERED`, updates to `CANCELLED`, exposes Re-Register when open | `client/tests/RegistrationCancel.test.tsx` | Planned |
| **TEST-52** | `E2E-09` | E2E | `AC-26`, `AC-30` | Participant cancels on `/my-registrations`, verifies freed seat, then re-registers on `/events/:id` | Status toggles `REGISTERED` $\rightarrow$ `CANCELLED` $\rightarrow$ `REGISTERED` with accurate seats | `e2e/tests/sprint2-lifecycle.spec.ts` | Planned |
| **TEST-53** | `UNIT-08` | Unit | `AC-31`, `AC-32`, `BR-09` | Check-in transition validator (`REGISTERED` $\rightarrow$ `ATTENDED`, reject `CANCELLED`/`ATTENDED`) (**TDD #3**) | Accepts `REGISTERED`; throws `INVALID_STATE_TRANSITION` for `CANCELLED`/`ATTENDED` | `server/tests/unit/registration-lifecycle.unit.test.ts` | Planned |
| **TEST-54** | `API-28` | API | `AC-31`, `FR-10`, `BR-09` | `POST /api/events/:id/registrations/:regId/check-in` by owning `organizer1` | `200 OK` (`ATTENDED`, `checkedInAt != null`); `remainingSeats` unchanged | `server/tests/api/checkin.api.test.ts` | Planned |
| **TEST-55** | `API-29` | API | `AC-32`, `AC-33`, `BR-09` | Check-in of `CANCELLED` / `ATTENDED` (`409`) and event-registration ID mismatch (`404`) | `409 INVALID_STATE_TRANSITION` and `404 NOT_FOUND`; DB unchanged | `server/tests/api/checkin.api.test.ts` | Planned |
| **TEST-56** | `API-30` | API | `AC-33`, `BR-04`, `BR-05` | Check-in as non-owning `organizer2` (`403`) and `student1` (`403`) | `403 FORBIDDEN_OWNERSHIP` and `403 FORBIDDEN_ROLE`; zero state change | `server/tests/api/checkin.api.test.ts` | Planned |
| **TEST-57** | `UI-10` | UI | `AC-34`, `NFR-05` | `OrganizerRoster` Check-In button per status, busy state, `ATTENDED` badge & `checkedInAt` | Button shown only for `REGISTERED`; transitions row to `ATTENDED` with timestamp | `client/tests/OrganizerCheckIn.test.tsx` | Planned |
| **TEST-58** | `E2E-10` | E2E | `AC-31`, `AC-34` | Organizer checks in participant on roster, reloads, and participant views `ATTENDED` in `My Registrations` | `ATTENDED` and timestamp persist; Cancel button absent for attended participant | `e2e/tests/sprint2-lifecycle.spec.ts` | Planned |

---

## 4. Sprint 2 Definition of Done (DoD)
- [ ] All Sprint 2 contracts (`F-05`, `F-06`, `F-07`) reviewed and merged into `sprint2-staging` prior to feature implementation.
- [ ] TDD Red $\rightarrow$ Green evidence recorded for key domain rules (`BR-06`, `BR-07`, `BR-08`, `BR-09`) and authorization guards.
- [ ] All Sprint 2 Unit, API, and UI automated tests (`TEST-39`–`TEST-44`, `TEST-46`–`TEST-51`, `TEST-53`–`TEST-57`) and Sprint 1 Unit/API/UI regression tests pass locally and in GitHub Actions CI (`test-and-docker`).
- [ ] Playwright E2E tests (`TEST-45`, `TEST-52`, `TEST-58` / `E2E-08`–`E2E-10`, plus Sprint 1 E2E regression) pass locally against the running application stack in Issue `#37` (`S2-5`).
- [ ] Every feature branch is linked to a GitHub Issue, reviewed and approved by the teammate (never self-approved), and merged into `sprint2-staging`.
- [ ] Integrated Sprint 2 release merged from `sprint2-staging` to `main` through a reviewed release PR, tagged, deployed to GCP Cloud Run, and verified with post-deployment smoke checks.
