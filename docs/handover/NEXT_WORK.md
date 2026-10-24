## 2026-10-24 — TB-EM-023 next actions

1. Wait for exact-head six-job CI and specifically `demo-journey` Chromium computed-style checks.
2. If CI fails, repair only the reported regression and rerun; do not interpret class presence as visual success.
3. Obtain independent exact-head Codex/Grok/Mistral/DeepSeek reviews on the updated PR #71.
4. After owner-authorized merge/deploy, conduct hosted guardian and staff visual QA at 320/390/768/1024/1440; keep issue #61 open until remaining seven-role acceptance and security checks.
5. Separate P3 follow-up: authenticated guardian dark-mode support requires coordinated content wrapper, chrome surfaces and theme-switching behavior; do not activate piecemeal.

## CURRENT — new exact-head review after Codex P2 data-loss correction

## CURRENT — Second Codex P2: queued autosave ordering

After the earlier editing lock, Codex at `a1f3fa8043` confirmed a remaining P2 race: two queued autosaves A/B plus decision flush C could let C finish ahead of B. A FIFO save queue and held-A/held-B Chromium regression are prepared on PR #70. Requalify the **new exact SHA** with all six CI jobs, inspect the new browser test and obtain fresh independent review. Do not merge while any P2 thread remains genuinely unresolved. Hosted acceptance issue #61 and clinical/pilot NO-GO remain separate.


PR #70 latest feature branch includes a corrected parent-owned decision transaction lock for ReportEditor, in-flight autosave serialization and delayed-network browser regression. The previous `d965842e` passed 6/6 and 482/482, with a confirmed Codex P2 that **must not** be merged uncorrected. Verify all six GitHub Actions jobs at the new SHA; inspect delayed-POST assertions, lock/unlock on error and prevention of concurrent remount text loss; obtain fresh independent reviewer verdict, close Codex finding only when verified. Do not merge/alter the Render acceptance target before the gates pass. See `docs/product/TB-EM-023-DELIVERY.md`.

## CURRENT — TB-EM-023 PR #70 review qualification (2026-10-24)

1. Qualify the latest corrective HEAD of [PR #70](https://github.com/NTinkicht/TheraBridge-Emergent/pull/70) after DeepSeek review amendments; check **six exact-HEAD CI** jobs, PostgreSQL and seven-role browser suite. The previous `73c4afb` passed 6/6 and 481/481 but cannot qualify a newer HEAD.
2. Obtain independent exact-HEAD re-review (Grok/Mistral and Codex where available), reconcile any genuine new blockers, close only resolved GitHub threads. CodeRabbit follow-up was rate-limited, but its earlier two findings were confirmed fixed. Owner posted DeepSeek review is supplementary, not a bot/native approval.
3. Under owner's standing automatic-merge permission, merge only if all required branch protection, CI, review, resolved-thread and up-to-date gates actually pass. Do not bypass ntk-reviewer authorization or pretend an external chat review is a GitHub-native approval.
4. Preserve existing live Render/Neon synthetic browser acceptance environment; issue #61 remains PARTIAL with all required hosted viewport and role cases incomplete. Schedule a controlled fresh synthetic preview QA after integration when authorized. Pilot/production remains NO-GO.
5. Follow-up advisories: stronger cross-browser visual checks of referent/report dialogs; local idempotency-key recovery after remount, real-world source semantics, separate out-of-scope vs invalid designation policy, invalid referent membership lifecycle audit history, exact archive version increments. See `docs/product/TB-EM-023-DELIVERY.md`.

Historical work-unit notes below are retained for provenance.


## TB-EM-021 — source-traced draft decision ledger (backend-only draft)

Independent external Codex UI acceptance on the current Render synthetic demo remains isolated. Do not redeploy or adjust Render/Neon. Backend PR creates non-authorizing append-only decisions; the clinician-facing ReportEditor remains UI-local and requires a **separate sequential PR** once this foundation is CI-qualified and reviewed. See docs/product/TB-EM-021-DECISION-LEDGER.md. No new clinical permission grant is allowed.

# Next work unit

## TB-EM-019 — exact-head requalification after advisory fixes

1. Verify draft PR #65 HEAD advanced from `b542159a` through a single reviewable advisory-hardening commit; inspect exact diff.
2. Wait for ALL six hosted Actions job conclusions at that **new exact SHA**; the author has not yet executed the new regressions at commit creation. Fix any actual failure on the SAME branch and repeat.
3. Obtain independent read-only Mistral re-review on the new HEAD. The previous NO_BLOCKING_FINDINGS verdict applies only to `b542159a`.
4. Keep MIS-003 and MIS-004 as product-policy discussion, not silent behavior changes; keep external HTTPS/UAT issue #61 separate.
5. Only owner can authorize merge or later synthetic hosted deployment. Real patient data, AI/STT, approval/release, consent, family threads and production/pilot remain NO-GO.


## TB-EM-019 — independent review and owner decision (2026-10-23)

1. Verify PR #65 exact HEAD against `main`, inspect the full 26-file implementation and the complete successful [hosted CI run 39999150532](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39999150532) at implementation SHA `b6a15de2854a45691753d477ed0040b9cc17cac6`. After this documentation checkpoint, validate its newer exact HEAD too; never rely only on an ancestor's CI.
2. Have **Mistral independently review read-only** the review packet, new API validation/snapshots, role/specialty boundaries, traceable evidence, report draft concurrency and data separation. Record exact SHA, findings/severity, test evidence and limitations. This is *not* an approval to merge.
3. Fix any blockers on the **same draft PR #65** and re-request exact-head review. One writer/PR, no separate feature branch or merge by agents.
4. After review, obtain explicit owner merge/deploy permission. Keep live Render/Neon and Work's external QA of the pre-feature demo unchanged until authorized; do not close issue #61 as if external HTTPS QA were verified for this new PR.
5. Open follow-up work only for unresolved broader features: audit-persistent accept/omit decision history, cross-source contradiction detection, comprehensive Child 360 report/review state, real cross-browser visual testing, true AI integration (policy gated), explicit child-wide referent record (not inferred), production/pilot readiness.

NO-GO remains: real patient data, external AI, actual audio/STT, clinical signing/approval/release, consent authorization, safeguarding escalation, family messaging, pilot and production.

## Historical records below (do not use as current instructions)


## TB-EM-019 continuation (2026-10-23)
FreeBuff: pick up draft PR #65, branch feature/tb-em-019-child360-evidence-assist, after exact-head CI. Finish Child 360 provenance/team, advanced goal-version progress and explicit clinician-selected goal-to-home-activity linkage; strengthen evidence review, responsiveness and tests. NO real AI calls, clinical signing/release, family messaging, production or Render redeploy. Refer to docs/product/TB-EM-019-DELIVERY.md and issue #64. Independent Mistral review/owner merge decision follows. Entries below are historical.


## Uninserted transcript recovery correction — 2026-10-22

Exact uninserted transcript retained in copy-only recovery after remote completion; no automatic insertion. Fixture/live transcript, revocation/failure regressions PASS; 468/468 PostgreSQL tests (12 suites), types/builds, responsive DOM, fresh migrations and Gitleaks PASS. Isolated real two-tab Actions job added with disposable synthetic seed, read-only permissions and cleanup. Hosted exact-head results follow push; independent review pending. See artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md. No issue #61 changes, merge or deployment.


## Multi-tab concurrency correction — 2026-10-22

Explicit conflict comparison/revalidated deliberate recovery implemented; stale autosave blocked. Full PostgreSQL 468/468 (12 suites), types/builds, real two-tab browser/API/database races and revocation/completion, responsive DOM and legacy migration PASS. Docker socket blocked; hosted exact-head status follows export. ChatGPT review pending. See artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md for execution details and limitations. No issue #61 changes, merge or deployment.


## Final review corrections — 2026-10-22

Verify the pushed exact HEAD and hosted test/secret-scan/compose on PR #59, then ChatGPT performs primary independent review of the incremental diff. Mistral routine re-review is not required by this owner request. Do not merge/deploy or activate STT (#60). Exact SHA supplied in export handoff. Local correction evidence: artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md.


## PR #59 follow-up — 2026-10-22

Owner authorized the R1–R5 correction checkpoint and managed-Git export on the same feature branch. After export, ChatGPT will verify new exact-head hosted test/secret-scan/compose and coordinate fresh independent Mistral re-review using artifacts/tb-em-015/PR59-DISPOSITION.md. Export handoff supplies the exact SHA and remote/PR verification. GitHub CLI remains unauthenticated; no comment/request posted. Authorized start correction/amendment policy remains OPEN; all start rewrites fail closed. Retain DRAFT; do not merge/deploy.

## Historical addendum — TB-EM-015

Finish authenticated draft-PR delivery against main, obtain exact-head CI including Docker Compose on an authorized runner, and request independent read-only Mistral review. Address findings at a new exact HEAD and request re-review. No merge/deployment without owner approval. Do not activate real recording or external STT before signed governance decisions. Follow-up AI report/home-plan/chart milestones are not implemented by this patch. See docs/emergent/workunits/TB-EM-015.md and artifacts/tb-em-015/VALIDATION.md.

## Historical bootstrap plan

ID: `TB-EM-001`
Title: Architecture feasibility and export proof
Role: Platform administrator
Phase: 1 — Foundation + center onboarding

## Acceptance plan
- Emergent reads owner's complete blueprint and continuity protocol.
- Produces one explicit architecture feasibility/portability decision.
- Produces center creation/application/approval workflow plan with exact permissions.
- Proposes a small real vertical slice with real persistence, scoped authentication and negative tenant tests.
- Explains exact existing-repository branch export mechanism (no force push to main).
- Documents all service/data/secrets omitted from GitHub export.
- Requests owner plan approval **before coding**.
- After approval, first implementation checkpoint must include reproducible cold-clone instructions and actual test results.

Blocked until owner's Emergent plan is returned and accepted. No code implemented.
