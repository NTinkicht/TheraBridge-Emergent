# M4-CLOSE-02 — Protected hosted execution readiness (2026-11-15)
**Status: CONTROL-PLANE PREFLIGHT IMPLEMENTED; PROTECTED EXECUTION NOT RUN.**

## Existing baseline and environment
- Shared synthetic Render service: `srv-dbdbelfavr4c739ftdsg`, URL `https://therabridge-ahmed-synthetic-demo.onrender.com`, autoDeploy OFF. The latest observed LIVE deployment commit in Render was `3cdd7226236a6aa7b3f82e04f1d26b9b5bce0b93` (2026-11-08). This is **not** current `main`, so it cannot qualify current-head hosted acceptance.
- Render workspace `NTinkicht` contains no Postgres instances and no separate TheraBridge disposable test service at the time of inspection. Creating a free shared-demo replacement, silently changing the live service's branch, or testing membership revocation on its data is **not authorized**.
- Previous protected ten-account workflow: run `42605446171` attempt 2; 84 PASS / 0 FAIL / 14 policy BLOCKED. It does not prove two *existing* independently valid centers or current deployment SHA.
- PR #374 merged the isolated `*_test` real-Postgres two-center suite. This tests real authorization predicates and session revocation, not a hosted deployment.

## New protected preflight
`.github/workflows/hosted-interactive-private.yml` now invokes `scripts/qa/hosted-render-attestation.mjs` **before** reading seven- and three-role private credentials. It needs an environment secret **name only** `TB_HOSTED_RENDER_READONLY_API_KEY`; the key must have read-only permission to get the approved synthetic Render service and its deploy listing. **Never** copy the key into Git, an issue, CLI argument, PR comment or artifact.

The verifier uses GET on the fixed Render API service endpoint and GET on its deployment list. It rejects: missing secret; non-40-hex or stale user SHA; a checkout SHA different from operator input; wrong repository/service/autodeploy identity; absent, ambiguous or non-latest LIVE deploy; or a LIVE deploy whose commit differs from the exact GitHub checkout. It logs only synthetic allowlisted failure codes or a sanitized, narrow success receipt. Unit tests use mocked Render responses and exercise failures without network.

**Note:** Successful attestation proves a live SHA for the approved shared Render service only; it is not proof of source/runtime configuration integrity, two-tenant hosted execution, or clinical approval. Running the ten-account read-only workflow with the present old deploy will intentionally **BLOCK** against current `main`.

## Actual protected hosted M4-02 closure: dependencies still unmet
1. Authorized operator provides a separately isolated disposable hosted QA stack backed by a separate `*_test` Postgres database, with **two genuinely existing and active synthetic center tenants**, supported positive controls, therapist, guardian and synthetic children; no shared demo changes.
2. Operator verifies and records the exact current live SHA using independent Render control plane evidence and approves the protected GitHub environment.
3. Operator configures read-only Render API access in protected environment (secret **name only** above) and protected existing ten-role QA credential secret names `TB_HOSTED_QA_USERS_JSON` and `TB_HOSTED_QA_EXTRA_USERS_JSON`. No real users and no credential rotation.
4. Execute protected workflow on approved main with ten accounts. Generate same-run sanitized positive/negative receipts and complete the 8-step two-valid-tenant schema, including guardian withdrawal and expired session, **against the separate isolated environment**. Current `hosted-interactive-private.yml` is hard-coded to the old shared-demo URL and **must not** be misrepresented as a disposable two-tenant runner.
5. Capture reviewer/owner sign-off and exact workflow run/deployed SHA; preserve governance-only cases as BLOCKED. Keep #176/#268 and epic #167 OPEN until performed; G2/G2b NO-GO.

## Evidence classification
| Evidence | Status |
|---|---|
| New read-only control-plane preflight / negative unit tests | IN PR, CI PENDING |
| Protected environment secret `TB_HOSTED_RENDER_READONLY_API_KEY` exists | NOT VERIFIED |
| Old shared demo corresponds to current `main` | FALSE |
| Separate disposable two-valid-tenant hosted fixture | NOT PROVISIONED |
| Latest-main protected ten-account login run | NOT RUN |
| Live guardian withdrawal, authenticated cross-tenant denial and expiry | NOT RUN |
| Clinical G2/G2b approval | NO-GO |

No workflow, tool or operator can claim M4-02 acceptance merely by setting `operatorApproved=true` in a JSON receipt.
