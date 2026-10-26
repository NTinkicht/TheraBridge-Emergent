## 2026-10-26 — TB-EM-045 integration qualification and handover

1. Qualify draft PR #105, `feature/tb-em-045-clinician-journey-navigation`, after updating all four required checkpoint files. Re-run all six jobs at the new exact HEAD; require test, secret-scan, live-session, preview-container, seven-role/demo-journey and compose SUCCESS plus fresh independent Codex/Mistral P0–P2 review and resolved discussions. No automatic merge or deployment.
2. After owner merges earlier milestone PRs #103 and #104, reconcile #105 with the new main and ensure the earlier progress/report components remain navigable from the four new buttons; re-qualify the final head if updated. Review cross-tenant/specialty, child URL continuity, mobile 320/390/768/1024/1440, permissioned reports and no fabricated source or report count.
3. Perform separate end-to-end hosted acceptance, real cookie/session and external browser work tracked in #61/#81. Synthetic GitHub CI and this read-only journey do not establish clinical readiness. External AI/STT, signing, consent, safeguarding, guardian clinical releases, pilot and production remain NO-GO. PR #97 is independent.

## 2026-10-26 — TB-EM-042 clinician event timeline qualification

1. Open draft PR `feature/tb-em-042-child360-clinical-timeline` based exactly on owner-merged `main@91036e063db2afc07fac2d9cdb6951d47e4711d1` (PR #101). Require exact-head six-job CI including real PostgreSQL/API, web builds, pure event source/chronology tests, synthetic 7-role Chromium and 320/390/768/1024/1440, secret scan, live-session, preview and Docker Compose. Fix P0–P2 and obtain independent exact-head review before owner-authorized merge.
2. Review event date semantics (plan.updatedAt last update vs clinician-reviewedOn vs server checkpoint.at), no hidden truncation, specialist filter, reused goalKey across plan versions, orphaned source-link honest labeling, effective keyboard/320px navigation, absence of family outcomes or clinical inference, no new data fetch or permissions. Existing authorized workspace remains the only clinical source.
3. After merge, continue Milestone 1 with advanced progress/report context, source consistency cues and complete clinician care-journey acceptance, not duplicate earlier goals/activity/home-plan features. PR #97 reviewer control-plane remains isolated. Clinical signatures, approval, consent grants, safeguarding actions, family clinical release, external AI/STT, real patients and deployment/pilot remain NO-GO. Hosted issue #61 baseline unchanged.

## 2026-10-26 — TB-EM-041 saved plan preview qualification

1. Open a DRAFT PR for `feature/tb-em-041-exact-plan-preview` from merged PR #100 `main@ab9a87737d5c104890ed4e40d5609fc58adae1fa`. Qualify six-job exact-head CI (PostgreSQL/API, Next builds, pure snapshot/report origin tests, seven-role 320–1440 Chromium, preview-container, live-session, gitleaks, Compose), independent exact-head P0–P2 reviewer, resolved threads, owner-approved merge. No auto deploy.
2. Independently review **saved-vs-unsaved** invariants, original report source goal mapping restricted to `originalPlanVersionId`, no link to absent current goal, historical snapshot precedence over changed library, missing-template safety labeling, no inherited clinical evidence and guardian isolation. Browser overlay represents fictional authorized read-model presentation ONLY, not hosted QA or real clinical sign-off.
3. After merge, Milestone 1 remaining integration slices: richer clinician Child 360 clinical timeline, advanced progress/report context, exception/source consistency, complete 7-role journey QA. External report/plan release, AI/STT, guardian messages, clinical approvals/sign/co-sign, consent grants, safeguarding escalation, production/pilot continue NO-GO; #61 hosted ledger unchanged. PR #97 control plane separate.

## 2026-10-26 — TB-EM-040 qualification and next slice

1. Open draft PR from `feature/tb-em-040-home-activity-details`, based at merged PR #99 `main@f40360b595a42f8735e3f7a80be1221e00dbb0e6`. Require exact-head six-job CI: PostgreSQL/API and web builds, pure snapshot priority and note tests, seven-role Chromium with five viewport widths, preview, live-session, secret scan and Docker Compose; independently review note max 500 client/server, dirty-state lock, saved snapshot vs current mutable library precedence, historical notes and calendar, specialty isolation, no guardian release. Fix P0–P2 and resolve threads before separate owner-authorized merge; no auto deploy.
2. After merge continue focused Milestone 1 completion: source-consistent clinician report/plan internal preview, richer Child 360 clinical timeline, longitudinal progress/export context and report provenance gap closure. Do not invent a per-plan editable duration without compatible DTO and versioned server storage. Reassess completed items to avoid duplicate work.
3. PR #97 control-plane AI reviewer remains separate. Clinical signing/co-sign, consent grant, guardian report/plan release, safeguard action, real audio/STT, provider AI, production pilot still NO-GO; hosted #61 not changed.

## 2026-10-26 — TB-EM-039 qualification and subsequent milestone

1. Open draft PR for `feature/tb-em-039-home-plan-handoff` from merged main `d9921cb94dca0ca949f1af0b3d1847ebdc51a345`. Require six-job exact-head CI (PostgreSQL/API, Next, synthetic seven-role 320–1440 Chromium, secret scan, preview, live-session, Compose); independent review of save-first semantics including **other dirty plan**, server submit/version authority, no unintended hard gating of legacy plans, client-only advisory language, and correct safety-snapshot precedence. Fix P0–P2 before owner-authorized merge; never auto deploy.
2. Next logical work after merge: reassess remaining Milestone 1 gaps before Milestone 2 family operations. Prioritize only functionality not already merged or gated by owner policy. Keep PR #97 review-control-plane separate; avoid touching its branch.
3. All production, family clinical report/home-plan release, external AI/STT, signature/co-sign, consent grants, safeguarding escalation and live pilot remain NO-GO. Hosted #61 acceptance ledger unchanged.

## 2026-10-26 — TB-EM-038 qualification and continuation

1. Open DRAFT Slice 9 PR; require exact-head six-job CI, including PostgreSQL/API, Next web build, pure month recurrence, seven-role synthetic browser responsive 320/390/768/1024/1440, live-session, preview-container, secret scan and Compose. Independently review local-calendar date math, no 40-item truncation, cross-version isolation, saved historical snapshot title preference, missing schedules and forbidden family/clinical release. Fix P0–P2, resolve threads, request owner approval before merge. No auto deploy.
2. After merge, reassess remaining clinician experience: source-linked internal home-plan editor handoff, better longitudinal goal context, and scheduling usability. Avoid repeating already merged Milestone 1 slices. PR #97 reviewer integration is a separate control-plane PR; do not change it from this branch.
3. Keep clinical sign/co-sign, consent grants, family clinical release, safeguarding escalation, external AI/STT, real records and live pilot blocked. Hosted #61 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 historical supplemental PASS).

## 2026-10-25 — TB-EM-037 qualification and next slice

1. Open draft PR from `feature/tb-em-037-checkpoint-comparison`. Qualify exact HEAD with six standard CI jobs (PostgreSQL/API, Next builds, seven-role responsive loopback Chromium with fictional-only checkpoint overlay, preview, live-session, scan and Compose). Independently review strict same-version/goal boundaries, timestamp ordering, sparse/historical checkpoint handling, accessible responsive controls, no clinical inference or guardian access; fix P0–P2 and resolve threads before separately authorized merge. No automatic deploy.
2. Once merged, complete a dated internal home-activity calendar view using the already-validated weekly/monthly recurrence; use only authored draft schedules, keep date-timezone and 366-day bounds, do not confuse scheduled activities with attended sessions or approved family release. Defer P3 from #94: cosmetic absent-section filter option, checkpoint source search fixture, and mismatch visibility hint.
3. No external AI/STT, real patient data, audio recording, clinical signature/consent/safeguarding release, guardian clinical access, hosted QA ledger change or pilot.

## 2026-10-25 — TB-EM-036 source inspector qualification

1. Open a DRAFT PR from `feature/tb-em-036-claim-source-inspector`; verify its exact final HEAD through all six CI jobs (real PostgreSQL/API, responsive seven-role Chromium, web build, preview, live-session, secret scan, Compose). Review the fictional multi-claim route overlay strictly as UI coverage; it is not proof of source hash validity or hosted acceptance. Fix P0–P2 defects on the same branch and obtain independent exact-head review; resolve threads; do not merge or deploy without owner-authorized gates.
2. After qualification, continue Milestone 1 with read-only *within exact plan-version* longitudinal clinician goal-review checkpoint comparisons and dated home-practice calendar visualization. Never merge observations across historical goal versions or infer clinical outcomes. Keep guardian-visible clinical report content isolated.
3. No real audio/STT, external AI, sign/co-sign, consent grants, safeguarding escalation, family clinical release, live Render changes or clinical pilot; #61 QA baseline unchanged.

## 2026-10-25 — TB-EM-035 closeout gates

1. Qualify new branch/PR exact HEAD with PostgreSQL report decision regression, frozen version source fidelity, pure multi-claim/stale/malformed cases, Next.js build, seven-role browser at five widths, secret scan, preview and Compose smoke. Fix P0–P2 findings on same branch and request exact-head independent review. Do not merge without owner approval.
2. Next Milestone 1 continuation: in-report inspector for multiple clinician claim associations, richer longitudinal goal checkpoint comparison, immutable review provenance; maintain compatibility with legacy saved versions and keep family-visible content completely isolated.
3. No external AI/STT, clinical signing/co-signing, consent, sensitive behavior safeguarding actions, authorized family report release or production pilot. Hosted issue #61 baseline stays 53 PASS, 0 FAIL, 47 BLOCKED, 4 NOT TESTED (+4 supplemental historical PASS).

## 2026-10-25 — TB-EM-034 gates

Run exact-head 6-job CI including PostgreSQL e2e for source/role/replay/immutability, seven-role browser and five viewport widths, web and API builds, secret scan, Docker Compose smoke. Fix all P0–P2 findings on the draft branch and request exact-head independent review before marking Ready. No automatic merge/deploy; follow owner process. Then milestone continues with evidence-linked report statements and explicit checkpoint follow-up reading, maintaining unsigned synthetic clinical-only boundaries.

## 2026-10-25 — TB-EM-033 review-readiness closeout

Qualify exact HEAD of `feature/tb-em-033-goal-review-readiness`: API/web builds, PostgreSQL/regressions, pure date+version test, responsive seven-role Chromium and exact report→goal deep link, secret scan, Docker Compose smoke. Fix P0–P2 on same PR, independent exact-head review, resolve threads, mark ready only after gates. No merge or deploy without further owner instruction. Future Milestone 1 steps: persistent clinician-authored goal review checkpoints (separate from goal definition immutability), evidence-to-report statement trace UI and retrospective goal reviews; no automatic clinical effectiveness inference or guardian release.

## 2026-10-25 — TB-EM-032 review and qualification gates

1. Execute exact HEAD PostgreSQL API/scope, Next.js web build, pure goal source pairing, seven-role synthetic Chromium 320–1440 px, security scan, container preview and Docker Compose smoke. Correct actionable P0–P2 on same draft PR. Request independent exact-head review; no auto merge/deploy.
2. After qualifying the first provenance display, extend Milestone 1: source-to-report sentence anchors, richer goal milestone reviews and longitudinal comparisons, read-only authorized cross-document navigation, dated home-practice calendar views. Never infer progress from family-practice feedback.
3. Clinical sign/co-sign, releases, safeguarding, consent grants, supervisor-family discussions, external AI/STT and production pilots remain denied pending signed policy. Hosted #61 acceptance unchanged.

## 2026-10-25 — TB-EM-031 qualification and Milestone 1 continuation

1. Run exact HEAD 6-job CI on the new PR: PostgreSQL clinical regressions and scope, pure calendar helper, frontend build, disposable seven-role/320–1440 responsive browser, Docker Compose smoke and secret scan. Fix any actionable P0–P2 in same branch, request exact-head independent source review; do not automatically merge or deploy.
2. After merge, Milestone 1 remains: richer goal milestone review workflows; persistent source/observation-to-goal traceability UI; complete dated calendar presentation and report-to-home-plan provenance. Retain separation of synthetic family-practice feedback from clinical observation evidence.
3. All production, external AI/speech-to-text, clinical signing, consent grant, safeguarding escalation, release and parent clinical visibility remain policy blocked. Hosted issue #61 acceptance unchanged (53 PASS, 0 FAIL, 47 BLOCKED, 4 NOT TESTED, four historical supplemental PASS).

## 2026-10-25 — PR #88 reviewer corrections: closeout

1. Verify exact-HEAD CI of synchronous transition lease, whitespace title validation, pending-submit synthetic browser race and navigation fallback changes. Inspect jobs; fix any P0–P2 failure on PR #88. Request exact-head independent re-review; resolve Codex's remaining race thread only after verification. No self-approval or automatic merge/deploy.
2. Once independently qualified and merged by owner-authorized process, proceed to remaining Milestone 1 features: short/long-term objective metadata, goal due/review dates, weekly/monthly home plan, source provenance UI. Preserve no guardian clinical access, release or AI/STT activation.
3. Keep historical CI runs distinct from current branch, and keep issue #61 hosted acceptance unchanged (53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED, +4 historical supplemental PASS).

## 2026-10-25 — TB-EM-030 closeout gates

1. Await exact HEAD GitHub CI for corrected PR #88; inspect API Postgres/browser failures and fix on SAME branch. Verify code review against latest head, especially report save lease, double-submit/ambiguous retry, durable fingerprint audit, role scopes and unchanged consent/release denials. Re-review/resolved threads before owner merge; do not automatically deploy/merge.
2. After qualification, proceed to Milestone 1 short/long-term goal metadata and milestones; weekly/monthly dated home-activity plan scheduling; visible source-to-plan audit UX and richer evidence continuity. Keep one active PR at a time, no duplicate writer branch.
3. Hosted acceptance issue #61 and pending safeguarding/clinical/AI policy gates remain separate; no CI browser run counts as hosted acceptance.

## 2026-10-25 — Milestone 1 / TB-EM-030 next actions

1. Qualify `feature/tb-em-030-report-to-plan-draft` with exact-HEAD GitHub CI (API/PostgreSQL, web build, seven-role synthetic browser, Docker Compose, secret scan); correct any P0-P2 issue in this same PR; independent source review. No merge/deploy until approved gates. Verify authorization, report-version identity and request replay under concurrent calls as a possible P3 follow-up.
2. After this first handoff is merged, continue same Milestone 1: short-/long-term objective metadata, timeframe/review dates, richer home-plan weekly/monthly scheduling and goal-linked activity prescription, provenance shown in plan UI, and cross-document report/plan navigation. Avoid generating medical instructions from report prose; no family clinical release.
3. Work QA remains separate; do not interpret CI Chromium as hosted acceptance. Clinical signing, co-sign, supervisor discussions, consent grants, media, STT, real AI and release remain denied until owner-signed policies.

## 2026-10-25 — PR #87 closeout and next vertical slice

Complete exact final-head CI and verify review-thread status; merge PR #87 only once protected GitHub gates permit. No further P3 work required on this PR: seed-independent browser fixture and broader removed-item UI testing are later QA improvements, not blockers. Do not update hosted issue #61 without actual approved evidence. After merge return to clinician-controlled home-plan and report evidence traceability roadmap, preserving synthetic-only clinical restrictions. No real speech-to-text, AI medical inference, signing, approval or release authorized.

## 2026-10-25 — TB-EM-029 next gates

1. Open draft PR from `feature/tb-em-029-plan-version-history`; run exact-head CI (including pure goal diff and seven-role disposable-browser regression), inspect failures, fix on same branch, and request independent review. Do not merge without required gates/owner authority.
2. Validate that historical snapshots remain read-only, clinicians see only their current authorized child/specialties, draft status labels never imply approval/release, and same-goal keys across versions never aggregate measured observations.
3. After merge, issue #37 can be closed if accepted. Parent-facing plans, speech-to-text, AI clinical inference, approval, signing and report release remain policy gated. No protected hosted QA rerun or #61 ledger change from this PR; P3 UI backlog can remain separate.

## 2026-10-25 — PR #86 remaining gates and follow-up

1. Verify documentation-only checkpoint commit, exact-new-head CI and review; confirm Codex P1 is addressed and all review threads resolved. Apply protected-branch/independent-approval requirements; do not self-approve or bypass. Owner to merge after gates are satisfied; repository AGENTS.md prohibits automatic merging.
2. Do not count hosted acceptance from offline tests. Following an explicitly authorized deployment, run focused synthetic seven-role smoke checks; only an approved complete evidence review can change #61's 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 supplemental PASS). Investigate hosted session cleanup warnings separately; no automatic new hosted run.
3. Advisory follow-up P3 (not PR #86 merge blockers): independent UI assertion instead of duplicate indicator color, CI dropdown interaction/permission checks, activity creation aria-controls and toggle/save regressions, and exact pathname comparison for /select-context. Avoid re-running the entire 104-case suite for small fixes.
4. Continue synthetic Child 360, care referent, evidence traceability and clinician-controlled home plans workstream; real STT, clinical signing, release, consent and production remain policy-gated.

## 2026-10-25 — TB-EM-028 hosted QA run #40175463830; container path fix (PR pending)

The first authorized hosted workflow run 40175463830 reached Chromium, private synthetic seven-role credential preflight and public /api/health successfully. Collector reported **1 PASS / 0 FAIL / 41 BLOCKED** for 42 N-052..N-093 test outcomes, plus session logout warnings; these are *new run receipts, not accepted case updates*. Workflow then failed writing `collector-exit` to GitHub's host-expanded `runner.temp` path `/home/runner/work/_temp` from inside the Playwright container (mount actually exposed at `/__w/_temp`). As a result no encrypted artifact was uploaded and #61 remains **53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED** (+4 historical supplemental PASS).

Corrective branch replaces all runner.temp file paths in the container with `/__w/_temp`, explicitly creates receipt directory, and runs encryption/upload before the intentional incomplete status on BLOCKED cases. Adds static workflow path/privacy/order tests to `qa-readonly-contracts`; exact-head CI **NOT YET VERIFIED**. No credentials, raw cookies, screenshots, Render deployment or clinical policy changed. Follow-up investigation of six session-cleanup warnings needed. No automatic hosted rerun is permitted without renewed owner authorization.

## 2026-10-25 — TB-EM-028 private external QA runner (#81; CODE ADDED, NOT QUALIFIED)

A manual-only main-branch GitHub Actions workflow now proposes a matching Playwright 1.48.2 preinstalled Chromium container, strict seven-role secret-file validation, public health preflight, five CSS viewports, cookie attribute review, AES-256-GCM encrypted screenshot receipts and short retention. Source: `scripts/qa/prepare-hosted-run.mjs`, `scripts/qa/evidence-crypto.mjs`, `.github/workflows/hosted-responsive-private.yml`, offline tests and `docs/qa/TB-EM-028-PRIVATE-HOSTED-WORKFLOW.md`. **No real hosted run, credentials, browser screenshot, Render deployment, environment protection or secret configuration is verified by this code change.** Offline CI and independent code review are pending. Issue #61 remains 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 historical supplemental PASS); Work's 42 blocked preconditions did not execute new assertions. Scope synthetic only; do not infer clinical or hosted acceptance. Issue #81 remains open until operator config and actual approved run.

## 2026-10-25 — PR #78 accessibility follow-up to DeepSeek review

The chart date error now appears directly after date fields and both invalid inputs receive Field error/ARIA linkage. Previous exact head bdc3ecf completed 6/6 CI green, but new changes REQUIRE fresh CI and exact-head review. No clinical policy changes or hosted deploy. Hosted acceptance issue #61 remains 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED.

## 2026-10-25 — TB-EM-027 review-queue pagination and expanded QA (PR #79 DRAFT)

Issues #75/#77: CODE ADDED (NOT QUALIFIED). A parameterized PostgreSQL JOIN replaces materialized ACTIVE-child UUID lists, with a centre/active-child/IN_REVIEW scope, server child/service/search filters, bounded 25-row pages, deterministic updatedAt+id order, centre and filtered counts. New 102-report real PostgreSQL regressions exercise pagination beyond 100, metadata and authorizations; disposable synthetic Chromium checks five widths and focus-visible. Existing clinical write/approval/release permissions remain unchanged. Exact-head CI and Codex verdict PENDING at authoring. The clinical disposition for archived-child pending IN_REVIEW reports remains an UNSIGNED owner decision, not an automatic status transition; follow-up policy decision required. No protected Render deployment or #61 acceptance change.

## 2026-10-25 — TB-EM-026 CI failure and regression correction

At `1ad25b581f7aecbe1557979d806fd84edfc570ce`, GitHub CI runs 40130052063 / 40130047227 **FAILED** (API job: 481 PASS / 1 FAIL, `progress-reports.e2e-spec.ts:132`). Cause verified from CI logs and source: archiving a child permanently ends therapist care assignments; restoring the child does not restore their access, so the same workflow's subsequent therapist report read correctly returned 404. Not an application regression. Corrective commit `bfb2340f4099ab3e68512cfb9867a5e37dc627eb` moves the archive/restore queue check into an isolated synthetic PostgreSQL test and explicitly asserts ended therapist assignments and denial of therapist report access after restore; original report workflow is no longer interrupted. New exact-head CI and review **NOT YET QUALIFIED** at authoring. No clinical policy changes, no deployment. Preserve #61 hosted acceptance baseline.

## 2026-10-25 — TB-EM-026 PR #74 DeepSeek review remediation

At previous HEAD `e9325c5322ff666e01313ff448b3ebfe8f417b06`, CI pull-request run 40128332485 and push run 40128329125 both completed SUCCESS (six standard jobs). DeepSeek later reported CHANGES_REQUIRED because the documentation claimed DRAFT-exclusion was tested when it was not. That is a genuine P2 qualification gap; the source predicate was already correct. **This corrective branch adds a real pre-submit DRAFT exclusion test.** It also adds coordinator/foreign-centre access checks, archive/restore visibility, accessible report-specific link names, consistent diacritic folding, clearer centre-wide count and 100-row cap messaging, and a chart-period-independent queue with browser regression. These new modifications are CODE ADDED; **exact corrective HEAD CI and external review remain NOT VERIFIED at this checkpoint**. Existing CI at e9325c5 does not qualify new commits. Longer-term server-side filtered pagination and active-child query performance improvements stay advisory in issue #75. Archived-child IN_REVIEW records remain hidden without status changes; no clinical policy decision made. No protected Render/Neon changes, hosted issue #61 unchanged, clinical gates NO-GO.

## 2026-10-24 — TB-EM-026 supervisor review queue (PR #74, DRAFT)

Source HEAD under qualification: `bc51a8bc8f5430121ec21cff902570709af366d9` plus this correction. Adds server-authorized, metadata-only supervisor review queue to the Progress page with search, links, and PostgreSQL/Chromium regressions. Codex P1 required checkpoint records, and P2 required a populated fixture: both corrected in this branch. **CODE ADDED; new exact-head API/Chromium results NOT YET VERIFIED.** Full six-job Actions CI and fresh independent review required. No merge/Render deploy. External hosted QA issue #61 remains OPEN (53 PASS, 0 FAIL, 47 BLOCKED, 4 NOT TESTED, plus 4 supplemental PASS); real AI/STT, clinical authorization, consent and release remain NO-GO.

## TB-EM-024 — PR #72 acceptance

CI on `b234c519` verified 6/6 PASS (run 40117705186). Recheck the newer read-only-role regression/documentation update on its own exact head, especially the staff library Chromium tests. If failing, correct the actual failure in a new commit. Request exact-head Codex/Grok/Mistral/DeepSeek independent review. Keep draft until reviewer findings and CI are resolved; owner controls merge/deployment. Separately, Work continues hosted QA issue #61. No clinical gate activation.

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
