# CI critical-path optimization — 17 November 2026

## Goal
Reduce time-to-verification **without reducing any executed checks, accepted coverage thresholds, workload duration, or review/clinical security gates**. Implements independent commercial evidence execution, early Compose validation, and lockfile-keyed public Chromium binary caching. No policy permission to skip full jobs is granted.

## Baseline and evidence
- Pre-change PR #413 CI [run 44109821144](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/44109821144) has the monolithic `test` chain: its installed license and COM-02 provenance/source correspondence scripts are executed serially **before** database, API coverage, Web coverage and build/browser checks.
- On inspected run #44109821144, the pre-change `test`, demo, live, Child 360, SBOM, secret-scan and Compose had succeeded, while the 10-minute sustained `preview-container` workload was still executing. This is **not** evidence of the new branch's performance.
- Existing `scripts/ci/smart-ci.mjs` classifies docs, static Web and full changes but **Rule 16 shadow mode remains hard-locked** (`ownerPolicyApproved:false`). This branch does **not** authorize targeted skipping.

## Changes
1. Extract the entire original 59-step commercial verification and evidence archive section from `test` into a separately required `commercial-provenance` job, preserving exact step scripts, inputs, original artifact names, output retention and fail-closed licensing/rights statuses. The new job uses the same locked Yarn dependency set, full-history checkout, Node version, and the existing current-commit `GITHUB_TOKEN` where specified.
2. Retain every other `test` step and existing API/Web coverage gate in place. Commercial isolation removes unnecessary serial dependency on PostgreSQL application tests.
3. Change `compose` from `needs: [smart-plan, test]` to `needs: smart-plan`. Compose remains a **required full-mode** check; `smart-ci-gate` verifies success of both independently. Nothing may merge on Compose alone.
4. Extend `expectedJobs()`, the always-running Smart CI gate's declared `needs`, and adversarial tests to reject a missing/failed/skipped `commercial-provenance` result in full mode.
5. Cache only public Playwright Chromium binaries under `~/.cache/ms-playwright`, scoped to runner OS, architecture and `yarn.lock` digest, in all four consumers. Preserve each `yarn playwright install --with-deps chromium` call so OS dependencies and pinned Chromium runtime are checked on every run. No credential, database, Web build or test-result cache.
6. Preserve full existing preview build, SBOM and **actual 10-minute 512 MiB non-root sustained workload**; run it independently as before.

## Safety / scope
- All six original checks remain as named jobs; new `commercial-provenance` is an additional required success. `smart-ci-gate` must not pass without it for full mode.
- Commercial provenance data remains a candidate evidence queue, **not** a licensing/rights or clinical approval.
- No change to test thresholds, API/Web builds, migration guards, negative tests, actual seven-role browser journeys, SQL fixtures, secret scan, SBOM, Compose runtime restrictions, React/Next/Node versions, or production deploy settings.
- No activation of shorter CI execution for documentation/style changes. Activation would require separately approved Rule 16 policy and historical simulation.
- No signed clinical G2/G2b GO, real patient data, production STT, signing or release.

## Qualification ledger (update only from observed new-head checks)
| Check | Status on implementation branch |
| --- | --- |
| New job and workflow contract source tests | IMPLEMENTED; **CI PENDING** |
| Commercial producer step inventory and per-commit evidence archive | PRESERVED by workflow source; **new-run execution PENDING** |
| Existing full test coverage, all six legacy jobs, new commercial job | **PENDING** |
| Smart CI gate rejects missing commercial-provenance | IMPLEMENTED with adversarial fixture; **CI PENDING** |
| Browser Chromium pinned and system dependency installer still executed | IMPLEMENTED; **CI PENDING** |
| Before/after exact-run wall-clock measurements | **NOT MEASURED** |
| Exact-head Codex independent review | **PENDING** |
| Merge, production activation | **NOT DONE** |

## Next checks
1. Run new-head full CI. Inspect all job outcomes and ensure both `test` and `commercial-provenance` report success, as well as the original six checks and new required gate.
2. Compare run-created/start/end timestamps for original #413 vs this PR, separately for `test`, `commercial-provenance`, `compose`, `preview-container` and wall-clock duration to gate. Also record runner-minute cost and retries.
3. Address independent P1/P2 findings and workflow failures on one final head before merging.
4. Investigate verified build artifact reuse **only after** proving identical build-time environment across consumer jobs. The Child 360 build flag intentionally differs, and unverified shared builds are disallowed.
