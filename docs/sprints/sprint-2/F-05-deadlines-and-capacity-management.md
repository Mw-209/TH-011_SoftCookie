# Feature Engineering Contract — F-05: Registration Deadlines & Event Capacity Management

**Sprint:** Sprint 2 (`feature/33-f05-deadlines-capacity` (Issue #33))  
**Feature ID:** `F-05`  
**Linked Requirements:** `FR-07`, `FR-08`, `BR-01`, `BR-04`, `BR-05`, `BR-06`, `BR-07`, `NFR-02`, `NFR-03`  
**Dependencies:** `F-02` (Event Creation & Discovery), `F-03` (Event Registration & Capacity)  
**Contract Version:** 1.0 (Pre-Implementation Specification)  
**Last Updated:** 2026-11-28  

---

## 1. Feature Goal and Workflow
Allow an owning `ORGANIZER` to adjust an event's `capacity` and `registrationDeadline` after publication while guaranteeing confirmed participants are never overbooked (`BR-07`), and enforce the `registrationDeadline` cutoff on the backend so late registrations are rejected (`BR-06`).

**Workflow:**
1. Owning `ORGANIZER` opens `/events/:id` $\rightarrow$ opens the **Edit Capacity & Deadline** form inside Organizer Controls $\rightarrow$ submits `PATCH /api/events/:id`.
2. Backend authenticates session, verifies `ORGANIZER` role (`BR-04`) and ownership (`event.organizerId === currentUser.id`, `BR-05`), validates bounds/schedule (`BR-01`), acquires a row lock (`SELECT ... FOR UPDATE`), checks `newCapacity >= activeRegistrationsCount` (`BR-07`), updates PostgreSQL, and returns recalculated seat figures.
3. When any `PARTICIPANT` submits `POST /api/events/:id/registrations`, backend checks `NOW() <= event.registrationDeadline` inside the locked transaction (`BR-06`); if expired, rejects with `409 DEADLINE_PASSED`.

---

## 2. Scope
* **Included:**
  * `PATCH /api/events/:id` for updating `capacity` and/or `registrationDeadline` (partial or combined update).
  * Deadline cutoff check (`NOW() <= event.registrationDeadline`) added to `POST /api/events/:id/registrations`.
  * Organizer edit form on `/events/:id` and closed-registration state in `RegistrationPanel` when `NOW() > registrationDeadline`.
* **Excluded:**
  * Editing event title, description, location, skill hours, or `startAt`/`endAt` (not part of `FR-07`).
  * Cancellation deadline cutoff (covered in `F-06`, sharing the same `BR-06` helper).

---

## 3. Layer Specifications

### 3.1 Data Layer
* **No Prisma schema migration required.** `Event.capacity` (`Int`) and `Event.registrationDeadline` (`DateTime`) already exist in `server/prisma/schema.prisma`.
* Updates to `capacity` run inside `prisma.$transaction` with `SELECT id, capacity, "startAt" FROM events WHERE id = $1 FOR UPDATE` so concurrent registrations cannot cause `capacity < activeRegistrationsCount` (`NFR-03`).

### 3.2 REST API Contract

#### `PATCH /api/events/:id`
* **Auth:** Owning `ORGANIZER` only (`BR-04`, `BR-05`).
* **Request Body (at least one field required):**
  ```json
  {
    "capacity": 25,
    "registrationDeadline": "2026-12-14T10:00:00.000Z"
  }
  ```
* **Validation & Business Rules:**
  * Reject empty payload (neither `capacity` nor `registrationDeadline` provided) $\rightarrow$ `400 VALIDATION_ERROR`.
  * If `capacity` provided: integer, $1 \le \text{capacity} \le 1000$ (`BR-01`) $\rightarrow$ else `400 VALIDATION_ERROR`.
  * If `registrationDeadline` provided: valid ISO-8601 date and $\text{registrationDeadline} \le \text{event.startAt}$ (`BR-01`) $\rightarrow$ else `400 VALIDATION_ERROR`.
  * A `registrationDeadline` earlier than `NOW()` is allowed: it closes registration immediately (subsequent registrations and cancellations return `409 DEADLINE_PASSED`). Moving a passed deadline later reopens registration, provided it stays $\le \text{event.startAt}$.
  * Capacity floor (`BR-07`): if $\text{newCapacity} < \text{activeRegistrationsCount}$ (count of `REGISTERED` + `ATTENDED`) $\rightarrow$ `409 Conflict` (`CAPACITY_BELOW_ACTIVE_COUNT`).
  * Client-supplied `id`, `eventCode`, `organizerId`, `startAt`, `endAt`, etc. are ignored.
* **Success (`200 OK`):** `{ "data": { "event": PublicEvent } }` with updated `capacity`, `registrationDeadline`, and recalculated `remainingSeats`.
* **Errors:** `400 VALIDATION_ERROR` | `401 UNAUTHENTICATED` | `403 FORBIDDEN_ROLE` | `403 FORBIDDEN_OWNERSHIP` | `404 NOT_FOUND` | `409 CAPACITY_BELOW_ACTIVE_COUNT`.

#### `POST /api/events/:id/registrations` *(Extension to F-03)*
* **New Rule (`BR-06`):** Inside the existing locked transaction, before capacity checks, verify `now <= event.registrationDeadline`.
* **New Error:** `409 Conflict` (`code: "DEADLINE_PASSED"`, message: `"The registration deadline for this event has passed."`).

### 3.3 UI Specification Summary
* **Organizer Controls on `/events/:id` (visible only when `user.role === "ORGANIZER" && event.organizerId === user.id`):**
  * **Edit Capacity & Deadline** card/section pre-filled with current `capacity` and `registrationDeadline` (`datetime-local`).
  * Displays read-only hint showing current `activeRegistrationsCount` (minimum allowed capacity).
  * Shows inline field errors below invalid fields (`#B91C1C`), `409` conflict alert banner, busy submit button (`"Saving..."` / `"Save Changes"`), preserves typed inputs on error, and updates the page's seat counts and deadline chip immediately on success.
* **Participant View on `/events/:id` (`RegistrationPanel`):**
  * When `new Date(event.registrationDeadline) < new Date()` and the participant is not already registered, display badge `"Registration Closed (Deadline Passed)"` (`#FEF3C7` / `#9A3412`) instead of the **Register for Event** button.
  * If a stale tab clicks Register after the deadline passes, display the server's `409 DEADLINE_PASSED` error alert cleanly.

---

## 4. Acceptance Criteria (Given–When–Then)

| AC ID | Given–When–Then Acceptance Criterion | Linked Reqs |
| :--- | :--- | :--- |
| **AC-21** | **Given** an authenticated owning `ORGANIZER`, **when** submitting `PATCH /api/events/:id` with valid `capacity` ($\ge \text{activeCount}$, $1\text{–}1000$) and/or `registrationDeadline` ($\le \text{startAt}$), **then** PostgreSQL persists the change and `200 OK` returns the updated event with recalculated `remainingSeats`. | `FR-07`, `BR-01`, `BR-07` |
| **AC-22** | **Given** an event with `activeCount >= 1`, **when** the owning `ORGANIZER` calls `PATCH /api/events/:id` with `capacity < activeCount`, **then** the backend returns `409 Conflict` (`CAPACITY_BELOW_ACTIVE_COUNT`), DB is unchanged, and the UI preserves entered inputs with an error banner. | `FR-07`, `BR-07`, `NFR-03` |
| **AC-23** | **Given** an owning `ORGANIZER`, **when** submitting `PATCH /api/events/:id` with `capacity < 1` or `> 1000`, non-integer `capacity`, `registrationDeadline > startAt`, or an empty body, **then** the backend returns `400 Bad Request` (`VALIDATION_ERROR`) with field-level details. | `FR-07`, `BR-01` |
| **AC-24** | **Given** a non-owning `ORGANIZER` or a `PARTICIPANT`, **when** calling `PATCH /api/events/:id`, **then** the backend returns `403 Forbidden` (`FORBIDDEN_OWNERSHIP` / `FORBIDDEN_ROLE`) and makes no change. | `BR-04`, `BR-05`, `NFR-02` |
| **AC-25** | **Given** an event where `NOW() > event.registrationDeadline`, **when** a `PARTICIPANT` calls `POST /api/events/:id/registrations`, **then** the backend rejects with `409 Conflict` (`DEADLINE_PASSED`) without creating a record, and the UI shows registration closed. | `FR-08`, `BR-06` |

---

## 5. Software Test Specification (STS)

| Test ID | Type / Level | AC | Precondition & Action | Expected Result | Test File |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **TEST-39** | `UNIT-06` (Unit) | `AC-21`–`23`, `AC-25` | Validate `validateEventUpdateInput`, `assertCapacityFloor`, and `assertBeforeDeadline` across valid, boundary (`capacity = activeCount`, `deadline = startAt`), and invalid inputs (**TDD #1**). | Valid cases pass; invalid bounds/dates throw `VALIDATION_ERROR`; below-active throws `CAPACITY_BELOW_ACTIVE_COUNT`; past deadline throws `DEADLINE_PASSED`. | `server/tests/unit/event-update-and-deadline.unit.test.ts` |
| **TEST-40** | `API-20` (API) | `AC-21` | `organizer1` sends `PATCH /api/events/:id` increasing capacity, decreasing capacity safely to `activeCount`, and moving deadline earlier. | `200 OK` each time; `GET /api/events/:id` confirms persisted values and accurate `remainingSeats`. | `server/tests/api/events-update.api.test.ts` |
| **TEST-41** | `API-21` (API) | `AC-22`, `AC-23` | `organizer1` reduces capacity below active count (`activeCount = 2`, `capacity = 1`); also sends `capacity = 0`, `deadline > startAt`, and `{}`. | Returns `409 CAPACITY_BELOW_ACTIVE_COUNT` and `400 VALIDATION_ERROR`; DB values remain unchanged. | `server/tests/api/events-update.api.test.ts` |
| **TEST-42** | `API-22` (API) | `AC-24` | `organizer2` (non-owner), `student1` (`PARTICIPANT`), and unauthenticated client call `PATCH /api/events/:id`; also unknown event ID. | Returns `403 FORBIDDEN_OWNERSHIP`, `403 FORBIDDEN_ROLE`, `401 UNAUTHENTICATED`, and `404 NOT_FOUND`. | `server/tests/api/events-update.api.test.ts` |
| **TEST-43** | `API-23` (API) | `AC-25` | Event has `registrationDeadline` in the past; `student1` calls `POST /api/events/:id/registrations`. | Returns `409 DEADLINE_PASSED`; zero rows created in `registrations`. | `server/tests/api/events-update.api.test.ts` |
| **TEST-44** | `UI-08` (UI) | `AC-21`–`23`, `AC-25` | Render edit form on `/events/:id` (inline validation, `409` banner + input preservation, busy state) and `RegistrationPanel` for expired deadline. | Displays field errors / conflict alert without clearing inputs; hides Register button and shows closed badge when expired. | `client/tests/EventEditAndDeadline.test.tsx` |
| **TEST-45** | `E2E-08` (E2E) | `AC-21`, `AC-25` | `organizer1` updates capacity & deadline via browser UI and reloads; `student1` views an expired event. | Updated capacity/deadline persist after reload; expired event displays closed state. | `e2e/tests/sprint2-lifecycle.spec.ts` |

---

## 6. Feature Definition of Done
- [ ] TDD Red $\rightarrow$ Green recorded for `TEST-39` (`UNIT-06`) and `TEST-41` (`API-21`).
- [ ] `PATCH /api/events/:id`, `BR-06` registration cutoff, and `/events/:id` UI controls implemented.
- [ ] `TEST-39`–`TEST-44` (`UNIT-06`, `API-20`–`API-23`, `UI-08`) and all Sprint 1 Unit/API/UI tests pass locally and in CI with zero regressions (`TEST-45` / `E2E-08` verified in Issue `#37`).
- [ ] Teammate-reviewed PR merged into `sprint2-staging`.
