# M5-03 — Permission-aware grouped app shell and mobile navigation (first engineering tranche)

**Status:** source implementation in review, not visual/accessibility acceptance. Tracks [#186](https://github.com/NTinkicht/TheraBridge-Emergent/issues/186), builds on the eight-area proposed M5-02 model merged in [#387](https://github.com/NTinkicht/TheraBridge-Emergent/pull/387).

## Implemented application behavior

1. **Desktop 768–1440 px:** the ProductShell sidebar displays task areas in the exact eight M5-02 categories: Today & workspace; Children & care; Sessions & activities; Family & home; Center operations; Scheduling & messages; Safety & governance; Account & access. Every group contains only existing `NAV` entries authorized by current `session.permissions`. Active group and Home expand by default, and native disclosure summaries allow collapse without suppressing destinations.
2. **Desktop compact rail:** explicit 44px-minimum collapse/expand button. Compact rail uses icon links with screen-reader names and title hints. It still exposes all authorized routes and never writes role or center context into localStorage/sessionStorage.
3. **Breadcrumbs:** lightweight authorized current task-area context and a safe Home link. Does not claim deep child/specialty hierarchy or establish new route entitlements.
4. **Mobile 320–767px:** a three-destination permission-filtered bottom bar and a More action showing every authorized destination grouped by task area. More uses a dialog with initial focus, Tab/Shift+Tab wrap, Escape dismissal and focus return to the trigger, plus explicit close and backdrop controls. When a session has multiple workspaces, the existing switch-workspace route is offered only in that case. Existing top mobile select remains visible as a backward-compatible destination picker until its separately approved migration.
5. **Family mode:** continue using the accepted `theme-family-auto` Direction B tokens. No change to guardian-controlled API/child grants, unsigned clinical actions, or role permissions.

**Authorization boundary:** these are presentation-only links; existing server/route policies govern actual access. `groupAuthorizedNav` fails closed on unknown or duplicate `key|permission` identities and refuses stale group mapping. Center Activities and Family Activities both use `/app/activities` but remain separately permission-bound in different task areas. No CSS-only hiding used as authorization.

## Runnable evidence

- Source tests: `node --test scripts/design/m5-shell-navigation.test.mjs` compares all 20 current ProductShell permission identities and eight task assignments to the merged M5-02 canonical 66/91 navigation design, guarding against drift.
- Seven-role CI Chromium test: extend `scripts/design/m5-keyboard-journey.mjs` to directly collapse/re-expand desktop rail, focus mobile select and verify Shift+Tab, open More with Enter, compare **each actual More link** with current `/api/auth/session` granted permissions against the literal source NAV, verify bounded quick-link set, keyboard focus wrap, Escape-close and focus return, then keyboard-sign-out.
- This is a narrow synthetic navigation audit, **not** an accessibility certification or full human task usability assessment. Session permissions are used only in process; artifact stores numeric/enums only. No screenshots or DOM text archived, and G2/G2b clinical gates remain NO-GO.
- Required before merge: six original exact-head CI jobs including sustained nonroot preview load, Smart CI, SBOM, zero unresolved final-head Codex review.

## Outstanding M5-03 work

Responsive before/after screenshots inspected by a person; screen-reader announcements and focus-visible manual verification; low-bandwidth and dark-mode checks; route-level breadcrumbs for dynamic child/center context; high-fidelity task menus and search; avoiding dual mobile picker after safe migration; tested context switching in the More panel; center-child-specialty switchers with revoked access; real five-task-per-role metrics and owner UX signoff. The canonical 1,023 historical workflow-step linkage under #266 remains unresolved and is not inferred from this navigation PR. Keep #186 OPEN until these are qualified. No shared hosted Render/Neon changes.
