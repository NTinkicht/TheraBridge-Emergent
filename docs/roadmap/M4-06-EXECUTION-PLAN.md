# M4-06 — Database constraints, audit, locking and migrations

**State:** DRAFT EXECUTION PLAN / NOT IMPLEMENTED / NOT REVIEW-QUALIFIED. **Roadmap issue:** [#180](https://github.com/NTinkicht/TheraBridge-Emergent/issues/180). **Baseline:** main after M4-02 merge `8174a87ed27e2424500f64256742ab134f15fa3d`.

## Parallel ownership boundary

apps/api/prisma/** migrations/schema, database integrity/audit helpers and migration tests (exclude seed-demo.ts until M4-03 merged)

**Dependencies and conflict controls:** Work independent of credential generation by not touching seed-demo.ts. If seed transaction integration is needed, wait/rebase M4-03; avoid M4-07 worker/infra files.

## Required deliverables

- [ ] Prove FK/unique/check/index coverage for clinical and report draft links and hot paths
- [ ] Review version-CAS and append-only audit protection, write an additive migration plan with rollback evidence
- [ ] Test clean and historical migration ordering and locked-connection retry behavior on Neon-compatible pools
- [ ] Confirm transactional integrity and no tenant-crossing orphan/collision records

## Acceptance and quality gates

- [ ] Verify current merged behavior before changing code; do not rebuild closed M1–M3 features.
- [ ] Link exact source paths, existing issue/PR history, new failing reproductions, code change and passing test IDs.
- [ ] Add negative authorized/unauthorized role, tenant, specialty, stale-state and repeat-run checks as applicable.
- [ ] Preserve synthetic-only demo, existing 7+3 credentials, owner-approved policies and clinical signing/release/AI NO-GO.
- [ ] Run six required exact-head jobs on final implementation SHA; obtain independent review, fix/block/defer with linked explicit issues and re-review.
- [ ] Rebase and retest if main advances or another work unit touches a shared file; merging draft plans is prohibited.

## Execution status

Planning document only, no runtime implementation or validation claimed. This branch is available for an independent developer. Its PR must remain draft until work and tests are complete.
