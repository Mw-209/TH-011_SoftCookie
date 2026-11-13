# Sprint 1 Responsive & Visual Inspection Audit (SoftCookie Warm Bakery UI)

**Course:** CPE 334 — Introduction to Software Engineering in the Age of AI Agents (Semester 1/2026)  
**Project Theme:** Theme 3 — Event Registration and Attendance System (University Skill-Building Context)  
**Team Name:** TH-011_SoftCookie  
**Sprint:** Sprint 1 Baseline Delivery  
**Document Version:** 1.0  
**Last Updated:** 2026-11-13  

---

## 1. Multi-Viewport Inspection Overview

In accordance with `AC-19`, `AC-20`, and `NFR-05`, all Sprint 1 views were audited across three target viewports:
1. **Desktop:** `1280 x 800` px (Standard Laptop / Desktop monitor)
2. **Tablet (iPad):** `820 x 1180` px (iPad Air / Tablet portrait)
3. **Mobile (iPhone):** `375 x 812` px (iPhone SE / X / Modern mobile portrait)

Automated Playwright tests (`TEST-38 [E2E-07]`) confirmed **zero horizontal overflow** (`scrollWidth <= clientWidth`), no clipped labels, and full touch usability across all screens.

---

## 2. Visual Audit by Screen & Device

### 2.1 Sign In Page (`/login`)
- **Desktop (1280x800):** Centered card layout with Warm Bakery styling, high contrast required asterisks (`*`), and accessible error alerts.
- **Tablet (820x1180):** Clean proportional card scaling without distortion.
- **Mobile (375x812):** Full-width responsive margins with touch-friendly input targets ($\ge 44\text{ px}$).

| Desktop (1280x800) | Tablet / iPad (820x1180) | Mobile / iPhone (375x812) |
| :---: | :---: | :---: |
| ![Desktop Login](../../screenshots/desktop-01-login.png) | ![Tablet Login](../../screenshots/tablet-01-login.png) | ![Mobile Login](../../screenshots/mobile-01-login.png) |

---

### 2.2 Event Discovery Catalog (`/events`)
- **Desktop (1280x800):** Two-column card grid with soonest-first sorting, seat availability badges, and deadline indicators.
- **Tablet (820x1180):** Fluid 2-column grid preserving card hierarchy and spacing.
- **Mobile (375x812):** Stacks into a clean single-column feed with full touch-friendly hit areas.

| Desktop (1280x800) | Tablet / iPad (820x1180) | Mobile / iPhone (375x812) |
| :---: | :---: | :---: |
| ![Desktop Catalog](../../screenshots/desktop-02-catalog.png) | ![Tablet Catalog](../../screenshots/tablet-02-catalog.png) | ![Mobile Catalog](../../screenshots/mobile-02-catalog.png) |

---

### 2.3 Event Detail & Registration (`/events/:id`)
- **Desktop (1280x800):** Comprehensive event overview with schedule, location, remaining seats badge, and action buttons. Owning organizers see "Organizer Controls" with "View Registrations Roster".
- **Tablet (820x1180):** Proportional padding with clear visual distinction between editable and read-only elements.
- **Mobile (375x812):** Single column stack with full-width register / view action buttons.

| Desktop (1280x800) | Tablet / iPad (820x1180) | Mobile / iPhone (375x812) |
| :---: | :---: | :---: |
| ![Desktop Detail](../../screenshots/desktop-03-event-detail.png) | ![Tablet Detail](../../screenshots/tablet-03-event-detail.png) | ![Mobile Detail](../../screenshots/mobile-03-event-detail.png) |

---

### 2.4 My Registrations (`/my-registrations`)
- **Desktop (1280x800):** Participant ticket history showing official registration codes (`REG-2026-NNNN`) and status pills.
- **Tablet (820x1180):** Preserves clear tabular metadata with wrap-safe badges.
- **Mobile (375x812):** Vertical card stack with clear call to action ("Browse Events" when empty).

| Desktop (1280x800) | Tablet / iPad (820x1180) | Mobile / iPhone (375x812) |
| :---: | :---: | :---: |
| ![Desktop My Registrations](../../screenshots/desktop-04-my-registrations.png) | ![Tablet My Registrations](../../screenshots/tablet-04-my-registrations.png) | ![Mobile My Registrations](../../screenshots/mobile-04-my-registrations.png) |

---

### 2.5 Create Event Page (`/events/new`)
- **Desktop (1280x800):** Side-by-side editable form inputs with `#F0F0F0` shaded read-only system fields (`Event Code`, `Organizer`).
- **Tablet (820x1180):** Adaptable form grid with red asterisk (`*`) markers above all required inputs.
- **Mobile (375x812):** Clean single-column form with inline validation below each field.

| Desktop (1280x800) | Tablet / iPad (820x1180) | Mobile / iPhone (375x812) |
| :---: | :---: | :---: |
| ![Desktop Create Event](../../screenshots/desktop-05-create-event.png) | ![Tablet Create Event](../../screenshots/tablet-05-create-event.png) | ![Mobile Create Event](../../screenshots/mobile-05-create-event.png) |

---

### 2.6 Organizer Registration Roster (`/organizer/events/:id/registrations`)
- **Desktop (1280x800):** Full 5-column data table (`Registration No.`, `Participant Name`, `Email`, `Status`, `Registered Date/Time`) with SoftCookie Cocoa/Caramel headers.
- **Tablet (820x1180):** Compact responsive table with legible spacing.
- **Mobile (375x812):** **Responsive transformation** — table cleanly transitions into stacked mobile participant cards to eliminate horizontal scroll.

| Desktop (1280x800) | Tablet / iPad (820x1180) | Mobile / iPhone (375x812) |
| :---: | :---: | :---: |
| ![Desktop Roster](../../screenshots/desktop-06-organizer-roster.png) | ![Tablet Roster](../../screenshots/tablet-06-organizer-roster.png) | ![Mobile Roster](../../screenshots/mobile-06-organizer-roster.png) |
