# St. Saviours GAA & LGFA — Master Roadmap
Reconciled from multiple planning sessions. This file is the single source of truth for sprint numbering — if another chat produces a new planning doc, reconcile it here before treating it as scheduled.

---

## Status
- **Sprint 8 (UX/UI Redesign) — SHIPPED**, live on `main`/production. Full detail, backlog, and open items in `sprint-8-design-spec.md`.
- **Sprint 9 (Push Notifications + Tech Debt) — IN PROGRESS, not yet started.** Branch not yet created.

## Sprint 9 — Push Notifications + Tech Debt
1. Generate VAPID keys
2. `subscriptions` table in Supabase
3. Service worker file
4. Opt-in UI wired to the existing bell icon
5. First trigger end-to-end (new fixture) — likely the longest single step
6. Remaining triggers (result posted, notice published, physio status change)
7. iOS / non-installed fallback decision
8. Gmail SMTP switch — **parked, waiting on which Gmail account to use + 2FA + App Password**
9. Fix `themeColor` metadata warning (seen in every build since Sprint 8 started)
10. Fix `<img>` → `next/image` warnings (6 files)
11. Fix `PitchCalendar` `useEffect` missing-dependency warning
12. Automated Supabase backups
13. Performance optimization — *unscoped, define concretely when reached*

## Sprint 10 — RSVP for Fixtures
- Attending/Declined buttons on fixture cards
- Response counters
- Admin sees full RSVP list per fixture
- *Cheap filler candidate:* Social share Phase 1 (copy-to-clipboard result/fixture text) could slot in here opportunistically — low effort, no dependency on anything else.

## Sprint 11 — Team/Age-Grade Context Switcher
- Persistent team selector for coaches
- Filters calendar/fixtures/results to their team
- Chosen over Visual Pitch Planner for this slot — smaller and more contained.

## Sprint 12 — Visual Pitch Planner (Phase 1)
- Visual diagram of pitches showing booked/free at a glance, per St Saviours' specific layout (hardcoded, not dynamic yet)
- Click booked slot → detail modal; click free slot → new booking form
- **Estimate caution:** originally scoped "medium, 1-2 sprints" — treat as likely to run longer given the interactive/mobile/overlap complexity involved.

## Sprint 13 — Admin/Ops Cleanup
- Weekly Schedule Email (low priority — only worth building once user base grows)
- Bulk User Import (CSV)
- Role-change dropdown in Admin Panel (Viewer→Coach etc., replacing the current Suspend/Make Admin-only buttons)

## Sprint 14+ / Deferred
- Visual Pitch Planner Phase 2 (dynamic, multi-club layout generator) — gated behind multi-tenancy actually happening
- Social sharing Phase 2 (branded Canvas image cards) — deferred
- Social sharing Phase 3 (direct Facebook/X posting) — deferred; X API now costs money per-post (no free tier as of Feb 2026), Facebook approval is slow. Revisit only if clubs specifically request it.
- Multi-tenancy / commercialization — not scheduled
- Training session builder, drill library, live match stats, native app, payments — future consideration only

## Known backlog (see `sprint-8-design-spec.md` for full detail)
- Admin Panel's own modals (Closure/Notice) never got the Step 7 form-styling pass
- New Booking End Time auto-advance — works on mobile, desktop unconfirmed
- Whether Admin's "Awaiting" stat card is worth keeping
