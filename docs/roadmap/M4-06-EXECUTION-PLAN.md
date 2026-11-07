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

## Implemented database integrity regression slice

Current merged `20261103100000_m2_h04_integrity_indexes` already creates `audit_event_no_mutation` trigger, validated plan-version center/author FKs and tenant hot-path indexes. Do **not** duplicate this migration.

Added `apps/api/test/m4-db-integrity.e2e-spec.ts` to verify in real PostgreSQL:
- An ordinary audit INSERT succeeds while audit UPDATE/DELETE are rejected by the database and the original row remains immutable.
- `plan_version_center_fk` and `plan_version_author_fk` remain present and validated.
- `care_assignment_center_member_active_idx` and `appointment_center_child_status_start_idx` remain installed.

**State:** source-level regression code committed, exact-head CI and fresh code review not yet verified. Wider M4-06 work on migration locks, concurrency, query plans and benchmark evidence remains OPEN. This test does not implement a retention-policy bypass or authorize clinical release.

## Acceptance and quality gates

- [ ] Verify current merged behavior before changing code; do not rebuild closed M1–M3 features.
- [ ] Link exact source paths, existing issue/PR history, new failing reproductions, code change and passing test IDs.
- [ ] Add negative authorized/unauthorized role, tenant, specialty, stale-state and repeat-run checks as applicable.
- [ ] Preserve synthetic-only demo, existing 7+3 credentials, owner-approved policies and clinical signing/release/AI NO-GO.
- [ ] Run six required exact-head jobs on final implementation SHA; obtain independent review, fix/block/defer with linked explicit issues and re-review.
- [ ] Rebase and retest if main advances or another work unit touches a shared file; merging draft plans is prohibited.

## Execution status

Planning document only, no runtime implementation or validation claimed. This branch is available for an independent developer. Its PR must remain draft until work and tests are complete.
