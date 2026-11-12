# Feature Engineering Contract — F-03: Event Registration & Capacity Enforcement

**Sprint:** Sprint 1 (Issue #5 — `feature/5-f03-event-registration`)  
**Feature ID:** `F-03`  
**Linked Requirements:** `FR-04`, `FR-05`, `BR-01`, `BR-02`, `BR-03`, `BR-04`, `BR-05`, `NFR-02`, `NFR-03`, `NFR-04`, `NFR-05`  
**Dependencies:** `F-01` (Auth & RBAC), `F-02` (Event Creation & Discovery)  
**Contract Version:** 1.1 (Pre-Implementation Specification — CPE 334 SDD/TDD Format)  
**Last Updated:** 2026-11-11  

---

## 1. Feature Goal
Allow an authenticated `PARTICIPANT` to register for a published skill-building event and inspect their own persisted registrations (`My Registrations`), while strictly enforcing capacity limits (`BR-02`), single active registration per participant per event (`BR-03`), atomic concurrency locking on the last remaining seat (`NFR-03`), and participant privacy isolation (`BR-05`).

## 2. Stakeholder Request Interpretation
Participants must be able to claim a seat in an open workshop, receive an official `registrationNumber` (`REG-YYYY-NNNN`), and view their persisted registrations in `My Registrations`. The backend must prevent overbooking—even when multiple students click `"Register"` simultaneously for the final seat—prevent duplicate active registrations for the same event, block Organizers from registering as Participants, and prevent one Participant from viewing another Participant's registration record.

## 3. Scope of F-03
* **Included:**
  * Participant registration creation (`POST /api/events/:id/registrations`) using a row-locked PostgreSQL transaction (`SELECT ... FOR UPDATE`) to enforce `BR-02` (capacity) and `BR-03` (duplicate prevention) and generate `registrationNumber` (`REG-YYYY-NNNN`).
  * Participant personal registration list (`GET /api/registrations/my`) and owned registration detail (`GET /api/registrations/:id`) enforcing `registration.participantId === currentUser.id` (`BR-05`).
  * SoftCookie Warm Bakery registration action panel on `/events/[id]` and `My Registrations` screen (`/my-registrations`).
* **Explicitly Excluded:**
  * Participant self-cancellation and re-registration after cancellation (`F-06` in Sprint 2).

## 4. Linked Functional Requirements and Business Rules
* **`FR-04`:** Authenticated `PARTICIPANT` registers for an open event with `remainingSeats >= 1`, saving a `Registration` with status `REGISTERED` and official `registrationNumber`.
* **`FR-05`:** Authenticated `PARTICIPANT` views their own registrations in `My Registrations` and inspects their own registration detail.
* **`BR-02`:** Active registrations (`REGISTERED` + `ATTENDED`) never exceed `event.capacity`. Competing requests for the last seat are serialized via `SELECT ... FOR UPDATE` in PostgreSQL so excess requests are rejected with `409 Conflict` (`EVENT_FULL`).
* **`BR-03`:** At most one active registration per `(eventId, participantId)`. Duplicate attempts return `409 Conflict` (`DUPLICATE_REGISTRATION`).
* **`BR-04`:** Identity comes from the authenticated session (`currentUser.id`), never a client-supplied `participantId`. `ORGANIZER` users cannot call participant registration endpoints (`403 FORBIDDEN_ROLE`).
* **`BR-05`:** A `PARTICIPANT` may only view registration records where `registration.participantId === currentUser.id`; accessing another participant's registration returns `403 Forbidden` (`FORBIDDEN_OWNERSHIP`).

## 5. UI Specification Summary (`/events/[id]` Registration Panel & `/my-registrations`)
* **Event Detail Registration Panel (`/events/[id]`):**
  * Shows read-only `Event Code`, `Capacity`, `Registered`, and `Remaining Seats` in `#F0F0F0` shaded boxes.
  * When logged in as `PARTICIPANT`:
    * **Eligible State:** Primary Roasted Caramel `#A85F34` (hover `#D37D30`) button `"Register for Event"`. While submitting, button disables and displays `"Registering..."`.
    * **Success State:** Displays confirmation banner (`#EAF6EF` bg / `#065F46` text) showing official `registrationNumber` (`REG-2026-NNNN`), status badge `REGISTERED`, and link `"View in My Registrations"`.
    * **Already Registered State:** Shows `REGISTERED` badge (`#EAF6EF`) with `registrationNumber` and disables duplicate submission in UI (while backend still enforces `409 DUPLICATE_REGISTRATION` on direct API calls).
    * **Full Capacity / Conflict State:** Shows amber badge `"Event Full (0 seats left)"` or red error alert banner (`role="alert"`) if a concurrent request claims the last seat first (`409 EVENT_FULL`).
* **`/my-registrations` Screen (`PARTICIPANT` Only):**
  * Displays desktop table / mobile card list of the authenticated participant's registrations with columns: `Registration No.` (`REG-YYYY-NNNN`), `Event Code`, `Event Title`, `Skill Category`, `Skill Hours`, `Start Date`, `Location`, `Status` (`REGISTERED`), and `Registered Date`.
  * Includes Loading state, Empty state (`"You have not registered for any skill-building events yet."` with `"Browse Events"` CTA), and Safe API Failure state.

## 6. Data Changes
* **Model Introduced:** `Registration` (`registrations` table) with unique `registrationNumber`, composite unique constraint `@@unique([eventId, participantId])`, FKs to `Event.id` and `User.id`, and indexes on `[participantId, registeredAt]` and `[eventId, status]` as defined in [`docs/system-sds.md`](../../system-sds.md).

## 7. REST API Contract

### 7.1 `POST /api/events/:id/registrations`
* **Auth:** `PARTICIPANT` only (`401` if unauthenticated, `403 FORBIDDEN_ROLE` if `ORGANIZER`).
* **Request Body:** `{}` (Participant identity is derived strictly from `currentUser.id` in server session; any client-supplied `participantId` is ignored).
* **Success (`201 Created`):**
  ```json
  {
    "data": {
      "registration": {
        "id": "reg-uuid",
        "registrationNumber": "REG-2026-0001",
        "eventId": "event-uuid",
        "participantId": "student1-uuid",
        "status": "REGISTERED",
        "registeredAt": "2026-11-11T12:30:00.000Z"
      },
      "remainingSeats": 19
    }
  }
  ```
* **Errors:**
  * `401 Unauthorized` (`UNAUTHENTICATED`)
  * `403 Forbidden` (`FORBIDDEN_ROLE`): User is an `ORGANIZER`.
  * `404 Not Found` (`NOT_FOUND`): Event `:id` does not exist.
  * `409 Conflict` (`DUPLICATE_REGISTRATION`): Participant already holds an active registration for this event.
  * `409 Conflict` (`EVENT_FULL`): Event has reached maximum capacity (`remainingSeats === 0`).

### 7.2 `GET /api/registrations/my` and `GET /api/registrations/:id`
* **Auth:** `PARTICIPANT` only (`GET /api/registrations/:id` additionally requires `registration.participantId === currentUser.id`).
* **Success (`200 OK`):** Returns `{ "data": { "registrations": [...] } }` or `{ "data": { "registration": { ... } } }`.
* **Errors:** `401 Unauthorized`, `403 Forbidden` (`FORBIDDEN_ROLE` or `FORBIDDEN_OWNERSHIP`), `404 Not Found`.

---

## 8. Acceptance Criteria (Given–When–Then Format)

| AC ID | Given–When–Then Acceptance Criterion | Linked Reqs |
| :--- | :--- | :--- |
| **AC-10** | **Given** an authenticated `PARTICIPANT` and a published event with `remainingSeats >= 1` for which the participant has no active registration, **when** the participant submits `POST /api/events/:id/registrations`, **then** one `Registration` is saved in PostgreSQL with status `REGISTERED` and a unique `registrationNumber` (`REG-YYYY-NNNN`), `remainingSeats` decreases by 1, and `201 Created` is returned. | `FR-04`, `BR-01`, `NFR-03`, `NFR-04` |
| **AC-11** | **Given** an authenticated `PARTICIPANT` who already holds an active (`REGISTERED`) registration for an event, **when** the participant submits another `POST /api/events/:id/registrations` request for the same event, **then** the backend rejects the request with `409 Conflict` (`DUPLICATE_REGISTRATION`) and no second registration is stored. | `BR-03`, `NFR-03` |
| **AC-12** | **Given** a published event with `remainingSeats === 0` (or `capacity = 1` receiving two competing registration requests simultaneously), **when** `POST /api/events/:id/registrations` is submitted, **then** at most one request succeeds for the last seat (`201 Created`) and any request exceeding `capacity` is rejected with `409 Conflict` (`EVENT_FULL`) so active registrations never exceed `capacity`. | `BR-02`, `NFR-03` |
| **AC-13** | **Given** an authenticated `ORGANIZER` account, **when** the organizer attempts to register for an event via `POST /api/events/:id/registrations` or access `GET /api/registrations/my`, **then** the backend rejects the request with `403 Forbidden` (`FORBIDDEN_ROLE`). | `BR-04`, `NFR-02` |
| **AC-14** | **Given** an authenticated `PARTICIPANT` who has registered for an event, **when** the participant opens `My Registrations` (`GET /api/registrations/my`) or their registration detail (`GET /api/registrations/:id`), **then** only registrations belonging to `currentUser.id` are returned (`200 OK`) with their official `registrationNumber` and `REGISTERED` status. | `FR-05`, `BR-04` |
| **AC-15** | **Given** `Participant B` is authenticated, **when** a registration belonging to `Participant A` is requested via `GET /api/registrations/:regIdOfParticipantA` (or when `Participant B` supplies `participantId = Participant A` in a request), **then** the backend rejects the access with `403 Forbidden` (`FORBIDDEN_OWNERSHIP`) and returns no registration data. | `BR-04`, `BR-05`, `NFR-02` |

---

## 9. Planned Automated Tests (Software Test Specification for F-03)

| Test ID | Type ID & Level | Requirement / AC | What It Tests (Precondition & Action) | Expected Result | Automated Test File | Final Status |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **TEST-20** | `UNIT-04` (Unit) | `AC-10`, `BR-01` | Official `registrationNumber` generator (`REG-YYYY-NNNN`) and seat availability calculator. | Generates valid `REG-2026-NNNN` format and computes `remainingSeats = Math.max(0, capacity - activeCount)`. | `tests/unit/registration-rules.unit.test.ts` | Planned |
| **TEST-21** | `UNIT-05` (Unit) | `AC-11`, `AC-12`, `BR-02`, `BR-03` | Registration eligibility domain rule evaluator for duplicate active status and full capacity (**TDD Target #2**). | Throws `DUPLICATE_REGISTRATION` when already `REGISTERED`, and `EVENT_FULL` when `activeCount >= capacity`. | `tests/unit/registration-rules.unit.test.ts` | Planned |
| **TEST-22** | `API-10` (API) | `AC-10`, `FR-04`, `NFR-04` | `POST /api/events/:event1Id/registrations` as `student1` on Event 1 (`capacity: 20`). | Returns `201 Created` (`< 500 ms`), saves `Registration` with `REG-2026-NNNN` and `status: "REGISTERED"`, `remainingSeats: 19`. | `tests/api/registrations.api.test.ts` | Planned |
| **TEST-23** | `API-11` (API) | `AC-11`, `BR-03` | Duplicate registration attempt by `student1` for Event 1 (`POST /api/events/:event1Id/registrations` twice). | Second request returns `409 Conflict` (`DUPLICATE_REGISTRATION`); DB has exactly 1 row for `(event1Id, student1.id)`. | `tests/api/registrations.api.test.ts` | Planned |
| **TEST-24** | `API-12` (API - Boundary) | `AC-12`, `BR-02` | Registration attempt on full Event 2 (`capacity: 1`, `student1` already registered; `student2` requests seat) (**TDD Target #3**). | Returns `409 Conflict` (`EVENT_FULL`); `student2` is not registered and Event 2 active count stays `1`. | `tests/api/registrations.api.test.ts` | Planned |
| **TEST-25** | `API-13` (API - Concurrency) | `AC-12`, `BR-02`, `NFR-03` | Two competing parallel requests (`Promise.all`) from `student1` and `student2` for the last seat on Event 2 (`capacity: 1`). | Exactly one returns `201 Created` and one returns `409 Conflict` (`EVENT_FULL`); DB active count for Event 2 is strictly `1`. | `tests/api/registrations.api.test.ts` | Planned |
| **TEST-26** | `API-14` (API) | `AC-13`, `BR-04`, `NFR-02` | `organizer1` (`ORGANIZER`) attempts `POST /api/events/:event1Id/registrations` and `GET /api/registrations/my`. | Both return `403 Forbidden` (`FORBIDDEN_ROLE`); zero registrations created. | `tests/api/registrations.api.test.ts` | Planned |
| **TEST-27** | `API-15` (API) | `AC-14`, `FR-05`, `BR-04` | `student1` retrieves `GET /api/registrations/my` and `GET /api/registrations/:reg1Id` (and tests ignoring spoofed `participantId` in body). | Returns `200 OK` with only `student1`'s registrations; spoofed `participantId` never overrides `currentUser.id`. | `tests/api/registrations.api.test.ts` | Planned |
| **TEST-28** | `API-16` (API - Privacy) | `AC-15`, `BR-05`, `NFR-02` | `student2` requests `student1`'s private registration via `GET /api/registrations/:reg1Id` (**TDD Target #4a**). | Returns `403 Forbidden` (`FORBIDDEN_OWNERSHIP`) with zero private registration fields in response. | `tests/api/registrations.api.test.ts` | Planned |
| **TEST-29** | `UI-05` (UI) | `AC-10`, `AC-14` | `MyRegistrations` and `EventDetail` registration button states (Eligible, Busy `"Registering..."`, Registered badge, Full state, Empty list state). | Renders busy button while submitting, shows `REG-2026-NNNN` on success, and renders empty state when list is `[]`. | `tests/ui/MyRegistrations.test.tsx` | Planned |
| **TEST-30** | `E2E-04` (E2E) | `AC-10`, `AC-14` | Participant logs in $\rightarrow$ opens Event 1 $\rightarrow$ clicks `"Register for Event"` $\rightarrow$ verifies confirmation & locates registration in `/my-registrations`. | Registration is saved, `remainingSeats` decrements in UI, and `/my-registrations` displays the new `REG-2026-NNNN` record. | `e2e/sprint-1/participant-journey.spec.ts` | Planned |
| **TEST-31** | `E2E-05` (E2E) | `AC-11`, `AC-12` | Participant attempts duplicate registration and another participant attempts registration on a full 1-seat event (`EVT-2026-0002`). | UI prevents/rejects duplicate and full-event sign-ups with clear status badges and error messages. | `e2e/sprint-1/participant-journey.spec.ts` | Planned |

---

## 10. Feature Definition of Done
- [ ] `Registration` model with `@@unique([eventId, participantId])` migrated to PostgreSQL.
- [ ] TDD Red $\rightarrow$ Green evidence captured for duplicate registration (`TEST-21` / `TEST-23`), full capacity & concurrency (`TEST-24` / `TEST-25`), and cross-participant privacy (`TEST-28`).
- [ ] `POST /api/events/:id/registrations`, `GET /api/registrations/my`, `GET /api/registrations/:id`, and UI screens (`/events/[id]`, `/my-registrations`) implemented.
- [ ] All planned automated tests (`TEST-20`–`TEST-31`) passing.
- [ ] Peer-reviewed PR merged into `sprint1-staging`.
