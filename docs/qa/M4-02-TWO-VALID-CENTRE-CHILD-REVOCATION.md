# M4-02 — Two-valid-center child and session-revocation qualification (2026-11-09)

Parent [#176](https://github.com/NTinkicht/TheraBridge-Emergent/issues/176); acceptance follow-up [#268](https://github.com/NTinkicht/TheraBridge-Emergent/issues/268).

## Existing, verified evidence — do not rerun as if unimplemented
- Protected hosted interactive run [#42605446171, attempt 2](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42605446171): private preflight PASS, seven primary roles **54 PASS, 0 FAIL, 14 governance BLOCKED**, three additional therapists **30 PASS, 0 FAIL, 0 BLOCKED**. Overall workflow FAILURE by fail-closed BLOCKED semantics; sanitized artifact 13667997672. The 14 clinical restrictions must not be reclassified or enabled.
- Existing `apps/api/test/authz.e2e-spec.ts`: two genuinely valid PostgreSQL centers, own summary 200 / opposite 404, active membership/context selection and session rotation, membership suspension/revocation/role removal immediate deny.
- Existing `apps/api/test/auth.e2e-spec.ts`: 30-minute idle/12-hour absolute expiry, logout, token/cookie invalidation, disabled account; `apps/api/test/parent-scheduling.e2e-spec.ts`: guardian messaging revoked on link removal, including a concurrent write race; `family-release.e2e-spec.ts`: guardian consent/grant withdrawal.
- Independently **read-only** Neon branch verification: project `aged-fog-03608251`, isolated disposable branch `br-raspy-sound-baxyuq2a`, database `therabridge_demo_m3_preview` has two **ACTIVE** distinct synthetic centers: `childrens-home-demo` (6 children, 9 active memberships) and `m4-disposable-second-centre` (1 child, 1 active membership). No SQL mutation to hosted primary or isolated branch.
- Live Render service `srv-dbdbelfavr4c739ftdsg`, deployment SHA `3cdd7226236a6aa7b3f82e04f1d26b9b5bce0b93` is **not** GitHub current main SHA; don't conflate runner head and deployed SHA.

## New executable real PostgreSQL regression
`apps/api/test/authz.e2e-spec.ts`: create two valid centers and **one real child in each**; authenticate two different admins, require positive own-child 200, deny opposite actual-child ID when used within own tenant 404, deny opposite center route 404. Repeat all negative routes twice to catch stale-cached access. Revoke one membership while old session remains, verify immediate denial and repeat-login no active contexts; unaffected other-center admin retains positive 200. No synthetic account credential or child detail is emitted in CI artifacts.

## CI and independent review
All six exact-head CI jobs (test, secret-scan, live-session, preview-container, demo-journey, compose), Smart CI gate and final-head Codex MUST complete before merging. This document is an implementation plan until real CI passes; don't mark the new regression PASS based solely on source review.

## Explicit acceptance not yet met
- Protected ten-account hosted login is evidenced as above, but final HA-01…HA-10 **hosted acceptance** is incomplete because 14 authorized clinical-policy checks are BLOCKED.
- Authenticated two-valid-center **hosted application** exercised against isolated Neon branch has not been run. This PR tests genuine, *disposable PostgreSQL*, not the prepared Neon branch's hosted endpoint.
- Live guardian custody withdrawal and expiry with protected QA role credentials are not approved to mutate shared demo; existing disposable tests demonstrate security semantics only.
- Independently attested live Render deployment SHA remains separate from the GitHub runner checkout SHA.
- Do not close #176/#268 until each remaining hosted/release-dependent criterion is evidenced or explicitly owner dispositioned; no clinical activation, consent/sign/release/AI/STT or real patient data. G2/G2b and D-NEW-5 remain NO-GO.
