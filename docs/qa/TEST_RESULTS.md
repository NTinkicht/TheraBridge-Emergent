## 2026-10-25 — TB-EM-029 proposed tests (CODE ADDED / NOT RUN)

`scripts/design/check-child360-logic.mjs`: new assertions exercise changed goal identity (including same key with different measure/target), added/removed definitions, identical versions, changed home activity frequency/linked goal, and no clinical measurements in comparison result. `scripts/design/check-demo-journey.mjs`: added isolated browser-only overlay of a second saved version to the already authorized Speech clinician workspace, checks inspection/status/goal-definition warning, the two selectors, same-version empty state, and 320/390/768/1024/1440 viewport overflow. Browser overlay fetches the existing permitted response and changes NO database data. Tests are **NOT RUN or PASS yet** at writing; exact new-head CI pending. No live hosted seven-role checks, Render deployment, patient data, clinical authorization, or 104-case acceptance update. Issue #61 remains 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 supplemental PASS).

## 2026-10-25 — PR #86 evidence and unexecuted hosted coverage

Code head c2b5311b732e83b5e6055e79337a854682aaf725: GitHub Actions ci run #40185953803 COMPLETE SUCCESS; qa-readonly-contracts #40185953799 COMPLETE SUCCESS. Codex earlier P2 source/CI test regressions corrected; latest pre-documentation code review at this head did not report new application P0–P2. DeepSeek later exact-head independent source review: NO_BLOCKING_FINDINGS, with an explicit retraction of its incorrect earlier P2. **Executed:** these CI workflows and their existing offline automated checks. **NOT RUN / NOT VERIFIED:** a new authorized hosted seven-role login, 35 role×viewport checks, seven live cookie inspections, production/Render deployment, manual visual/a11y acceptance and subsequent documentation-only-head qualification. The hosted QA collector update is code verified, not hosted verified. Earlier hosted attempt 1 PASS/0 FAIL/41 BLOCKED does not supersede issue #61: official 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 historical supplemental PASS). This checkpoint documents PR #86 only; no new assertion may be marked PASS until evidence exists.

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

## 2026-10-24 — TB-EM-024 correction checkpoint (DRAFT)

Previous HEAD `2482f82`: CI 6/6 PASS but did not assert staff discovery behavior. Corrective commit adds CI Chromium tests to `scripts/design/check-demo-journey.mjs` exercising authorized staff activity search, label matching, result counts, ownership buckets, no match and clearing, specialty combination, and rendered input width at 320/390/768/1024/1440. **PASS at `b234c519`:** all six jobs in [run 40117705186](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/40117705186), including staff discovery Chromium tests. Codex no findings at this head. **Subsequent read-only-role regression CI PENDING; hosted visual acceptance outside CI NOT RUN.** No deployment. See docs/product/TB-EM-024-ACTIVITY-DISCOVERY.md.

## 2026-10-24 — TB-EM-023 guardian navigation follow-up

- PASS (previous HEAD `51007e32`): six GitHub CI jobs including `demo-journey`; **not evidence of the rendered teal** because the old test asserted only a class name.
- CODE ADDED (new HEAD pending CI): `scripts/design/check-demo-journey.mjs` now checks Chromium computed `backgroundColor`, `color`, indicator color, `--fam-accent`, `--fam-accentTint`, `aria-current` and shell theme at five widths; Speech therapist negative case checks no family scope and clinical canvas.
- NOT RUN as of this record: new exact-head CI, external hosted screenshots/browser acceptance, dark mode (not enabled for authenticated guardian pages), complete issue #61 seven-role acceptance.
- No clinical permission, data, signing, consent, release, production or deployment changes.

# Test results — TheraBridge

## TB-EM-023 — pending FIFO autosave requalification

New correction targets Codex P2 autosave ordering (A/B queued while decision C flushes); browser regression holds A and B independently, asserts C's POST cannot occur ahead of B and checks both text markers survive in PostgreSQL after reload. **No result claimed before exact-head CI**. Ancestor `a1f3fa8043` passed its earlier delayed POST journey but was found vulnerable to the A/B/C ordering. Continue to require full six-job CI, independent re-review and separate hosted acceptance (#61).


## TB-EM-023 — Codex report edit-loss P2 correction (2026-10-24)

**New incremental patch: NOT RUN at authoring.** `ReportEditor` and `ReportDecisionAssist` coordinate synchronous parent-owned input locking while a report decision awaits an in-flight autosave and POST; browser journey deliberately delays the POST to assert all draft textareas, Save Version, Send for Review and Preview are disabled, and confirms predecision typed text is not lost on post-decision remount. Previous exact-head `d965842e556563ed9b2c5317e154930c2e592e77`: [run 40080336806](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/40080336806), **6/6 green and 482/482 PostgreSQL tests**, but this HEAD had a confirmed Codex P2 data-loss defect. The old run does not qualify the new patch. No external Render hosted acceptance or clinical activation.


## TB-EM-023 — targeted DeepSeek-review correction qualification (2026-10-24)

**Current corrective change:** NOT RUN at commit preparation. Follow-up code adds native database row assertions after concurrent child archive/referent updates and assignment termination, rejection of invalid referent by direct SQL (wrong tenant, revoked specialty), history-scope trigger negative, Speech/OT referent-name privacy and stale OMITTED→RECONSIDERED browser recovery. See `docs/product/TB-EM-023-DELIVERY.md` for work-unit traceability, permissions matrix and remaining visual-acceptance gaps.

**Previous exact HEAD:** `73c4afb5317bf5eca1723242fcc61cdce01fd6fe`: [Actions #40077499056](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/40077499056) **6/6 SUCCESS**: `test`, `secret-scan`, `live-session`, `preview-container`, `demo-journey`, `compose`. PostgreSQL `test`: **481/481** tests in 15 suites. Confirmed re-review Grok + Mistral no blocking findings. These findings/CI do not automatically transfer to the next HEAD.

**Coverage limitations:** isolated disposable synthetic PostgreSQL + Chromium browser only; 320/390/768/1024/1440 geometry checks apply to specified flows, not a full physical-device and cross-browser visual/accessibility audit. Render HTTPS external UAT issue #61 remains not accepted. No real patient data, release, AI/STT, clinical approval, authorizing consent, messaging or pilot tested/activated.


## TB-EM-019 — MIS-001 / MIS-002 remediation tests (2026-10-23)

**Current patch tests: NOT RUN at commit authoring.** Added real-source logic assertions that dedupe recognizes stable/legacy evidence reference headings despite editing the body; expanded seven-role Playwright synthetic journey to simulate HTTP 503 practice-feedback, assert an error rather than false empty state, Retry on successful restore, and confirm no repeat insertion after clinician edits/autosave/reload. All safety restrictions remain unchanged. Verify the six exact-head GitHub Actions jobs after the correction commit; do not transfer the earlier green verdict to the newer commit. Prior independent source-review head `b542159a`: [hosted 6/6 SUCCESS](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/40006533539). These tests do not establish external Render HTTPS UAT or medical effectiveness.


## TB-EM-019 — 2026-10-23 exact-head synthetic qualification

Repository: `NTinkicht/TheraBridge-Emergent`
PR: #65 (DRAFT); code HEAD: `b6a15de2854a45691753d477ed0040b9cc17cac6`
Hosted CI: [GitHub Actions run 39999150532](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39999150532) — **SUCCESS, 6/6 jobs**:

| Job | Result | What it proves |
| --- | --- | --- |
| test | PASS | Real PostgreSQL Nest/Jest **474/474 tests, 14/14 suites**; API TS/build, web build, pure progress/assistance logic, existing responsive session workflow |
| demo-journey | PASS | Disposable synthetic DB + Next/browser same-origin seven-role journey, care team specialty, Child 360, active progress, report edit/omit/restore/append, family practice boundary, five viewport widths |
| live-session | PASS | Existing session completion/autosave/concurrency/auth regressions |
| preview-container | PASS | Full unified synthetic Docker image and preview API/proxy checks |
| secret-scan | PASS | Tracked files/history via gitleaks |
| compose | PASS | Docker Compose full-stack smoke |

Duplicate exact-head run [39999142438](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39999142438) also SUCCESS (6/6).

**Evidence limitations:** These are GitHub CI results; the author did not personally execute the full stack in the local sandbox. Browser coverage is Chromium in CI, not Safari/Firefox, physical mobile devices, accessibility audit or complete visual inspection of all screens. The actual public Render HTTPS hostname has NOT been browser-tested for this unmerged PR. No real patients, recordings, AI model generation, medical validity, clinical release, pilot or production activity were tested or enabled. Source inspection is not a substitute for independent Mistral review.

The source-level test intentionally exercises rejection paths (403, 409, constraint violation); errors in test logs are not failing jobs if asserted by passing tests. This qualification does NOT constitute clinical approval or deployment clearance.

## Historical test records below


## Uninserted transcript recovery correction — 2026-10-22

Exact uninserted transcript retained in copy-only recovery after remote completion; no automatic insertion. Fixture/live transcript, revocation/failure regressions PASS; 468/468 PostgreSQL tests (12 suites), types/builds, responsive DOM, fresh migrations and Gitleaks PASS. Isolated real two-tab Actions job added with disposable synthetic seed, read-only permissions and cleanup. Hosted exact-head results follow push; independent review pending. See artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md. No issue #61 changes, merge or deployment.


## Multi-tab concurrency correction — 2026-10-22

Explicit conflict comparison/revalidated deliberate recovery implemented; stale autosave blocked. Full PostgreSQL 468/468 (12 suites), types/builds, real two-tab browser/API/database races and revocation/completion, responsive DOM and legacy migration PASS. Docker socket blocked; hosted exact-head status follows export. ChatGPT review pending. See artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md for execution details and limitations. No issue #61 changes, merge or deployment.


## Final review corrections — 2026-10-22

PASS: PostgreSQL 468/468 tests, 12/12 suites (122.421 s); API/web typechecks and production builds; expanded browser fixtures at 320/390/768/1024/1440; real browser → Nest/Fastify → PostgreSQL start/autosave/reload/complete; 15→16 migration legacy content preservation; diff whitespace and tracked-export Gitleaks. BLOCKED: Docker daemon socket permissions. UNVERIFIED: exact-head hosted Actions (gh unauthenticated). No standalone old-source red/green mutation run. Full cases, commands and limits: artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md.


## PR #59 repair verification — 2026-10-22

Correction checkpoint atop 7e366fb53a471b28f58255987eb018c7804b478e. The containing commit is the corrected candidate; the owner-authorized managed-Git export handoff reports its exact SHA and remote/PR-head verification. Local results below do not establish hosted CI.

- PASS: frozen Yarn install; API/web typechecks and production builds after final source edits.
- PASS: PostgreSQL full suite **457/457, 12/12 suites** (122.044 s), including concurrent starts, payload/actor conflicts, revoked replay, legacy first entry/completion, cross-day saves and DST offsets.
- PASS: responsive DOM at 320/390/768/1024/1440; legacy empty-start inline error/edit/save/reload/completion; delayed disabled controls/re-enable; tab-discard/completion unload guard cleanup. Browser API fixtures, not a new live backend journey.
- PASS: real 15-migration baseline + original synthetic legacy note → session migration, content/null start/unsigned status preserved.
- PASS: redacted gitleaks scan of tracked working-tree export including the new disposition document; git diff --check.
- BLOCKED: Docker daemon socket access; hosted exact-head CI and authenticated PR response/re-review request.
- NOT RUN: new live browser/API journey, Safari/Firefox, physical audio. Dev preview backend setup unavailable after restore; no usable full-stack review preview claimed.
- OPEN: authorized start correction policy; fail-closed until decision, completed immutable trigger preserved.

Details: [PR dispositions](../../artifacts/tb-em-015/PR59-DISPOSITION.md).

## Original implementation verification

Base main: f49ade4125cdb26e11fd7eb2cc80c292a48f00a9. Branch: freebuff/tb-em-015-session-workflow.

- PASS: frozen-lockfile install (Node 20.19.0 / Yarn 1.22.22), Prisma generate.
- PASS: API typecheck; PostgreSQL integration suite **453/453 tests, 12/12 suites**, final full run 158.218 s; Nest build.
- PASS: web typecheck, Next production build.
- PASS: fresh migration chain (16 migrations); baseline upgrade with pre-existing synthetic session-note content preserved.
- PASS: DOM tests at 320/390/768/1024/1440 with synthetic API fixtures, keyboard activity insertion, synthetic dictation success and 7 error scenarios, cancellation/retry, editable review/insertion, unsaved warning, denied-save preservation, no false save success, completed read-only.
- PASS: real login/browser/API/PostgreSQL ad-hoc session journey, activity result, reviewed synthetic transcript, autosave/reload/resume and completion/read-only reload; no API mocking in that journey.
- PASS: gitleaks 8.30.1 all-ref history scan (87 commits before feature commits), values fully redacted; no leaks. Final staged-export scan recorded in artifacts/tb-em-015/VALIDATION.md.
- BLOCKED: Docker Compose build/smoke: daemon socket permission denied. No bypass attempted.
- NOT VERIFIED: actual STT recognition/device capture (disabled), Safari/Firefox/device tests, Figma frame access, GitHub exact-head CI, Mistral independent findings.

See [implementation evidence](../emergent/workunits/TB-EM-015.md) for exact commands, initial failures repaired and boundaries. No production deployment or clinical activation.
