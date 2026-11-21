# M5 WU3 — Guardian, accessibility and WU2 qualification ledger
Date: 2026-11-17 · Implementation and test execution require exact-HEAD evidence.

## Code streams
- M5-09 guardian: single focused authorized sibling, family quick tasks scoped by session grants, exact child booking/reminders, family light/dark automatic first-paint CSS and truthful non-clinical sample labels.
- M5-10: tab semantics (including RTL), skip-to-main landmark, robust focus, mobile record cards, 44px control goals, reduced motion and linear/bounded operations on clinical chart and calendar data.
- M5-04, M5-06/07/08 acceptance: unit + five-width browser synthetic qualification for therapist/coordinator/supervisor; existing seven-role browser audit still runs unchanged.

## Privacy and safety constraints
- Browser only with DEPLOYMENT_ENV=ci and local *_demo_test PostgreSQL; ten random in-memory demo passwords; no external account or clinical data.
- Scope: authorization and tenant checks are always server-side; UI does not invent child assignments, attendance, approved plans, signed reports or family-released documents.
- Synthetic family-release HTTP gating remains authoritative, as do revoked access, child association and consent; family messages are never made accessible to supervisors by this UI.
- G2/G2b clinical NO-GO is unchanged; never mark a saved internal draft as signed or released.
- Browser screenshots are hashed in memory, not exported; only role ID, route, viewport width, PASS/FAIL technical states and 64-hex SHA-256 screenshot fingerprints can enter the numeric CI artifact.

## Automated evidence acceptance (source-executing)
1. Required CI includes all existing full modes: API/Web coverage and builds, SBOM, secret scan, commercial evidence/contract shards, source contracts, real seven-role browser, Child 360 browser, Compose, sustained 10-minute 512MiB preview and final Smart CI gate.
2. WU2 browser receipt `/tmp/therabridge-m5-wu2-browser-qualification.json` has exactly 15 observations: 3 roles × widths 320/390/768/1024/1440, exact authorized route, settled content markers, no horizontal overflow, keyboard skip link, correct role, no private screenshot bytes. Missing or wrong role/width, duplicate, sensitive key, route denial, overflow, inaccessible skip and clinical-approval claim cause failure.
3. Guardian source-mounted cases include three siblings, sibling-scoped reminders and no inactive sibling details; revoked link/empty state; restricted quick actions; persisted dark-mode CSS without a first-paint JavaScript dependency.
4. Shared design cases exercise a semantic mobile record card alternative and accessible desktop table, RTL Arrow/Home/End tabs, focus landmark, reduced motion, bounded calendar layout and version-accurate progress summaries.

## Human acceptance work — separate, not automatically authorized by CI
- Five widths: capture and manually inspect actual *redacted* screenshots for guardian light/dark and therapist/coordinator/supervisor. Hash-only browser captures are **not** visual approval.
- Run keyboard-only and screen-reader tests (NVDA/VoiceOver), 200% zoom, RTL, WCAG 2.2 AA contrast, 320px no horizontal overflow, slow network, error/loading/empty/blocked states.
- Time representative role tasks against M5-01 baseline with recorded participant/task-level numerator, 95% completion and 30% median time targets only when actual evidence exists. No benchmark result is currently asserted.
- Verify guardian 3-sibling selected/permission-revocation states on the hosted synthetic preview and absence of dark flash for OS light/dark. Need real manual observation.
- Do not close M5-04 or M5-06/07/08/09/10 or activate flags until exact-head CI, independent code review and manual acceptance receipts satisfy each issue's DoD.

## Status (at document creation)
Implementation under active PR qualification. Required CI, independent Codex final-head reviews and human acceptance: **PENDING / NOT RUN**. No production release.
