# M4-07 — API performance, background reliability and container resources

**State:** DRAFT EXECUTION PLAN / NOT IMPLEMENTED / NOT REVIEW-QUALIFIED. **Roadmap issue:** [#181](https://github.com/NTinkicht/TheraBridge-Emergent/issues/181). **Baseline:** main after M4-02 merge `8174a87ed27e2424500f64256742ab134f15fa3d`.

## Parallel ownership boundary

worker/reminder scheduling routines, Dockerfiles, Render resource/runtime scripts, bounded-query services (excluding Prisma migrations/schema)

**Dependencies and conflict controls:** Can work in parallel with M4-06 when ownership of schema/migration stays M4-06 and worker/runtime stays M4-07. No shared CI workflow edits until rebase/integration.

## Required deliverables

- [ ] Benchmark unbounded API reads and scheduled sweeps with count+latency evidence
- [ ] Add bounded pagination/reminder deduplication with idempotent retries and P2002 contention handling
- [ ] Harden non-root container users and low-memory Render Node runtime startup/resource budgets
- [ ] Add queue/retry/load tests and establish before/after performance evidence

## Implemented performance slice

- `apps/api/src/operations/notices.service.ts`: precompute active guardian email and therapist display-name lookup maps; avoid `users.find`/`team.find` for every guardian notification.
- Export `upcomingChangedAppointmentIds()` to avoid per-row scanning the entire rescheduled batch; preserves **first matching item** if duplicate appointment IDs appear (same semantics as the original `items.find`).
- `apps/api/test/notices-batch.e2e-spec.ts`: verify 14-day boundaries, moved-in/out notifications, duplicate-ID semantics and 5,000 synthetic appointments.
- Existing `operations.e2e-spec.ts` and `parent-scheduling.e2e-spec.ts` continue testing idempotent send/retry/opt-out and must pass exact-head CI.

**Open work:** benchmark large synthetic centres, worker retry/dead letter scenarios, container memory/resource hardening and pagination improvements; this slice does not claim all M4-07 objectives complete. Runtime code/test committed; exact-head CI and independent review **NOT YET VERIFIED**. No clinical release, real audio, external AI or production data activation.

## Acceptance and quality gates

- [ ] Verify current merged behavior before changing code; do not rebuild closed M1–M3 features.
- [ ] Link exact source paths, existing issue/PR history, new failing reproductions, code change and passing test IDs.
- [ ] Add negative authorized/unauthorized role, tenant, specialty, stale-state and repeat-run checks as applicable.
- [ ] Preserve synthetic-only demo, existing 7+3 credentials, owner-approved policies and clinical signing/release/AI NO-GO.
- [ ] Run six required exact-head jobs on final implementation SHA; obtain independent review, fix/block/defer with linked explicit issues and re-review.
- [ ] Rebase and retest if main advances or another work unit touches a shared file; merging draft plans is prohibited.

## Execution status

Planning document only, no runtime implementation or validation claimed. This branch is available for an independent developer. Its PR must remain draft until work and tests are complete.
