# M4-CLOSE-02 — Controlled two-valid-tenant and ten-account acceptance
**2026-11-15 · implementation checkpoint; final hosted acceptance NOT QUALIFIED**

## Verified external state
Render service `srv-dbdbelfavr4c739ftdsg` (`therabridge-ahmed-synthetic-demo`) remains LIVE on deployment `dep-dboe7k8u01pc73f0p210` with Git SHA `3cdd7226236a6aa7b3f82e04f1d26b9b5bce0b93` (first deployed 2026-11-08). Its branch `chatgpt/tb-em-018-hosted-demo-activation` has automatic deployment **off**; it is **not** the post-#372 `main` commit. This fact was confirmed from the connected Render control plane on 2026-11-15. This PR does NOT deploy, change its branch, change secrets, or modify the shared database.

The previous [protected workflow 42605446171 attempt 2](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42605446171) exercised the seven original and three extra synthetic roles with 84 PASS / 0 FAIL / 14 BLOCKED. It cannot establish protected ten-account acceptance of the current Git HEAD or two independently valid hosted centers. The 14 explicitly disabled governance interactions remain BLOCKED, not PASS.

## Implemented in this PR (test-only; CI outcome pending)
1. `apps/api/test/m4-close-02-two-valid-tenant.e2e-spec.ts` creates two **distinct existing active centers** and real synthetic admins, therapists, children, memberships, assignments and login sessions against the project's guarded `*_test` PostgreSQL database. It exercises authorized access in both centers, cross-center and foreign-child authorization denial (while preserving live sessions), suspended membership with stale assignment, and one expired session without affecting the other tenant. This is executable synthetic **integration evidence**, not hosted acceptance.
2. `scripts/qa/m4-acceptance-evidence.mjs` now rejects legacy `twoTenantEvidence` shaped as eight booleans. Structured schema v2 requires both valid centers, an exact shared protected-run identity, a disposable fixture, operator-approved SHA, and eight distinct status-bearing checks with positive 200 / forbidden 403 or 404 / expired 401 semantics. Negative tests cover omissions, duplicates, downgrade to 401 and impersonated evidence. *A structurally valid JSON remains an assertion, not independent cryptographic/Render attestation.*
3. No modifications to application runtime, credential management, clinical signing/consent/release/safeguarding, published migrations, Render service or synthetic shared demo.

## Remaining protected hosted checks for #176 and #268
- Obtain explicit operator authorization and protected-environment approval to run `.github/workflows/hosted-interactive-private.yml` on **main** with the ten existing private synthetic credentials; never print, copy, or rotate them.
- Independently corroborate the *actual live Render deployment SHA* before accepting an operator-input SHA. Today it differs from current merged main; no equivalent hosted-final-head claim can be made.
- Provision two **valid isolated disposable hosted synthetic centers** (not fabricated/nonexistent UUIDs) with guardian, staff and therapeutic scope; no shared demo mutations or real patients. Exercise authenticated positive, denial, guardian withdrawal, membership suspension, session expiry, prior-session invalidation and cache/CSRF boundaries. The actual platform operator must approve isolation and clean-up.
- Capture sanitized per-probe receipts tied to the same protected GitHub run and independently verified deployment; do not upload cookies, secrets, raw messages, clinical text, child IDs or identifying data.
- Obtain review and owner acceptance of remaining BLOCKED/policy exclusions. `G2/G2b` remain NO-GO; do not count test-only receipt schemas as real hosted proof.

**Exit decision:** #176 / #268 / M4 epic #167 stay OPEN. No production or clinical release approval. Full new PR CI, source-level two-tenant tests and independent Codex review must be checked before merge.
