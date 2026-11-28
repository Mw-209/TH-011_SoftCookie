# Feature Engineering Contract — F-07: Participant Check-In & Attendance Recording

**Sprint:** Sprint 2 (`feature/35-f07-participant-checkin` (Issue #35))  
**Feature ID:** `F-07`  
**Linked Requirements:** `FR-10`, `BR-04`, `BR-05`, `BR-09`, `NFR-02`, `NFR-03`, `NFR-05`  
**Dependencies:** `F-04` (Organizer Roster Inspection), `F-06` (Registration Status Lifecycle)  
**Contract Version:** 1.0 (Pre-Implementation Specification)  
**Last Updated:** 2026-11-28  

---

## 1. Feature Goal and Workflow
Allow an owning `ORGANIZER` to mark registered participants as `ATTENDED` from the event roster with a persisted `checkedInAt` timestamp, while strictly blocking invalid state transitions (`CANCELLED` or duplicate check-in) and enforcing organizer ownership (`BR-05`, `BR-09`).

**Workflow:**
1. Owning `ORGANIZER` opens `/organizer/events/:id/registrations` (`F-04`) and clicks **Check-In** on a row whose status is `REGISTERED`.
2. Client calls `POST /api/events/:id/registrations/:regId/check-in`.
3. Backend verifies session, `ORGANIZER` role (`BR-04`), event existence (`404`), event ownership (`event.organizerId === currentUser.id`, `BR-05`), that `:regId` belongs to event `:id` (`404`), and that `registration.status === 'REGISTERED'` (`BR-09`).
4. Backend updates `status = 'ATTENDED'` and `checkedInAt = NOW()` in PostgreSQL and returns `200 OK`. Because both `REGISTERED` and `ATTENDED` occupy an active seat (`BR-02`), `activeRegistrationsCount` and `remainingSeats` remain unchanged.

---

## 2. Scope
* **Included:**
  * `POST /api/events/:id/registrations/:regId/check-in` endpoint.
  * Including `cancelledAt` and `checkedInAt` in `GET /api/events/:id/registrations` and `GET /api/registrations/my`.
  * Per-row **Check-In** action, `ATTENDED` badge, and check-in timestamp display on `/organizer/events/:id/registrations`, plus `ATTENDED` display on `/my-registrations`.
* **Excluded:**
  * Aggregate attendance rate / skill-hours summary analytics (`F-08` in Sprint 3).
  * QR hardware scanning or undo check-in (out of scope per SRS §3.2).

---

## 3. Layer Specifications

### 3.1 Data Layer
* **No Prisma schema migration required.** `RegistrationStatus.ATTENDED` and `Registration.checkedInAt` (`DateTime?`) already exist in `server/prisma/schema.prisma`.

### 3.2 REST API Contract

#### `POST /api/events/:id/registrations/:regId/check-in`
* **Auth:** Owning `ORGANIZER` only (`BR-04`, `BR-05`).
* **Request Body:** None (ignored).
* **Validation & Business Rules:**
  * Event `:id` must exist $\rightarrow$ else `404 NOT_FOUND`.
  * Ownership (`BR-05`): `event.organizerId === currentUser.id` $\rightarrow$ else `403 FORBIDDEN_OWNERSHIP`.
  * Registration `:regId` must exist **and** satisfy `registration.eventId === event.id` $\rightarrow$ else `404 NOT_FOUND`.
  * State transition (`BR-09`): `registration.status === 'REGISTERED'` $\rightarrow$ else `409 Conflict` (`INVALID_STATE_TRANSITION`).
* **Success (`200 OK`):**
  ```json
  {
    "data": {
      "registration": {
        "id": "reg-uuid",
        "registrationNumber": "REG-2026-0001",
        "eventId": "event-uuid",
        "participantId": "student1-uuid",
        "status": "ATTENDED",
        "registeredAt": "2026-11-28T08:00:00.000Z",
        "cancelledAt": null,
        "checkedInAt": "2026-11-28T10:05:00.000Z"
      }
    }
  }
  ```
* **Errors:** `401 UNAUTHENTICATED` | `403 FORBIDDEN_ROLE` | `403 FORBIDDEN_OWNERSHIP` | `404 NOT_FOUND` | `409 INVALID_STATE_TRANSITION`.

### 3.3 UI Specification Summary
* **`/organizer/events/:id/registrations` (`OrganizerRosterPage`):**
  * Adds an **Action / Check-In** column (Desktop table) and card footer action (Mobile cards, `min-height: 44px`).
  * `REGISTERED` row: shows primary **Check-In** button (`#A85F34`), disabled with `"Checking in..."` while request is in flight.
  * `ATTENDED` row: shows `ATTENDED` badge (`#EAF6EF` / `#065F46`) and formatted `checkedInAt` timestamp; no Check-In button.
  * `CANCELLED` row: shows `CANCELLED` badge (`#FEF3C7` / `#9A3412`); no Check-In button.
  * Shows dismissible error banner (`#FEF2F2` / `#B91C1C`) if the backend returns `409` or network error.
* **`/my-registrations` (`MyRegistrationsPage`):**
  * Renders `ATTENDED` badge (`#EAF6EF` / `#065F46`) with check-in timestamp and hides the Cancel button (`BR-09`).

---

## 4. Acceptance Criteria (Given–When–Then)

| AC ID | Given–When–Then Acceptance Criterion | Linked Reqs |
| :--- | :--- | :--- |
| **AC-31** | **Given** an authenticated owning `ORGANIZER` and a `REGISTERED` participant for that event, **when** calling `POST /api/events/:id/registrations/:regId/check-in`, **then** `200 OK` updates `status` to `ATTENDED`, persists `checkedInAt`, and leaves `remainingSeats` unchanged. | `FR-10`, `BR-02`, `BR-09`, `NFR-03` |
| **AC-32** | **Given** an owning `ORGANIZER` and a registration in `CANCELLED` or `ATTENDED` status, **when** calling `POST /api/events/:id/registrations/:regId/check-in`, **then** the backend returns `409 Conflict` (`INVALID_STATE_TRANSITION`) and leaves the record unchanged. | `FR-10`, `BR-09` |
| **AC-33** | **Given** a non-owning `ORGANIZER` or a `PARTICIPANT`, **when** calling `POST /api/events/:id/registrations/:regId/check-in`, **then** the backend returns `403 Forbidden` (`FORBIDDEN_OWNERSHIP` / `FORBIDDEN_ROLE`); if `:regId` belongs to a different event, returns `404 NOT_FOUND`. | `BR-04`, `BR-05`, `NFR-02` |
| **AC-34** | **Given** an owning `ORGANIZER` on `/organizer/events/:id/registrations`, **when** inspecting mixed-status rows (`REGISTERED`, `ATTENDED`, `CANCELLED`), **then** only `REGISTERED` rows render a Check-In button, clicking it updates status to `ATTENDED` with `checkedInAt` persisting across reload, and `My Registrations` reflects `ATTENDED` with no Cancel button. | `FR-10`, `BR-09`, `NFR-05` |

---

## 5. Software Test Specification (STS)

| Test ID | Type / Level | AC | Precondition & Action | Expected Result | Test File |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **TEST-53** | `UNIT-08` (Unit) | `AC-31`, `AC-32` | Test `assertCheckInEligible` for `REGISTERED`, `CANCELLED`, and `ATTENDED` statuses (**TDD #3**). | Permits `REGISTERED`; throws `INVALID_STATE_TRANSITION` for `CANCELLED` and `ATTENDED`. | `server/tests/unit/registration-lifecycle.unit.test.ts` |
| **TEST-54** | `API-28` (API) | `AC-31` | `organizer1` checks in `student1` via `POST /api/events/:id/registrations/:regId/check-in`, then fetches roster and event detail. | `200 OK` (`ATTENDED`, `checkedInAt != null`); `remainingSeats` unchanged; roster reflects `ATTENDED`. | `server/tests/api/checkin.api.test.ts` |
| **TEST-55** | `API-29` (API) | `AC-32`, `AC-33` | `organizer1` attempts to check in a `CANCELLED` row, re-check in an `ATTENDED` row, and check in a `:regId` from another event. | Returns `409 INVALID_STATE_TRANSITION` (for both invalid states) and `404 NOT_FOUND` (mismatch). | `server/tests/api/checkin.api.test.ts` |
| **TEST-56** | `API-30` (API) | `AC-33` | `organizer2` (non-owner) and `student1` (`PARTICIPANT`) call `POST /api/events/:id/registrations/:regId/check-in`. | Returns `403 FORBIDDEN_OWNERSHIP` and `403 FORBIDDEN_ROLE`; status remains `REGISTERED`. | `server/tests/api/checkin.api.test.ts` |
| **TEST-57** | `UI-10` (UI) | `AC-34` | Render `OrganizerRosterPage` with `REGISTERED`, `ATTENDED`, and `CANCELLED` rows; click Check-In and test error banner. | Only `REGISTERED` shows Check-In button; click updates to `ATTENDED` + timestamp; `409` displays alert. | `client/tests/OrganizerCheckIn.test.tsx` |
| **TEST-58** | `E2E-10` (E2E) | `AC-31`, `AC-34` | `organizer1` checks in `student1` in browser, reloads roster, then `student1` opens `/my-registrations`. | `ATTENDED` and timestamp persist on roster; `student1` sees `ATTENDED` without Cancel button. | `e2e/tests/sprint2-lifecycle.spec.ts` |

---

## 6. Feature Definition of Done
- [ ] TDD Red $\rightarrow$ Green recorded for `TEST-53` (`UNIT-08`) and `TEST-55` (`API-29`).
- [ ] `POST /api/events/:id/registrations/:regId/check-in` and roster/my-registrations UI updates implemented.
- [ ] `TEST-53`–`TEST-57` (`UNIT-08`, `API-28`–`API-30`, `UI-10`) and all prior Unit/API/UI tests pass locally and in CI with zero regressions (`TEST-58` / `E2E-10` and multi-viewport checks verified in Issue `#37`).
- [ ] Teammate-reviewed PR merged into `sprint2-staging` and released to `main` through the Sprint 2 release PR.
