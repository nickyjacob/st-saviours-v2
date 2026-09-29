# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Club app for St. Saviours GAA & LGFA: pitch booking (with admin approval), fixtures, results, notices, physio requests, and push/email notifications. Next.js 14 App Router + TypeScript + Tailwind 3, with Supabase (Postgres + Auth) as the entire backend. Deployed via Vercel. Path alias `@/` maps to the repo root.

## Commands

```bash
npm run dev      # dev server on http://localhost:3000
npm run build    # production build - the only real verification step (see below)
npm run lint     # next lint (next/core-web-vitals + next/typescript)
```

There is no test suite. `npm run build` is the check to run before finishing work: it runs ESLint and the TypeScript check as part of the build, so a lint **error** (e.g. `no-explicit-any`) fails the build, while lint warnings do not. It also prerenders pages, which catches problems `next dev` hides (see Gotchas).

Env vars are read from `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`.

## Conventions

- **Branch per sprint.** Each sprint gets its own branch (e.g. `sprint-12`). Before starting, tag the starting point `pre-sprintN` (e.g. `pre-sprint12`) so there is a clean rollback reference. Sub-sprints add a letter suffix to both, e.g. branches `sprint-13b`, `sprint-14a`, `sprint-14b` and tags `pre-sprint13b`, `pre-sprint14a`, `pre-sprint14b`.
- **Database changes are run by hand, then recorded.** SQL is executed directly in the Supabase SQL Editor. Afterwards, save it as a record file in `migrations/`. Nothing in this repo runs those files: never re-run them through a deploy or a migration tool.
- **Before any commit, run `npm run build` and `git status`.** These are the standard checks; the build is the only automated verification (there are no tests).
- **Environment is Windows with Git Bash, not plain PowerShell.** Use POSIX shell syntax and forward slashes in commands.

## Architecture

**Almost every page is a client component that talks to Supabase directly** through the shared browser client in `lib/supabase.ts` (anon key). There is no `middleware.ts` and no server-side auth. Access control is therefore two things working together:
- Row-level security and views/RPCs in Supabase (not visible in this repo).
- A per-page client-side check: `getSession()` -> redirect to `/login` if none; load the user's `profiles` row -> redirect to `/pending` if `!is_approved`. `app/pitch-view/page.tsx` and `app/planner/page.tsx` show the pattern. `profiles.role` (`admin` gates approval/admin features) and `profiles.assigned_teams` come from the same row. `components/SessionTimeout.tsx` (mounted in the root layout) signs out after 30 minutes idle.

**Database objects the code relies on** (defined in Supabase, not in the repo): tables `bookings`, `pitches`, `pitch_closures`, `fixtures`, `results`, `notices`, `profiles`, `physio_requests`, `subscriptions`, `notification_preferences`, `notifications_log`, `login_history`; views `public_planner` (read-only booking feed for calendars/planner/pitch view) and `admin_bookings`; RPCs `check_booking_conflict_extended` and `get_or_create_ical_token`.

**`migrations/*.sql` are records, not a pipeline** (see Conventions). They are not idempotent, e.g. a plain `alter table ... add column`, so re-running one would error.

**Pitches are hierarchical.** `pitches.parent_pitch_id` links half-pitches to a full pitch (`split_orientation` says how it is split). Conflict rules live in the `check_booking_conflict_extended` RPC: only `approved` bookings block; a half conflicts with its parent and a parent conflicts with any child. The same RPC is called from four places (`new-booking`, `edit-booking/[id]`, `fixtures`, `admin`), and the three booking-creation/edit callers (`new-booking`, `edit-booking/[id]`, `fixtures`) also check `pitch_closures` separately in client code (the RPC does not know about closures; the admin approve handler only calls the RPC). Change conflict rules in the SQL function, not the callers.

**Notifications** are a two-step flow. The client writes to Supabase, then POSTs to one of the `app/api/notify-*/route.ts` handlers. Those use the service-role key to find recipients and call `lib/sendPush.ts` (Web Push via `web-push`, logs to `notifications_log`, and returns `usersNeedingEmailFallback` for users with no subscription or a failed push). `app/api/send-email/route.ts` (Resend) handles the email side. `lib/notificationPreferences.ts` maps each `trigger_type` to a user-mutable category; `new_booking` and `new_user` are always-on. When adding a new trigger type, register it there or it silently bypasses user preferences (unknown triggers fail open).

**Booking display** is shared between `components/PitchCalendar.tsx` (calendar, also exports `BookingModal`) and `components/PitchTimeline.tsx` (the Pitch View day timeline, fed by `app/pitch-view/page.tsx`). Timeline geometry is percentage-based over a fixed 08:00-22:00 window (`PITCH_VIEW_START_HOUR`/`END_HOUR`); bookings outside that window are clamped to the edges.

**Styling** uses Tailwind with semantic color tokens (`ink`, `approved`, `pending`, `rejected`, `info`, `neutral`, `accent`) that resolve to CSS variables in `app/globals.css`. Use these instead of raw hex/Tailwind palette colors for status meaning. Reusable primitives are in `components/ui/`. Design rationale is in `sprint-8-design-spec.md`; `/style-guide` is a live page of the primitives.

## Gotchas

- **`useSearchParams()` must be inside a `<Suspense>` boundary.** `next dev` doesn't care, but `next build` fails prerendering. `app/new-booking/page.tsx` splits into `NewBookingForm` plus a default-export wrapper for this reason; do the same for any page that reads the query string.
- **`Navbar` takes `activePage` as a plain string** matching its nav item label (e.g. `"Pitch View"`), not a route.
- **Stray files in the repo root** are junk and can be ignored: `fix.js` (an old one-off script that writes a page file), and the empty files `next` and `st-saviours-temp@0.1.0` (artifacts of a mistyped shell command). `claude-context/` is gitignored.