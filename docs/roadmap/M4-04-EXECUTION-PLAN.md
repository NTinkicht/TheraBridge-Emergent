# M4-04 — Clinical authorization, specialty isolation and tenancy

**State:** PARTIAL TEST IMPLEMENTATION / FULL WORK UNIT NOT REVIEW-QUALIFIED. **Roadmap issue:** [#178](https://github.com/NTinkicht/TheraBridge-Emergent/issues/178). **Baseline:** main after M4-02 merge `8174a87ed27e2424500f64256742ab134f15fa3d`.

## Parallel ownership boundary

apps/api/src/clinical/**, clinical read-model policies, authorization test files (not apps/api/src/auth session internals)

**Dependencies and conflict controls:** Can proceed alongside M4-03/M4-05 if clinical route/policy files remain owned solely here. Do not edit authentication cookie, session code or seed-demo.ts.

## Required deliverables

- [ ] Audit all clinical/plan/report endpoints for row-scoped tenant, child, membership and specialty predicates
- [ ] Ensure cross-specialty denial and guardian revocation at API read and mutation boundaries
- [ ] Verify compare-and-swap revisions, replay/idempotency, and stale assignment access under concurrent edits
- [ ] Add negative API and browser cases with signed-out and cross-center/child roles

## Acceptance and quality gates

- [ ] Verify current merged behavior before changing code; do not rebuild closed M1–M3 features.
- [ ] Link exact source paths, existing issue/PR history, new failing reproductions, code change and passing test IDs.
- [ ] Add negative authorized/unauthorized role, tenant, specialty, stale-state and repeat-run checks as applicable.
- [ ] Preserve synthetic-only demo, existing 7+3 credentials, owner-approved policies and clinical signing/release/AI NO-GO.
- [ ] Run six required exact-head jobs on final implementation SHA; obtain independent review, fix/block/defer with linked explicit issues and re-review.
- [ ] Rebase and retest if main advances or another work unit touches a shared file; merging draft plans is prohibited.

## Execution status

Partial test implementation: `apps/api/test/clinical.e2e-spec.ts` now asserts immediate clinical workspace denial when the therapist's specialty is revoked while the assignment remains active, and supervisor continuity. No runtime authorization changes are claimed. Full endpoint audit, concurrent CAS/read revocation, browser coverage, exact-head CI and fresh independent code review remain open; do not merge as complete M4-04.
