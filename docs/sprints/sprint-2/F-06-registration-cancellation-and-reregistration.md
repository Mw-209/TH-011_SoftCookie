# Feature Engineering Contract — F-06: Participant Registration Cancellation & Re-Registration

**Sprint:** Sprint 2 (`feature/34-f06-registration-cancellation` (Issue #34))  
**Feature ID:** `F-06`  
**Linked Requirements:** `FR-09`, `BR-02`, `BR-03`, `BR-04`, `BR-05`, `BR-06`, `BR-08`, `NFR-02`, `NFR-03`  
**Dependencies:** `F-03` (Event Registration), `F-05` (Deadline Enforcement)  
**Contract Version:** 1.0 (Pre-Implementation Specification)  
**Last Updated:** 2026-11-28  

---

## 1. Feature Goal and Workflow
Allow an owning `PARTICIPANT` to cancel their active `REGISTERED` registration before `registrationDeadline` so the seat is immediately freed for other participants, and allow the participant to re-register later while the event remains open with available capacity (`BR-08`).

**Workflow:**
1. **Cancellation:** `PARTICIPANT` clicks **Cancel Registration** on `/my-registrations` or `/events/:id` $\rightarrow$ calls `POST /api/registrations/:id/cancel`. Backend verifies session, `PARTICIPANT` role (`BR-04`), ownership (`registration.participantId === currentUser.id`, `BR-05`), current status is `REGISTERED` (`BR-08`), and `NOW() <= event.registrationDeadline` (`BR-06`). Inside a transaction, sets `status = 'CANCELLED'` and `cancelledAt = NOW()`, returning updated registration and incremented `remainingSeats`.
2. **Re-Registration:** A `PARTICIPANT` with an existing `CANCELLED` row calls `POST /api/events/:id/registrations`. Inside the `SELECT ... FOR UPDATE` transaction (`BR-02`, `NFR-03`), backend checks `NOW() <= registrationDeadline` (`BR-06`) and `activeCount < capacity` (`BR-02`), then updates the existing `(eventId, participantId)` row to `status = 'REGISTERED'`, `cancelledAt = null`, `registeredAt = NOW()` (`DEC-02`, `BR-08`), preserving the original `registrationNumber` and database uniqueness.

---

## 2. Scope
* **Included:**
  * `POST /api/registrations/:id/cancel` endpoint with ownership, status, and deadline checks.
  * Updating `POST /api/events/:id/registrations` to reactivate a `CANCELLED` registration row when eligible.
  * Exposing `cancelledAt` and `checkedInAt` on registration API responses.
  * UI cancel controls on `/my-registrations` and `/events/:id`, `CANCELLED` status badge, and re-register action on `/events/:id`.
* **Excluded:**
  * Organizer-initiated cancellation or waitlist auto-promotion (out of scope per SRS §3.2).

---

## 3. Layer Specifications

### 3.1 Data Layer
* **No Prisma schema migration required.** `Registration.status` (`CANCELLED`), `Registration.cancelledAt`, and `@@unique([eventId, participantId])` already exist in `server/prisma/schema.prisma`.
* Seat counts already filter on `ACTIVE_REGISTRATION_STATUSES = [REGISTERED, ATTENDED]`, so setting `status = 'CANCELLED'` automatically releases 1 seat.

### 3.2 REST API Contract

#### `POST /api/registrations/:id/cancel`
* **Auth:** Owning `PARTICIPANT` only (`BR-04`, `BR-05`).
* **Request Body:** None (ignored).
* **Validation & Business Rules:**
  * Lookup registration with its event; if missing $\rightarrow$ `404 NOT_FOUND`.
  * Ownership (`BR-05`): if `registration.participantId !== currentUser.id` $\rightarrow$ `403 FORBIDDEN_OWNERSHIP`.
  * State (`BR-08`, `BR-09`): if `registration.status !== 'REGISTERED'` (i.e., `CANCELLED` or `ATTENDED`) $\rightarrow$ `409 INVALID_STATE_TRANSITION`.
  * Deadline (`BR-06`): if `NOW() > event.registrationDeadline` $\rightarrow$ `409 DEADLINE_PASSED`.
  * Atomic update inside transaction locking parent `Event` row: sets `status = 'CANCELLED'`, `cancelledAt = NOW()`, recomputes `remainingSeats`.
* **Success (`200 OK`):**
  ```json
  {
    "data": {
      "registration": {
        "id": "reg-uuid",
        "registrationNumber": "REG-2026-0001",
        "eventId": "event-uuid",
        "participantId": "student1-uuid",
        "status": "CANCELLED",
        "registeredAt": "2026-11-28T08:00:00.000Z",
        "cancelledAt": "2026-11-28T09:15:00.000Z",
        "checkedInAt": null
      },
      "remainingSeats": 2
    }
  }
  ```
* **Errors:** `401 UNAUTHENTICATED` | `403 FORBIDDEN_ROLE` | `403 FORBIDDEN_OWNERSHIP` | `404 NOT_FOUND` | `409 DEADLINE_PASSED` | `409 INVALID_STATE_TRANSITION`.

#### `POST /api/events/:id/registrations` *(Re-Registration Extension to F-03)*
* Inside `SELECT ... FOR UPDATE` transaction:
  1. Check `BR-06` (`NOW() <= event.registrationDeadline`) $\rightarrow$ else `409 DEADLINE_PASSED`.
  2. If `existing.status` is `REGISTERED` or `ATTENDED` $\rightarrow$ `409 DUPLICATE_REGISTRATION` (`BR-03`).
  3. Check `BR-02` (`activeCount < capacity`) $\rightarrow$ else `409 EVENT_FULL`.
  4. If `existing?.status === 'CANCELLED'`, update that row (`status: 'REGISTERED'`, `cancelledAt: null`, `registeredAt: new Date()`) and return `201 Created` with `{ registration, remainingSeats }`.

* **Additive Response Field:** `GET /api/registrations/my` and `GET /api/registrations/:id` add `event.registrationDeadline: string` (ISO 8601) to the embedded event (Sprint 1 response selects only `id`, `eventCode`, `title`, `skillCategory`, `skillHours`, `location`, `startAt`, `endAt`). This lets the UI decide whether to show **Cancel Registration** without an extra request; the backend still enforces `BR-06`.

### 3.3 UI Specification Summary
* **`/my-registrations` (`MyRegistrationsPage`):**
  * Displays **Cancel Registration** button on rows/cards where `status === "REGISTERED"` and `NOW() <= event.registrationDeadline` (with per-row busy state `"Cancelling..."`).
  * On success, row status updates to `CANCELLED` (`#FEF3C7` / `#9A3412` badge) with cancelled timestamp and Cancel button removed.
  * Shows `409` error banner cleanly if cancellation is rejected (e.g., deadline passed right before click).
* **`/events/:id` (`RegistrationPanel`):**
  * When participant holds a `REGISTERED` seat and deadline has not passed, displays **Cancel Registration** button next to the `REGISTERED` badge; cancelling updates `remainingSeats` immediately.
  * When participant's existing record is `CANCELLED`, displays `"Registration Cancelled"` badge and (if deadline is open and `remainingSeats > 0`) enables **Re-Register for Event** button.

---

## 4. Acceptance Criteria (Given–When–Then)

| AC ID | Given–When–Then Acceptance Criterion | Linked Reqs |
| :--- | :--- | :--- |
| **AC-26** | **Given** an owning `PARTICIPANT` with a `REGISTERED` registration before `registrationDeadline`, **when** calling `POST /api/registrations/:id/cancel`, **then** `200 OK` transitions status to `CANCELLED`, records `cancelledAt`, and immediately increments `remainingSeats` by 1 so another participant can claim the freed seat. | `FR-09`, `BR-08`, `NFR-03` |
| **AC-27** | **Given** an owning `PARTICIPANT` with a `REGISTERED` registration after `registrationDeadline`, **when** calling `POST /api/registrations/:id/cancel`, **then** the backend returns `409 Conflict` (`DEADLINE_PASSED`) and keeps status `REGISTERED`. | `FR-08`, `FR-09`, `BR-06` |
| **AC-28** | **Given** an owning `PARTICIPANT` whose registration is already `CANCELLED` or `ATTENDED`, **when** calling `POST /api/registrations/:id/cancel`, **then** the backend returns `409 Conflict` (`INVALID_STATE_TRANSITION`) and leaves the record unchanged. | `FR-09`, `BR-08`, `BR-09` |
| **AC-29** | **Given** another `PARTICIPANT` or an `ORGANIZER`, **when** calling `POST /api/registrations/:id/cancel`, **then** the backend returns `403 Forbidden` (`FORBIDDEN_OWNERSHIP` / `FORBIDDEN_ROLE`) and leaves the record unchanged. | `BR-04`, `BR-05`, `NFR-02` |
| **AC-30** | **Given** a `PARTICIPANT` with a `CANCELLED` registration, **when** submitting `POST /api/events/:id/registrations` before `registrationDeadline` with `remainingSeats >= 1`, **then** `201 Created` reactivates the existing row to `REGISTERED` (`cancelledAt = null`, refreshed `registeredAt`) and decrements `remainingSeats` by 1; if full or expired, returns `409` (`EVENT_FULL` / `DEADLINE_PASSED`). | `FR-09`, `BR-02`, `BR-06`, `BR-08` |

---

## 5. Software Test Specification (STS)

| Test ID | Type / Level | AC | Precondition & Action | Expected Result | Test File |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **TEST-46** | `UNIT-07` (Unit) | `AC-26`–`28`, `AC-30` | Test `assertCancellationEligible` and `assertRegistrationEligible` for `REGISTERED`, `CANCELLED`, `ATTENDED`, before/after deadline, and full capacity (**TDD #2**). | Permits valid cancel & re-register; throws `DEADLINE_PASSED`, `INVALID_STATE_TRANSITION`, or `EVENT_FULL` on violations. | `server/tests/unit/registration-lifecycle.unit.test.ts` |
| **TEST-47** | `API-24` (API) | `AC-26` | `student1` registers on a 1-seat event, cancels via `POST /api/registrations/:id/cancel`, then `student2` registers for the same event. | Cancel returns `200 OK` (`CANCELLED`, `remainingSeats: 1`); `student2` succeeds with `201 Created`. | `server/tests/api/registration-cancel.api.test.ts` |
| **TEST-48** | `API-25` (API) | `AC-27`, `AC-28` | `student1` attempts to cancel after deadline, cancel a second time (`CANCELLED`), and cancel an `ATTENDED` registration. | Returns `409 DEADLINE_PASSED` and `409 INVALID_STATE_TRANSITION`; DB records unchanged. | `server/tests/api/registration-cancel.api.test.ts` |
| **TEST-49** | `API-26` (API) | `AC-29` | `student2` (non-owner), `organizer1` (`ORGANIZER`), and unknown ID call `POST /api/registrations/:id/cancel`. | Returns `403 FORBIDDEN_OWNERSHIP`, `403 FORBIDDEN_ROLE`, and `404 NOT_FOUND`. | `server/tests/api/registration-cancel.api.test.ts` |
| **TEST-50** | `API-27` (API) | `AC-30` | `student1` cancels then re-registers (`201`); also tests re-register when event filled by `student2` (`409 EVENT_FULL`) or past deadline (`409 DEADLINE_PASSED`). | Reactivates same DB row (`cancelledAt = null`, `status = REGISTERED`); rejects when full or expired. | `server/tests/api/registration-cancel.api.test.ts` |
| **TEST-51** | `UI-09` (UI) | `AC-26`, `AC-30` | Render `MyRegistrations` and `RegistrationPanel` for `REGISTERED`, `CANCELLED`, and `409` cancel failure states. | Cancel transitions badge to `CANCELLED`; `RegistrationPanel` exposes Re-Register button when open; shows error banner on `409`. | `client/tests/RegistrationCancel.test.tsx` |
| **TEST-52** | `E2E-09` (E2E) | `AC-26`, `AC-30` | `student1` registers, cancels on `/my-registrations`, confirms seat count restored on `/events/:id`, and re-registers. | Lifecycle persists across reloads with consistent seat counts. | `e2e/tests/sprint2-lifecycle.spec.ts` |

---

## 6. Feature Definition of Done
- [ ] TDD Red $\rightarrow$ Green recorded for `TEST-46` (`UNIT-07`) and `TEST-47`/`TEST-48` (`API-24`/`API-25`).
- [ ] `POST /api/registrations/:id/cancel`, re-registration reactivation, and UI controls implemented.
- [ ] `TEST-46`–`TEST-51` (`UNIT-07`, `API-24`–`API-27`, `UI-09`) and all prior Unit/API/UI tests pass locally and in CI with zero regressions (`TEST-52` / `E2E-09` verified in Issue `#37`).
- [ ] Teammate-reviewed PR merged into `sprint2-staging`.
