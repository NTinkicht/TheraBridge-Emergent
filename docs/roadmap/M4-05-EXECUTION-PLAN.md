# M4-05 — HTTP, account and session security hardening

**State:** DRAFT EXECUTION PLAN / NOT IMPLEMENTED / NOT REVIEW-QUALIFIED. **Roadmap issue:** [#179](https://github.com/NTinkicht/TheraBridge-Emergent/issues/179). **Baseline:** main after M4-02 merge `8174a87ed27e2424500f64256742ab134f15fa3d`.

## Parallel ownership boundary

apps/api/src/auth/**, apps/api/src/common HTTP middleware, proxy/cookie/error policy, associated auth/security tests; EXCLUDE seed-demo.ts

**Dependencies and conflict controls:** Independent of M4-03 seed credential generator. Coordinate with M4-04 on shared guard interfaces; avoid clinical domain route and CAS mutation files.

## Required deliverables

- [ ] Verify protected Cache-Control no-store/Pragma and no accidental sensitive response caching
- [ ] Harden login/password-change abuse limits, enumeration, lockout DoS and password policy
- [ ] Audit proxy trust, CSRF, SameSite/Secure/HttpOnly cookie handling, GET-side mutations and API error normalization
- [ ] Add positive/negative tests for stale tokens, malformed requests and user revocation

## Acceptance and quality gates

- [ ] Verify current merged behavior before changing code; do not rebuild closed M1–M3 features.
- [ ] Link exact source paths, existing issue/PR history, new failing reproductions, code change and passing test IDs.
- [ ] Add negative authorized/unauthorized role, tenant, specialty, stale-state and repeat-run checks as applicable.
- [ ] Preserve synthetic-only demo, existing 7+3 credentials, owner-approved policies and clinical signing/release/AI NO-GO.
- [ ] Run six required exact-head jobs on final implementation SHA; obtain independent review, fix/block/defer with linked explicit issues and re-review.
- [ ] Rebase and retest if main advances or another work unit touches a shared file; merging draft plans is prohibited.

## Execution status

Planning document only, no runtime implementation or validation claimed. This branch is available for an independent developer. Its PR must remain draft until work and tests are complete.
