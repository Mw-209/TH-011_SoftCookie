# Feature Engineering Contract — F-02: Event Creation, Publication & Discovery

**Sprint:** Sprint 1 (Issue #4 — `feature/4-f02-event-publication`)  
**Feature ID:** `F-02`  
**Linked Requirements:** `FR-02`, `FR-03`, `BR-01`, `BR-04`, `NFR-02`, `NFR-03`, `NFR-04`, `NFR-05`  
**Dependencies:** `F-01` (Authentication, Session Lifecycle & RBAC)  
**Contract Version:** 1.1 (Pre-Implementation Specification — CPE 334 SDD/TDD Format)  
**Last Updated:** 2026-11-11  

---

## 1. Feature Goal
Enable an authenticated `ORGANIZER` to create and publish university skill-building events with a backend-generated official `eventCode` (`EVT-YYYY-NNNN`) and validated positive capacity (`BR-01`), while allowing authenticated `PARTICIPANT` and `ORGANIZER` users to discover published events and inspect real-time seat availability.

## 2. Stakeholder Request Interpretation
Organizers need a structured, validated screen to publish skill-building workshops with an authoritative seat limit, skill category, skill hours, schedule, and registration cutoff. Both participants and organizers need an Event Discovery catalog and Event Detail screen that display accurate remaining seats (`remainingSeats / capacity`) and prevent participants from accessing organizer event-creation actions.

## 3. Scope of F-02
* **Included:**
  * Backend event creation (`POST /api/events`) with `ORGANIZER` role enforcement (`BR-04`), input trimming/validation (`BR-01`), and automatic generation of unique `eventCode` (`EVT-YYYY-NNNN`).
  * Published event list retrieval (`GET /api/events`) and single event detail retrieval (`GET /api/events/:id`) with server-computed `activeRegistrationsCount` and `remainingSeats`.
  * SoftCookie Warm Bakery Event Catalog screen (`/events`), Create Event screen (`/events/new`), and Event Detail screen (`/events/[id]`).
* **Explicitly Excluded:**
  * Updating capacity/deadlines after creation (`F-05` in Sprint 2) and search/category filter query controls (`F-08` in Sprint 3).

## 4. Linked Functional Requirements and Business Rules
* **`FR-02`:** Authenticated `ORGANIZER` creates and publishes an event with `title`, `description`, `skillCategory`, `skillHours`, `location`, `startAt`, `endAt`, `registrationDeadline`, and `capacity`, generating `eventCode` and binding `organizerId = currentUser.id`.
* **`FR-03`:** Authenticated users view published events and inspect event details with `capacity`, `activeRegistrationsCount`, and `remainingSeats`.
* **`BR-01`:** Integer `capacity` ($1 \le \text{capacity} \le 1000$), integer `skillHours` ($1 \le \text{skillHours} \le 40$), and $\text{registrationDeadline} \le \text{startAt} < \text{endAt}$. `eventCode` (`EVT-YYYY-NNNN`) is backend-generated and read-only.
* **`BR-04`:** Only `ORGANIZER` users may create events (`POST /api/events`); `PARTICIPANT` requests are rejected with `403 Forbidden` (`FORBIDDEN_ROLE`).

## 5. UI Specification Summary (`/events`, `/events/new`, `/events/[id]`)
* **`/events/new` (Create Event Mode — `ORGANIZER` Only):**
  * **Read-Only Header Group (`#F0F0F0` shading):** `Event Code` (`"Auto-generated on save (EVT-2026-XXXX)"`) and `Organizer` (current user's name & email).
  * **Editable Fields (`#FFFFFF` bg, required red asterisk `*`):**
    * `Event Title *` ($5\text{–}120$ chars), `Skill Category *` (`TECHNICAL`, `DATA_AI`, `COMMUNICATION`, `CAREER`), `Skill Hours *` (integer $1\text{–}40$), `Capacity (Seats) *` (integer $1\text{–}1000$), `Location *` ($3\text{–}150$ chars), `Registration Deadline *`, `Start Date/Time *`, `End Date/Time *`, and `Description *` (multiline textarea, $10\text{–}2000$ chars).
  * **States:** Field-level validation messages appear directly below invalid controls; Submit button shows `"Publishing..."` and disables while submitting; form values are preserved if an error occurs; success redirects to `/events/[id]` and shows a success confirmation banner (`#EAF6EF` / `#065F46`) with the generated `eventCode`.
  * **Role Restriction State:** If a `PARTICIPANT` opens `/events/new`, renders a `403 Access Denied` card.
* **`/events` (Event Discovery Catalog) & `/events/[id]` (Event Detail View):**
  * Displays `eventCode`, `title`, `skillCategory` badge, `skillHours` badge, `location`, schedule, `registrationDeadline`, `organizerName`, and seat badge (`"remainingSeats / capacity seats available"` in `#EAF6EF` / `#065F46`, or `"Full (0 / capacity)"` in warm biscuit/amber `#FEF3C7` / `#9A3412`).
  * Shows loading state while fetching, empty-catalog state if zero events exist, and safe API-failure banner if the backend is unreachable.

## 6. Data Changes
* **Model Introduced:** `Event` (`events` table) with unique `eventCode`, `organizerId` FK to `User.id`, and indexes on `[organizerId]`, `[skillCategory, startAt]`, and `[startAt]` as defined in [`docs/system-sds.md`](../../system-sds.md).
* **Seed Data (`prisma/seed.ts`):** Seeds `EVT-2026-0001` (`capacity: 20`, `organizer1`), `EVT-2026-0002` (`capacity: 1`, `organizer1`), and `EVT-2026-0003` (`capacity: 15`, `organizer2`).

## 7. REST API Contract

### 7.1 `POST /api/events`
* **Auth:** `ORGANIZER` only (`401` if unauthenticated, `403 FORBIDDEN_ROLE` if `PARTICIPANT`).
* **Request Body:**
  ```json
  {
    "title": "Cloud Native Docker Workshop",
    "description": "Hands-on containerization workshop for engineering students.",
    "skillCategory": "TECHNICAL",
    "skillHours": 3,
    "location": "Engineering Building Room 402",
    "startAt": "2026-12-01T09:00:00.000Z",
    "endAt": "2026-12-01T12:00:00.000Z",
    "registrationDeadline": "2026-11-30T23:59:00.000Z",
    "capacity": 25
  }
  ```
* **Success (`201 Created`):**
  ```json
  {
    "data": {
      "event": {
        "id": "uuid",
        "eventCode": "EVT-2026-0004",
        "title": "Cloud Native Docker Workshop",
        "description": "Hands-on containerization workshop for engineering students.",
        "skillCategory": "TECHNICAL",
        "skillHours": 3,
        "location": "Engineering Building Room 402",
        "startAt": "2026-12-01T09:00:00.000Z",
        "endAt": "2026-12-01T12:00:00.000Z",
        "registrationDeadline": "2026-11-30T23:59:00.000Z",
        "capacity": 25,
        "activeRegistrationsCount": 0,
        "remainingSeats": 25,
        "organizerId": "organizer1-uuid",
        "organizerName": "Dr. Somchai Wattana"
      }
    }
  }
  ```
* **Errors:** `400 Bad Request` (`VALIDATION_ERROR` with field-level `details`), `401 Unauthorized`, `403 Forbidden`.

### 7.2 `GET /api/events` and `GET /api/events/:id`
* **Auth:** Authenticated (`PARTICIPANT` or `ORGANIZER`)
* **Success (`200 OK`):** Returns `{ "data": { "events": [...] } }` ordered by `startAt ASC`, or `{ "data": { "event": { ... } } }` for `:id`.
* **Errors:** `401 Unauthorized`, `404 Not Found` (`NOT_FOUND` when `:id` does not exist).

---

## 8. Acceptance Criteria (Given–When–Then Format)

| AC ID | Given–When–Then Acceptance Criterion | Linked Reqs |
| :--- | :--- | :--- |
| **AC-06** | **Given** an authenticated `ORGANIZER` and valid event data with `capacity >= 1` and `skillHours >= 1`, **when** the organizer submits `POST /api/events`, **then** one `Event` is saved in PostgreSQL with `organizerId = currentUser.id` and a unique `eventCode` (`EVT-YYYY-NNNN`), and `201 Created` is returned. | `FR-02`, `BR-01`, `NFR-03` |
| **AC-07** | **Given** event data with `capacity <= 0`, non-integer capacity, `skillHours <= 0`, missing required fields, or `registrationDeadline > startAt`, **when** `POST /api/events` is submitted, **then** the request is rejected with `400 Bad Request` (`VALIDATION_ERROR`), no event is saved, and field-level validation messages are displayed while preserving entered form values. | `FR-02`, `BR-01` |
| **AC-08** | **Given** an authenticated `PARTICIPANT` account, **when** the participant attempts to create an event via `POST /api/events` or open `/events/new`, **then** the backend rejects the request with `403 Forbidden` (`FORBIDDEN_ROLE`) and the UI displays an access denied state. | `BR-04`, `NFR-02` |
| **AC-09** | **Given** an authenticated `PARTICIPANT` or `ORGANIZER`, **when** the user requests `GET /api/events` or `GET /api/events/:id`, **then** `200 OK` is returned with the published event information and authoritative `capacity`, `activeRegistrationsCount`, and `remainingSeats`. | `FR-03`, `NFR-04` |

---

## 9. Planned Automated Tests (Software Test Specification for F-02)

| Test ID | Type ID & Level | Requirement / AC | What It Tests (Precondition & Action) | Expected Result | Automated Test File | Final Status |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **TEST-10** | `UNIT-02` (Unit) | `AC-06`, `BR-01` | Official `eventCode` generator format (`EVT-YYYY-NNNN`) and valid event input normalization/trimming. | Generates unique `EVT-2026-NNNN` code and trims title/location strings cleanly. | `tests/unit/event-rules.unit.test.ts` | Planned |
| **TEST-11** | `UNIT-03` (Unit) | `AC-07`, `BR-01` | Event domain validator for `capacity <= 0`, `capacity: 1.5`, `skillHours <= 0`, short title, and `registrationDeadline > startAt` (**TDD Target #1**). | Rejects each invalid boundary input with `VALIDATION_ERROR` and field-specific messages. | `tests/unit/event-rules.unit.test.ts` | Planned |
| **TEST-12** | `API-06` (API) | `AC-06`, `FR-02` | `POST /api/events` as `organizer1` with valid payload (`capacity: 25`, `skillHours: 3`). | Returns `201 Created`; persists event in PostgreSQL with `eventCode`, `organizerId = organizer1.id`, `remainingSeats: 25`. | `tests/api/events.api.test.ts` | Planned |
| **TEST-13** | `API-07` (API) | `AC-07`, `BR-01` | `POST /api/events` as `organizer1` with `capacity: 0`, `capacity: -5`, and `registrationDeadline > startAt`. | Returns `400 Bad Request` (`VALIDATION_ERROR`); zero new rows stored in `events` table. | `tests/api/events.api.test.ts` | Planned |
| **TEST-14** | `API-08` (API) | `AC-08`, `BR-04`, `NFR-02` | `POST /api/events` attempted by `student1` (`PARTICIPANT`) and by an unauthenticated client. | Returns `403 Forbidden` (`FORBIDDEN_ROLE`) for `student1` and `401 Unauthorized` for anonymous client. | `tests/api/events.api.test.ts` | Planned |
| **TEST-15** | `API-09` (API) | `AC-09`, `FR-03`, `NFR-04` | `GET /api/events` and `GET /api/events/:id` (plus non-existent ID check). | Returns `200 OK` (`< 500 ms`) with seeded events and accurate `remainingSeats`; returns `404` for unknown ID. | `tests/api/events.api.test.ts` | Planned |
| **TEST-16** | `UI-03` (UI) | `AC-07` | `CreateEvent` form component: read-only vs. editable styling, required asterisks (`*`), field validation errors, busy state, and form value preservation on error. | Displays inline errors below invalid fields, disables button while submitting, and preserves entered text on failure. | `tests/ui/CreateEvent.test.tsx` | Planned |
| **TEST-17** | `UI-04` (UI) | `AC-09` | `EventCatalog` & `EventDetail` components: loading state, empty state, API error state, and seat availability badges. | Renders loading indicator, empty catalog message when `[]`, and accurate `remainingSeats / capacity` badges. | `tests/ui/EventCatalog.test.tsx` | Planned |
| **TEST-18** | `E2E-02` (E2E) | `AC-06`, `AC-09` | Organizer logs in $\rightarrow$ opens `/events/new` $\rightarrow$ submits valid event $\rightarrow$ verifies generated `eventCode` and detail view in `/events/[id]`. | New event is saved in PostgreSQL, shows official `EVT-2026-NNNN` code, and appears in `/events` catalog. | `e2e/sprint-1/organizer-journey.spec.ts` | Planned |
| **TEST-19** | `E2E-03` (E2E) | `AC-08`, `NFR-02` | Participant logs in and navigates directly to `/events/new`. | Create Event action is hidden in navbar and direct navigation renders `403 Access Denied`. | `e2e/sprint-1/auth-and-access.spec.ts` | Planned |

---

## 10. Feature Definition of Done
- [ ] `Event` model migrated to PostgreSQL and seeded with 3 reproducible events (`EVT-2026-0001` to `0003`).
- [ ] Unit validation tests (`TEST-11` / `UNIT-03`) written first (TDD Red $\rightarrow$ Green).
- [ ] `POST /api/events`, `GET /api/events`, `GET /api/events/:id` and SoftCookie Warm Bakery UI screens (`/events`, `/events/new`, `/events/[id]`) implemented.
- [ ] All planned automated tests (`TEST-10`–`TEST-19`) passing.
- [ ] Peer-reviewed PR merged into `sprint1-staging`.
