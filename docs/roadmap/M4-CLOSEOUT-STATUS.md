# M4 final verification report — 2026-11-08

**Status: M4 ENGINEERING MERGED; ORIGINAL ACCEPTANCE NOT FULLY MET.** Do not mark milestone #167 as closed without the evidence below. This update supersedes the stale pre-PR-293 checkpoint and is grounded in actual GitHub and Render receipts.

## Completed and independently verified
- Nine original work units: M4-03 #177 and M4-04 #178 are closed, seven remain open pending their original exit criteria.
- All three consolidated PRs #291/#292/#293 are merged; final #293 at `4784b2414b57bb74938bdd168716a7ccbae4461b` (CI exact-head [42496485725](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42496485725), 6/6 PASS, completed independent Codex review).
- Synthetic-only deployment branch `chatgpt/tb-em-018-hosted-demo-activation` was synchronized with the byte-identical main tree via **non-force, two-parent** commit `7f19d552a2ab39e58053210b8c56c86afe2b78cd`. The Render deployment [`dep-dboa541srm7s73bcr5fg`](https://dashboard.render.com/web/srv-dbdbelfavr4c739ftdsg) reached **live**; API and Web readiness logged. No clinical capabilities were authorized.
- The frozen original 75-issue register was re-audited: 16 historical issues are now VERIFIED_IMPLEMENTED (pre-existing #8 plus 15 GH-wave items closed on merge SHA, CI and reviewer evidence), two PARTIAL, one POLICY_BLOCKED and 56 PENDING_EVIDENCE. Closing a historical implementation issue does not close broader release acceptance.
- Scoped password reset crash-atomic follow-up #280 closed with real PostgreSQL fault-injection evidence. Audit P3 #294 has a new transaction-rollback regression in this PR; do not close until exact-head CI and review pass.

## Mandatory original M4 exit requirements still not demonstrated
| Gate | Source | Reality | Next evidence |
|---|---|---|---|
| Source/feature/workflow traceability | #175/#266 | Canonical source candidate remains unsigned. The controlled 1,023-step register was recovered/hash-verified but **108 design-only + 880 unmapped + 35 QA-only**, not code/test-verified. 66/91/55 row crosswalks are not independently signed off. | Pin every approved row to current merged code, tests, and accountable policy status; require source owner signoff, not inferred approval. |
| Hosted ten-account / two real synthetic tenants | #176/#268 | Protected 7+3 runner exists; **HA-01…HA-10 has no authenticated protected hosted-run receipt**. One-center demo does not prove a valid second center, live revocation or accelerated expiry. | Operator-approved protected workflow on independently confirmed deployed SHA, valid disposable second center, and signed/redacted evidence. |
| Full HTTP/proxy/session security qualification | #179 | Scoped HTTP hardening, transactional password recovery and CI regressions merged. Whole threat matrix (proxy SameSite/CSRF, application abuse, account enumeration, state transitions) not independently reviewed as one final cross-path acceptance result. | Review currently implemented defenses against original matrix and run any genuinely missing negative tests. |
| Database operational role and pool | #180 | Real PG immutable audit UPDATE/DELETE/TRUNCATE tests green; #294 regression pending this PR. No independent **least-privileged Render/Neon runtime DB role** or pooled migration/restore/retention validation. | Inspect actual runtime DB role/grants and non-owner execution; replay migration from known baseline in disposable DB. |
| Workload/performance | #181 | Query batching and 5,000-notice regression merged. Render resource metrics available (observed ~140 MB of 512 MB memory on old instance), but this is **not** a load benchmark or p95 proof. | Synthetic repeatable p95, query-count, worker retry and memory envelope evidence on deployed M4 tree. |
| Full application API/Web coverage | #182/#136 | A measured-coverage validator and scoped core fingerprint threshold exist. **No whole-app Istanbul API/Web coverage reports** were supplied; ≥95% cannot be asserted. | Run actual API and Web instrumentation, compute four metrics per scope, review exclusions, then gate them in CI. |
| Historical issue dispositions | #183 | 16/75 verified, 2 partial, 1 policy blocked, 56 evidence pending; no blind closures. | Disposition each remaining row with exact merged code, unresolved issue, policy blocker, or future milestone routing. |
| Process provenance | #279 | Old forced feature-ref recovery acknowledged; current sync uses two-parent non-force merge, old #274/#275/#276 implementation paths found in main. | Retain ancestry audit and non-force rule; if any lost changes surface, file targeted remediation. |

## Operational safety
- Real patient records, clinical approval/signing, family release, real speech recognition/external AI, unsanctioned safeguarding messages, and actual production use stay **NO-GO**, regardless of CI/deployment health.
- CI and infrastructure smoke tests do not substitute for protected hosted role-level signoff or signed governance.
- No second M4 roadmap or unnecessary feature rebuild. New code only when a specific failing criterion is reproduced; failures do not become automatic PASS through deferral.
