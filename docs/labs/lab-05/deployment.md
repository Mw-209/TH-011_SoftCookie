# Lab 5 — Deployment & Operations Guide (`SoftCookie Events`)

## 1. Tech Stack & Runtime Architecture

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS | Built into static assets (`client/dist`) and served by Express in production |
| Backend API | Node.js 20 + Express + TypeScript | Single-container production runtime on port `3000` (configurable via `PORT`) |
| ORM & Migrations | Prisma 5 (`prisma migrate deploy`) | Schema and SQL migrations in `server/prisma/` |
| Database | PostgreSQL 16 (`postgres:16-alpine` locally, Cloud SQL on GCP) | Persists users, sessions, events, and registrations (no in-memory/container-local state) |
| Containerization | Multi-stage `Dockerfile` (`node:20-alpine`) | Builds client, generates Prisma client, builds server, copies production runtime |
| CI / CD | GitHub Actions (`ci-docker.yml`, `deploy.yml`) | Automated test + Docker build gate on PRs; keyless WIF deploy from `main` |
| Cloud Hosting | Google Cloud Run + Cloud Run Jobs + Cloud SQL + Secret Manager | Shared course project `cpe-se-course-2026` (`asia-southeast1`) |

### Health & Readiness Endpoints
- `GET /api/health` — Liveness probe (`200 { "status": "ok" }`)
- `GET /api/ready` — Readiness probe verifying PostgreSQL connectivity (`200 { "status": "ready", "db": "connected" }`)

---

## 2. Environment Variables (No Committed Secrets)

All configuration and secrets are supplied through environment variables (locally via `.env` copied from `.env.example`, and on GCP via Cloud Run environment variables + Secret Manager). Real secrets are **never** committed to Git.

| Variable | Required | Secret? | Local Example (`.env.example`) | GCP Cloud Run / Job Source | Purpose |
|---|---|---|---|---|---|
| `DATABASE_URL` | Yes | **Yes** | `postgresql://postgres:postgres@localhost:5432/event_registration_db?schema=public` | Secret Manager: `s55fa7796-database-url:latest` | PostgreSQL connection string used by Prisma |
| `DEMO_USER_PASSWORD` | When `SEED_DEMO_DATA=true` | **Yes** | `change-me` *(placeholder rejected by seed script)* | Secret Manager: `s55fa7796-demo-password:latest` | Password hashed into seeded demo accounts (`organizer1@university.edu`, `student1@university.edu`, etc.) |
| `SEED_DEMO_DATA` | No (default `false`) | No | `true` | Migration job env var (`true` on `--demo`, else `false`) | Enables idempotent non-destructive demo data seeding |
| `SESSION_COOKIE_NAME` | No (default `event_sys_session`) | No | `event_sys_session` | Default in app | HTTP-only session cookie name (sessions stored in PostgreSQL) |
| `SESSION_TTL_HOURS` | No (default `24`) | No | `24` | Default in app | Session expiration window in hours |
| `CORS_ORIGIN` | Dev only | No | `http://localhost:5173` | Same-origin in production container | Allowed browser origin for CORS with credentials |
| `NODE_ENV` | Yes in prod | No | `development` | `production` | Enables SPA static serving and `Secure` session cookies |
| `PORT` | No (default `3000`) | No | `3000` | `3000` (injected by Cloud Run) | HTTP listen port |
| `TZ` | No | No | *(system default)* | `Asia/Bangkok` | Runtime timezone on Cloud Run |

---

## 3. Local Build, Test, Migrate, Seed & Docker Commands

### Clean-Clone Docker Verification (C-03)
```bash
git clone https://github.com/Mw-209/TH-011_SoftCookie.git softcookie-clean-test
cd softcookie-clean-test
cp .env.example .env
# Edit .env and replace DEMO_USER_PASSWORD="change-me" with a local test password
docker compose up --build -d
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run prisma:seed
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
```
To stop and clean up containers:
```bash
docker compose down
```

### Local Development & Test Commands (without Docker)
```bash
# Install dependencies
npm --prefix server ci
npm --prefix client ci

# Prisma generate, migrate, and seed (requires local PostgreSQL & .env)
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# Build server and client
npm run build

# Run automated tests
npm run test:server
npm run test:client
```

---

## 4. GCP Resources (Shared Course Project)

| Resource | Value |
|---|---|
| GCP Project ID | `cpe-se-course-2026` |
| Region | `asia-southeast1` |
| Team Prefix | `s55fa7796` |
| Cloud Run Service | `s55fa7796` |
| Cloud Run Migration Job | `s55fa7796-migrate` |
| Cloud SQL Instance | `s55fa7796-pg` (`cpe-se-course-2026:asia-southeast1:s55fa7796-pg`) |
| Database / DB User | `s55fa7796` |
| Artifact Registry Repo | `asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s55fa7796` |
| Runtime Service Account | `s55fa7796-runner@cpe-se-course-2026.iam.gserviceaccount.com` |
| Secret Manager Secrets | `s55fa7796-database-url`, `s55fa7796-admin-password`, `s55fa7796-demo-password` |
| Public Service URL | `https://s55fa7796-4d7hbszvwq-as.a.run.app` |

> **Important:** In the shared course project, infrastructure and IAM are pre-provisioned by the course portal. Never run `teardown.sh`, never modify project IAM, and use `--update-env-vars` (never `--set-env-vars`) when changing individual environment variables.

### Migration Job Secret Configuration
To enable the migration job (`s55fa7796-migrate`) to seed demo accounts with password hashing when `SEED_DEMO_DATA=true` (or when running `--demo`), the secret `s55fa7796-demo-password` is bound to the job environment variable `DEMO_USER_PASSWORD`:
```bash
gcloud run jobs update s55fa7796-migrate \
  --project=cpe-se-course-2026 \
  --region=asia-southeast1 \
  --update-secrets="DEMO_USER_PASSWORD=s55fa7796-demo-password:latest"
```

---

## 5. Repeatable Release Procedure & Automated CD Pipeline

### Release Workflow
1. Create a GitHub Issue labeled `lab5` describing the change.
2. Branch from `staging` (`git switch staging && git switch -c lab5/<issue>-<slug>`).
3. Push the feature branch and open a Pull Request into `staging`.
4. Ensure CI status check (`test-and-docker`) passes and a **teammate** reviews and approves the PR, then merge into `staging`.
5. Open a Release Pull Request from `staging` into `main`.
6. Once `main` required status check (`test-and-docker`) passes and a teammate approves the release PR, merge into `main`.
7. `.github/workflows/deploy.yml` (**`Deploy to Google Cloud`**) triggers automatically on push to `main` (or via manual `workflow_dispatch`):
   - **Check settings & Dockerfile:** Validates GitHub Environment `demo` variables (`GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`) and verifies that `Dockerfile` exists at repository root.
   - **Keyless GCP Sign-in (WIF):** Authenticates via Workload Identity Federation using `google-github-actions/auth` and the `demo` environment. No long-lived service account JSON keys are stored in GitHub.
   - **Build & Push Image:** Configures Docker auth for Artifact Registry, builds the multi-stage image, tags it with the 40-character commit SHA (`$REGION-docker.pkg.dev/$PROJECT_ID/$AR_REPOSITORY/$IMAGE_NAME:$GITHUB_SHA`), and pushes to Artifact Registry.
   - **Database Migration (`s55fa7796-migrate`):** If `MIGRATE_COMMAND` is set, updates the Cloud Run job to use the new commit SHA image, executes the migration job, and waits for completion.
   - **Cloud Run Deployment (`s55fa7796`):** Deploys the new image to Cloud Run service `s55fa7796` with configurable `--port` (`$APP_PORT`).

### How to Check Which Commit Is Currently Running on GCP
1. **Inspect Cloud Run active revision and container image:**
   ```bash
   gcloud run services describe s55fa7796 \
     --project=cpe-se-course-2026 \
     --region=asia-southeast1 \
     --format='table(status.latestReadyRevisionName, spec.template.spec.containers[0].image)'
   ```
2. **Cross-check image tag in Artifact Registry (tagged by full 40-character Git commit SHA):**
   ```bash
   gcloud artifacts docker images list \
     asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s55fa7796/s55fa7796 \
     --include-tags \
     --project=cpe-se-course-2026
   ```
3. **Verify directly in GitHub Actions:**
   Open GitHub -> **Actions** -> click the latest run of **`Deploy to Google Cloud`** -> inspect the `Build and push the image` and `Deploy to Cloud Run` step logs to confirm the deployed `$GITHUB_SHA`.

---

## 6. Rollback Procedures (C-06)

In production on Cloud Run, rollback can be achieved through two distinct mechanisms:

### Method 1: Instant Zero-Rebuild Traffic Rollback via Cloud Run (Recommended for Emergency Triage)
Cloud Run preserves every deployed revision immutably. In case of regression or deployment defect, traffic can be redirected instantly (sub-second) back to a previously verified healthy revision without waiting for a rebuild:
```bash
# 1. List recent healthy revisions
gcloud run revisions list \
  --service=s55fa7796 \
  --project=cpe-se-course-2026 \
  --region=asia-southeast1 \
  --format="table(name, active, creationTimestamp)"

# 2. Route 100% of live traffic immediately to the target healthy revision
gcloud run services update-traffic s55fa7796 \
  --project=cpe-se-course-2026 \
  --region=asia-southeast1 \
  --to-revisions=<PREVIOUS_REVISION_NAME>=100
```
*(Alternatively, in the Google Cloud Console UI: go to Cloud Run -> Service `s55fa7796` -> **Revisions** tab -> **Manage Traffic** -> assign 100% traffic to the desired revision).*

### Method 2: Git-Flow Rollback (Ensures Code Repository & Cloud Sync)
To maintain strict synchronization between `main` branch history and the deployed production workload:
1. Revert the problematic commit on a branch from `staging` (`git revert <COMMIT_SHA>`).
2. Open a PR into `staging`, pass CI and peer review, and merge.
3. Open a Release PR from `staging` to `main`, pass CI and peer review, and merge into `main`.
4. GitHub Actions `Deploy to Google Cloud` automatically builds and deploys the clean revert commit.

---

## 7. Data Persistence Verification Across Restart & Redeploy (C-05)

### Persistence Architecture
Application state (users, sessions, events, registrations) is externalized to Cloud SQL PostgreSQL 16 (`s55fa7796-pg`). Containers are strictly stateless: no SQLite file, local filesystem store, or in-memory array is used for persistent state.

### Verification Steps
1. **Initial State (Before):**
   - Log in to the live production URL (`https://s55fa7796-4d7hbszvwq-as.a.run.app`) as an organizer (`organizer1@university.edu`).
   - Create a test event (e.g. `Persistence Verification Event`).
   - Capture screenshot **Before** showing the created event and browser address bar.
2. **Container Restart / Redeploy:**
   - **Restart via revision trigger:**
     ```bash
     gcloud run services update s55fa7796 \
       --region=asia-southeast1 \
       --project=cpe-se-course-2026 \
       --update-env-vars=RESTART_MARK=1
     ```
     Updating an environment variable forces Cloud Run to deploy a fresh revision and terminate old container instances.
   - **Redeploy via CI/CD:** Re-run the `Deploy to Google Cloud` workflow on GitHub Actions or merge a subsequent release.
3. **Verification (After — C-05 Evidence):**
   - Refresh the live URL `https://s55fa7796-4d7hbszvwq-as.a.run.app`.
   - Verify that the created event, attendee registrations, and user sessions remain completely intact in PostgreSQL.
   - Capture screenshot **After** showing the event persisted across container recreation.

