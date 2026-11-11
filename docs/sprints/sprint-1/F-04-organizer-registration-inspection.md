# Feature Engineering Contract — F-04: Organizer Event Registrations Inspection

**Sprint:** Sprint 1 (Issues #6 & #7 — `feature/6-f04-organizer-roster`, `feature/7-e2e-and-release-polish`)  
**Feature ID:** `F-04`  
**Linked Requirements:** `FR-06`, `BR-04`, `BR-05`, `NFR-02`, `NFR-05`  
**Dependencies:** `F-01` (Auth & RBAC), `F-02` (Event Creation), `F-03` (Event Registration)  
**Contract Version:** 1.1 (Pre-Implementation Specification — CPE 334 SDD/TDD Format)  
**Last Updated:** 2026-11-11  

---

## 1. Feature Goal
Allow an authenticated `ORGANIZER` to inspect the participant registration roster for events they personally created (`event.organizerId === currentUser.id`), while enforcing strict backend role (`BR-04`) and event-ownership (`BR-05`) boundaries and responsive Zen Green UI presentation (`NFR-05`).

## 2. Stakeholder Request Interpretation
Organizers must be able to open their own published workshops and inspect the list of registered participants (including each participant's name, email, official `registrationNumber`, status, and registration timestamp). However, one Organizer must not be able to view the participant roster of an event owned by another Organizer (`403 FORBIDDEN_OWNERSHIP`), and Participants must never be able to access an event's participant roster (`403 FORBIDDEN_ROLE`).

## 3. Scope of F-04
* **Included:**
  * Backend roster retrieval (`GET /api/events/:id/registrations`) with `ORGANIZER` role verification (`BR-04`) and strict `event.organizerId === currentUser.id` ownership verification (`BR-05`).
  * Zen Green Organizer Roster screen (`/organizer/events/[id]/registrations`) and `"View Registrations Roster"` action button on `/events/[id]` (visible only to the owning Organizer).
  * Multi-viewport responsive layout verification (`Desktop >= 992px`, `Tablet 768–991px`, `Mobile < 768px`) and Zen Green visual consistency across all Sprint 1 screens (`AC-19`, `AC-20`).
* **Explicitly Excluded:**
  * Organizer check-in action buttons (`F-07` in Sprint 2) and full attendance rate analytics (`F-08` in Sprint 3).

## 4. Linked Functional Requirements and Business Rules
* **`FR-06`:** Owning `ORGANIZER` retrieves and views the participant registration roster for their own event.
* **`BR-04`:** Only `ORGANIZER` users may access organizer roster endpoints; `PARTICIPANT` users receive `403 Forbidden` (`FORBIDDEN_ROLE`).
* **`BR-05`:** Only the `ORGANIZER` where `event.organizerId === currentUser.id` may inspect that event's registrations; any other `ORGANIZER` receives `403 Forbidden` (`FORBIDDEN_OWNERSHIP`) without exposing roster data.
* **`NFR-02` & `NFR-05`:** 100% backend enforcement of role/ownership restrictions, plus responsive Zen Green presentation across Desktop, Tablet, and Mobile viewports.

## 5. UI Specification Summary (`/organizer/events/[id]/registrations`)
* **Event Summary Header Card (`#FFFFFF` surface, `#EEF2F0` read-only summary badges):**
  * Displays `Event Code` (`EVT-YYYY-NNNN`), `Title`, `Skill Category`, `Skill Hours`, `Location`, `Start/End Time`, `Capacity`, `Registered Count`, and `Remaining Seats`, plus `"← Back to Event Details"` link.
* **Participant Roster List (`Desktop` Table / `Mobile` Stacked Cards):**
  * Columns: `Registration No.` (`REG-YYYY-NNNN`), `Participant Name`, `Email`, `Status` (`REGISTERED` pale-green badge), and `Registered Date/Time`.
  * **States:**
    * **Loading State:** Displays accessible loading indicator while roster data is being fetched.
    * **Empty State:** When `registrations.length === 0`, renders `"No participants have registered for this event yet."`.
    * **Forbidden (`403`) State:** When a non-owning `ORGANIZER` or `PARTICIPANT` navigates directly to `/organizer/events/[id]/registrations`, renders a clear `403 Access Denied` card without showing any event participant data.
    * **Safe API Failure State:** Renders error banner if the backend request fails unexpectedly.

## 6. Data Changes
* No additional tables required beyond `User`, `Session`, `Event`, and `Registration`. Uses indexed query on `Registration.eventId` (`@@index([eventId, status])`) ordered by `registeredAt ASC`.

## 7. REST API Contract

### 7.1 `GET /api/events/:id/registrations`
* **Auth:** Owning `ORGANIZER` only (`currentUser.role === 'ORGANIZER'` AND `event.organizerId === currentUser.id`).
* **Success (`200 OK`):**
  ```json
  {
    "data": {
      "event": {
        "id": "event-uuid",
        "eventCode": "EVT-2026-0001",
        "title": "Full-Stack TypeScript & Testing Workshop",
        "capacity": 20,
        "activeRegistrationsCount": 1,
        "remainingSeats": 19,
        "organizerId": "organizer1-uuid"
      },
      "registrations": [
        {
          "id": "reg-uuid",
          "registrationNumber": "REG-2026-0001",
          "eventId": "event-uuid",
          "status": "REGISTERED",
          "registeredAt": "2026-11-11T12:30:00.000Z",
          "participant": {
            "id": "student1-uuid",
            "name": "Kittipong Jaidee",
            "email": "student1@university.edu"
          }
        }
      ]
    }
  }
  ```
* **Errors:**
  * `401 Unauthorized` (`UNAUTHENTICATED`): Not logged in.
  * `403 Forbidden` (`FORBIDDEN_ROLE`): Authenticated user is a `PARTICIPANT`.
  * `403 Forbidden` (`FORBIDDEN_OWNERSHIP`): Authenticated user is an `ORGANIZER`, but `event.organizerId !== currentUser.id`.
  * `404 Not Found` (`NOT_FOUND`): Event `:id` does not exist.

---

## 8. Acceptance Criteria (Given–When–Then Format)

| AC ID | Given–When–Then Acceptance Criterion | Linked Reqs |
| :--- | :--- | :--- |
| **AC-16** | **Given** `Organizer 1` is authenticated and owns `Event 1`, **when** `Organizer 1` requests `GET /api/events/:event1Id/registrations` or opens `/organizer/events/[event1Id]/registrations`, **then** `200 OK` is returned and the UI displays the complete registration roster (`registrationNumber`, participant `name`, `email`, `status`, and `registeredAt`). | `FR-06`, `BR-04`, `BR-05` |
| **AC-17** | **Given** `Organizer 2` is authenticated and `Event 1` belongs to `Organizer 1`, **when** `Organizer 2` requests `GET /api/events/:event1Id/registrations` or opens `/organizer/events/[event1Id]/registrations`, **then** the backend rejects the request with `403 Forbidden` (`FORBIDDEN_OWNERSHIP`) and zero registration records are returned. | `BR-05`, `NFR-02` |
| **AC-18** | **Given** an authenticated `PARTICIPANT` account, **when** the participant requests `GET /api/events/:event1Id/registrations` or opens `/organizer/events/[event1Id]/registrations`, **then** the backend rejects the request with `403 Forbidden` (`FORBIDDEN_ROLE`) and zero registration records are returned. | `BR-04`, `BR-05`, `NFR-02` |
| **AC-19** | **Given** any Sprint 1 screen (`/login`, `/events`, `/events/new`, `/events/[id]`, `/my-registrations`, `/organizer/events/[id]/registrations`), **when** rendered in the browser, **then** all controls follow the Zen Green theme tokens (`#006B3C` header/primary actions, `#EEF2F0` read-only fields, `#FFFFFF` editable fields, red `*` required markers, inline field validation, and non-color status badges). | `NFR-05` |
| **AC-20** | **Given** Desktop ($\ge 992\text{ px}$), Tablet ($768\text{–}991\text{ px}$), and Mobile ($< 768\text{ px}$) viewports, **when** each Sprint 1 screen is inspected, **then** the layout adapts cleanly without clipped labels, overlapping controls, or unintended horizontal page scrolling. | `NFR-05` |

---

## 9. Planned Automated Tests (Software Test Specification for F-04 & Cross-Cutting UI)

| Test ID | Type ID & Level | Requirement / AC | What It Tests (Precondition & Action) | Expected Result | Automated Test File | Final Status |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **TEST-32** | `API-17` (API) | `AC-16`, `FR-06` | `organizer1` requests `GET /api/events/:event1Id/registrations` for owned Event 1 (with 1 registered participant and with 0 participants). | Returns `200 OK` with `student1`'s registration details (`REG-2026-NNNN`, `name`, `email`, `status: "REGISTERED"`). | `tests/api/organizer-roster.api.test.ts` | Planned |
| **TEST-33** | `API-18` (API - Ownership) | `AC-17`, `BR-05`, `NFR-02` | `organizer2` (non-owner `ORGANIZER`) requests `GET /api/events/:event1Id/registrations` (**TDD Target #4b**). | Rejects with `403 Forbidden` (`FORBIDDEN_OWNERSHIP`) and returns no participant roster data. | `tests/api/organizer-roster.api.test.ts` | Planned |
| **TEST-34** | `API-19` (API - Role) | `AC-18`, `BR-04`, `NFR-02` | `student1` (`PARTICIPANT`) requests `GET /api/events/:event1Id/registrations`. | Rejects with `403 Forbidden` (`FORBIDDEN_ROLE`) and returns no participant roster data. | `tests/api/organizer-roster.api.test.ts` | Planned |
| **TEST-35** | `UI-06` (UI) | `AC-16`, `AC-17` | `OrganizerRoster` component states: populated roster table, empty roster state (`"No participants..."`), and `403 Access Denied` state. | Renders participant rows accurately, shows empty state when `[]`, and displays `403` alert when forbidden. | `tests/ui/OrganizerRoster.test.tsx` | Planned |
| **TEST-36** | `UI-07` (UI Style) | `AC-19`, `NFR-05` | Zen Green UI style assertions across forms, badges, read-only vs. editable fields, and required field asterisks (`*`). | Verifies `#006B3C` primary styling, `#EEF2F0` read-only fields, red `*` markers, and text+color badges. | `tests/ui/ResponsiveAndTheme.test.tsx` | Planned |
| **TEST-37** | `E2E-06` (E2E) | `AC-16`, `AC-17`, `AC-18` | `organizer1` views owned Event 1 roster (`200`), then `organizer2` and `student1` attempt to open `/organizer/events/[event1Id]/registrations`. | `organizer1` sees `student1` on roster; `organizer2` and `student1` both receive `403 Access Denied`. | `e2e/sprint-1/auth-and-access.spec.ts` | Planned |
| **TEST-38** | `E2E-07` (E2E - Responsive) | `AC-19`, `AC-20`, `NFR-05` | Playwright multi-viewport check at Desktop (`1280x800`), Tablet (`820x1180`), and Mobile (`375x812`) across major Sprint 1 screens. | Zero horizontal overflow (`scrollWidth <= clientWidth`), visible controls, and clean responsive layout on all 3 viewports. | `e2e/sprint-1/responsive-and-states.spec.ts` | Planned |

---

## 10. Feature Definition of Done
- [ ] Cross-organizer ownership rejection test (`TEST-33` / `API-18`) written first (TDD Red $\rightarrow$ Green).
- [ ] `GET /api/events/:id/registrations` and `/organizer/events/[id]/registrations` implemented.
- [ ] Multi-viewport responsive and Zen Green theme tests (`TEST-36`, `TEST-38`) implemented and passing.
- [ ] All planned automated tests (`TEST-32`–`TEST-38`) passing.
- [ ] Peer-reviewed PR merged into `sprint1-staging` and integrated into `main`.
