# M4-08 — CI QA framework, coverage and supply-chain provenance

**State:** DRAFT EXECUTION PLAN / NOT IMPLEMENTED / NOT REVIEW-QUALIFIED. **Roadmap issue:** [#182](https://github.com/NTinkicht/TheraBridge-Emergent/issues/182). **Baseline:** main after M4-02 merge `8174a87ed27e2424500f64256742ab134f15fa3d`.

## Parallel ownership boundary

web unit test runner, coverage configs, new reusable CI QA utilities and test selection (do not edit .github/workflows/ci.yml until M4-03 merged)

**Dependencies and conflict controls:** Parallel development of test runner and coverage config is safe. Final .github/workflows/ci.yml edits MUST be rebased after M4-03 and other branches changing CI; validate final exact-head.

## Required deliverables

- [ ] Establish measured backend+frontend coverage baseline and enforce ≥95% where feasible with justified exceptions
- [ ] Add reliable web component/unit runner and immutable test evidence
- [ ] Harden provenance of hosted credential preflight, preview and multi-branch secret scanning
- [ ] Maintain exact-head six-job CI and migration/history integrity without disabling required checks

## Implemented QA baseline (independent M4-08 slice)

- New `scripts/qa/check-ci-test-inventory.mjs` validates that the **six mandatory GitHub jobs** remain present, the existing API Jest and web Node test runners remain configured, and core fingerprint coverage enforcement has not been removed.
- Node tests in `scripts/qa/check-ci-test-inventory.test.mjs` explicitly prevent mistaking suite counts or 95% coverage of **one module** for application-wide 95% coverage.
- Existing source inventory at planning time: **30 API e2e test files**, **2 web Node test files**. These are counts, not measured coverage.
- Existing measured API gate only covers `apps/api/src/common/fingerprints.ts` at 95% statements/lines/functions and 90% branches. Overall API+web coverage percentage remains **UNKNOWN**, not PASS.
- Integrated baseline check into the `test` CI job after web tests; final exact-head CI and reviewers must validate it.
- Further work to meet requested ≥95% across applicable code remains: instrument/measure broad API and web components, establish realistic include/exclude policy, add missing tests and only then enforce a holistic coverage threshold. Do not impose a fictional 95% number or claim done from the check above.
- M4-09 #276's new historical-audit validator is **not** imported in this branch while it is still unmerged; integrate after final branch reconciliation or as a follow-up linked PR to avoid missing-file CI failures.

## Acceptance and quality gates

- [ ] Verify current merged behavior before changing code; do not rebuild closed M1–M3 features.
- [ ] Link exact source paths, existing issue/PR history, new failing reproductions, code change and passing test IDs.
- [ ] Add negative authorized/unauthorized role, tenant, specialty, stale-state and repeat-run checks as applicable.
- [ ] Preserve synthetic-only demo, existing 7+3 credentials, owner-approved policies and clinical signing/release/AI NO-GO.
- [ ] Run six required exact-head jobs on final implementation SHA; obtain independent review, fix/block/defer with linked explicit issues and re-review.
- [ ] Rebase and retest if main advances or another work unit touches a shared file; merging draft plans is prohibited.

## Execution status

Planning document only, no runtime implementation or validation claimed. This branch is available for an independent developer. Its PR must remain draft until work and tests are complete.
