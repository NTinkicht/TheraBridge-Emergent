## 2026-10-25 — PR #78 accessibility follow-up to DeepSeek review

The chart date error now appears directly after date fields and both invalid inputs receive Field error/ARIA linkage. Previous exact head bdc3ecf completed 6/6 CI green, but new changes REQUIRE fresh CI and exact-head review. No clinical policy changes or hosted deploy. Hosted acceptance issue #61 remains 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED.

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
