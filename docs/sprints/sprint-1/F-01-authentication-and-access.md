# Feature Engineering Contract — F-01: Authentication, Session Lifecycle & Role-Based Access Control

**Sprint:** Sprint 1 (Issues #2 & #3 — `feature/2-foundation-prisma-seed`, `feature/3-f01-auth-and-rbac`)  
**Feature ID:** `F-01`  
**Linked Requirements:** `FR-01`, `BR-04`, `BR-05`, `NFR-01`, `NFR-02`, `NFR-04`, `NFR-05`  
**Dependencies:** None (Foundational feature for `F-02`, `F-03`, `F-04`)  
**Contract Version:** 1.1 (Pre-Implementation Specification — CPE 334 SDD/TDD Format)  
**Last Updated:** 2026-11-11  

---

## 1. Feature Goal
Establish a secure, server-authoritative authentication and role-based access control foundation using PostgreSQL-backed sessions (`HttpOnly` cookies) and `bcrypt` password hashing so that `PARTICIPANT` and `ORGANIZER` identities are verified on the backend for every protected screen and API endpoint.

## 2. Stakeholder Request Interpretation
Every user of the University Skill-Building Event Registration and Attendance System must sign in with a real account (`PARTICIPANT` or `ORGANIZER`). The application must hash passwords securely, manage session lifecycles on the server, show role-appropriate navigation in the Zen Green application shell, revoke access immediately upon logout, and reject unauthenticated or inactive-user requests on the backend.

## 3. Scope of F-01
* **Included:**
  * Health check endpoint (`GET /api/health`) verifying API and PostgreSQL readiness.
  * Email and password login (`POST /api/auth/login`) with `bcrypt` verification and `isActive` check.
  * PostgreSQL `Session` persistence and `HttpOnly` cookie management (`event_sys_session`).
  * Current authenticated user retrieval (`GET /api/auth/me`) and logout session destruction (`POST /api/auth/logout`).
  * Reusable server-side authorization guards (`requireAuth`, `requireRole`).
  * Zen Green `/login` screen and authenticated top navigation shell with role badge and logout button.
* **Explicitly Excluded:**
  * Self-registration, forgot-password email workflows, multi-factor authentication, and user administration CRUD screens.

## 4. Linked Functional Requirements and Business Rules
* **`FR-01`:** Authenticate valid seeded users, create a PostgreSQL-backed `HttpOnly` session, return current identity via `GET /api/auth/me`, and revoke the session on `POST /api/auth/logout`.
* **`BR-04`:** Server-derived identity (`currentUser` from session, never a client-supplied user ID or role) governs all operations. Only active users (`isActive === true`) with valid credentials may authenticate.
* **`BR-05`:** Backend guards reject unauthorized roles (`403 FORBIDDEN_ROLE`) and non-owners (`403 FORBIDDEN_OWNERSHIP`).
* **`NFR-01`:** Passwords hashed with `bcrypt` (cost $\ge 10$); `0` API responses expose `passwordHash`; unauthenticated protected requests return `401 Unauthorized`.

## 5. UI Specification Summary (`/login` & Application Shell)
* **Zen Green Styling:** Header bar `#006B3C`, primary button `#006B3C` (hover `#0B7A46`), page canvas `#F5F7F6`, card surface `#FFFFFF`.
* **`/login` Screen Controls & States:**
  * `Email Address *` (`type="email"`, editable `#FFFFFF` field) and `Password *` (`type="password"`, editable `#FFFFFF` field) with labels above controls and red asterisks (`*`).
  * **Validation State:** Empty email/password or invalid email format shows a dark red (`#B91C1C`) message immediately below the field without clearing the entered email.
  * **Busy State:** Clicking `"Sign In"` disables the button and displays `"Signing in..."` while the request is in flight.
  * **Failure State (`401` / `403` / `500`):** Displays an accessible alert banner (`role="alert"`) while preserving the entered email address.
* **Authenticated Application Shell (Navbar):**
  * Displays brand title (`"UniSkill Events"`), role-specific navigation links (`Browse Events`, `My Registrations` for `PARTICIPANT`; `Browse Events`, `Create Event` for `ORGANIZER`), current user's full name, role badge (`PARTICIPANT` or `ORGANIZER`), and `"Log Out"` button.

## 6. Data Changes
* **Models Introduced:** `User` (`users` table) and `Session` (`sessions` table) as defined in [`docs/system-sds.md`](../../system-sds.md).
* **Seed Data (`prisma/seed.ts`):** Idempotently seeds 2 active `ORGANIZER` users (`organizer1@university.edu`, `organizer2@university.edu`), 3 active `PARTICIPANT` users (`student1@university.edu`, `student2@university.edu`, `student3@university.edu`), and 1 inactive `PARTICIPANT` user (`inactive@university.edu`, `isActive: false`).

## 7. REST API Contract

### 7.1 `GET /api/health`
* **Auth:** Public (`ANONYMOUS`)
* **Response (`200 OK`):** `{ "status": "ok", "service": "University Skill Events API", "database": "connected" }`

### 7.2 `POST /api/auth/login`
* **Auth:** Public (`ANONYMOUS`)
* **Request Body:** `{ "email": "organizer1@university.edu", "password": "Password123!" }`
* **Success (`200 OK`):** Sets `Set-Cookie: event_sys_session=<token>; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`
  ```json
  {
    "data": {
      "user": {
        "id": "uuid",
        "email": "organizer1@university.edu",
        "name": "Dr. Somchai Wattana",
        "role": "ORGANIZER"
      }
    }
  }
  ```
* **Errors:**
  * `400 Bad Request` (`VALIDATION_ERROR`): Missing or malformed `email` or `password`.
  * `401 Unauthorized` (`INVALID_CREDENTIALS`): Unknown email or wrong password.
  * `403 Forbidden` (`ACCOUNT_INACTIVE`): User account has `isActive === false`.

### 7.3 `GET /api/auth/me`
* **Auth:** Authenticated (`PARTICIPANT` or `ORGANIZER`)
* **Success (`200 OK`):** `{ "data": { "user": { "id": "uuid", "email": "...", "name": "...", "role": "PARTICIPANT" } } }`
* **Error:** `401 Unauthorized` (`UNAUTHENTICATED`) when session cookie is missing, invalid, or expired.

### 7.4 `POST /api/auth/logout`
* **Auth:** Authenticated (`PARTICIPANT` or `ORGANIZER`)
* **Success (`200 OK`):** Deletes `Session` row in PostgreSQL, clears cookie (`Max-Age=0`), and returns `{ "data": { "message": "Logged out successfully." } }`.
* **Error:** `401 Unauthorized` (`UNAUTHENTICATED`).

---

## 8. Acceptance Criteria (Given–When–Then Format)

| AC ID | Given–When–Then Acceptance Criterion | Linked Reqs |
| :--- | :--- | :--- |
| **AC-01** | **Given** an active seeded `ORGANIZER` or `PARTICIPANT` account, **when** the user submits valid credentials to `POST /api/auth/login`, **then** a `Session` record is saved in PostgreSQL, an `HttpOnly` session cookie is set, and `200 OK` is returned with `{ id, email, name, role }` and without `passwordHash`. | `FR-01`, `NFR-01`, `NFR-04` |
| **AC-02** | **Given** an invalid password, unknown email, inactive account (`isActive = false`), or empty required field, **when** a login request is submitted to `POST /api/auth/login`, **then** the request is rejected with `401 Unauthorized` (`403` for inactive, `400` for empty fields), no `Session` row is created, and the UI displays a clear error message while preserving the entered email. | `FR-01`, `BR-04`, `NFR-01` |
| **AC-03** | **Given** a client request to `GET /api/auth/me` or any protected endpoint, **when** a valid active session cookie is present **then** `200 OK` is returned with the authenticated user's profile; **when** no valid session cookie is present **then** `401 Unauthorized` is returned without exposing private data. | `FR-01`, `NFR-01` |
| **AC-04** | **Given** an authenticated user with an active session, **when** the user invokes `POST /api/auth/logout`, **then** the `Session` record is deleted from PostgreSQL, the session cookie is cleared, and any subsequent request replaying that session token is rejected with `401 Unauthorized`. | `FR-01`, `NFR-01` |
| **AC-05** | **Given** user records persisted in PostgreSQL, **when** user credentials are created or inspected in the database, **then** every `passwordHash` is stored as a valid `bcrypt` hash (`$2a$` / `$2b$`, cost $\ge 10$) and never in plaintext. | `NFR-01` |

---

## 9. Planned Automated Tests (Software Test Specification for F-01)

| Test ID | Type ID & Level | Requirement / AC | What It Tests (Precondition & Action) | Expected Result | Automated Test File | Final Status |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **TEST-01** | `UNIT-01` (Unit) | `AC-05`, `NFR-01` | Password hashing & verification helper and seeded DB password format check. | Hash matches `/^\$2[ab]\$10\$/`, never equals plaintext, and verifies via `bcrypt.compare`. | `tests/unit/password-and-auth.unit.test.ts` | Planned |
| **TEST-02** | `API-01` (API) | `NFR-04` | Health check endpoint `GET /api/health` with PostgreSQL connected. | Returns `200 OK` (`< 500 ms`) with `{ status: "ok", database: "connected" }`. | `tests/api/health.api.test.ts` | Planned |
| **TEST-03** | `API-02` (API) | `AC-01`, `NFR-01`, `NFR-04` | Valid login for `organizer1@university.edu` and `student1@university.edu`. | Returns `200 OK` (`< 500 ms`), sets `HttpOnly` cookie, persists DB `Session`, omits `passwordHash`. | `tests/api/auth.api.test.ts` | Planned |
| **TEST-04** | `API-03` (API) | `AC-02`, `NFR-01` | Invalid login (wrong password, unknown email, empty fields, and `inactive@university.edu`). | Rejects with `401` / `400` / `403`; zero `Session` rows created in PostgreSQL. | `tests/api/auth.api.test.ts` | Planned |
| **TEST-05** | `API-04` (API) | `AC-03`, `NFR-01` | `GET /api/auth/me` with valid session cookie vs. missing/invalid/expired token. | Valid cookie returns `200 OK` with user identity; missing/invalid token returns `401 Unauthorized`. | `tests/api/auth.api.test.ts` | Planned |
| **TEST-06** | `API-05` (API) | `AC-04`, `NFR-01` | `POST /api/auth/logout` followed by replay of old session token on `GET /api/auth/me`. | Logout returns `200 OK` and deletes DB `Session`; replayed token returns `401 Unauthorized`. | `tests/api/auth.api.test.ts` | Planned |
| **TEST-07** | `UI-01` (UI) | `AC-01`, `AC-02` | Login form component rendering, required asterisks (`*`), busy state (`"Signing in..."`), and field error placement. | Labels and red asterisks render; submit button disables while busy; validation error appears below field. | `tests/ui/Login.test.tsx` | Planned |
| **TEST-08** | `UI-02` (UI) | `AC-02` | Login failure preserves entered email address and displays accessible alert banner. | On `401` response, alert banner is shown and email input retains the user's typed address. | `tests/ui/Login.test.tsx` | Planned |
| **TEST-09** | `E2E-01` (E2E) | `AC-01`, `AC-04` | Complete browser login $\rightarrow$ role navbar display $\rightarrow$ logout $\rightarrow$ protected route redirect flow. | User logs in, sees name & role badge in Zen Green navbar, logs out, and is redirected to `/login`. | `e2e/sprint-1/auth-and-access.spec.ts` | Planned |

---

## 10. Feature Definition of Done
- [ ] `User` and `Session` models migrated to PostgreSQL; idempotent `prisma/seed.ts` populates active and inactive demo users.
- [ ] `GET /api/health`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`, and `/login` UI implemented per contract.
- [ ] All planned automated tests (`TEST-01`–`TEST-09`) implemented in their specified test files and passing.
- [ ] Peer-reviewed PR merged into `sprint1-staging`.
