## 2026-10-25 — TB-EM-030 regression and review fixes

Initial CI run 40191079510: preview/live/secret jobs ran; `test` failed an expected write-route inventory assertion at `authz.e2e-spec.ts`, not at the new report-plan PostgreSQL test (which passed). Added the explicitly permissioned route to inventory. Codex reviewed original 4ddf99a and raised P2 autosave-race and unknown-response dedup; fixed with editor save-lease/lock and held request payload, plus transaction advisory lock on a source fingerprint and durable event replay. API regression covers concurrent same-ID requests and new-ID same-intent replay. Chromium regression uses simulated 503 to assert pre-handoff autosave committed, true revision submitted, locked fields, exact retry body and explicit unlock after abandon. New builds/tests NOT verified at this log timestamp; preserve original head and do not merge or deploy.

## 2026-10-25 — Milestone 1 / report-to-plan handoff implementation

Read current main ClinicalService.write, ReportVersion.evidence, report authorization, existing PlanEditor and saved snapshot interfaces. Created TB-EM-030 draft branch; added DTO and permissioned POST /api/centers/:centerId/clinical/reports/:id/plan-drafts, transactional source match, strict goal definition selection, new goal keys, source audit event and request ID replay; typed UI and explicit clinician opt-in for goal selection plus child-plan deep link. Added PostgreSQL tests for author/non-author/guardian/admin/supervisor denial, fake source IDs, mismatched keys, duplicate selections, stale report revision, persisted new draft and audited idempotent replay. Added loopback browser checks for saved-goal selection, disabled create, and 320/390/768/1024/1440 layout. **Tests not yet run**, hosted unchanged, no policy-gated activation or production changes.

## 2026-10-25 — PR #87 DeepSeek disposition

Read DeepSeek independent review of `b7c3875`, which finds no P0–P2 and identifies six advisory P3 items. Verified current code head CI 6/6 success (run 40188527231), original Codex P2 findings resolved. Implemented bounded follow-ups only: legacy snapshot-free comparison titles now explicitly marked as mutable-library fallback; snapshot list rendering handles missing legacy `materials`, `steps`, and `safety` arrays. The remaining P3 browser-fixture and extra coverage suggestions are deferred; no product permission, backend, schema or release behavior changed. Exact-head post-fix qualification pending. Retain current owner review/merge protections; no new hosted tests or acceptance changes.

## 2026-10-25 — TB-EM-029 historical plan read-only comparison

Reconciled current main after PR #86: Child 360 team scope, progress grouping, designation and clinician-controlled draft assistance already exist. Identified unimplemented issue #37 (N26) as next usable slice. Branch from main 65809a96: new pure `plan-version-compare.ts`, accessible `PlanVersionHistory.tsx`, integration in `PlanEditor.tsx`, added comparisons in `check-child360-logic.mjs`, and CI loopback synthetic browser response overlay in `check-demo-journey.mjs`. No protected DB writes, privileged endpoints, plan status transitions, or Render deployment. Test definitions written but **execution NOT YET VERIFIED**; only GitHub Actions exact-head run can qualify. Reviewer must check consistency of status/authorization, browser responsiveness and draft-only semantics. #61 official QA unchanged.

## 2026-10-25 — PR #86 checkpoint correction after Codex P1

Reviewed DeepSeek's two PR #86 comments: first CHANGES_REQUIRED based on a truncated NAV array; the later exact-code-head review explicitly RETRACTS F1 and records NO_BLOCKING_FINDINGS. Advisory P3 items: duplicate mobile style assertion; CI interaction coverage; creation-form aria-controls/test coverage; exact-path check in hosted collector. Rechecked GitHub at c2b5311b732e83b5e6055e79337a854682aaf725: PR open/ready, mergeable; ci 40185953803 SUCCESS and qa-readonly-contracts 40185953799 SUCCESS. Codex raised a later P1 for missing required four handover/test records. These four documentation entries are the targeted correction; no application code change or hosted run. Earlier review threads resolved, documentation thread requires recheck. Exact post-documentation-head CI/review NOT YET VERIFIED. #61 official ledger unchanged at 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 supplemental PASS).

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

## 2026-10-24 — TB-EM-024 review corrections

Prepared narrow frontend staff-library discovery on PR #72. Addressed Codex finding on displayed specialty labels, 768px input collapse identified by second reviewer, normalized whitespace, ownership labeling, centre-only filter, and added CI Chromium staff flow and responsive geometry assertions. No API/write route or synthetic Render changes. CI 6/6 PASS on correction commit `b234c519` (run 40117705186), including real CI Chromium staff discovery checks. Codex no findings; DeepSeek `NO_BLOCKING_FINDINGS`. A subsequent small read-only role regression and evidence-only update requires fresh exact-head CI.

## 2026-10-24 — TB-EM-023 PR #71 independent review follow-up

Incorporated Codex/Mistral review findings: guardian active-navigation computed-style assertions now execute inside the existing CI `demo-journey` job for five widths, and therapist shell is checked for absence of family scope. Kept PR draft. Clarified documentation regarding unchanged clinical header/sidebar surface tokens and authenticated light-only family theme. Grok/Mistral found no code blockers at previous HEAD; Codex marked review incomplete because browser evidence was missing. Re-review required on new exact HEAD; hosted visual acceptance still NOT RUN.

# Work log

## 2026-10-24 — TB-EM-023 Codex P2 report editing loss correction

Codex independently found a real post-flush/pre-reload data-loss window at `d965842e`: ReportDecisionAssist saved an immutable decision then remounted ReportEditor, while the clinician could still type into sections, leaving an unsaved debounce that was cancelled by remount. The incremental fix synchronously locks parent report editing, version/submit/preview operations and child suggestion inputs for the full decision transaction; serializes already in-flight autosave before using the report version; unlocks on failure and preserves text on screen. Added a seven-role Chromium regression that delays a real POST, asserts section/action controls are disabled during its flight, and verifies pre-decision typed text is preserved after server-confirmed reload. **New exact-head tests NOT RUN at authoring**; CI and independent review required. Live Render and clinical NO-GO unchanged.


## 2026-10-24 — TB-EM-023 P1/P2/P3 convergence and independent-review corrections

Single PR #70: adopted merged TB-EM-021 report decision APIs in ReportEditor with source selection, durable OMITTED/RECONSIDERED/APPLIED, stale evidence, versioned retry and non-validation label; fixed 42-day Child 360° appointments, coordinator clinical CTA, disabled family messaging, role copy, guardian teal, Home practice ARIA; built template duplicate/edit UI; added explicit centre-admin-only child referent with immutable database history and specialty-safe display. Exact head `73c4afb` passed 6/6 GitHub Actions jobs and 481/481 PostgreSQL tests. Codex independently found and the author fixed archive stale-read and assignment-end lock-inversion defects; CodeRabbit confirmed its fixes. Grok and Mistral then reviewed `73c4afb` with NO_BLOCKING_FINDINGS, independently inspecting source but not running tests.

Supplemental AI review posted from the owner's account noted: referent reason absent from rendered history; raw referent event label; stale OMITTED/RECONSIDERED dead-end; misleading referent unavailable copy; weak raw SQL and specialty/regression assertions; missing handover evidence. Prepared a targeted follow-up on the same branch: surface reason/label, enable continued clinician decision review against current source manifests, neutral unavailable wording, strengthen raw record and DB trigger tests, add Speech/OT and stale-OMITTED browser cases and full work-unit documentation. **New tests/CI NOT RUN at authoring of this next commit**; requalify latest HEAD, request fresh independent review, and do not merge early. No Render/Neon changes or clinical/pilot activation.


## 2026-10-23 — Mistral/Grok advisory follow-up

Reviewed two independent source-only NO_BLOCKING_FINDINGS reports against PR #65 at `b542159a`. Chose the narrow UX/integrity items MIS-001 (stable evidence heading even if source labels are edited; support existing legacy marker) and MIS-002 (feedback load error distinct from genuinely empty data with explicit Retry). Changed `ReportEditor`, evidence helper, `Child360`, and pure/Playwright regressions on the SAME branch. New implementation tests NOT RUN at commit creation; hosted Actions must qualify the new SHA and reviewers must independently assess it. No clinical gates, Render/Neon, or branch merge touched.


## 2026-10-23 — TB-EM-019 review candidate and takeover

User-authorized ChatGPT continuation on single feature branch `feature/tb-em-019-child360-evidence-assist`, existing draft PR #65 / issue #64. FreeBuff's saved checkout was not reset or overwritten; GitHub connector provided isolated write access. Main untouched.

Implementation increments: current authorized Child 360° and assigned-care-team roster; exact-version weekly/monthly progress and read-only version history; recorded source IDs and per-period provenance; deterministic, editable factual report draft assistance with explicit omit/restore/append into versioned autosave; optional goalKey links validated per PlanVersion; centre-and-specialty-validated activity templates with immutable server-side content snapshots (legacy drafts supported); synthetic therapist-only practice status from existing scoped endpoint; typed always-disabled clinical AI adapter; Chromium five-width geometry check; added API and browser regression tests.

**Last code SHA `b6a15de2854a45691753d477ed0040b9cc17cac6`: hosted CI run [39999150532](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39999150532) passed all six jobs. Test job reports 474/474 tests, 14/14 suites. No Mistral independent review performed by author. No Render/Neon changes, merge, clinical authorization, production, or external AI execution. Full reviewer packet: `docs/product/TB-EM-019-REVIEW-PACKET.md`.

## Historical records below


## Uninserted transcript recovery correction — 2026-10-22

Exact uninserted transcript retained in copy-only recovery after remote completion; no automatic insertion. Fixture/live transcript, revocation/failure regressions PASS; 468/468 PostgreSQL tests (12 suites), types/builds, responsive DOM, fresh migrations and Gitleaks PASS. Isolated real two-tab Actions job added with disposable synthetic seed, read-only permissions and cleanup. Hosted exact-head results follow push; independent review pending. See artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md. No issue #61 changes, merge or deployment.


## Multi-tab concurrency correction — 2026-10-22

Explicit conflict comparison/revalidated deliberate recovery implemented; stale autosave blocked. Full PostgreSQL 468/468 (12 suites), types/builds, real two-tab browser/API/database races and revocation/completion, responsive DOM and legacy migration PASS. Docker socket blocked; hosted exact-head status follows export. ChatGPT review pending. See artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md for execution details and limitations. No issue #61 changes, merge or deployment.


## Final review corrections — 2026-10-22

Finished the three additional owner-supplied review findings with minimal existing-file corrections and new API/browser regressions. PostgreSQL 468/468 across 12 suites; API/web types/builds, responsive DOM, live real persistence journey and legacy migration preservation PASS. Gitleaks export check recorded in correction evidence. Docker socket blocked; GitHub CLI unauthenticated. Owner authorizes commit/push only to existing PR #59; no merge or deployment.


## 2026-10-22 — PR #59 review repairs

Read owner-posted independent Mistral findings R1–R5. Repaired legacy start validation/content preservation, concurrent authorized start replay, pinned start-time semantics and center-local dates, dictation abort/pending cleanup and reactive saving state. Added PostgreSQL and browser DOM regressions. Final API/web typechecks/builds PASS; PostgreSQL 457/457 (12 suites) PASS; responsive fixture DOM and baseline legacy upgrade PASS. Redacted tracked-export secret scan recorded in QA. Docker remains blocked; hosted checks and independent re-review pending. Owner subsequently authorized committing and exporting this correction checkpoint using managed Git; final SHA and remote/PR-head verification are returned in the export handoff. No clinical activation, merge or deployment. Full dispositions and policy alternatives: artifacts/tb-em-015/PR59-DISPOSITION.md.

## 2026-10-21 — TB-EM-015 / issue #58

Started dedicated `freebuff/tb-em-015-session-workflow` from verified fetched main `f49ade4125cdb26e11fd7eb2cc80c292a48f00a9`, including PR #57. Audited existing scheduling, child assignments, clinical notes/goals/activity library, Prisma, access/audit and Direction B components before implementation.

Extended SessionNote with unsigned operational lifecycle, bounded structured activity snapshots/results and retry tokens. Added authorized start/save endpoints and PostgreSQL tests; extended existing clinical sessions UI with specialty choice, timing, activities/results, autosave/resume/complete and clearly labelled synthetic dictation review. Real audio, AI, signing and release remain disabled.

Verification: 453/453 PostgreSQL API tests, API/web typechecks/builds, additive legacy-note migration upgrade, responsive fixture DOM and real browser/API/PostgreSQL journey passed. Docker blocked by socket permissions; Figma frames unavailable; gh unauthenticated. Detailed commands/limits: docs/emergent/workunits/TB-EM-015.md. Exact delivery status: artifacts/tb-em-015/VALIDATION.md. Independent reviewer remains Mistral; developer does not self-approve or merge.
