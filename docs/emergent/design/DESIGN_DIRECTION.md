# Design direction v1: "Calm Precision, with warmth at home"

Status: **ACCEPTED by owner as the official V1 design baseline** (2026-10-20, after independent review of screenshots and source). Apply it to every V1 screen; do not create competing systems. Layouts and interaction patterns may be refined within this system.
Preview: `/design-preview` (Next.js, `apps/web/src/app/design-preview/**`). All data comes from synthetic fixtures in `apps/web/src/lib/design/fixtures.ts`; nothing is read from or written to the API.

## Principles
1. **Calm precision for clinicians and admins.** The interface is dense but quiet. It relies on borders more than shadows, uses tabular figures for every number, and uses one blue (`#0F5692`) for all actions and selections.
2. **Warmth for families.** The family screens use the `#FAF8F5` canvas, larger type (28–34px greeting), softer 16px radii, teal (`#0A7385`) accents and fewer choices per screen. The family dark theme is a complete official-palette mode, kept per browser and switchable with `?theme=dark` for review.
3. **One honest system.** Every role uses the same tokens and components.
   - A locked action always shows its reason as visible text, not only a tooltip.
   - Nothing reports saved, approved or released unless the server has confirmed it.

## Tokens (single source: `apps/web/src/styles/tokens.ts`)
- Official values are unchanged.
- Complementary additions:
  - Status: `status.successSurface`, `status.info`, `status.infoSurface`.
  - Specialty tags: `specialty.*`. These always appear with a text label.
  - Family theme: the semantic slots `border`, `warm` and `accentHover`.
- Family light/dark themes are exposed as `--fam-*` CSS variables through `.theme-family-light` / `.theme-family-dark`, and as the Tailwind colors `fam.*`.
- Violet appears only as a brand accent (the "Fictional record" pill, signature band). It is never used for selection.

## Typography (owner decision, r2)
- **Headings (h1–h3, `font-display`): Plus Jakarta Sans 600/700.**
- **Body, forms, clinical data, tables and numbers: IBM Plex Sans.** Numbers use tabular figures (`.tnum`), and metric values are deliberately set in Plex.
- Both faces are defined once in `tokens.ts` (`typography`, which emits `--font-display` and `--font-body`) and applied through Tailwind (`font-sans`, `font-display`) and the base styles in `globals.css`. The earlier Type comparison control has been removed.
- Sizes:
  - Page title: 31px desktop / 25px mobile.
  - Section title: 20px.
  - Card title: 17–18px.
  - Body: 15–16px.
  - Labels: 13–14px.
  - Metadata: 12px.

## Revision r2 changes
- **Platform metrics** and Pending/Decided counts follow every preview data state:
  - Loading: skeleton.
  - Empty: 0, with empty-state subtitles.
  - Error: an em dash plus a retry hint.
  - The trial alert shows only when data is populated.
- **`ScrollStrip` scroll cues:** edge fades plus 44px chevrons whenever a strip overflows. Used on child tabs, the specialty switcher and the preview screen links. Child tabs support Arrow keys plus Home/End and scroll the focused tab into view.
- **No family dark-mode flash:** an inline script sets `<html data-family-theme>` before first paint, and `.theme-family-auto` reads it. The logo chip and the Sun/Moon icon switch through CSS.
- **Accessibility:**
  - The focus ring follows the surface (`--focus-ring`: blue for clinical, teal for family light, `#5CCFDB` for family dark, `#7DB3E8` on the preview bar), keeping at least 3:1 contrast.
  - The More sheet moves focus into the sheet, traps Tab, and returns focus to its opener on close.
  - The family dark theme has its own success, caution and error-state colors.
- **Dates and greetings** come from the client clock after mount (`useNow`), so there are no server/client hydration mismatches. The greeting changes with the time of day.
- **320px alignment fixes:** grid min-widths, wrapping pills, provider rows.

## Revision r3 polish (post-acceptance)
- Desktop platform (≥1280): Operational events sit under Center applications in the wide column; Trials & restrictions sits alone in the narrow column. Cards no longer stretch to match their neighbour's height.
- Desktop family (≥1280): Your week together sits under Today's activity; Next appointment and the therapist message stack in the narrow column. Cards keep their natural height.
- Activity names on mobile wrap instead of being cut off with an ellipsis.

## Shell
| Width | Behavior |
|---|---|
| ≥1280 | 254px sidebar (signature band, logo, center/role switcher, nav, collapse) |
| 1024–1279 | Starts as a 76px icon rail; expands on demand |
| 768–1023 | Icon rail; content in 1–2 columns |
| <768 (390/320) | Top bar with page title, notifications and account; bottom nav with 4 items + More sheet; 16px padding |

- Selected navigation item: tinted background, 3px left indicator, colored icon and label. Clinicians and admins use blue; families use teal. Mobile shows a tinted pill around the icon.
- The logo is a raster that is valid only on light surfaces. On dark surfaces it sits on a white chip.

## Shared components (`apps/web/src/components/design/`)
- **`AppShell`:** sidebar, rail, top bar, bottom nav, More sheet, notifications/account popovers and the family theme toggle.
- **`PageHeader`:** breadcrumbs, title and context line.
- **`Card`, `CardHeader`, `Metric`, `Meter`:** includes the warn, limit and planned meter states.
- **`Pill`, `SpecialtyTag`, `Avatar`:** avatars show initials, never photos of real people.
- **`Button`, `LockedAction`.**
- **State components:** `Skeleton`, `EmptyState`, `ErrorState` (with retry), `AccessDenied`, `Dialog` (native `<dialog>`, so focus is managed), and `StateGate`, which drives the preview "Data" control (populated / loading / empty / error).

## Representative screens
| Route | Purpose | Notes |
|---|---|---|
| `/design-preview` | Direction, tokens, type, component and state gallery | |
| `/design-preview/platform` | Platform dashboard | KPIs, application queue (pending/decided tabs, review dialog with locked decisions), trials & restrictions, filterable event timeline (metadata only) |
| `/design-preview/center` | Center admin (Cedar Grove, trial day 27/30) | Trial banner, usage meters (therapist seats 3/3 incl. pending; children marked **Planned**), onboarding checklist, staff with multi-specialty tags, revoke confirmation, upcoming sessions |
| `/design-preview/therapist` | Therapist daily view (Leila, Speech + OT) | Specialty switcher (Speech default, OT, explicit All). Only that specialty is shown. Timeline/list views, selected-appointment panel, locked start-session |
| `/design-preview/child` | Child workspace (Alex) | Context header ("Fictional record", no diagnosis), working-as specialty, 10 keyboard-navigable tabs. Progress shows recorded values and states that there is not enough data for a trend. Sign and release are locked; evidence capture is disabled; there is an access-denied example |
| `/design-preview/family` (+`?theme=dark`) | Parent home | Greeting, child context, today's activity and step dialog (outcomes are **not saved**, and it says so), next appointment, therapist message, day chips on desktop and stacked cards on mobile. A scenario switch shows today's policy, where nothing is released |

## Deliberate deviations from the generated guideline file
- No "primary diagnosis" in the child header and no "compliance score". Both would invent clinical or operational facts.
- Initials instead of stock photographs, because these are fictional people.
- Discrete four-color signature band instead of a gradient (blueprint 2.4).

## Known limitations of the preview
- Navigation items outside the five screens show a notice instead of navigating.
- The family plan is shown as an *illustration* of a future approved release. Release is disabled in TheraBridge, and the scenario switch shows the honest current state.
