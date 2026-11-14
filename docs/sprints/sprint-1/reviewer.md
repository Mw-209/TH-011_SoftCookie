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
| 14 | `feature/7-e2e-and-release-polish` | In Review |

**Reviewer comment I received:**  
- **PR #8:** *"Alright, I'll merge our work now!"*
- **PR #9:** *"good"*
- **PR #13:** *"Reviewed on 4c9b18d — F-04 contract, ownership/role guards, and all tests pass cleanly. Just a few quick cleanups before merging: 1. Drop unused ClockIcon import. 2. Avoid querying registrations twice in getEventRoster. 3. Reuse ACTIVE_REGISTRATION_STATUSES from registration.service. 4. Type EventRosterRegistration.status as RegistrationStatus and use ApiError.notFound."*
- **PR #14:** *(Under active review — resolving review items on README UTF-8 encoding, populated screenshot states, real reviewer comments, and feature contract status alignment)*

**How I responded:**  
- **PR #8:** *Merged into `sprint1-staging`.*
- **PR #9:** *Merged into `sprint1-staging`.*
- **PR #13:** *"Thanks for the review! Addressed all 4 points in commit `4312936`: dropped unused ClockIcon, optimized getEventRoster query to run once, reused ACTIVE_REGISTRATION_STATUSES as single source of truth, and updated typing/errors. All 107 server and 73 client tests pass!"*
- **PR #14:** *(Addressing feedback commits on `feature/7-e2e-and-release-polish`)*

---

## Pull Requests I reviewed for my partner

| PR | Branch | Reviewer verdict |
|:--:|:-------|:----------------:|
| 10 | `feature/3-f01-auth-and-rbac` | Approved |
| 11 | `feature/4-f02-event-publication` | Approved |
| 12 | `feature/5-f03-event-registration` | Approved |

**My comment:**  
- **PR #10:** *"Perfect!!"*
- **PR #11:** *"Great! Everything looks good"*
- **PR #12:** *"Everything looks good."*

**Partner's response:**  
- **PR #10:** *Merged into `sprint1-staging`.*
- **PR #11:** *Merged into `sprint1-staging`.*
- **PR #12:** *Merged into `sprint1-staging`.*

---

## Team Contribution Summary

| Team Member | Student ID | GitHub Username | Role & Contributions | Estimated Contribution |
| :--- | :--- | :--- | :--- | :---: |
| **Kusumas Kerdbankram** | 67070505209 | `Mw-209` | Architecture specification, database foundation, seed script, F-04 backend/frontend, branding/favicon, E2E & release verification | **50%** |
| **Thitikan Tiranobpakan** | 67070505213 | `thitikan48` | F-01 Auth/RBAC, F-02 Event publication/discovery, F-03 atomic row-locked registration, SoftCookie responsive UI, automated testing | **50%** |
