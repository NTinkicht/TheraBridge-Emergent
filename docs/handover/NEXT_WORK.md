## 2026-10-31 — CURRENT: M2-H04 PR #142, five required issues

1. **Complete both owner-approved carried-over P1 issues in PR #142: #124 HTTP security and #121 therapist revocation.** PR #141 merged documents only; its feature scope is not complete and must not be treated as fixed.
2. **Complete all three original M2-H04 issues in that same PR:** #120 safe additive foreign keys/indexes and transfer/audit integrity, #119 N+1/center-lock performance and concurrency, #126 bounded queries/reminder idempotency/rate-limit pruning. Read current models instead of blindly applying obsolete audit examples.
3. Run real-PostgreSQL regression and lock-wait tests, verify six exact-final-head CI jobs, request a new independent Codex review on the final implementation code, disposition every reviewer finding and merge only if Rule 16 qualifies. Keep draft during work. No clinical/production approval is implied.
4. **Only after all five issues actually qualify and #142 merges**, open next frozen item **M2-H05 (#122, #123, #125)**. Historical instructions below have been superseded by explicit owner-approved carryover.

## 2026-10-31 — CURRENT ordered next work: M2-H03 PR #141 (#124, #121)

1. **Work on [PR #141](https://github.com/NTinkicht/TheraBridge-Emergent/pull/141), item 4/12 (M2-H03).** Its opening HEAD `bbc85cdb174be6b1f43726e161b54cfd8a82cbb3` only planned the work; **implementation is NOT STARTED**, so do not merge or mark work complete based on its documentation-only CI/reviews.
2. **#124 HTTP security:** inventory current NestJS/Fastify routes and Prisma errors; implement private no-store responses, safe rate limiting across sessions/instances, GET read-only semantics, known-error sanitization, CORS allowlist and global body limit. Add negative and compatibility regression tests.
3. **#121 therapist revocation:** inventory current membership, assignments, child referents, recurring series, future appointments and notices. Keep every cascade tenant-pinned and transactional with established lock order; regression-test concurrent membership revocation, last child-referent removal, series reschedule/cancellation and exactly-one-winner behavior.
4. Re-run real PostgreSQL API tests and six required jobs on the final implementation HEAD; get an independent exact-head Codex review; disposition all P0–P3 findings. Merge only after Rule 16 qualifies, preserving synthetic-only and unsigned clinical NO-GO gates.
5. **Immediately after #141 qualifies and merges, open next frozen item M2-H04 — Database Integrity, Concurrency and Performance (#120, #119, #126)** under Rule 17. Do not reorder or silently skip issues.
6. Historical instructions below that describe M2-S01 or #139 as still open were correct only when written and are **superseded** by this checkpoint.

## 2026-10-31 — Frozen Milestone 2 next actions after M2-H02 merge

1. **M2-S01 (#35) family messaging:** finish server deny-by-default on every free-text route and deployed permission disclosure; test synthetic fixture-only behavior, all-denied deployment modes, historical read denial after revoked guardian link and independent household privacy. Run six exact-head jobs and obtain independent Codex review before merge.
2. After M2-S01 qualifies and merges, immediately **open M2-H03 (#124 + #121)** — HTTP Security and Therapist Revocation — per the owner's new automatic same-milestone handoff instruction. Do not reorder the frozen 12-item plan.
3. Retain separately signed D-NEW-5 safeguarding, D4 custody and D7 consent decisions as NO-GO; the fail-closed implementation does not resolve or pre-approve clinical policy.

## 2026-10-31 — Frozen Milestone 2 queue after M2-H02 work

1. **Complete PR #139 (M2-H02, #117 and #118):** run all exact-final-head CI jobs (test, secret-scan, live-session, preview-container, demo-journey, compose), obtain independent current-head review, disposition every P0–P3 finding, and merge automatically only if Rule 16 is satisfied. Preserve documented test evidence and handover checkpoint.
2. **Next ordered PR M2-S01: Family Messaging Security and Fail-Closed Enforcement (#35)** only after M2-H02 is merged; then M2-H03 (#124, #121), M2-H04 (#120, #119, #126), M2-H05 (#122, #123, #125), M2-H06 (#127–#130), M2-H07 (#131, #132, #112, #114), M2-H08 (#133, #135, #136), M2-QA01 (#81, #61).
3. **Owner approval gates remain:** TB-EM-052 (#115) requires explicit transfer/handover approval; TB-EM-053 protected family-plan/report release requires signed consent, privacy and safeguarding approvals. Neither is authorized by ordinary auto-merge policy.
4. **Do not replan** the frozen 12-item order; follow the next specified work unit rather than opportunistic scope changes.

## 2026-10-31 — M2-H02 / GH-01 specialty isolation implementation queue

1. Implement GH-01 (#117) in this draft PR: audit current code/fixtures first, then enforce child + required specialty authorization for therapist clinical/report/governance/practice reads and mutations, including cross-caseload denials and linked goal/session specialty consistency.
2. Add real PostgreSQL/HTTP regression matrix covering allowed same-specialty actions, denied wrong-specialty, unassigned, inactive/revoked and cross-center/child access (non-confirming 404), plus mismatch 400. Preserve existing admin/coordinator authorization only where policy truly permits it.
3. Maintain strict synthetic-only and clinical NO-GO boundaries; no release, consent, real records or production rollout.
4. Verify all six exact-final-HEAD CI jobs, independent review, and every P0–P3 finding's FIX_NOW / DEFER_ISSUE / DECLINE_WITH_REASON ledger. The new autonomous merge policy is **proposed**; apply only after it is effective on main and fully qualified.
5. Keep GH-18 historical Prisma migration chronology OPEN, using no unsafe in-place rename.

## 2026-10-31 — PR #137 final P3 qualification

1. Verify six required CI jobs on the FINAL documentation/code HEAD: `test`, `secret-scan`, `live-session`, `preview-container`, `demo-journey`, `compose`. The `test` job must pass the new real-PostgreSQL COMMIT-acknowledgement, missing-identity, and interrupted-seed fixtures.
2. Record explicit PR discussion FIX_NOW dispositions for all three P3 follow-ups from independent review 5717799244, including commit references and final CI status.
3. Request only one stabilized Codex exact-HEAD review after CI green (PR #137 is already ready; check if automation dispatched first). Re-dispose any new findings.
4. Do not merge until owner decision. No clinical activation or historic Prisma migration rename; GH-18 chronological question remains OPEN.

## 2026-10-30 — M2-H01 reviewer remediation qualification

1. Re-run six exact-HEAD jobs after all P2/P3 fixes, especially the real PostgreSQL rollback tests and the seven-role demo. Do not reuse `06b2f21` green CI as new-head qualification.
2. Once code is stable and CI green, mark PR #137 ready and use the existing automated single Codex review; do not manually duplicate paid review. Check new comments and disposition every finding.
3. Preserve all published migration identities; retain GH-18 chronology issue OPEN until the actual applied `_prisma_migrations` ledger can justify any forward-compatible repair.
4. Require explicit owner merge decision. Do not activate real transfer, real health data, or family clinical release.

## 2026-10-30 — M2-H01 exact-HEAD qualification and migration-identity decision

1. Run required PR CI including seven migration-guard cases, both seed fault-injection tests, clean DB migrations, existing through-012 upgrade simulation, demo seven-role browser and preview deployment checks. Resolve type/build/runtime regressions and repeat all six jobs on corrected exact HEAD.
2. Obtain the `_prisma_migrations` ledger from a disposable/synthetic representative upgraded database, identify actual published 049 folder and checksums, then determine whether any chronology correction is *needed*. Never rewrite historical applied migration names or checksums. If a remediation is required, develop a forward-only, upgrade-tested plan first.
3. Ensure the deferred credential-file write behavior is documented for filesystem write failure recovery; never export a credential file on a failed transaction.
4. Review all independent PR feedback and disposition with FIX_NOW / DEFER_ISSUE / DECLINE_WITH_REASON, with 6/6 exact-head CI and explicit owner merge approval. Keep clinical transfer and family release disabled.

## 2026-10-29 — TB-EM-051 policy/technical-design draft qualification

1. Verify `scripts/qa/verify-tb-em-051-gates.mjs` executes in required `test` CI on exact final PR head. Its positive pass means only **unsigned/blocked** state and unchanged runtime invariants. Fix any test errors; rerun all six jobs at changed HEAD; do not confuse green CI with policy approval.
2. Audit plan and register against private canonical human signoff list: D10/PFR-CT-01, OR-15/D-NEW-2, OR-16, D7, D-NEW-5, D4, D1, clinical scope and security/audit. Record owner names, verifiable signatures/digests and scope only after genuine authorized decisions; until then all `UNSIGNED`, `BLOCKED`.
3. Obtain exact-head independent P0–P2 review after CI stable; log all reviewer findings as FIX_NOW/DEFER_ISSUE/DECLINE_WITH_REASON. Respect review-budget rule; no duplicate Codex request on intermediate commits. Owner approval required before merging design PR.
4. Later work **blocked by issue #115**: actual caseload replacement, transfer of pending items/clinical data, signer/consent/grants and production deployment. Plan for atomic source assignment revocation and target grant only after signed policy, no direct route now. Deferred history #112, cross-session browser #114, external hosted QA #81 not part of this design scope.

## 2026-10-29 — PR #113 final corrected-HEAD qualification and second review

1. Wait for all six latest-HEAD GitHub CI jobs (test incl PostgreSQL archived-child and supervisor regression, secret-scan, live-session, preview-container, demo-journey, compose) to pass. Fix failures on feature/tb-em-050-handover-readiness, rerun on any new commit; do not infer status from old 7b6551f8dc green run.
2. Re-read PR #113 comments, threads, Codex summary and exact HEAD/BASE. If no already pending request at current HEAD+BASE, post **one** owner-authorized second Codex review for the corrected SHA after CI green; provide exact SHA and focus on lock-free authorization, child archival, UI freshness, no data grants or clinical signing/release. Otherwise avoid duplicate request. Obtain and disposition all findings.
3. Apply universal policy FIX_NOW / DEFER_ISSUE / DECLINE_WITH_REASON to all fresh suggestions; browser multi-session UI test deferred to #114 with criteria, while on-demand status synchronization is already fixed. No automatic merge.
4. Clinical approvals, purpose-specific consent, genuine transfer/reassignment and real family/clinician access remain explicit NO-GO pending owner-signed policy. Hosted QA #81 incomplete.

## 2026-10-29 — TB-EM-050 draft PR qualification

1. Open draft PR from feature/tb-em-050-handover-readiness based on merged main@ef1761a36d62bd626baf9a587798f0fc11afd35b. Verify readiness code contains no assignment/clinical/consent writes.
2. Require six successful CI jobs at final exact HEAD (real PostgreSQL handover tests, authz/route inventory, Next.js compile/UX, security scan, live-session, preview-container, demo-journey and Compose). Fix red job causes and rerun.
3. Apply owner-approved reviewer disposition policy (every P0-P3 FIX_NOW / DEFER_ISSUE / DECLINE_WITH_REASON). Obtain independent current-head P0–P2 review after stabilization; avoid duplicate/overlapping Codex usage. Owner decides when to merge.
4. Next policy dependency: authorized sign-off for real staff replacement, purpose-specific consent, receiving clinician scope and clinical documentation visibility. Until these decisions, no actual transfer or release; hosted QA #81 remains incomplete. Follow-up issue #112 is deferred P3 history UX.

## 2026-10-29 — Immediate post-policy PR #111 qualification

1. Verify corrected exact-HEAD CI for all six jobs; inspect new real PostgreSQL cancel-first/acknowledge-second concurrency test and frontend button guard. Fix red jobs before review.
2. Inspect any new Codex comments on original e7caba SHA: apply real P0–P2 fixes, record every P3 as FIX_NOW, DEFER_ISSUE or DECLINE_WITH_REASON. **Do not treat the prior SHA review as qualifying the new HEAD**. Avoid duplicate Codex requests; request one final exact-head review only when CI green and stable.
3. Confirm current PR #111 disposition ledger and issue #112. Keep draft/unmerged until complete qualification and owner authorization.
4. Retain synthetic-only disabled-by-default handover flag, no clinical access transfer or release. After merge the documented review policy will apply repository-wide through AGENTS.md and the PR template.

## 2026-10-29 — TB-EM-049 corrected-head qualification

Inspect exact-head six-job CI including PostgreSQL status migration, 17+ e2e suites, real row-lock tests, security routes, web build, live-session, demo-journey, preview-container, compose and secret scan. Fix failures and repeat at the new exact HEAD. Only after CI is green and code stabilizes, request one Codex P0-P2 re-review to conserve credits. Compare new independent findings with corrected code, resolve all actionable blockers before owner-authorized merge. Actual therapist re-assignment, clinical chart access, consent, signing and family release are NOT authorized in this operational handover preparation slice.

## 2026-10-29 — TB-EM-049 immediate next actions

1. Run all six exact-HEAD CI jobs including Nest/Web TS build, PostgreSQL handover.e2e, route inventory and browser demo. Correct failures and rerun on new HEAD.
2. Once code stable and CI green, request one credit-conscious Codex exact HEAD P0–P2 review; check authorization, idempotency, concurrency and leakage, and handle actual findings. Do not request Codex per intermediate commit.
3. Require owner merge decision after all reviewers/CI green. Keep HANDOVER_DEMO OFF for hosted/production and unchanged clinical governance NO-GO.
4. Next follow-up in same roadmap work item: *guarded actual therapist replacement and clinical handover acceptance* with independent authorization signatures/consent decision; do not implement by merely changing operational acknowledgement status.

## 2026-10-29 — PR #109 last qualification

1. Inspect exact-head six-job CI for corrected source (especially PostgreSQL races, Prisma migration generate/typecheck, AC-9/AC-11 test suite, Chromium family/staff journey, Compose).
2. If failures, fix code/tests and rerun exact-head CI; do not spend Codex review until CI is all green and HEAD stable.
3. Then request one Codex independent exact-HEAD P0–P2 re-review covering staff-role/specialty, end-assignment and guardian revocations; address actionable findings.
4. Reply to existing four Codex inline threads and three independent reviewed-body findings with tested evidence, resolve only after verifying fixes; request owner merge authorization separately.
5. No clinical content, signing, consent/release, or production operations enabled; next milestone remains therapist replacement and controlled clinical handover.

## 2026-10-29 — TB-EM-048 final qualification after permission-matrix update

Re-run exact-HEAD six-job CI after revised RBAC expectation tests and pending-history fix. Review latest Codex threads P1 guardian-link row race, P2 pending-idempotency rejection and P2 pending-history pagination/drop. Reply with tested fix evidence only; resolve after new exact-HEAD independent review. Keep this PR DRAFT and require owner merge authorization. Hosted and clinical release still NO-GO.

## 2026-10-29 — PR #109 corrected-head qualification

Requalify latest exact HEAD after guardian-link row lock, idempotency rejection, concurrency test and CI browser journey were added. First inspect six real CI jobs (including PostgreSQL lock-wait test and Chromium family/staff workflow); fix failures and request new exact-HEAD Codex independent review. Resolve original P1/P2 threads only with verified fixes. Do not mark an old SHA's review as current. Draft/no merge until owner decision; production/hosted flag remains OFF and clinical NO-GO intact.

## 2026-10-29 — TB-EM-048 qualification and next unit

1. Qualify synthetic guardian home-plan requests on exact current PR branch: Prisma migration on fresh PostgreSQL, Nest/Web compile, e2e permission and idempotency tests, five-width seven-role browser, Gitleaks, live-session, preview-container and Compose. Fix any errors with a new exact-head qualification cycle.
2. Obtain independent Codex P0–P2 code review; inspect Grok/Mistral when actually received and verify model/source evidence. Resolve all actionable threads. A prior review on PR #108 cannot qualify TB-EM-048.
3. Keep `HOME_PLAN_REQUESTS_DEMO` OFF for hosted/production by default. No family-facing clinical content or safeguarding discussion. External QA #81 stays INCOMPLETE.
4. After exact-head CI and review, request owner authorization to merge. Next queue: therapist replacement and controlled clinical handover, separate PR.

## 2026-10-29 — TB-EM-047 PR #108 next qualification gates

1. Verify latest exact-HEAD six CI jobs (test with PostgreSQL, secret-scan, live-session, preview-container, demo-journey, compose) following the corrective commits. An earlier head failed demo-journey due to stale copy; do not reuse its status.
2. Obtain fresh Codex and independent P0–P2 review of **current corrected HEAD**, respond to findings, resolve review threads only when fixed, and rerun checks after every new commit. Existing Grok/Mistral/Codex comments were bound to original `ed5414a` only.
3. After green exact-head qualification, request explicit owner merge decision. Do not automatically merge; keep synthetic/clinical NO-GO and hosted #81 separate.
4. Next development unit **after qualification**: guardian home-plan request/tracking/clinician response; do not enable guardian access to unsigned plans or reports.

The per-plan duration override is implemented on draft PR #108, not an unstarted future slice; the feature is NOT yet qualified or merged.

## 2026-10-27 — PR #97 final dispatch qualification

- Confirm owner-authored exact manual comments enter the dispatched review job ONLY through the read-only preflight and ineligible owner comments cannot occupy the paid concurrency queue; automatic PR dispatch is unaffected by preflight skip.
- Require all six real CI jobs on final HEAD, especially offline preflight parser and provider reservation replay assertions, plus clean Gitleaks history. Recheck any new CodeRabbit/Codex findings; resolve only verified threads.
- Explicit owner merge decision required after qualification. Paid reviewer opt-in stays disabled by default and hosted clinical/production gates remain separate.

## 2026-10-27 — PR #97 final qualification after new reviewer P2s

- Verify all six exact-HEAD CI jobs on PR #97 after latest paid-call fixes and mandatory handover updates: test (including offline review fixtures), Gitleaks `--all`, live-session, preview-container, seven-role demo journey and Compose. Confirm the final clean branch remains based directly on main@294f3d4298bb9a6b378937f7e40c336572ddef1d; no scanner allowlist weakened.
- Obtain CodeRabbit and independent exact-HEAD review; inspect any additional P0–P2. Reply and resolve all eight original/follow-up threads only with verified fixes. Keep paid provider opt-in OFF and treat an attempt reservation as uncertain, not a review.
- This infra PR must not be merged until owner authorization and complete gates. Hosted external acceptance, clinical/guardian release, real patients and provider AI/STT remain separately NO-GO.

## 2026-10-27 — PR #97 qualification sequence

1. Confirm PR #97 branch after clean rebase onto main #107 merge `294f3d4298bb9a6b378937f7e40c336572ddef1d`. Run six-job exact-head CI and independent CodeRabbit/Codex review. Verify Gitleaks `--all` passes with clean history, offline provider test has no network/billing, and all five original threads addressed/resolved. An automatically posted request is not a reviewer verdict.
2. Keep `TB_PAID_REVIEW_OPT_IN` disabled (default), no Mistral/xAI API secrets configured or invoked through ChatGPT, no live provider spending. Any future owner enablement must be separately authorized and usage-limited.
3. Owner-authorized merge only when full CI, reviewer findings and context qualify. This is review-infrastructure code independent of clinician acceptance and hosted QA #81. The later per-plan activity-duration UI override, hosted acceptance, production/real data, AI/STT clinical release and consent remain separately gated.

## 2026-10-27 — TB-EM-046 required acceptance and release sequence

1. Finish exact-head six-job CI and independent P0–P2 review for PR #105 against combined #103/#104 main, resolve any findings, and owner-authorized merge before promoting dependent PR #106.
2. Retarget PR #106 to latest main, verify exact feature diff contains only acceptance tests/ledger/mandatory handover changes, re-run six-job CI at exact head (PostgreSQL/API, pure cross-document fixture, seven-role Chromium, responsive five widths, Docker/preview, secret scan/live-session), request independent Codex/Mistral review and resolve findings. No automatic merge, no hosted mutation.
3. Assess all internal milestone1 gates as PASS/FAIL/NOT RUN with cited real run IDs; keep hosted external runner issue #81 BLOCKED/INCOMPLETE and clinical authorization/family release/real AI/STT/production NO-GO.
4. Separate home activity per-plan duration override as independent next development slice if scoped milestone remainder is needed; do not alter immutable library minutes or loosen governance to pass acceptance.

## 2026-10-26 — TB-EM-045 integration qualification and handover

1. Qualify draft PR #105, `feature/tb-em-045-clinician-journey-navigation`, after updating all four required checkpoint files. Re-run all six jobs at the new exact HEAD; require test, secret-scan, live-session, preview-container, seven-role/demo-journey and compose SUCCESS plus fresh independent Codex/Mistral P0–P2 review and resolved discussions. No automatic merge or deployment.
2. After owner merges earlier milestone PRs #103 and #104, reconcile #105 with the new main and ensure the earlier progress/report components remain navigable from the four new buttons; re-qualify the final head if updated. Review cross-tenant/specialty, child URL continuity, mobile 320/390/768/1024/1440, permissioned reports and no fabricated source or report count.
3. Perform separate end-to-end hosted acceptance, real cookie/session and external browser work tracked in #61/#81. Synthetic GitHub CI and this read-only journey do not establish clinical readiness. External AI/STT, signing, consent, safeguarding, guardian clinical releases, pilot and production remain NO-GO. PR #97 is independent.

## 2026-10-26 — TB-EM-044 review/merge gate

1. Requalify report comparison PR #104 after mandatory four-file checkpoint update: six jobs green for final exact HEAD, independent P0–P2 review and zero unresolved discussions, then owner-directed (never automatic) merge. Carefully distinguish matching recorded source metadata from signed source integrity, evidence adequacy or clinical judgement. No new auth grants.
2. Reconcile with other milestone branches (#103 progress evidence and #105 integrated navigation) if either merges to main; rerun CI on reconciled commit. Continue synthetic-only role and 320/390/768/1024/1440 acceptance, and separate hosted QA #61.
3. No external AI/STT, real patients, safeguarding, consent grant, clinical signing/co-signing, guardian clinical report/home-plan release, PDF distribution, production/pilot or approval. Do not bypass owner policy gates.

## 2026-10-26 — TB-EM-043 qualification and remaining Milestone 1

1. Open a focused draft PR for `feature/tb-em-043-goal-version-context`, base merged `main@d242a001a880984fc9d4123dff5430aebc440019`. Qualify complete six-job CI, independent exact-head P0–P2 review, resolved threads and owner-approved merge. Focus review on reused goal key across changed measurement units, observation/checkpoint exact-version identity, no attribution for orphan observations, disjoint service/plan scopes, current-versus-historical status, safe links and responsive mobile accordion.
2. Slice 15: report integrity, selected-source staleness and version amendment context WITHOUT clinical inference or permission expansion. Slice 16: integrated Child 360 → progress → report → home plan journey, source-consistent navigation and final synthetic seven-role acceptance. Avoid duplicate functionality from PRs #88–102. Existing hosted issue #61 QA and external browsers remain independent.
3. Real external AI/STT, production/pilot patients, clinician signature/co-sign/approval, family release, purpose-specific consent and safeguarding workflows continue NO-GO pending separate decisions. PR #97 review automation control plane remains separate.

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
## 2026-10-31 — CURRENT: qualify combined M2-H04 #142 before any merge

1. Run migration chronology guard and Prisma deploy/generate on a fresh and pre-migrated isolated PostgreSQL database; inspect all new center/child FK validation and transfer CAS SQL. Never rewrite published migrations.
2. Run the entire API suite and all six exact-HEAD GitHub checks, including the new therapist revocation, reminder idempotence, audit immutability, HTTP security and migration-guard tests. Fix any regressions in the same draft.
3. Audit coverage of legacy #124/#121/#120/#119/#126 against actual split models. Flag any missing actor FK, direct user-disable lifecycle, per-row series update, pagination/clinical evidence retention or residual P3 as actionable before merge; do not silently defer it.
4. Mark ready, request a new final-implementation `@codex review`, disposition every comment and link any owner-approved deferrals, then Rule16-qualify and auto-merge. Open M2-H05 (#122, #123, #125) immediately after a qualified merge.
5. Clinical consent, signing, family release, real data and deployment remain NO-GO.
