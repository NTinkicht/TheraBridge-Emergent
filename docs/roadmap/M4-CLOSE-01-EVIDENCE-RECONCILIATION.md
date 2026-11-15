# M4-CLOSE-01 — Evidence and non-force reconciliation (working receipt)
**Recorded 2026-11-15 · status: IMPLEMENTED IN PR, NOT YET QUALIFIED · synthetic-only**

This work package audits what is *known* after merged [PR #358](https://github.com/NTinkicht/TheraBridge-Emergent/pull/358) (merge `800e5c273e37f0862a429256d8d12ac38db30743`). It does **not** sign off historical source contents, private requirements, deployed acceptance, or clinical/patient use. All claims remain bound to recorded sources and their verification status.

## Nine parent M4 units — GitHub issue state checked 2026-11-15
| Unit | Issue | Observed issue state | M4-CLOSE-01 disposition |
|---|---|---|---|
| M4-01 canonical inventory | #175 | CLOSED | Scoped register/tooling only; residual #266 OPEN |
| M4-02 ten hosted accounts | #176 | OPEN | Protected acceptance not final; #268 OPEN |
| M4-03 demo credential generation | #177 | CLOSED | Do not repeat |
| M4-04 authorization/tenant/specialty | #178 | CLOSED | Do not reopen for traceability status |
| M4-05 HTTP/account/session security | #179 | CLOSED | Do not repeat |
| M4-06 DB/migration/audit | #180 | CLOSED | Do not repeat |
| M4-07 performance/worker/container | #181 | CLOSED | Do not repeat synthetic qualification |
| M4-08 CI and genuine 90% four-metric coverage | #182 | CLOSED | [PR #358](https://github.com/NTinkicht/TheraBridge-Emergent/pull/358) merged, do not reinstate 95% |
| M4-09 historic audit | #183 | OPEN | Evidence routes outstanding |

Milestone epic #167 remains OPEN, and must not be closed by passing an internal audit or CI alone.

## Exact prior measured coverage — no new measurement in this package
Merged #358 qualified on its final head `b8c0c7200dce3c3164288166b972b1136ffefff0`. [Full CI run 43692201180](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/43692201180) SUCCESS; focused [run 43692201195](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/43692201195) SUCCESS; exact-head Codex reviewed with no major issues. API 93 source modules: lines 96.97%, branches 90.03%, functions 95.82%, statements 95.60%. Web 154 source modules: lines 96.04%, branches 90.08%, functions 90.76%, statements 93.69%. No denominator exclusions or G2/G2b approval. Do not claim these numbers are newly measured on this closeout PR's head.

## Outstanding controlled source evidence — #266 (NOT ACCEPTED)
The canonical inventories contain **66 features, 91 workflows, 55 owner requirements (212 total)**, with 94 PARTIAL, 116 PENDING_VERIFICATION and 2 V2_EXCLUDED in the latest recorded #266 checkpoint after #297. PARTIAL means candidate source/test linkage, **not** approved workflow acceptance. The **1,023 individual workflow steps** require authoritative controlled/private source access and per-step implementation/test/approval mapping. This PR does not invent inaccessible source revisions or mark 1,023 steps PASS. One M4-routed pending workflow WF-TP needs protected mobile action-scope verification; other pending items primarily route to M5–M11, not newly invented M4 defects. Keep #266 OPEN until exact source, reviewer and owner receipt are available.

## Historical register — #183 (NOT ACCEPTED)
The frozen 75 pre-roadmap issues were reconciled by #307: **20 VERIFIED_IMPLEMENTED, 49 PENDING_EVIDENCE, 5 PARTIAL, 1 POLICY_BLOCKED** (the status types are evidence classifications, not 20 newly closed GitHub issues). Existing CSV `M4-09-HISTORICAL-ISSUE-DISPOSITIONS.csv` plus CI validator remain authoritative. This package makes no bulk auto-closure or fabricated implementation SHA: each unresolved row needs an actual code/test/decision chain and a responsible receiving work unit. #183 remains OPEN.

## Protected hosted acceptance — #176 / #268 (NOT ACCEPTED)
[Protected run 42605446171, attempt 2](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42605446171) exercised 7 original + 3 extra synthetic accounts: **84 PASS / 0 FAIL / 14 BLOCKED**; workflow ended FAILURE because blocked governance checks were not reclassified as passing. It does not independently attest deployment SHA (hosted deploy differed from GitHub runner), two **valid** center tenants, guardian or therapist revocation, timed session invalidation or complete HA-01–HA-10 sign-off. These need a separately authorized disposable two-tenant fixture and protected operator approval. Keep #176 and #268 OPEN. No real identities, live patient data, signing, guardian releases, real STT/AI or safeguarded actions.

## Historical branch ref deviation — #279 (PARTIAL PROCESS EVIDENCE)
On 2026-11-07, PRs #274, #275 and #276 had feature-branch force-ref updates, in violation of `AGENTS.md` Rule 10. Their **final merge commits**:
- #274: `dd2a0ff345f5d1a0b38330222491c464344f9819`
- #275: `f29ccac1e9572171c7b210e415003061ee9edd70`
- #276: `198238e684ff5ac2cb4f01e67664e11dc19b4723`

The new `scripts/qa/m4-nonforce-ancestry.mjs` performs a **read-only** Git ancestry assertion with `git merge-base --is-ancestor` and hard fails on missing history, missing ancestor or unexpected scope; its negative tests are wired to full CI. This checks final merged work remains ancestor of checkout HEAD. **It cannot reconstruct deleted branch tips, prove the old `expected_sha` lease, or prove that every unobserved intermediate hunk survived.** No tool is authorized to use `force=true` as reconciliation. #279 remains OPEN for the historical lease/old-head evidence and final independent process sign-off.

### Approved forward-only reconciliation procedure
1. Inspect current `main`, feature HEAD and full PR diff; identify conflicts and whether clinical or release controls changed.
2. Build a **two-parent** conflict-resolution merge commit (feature-head and current-main parent) preserving both histories. Verify tree content/tests and existing migrations; never rebuild a detached replacement that drops ancestry.
3. Advance the **feature branch only** with a fast-forward ref update (`force=false`, expected current SHA), rejecting any SHA mismatch. Never force-push or modify `main` directly.
4. Re-run all mandatory exact-final-HEAD CI, reconcile changed base, request independent exact-head review, and disposition every P0–P3 comment under Rules 13–16.
5. If old commits/lease records are not recoverable, record UNVERIFIABLE, not PASS. Protected environments and clinical G2/G2b NO-GO are separate approval gates.

## Qualification of this PR
- Source/runbook and test implementation: COMMITTED; exact-head CI: **PENDING**.
- New ancestry test output: **NOT RUN** until GitHub Actions executes; don't infer pass from committing code.
- Independent Codex review: **PENDING**.
- Historical 75 issue completions: **NOT PROVEN**; source/1,023-step mapping: **NOT PROVEN**; ten-account release acceptance: **NOT PROVEN**.
- No M4 issue closure authorized in this PR; no clinical or commercial release authorization.
