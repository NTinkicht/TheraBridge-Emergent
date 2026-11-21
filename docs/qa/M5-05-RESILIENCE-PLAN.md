# M5-05 · Resilience and blocked-state browser qualification

**Work unit:** M5-05-R2, successor to merged PR #403 (`76146d5031730920ede638d7dd3e990f69297744`). **Status: PLANNING / NOT IMPLEMENTED / NOT TESTED.**

## Scope
Extend the existing isolated synthetic, feature-flagged Child 360 Chromium acceptance harness, not the clinical API or production app, to measure:
- 320/390/768/1024/1440 viewport behavior under slowed, authorized clinical-workspace requests, preserving the loading skeleton and avoiding stale cross-child content
- Synthetic 503/connection-error response for clinical workspace: visible failure state, safe explicit retry, no unauthorized/previous-child data exposure, no implicit clinical operation
- Explicit coordinator/unauthorized blocked workspace with zero clinical tab panels and unchanged backend permission
- Interrupted family practice feedback must remain non-clinical and separately retryable; supervisor must never acquire that request
- Browser keyboard controls and role-specialty scope remain intact after recovery

## Evidence contract
- CI only: `DEPLOYMENT_ENV=ci`, PostgreSQL `*_demo_test` on loopback, static synthetic seed, build-time `NEXT_PUBLIC_M5_CHILD_COMPACT=true` only within the dedicated job
- No screenshots, raw clinical strings, passwords, cookies, or patient payloads persisted
- PASS / FAIL only with observed browser assertions on exact head; until implemented: **NOT RUN**
- Human screen-reader and UX review **NOT OBTAINED**; clinical G2/G2b **NO-GO**; feature flag remains **OFF** outside synthetic CI

## Exit criteria
Source/browser adversarial tests and existing full CI green; Rule 7 handover files updated on implementation; all reviewer comments dispositioned; independent Codex review of exact head; no production flag activation. Issue #188 remains open for visual/manual/owner acceptance.
