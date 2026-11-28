# Lab 6 — Part A: Sprint 1 UAT Preparation and Handoff

| | |
| :--- | :--- |
| **Product Team** | TH-011_SoftCookie — *SoftCookie Events* |
| **Theme** | Theme 3: University Skill-Building Event Registration and Attendance System |
| **Members** | Kusumas Kerdbankram (67070505209)<br>Thitikan Tiranobpakan (67070505213) |
| **UAT Team** | TH-050 Girlyberry — Thitigant Surayotin, Jinjuta Nunnarumit |
| **Contract** | `docs/srs.md` v1.1 and Sprint 1 feature contracts F-01 – F-04 |

> Run each case exactly as written. If what you see differs from *Expected*, mark **FAIL** and write what you actually saw. If you cannot continue (for example, the site is down or login fails), mark **BLOCKED** with the reason.

---

## A1. Release Under Test

| Item | Value |
| :--- | :--- |
| URL | **https://s55fa7796-4d7hbszvwq-as.a.run.app** |
| Repository | https://github.com/Mw-209/TH-011_SoftCookie |
| Release tag / commit | `sprint1-uat-baseline` → `ef41b8d` (`ef41b8df415a3b2c10f81955b944fa17bb9fcaf3`) |
| Cloud Run revision | `s55fa7796-00004-ktm` |
| Sprint 1 baseline | `d88a501` (PR #15, 2026-11-15) |

`ef41b8d` has the same Sprint 1 behaviour as the baseline `d88a501`. Between the two commits, the only application change is `app.set("trust proxy", 1)`, which makes the session cookie work behind Cloud Run. Everything else is Lab 5 CI/CD files and docs.

**Version freeze:** the Product Team will not deploy until the UAT Team returns its results. Any new revision will be announced by LINE before deployment.

---

## A2. Scope

| In scope (Sprint 1) | Out of scope (Sprint 2/3; not a defect) |
| :--- | :--- |
| **F-01** Login, logout, protected pages, role-based menu | Cancel / re-register, registration-deadline cutoff |
| **F-02** Organizer creates an event (`EVT-YYYY-NNNN`), form validation, catalog, event detail | Edit capacity or deadline, check-in, attendance summary |
| **F-03** Participant registers (`REG-YYYY-NNNN`), duplicate and full-event blocking, My Registrations | Search, filter, sort; delete event |
| **F-04** Owning organizer views roster; others are denied | Sign-up, password reset, email, payment |

Please do not run load tests or security scanners against the service.

---

## A3. Test Accounts

All accounts are synthetic seed data. **The password is not in this document.** Thitikan sends it to each tester by LINE private message.

| Label | Email | Role | Name shown in the app | Used in |
| :--- | :--- | :--- | :--- | :--- |
| ORG-1 | `organizer1@university.edu` | ORGANIZER | Dr. Somchai Wattana | 01, 03, 04, 05 |
| ORG-2 | `organizer2@university.edu` | ORGANIZER | Prof. Nida Srisuk | 05 |
| STU-1 | `student1@university.edu` | PARTICIPANT | Kittipong Jaidee | 02, 05, 06 |
| STU-2 | `student2@university.edu` | PARTICIPANT | Pimchanok Lert | 03 |
| STU-3 | `student3@university.edu` | PARTICIPANT | Thanawat Suk | 03 |

---

## A4. Setup, Order and Cleanup

**Setup**
1. Use Chrome or Edge on a computer. One browser window is enough.
2. Choose a **run tag**, for example `TH050-A`. Replace `{RUN}` in every event title with it, so your events are easy to find.
3. Before each **Sign in as …**, click **Log Out** if someone is already signed in.
4. Date fields use the browser's date picker. Type the dates in the format your browser shows. The app always displays dates like `15 Dec, 2026` and times in 24-hour format, like `09:00 - 12:00`.

**Order:** `01 → 02 → 05 → 06` must run in this order because they share EVENT-A. Cases `03` and `04` are independent and can run at any time.

| Shared data | Created in | Write down |
| :--- | :--- | :--- |
| **EVENT-A** `UAT {RUN} Git Basics Workshop` | 01 | Its **Event Code** and page URL |
| **REG-A1**: STU-1's registration on EVENT-A | 02 | Its registration number |

**Cleanup:** Sprint 1 has no delete or cancel feature, so test events remain in the system. This is expected. To run again, use a new run tag. No reset is needed.

---

## A5. Test Cases

| Required category (Lab 6 §3.1) | Case |
| :--- | :--- |
| Normal domain journey | **UAT-S1-02** (supported by 01) |
| Business rule / boundary | **UAT-S1-03** (full event), **UAT-S1-04** (invalid input) |
| Forbidden role / ownership | **UAT-S1-05** |
| State / history / persistence | **UAT-S1-06** |

---

### UAT-S1-01: Organizer publishes an event
| | |
| :--- | :--- |
| **Requirement / AC** | FR-02, FR-03, BR-01, BR-04 · AC-06, AC-09, AC-13 |
| **Purpose** | An organizer can publish a valid event, and the system assigns an Event Code. Organizers cannot register for events. |
| **Role** | ORG-1 |
| **Precondition** | Signed out |
| **Inputs** | Event Title `UAT {RUN} Git Basics Workshop` · Skill Category `Technical` · Skill Hours `3` · Capacity (Seats) `3` · Location `Engineering Bldg 4, Room 405` · Registration Deadline `2026-12-14 17:00` · Start Date/Time `2026-12-15 09:00` · End Date/Time `2026-12-15 12:00` · Description `Hands-on introduction to Git branching and pull requests.` |

**Steps**
1. Sign in as ORG-1.
2. Click **Create Event**, then fill in the inputs above.
3. Click **Publish Event**.
4. Click **Events** and find the new event.

**Expected**
- The event page shows the title and an **Event Code** in the format `EVT-2026-NNNN`. The Registration box shows **Capacity 3 · Registered 0 · Remaining seats 3**.
- A **View Registrations Roster** button is visible, because ORG-1 owns this event. Instead of a **Register for Event** button, the Registration box says `Only participants can register for events.`
- In **Events**, the card shows the badge `3 / 3 seats available`.

---

### UAT-S1-02: Participant registers for an event (normal journey)
| | |
| :--- | :--- |
| **Requirement / AC** | FR-03, FR-04, FR-05, BR-03 · AC-10, AC-11, AC-14 |
| **Purpose** | A participant can find an event, register, and receive a registration number. A second registration is not possible. |
| **Role** | STU-1 |
| **Precondition** | UAT-S1-01 done (EVENT-A has 3 seats) |
| **Inputs** | EVENT-A |

**Steps**
1. Sign in as STU-1. Click **Events** and open EVENT-A.
2. Click **Register for Event**. Write down the registration number (REG-A1).
3. Refresh the page (F5).
4. Click **View in My Registrations**.

**Expected**
- After step 2: the message `You are registered. Registration number: REG-2026-NNNN` appears, and **Remaining seats** changes from 3 to **2**.
- After step 3: the **Register for Event** button is gone. The page shows the badge `REGISTERED` with REG-A1, so the participant cannot register twice.
- **My Registrations** lists EVENT-A once, with REG-A1 and status `REGISTERED`.

---

### UAT-S1-03: The last seat is taken; the event becomes full (boundary)
| | |
| :--- | :--- |
| **Requirement / AC** | BR-02 · AC-12 |
| **Purpose** | An event with capacity 1 accepts exactly one participant and then blocks everyone else. |
| **Roles** | ORG-1, STU-2, STU-3 |
| **Precondition** | Signed out |
| **Inputs** | EVENT-B: same as UAT-S1-01 but Event Title `UAT {RUN} Last Seat Lab`, Capacity (Seats) `1`, Start `2026-12-16 13:00`, End `2026-12-16 15:00`, Registration Deadline `2026-12-16 12:00` |

**Steps**
1. Sign in as ORG-1 and create EVENT-B with the inputs above.
2. Sign in as STU-2, open EVENT-B, and click **Register for Event**.
3. Sign in as STU-3 and open EVENT-B.
4. Click **Events** and find EVENT-B.

**Expected**
- STU-2 receives a registration number. **Remaining seats** becomes **0**.
- STU-3 sees **Capacity 1 · Registered 1 · Remaining seats 0** and the badge `Event Full (0 seats left)`. There is no **Register for Event** button.
- In **Events**, EVENT-B shows the badge `Full`.

---

### UAT-S1-04: Invalid event data is rejected (business rule)
| | |
| :--- | :--- |
| **Requirement / AC** | BR-01 · AC-07 |
| **Purpose** | An event with an impossible schedule or a zero capacity cannot be published. |
| **Role** | ORG-1 |
| **Precondition** | Signed in as ORG-1 |
| **Inputs** | Same as UAT-S1-01 but Event Title `UAT {RUN} Invalid Event`, Start Date/Time `2026-12-17 10:00`, End Date/Time `2026-12-17 09:00` (**before start**), Registration Deadline `2026-12-16 17:00`, Capacity (Seats) `0` |

**Steps**
1. Click **Create Event** and fill in the inputs above.
2. Click **Publish Event**.
3. Click **Events** and look for `UAT {RUN} Invalid Event`.

**Expected**
- Under **End Date/Time**: `End date and time must be after the start date and time.`
- Under **Capacity (Seats)**: `Capacity must be a whole number between 1 and 1000.` The other values you typed stay in the form.
- The event does **not** appear in **Events**.

---

### UAT-S1-05: Users cannot use another role's or another owner's pages (forbidden role / ownership)
| | |
| :--- | :--- |
| **Requirement / AC** | BR-04, BR-05, NFR-02 · AC-08, AC-16, AC-17, AC-18 |
| **Purpose** | A participant cannot create events or view a roster. An organizer cannot see the roster of another organizer's event. The protected roster stays correct. |
| **Roles** | STU-1, ORG-2, ORG-1 |
| **Precondition** | UAT-S1-02 done (STU-1 is registered on EVENT-A) |
| **Inputs** | EVENT-A page URL, in the form `…/events/<id>`. The **roster URL** is the same address with `/events/<id>` changed to `/organizer/events/<id>/registrations`. |

**Steps**
1. Sign in as STU-1. Check the top menu, then type `/events/new` at the end of the site URL and press Enter.
2. Still as STU-1, open the **roster URL** of EVENT-A.
3. Sign in as ORG-2. Open EVENT-A, then open its **roster URL**.
4. Sign in as ORG-1, open EVENT-A, and click **View Registrations Roster**.

**Expected**
- Steps 1–2 (STU-1): the menu has no **Create Event** link. `/events/new` shows `403 Access Denied` with `Only organizers can create events.`. The roster URL shows `403 Access Denied` with no participant names.
- Step 3 (ORG-2): the event page has no **View Registrations Roster** button. The roster URL shows `403 Access Denied` and `You do not have permission to view registrations for this event.`, with no participant names.
- Step 4 (ORG-1): the roster shows exactly 1 row: REG-A1, `Kittipong Jaidee`, `student1@university.edu`, status `REGISTERED`.

---

### UAT-S1-06: Registration is kept after logout and login (state / persistence)
| | |
| :--- | :--- |
| **Requirement / AC** | FR-01, FR-05, NFR-03 · AC-01, AC-02, AC-03, AC-04, AC-14 |
| **Purpose** | Logging out blocks access. A wrong password is refused. The registration and seat count are still the same after logging back in. |
| **Role** | STU-1 |
| **Precondition** | UAT-S1-02 done |
| **Inputs** | Wrong password `WrongPass#2026` |

**Steps**
1. Sign in as STU-1, then click **Log Out**. Type `/my-registrations` at the end of the site URL and press Enter.
2. Sign in as `student1@university.edu` with password `WrongPass#2026`.
3. Sign in again with the correct password, then open **My Registrations**.
4. Open EVENT-A.

**Expected**
- Step 1: you are sent to the **Sign In** page, and no registrations are shown.
- Step 2: the message `Email or password is incorrect.` appears. The email stays in the field, and the password field is cleared.
- Steps 3–4: **My Registrations** still shows REG-A1 with status `REGISTERED`. EVENT-A still shows **Registered 1 · Remaining seats 2**.

---

## A6. Results and Defect Reports

For each case, record: **Case ID · tester · date/time · revision (`s55fa7796-00004-ktm`) · inputs used · actual result · PASS / FAIL / BLOCKED · Evidence ID**. Write what you saw, not a copy of *Expected*.

**Evidence ID:** `EV-<case>-<no>`, for example `EV-02-1`. Include the address bar and time in each screenshot. At minimum, capture **UAT-S1-02** (normal journey) and **UAT-S1-05** (denied pages and the unchanged roster).

**Defect report** (one per FAIL): ID `TH050-UAT-01`, `-02`, … · case / AC · steps to reproduce · expected · actual · severity (**Critical / Major / Minor**, with the impact on users) · Evidence ID.

## A7. Contact

Send results and defect reports to **Thitikan Tiranobpakan** by LINE private message. She will confirm each report, and the Product Team opens a GitHub Issue for each accepted defect.

---

## A8. Sprint 1 Acceptance-Criteria Coverage

| Feature | AC | UAT case |
| :--- | :--- | :--- |
| F-01 | AC-01 login · AC-02 wrong password · AC-03 protected page · AC-04 logout | 06 (login is also used in every case) |
| F-02 | AC-06 create · AC-07 validation · AC-08 participant denied · AC-09 catalog and detail | 01, 04, 05, 01 |
| F-03 | AC-10 register · AC-11 duplicate · AC-12 full · AC-13 organizer cannot register · AC-14 My Registrations | 02, 02, 03, 01, 02 / 06 |
| F-04 | AC-16 owner roster · AC-17 other organizer denied · AC-18 participant denied | 05 |

These ACs are not part of manual UAT because they have no user-facing screen in Sprint 1. They are verified by automated tests:

| AC | Covered by |
| :--- | :--- |
| AC-05 bcrypt hashing | `UNIT-01` |
| AC-12 simultaneous requests for the last seat | `API-13` |
| AC-15 another participant's registration | `API-16` |
| AC-19 / AC-20 theme and responsive layout | `UI-07`, `E2E-07` |
