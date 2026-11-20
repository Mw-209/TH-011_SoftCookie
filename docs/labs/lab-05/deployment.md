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

---

## 5. Repeatable Release Procedure & Commit Verification

### Release Workflow
1. Create a GitHub Issue labeled `lab5` describing the change.
2. Branch from `staging` (`git switch staging && git switch -c feature/<issue>-<slug>`).
3. Push the feature branch and open a Pull Request into `staging`.
4. Ensure CI (`test-and-docker`) passes and a **teammate** reviews and approves the PR, then merge into `staging`.
5. Open a Release Pull Request from `staging` into `main`.
6. Once `main` required status checks (`test-and-docker`) pass, merge the Release PR into `main`.
7. `.github/workflows/deploy.yml` runs automatically:
   - Re-runs CI (`ci-docker.yml`)
   - Authenticates to GCP via Workload Identity Federation (no JSON keys)
   - Builds and pushes the Docker image tagged with the 40-character `github.sha`
   - Runs `deploy/release.sh` (resolves immutable `@sha256` digest -> executes `s55fa7796-migrate` -> updates `s55fa7796` -> routes 100% traffic to latest)
   - Runs `deploy/smoke_test.py` against the live Public URL

### How to Check Which Commit Is Currently Running on GCP
1. Inspect the active revision and image digest on Cloud Run:
   ```bash
   gcloud run services describe s55fa7796 \
     --project=cpe-se-course-2026 \
     --region=asia-southeast1 \
     --format='table(status.latestReadyRevisionName, spec.template.spec.containers[0].image)'
   ```
2. Cross-check the `@sha256:...` digest against Artifact Registry tags (which use the full 40-character Git commit SHA):
   ```bash
   gcloud artifacts docker images list \
     asia-southeast1-docker.pkg.dev/cpe-se-course-2026/s55fa7796/s55fa7796 \
     --include-tags \
     --project=cpe-se-course-2026
   ```
3. You can also verify the deployed commit SHA and image digest directly in the GitHub Actions **Deploy demo** workflow run summary (`Record deployment` step).

### Rollback Procedure
Trigger the **Deploy demo** workflow manually (`workflow_dispatch`) on `main` and enter the 40-character commit SHA of a previously deployed image in `image_tag`. `deploy/release.sh` reuses the existing image digest and skips build/migration/seed.

