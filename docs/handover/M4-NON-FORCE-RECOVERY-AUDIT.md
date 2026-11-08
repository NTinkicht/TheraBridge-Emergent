# M4 branch-history and non-force recovery audit (2026-11-08)

## Recorded process deviation
Issue #279 correctly records earlier lease-guarded `update_ref(force=true)` operations on **feature branches** of PRs #274/#275/#276. This rewrote their branch ancestry and violated AGENTS.md Rule 10. It did not demonstrate a forced update to `main`. **Do not erase or recharacterize this history.**

## Evidence of retained implementation after merge
At main `4784b2414b57bb74938bdd168716a7ccbae4461b` the following originally changed files exist, with the published expected implementation:
- [#274](https://github.com/NTinkicht/TheraBridge-Emergent/pull/274), merge `dd2a0ff345f5d1a0b38330222491c464344f9819`: `apps/api/src/operations/notices.service.ts`, `apps/api/test/notices-batch.e2e-spec.ts`, `docs/roadmap/M4-07-EXECUTION-PLAN.md`; original Rule 7 files also retained. Notice service retains `upcomingChangedAppointmentIds` and batched lookup maps.
- [#275](https://github.com/NTinkicht/TheraBridge-Emergent/pull/275), merge `f29ccac1e9572171c7b210e415003061ee9edd70`: `.github/workflows/ci.yml`, `scripts/qa/check-ci-test-inventory.mjs`, `check-ci-test-inventory.test.mjs`, `docs/roadmap/M4-08-EXECUTION-PLAN.md`; Rule 7 files retained. Current final merged M4 test job executes inventory and negative security checks.
- [#276](https://github.com/NTinkicht/TheraBridge-Emergent/pull/276), merge `198238e684ff5ac2cb4f01e67664e11dc19b4723`: historical 75-row CSV, validator and tests plus `docs/roadmap/M4-09-EXECUTION-PLAN.md`, workflow and Rule 7 files; frozen 75-row invariant remains enforced.
- Current final implementation [#293](https://github.com/NTinkicht/TheraBridge-Emergent/pull/293) passed all six exact-head CI jobs at [42496485725](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42496485725), checking current `main` tree rather than relying solely on old topic SHA.

**Limit of audit:** GitHub's observable merged file contents/CI prove the present implementation and tests are retained; they cannot reconstruct every intermediate force-rewritten feature-ref/reflog event. Never claim absolute reflog completeness or retroactively undo a forced ref.

## Mandatory non-force branch reconciliation
1. Compare branch head/base/current main and read changed-file lists before resolving any conflict.
2. Prefer ordinary Git `git fetch origin main && git checkout <topic> && git merge --no-ff origin/main` then normal `git push` (no `--force`). Keep the branch's previous head and new main as two parents.
3. For connector-only writes, construct the merged tree preserving both bodies, `create_commit` with previous topic head and current main as parents, then `update_ref(force=false, expected_sha=<old_topic_head>)`.
4. If a concurrent writer advanced the branch, **stop and re-fetch**. Never defeat leases with `force=true` or rewrite `main`.
5. Compare exact final changed paths to upstream tree, rerun all six CI jobs and request independent review on that head. Do not infer from old CI.
6. Preserve incident evidence. Any missing implementation or unexpected migration/permission drift is a separate blocking issue, not a silent accepted reconciliation.

## Verified corrective example
The dedicated synthetic-only Render branch `chatgpt/tb-em-018-hosted-demo-activation` was updated from `5cb65d9` to two-parent commit `7f19d552a2ab39e58053210b8c56c86afe2b78cd`, incorporating main `4784b241` with **the exact same main tree**, via expected-head `force=false`. Live Render deploy `dep-dboa541srm7s73bcr5fg` succeeded. No real clinical data or approval gates changed.
