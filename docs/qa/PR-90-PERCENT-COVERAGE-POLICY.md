# Mandatory PR coverage policy — 19 November 2026

Owner requirement: **every new PR must fail CI unless the full measured API and Web source coverage each reach at least 90% in all four independent metrics**: lines, branches, functions and statements (eight checks). This includes documentation-only, CSS-only and synthetic-test-only PRs. No waiver, green-but-under-threshold receipt or targeted bypass is permitted.

## Execution

- `.github/workflows/ci.yml` always runs full source-instrumented API Jest and Web Istanbul, audits source denominators and reconciles totals against the tracked inventory.
- It archives exact-run aggregate and separate coverage receipts **before** running the mandatory `m4-measured-coverage.mjs` CLI. The CLI compares the unrounded counters and exits nonzero if any metric is below 90% or evidence is missing/malformed.
- The required `test` job becomes red; `smart-ci-gate` cannot pass when `test` fails. The Smart CI planner always chooses **full** for every PR regardless of file types or configuration, and the final gate rejects any targeted mode.
- Negative regression tests check every individual metric and docs/style bypass attempts. Clinical release remains separately NO-GO and is not inferred from these technical metrics.

## Measured starting point (prior to this PR)

PR #438 exact-head synthetic merge checkout, GitHub run `44461850528`:
| Scope | Lines | Branches | Functions | Statements |
| --- | ---: | ---: | ---: | ---: |
| API | 96.83% | 91.34% | 95.53% | 95.48% |
| Web | 93.91% | **86.69%** | **88.84%** | 91.52% |

These are measured, **not compliant**. The new gate must fail until genuinely executed new regression tests lift Web branches and functions to >=90%; it is forbidden to exclude modules, weaken thresholds, rewrite measurement counters, or label a failing PR ready for merge. Do not auto-merge the policy PR with failing checks. No production/clinical activation.

## Follow-up

Coverage-repair PR(s) must target high-value real Web branch and function behavior, preserve full source inventory, and supply measured exact-head evidence for all eight metrics. Every PR after enforcement must independently meet the rule. Keep GitHub branch protection requiring `test` and `smart-ci-gate`; branch protection configuration must be checked separately because a workflow alone cannot prove repository settings.
