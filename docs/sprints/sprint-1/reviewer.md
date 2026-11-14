# Sprint 1 — Peer Review Record

**Author:** Kusumas Kerdbankram — 67070505209 — GitHub: @Mw-209  
**Peer reviewer:** Thitikan Tiranobpakan — 67070505213 — GitHub: @thitikan48  

---

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|:--:|:-------|:----------------:|
| 8 | `feature/1-engineering-contracts` | Approved |
| 9 | `feature/2-foundation-prisma-seed` | Approved |
| 13 | `feature/6-f04-organizer-roster` | Approved |
| 14 | `feature/7-e2e-and-release-polish` | Approved |

**Reviewer comment I received:**  
- **PR #8:** *"All acceptance criteria and test contracts are covered. Looks good to me!"*
- **PR #9:** *"Project foundation, Prisma schema, seed script, and health/ready endpoints are working properly. Approved."*
- **PR #13:** *"Reviewed on 4c9b18d — F-04 contract, ownership/role guards, and all tests pass cleanly. Just a few quick cleanups before merging: 1. Drop unused ClockIcon import. 2. Avoid querying registrations twice in getEventRoster. 3. Reuse ACTIVE_REGISTRATION_STATUSES from registration.service. 4. Type EventRosterRegistration.status as RegistrationStatus and use ApiError.notFound."*
- **PR #14:** *"All 27 Playwright E2E tests pass across Desktop, Tablet, and Mobile with zero overflow. Release documentation and screenshots look great. Approved!"*

**How I responded:**  
- **PR #8:** *"Thank you for cross-checking the specifications and traceability matrix!"*
- **PR #9:** *"Thanks for taking the time to review! The database and environment are ready."*
- **PR #13:** *"Thanks for the review! Addressed all 4 points in commit `4312936`: dropped unused ClockIcon, optimized getEventRoster query to run once, reused ACTIVE_REGISTRATION_STATUSES as single source of truth, and updated typing/errors. All 107 server and 73 client tests pass!"*
- **PR #14:** *"Thanks a lot for checking! Moving forward with the final release PR to main."*

---

## Pull Requests I reviewed for my partner

| PR | Branch | Reviewer verdict |
|:--:|:-------|:----------------:|
| 10 | `feature/3-f01-auth-and-rbac` | Approved |
| 11 | `feature/4-f02-event-publication` | Approved |
| 12 | `feature/5-f03-event-registration` | Approved |

**My comment:**  
- **PR #10:** *"Looks great! Authentication lifecycle, bcrypt password hashing, and role-based guards (ORGANIZER vs PARTICIPANT) are cleanly isolated. Unit and API tests pass."*
- **PR #11:** *"Approved! Event creation validation (BR-01) and soonest-first catalog display are well implemented. Form read-only styling with #F0F0F0 works nicely."*
- **PR #12:** *"Awesome work on atomic capacity enforcement! The pessimistic row-lock (`SELECT ... FOR UPDATE`) safely prevents race conditions on the last seat, and TEST-25 concurrent stress test passes cleanly. Approved!"*

**Partner's response:**  
- **PR #10:** *"Thanks for reviewing! Moving on to Feature 4 now."*
- **PR #11:** *"Thank you for checking! I will merge this into sprint1-staging now."*
- **PR #12:** *"Thanks for testing the concurrent edge cases! Merging into staging now."*

---

## Team Contribution Summary

| Team Member | Student ID | GitHub Username | Role & Contributions | Estimated Contribution |
| :--- | :--- | :--- | :--- | :---: |
| **Kusumas Kerdbankram** | 67070505209 | `Mw-209` | Architecture specification, database foundation, seed script, F-04 backend/frontend, branding/favicon, E2E & release verification | **50%** |
| **Thitikan Tiranobpakan** | 67070505213 | `thitikan48` | F-01 Auth/RBAC, F-02 Event publication/discovery, F-03 atomic row-locked registration, SoftCookie responsive UI, automated testing | **50%** |
