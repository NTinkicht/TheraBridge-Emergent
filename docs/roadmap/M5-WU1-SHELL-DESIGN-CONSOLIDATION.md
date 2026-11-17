# M5 WU1 — Shared shell + design patterns consolidation

**Tracks:** [M5-03 #186](https://github.com/NTinkicht/TheraBridge-Emergent/issues/186) and [M5-04 #187](https://github.com/NTinkicht/TheraBridge-Emergent/issues/187).
**Scope:** one combined PR on current main. This document is a qualification ledger, not a declaration of owner acceptance.

## Existing merged baseline preserved

- #393 grouped eight-area permission-filtered application shell, collapsible desktop rail, mobile quick navigation/More, and seven-role Chromium journeys.
- #395 controlled WorkspaceTabs, DisclosureSection, TaskStepper, CompactTable, and family semantic theme.
- #396/#401/#403/#406/#410 Child 360 feature-flagged work; no changes to clinical API grants or G2/G2b gates.

## This PR

1. Add **desktop and mobile contextual destination search** over the already filtered current-session navigation groups. Search does not fetch or expose any unavailable routes. A no-match status is visible, and searching expands matching desktop task areas. Clearing search restores the exact authorized set.
2. Keep the **workspace switcher available in the collapsed desktop rail**, but only when the current session actually exposes multiple contexts. The expanded switcher and mobile More switch route remain as before.
3. Reset search/drawer/accordion state when the active session role or center context changes, and clear mobile search when dismissing a menu or following one of its destinations.
4. Include search inputs in the mobile dialog's keyboard focus cycle.
5. Harden **WorkspaceTabs ARIA** so inactive/disabled tabs do not reference a panel that is intentionally not mounted, and add visible focus outlines to tabs, disclosure summaries and scrollable compact tables.
6. Extend static and real synthetic Chromium assertions for destination search, no-result empty state, clearing/restoration, and ARIA active-panel references.

## Acceptance ledger

| Requirement | Evidence now | Status |
| --- | --- | --- |
| Eight-area permission-filtered desktop/mobile shell | Existing merged #393 + current tests | Implemented; retain regression |
| Authorized destination find | This PR, source + synthetic browser regression | CI pending |
| Collapsed rail context switch | This PR, visible only for multiple contexts | Manual context transition pending |
| Workspace pattern accessibility hardening | This PR, Jest source-mount assertions | CI pending |
| 320/390/768/1024/1440 automated synthetic browser | Existing seven-role M5 baseline, CI regression | Fresh exact-head CI pending |
| Actual center/child/specialty context switch with revoked grants | Requires scoped integration/human acceptance | NOT RUN |
| Real native screen readers and manual keyboard audit | Human acceptance needed | NOT RUN |
| Privately inspected before/after screenshot set, family dark/low bandwidth | Human visual acceptance needed | NOT RUN |
| Five actual tasks per role and owner time-to-task comparison | M5-11 benchmark | NOT RUN |
| Feature-flag rollout and production clinical approval | Separate governance decisions | NOT AUTHORIZED |

**Exit discipline:** Do not close #186/#187 solely on this PR. Confirm six exact-head CI jobs, Smart CI, SBOM and independent Codex review before merging. Completion of the remaining human/accessibility and context-switch requirements must be evidenced, not inferred. Continue to treat G2/G2b as NO-GO; synthetic-only QA. No Render/Neon changes, no permission widening, no clinical signing/release/AI activation.
