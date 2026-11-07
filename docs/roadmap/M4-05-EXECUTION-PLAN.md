# M4-05 — HTTP, account and session security hardening

**State:** PARTIALLY IMPLEMENTED / FULL WORK UNIT NOT REVIEW-QUALIFIED. **Roadmap issue:** [#179](https://github.com/NTinkicht/TheraBridge-Emergent/issues/179). **Baseline:** main after M4-02 merge `8174a87ed27e2424500f64256742ab134f15fa3d`.

## Parallel ownership boundary

apps/api/src/auth/**, apps/api/src/common HTTP middleware, proxy/cookie/error policy, associated auth/security tests; EXCLUDE seed-demo.ts

**Dependencies and conflict controls:** Independent of M4-03 seed credential generator. Coordinate with M4-04 on shared guard interfaces; avoid clinical domain route and CAS mutation files.

## Required deliverables

- [ ] Verify protected Cache-Control no-store/Pragma and no accidental sensitive response caching
- [ ] Harden login/password-change abuse limits, enumeration, lockout DoS and password policy
- [ ] Audit proxy trust, CSRF, SameSite/Secure/HttpOnly cookie handling, GET-side mutations and API error normalization
- [ ] Add positive/negative tests for stale tokens, malformed requests and user revocation

## Exact controlled workflow coverage (Codex P2 disposition)

**WF-S4 — Password recovery / MFA / lockout** and **WF-S6 — Session expiry / unsaved changes / edit conflict** are distinct, explicitly owned workflows in the canonical `docs/roadmap/M4-01-91-WORKFLOW-REGISTER.csv`. A successful login test cannot qualify their acceptance.

| Workflow and surface | Work owned in M4-05 | Concrete acceptance / negative tests | Dependency |
|---|---|---|---|
| WF-S4 password recovery | Audit token issue, expiry, redemption, replay and no account enumeration; coordinate user-facing request/reset screens with frontend team | Invalid/expired/used token, 2nd redemption, concurrent reset, throttled request and safe notification; credential change revokes sessions | Cross-branch frontend changes isolated to M4-05-owned reset routes |
| WF-S4 MFA | Inventory existing step-up/MFA flow and current signed policy; **MFA decision remains OPEN** where no approved policy exists; do not silently activate a provider or assert feature complete | Verify configured role gates, no MFA bypass on direct API route; unsigned activation returns policy-blocked and is recorded as BLOCKED, not PASS | Formal owner/security decision prior to real MFA activation |
| WF-S4 account lockout | Per-account+origin limiting without attacker-triggered global user lockout | Throttle/multiple IPs, known/unknown email equality, time-window and recovery path | API auth and proxy trust review |
| WF-S6 session expiry | Verify idle/absolute expiry and expired session response; clear UI context securely | Old cookie yields 401, cached UI/response never exposes protected child data, context navigation re-authenticates | M4-02 hosted session checks and M4-04 clinical guards |
| WF-S6 unsaved changes | Coordinate browser draft/edit interfaces; warn on navigation, expiry and role switch; no misleading saved state | Dirty form close/back/refresh, API session expiry while draft dirty, retry/recovery without losing valid draft | Frontend scope in `apps/web` to be added only after M5 navigation branch coordination |
| WF-S6 edit conflicts | Preserve 409/version/CAS in relevant clinical/edit paths and surface actionable conflict UI | Concurrent edits, stale version, conflict message and restore latest state; no silent overwrite | Actual writes owned by M4-04/M6; frontend handling coordinated separately |

**Pre-implementation evidence process:** For each workflow, locate existing controller/handler and UI tests on main. Mark VERIFIED/PARTIAL/MISSING/POLICY_BLOCKED only with source SHA and tests. If frontend scope overlaps M5, produce a separate linked issue with priority, acceptance tests and owning branch before claiming M4-05 complete. This plan explicitly **does not** treat unsigned MFA as implemented or excluded.

## Additional owned/coordination paths

- API: `apps/api/src/auth/**`, shared HTTP middleware and tests. `seed-demo.ts` remains M4-03-owned.
- Frontend scope is **not silently included** in the original API-only boundary. Targeted WF-S4 password recovery and WF-S6 unsaved-change UI may require `apps/web` changes; authorize a clearly named M4-05 follow-up or coordinate exclusive ownership with M5, after auditing existing code.
- Session/CAS integration with M4-04 and M6 must be reviewed on exact merged SHA, not duplicated.

## Acceptance and quality gates

- [ ] Verify current merged behavior before changing code; do not rebuild closed M1–M3 features.
- [ ] Link exact source paths, existing issue/PR history, new failing reproductions, code change and passing test IDs.
- [ ] Add negative authorized/unauthorized role, tenant, specialty, stale-state and repeat-run checks as applicable.
- [ ] Preserve synthetic-only demo, existing 7+3 credentials, owner-approved policies and clinical signing/release/AI NO-GO.
- [ ] Run six required exact-head jobs on final implementation SHA; obtain independent review, fix/block/defer with linked explicit issues and re-review.
- [ ] Rebase and retest if main advances or another work unit touches a shared file; merging draft plans is prohibited.

## Execution status

Partial code: origin-limited recovery in `apps/api/src/auth/auth.service.ts`, recovery abuse and session expiry regressions in `apps/api/test/auth.e2e-spec.ts`. Final six-job CI and implementation review NOT VERIFIED. Other MFA, recovery UI, dirty-form, conflict UX and HTTP policy checks remain OPEN; do not merge as a completed work unit.
