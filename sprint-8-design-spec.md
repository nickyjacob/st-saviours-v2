# Sprint 8 — UX/UI Professional Redesign Spec
St. Saviours GAA & LGFA · club app

**Design direction below is Claude-led** per your go-ahead, with a companion visual preview at `sprint-8-style-preview.html` — open that alongside this doc rather than reading hex codes cold.

---

## Keep as-is (already good instincts)
- White card + subtle shadow + colored left border for status — this pattern repeats across Bookings, Calendar, Fixtures, Results. Formalize it, don't replace it.
- The black-pill segmented control (Upcoming/Past/All Dates, Day/Week/Month, Bookings/Fixtures/All) — clean, consistent, keep the interaction pattern.
- Modal style (reject booking, add closure) — white rounded-12 card, 24px padding, clear Cancel/primary action — formalize as one shared `Modal` component, reuse everywhere instead of hand-rolling each one.
- "Submit 1 Booking" dynamic count on the New Booking button — nice touch, keep.

## Two real bugs, not just polish (fix these regardless of visual redesign)
1. **Desktop nav overflow.** On wider viewports the top nav wraps and the "Sign out" button and user name overlap/misalign (visible when Calendar is open at desktop width). Needs a structural fix, not a color change — see Navigation section below.
2. **Calendar legend looks disabled.** The "Booked / Awaiting / Closed" dot legend renders faded/low-contrast, like it's wearing a `disabled` or low-opacity class by accident. Should be full-contrast small text.

---

## 1. Design tokens

### Color — final direction (Claude-led, per your go-ahead)
You handed me the pen on this, so here's the actual call, with the reasoning: **keep the semantic conventions** (green=good, amber=pending, red=danger, blue=info/links) because that's a usability convention worth more than novelty — but **deepen every hue one step** from the bright, slightly generic tones the app was using, which reads more considered and less like an unstyled framework default. The one place I did add real personality is typographic, not chromatic — see below.

```js
// tailwind.config.ts -> theme.extend.colors
colors: {
  ink: '#14171A',
  approved: '#1E6B3C',   // deep pitch green — booked / win / positive / approve action
  pending: '#B45309',    // deep amber-gold — awaiting approval
  rejected: '#B91C1C',   // restrained red — cancelled / loss / delete / reject action
  info: '#2563EB',       // fixtures / away / links — kept as-is, blue-for-links is too strong a convention to fight
  neutral: '#6B7280',
  accent: '#6D28D9',     // admin-elevation, "my" personal sections, awaiting-count stat
}
```

| Token | Hex | Use |
|---|---|---|
| `ink` | `#14171A` | Navbar, primary buttons, page titles |
| `approved` | `#1E6B3C` | Booked, win, home fixtures, Approve button |
| `pending` | `#B45309` | Awaiting approval |
| `rejected` | `#B91C1C` | Cancel, delete, loss, Reject button |
| `info` | `#2563EB` | Away fixtures, links, info |
| `neutral` | `#6B7280` | Pitch closures, secondary/meta text |
| `accent` | `#6D28D9` | My Bookings, "Make Admin", the Admin Panel's "Awaiting" stat |
| Border | `#E5E7EB` | Card borders, dividers |
| Page background | `#F8F9FA` | App background |

A rendered preview of all of this against your actual card/button/badge patterns is in `sprint-8-style-preview.html` — open it in a browser, don't just read the hex codes.

**Multi-tenant readiness, without over-building now.** Since a white-label version is a "maybe, way off" possibility: define these as CSS custom properties in `globals.css` (`--color-ink`, `--color-approved`, etc.) and point `tailwind.config.ts` at them (`ink: 'rgb(var(--color-ink) / <alpha-value>)'`), rather than hardcoding hex directly in the Tailwind config. That's a ten-minute difference now, and it means a future per-club theme is a matter of swapping CSS variable values per tenant rather than a rebuild. Keep the semantic tokens (`pending`/`rejected`/etc.) fixed across any future tenants — those are UX conventions, not brand — only `ink`/`approved`/`accent` would realistically ever need to vary per club.

Every place a page currently reaches for a near-duplicate (`#2e7d32`, `#16a34a`, `#dcfce7`, `#f0fdf4`, `#f9ab2b`, `#9e9e9e`, `#888`, `#1f2937`...) collapses into whichever of the seven tokens above it was actually trying to be. Tints (light backgrounds behind a status card) can stay as Tailwind's `-50`/`-100` utilities of the nearest built-in hue since you don't need named tokens for those.

**One thing worth deciding, not assuming:** the Admin Panel's stat cards show a 4th metric, "Awaiting," separate from Pending/Approved/Rejected, currently sitting at 0. Confirm with yourself whether that's a genuinely distinct booking state worth a permanent card slot, or a leftover count.

### Typography
`globals.css` currently sets `font-family: Arial, Helvetica, sans-serif` — swap that for the system font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. No webfont to load, no performance cost, and it renders as each device's own native UI font (SF Pro on iPhone, Roboto on Android) — for a mobile-first club app on a free-tier budget, that's a better trade than a custom typeface most people won't consciously notice anyway. Sizes currently range 11–18px set ad hoc per element; collapse to:

| Role | Size | Weight | Example |
|---|---|---|---|
| Page title | 20px | 700 | "Fixtures", "My Bookings" |
| Section header | 14px | 700 | "Upcoming Fixtures" |
| Card title | 14px | 600 | Team names |
| Body | 14px | 400–500 | Card copy |
| Meta/caption | 12px | 400 | Dates, venue, competition |

**The one signature flourish:** match scores and the Admin stat-card numbers get `font-variant-numeric: tabular-nums; font-weight: 700; letter-spacing: -0.01em`. Everything else in the app stays quiet and disciplined — this is the one place worth spending a bit of visual personality, since it's a sports club app and its scores are the thing people actually care about. See it applied in the preview file.

### Icons — emoji → Lucide
Rule of thumb: swap emoji used **as functional icons** (nav, buttons, status, section headers). Leave genuinely decorative, conversational emoji alone — the 👋 in "Welcome back, Nicky Jacob" is fine as-is; stripping it makes the copy colder, not more professional.

| Seen as | Emoji | Lucide icon |
|---|---|---|
| Calendar (nav/dashboard) | 📅 | `Calendar` |
| My Bookings / New Booking | 📋 / 📁 | `CalendarCheck` |
| Fixtures | 🏟 | `Goal` *(a literal goal-net reads as "sport" more clearly than a building — ties into your own goals/points scoring language)* |
| Results | 🏆 | `Trophy` |
| Admin | ⚙️ | `Settings` |
| Stats | 📊 | `BarChart3` |
| Physio | 🏥 | `Stethoscope` |
| Pitch closure | 🔒 | `Lock` |
| Usage/login history | 📊 | `History` |
| Pinned notice | 📌 | `Pin` |
| Notice | 📢 | `Megaphone` |
| Dismiss notice | ✕ | `X` |
| Pending-approval alert | ⚠️ | `AlertTriangle` |
| Away fixture/booking | 🚌 | `Bus` (`info`) |
| Home fixture/booking | *(implied)* | `Home` (`approved`) |
| Neutral venue (Results only) | 🔄 | `Shuffle` (`neutral`) |
| Venue/address | 📍 | `MapPin` |
| Kickoff time | ⏰ | `Clock` |
| Win/Loss/Draw dot | 🟢🔴🟡 | drop the emoji circle — render an actual small `<span>` dot in CSS. Emoji circles vary by OS/font; a real dot doesn't. |

---

## 2. Shared components to build once
Building these first means every page after gets faster and more consistent — this is the highest-leverage work for a credit-limited weekend.

- **`Card`** — white bg, `rounded-lg`, `border-gray-200`, optional colored left border prop for status
- **`Badge`** — colored pill (Booked / Pending / Cancelled / Win / Loss / Draw / Home / Away), replaces the mix of dots, dashed borders, and emoji currently doing this job
- **`Button`** — primary (ink), outline, danger, ghost variants, consistent 44px min height for tap targets
- **`SegmentedControl`** — formalizes the black-pill toggle already used in 3+ places
- **`PageHeader`** — icon + title + subtitle + primary action button (the "Fixtures … + Add Fixture" pattern repeats on Bookings, Fixtures, Results)
- **`Modal`** — formalizes the reject/closure modal pattern
- **`EmptyState`** — formalizes the "No closures added" / "No notices yet" pattern already in use in Admin, ready to reuse anywhere a list can be empty
- **`IconTile`** — dashboard grid tile: icon in a colored rounded badge + label underneath, replacing the raw emoji tiles

---

## 3. Navigation

**Desktop nav fix:** `globals.css` currently just toggles `.nav-desktop-links`/`.nav-hamburger` display at the 768px breakpoint, with all 10 items forced into one `display: flex` row — that's the whole bug, there's no wrapping or grouping logic at all. Split into primary (Home, Calendar, Fixtures, Results, My Bookings) inline, and move the rest (New Booking, Physio, Admin, Stats, Settings) into a "More" dropdown next to the user menu. This directly fixes the overflow and gives you a component you can reuse for mobile.

**Mobile bottom nav bar** *(updated per your future-sprints doc — this locks in the 5-tab structure you already planned)*:

```
Home | Calendar | Club | Book | More
```

- **Club** consolidates Fixtures + Results into one tab now, so Sprint 10's RSVP work lands inside an existing tab rather than needing a new one later (likely a sub-tab/segmented toggle between Fixtures and Results inside the Club page). Icon: `Shield` — deliberately distinct from the dashboard's `Goal`-icon Fixtures tile, since today "Club" just placeholder-links to the same Fixtures page and needs to visually read as a different, broader thing rather than a duplicate.
- **Book** = New Booking. For `viewer` (read-only role), swap this slot for **Physio** or drop to 4 tabs (Home · Calendar · Club · More) rather than showing a booking action they can't use.
- **More** opens the existing hamburger drawer — don't rebuild that list, just trigger it from a second place. This is also where **Physio, Admin, Stats, and the new Settings page** (below) live going forward.

**Notification bell** *(new — prep for Sprint 9)*: add a `Bell` icon to the navbar now (desktop and mobile header), non-functional/no badge count yet. Wiring it to the Sprint 9 push subscriptions table is much less work if the UI slot already exists.

---

## 4. Page-by-page

**Login** — already fairly clean. Main inconsistency: dark navy background here vs. ink black + light gray everywhere else in the app. Recommend switching the backdrop to `ink` (`#14171A`) so the first screen someone sees matches the rest of the brand. Field styling (border, radius) should match the new form-field standard below.

**Home / Dashboard** — swap the 8 grid emoji for `IconTile`s (icon in a colored rounded badge). Replace the pending-approval ⚠️ with `AlertTriangle`, notice 📌/📢 with `Pin`/`Megaphone`. Keep the 👋 in the welcome line. Apply the new color tokens to the fixture/result preview cards (currently reads home/away and win/loss correctly already — just needs the token cleanup + icon swap).

**Calendar** — fix the faded legend (contrast bug, see above). On mobile, replace the dashed-border "pending" treatment with the new `Badge` component so it matches My Bookings' status styling instead of inventing a second visual language for the same state. On desktop, once the nav overflow is fixed, the week-grid view itself is a good layout — just apply tokens + icons.

**Fixtures** — swap 🚌/📍/⏰ for `Bus`/`MapPin`/`Clock`. Keep "Get Directions" as a solid blue button, just with a `MapPin` icon instead of the emoji. The large empty space below a single fixture isn't a demo problem right now since there's real data — when it does need an empty state, reuse the `EmptyState` pattern confirmed in the Admin Panel ("No closures added" / "No notices yet") rather than inventing a new one.

**Results** — replace the 🟢🔴🟡 + text combo with a proper `Badge` ("WIN" in white on an `approved` pill, etc.) — this is the single change that will make Results feel like a real sports app rather than a chat message. Swap 🚌 for `Bus`.

**Forms (New Booking / Add Fixture / Post Result)** — field styling is already fairly consistent; main gaps are tap-target height (bump inputs/selects to 44px min) and a visible focus ring (`focus:ring-2 ring-approved`) for accessibility and polish. The blue "repeat weekly" icon — confirm in Cursor whether that's already an SVG or an emoji; if emoji, swap for `Repeat`. Fixture cards: leave a little vertical room below the details block — Sprint 10 adds Attending/Declined RSVP buttons there, so it's worth not cramming the card edge-to-edge now.

**My Bookings** — closest to the target state already. Formalize the status dot + "Booked" text into the shared `Badge`, and restyle Edit/Cancel with the new `Button` outline/danger variants.

**Admin Panel** *(now confirmed from your screenshots)* — three real findings here, beyond the icon swap:

1. **The tab bar mixes two different jobs and it shows.** `Pending (6) / Approved (90) / Rejected (20)` are status filters *within* the Bookings view, while `Users / Closures / Notices / Results / Physio / History` are entirely separate sections — but they're all rendered as one flat row of same-weight pills that wraps to two lines. Worth restructuring into a primary section switcher (Bookings, Users, Closures, Notices, Results, Physio, History) with the Pending/Approved/Rejected filter shown only as a secondary control *when you're on Bookings* — same information, far less visual clutter.
2. **The Physio sub-filter already does something the main tabs don't: it fills the *selected* pill with its own status color** (solid green for "Approved (1)") rather than turning black like every other selected tab. That's a nicer pattern than what the main tabs do — worth applying consistently everywhere: a selected tab fills with *its own* token color (pending/approved/rejected/info/etc.) instead of defaulting to `ink` regardless of what it represents.
3. **The bar-chart emoji is reused for two unrelated things** — "Pitch Closures" and "Usage & Login History" both use 📊, which confirms exactly why this needed a proper icon pass: swap Pitch Closures to `Lock` and History to `History`, so they stop looking like the same feature.

Also: `EmptyState` isn't something to build from scratch — "No closures added" and "No notices yet" show it already exists as a simple centered-text pattern. Just formalize the one you have into a shared component rather than treating it as new work.

The reject/closure modals are already good — just point them at the shared `Modal` component. Approve (green) / Reject (red) / Edit (outline) buttons on pending bookings already match the `approved`/`rejected` tokens exactly — no change needed there, good confirmation the plan fits reality.

**Pitch identity vs. status — a color collision to design around.** Booking cards (Admin, Calendar, My Bookings) color the *pitch name itself* (e.g. "Main Pitch" in green, "Training Pitch" in blue) using a separate `pitch_colour` field, completely independent of the status border color on the same card. That's a second legitimate color dimension, not a bug — but colored running text next to a colored border risks reading as two conflicting status signals. Recommend keeping status as the border/badge (as now) and representing pitch identity as a small colored dot + plain-color label instead of colored text, so the two systems don't visually compete.

**Settings / Profile page** *(new — this is a Sprint 8 deliverable per your future-sprints doc, not just a redesign of something existing)* — a new, simple page that **Calendar Sync moves into**. Keep it minimal this sprint: user's name/email (read-only or basic edit), the existing Calendar Sync content, and a sign-out action. Leave visual room for what lands later without building it now — Sprint 9 adds notification preferences here, Sprint 11 adds the team/age-grade default. A single-column list of settings "rows" (label + control, divider between) is the simplest pattern that scales to both.

---

## 5. Suggested build order (maps to your git workflow)

Steps 1–6 are the highest-visibility, do these first if Cursor credits run tight before Aug 30:

1. `design: tokens` — extend `tailwind.config.ts` (`ink`/`approved`/`pending`/`rejected`/`info`/`neutral`) + tidy `globals.css`. `lucide-react@0.383.0` is already installed, nothing to add there.
2. `design: shared components` — Card, Badge, Button, SegmentedControl, PageHeader, Modal, IconTile
3. `redesign: navbar + mobile bottom nav` — fixes the desktop overflow bug, adds the Home/Calendar/Club/Book/More bottom bar + notification bell icon
4. `redesign: dashboard`
5. `redesign: calendar` — including the legend contrast fix
6. `redesign: fixtures & results` — consolidate into the single "Club" tab/page with a Fixtures/Results segmented toggle inside it
7. `redesign: booking & result forms`
8. `redesign: my bookings`
9. `redesign: admin panel`
10. `feat: settings page` — new page, move Calendar Sync into it
11. `redesign: login`

Each is one commit, build + mobile test before the next, per your existing rules.

---

## Backlog — small fixes for later (not blocking current progress)
- **Data entry, not code:** the U12 vs Gaultier fixture is tagged Away despite the venue being St. Saviours' own ground — looks like a mistake made when that fixture was entered, not a display bug. Fix directly in the app (edit the fixture to Home) whenever convenient.
- **Unconfirmed:** whether "Home" renders in `approved` green on the Results page to match "Away" rendering in `info` blue — asked, not yet confirmed. Quick visual check next time you're on that page, not urgent.
- **Unconfirmed:** Fixtures/Results at narrowed/phone width after the Step 6a icon changes — not yet checked. Worth a glance next time you're testing mobile generally, doesn't need a dedicated check on its own.

## Still open
- Confirm whether the Admin Panel's "Awaiting" stat is a real, ongoing metric or can be dropped — see color section above.
- Physio and Stats keep their current internal layout this sprint — they just move behind the "More" menu, not a full visual redesign.
- Session Plan is explicitly deferred past Sprint 8 per your note.
- Calendar Sync is no longer "deferred" — it's moving into the new Settings page (see Section 4), which is itself a small new build, not a redesign of something existing.
- Admin tab-bar restructuring (Section 4) is a bigger change than the rest of the polish pass — worth its own commit separate from the rest of the Admin Panel redesign in case it needs more back-and-forth.
