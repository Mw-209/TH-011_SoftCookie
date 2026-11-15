# Software Requirements Specification (SRS)

**Course:** CPE 334 — Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Project Theme:** Theme 3 — Event Registration and Attendance System  
**Specialized Context:** University Skill-Building Event Registration and Attendance System  
**Team Name:** TH-011_SoftCookie  
**Document Version:** 1.1 (Engineering Baseline — Aligned with CPE 334 SDD/TDD Conventions)  
**Last Updated:** 2026-11-11  

| Team Member | Student ID | GitHub Username | Role / Participation |
| :--- | :--- | :--- | :--- |
| Kusumas Kerdbankram | 67070505209 | `Mw-209` | Co-Engineer (Specification, UI/API/DB Design, Testing, Implementation, Peer Review) |
| Thitikan Tiranobpakan | 67070505213 | `thitikan48` | Co-Engineer (Specification, UI/API/DB Design, Testing, Implementation, Peer Review) |

**Repository URL:** https://github.com/Mw-209/TH-011_SoftCookie.git

---

## 1. Stakeholder Problem and Request Interpretation

### 1.1 Stakeholder Brief (Theme 3 Reference)
> *"Organizers publish events, manage limited places, and record attendance. Participants discover events and register. The finished product should cover publication, capacity, registration/cancellation, organizer management, check-in, and attendance reporting. Clarify duplicate registration, registration deadlines, and capacity changes."*

### 1.2 Stakeholder Request Interpretation (In Our Team's Own Words)
University faculties, student clubs, and career development centers regularly host hands-on workshops, technical bootcamps, and leadership seminars to help students build co-curricular skills. Managing sign-ups through spreadsheets or generic web forms creates four critical operational problems:
1. **Overbooking Under Concurrent Demand:** Popular skill-building workshops have strict room and lab-equipment limits. Without database-level concurrency control, simultaneous submissions for the last available seat result in overbooking.
2. **Duplicate Registrations:** Students accidentally or repeatedly submit sign-up forms for the same workshop, distorting available seat counts.
3. **Weak Role, Ownership, and Privacy Boundaries:** Shared sheets allow students to see other students' private registration records or allow one organizer to accidentally modify another organizer's workshop roster.
4. **Disconnected Lifecycle Tracking:** Organizers lack an integrated system to enforce registration cutoffs, release seats when participants cancel prior to the deadline, record venue check-in, and compute accurate attendance and skill-hour summaries.

To solve this, we are engineering the **University Skill-Building Event Registration and Attendance System**—a full-stack web application where **Organizers** publish capacity-bounded skill workshops and manage attendance for their own events, and **Participants** discover workshops, claim available seats safely, manage their registrations, and track their earned skill hours.

---

## 2. Actors, Roles, and Responsibilities

Each user account holds exactly one role (`PARTICIPANT` or `ORGANIZER`). The authenticated server-side session—never a client-supplied user ID or role selector—determines the current user's identity and permissions:

| Actor / Role | Description | Permitted Responsibilities and Explicit Restrictions |
| :--- | :--- | :--- |
| **Participant** (`PARTICIPANT`) | University student or staff member attending skill-building workshops. | **Permitted:**<br>- Authenticate via email/password and log out.<br>- Browse, search, and filter published skill-building events and view real-time remaining seats.<br>- Register for an open event with available capacity (at most one active registration per event).<br>- View their own registrations (`My Registrations`) and open their own registration detail.<br>- Cancel their own active (`REGISTERED`) registration before the event's registration deadline.<br>**Forbidden (`403 Forbidden`):**<br>- Cannot create, edit, or publish events.<br>- Cannot view an event's participant roster or attendance summary.<br>- Cannot view, cancel, or modify another participant's registration record. |
| **Organizer** (`ORGANIZER`) | Faculty coordinator, club leader, or staff member who hosts skill-building workshops. | **Permitted:**<br>- Authenticate via email/password and log out.<br>- Create and publish skill-building events with positive capacity, skill category, skill hours, schedule, and registration deadline.<br>- Browse published events.<br>- View the participant registration roster for **their own** events (`event.organizerId === currentUser.id`).<br>- Update capacity and registration deadline for **their own** events within business rules.<br>- Record participant check-in (`REGISTERED` $\rightarrow$ `ATTENDED`) for **their own** events.<br>- View attendance and skill-hour summary reports for **their own** events.<br>**Forbidden (`403 Forbidden`):**<br>- Cannot view rosters, edit settings, record check-in, or view reports for events owned by another Organizer.<br>- Cannot submit participant registrations using an Organizer account. |
| **Unauthenticated Visitor** (`ANONYMOUS`) | Any client without a valid, active server session. | **Permitted:**<br>- Access `/login`, submit credentials to `POST /api/auth/login`, and check `GET /api/health` and `GET /api/ready`.<br>**Forbidden (`401 Unauthorized`):**<br>- Cannot access any protected screen or protected `/api/*` endpoint. |

---

## 3. Product Scope and Explicit Exclusions

### 3.1 Included Scope (Across Sprints 1–3)
* **Sprint 1 (Small Deployable Product — Baseline Foundation & Core Vertical Slice):**
  * Real session-based authentication (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`) backed by PostgreSQL `Session` records, `HttpOnly` cookies, and `bcrypt` password hashing.
  * Server-side role-based access control (`PARTICIPANT` vs. `ORGANIZER`) and record ownership enforcement.
  * Organizer event creation and publication (`POST /api/events`) with positive integer capacity, skill category, skill hours, schedule, and registration deadline.
  * Authenticated event discovery catalog (`GET /api/events`) and event detail view (`GET /api/events/:id`) displaying authoritative remaining seats.
  * Participant event registration (`POST /api/events/:id/registrations`) with atomic capacity enforcement, last-seat concurrency protection, and duplicate active registration prevention.
  * Participant personal registrations list (`GET /api/registrations/my`) and owned registration detail (`GET /api/registrations/:id`).
  * Organizer inspection of participant registrations for their own events (`GET /api/events/:id/registrations`).
* **Sprint 2 (Core Expansion — Deadlines, Capacity Changes, Cancellation & Check-In):**
  * Organizer updates to event `capacity` and `registrationDeadline` (`PATCH /api/events/:id`) with floor validation (`newCapacity >= activeRegistrationsCount`).
  * Backend enforcement of `registrationDeadline` cutoff on registrations and cancellations.
  * Participant self-cancellation (`POST /api/registrations/:id/cancel`) prior to `registrationDeadline`, immediately releasing the seat, and support for re-registration while open.
  * Organizer participant check-in (`POST /api/events/:id/registrations/:regId/check-in`) transitioning `REGISTERED` $\rightarrow$ `ATTENDED`.
* **Sprint 3 (Completion & Hardening — Attendance Reporting, Filtering & Regression):**
  * Organizer attendance summary report (`GET /api/events/:id/summary`) computing server-authoritative metrics (`capacity`, `registeredCount`, `cancelledCount`, `attendedCount`, `attendanceRatePercent`, `totalSkillHoursDelivered`).
  * Event catalog search, skill-category filtering, availability filtering, sorting, and pagination (`GET /api/events?search=...&category=...&onlyAvailable=...`).
  * Comprehensive error handling, responsive UI verification across Desktop/Tablet/Mobile viewports, UAT defect resolution, and final regression testing.

### 3.2 Explicitly Excluded (Out of Scope)
* **Monetary Payments / Paid Ticketing:** All university skill-building workshops are free of charge; no payment gateway or billing is included.
* **Self-Registration, Password Reset Emails, and External Notifications:** User accounts are provisioned via reproducible database seeding (`server/prisma/seed.ts`); external email/SMS/LINE gateways are excluded.
* **Multiple Roles per Account or User Administration CRUD:** Each user has a single fixed role (`PARTICIPANT` or `ORGANIZER`).
* **Automatic Waitlist Promotion:** When `remainingSeats === 0`, registration requests are rejected immediately with `409 Conflict` (`EVENT_FULL`).
* **Draft/Unpublished Event States:** Validated events created by an Organizer are published immediately.
* **File Attachments / QR Hardware Integration:** Check-in is performed directly by the owning Organizer through the web interface.

---

## 4. Functional Requirements (FR)

| FR ID | Requirement Title | Observable Behavior Statement | Priority | Target Sprint |
| :--- | :--- | :--- | :---: | :---: |
| **FR-01** | User Authentication & Session Lifecycle | The system shall authenticate users with valid seeded `email` and `password` credentials, persist a server-side `Session` in PostgreSQL bound to an `HttpOnly` cookie, return the current authenticated user's identity and role via `GET /api/auth/me`, and invalidate the session in PostgreSQL upon logout (`POST /api/auth/logout`). | High | Sprint 1 |
| **FR-02** | Event Creation & Publication | The system shall allow an authenticated `ORGANIZER` to create and publish a skill-building event with `title`, `description`, `skillCategory`, `skillHours`, `location`, `startAt`, `endAt`, `registrationDeadline`, and `capacity`, automatically assigning `organizerId = currentUser.id` and generating a unique official `eventCode` (`EVT-YYYY-NNNN`). | High | Sprint 1 |
| **FR-03** | Event Discovery & Detail Retrieval | The system shall allow authenticated users (`PARTICIPANT` and `ORGANIZER`) to retrieve the list of published events and open an individual event's detail view showing authoritative `capacity`, `activeRegistrationsCount`, and `remainingSeats`. | High | Sprint 1 |
| **FR-04** | Participant Event Registration | The system shall allow an authenticated `PARTICIPANT` to register for a published event that has available seats (`remainingSeats >= 1`) and an open registration window, saving a `Registration` record with status `REGISTERED` and a unique `registrationNumber` (`REG-YYYY-NNNN`). | High | Sprint 1 |
| **FR-05** | Participant My Registrations & Owned Detail | The system shall allow an authenticated `PARTICIPANT` to view all of their own registrations in `My Registrations` and inspect the detail of any single registration they own. | High | Sprint 1 |
| **FR-06** | Organizer Event Roster Inspection | The system shall allow an authenticated `ORGANIZER` to view the registration roster (participant name, email, registration number, status, registered timestamp) exclusively for events owned by that organizer. | High | Sprint 1 |
| **FR-07** | Organizer Capacity & Deadline Modification | The system shall allow an owning `ORGANIZER` to update the `capacity` and `registrationDeadline` of their published event when the new values satisfy capacity floor and schedule ordering rules. | Medium | Sprint 2 |
| **FR-08** | Registration Deadline Enforcement | The system shall compare the server timestamp against `event.registrationDeadline` and reject any registration or participant cancellation submitted after `registrationDeadline`. | Medium | Sprint 2 |
| **FR-09** | Participant Registration Cancellation & Re-Registration | The system shall allow an owning `PARTICIPANT` to cancel their `REGISTERED` registration before `registrationDeadline`, updating status to `CANCELLED`, recording `cancelledAt`, and releasing 1 seat back to `remainingSeats`; and allow re-registration if seats and deadline remain open. | Medium | Sprint 2 |
| **FR-10** | Organizer Participant Check-In | The system shall allow an owning `ORGANIZER` to check in a participant whose registration status is `REGISTERED`, transitioning the status to `ATTENDED` and recording `checkedInAt`. | Medium | Sprint 2 |
| **FR-11** | Organizer Attendance Summary & Reporting | The system shall provide an owning `ORGANIZER` with a server-computed attendance summary for each owned event (`capacity`, `registeredCount`, `cancelledCount`, `attendedCount`, `remainingSeats`, `attendanceRatePercent`, and `totalSkillHoursDelivered`). | Medium | Sprint 3 |
| **FR-12** | Event Search, Filtering & Sorting | The system shall allow authenticated users to search published events by keyword (`title`, `location`, `eventCode`), filter by `skillCategory` and seat availability (`open` vs. `all`), and sort by `startAt` or `createdAt`. | Low | Sprint 3 |

---

## 5. Business Rules (BR)

All Business Rules are numbered `BR-01` through `BR-10` and are enforced on the backend:

| BR ID | Rule Title | Testable Engineering Rule Specification | Target Sprint |
| :--- | :--- | :--- | :---: |
| **BR-01** | Positive Capacity, Skill Hours & Valid Schedule Ordering | Every event must have an integer `capacity` where $1 \le \text{capacity} \le 1000$ and integer `skillHours` where $1 \le \text{skillHours} \le 40$. Event timestamps must satisfy $\text{registrationDeadline} \le \text{startAt} < \text{endAt}$. Official `eventCode` (`EVT-YYYY-NNNN`) and `registrationNumber` (`REG-YYYY-NNNN`) are generated by the backend and are read-only. | Sprint 1 (`F-02`, `F-03`) |
| **BR-02** | Strict Capacity Limit & Atomic Last-Seat Concurrency Protection | The number of active registrations (`status IN ('REGISTERED', 'ATTENDED')`) for an event must never exceed `event.capacity`. Registration creation must lock the target `Event` row inside a PostgreSQL transaction (`SELECT ... FOR UPDATE`) before counting active registrations so that competing requests for the last remaining seat allow at most one `201 Created` and reject excess requests with `409 Conflict` (`EVENT_FULL`). | Sprint 1 (`F-03`) |
| **BR-03** | Single Active Registration per Participant per Event | A `PARTICIPANT` may hold at most one active registration (`REGISTERED` or `ATTENDED`) per event at any given time. A duplicate registration request for the same event by the same participant must be rejected with `409 Conflict` (`DUPLICATE_REGISTRATION`). | Sprint 1 (`F-03`) |
| **BR-04** | Server-Derived Identity & Strict Role Separation | The authenticated session user (`currentUser`), never a `participantId`, `organizerId`, or role value supplied in a client request body/query, determines user identity and role. Only `ORGANIZER` users may create/edit events, inspect event rosters, record check-in, or view attendance summaries. Only `PARTICIPANT` users may register for events, view `My Registrations`, or cancel their registrations. Role violations return `403 Forbidden` (`FORBIDDEN_ROLE`). | Sprint 1 (`F-01`–`F-04`) & Sprints 2–3 |
| **BR-05** | Event Ownership & Participant Privacy Isolation | An `ORGANIZER` may only inspect rosters, modify capacity/deadlines, record check-in, or view summaries for events where `event.organizerId === currentUser.id`. A `PARTICIPANT` may only view or cancel registrations where `registration.participantId === currentUser.id`. Cross-organizer or cross-participant requests return `403 Forbidden` (`FORBIDDEN_OWNERSHIP`) with zero private data leaked. | Sprint 1 (`F-01`, `F-03`, `F-04`) & Sprints 2–3 |
| **BR-06** | Registration & Cancellation Deadline Cutoff | Participant registration and participant self-cancellation are permitted only when the backend timestamp satisfies $\text{NOW()} \le \text{event.registrationDeadline}$. Requests arriving after `registrationDeadline` are rejected with `409 Conflict` (`DEADLINE_PASSED`). | Sprint 2 (`F-05`, `F-06`) |
| **BR-07** | Safe Capacity Reduction Floor | An owning `ORGANIZER` may increase `event.capacity` at any time, or decrease it only if $\text{newCapacity} \ge \text{activeRegistrationsCount}$ and $\text{newCapacity} \ge 1$. Attempting to reduce `capacity` below the current number of active (`REGISTERED` + `ATTENDED`) registrations is rejected with `409 Conflict` (`CAPACITY_BELOW_ACTIVE_COUNT`). | Sprint 2 (`F-05`) |
| **BR-08** | Cancellation Seat Release & Re-Registration Lifecycle | Only a registration in `REGISTERED` status can be cancelled by its owning `PARTICIPANT` (and only when $\text{NOW()} \le \text{registrationDeadline}$). Cancellation sets `status = 'CANCELLED'` and `cancelledAt = NOW()`, immediately freeing 1 seat. A participant with a `CANCELLED` registration may re-register for the same event if $\text{NOW()} \le \text{registrationDeadline}$ and $\text{remainingSeats} \ge 1$, transitioning the existing record back to `REGISTERED` with an updated `registeredAt` timestamp and `cancelledAt = null`. | Sprint 2 (`F-06`) |
| **BR-09** | Valid Attendance Check-In State Transitions | Only an owning `ORGANIZER` may check in a participant, and only when the registration's current status is `REGISTERED` (transitioning to `ATTENDED` with `checkedInAt = NOW()`). Attempting to check in a `CANCELLED` registration or re-check in an already `ATTENDED` registration returns `409 Conflict` (`INVALID_STATE_TRANSITION`). A participant cannot cancel an `ATTENDED` registration (`409 Conflict`). | Sprint 2 (`F-07`) |
| **BR-10** | Server-Authoritative Attendance Summary Metrics | All event attendance metrics (`capacity`, `registeredCount`, `cancelledCount`, `attendedCount`, `activeRegistrationsCount`, `remainingSeats`, `attendanceRatePercent`, `totalSkillHoursDelivered`) must be calculated by the backend from persisted database records. `attendanceRatePercent` equals $\text{ROUND}\left(\frac{\text{attendedCount}}{\text{registeredCount} + \text{attendedCount}} \times 100, 2\right)$ when $(\text{registeredCount} + \text{attendedCount}) > 0$, and $0$ otherwise. `totalSkillHoursDelivered` equals $\text{attendedCount} \times \text{event.skillHours}$. | Sprint 3 (`F-08`) |

---

## 6. Field-Level Validation, Mutability, and Failure Recovery Rules

In accordance with CPE 334 Spec-Driven Development standards, every user-facing and system-generated field has explicit mutability, trimming, validation bounds, and failure recovery behavior:

| Entity & Field | Mutability / Source | Required | Trimming & Normalization | Validation Bounds & Allowed Values | Behavior on Validation / API Failure |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **Login:** `email` | User input | Yes (`*`) | Trim leading/trailing whitespace; convert to lowercase | Valid email format, $5 \le \text{length} \le 254$ chars | Field-level error message below `email`; entered email preserved in form. |
| **Login:** `password` | User input | Yes (`*`) | Do **not** trim password characters | Non-empty string, $1 \le \text{length} \le 128$ chars | Clear password input on `401` failure; preserve `email` input; show safe error message. |
| **Event:** `eventCode` | System-generated (`Read-only`) | Auto | N/A | Format `EVT-YYYY-NNNN` (unique, generated by backend upon creation) | Generated only after transaction commits; displayed in confirmation and detail view. |
| **Event:** `organizerId` | System-generated (`Read-only`) | Auto | N/A | Bound strictly to `currentUser.id` from server session (`BR-04`) | Client-supplied `organizerId` is ignored/rejected. |
| **Event:** title | Editable on create | Yes (`*`) | Trim whitespace; collapse multiple internal spaces | $5 \le \text{length} \le 120$ chars (prevents empty/single-word titles and table overflow) | Inline field error below `title`; all form inputs preserved on error. |
| **Event:** description | Editable on create | Yes (`*`) | Trim leading/trailing whitespace | $10 \le \text{length} \le 2000$ chars (ensures meaningful workshop details) | Inline field error below `description`; all form inputs preserved. |
| **Event:** skillCategory | Editable on create | Yes (`*`) | Exact enum match | One of: `TECHNICAL`, `DATA_AI`, `COMMUNICATION`, CAREER | Inline field error below selector; form values preserved. |
| **Event:** skillHours | Editable on create | Yes (`*`) | Parse as integer | Integer, $1 \le \text{skillHours} \le 40$ (`BR-01`) | Inline field error below `skillHours`; form values preserved. |
| **Event:** location | Editable on create | Yes (`*`) | Trim leading/trailing whitespace | $3 \le \text{length} \le 150$ chars | Inline field error below `location`; form values preserved. |
| **Event:** `startAt`, `endAt`, `registrationDeadline` | `startAt`/`endAt` on create; `registrationDeadline` editable in Sprint 2 | Yes (`*`) | Parse as valid ISO-8601 UTC timestamp | Valid dates where $\text{registrationDeadline} \le \text{startAt} < \text{endAt}$ (`BR-01`) | Inline field error on the violating date input; all form values preserved. |
| **Event:** `capacity` | Editable by owning `ORGANIZER` (Sprint 1 create, Sprint 2 update) | Yes (`*`) | Parse as integer | Integer, $1 \le \text{capacity} \le 1000$ (`BR-01`), and on update $\text{capacity} \ge \text{activeCount}$ (`BR-07`) | Inline field error / `409 Conflict` banner; entered form values preserved. |
| **Registration:** `registrationNumber` | System-generated (`Read-only`) | Auto | N/A | Format `REG-YYYY-NNNN` (unique, generated by backend upon creation) | Shown immediately in success banner and `My Registrations`. |
| **Registration:** `status` | System-controlled state transition (`Read-only` field) | Auto | Exact enum match | `REGISTERED`, `CANCELLED`, `ATTENDED` (begins as `REGISTERED`) | Updated only through dedicated action endpoints (`cancel`, `check-in`). |

---

## 7. Non-Functional Requirements (NFR)

| NFR ID | Category | Measurable Target | Practical Verification Method | Target Sprint |
| :--- | :--- | :--- | :--- | :---: |
| **NFR-01** | Authentication & Credential Security | 100% of stored user passwords use `bcrypt` (cost factor $\ge 10$); `0` API responses expose `passwordHash`; 100% of unauthenticated requests to protected `/api/*` endpoints return `401 Unauthorized`. | Automated Unit & API Integration Tests (`UNIT-01`, `API-02`–`API-05`) inspecting PostgreSQL rows, cookies, and JSON payloads. | Sprint 1 |
| **NFR-02** | Backend Authorization & Ownership Protection | 100% of protected endpoints enforce role and ownership rules on the server; 100% of cross-role, cross-organizer, and cross-participant access attempts return `403 Forbidden` with zero private data returned. | Automated API Integration & E2E Tests (`API-08`, `API-14`, `API-16`, `API-18`, `API-19`, `E2E-03`, `E2E-06`). | Sprint 1 (and Regression in Sprints 2–3) |
| **NFR-03** | Transactional Persistence & Concurrency Safety | 100% of committed records survive server/container restarts; under simultaneous competing requests for the last remaining seat (`capacity = 1`), persisted active registrations never exceed `capacity` ($\text{activeCount} \le \text{capacity}$). | Automated Concurrency Race Integration Test (`API-13`) firing parallel requests via `Promise.all`, plus container restart test in Lab 5. | Sprint 1 & Lab 5 |
| **NFR-04** | API Responsiveness | Core API endpoints (`GET /api/health`, `GET /api/ready`, `POST /api/auth/login`, `GET /api/events`, `POST /api/events`, `POST /api/events/:id/registrations`) complete within $< 500\text{ ms}$ per request on the local/containerized PostgreSQL test environment. | Automated API test duration assertions (`durationMs < 500`). | Sprint 1 & Sprint 3 |
| **NFR-05** | Responsive UI, Visual Consistency & Container Reproducibility | All screens render without clipped labels, overlapping controls, or unintended horizontal overflow across Desktop ($\ge 992\text{ px}$), Tablet ($768\text{–}991\text{ px}$), and Mobile ($< 768\text{ px}$) viewports; application builds and runs via Docker with `.env.example` and `0` committed secrets. | Automated UI component/style tests, Playwright multi-viewport checks (`Desktop`, `Tablet`, `Mobile`), and Docker build check. | Sprint 1 (UI/Docker) & Lab 5 (CI/CD & GCP) |

---

## 8. Assumptions, Design Decisions, and Resolved Ambiguities

| Decision ID | Topic / Ambiguity | Question Considered | Resolved Decision & Engineering Justification |
| :--- | :--- | :--- | :--- |
| **DEC-01** | University Skill-Building Context Specialization | What domain attributes distinguish this university system from a generic CRUD list? | Events include `eventCode` (`EVT-YYYY-NNNN`), `skillCategory` (`TECHNICAL`, `DATA_AI`, `COMMUNICATION`, `CAREER`), and `skillHours` ($1\text{–}40$), and registrations generate an official `registrationNumber` (`REG-YYYY-NNNN`). This provides verifiable read-only backend-generated identifiers and meaningful university skill metrics. |
| **DEC-02** | Duplicate Registration vs. Re-Registration After Cancellation | Can a participant register twice? What happens if they cancel in Sprint 2 and want to register again? | A participant can hold at most **one active registration** (`REGISTERED` or `ATTENDED`) per event (**BR-03**). Duplicate active attempts return `409 Conflict` (`DUPLICATE_REGISTRATION`). When a participant cancels in Sprint 2 (`CANCELLED`), the seat is released immediately; if they re-register before `registrationDeadline` while seats remain, the backend updates their existing `(eventId, participantId)` row back to `REGISTERED` (**BR-08**), preserving database uniqueness (`@@unique([eventId, participantId])`). |
| **DEC-03** | Registration Deadlines & Cancellation Cutoff | How do deadlines govern registration and cancellation? | Every event requires $\text{registrationDeadline} \le \text{startAt} < \text{endAt}$ (**BR-01**). Both registration and participant self-cancellation are allowed only while $\text{NOW()} \le \text{registrationDeadline}$ (**BR-06**). |
| **DEC-04** | Capacity Modification Rules | Can an Organizer lower an event's capacity after participants have already registered? | An Organizer can increase `capacity` (up to $1000$) or decrease `capacity` down to the current count of active registrations ($\text{newCapacity} \ge \text{activeRegistrationsCount}$ and $\text{newCapacity} \ge 1$, **BR-07**). Lowering capacity below active registrations is rejected with `409 Conflict` (`CAPACITY_BELOW_ACTIVE_COUNT`) so confirmed participants are never silently dropped. |
| **DEC-05** | Organizer Ownership Scope | Can an Organizer view or manage events created by another Organizer? | No. While all authenticated users can view the public event catalog (`GET /api/events`), only the owning Organizer (`event.organizerId === currentUser.id`) can inspect an event's registration roster, modify its capacity/deadline, check in attendees, or view its attendance summary (**BR-05**). Non-owning organizers receive `403 Forbidden` (`FORBIDDEN_OWNERSHIP`). |
| **DEC-06** | Atomic Concurrency Control for Last Seat | How does the backend prevent two concurrent requests from overbooking the final seat? | Inside `prisma.$transaction`, the backend executes `SELECT id, capacity FROM events WHERE id = $1 FOR UPDATE` to acquire a row-level lock on the target `Event` before counting active registrations and inserting the `Registration` (**BR-02**, **NFR-03**). |
| **DEC-07** | Duplicate-Submission & Recoverable Error Handling in UI | What happens when a user double-clicks a submit button or when an API request fails? | Submit buttons immediately enter a disabled busy state (`"Submitting..."` / `"Registering..."`) while a request is in flight, preventing accidental duplicate submissions. If validation (`400`) or conflict/server failure (`409`/`500`) occurs, all user-entered form values are preserved on screen alongside clear field-level or banner feedback. |
