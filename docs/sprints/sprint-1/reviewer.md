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
- **PR #13:** *Unused import (client/src/pages/OrganizerRosterPage.tsx:8): Drop the unused ClockIcon import.
Avoid querying registrations twice (server/src/services/event.service.ts:375-408): getEventRoster loads registrations in event.findUnique just to count active rows, then queries them again in registration.findMany. We can drop include from findUnique and compute activeRegistrationsCount from the findMany result instead.
Single source of truth for active statuses (server/src/services/event.service.ts:208, 364): Reuse ACTIVE_REGISTRATION_STATUSES from registration.service.ts:13 in both places instead of duplicating ["REGISTERED", "ATTENDED"].
Minor consistency in event.service.ts: Type EventRosterRegistration.status as RegistrationStatus (line 337) and use ApiError.notFound("Event not found.") (line 385).*
- **PR #14:** *Let's create a separate artifacts/sprint-1/ folder to store all the screenshots.*

**How I responded:**  
- **PR #8:** *OKay*
- **PR #9:** *Thanks a lot for checking!*
- **PR #13:** *"Thanks for the review! All 4 points have been addressed in commit 4312936 and pushed:

Unused import dropped: Removed unused ClockIcon import from client/src/pages/OrganizerRosterPage.tsx.
Query optimization: Removed include: { registrations } from event.findUnique; activeRegistrationsCount is now computed directly from the registration.findMany result in memory.
Single source of truth: Reused ACTIVE_REGISTRATION_STATUSES from registration.service.ts across eventInclude and getEventRoster, dropping the duplicated ACTIVE_STATUSES array.
Consistency & Typing: Typed EventRosterRegistration.status as RegistrationStatus enum and updated not-found rejection to use ApiError.notFound("Event").
All test suites continue to pass cleanly (Server: 107/107, Client: 73/73). Ready for re-review*
- **PR #14:** *okay*

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
- **PR #10:** *Thanks*
- **PR #11:** *Okay*
- **PR #12:** *Okay*

---

## Team Contribution Summary

| Team Member | Student ID | GitHub Username | Role & Contributions | Estimated Contribution |
| :--- | :--- | :--- | :--- | :---: |
| **Kusumas Kerdbankram** | 67070505209 | `Mw-209` | Architecture specification, database foundation, seed script, F-04 backend/frontend, branding/favicon, E2E & release verification | **50%** |
| **Thitikan Tiranobpakan** | 67070505213 | `thitikan48` | F-01 Auth/RBAC, F-02 Event publication/discovery, F-03 atomic row-locked registration, SoftCookie responsive UI, automated testing | **50%** |
