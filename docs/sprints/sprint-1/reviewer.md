# Sprint 1 — Peer Review Record

**Author:** Kusumas Kerdbankram — 67070505209 — GitHub: @Mw-209

**Peer reviewer:** Thitikan Tiranobpakan — 67070505213 — GitHub: @thitikan48

## Pull Request Review Record

Every pull request was opened by one of us and reviewed by the other, so each of the
seven Sprint 1 issues passed through both pairs of eyes before it reached
`sprint1-staging`.

| Issue | PR | Branch | Author | Reviewer | Reviewer verdict |
|:-----:|:--:|--------|--------|----------|------------------|
| [1](https://github.com/Mw-209/TH-011_SoftCookie/issues/1) | [8](https://github.com/Mw-209/TH-011_SoftCookie/pull/8)   | `feature/1-engineering-contracts`    | Kusumas  | Thitikan | Approved |
| [2](https://github.com/Mw-209/TH-011_SoftCookie/issues/2) | [9](https://github.com/Mw-209/TH-011_SoftCookie/pull/9)   | `feature/2-foundation-prisma-seed`   | Kusumas  | Thitikan | Approved |
| [3](https://github.com/Mw-209/TH-011_SoftCookie/issues/3) | [10](https://github.com/Mw-209/TH-011_SoftCookie/pull/10) | `feature/3-f01-auth-and-rbac`        | Thitikan | Kusumas  | Approved |
| [4](https://github.com/Mw-209/TH-011_SoftCookie/issues/4) | [11](https://github.com/Mw-209/TH-011_SoftCookie/pull/11) | `feature/4-f02-event-publication`    | Thitikan | Kusumas  | Approved |
| [5](https://github.com/Mw-209/TH-011_SoftCookie/issues/5) | [12](https://github.com/Mw-209/TH-011_SoftCookie/pull/12) | `feature/5-f03-event-registration`   | Thitikan | Kusumas  | Approved |
| [6](https://github.com/Mw-209/TH-011_SoftCookie/issues/6) | [13](https://github.com/Mw-209/TH-011_SoftCookie/pull/13) | `feature/6-f04-organizer-roster`     | Kusumas  | Thitikan | Approved |
| [7](https://github.com/Mw-209/TH-011_SoftCookie/issues/7) | [14](https://github.com/Mw-209/TH-011_SoftCookie/pull/14) | `feature/7-e2e-and-release-polish`   | Kusumas  | Thitikan | In Review |

#### Issue 1 : [Docs] Sprint 1 Engineering Baseline & Feature Contracts (Parts A-E) PR#8
``` 
Thitikan's review comment : Alright, I'll merge our work now!
Kusumas's response : OKay
```

#### Issue 2 : Project Foundation, Prisma Schema, Seed Data, and Health Check PR#9
``` 
Thitikan's review comment : good
Kusumas's response : Thanks a lot for checking!
```

#### Issue 3 : Authentication, Session Lifecycle, and Role-Based Access Control PR#10
``` 
Kusumas's review comment : Perfect!!
Thitikan's response : Thanks
```

#### Issue 4 : Event Creation, Positive Capacity Validation, and Event Catalog Discovery PR#11
``` 
Kusumas's review comment : Great! Everything looks good
Thitikan's response : Okay / Thanks for reviewing
```

#### Issue 5 : Participant Event Registration, Concurrency Protection, and My Registrations PR#12
``` 
Kusumas's review comment : Everything looks good.
Thitikan's response : Okay
```

#### Issue 6 : Organizer Event Registrations Inspection and Ownership Isolation PR#13
This was the one review round that changed the code, so both rounds are recorded.

Round 1 — changes requested:
``` 
Thitikan's review comment :
1. Unused import (client/src/pages/OrganizerRosterPage.tsx:8): Drop the unused ClockIcon import.
2. Avoid querying registrations twice (server/src/services/event.service.ts:375-408): getEventRoster
   loads registrations in event.findUnique just to count active rows, then queries them again in
   registration.findMany. We can drop include from findUnique and compute activeRegistrationsCount
   from the findMany result instead.
3. Single source of truth for active statuses (server/src/services/event.service.ts:208, 364):
   Reuse ACTIVE_REGISTRATION_STATUSES from registration.service.ts:13 in both places instead of
   duplicating ["REGISTERED", "ATTENDED"].
4. Minor consistency in event.service.ts: Type EventRosterRegistration.status as RegistrationStatus
   (line 337) and use ApiError.notFound("Event not found.") (line 385).

Kusumas's response :
Thanks for the review! All 4 points have been addressed in commit 4312936 and pushed:
1. Unused import dropped.
2. Query optimization: removed include from event.findUnique; activeRegistrationsCount is now
   computed from the registration.findMany result.
3. Single source of truth: reused ACTIVE_REGISTRATION_STATUSES across eventInclude and
   getEventRoster, dropping the duplicated ACTIVE_STATUSES array.
4. Consistency & typing: typed status as the RegistrationStatus enum and used ApiError.notFound.
All test suites continue to pass cleanly (Server: 107/107, Client: 73/73). Ready for re-review
```

Round 2 — approved:
``` 
Thitikan's review comment : good good, I will merge!
```

#### Issue 7 : [Release] Sprint 1 E2E Verification, Responsive Audit, and Main Release PR#14
``` 
Thitikan's review comment : Let's create a separate artifacts/sprint-1/ folder to store all the screenshots.
Kusumas's response : okay
```

---

## Team Contribution Summary

| Team Member | Student ID | GitHub Username | Role & Contributions | Estimated Contribution |
| :--- | :--- | :--- | :--- | :---: |
| **Kusumas Kerdbankram** | 67070505209 | `Mw-209` | Architecture specification, database foundation, seed script, F-04 backend/frontend, branding/favicon, E2E & release verification | **50%** |
| **Thitikan Tiranobpakan** | 67070505213 | `thitikan48` | F-01 Auth/RBAC, F-02 Event publication/discovery, F-03 atomic row-locked registration, SoftCookie responsive UI, automated testing | **50%** |
