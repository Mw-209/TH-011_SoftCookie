# System-Level Software Design Specification (System-Level SDS)

**Course:** CPE 334 — Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Project Theme:** Theme 3 — Event Registration and Attendance System (University Skill-Building Context)  
**Team Name:** TH-011_SoftCookie  
**Document Version:** 1.1 (Engineering Baseline — Aligned with CPE 334 SDD/TDD Conventions)  
**Last Updated:** 2026-11-11  

---

## 1. Architecture and Technology Stack

### 1.1 Architectural Style: Three-Layer Modular Monolith
The system uses a **Three-Layer Modular Monolith** architecture (`React/Next.js UI` $\rightarrow$ `Next.js REST API & Domain Service Layer` $\rightarrow$ `Prisma ORM & PostgreSQL DB`). This provides a real full-stack workflow with durable relational persistence, clean separation between HTTP transport and domain business rules (`BR-01`–`BR-10`), and single-container Docker packaging for GCP deployment in Lab 5.

```mermaid
flowchart TB
    subgraph Client["Presentation Layer (Browser — Desktop / Tablet / Mobile)"]
        UI["Next.js React UI Pages & Zen Green Components<br/>(TypeScript + Tailwind CSS)"]
    end

    subgraph Server["Application & API Layer (Next.js Node.js Runtime)"]
        API["REST API Route Handlers (/api/*)<br/>Input Trimming, Validation & Safe Error Mapping"]
        AUTH["Auth & Authorization Guard Layer<br/>(Session Verification, Role & Ownership Checks)"]
        DOM["Domain Service Layer<br/>(AuthService, EventService, RegistrationService)<br/>Enforces Business Rules BR-01 to BR-10"]
        DAL["Data Access Layer (Prisma Client)<br/>Interactive ACID Transactions & Row Locking"]
    end

    subgraph DB["Persistence Layer (PostgreSQL 16)"]
        PG[("PostgreSQL Database<br/>Tables: users, sessions, events, registrations<br/>Unique, FK & Index Constraints")]
    end

    UI <-->|"HTTPS JSON Fetch + HttpOnly Session Cookie"| API
    API --> AUTH
    AUTH --> DOM
    DOM --> DAL
    DAL <-->|"TCP / Prisma SQL Queries & Transactions"| PG
```

### 1.2 Selected Technology Stack and Justification

| Area | Selected Technology | Engineering Justification & Responsibilities |
| :--- | :--- | :--- |
| **Frontend / UI** | **Next.js (App Router), React 19, TypeScript, Tailwind CSS** | Delivers responsive layouts (`Desktop >= 992px`, `Tablet 768–991px`, `Mobile < 768px`), reusable Zen Green components, distinct editable vs. read-only fields, and field-level validation feedback. |
| **Backend / API & Domain Layer** | **Next.js REST Route Handlers (`src/app/api/**/route.ts`) + Domain Services (`src/services/*.ts`)** | Separates HTTP request/response handling from pure domain logic so business rules (`BR-01`–`BR-10`) can be unit-tested in isolation and integration-tested end-to-end. |
| **Database & ORM** | **PostgreSQL 16 + Prisma ORM (`prisma migrate` & `prisma db seed`)** | Provides relational constraints, foreign keys, composite uniqueness, and row-level locking (`SELECT ... FOR UPDATE`) inside interactive transactions (`NFR-03`). |
| **Authentication & Security** | **PostgreSQL-backed Sessions (`sessions` table) + `HttpOnly` Cookies + `bcryptjs`** | Hashes passwords with `bcrypt` (`cost = 10`) and validates server-side session tokens on every request, ensuring immediate revocation on logout (`FR-01`, `NFR-01`). |
| **Automated Testing** | **Vitest (Unit, API/Integration, UI Component) + Playwright (E2E & Multi-Viewport)** | Covers all four required test levels: Unit, API/Database Integration, UI Component/Style, and End-to-End browser journeys across Desktop, Tablet, and Mobile viewports. |
| **Containerization & Cloud** | **Docker (`Dockerfile`, `docker-compose.yml`) + GCP Cloud Run & Cloud SQL** | Packages the application and database configuration reproducibly with externalized environment variables (`.env.example`), ready for Lab 5 CI/CD and GCP deployment (`NFR-05`). |

---

## 2. Database Design, Schema, Constraints, and Justifications

### 2.1 Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o{ SESSION : "authenticates via (userId)"
    USER ||--o{ EVENT : "owns / organizes (organizerId)"
    USER ||--o{ REGISTRATION : "submits / owns (participantId)"
    EVENT ||--o{ REGISTRATION : "receives (eventId)"

    USER {
        string id PK "UUID"
        string email UK "Unique lowercase university email"
        string name "Full display name"
        string passwordHash "bcrypt hash (cost >= 10)"
        enum role "PARTICIPANT | ORGANIZER"
        boolean isActive "Default true"
        datetime createdAt
        datetime updatedAt
    }

    SESSION {
        string id PK "UUID"
        string token UK "Cryptographic 256-bit hex token"
        string userId FK "References USER(id) ON DELETE CASCADE"
        datetime expiresAt "Session expiration timestamp"
        datetime createdAt
    }

    EVENT {
        string id PK "UUID"
        string eventCode UK "Official read-only code (EVT-YYYY-NNNN)"
        string title "Trimmed string (5..120 chars)"
        string description "Trimmed string (10..2000 chars)"
        enum skillCategory "TECHNICAL | DATA_AI | COMMUNICATION | CAREER"
        int skillHours "Positive integer (1..40)"
        string location "Campus building / room (3..150 chars)"
        datetime startAt "Event start timestamp"
        datetime endAt "Event end timestamp (> startAt)"
        datetime registrationDeadline "Cutoff timestamp (<= startAt)"
        int capacity "Positive integer (1..1000)"
        string organizerId FK "References USER(id) — Ownership link"
        datetime createdAt
        datetime updatedAt
    }

    REGISTRATION {
        string id PK "UUID"
        string registrationNumber UK "Official read-only code (REG-YYYY-NNNN)"
        string eventId FK "References EVENT(id) ON DELETE CASCADE"
        string participantId FK "References USER(id) ON DELETE CASCADE — Ownership link"
        enum status "REGISTERED | CANCELLED | ATTENDED"
        datetime registeredAt "Timestamp of registration / re-registration"
        datetime cancelledAt "Nullable timestamp when cancelled"
        datetime checkedInAt "Nullable timestamp when checked in"
        datetime updatedAt
    }
```

### 2.2 Complete Prisma Schema Specification (`prisma/schema.prisma`)

```prisma
enum Role {
  PARTICIPANT
  ORGANIZER
}

enum SkillCategory {
  TECHNICAL
  DATA_AI
  COMMUNICATION
  CAREER
}

enum RegistrationStatus {
  REGISTERED
  CANCELLED
  ATTENDED
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String
  passwordHash  String
  role          Role
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  sessions      Session[]
  organizedEvents Event[]      @relation("EventOrganizer")
  registrations Registration[] @relation("ParticipantRegistrations")

  @@index([role, isActive])
  @@map("users")
}

model Session {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}

model Event {
  id                   String         @id @default(uuid())
  eventCode            String         @unique
  title                String
  description          String
  skillCategory        SkillCategory
  skillHours           Int
  location             String
  startAt              DateTime
  endAt                DateTime
  registrationDeadline DateTime
  capacity             Int
  organizerId          String
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
  organizer            User           @relation("EventOrganizer", fields: [organizerId], references: [id], onDelete: Restrict)
  registrations        Registration[]

  @@index([organizerId])
  @@index([skillCategory, startAt])
  @@index([startAt])
  @@map("events")
}

model Registration {
  id                 String             @id @default(uuid())
  registrationNumber String             @unique
  eventId            String
  participantId      String
  status             RegistrationStatus @default(REGISTERED)
  registeredAt       DateTime           @default(now())
  cancelledAt        DateTime?
  checkedInAt        DateTime?
  updatedAt          DateTime           @updatedAt
  event              Event              @relation(fields: [eventId], references: [id], onDelete: Cascade)
  participant        User               @relation("ParticipantRegistrations", fields: [participantId], references: [id], onDelete: Cascade)

  @@unique([eventId, participantId])
  @@index([participantId, registeredAt])
  @@index([eventId, status])
  @@map("registrations")
}
```

### 2.3 Required Indexes, Constraints, and Justified Database Design Decisions

* **Unique Constraints:**
  * `User.email` (`@unique`): Prevents duplicate user accounts.
  * `Session.token` (`@unique`): Provides $O(1)$ B-tree lookup on every authenticated HTTP request.
  * `Event.eventCode` (`@unique`) & `Registration.registrationNumber` (`@unique`): Guarantees uniqueness of human-readable reference numbers (`EVT-YYYY-NNNN`, `REG-YYYY-NNNN`).
  * `Registration(eventId, participantId)` (`@@unique([eventId, participantId])`): Enforces at the database level that a participant can never hold two rows for the same event (`BR-03`).
* **Justified Indexes for Frequent Queries, Filtering, and Sorting:**
  1. `@@index([skillCategory, startAt])` and `@@index([startAt])` on `Event`: Accelerates the Event Discovery catalog (`GET /api/events`) which sorts by `startAt ASC` and filters by `skillCategory`.
  2. `@@index([organizerId])` on `Event`: Accelerates organizer ownership lookups and organizer event filtering.
  3. `@@index([eventId, status])` on `Registration`: Accelerates counting active registrations (`status IN ('REGISTERED', 'ATTENDED')`) during capacity checks (`BR-02`) and attendance reporting (`BR-10`).
  4. `@@index([participantId, registeredAt])` on `Registration`: Accelerates `My Registrations` (`GET /api/registrations/my`) sorted by `registeredAt DESC`.
* **Justified Database Design Decisions:**
  1. **Decision DB-01 (Composite Unique Constraint + State Transition for Re-Registration):** Instead of allowing multiple historical rows per `(eventId, participantId)`—which would require partial unique indexes to prevent concurrent duplicate inserts—we enforce `@@unique([eventId, participantId])`. When a participant cancels in Sprint 2 (`status = 'CANCELLED'`) and later re-registers (`BR-08`), the existing row is transitioned back to `REGISTERED` with a fresh `registeredAt` timestamp inside a capacity-checked transaction.
  2. **Decision DB-02 (Pessimistic Row Locking `SELECT ... FOR UPDATE` on `Event`):** Checking `COUNT(*) < event.capacity` in application memory without locking is vulnerable to race conditions when two participants request the last seat simultaneously. By locking the parent `Event` row via `SELECT id, capacity FROM events WHERE id = $1 FOR UPDATE` inside `prisma.$transaction`, competing registration transactions serialize cleanly on the target event without blocking unrelated events (`BR-02`, `NFR-03`).
  3. **Decision DB-03 (PostgreSQL-Backed `Session` Table Instead of Stateless JWTs):** Storing sessions in PostgreSQL (`sessions` table) guarantees that `POST /api/auth/logout` immediately revokes access on the backend (`AC-04`), which stateless JWTs cannot do without a server-side denylist.

### 2.4 Idempotent Seed Data Specification (`prisma/seed.ts`)
Running `npx prisma db seed` uses `upsert` on unique keys (`email`, `eventCode`, `registrationNumber`) so it is 100% safe to run repeatedly without creating duplicates:
* **Seeded Users (All active demo accounts use password `Password123!` hashed with `bcrypt` cost 10):**
  1. `organizer1@university.edu` — `Dr. Somchai Wattana` (`role: ORGANIZER`, `isActive: true`)
  2. `organizer2@university.edu` — `Prof. Nida Srisuk` (`role: ORGANIZER`, `isActive: true`)
  3. `student1@university.edu` — `Kittipong Jaidee` (`role: PARTICIPANT`, `isActive: true`)
  4. `student2@university.edu` — `Pimchanok Lert` (`role: PARTICIPANT`, `isActive: true`)
  5. `student3@university.edu` — `Thanawat Suk` (`role: PARTICIPANT`, `isActive: true`)
  6. `inactive@university.edu` — `Former Student` (`role: PARTICIPANT`, `isActive: false` — used to verify inactive account login rejection)
* **Seeded Skill-Building Events:**
  1. `EVT-2026-0001`: *"Full-Stack TypeScript & Testing Workshop"* (`skillCategory: TECHNICAL`, `skillHours: 3`, `capacity: 20`, owned by `organizer1@university.edu`)
  2. `EVT-2026-0002`: *"AI Agent Engineering Hands-On Lab"* (`skillCategory: DATA_AI`, `skillHours: 4`, `capacity: 1`, owned by `organizer1@university.edu` — boundary 1-seat event for last-seat & full-capacity testing)
  3. `EVT-2026-0003`: *"Academic Leadership & Communication Seminar"* (`skillCategory: COMMUNICATION`, `skillHours: 2`, `capacity: 15`, owned by `organizer2@university.edu` — used for cross-organizer ownership isolation testing)

---

## 3. Zen Green UI Specification, Component Rules, and Responsive Behavior

To maintain visual consistency across all sprints and labs (following the CPE 334 **Zen Green Theme** specification), all screens adhere to the following design system:

### 3.1 Color Tokens and Intended Usage

| Token / Element | Required Hex / Style | Intended Usage |
| :--- | :--- | :--- |
| **Primary Green** | `#006B3C` | Top application header bar, primary action buttons (`Sign In`, `Publish Event`, `Register Now`), and strong emphasis. |
| **Secondary Green** | `#0B7A46` | Active navigation tabs, focus rings, interactive links, and primary button hover states. |
| **Pale Green** | `#EAF6EF` | Selected cards, success banners, `REGISTERED` / `ATTENDED` badges, and subtle section headers. |
| **Page Background** | `#F5F7F6` | Quiet near-white page canvas background across all screens. |
| **Surface / Cards** | `#FFFFFF` | Event cards, form containers, and roster tables with subtle border (`#D1DDD7`) and restrained shadow. |
| **Primary Text** | `#1C2B24` | Dark charcoal-green text for comfortable reading contrast. |
| **Editable Field** | `#FFFFFF` bg + `#B8C9BF` border | User-editable `<input>`, `<select>`, and `<textarea>` controls with visible `#0B7A46` focus outline. |
| **Read-Only Field** | `#EEF2F0` bg + `#D1DDD7` border | Soft gray-green shading for system-generated/read-only values (`Event Code`, `Registration Number`, `Organizer`, `Remaining Seats`). |
| **Error State** | `#B91C1C` text & border + `#FEF2F2` bg | Field-level validation messages placed immediately below the invalid field, plus API failure banners. |
| **Warning / Full Badge** | `#B45309` text + `#FEF3C7` bg | `Event Full (0 seats)` badge, `CANCELLED` badge, or deadline warning callouts. |
| **Success State** | `#065F46` text + `#EAF6EF` bg | Confirmation banner with icon + text (never relying on color alone) displaying generated `eventCode` or `registrationNumber`. |

### 3.2 Reusable Component and Accessibility Rules
1. **Labels and Required Markers:** Every form control has an explicit `<label htmlFor="...">` above the input. Required fields display a red asterisk (`*`) with `aria-hidden="true"`, while the input carries `required` / `aria-required="true"`.
2. **Field-Level Validation Placement:** Validation errors appear **immediately below the associated field** with `role="alert"` and dark red styling (`#B91C1C`), not only as a generic banner at the top.
3. **Busy / Disabled Submit Protection:** While any API request is in flight (`isSubmitting === true`), the submit button is disabled (`disabled`) and displays busy text (e.g., `"Signing in..."`, `"Publishing..."`, `"Registering..."`) to prevent duplicate submissions.
4. **Form Data Preservation on Failure:** If validation fails or the backend returns `400`/`409`/`500`, user-entered form values remain intact so the user can correct and resubmit without retyping.
5. **Non-Color Status Cues:** Status and role badges (`PARTICIPANT`, `ORGANIZER`, `REGISTERED`, `CANCELLED`, `ATTENDED`, `OPEN`, `FULL`) always include explicit text labels alongside color tokens.

### 3.3 Application Navigation and Screen Modes

| Screen / Route | Mode | Permitted Roles | Key UI States Covered |
| :--- | :--- | :--- | :--- |
| `/login` | Auth Form | `ANONYMOUS` | Initial, Field Validation Error, Submitting (Busy), Invalid Credentials (`401`), Safe API Failure. |
| `/events` | List / Catalog View | `PARTICIPANT`, `ORGANIZER` | Loading skeleton, Populated Event Cards/Grid, Empty Catalog State, Search/Filter No-Results State (Sprint 3), Safe API Failure. |
| `/events/new` | Create Mode | `ORGANIZER` (`403` for `PARTICIPANT`) | Initial (with read-only preview of `Organizer` & auto `Event Code`), Field Validation Error, Submitting (Busy), Success Redirect, Forbidden (`403`) View. |
| `/events/[id]` | Detail View + Action Mode | `PARTICIPANT`, `ORGANIZER` | Loading, Read-Only Event Metadata (`eventCode`, `organizer`, `skillCategory`, `skillHours`, `remainingSeats / capacity`), Participant `"Register Now"` / `"Already Registered"` / `"Event Full"` states, Conflict Error Banner (`409`), Owning Organizer `"View Roster"` link. |
| `/my-registrations` | List View | `PARTICIPANT` (`403` for `ORGANIZER`) | Loading, Populated Registration Table/Cards (`registrationNumber`, `eventCode`, `title`, `status`, `registeredAt`), Empty State (`"You have not registered for any events yet."`), Safe API Failure. |
| `/organizer/events/[id]/registrations` | Roster / Manage Mode | Owning `ORGANIZER` (`403` for non-owner or `PARTICIPANT`) | Loading, Event Summary Header, Participant Roster Table (`registrationNumber`, `name`, `email`, `status`, `registeredAt`), Empty Roster State, Forbidden (`403`) View. |

### 3.4 Responsive Viewport Requirements

| Viewport Tier | Width Range | Required Responsive Layout Behavior |
| :--- | :--- | :--- |
| **Desktop** | $\ge 992\text{ px}$ | Centered container (`max-width: 1200px`), horizontal top navigation bar, 2-to-3 column event catalog grid, 2-column form grid on Create Event, full tabular views for `My Registrations` and `Organizer Roster`. |
| **Tablet** | $768\text{–}991\text{ px}$ | 2-column event card grid, 2-column compact form layout where practical (`title` and `description` span full width), scrollable or compact table with no clipped text. |
| **Mobile** | $< 768\text{ px}$ | Single-column vertical stack for all form fields and event cards, touch-friendly buttons (`min-height: 44px`), responsive mobile navigation menu, card-list representation for registrations, zero horizontal page overflow (`overflow-x: hidden` safe layout). |

---

## 4. REST API Contract and Authorization Matrix

### 4.1 API Endpoint Catalog

| Method & Path | Purpose | Auth & Role Required | Success Status | Error Statuses | Sprint |
| :--- | :--- | :--- | :---: | :--- | :---: |
| `GET /api/health` | System & PostgreSQL connectivity health check | Public (`ANONYMOUS`) | `200 OK` | `503 Service Unavailable` | Sprint 1 |
| `POST /api/auth/login` | Authenticate user credentials & set `HttpOnly` session cookie | Public (`ANONYMOUS`) | `200 OK` | `400`, `401`, `403` (inactive), `500` | Sprint 1 |
| `POST /api/auth/logout` | Revoke session in PostgreSQL & clear session cookie | Authenticated (`ANY`) | `200 OK` | `401`, `500` | Sprint 1 |
| `GET /api/auth/me` | Retrieve current authenticated user profile & role | Authenticated (`ANY`) | `200 OK` | `401`, `500` | Sprint 1 |
| `GET /api/events` | List published events with seat counts (and query filters in Sprint 3) | Authenticated (`PARTICIPANT`, `ORGANIZER`) | `200 OK` | `400`, `401`, `500` | Sprint 1 & 3 |
| `POST /api/events` | Create & publish a new skill-building event | `ORGANIZER` only | `201 Created` | `400`, `401`, `403`, `500` | Sprint 1 |
| `GET /api/events/:id` | Retrieve single event detail & current user's registration state | Authenticated (`PARTICIPANT`, `ORGANIZER`) | `200 OK` | `401`, `404`, `500` | Sprint 1 |
| `POST /api/events/:id/registrations` | Register current `PARTICIPANT` for event `:id` | `PARTICIPANT` only | `201 Created` | `401`, `403`, `404`, `409`, `500` | Sprint 1 |
| `GET /api/registrations/my` | Retrieve current `PARTICIPANT`'s own registrations | `PARTICIPANT` only | `200 OK` | `401`, `403`, `500` | Sprint 1 |
| `GET /api/registrations/:id` | Retrieve one owned registration detail | Owning `PARTICIPANT` only | `200 OK` | `401`, `403`, `404`, `500` | Sprint 1 |
| `GET /api/events/:id/registrations` | Retrieve participant registration roster for owned event `:id` | Owning `ORGANIZER` only | `200 OK` | `401`, `403`, `404`, `500` | Sprint 1 |
| `PATCH /api/events/:id` | Update event `capacity` and `registrationDeadline` | Owning `ORGANIZER` only | `200 OK` | `400`, `401`, `403`, `404`, `409`, `500` | Sprint 2 |
| `POST /api/registrations/:id/cancel` | Cancel owned `REGISTERED` registration before deadline | Owning `PARTICIPANT` only | `200 OK` | `401`, `403`, `404`, `409`, `500` | Sprint 2 |
| `POST /api/events/:id/registrations/:regId/check-in` | Mark participant registration as `ATTENDED` | Owning `ORGANIZER` only | `200 OK` | `401`, `403`, `404`, `409`, `500` | Sprint 2 |
| `GET /api/events/:id/summary` | Retrieve authoritative attendance summary metrics | Owning `ORGANIZER` only | `200 OK` | `401`, `403`, `404`, `500` | Sprint 3 |

### 4.2 Role and Ownership Authorization Matrix

> **Mandatory Backend Rule:** Hiding or disabling UI controls is usability feedback only and is **not** authorization. Every protected endpoint validates session authentication (`401`), role permission (`403 FORBIDDEN_ROLE`), and record ownership (`403 FORBIDDEN_OWNERSHIP`) on the server before returning or mutating data.

| Operation / Endpoint | `ANONYMOUS` | `PARTICIPANT` (Owner of Reg) | `PARTICIPANT` (Other User's Reg) | `ORGANIZER` (Owner of Event) | `ORGANIZER` (Other Organizer's Event) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `GET /api/health` | `200 OK` | `200 OK` | `200 OK` | `200 OK` | `200 OK` |
| `POST /api/auth/login` | `200 OK` | `200 OK` | `200 OK` | `200 OK` | `200 OK` |
| `GET /api/auth/me` & `POST /api/auth/logout` | `401` | `200 OK` | `200 OK` | `200 OK` | `200 OK` |
| `GET /api/events` & `GET /api/events/:id` | `401` | `200 OK` | `200 OK` | `200 OK` | `200 OK` |
| `POST /api/events` (Create Event) | `401` | `403` | `403` | `201 Created` | `201 Created` (Becomes Owner) |
| `POST /api/events/:id/registrations` | `401` | `201` / `409` | N/A (Uses session ID) | `403` | `403` |
| `GET /api/registrations/my` | `401` | `200 OK` (Own only) | `200 OK` (Own only) | `403` | `403` |
| `GET /api/registrations/:id` | `401` | `200 OK` | **`403 Forbidden`** | `403` | `403` |
| `GET /api/events/:id/registrations` (Roster) | `401` | `403` | `403` | `200 OK` | **`403 Forbidden`** |
| `PATCH /api/events/:id` (Sprint 2) | `401` | `403` | `403` | `200` / `409` | **`403 Forbidden`** |
| `POST /api/registrations/:id/cancel` (Sprint 2) | `401` | `200` / `409` | **`403 Forbidden`** | `403` | `403` |
| `POST /api/events/:id/registrations/:regId/check-in` (Sprint 2) | `401` | `403` | `403` | `200` / `409` | **`403 Forbidden`** |
| `GET /api/events/:id/summary` (Sprint 3) | `401` | `403` | `403` | `200 OK` | **`403 Forbidden`** |

---

## 5. Configuration, Environment Variables, and Delivery Design

### 5.1 Environment Variables (`.env.example`)
Zero real secrets or credentials are committed to Git. `.gitignore` excludes `.env`, `node_modules/`, `.next/`, `coverage/`, and `playwright-report/`.

| Variable Name | `.env.example` Default | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/event_registration_db?schema=public` | PostgreSQL connection URL for Prisma. |
| `SESSION_COOKIE_NAME` | `event_sys_session` | Name of the `HttpOnly` session cookie. |
| `SESSION_TTL_HOURS` | `24` | Session expiration window in hours. |
| `NODE_ENV` | `development` | Runtime mode (`development`, `test`, `production`). |
| `PORT` | `3000` | Application HTTP listening port. |

### 5.2 Docker and Planned GCP Deployment Architecture
* **Local Containerization (`Dockerfile` & `docker-compose.yml`):**
  * `docker-compose.yml` provisions PostgreSQL 16 (`db` with persistent volume `pgdata`) and the Next.js application (`app`), enabling one-command local verification and container restart persistence tests.
* **Lab 5 CI/CD and GCP Deployment Plan:**
  * **GitHub Actions CI Quality Gate:** Runs `npx prisma validate`, `npm run build`, Vitest unit/API/UI tests, and Playwright E2E tests on every Pull Request into `sprint-staging` and `main`. A failing check blocks merging.
  * **GCP Cloud Run + Cloud SQL for PostgreSQL:** Accepted releases on `main` build a production Docker image pushed to **Google Artifact Registry** and deploy to **Google Cloud Run** connected to **Cloud SQL for PostgreSQL** with secrets managed via environment configuration.
