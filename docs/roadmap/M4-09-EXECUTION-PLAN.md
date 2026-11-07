# M4-09 — Historic audit issue evidence triage

**State:** DRAFT EXECUTION PLAN / NOT IMPLEMENTED / NOT REVIEW-QUALIFIED. **Roadmap issue:** [#183](https://github.com/NTinkicht/TheraBridge-Emergent/issues/183). **Baseline:** main after M4-02 merge `8174a87ed27e2424500f64256742ab134f15fa3d`.

## Parallel ownership boundary

docs/roadmap/M4-09/** historical issue evidence matrix only; no application or shared handover changes until integration

**Dependencies and conflict controls:** Read-only parallel audit can start now. Final closeout depends on M4-01 #175/#266 and updated code evidence; do not close historical issues without independent verification.

## Required deliverables

- [ ] Enumerate GH-01..GH-20 and N1..N8 plus relevant issue/PR history against verified main SHA
- [ ] Classify each issue as implemented/partial/missing/policy-blocked/superseded/duplicate with exact source+test evidence
- [ ] Cross-link canonical #175 and #266 evidence reconciliation, no blind issue closures
- [ ] Record separate blocking remediation issue for any verified unimplemented P0/P1 defect

## M4-09 evidence tooling implemented (not final closeout)

- Added `docs/roadmap/M4-09-HISTORICAL-ISSUE-DISPOSITIONS.csv`: exactly 75 historical open issues imported from the canonical 2026-11-07 snapshot, preserving issue URLs/titles. Suggested work-unit routing is **keyword triage only**; every disposition stays `PENDING_EVIDENCE` until source/test/policy review.
- Added `scripts/qa/check-historic-issues.mjs` and `scripts/qa/check-historic-issues.test.mjs`: enforce count, uniqueness, valid historical issue URLs/owner IDs, mandatory source SHA/test/reviewer for any verified claim, and policy evidence for blocked status.
- No legacy issue has been closed, relabeled or declared implemented. This is an auditable initial register, **not** 75 verified findings.
- CI invocation should be integrated by the parallel M4-08 PR #275 after rebasing to updated main, to avoid both work units editing `.github/workflows/ci.yml`; standalone tests have not been run on this branch via GitHub Actions yet.
- Actual disposition of all issues remains dependent on verified current merged code, approved policies and the 1,023-step source audit [#266](https://github.com/NTinkicht/TheraBridge-Emergent/issues/266).

## Acceptance and quality gates

- [ ] Verify current merged behavior before changing code; do not rebuild closed M1–M3 features.
- [ ] Link exact source paths, existing issue/PR history, new failing reproductions, code change and passing test IDs.
- [ ] Add negative authorized/unauthorized role, tenant, specialty, stale-state and repeat-run checks as applicable.
- [ ] Preserve synthetic-only demo, existing 7+3 credentials, owner-approved policies and clinical signing/release/AI NO-GO.
- [ ] Run six required exact-head jobs on final implementation SHA; obtain independent review, fix/block/defer with linked explicit issues and re-review.
- [ ] Rebase and retest if main advances or another work unit touches a shared file; merging draft plans is prohibited.

## Execution status

Planning document only, no runtime implementation or validation claimed. This branch is available for an independent developer. Its PR must remain draft until work and tests are complete.
