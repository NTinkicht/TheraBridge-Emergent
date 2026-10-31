## 2026-10-31 — M2-S01 begins immediately after verified M2-H02 merge

- Merged [#139](https://github.com/NTinkicht/TheraBridge-Emergent/pull/139), M2-H02 (#117 + #118), into main at `dafe526b` after six green exact-head CI jobs in two runs, 574/574 PostgreSQL API tests, independent Codex no findings and full review dispositions.
- Selected next frozen-roadmap unit **M2-S01 (#35)** without expanding into unrelated HTTP/database work or owner-gated transfer/release. The prior `FAMILY_MESSAGING_DEMO=true` switch could unlock messaging in non-staging/non-production deployments.
- Hardened permissions and message service methods to grant messaging **only inside Jest CI**, preserving isolated synthetic fixtures; added denial tests for local/preview/development/staging/production and historical guardian-link revocation. Clinical message policy remains unsigned D-NEW-5.
- Initial checkpoint only: CI and independent exact-head review NOT RUN on this new branch. Follow Rule 16 before merging.

## 2026-10-31 — M2-H02 implementation, negative tests and owner-approved merge policy

- Merged policy PR [#138](https://github.com/NTinkicht/TheraBridge-Emergent/pull/138) into main, commit `39c9888`, after six green jobs and an independent Codex no-findings review. Future qualifying ordinary PRs may auto-merge under Rule 16 only after full review/test/deferral gating.
- Continued implementation PR [#139](https://github.com/NTinkicht/TheraBridge-Emergent/pull/139), **M2-H02 (#117 and #118)**, without modifying the agreed roadmap. Added therapist specialty and active-assignment authorization, tenant-pinned CAS, cross-child/center negative tests, two-therapist acknowledgement and plan/report version race tests, revoked-specialty denial tests, 404 normalization, AST CAS verification and transaction row locks.
- On `d02820b`, 3 tests failed: an extra child hit onboarding quota; two pre-existing tests still expected 403 after specialty revocation. Updated fixture setup to direct synthetic Prisma insertion and corrected privacy-preserving expected status to 404 in `f6a6d2b`. Its API tests passed **574/574** over 19 suites; logs identify no API failures. Pending final-head qualification and review; do **not** merge unless all gates green.
- Review findings: previous Mistral current-model P2/P3 suggestions addressed or explicitly declined with rationale in PR disposition ledger; no unlinked deferral. The old audit names obsolete models and paths; replacement guards target actual Prisma models, preserving clinical NO-GO.

## 2026-10-31 — Owner changes future merge protocol (new draft PR checkpoint)

- PR #137 merged after exact-HEAD 6/6 CI and Codex no findings: `3d133c278f0b1fad3ba84b0e8e2ce70db1443ee8`.
- Drafted AGENTS.md Rule 16, REVIEW_DISPOSITION_RULE.md and PR template: autonomous merge for qualified ordinary synthetic-only PRs, only after every review comment is dispositioned and all permitted deferrals have linked issues with owner/criteria/priority/safety rationale.
- No waiver of clinical or production approvals; no bypass of CI, branch protection, P0–P2 remediation, independent final-head review. Policy effective after merge to main, not at draft creation.
- Next security work unit GH-01 (#117) is the intended substantive scope; implementation NOT STARTED at this checkpoint.

## 2026-10-31 — PR #137 follow-up review P3 dispositions implemented

- FIX_NOW (review 5717799244 P3-1): after an interactive transaction rejects, query committed demo local identities before deleting newly staged credentials; retain on visible identities or failed verification, with explicit operator recovery message.
- FIX_NOW (P3-2): reject missing `local` identity on a preexisting demo user if no externally managed passwords were supplied; no unexported random password.
- FIX_NOW (P3-3): explain interrupted staging vs wrong-database file and require database verification before removing protected credentials.
- Added three PostgreSQL regression tests to `seed-transactions.e2e-spec.ts`. Implementation commits `05d7f7a`, `5daa691`; exact final-HEAD CI and Codex review PENDING. GH-18 historical migration chronology OPEN; no merge.

## 2026-10-30 — PR #137 independent review corrections

- P2 FIX_NOW: credential material for new local demo identities is created securely via exclusive file open, written and fsynced before the corresponding DB mutations; failure rolls back and deletes this run's file. Avoid post-commit unexported password scenario and preserve collision-denial behavior.
- P3 FIX_NOW: moved Argon2 hash work outside both interactive transactions, sequentially to bound memory; added a real PostgreSQL rollback/credential cleanup regression, a TOCTOU EEXIST race fixture, far-future migration and migration-lock metadata rejection, and direct-main-push guard in CI.
- P3 recommendations not requiring code: exact rationale and disposition documented at PR #137 issue comment #6531973532.
- Historical Prisma migrations unchanged. Final changed HEAD requires fresh 6/6 CI and independent review; no automatic merge.

## 2026-10-30 — M2-H01 / GH-18 first implementation checkpoint

- Created `feature/m2-h01-migration-ci-seed-integrity` from current `main` after PR #116 merge.
- Implemented transaction-enclosed synthetic and Children's Home demo DB seeds; wrote credential files only following a completed transaction. Preserved existing explicit synthetic environment and tenant-collision checks.
- Added migration blob-history validator to detect published file modification/deletion, backdated migrations and appended files in historical folders; added seven negative/positive unit fixtures.
- Added fault-injection Jest fixtures for both seed functions and wired migration validator into PR CI. Existing additive DB upgrade job remains intact.
- Audit recommendation to *rename* `049` is intentionally not performed pending actual deployed `_prisma_migrations` evidence; rewriting historical migration identity can break existing databases. Verify ledger and plan a forward-only fix if warranted.
- Execution state: edits committed to feature branch; exact-head six-job CI and independent reviews **NOT YET VERIFIED**. No merge.

## 2026-10-29 — TB-EM-051 design-only authorization gate

- Verified prior work TB-EM-049/#111 and TB-EM-050/#113 merged, using main merge commit `05cec48b929206cb14371cc36805aa3b0ee4f9fc` for new branch. New owner instruction interpreted as authorization to prepare *design/decision artifacts only*, not clinical policy signature.
- Read `NTinkicht/TheraBridge` private CB-SRS-001 / CB-SDD-001 / CB-SAD-001 / RMP and V0.9.16 validation/decision register. They label proposed `transferCaseload` as defective/unapproved, role mapping and consent policies unsigned; canonical candidate route `POST /api/v1/assignments/transfers` is **not an approved app route**.
- Added detailed proposed lifecycle (acknowledgement and readiness do not grant authority), policy/question/owner matrix, current-actor permission checks, atomic/versioned source-to-target replacement design, disposition for EVERY open item, emergency suspension/quarantine, no signer provenance transfer, authorization-before-idempotency, tenant/specialty/revocation races and required negative path oracles.
- Added machine-readable nine UNSIGNED policy gates, zero approvals and disabled real transfer; CI test checks register and current non-authorizing runtime invariants plus seven deliberately corrupted policy fixtures and a synthetic assignment-mutation tripwire. The required test job calls it. This is a test of **remaining blocked**, not a test of actual transfer.
- Created GitHub policy signoff issue [#115](https://github.com/NTinkicht/TheraBridge-Emergent/issues/115). Existing P3 issues #112/#114 and hosted QA #81 remain separate.
- No new executable transfer/consent/release code, database changes, deploy or policy signing. Tests and CI not yet verified at this documentation commit.

## 2026-10-29 — PR #113 review cycle 1 corrections

- Inspected all PR comments and review threads. Codex first round completed no major issues on 7b6551f8dc; Mistral first round NO_BLOCKING_FINDINGS; latest independent review identified avoidable interactive transaction row locks, stale manager row status, missing archived-child and supervisor regressions.
- FIX_NOW: changed `GovernanceService.handoverReadiness` to active-manager role+center-verified direct Prisma queries, dropping read-only interactive transaction; point-in-time advisory reading not an authorization token. Add checkedAt string.
- FIX_NOW: when manager checks a proposal, update the matching UI row status from authoritative readiness reply, so cancelled row no longer advertises a cancel action; timestamp and refresh guidance shown.
- FIX_NOW: added archived-child/retained-ACK and supervisor-forbidden cases in PostgreSQL e2e, without any clinical access or assignment changes.
- DEFER_ISSUE: independent two-session Playwright regression tracked in https://github.com/NTinkicht/TheraBridge-Emergent/issues/114; requires browser multi-user fixture beyond this narrow PR, not a P0-P2 blocker.
- New six-job exact-head CI and round-two independent review PENDING; no second review sent prior to stable green CI. Never count old Codex/CI for new HEAD.

## 2026-10-29 — Merge TB-EM-049 and start TB-EM-050

- Owner-directed PR #111 merged to main@ef1761a36d62bd626baf9a587798f0fc11afd35b with exact-head required CI 6/6 success (run 40778143037) and two independent no-blocking approvals; no Codex review required per owner.
- Created independent feature/tb-em-050-handover-readiness from exact merge commit. Built NestJS GET readiness route using existing manager governance permission, active actor+tenant checks, opt-in synthetic flag, read-only child/assignment/membership validations, fixed-shape explicit false authorization markers.
- Manager Child Care Team UI now has Check readiness per operational proposal; no transfer action, clinical content, or recipient visibility. PostgreSQL regression checks nonauthorizing acknowledged state, stale staff/assignment, cancelled proposal, cross-center/nonmanager denial and feature flag off.
- Created docs/product/TB-EM-050-HANDOVER-READINESS.md. No migration, new clinical permissions, or new data processing.
- New exact-head six-job CI, external review and merge NOT VERIFIED. Clinical NO-GO and hosted issue #81 unchanged.

## 2026-10-29 — Owner standing policy and PR #111 P3 dispositions

- Wrote mandatory review disposition rules for all contributors in AGENTS.md and CONTINUITY_PROTOCOL.md, with detailed review ledger in REVIEW_DISPOSITION_RULE.md and future .github PR checklist. P0–P2 fixed before merge; safe small P3s fixed; bigger optional enhancements issue-tracked; unnecessary suggestions declined with rationale.
- FIX_NOW: manager cannot submit another proposal on the same source/service while pending or acknowledged; UI explicitly explains and disables the action; backend 409 remains authoritative.
- FIX_NOW: added actual PostgreSQL center-lock competition regression queuing cancellation before target acknowledgement, proving one cancel succeeds, acknowledgement fails closed, exactly one cancel event and no acknowledgement or assignment mutation.
- DEFER_ISSUE: center-wide cap of 100 cancelled proposals may limit history on individual child detail; separate UX/pagination scope tracked at https://github.com/NTinkicht/TheraBridge-Emergent/issues/112 (all actionable proposals remain in inbox).
- No declined findings this round. Codex request on prior e7caba SHA remains pending/not valid for new commits. Exact new-head six-job CI pending. No merge.

## 2026-10-29 — TB-EM-049 original red CI and remediation

- Initial exact-head 0d170d3 run 40772381693: one test suite red (3 failing cases), SQLSTATE 23514 legacy status CHECK, compose skipped; Mistral P0 and second independent review correctly flagged the product defect.
- Added forward-only CHECK migration with strict status/reason enumeration, unique open proposal index and list indexes; documented proper original schema changes. Legacy governance access filtered to SIMULATION_ONLY to avoid cross-workflow presentation.
- Corrected source validation order, target membership and active source assignment row-lock serialization for acknowledgement, center/status compare-and-set cancellation, and pending-plus-acknowledged unbounded actionable list separate from recent cancellations.
- Regressions for old simulation isolation, 101 newer CANCELLED entries, assignment end, lock-wait concurrency against target specialty removal and source assignment end, terminal cancellation. UI labels and disabled-mode fetch optimized.
- CI/new review pending. No production/hosted enablement or clinical authorization changed.

## 2026-10-29 — TB-EM-049 operational handover proposal

- Checked existing center assign/end/referent flows, CaseloadTransferDraft SIMULATION_ONLY, approved governance and role policies. Kept the old simulation path untouched and reused table only for separate nonauthorizing proposal statuses; no schema migrations.
- Added permissioned governance propose/list/acknowledge/cancel routes, strict fixed-shape operational reason and specialty DTO, per-center locking/validation, auditable structured events and fail-closed demo guard. Explicit response booleans deny any inference of access or clinical release.
- Added two operational UI surfaces, real PostgreSQL API regression tests, permission matrix and write-route inventory updates, product design decision.
- No clinical document transfer, recipient data access, automatic reassignment, notification or appointment changes. Qualify CI and independent review before merge; next sub-slice must implement controlled assignment handoff only after separate decision gates.

## 2026-10-29 — TB-EM-048 review findings and corrections

- Codex final reviewed SHA 4a082bea P1: therapist membership role and specialty mutations could outrun a clinician response; fixed using common center→membership→care_assignment→guardian_link lock ordering and rechecks. WorkspaceService staff and self-profile edits now lock center and membership before writes, compatible with existing trial/assignment locks.
- Independent Mistral P1 red API tests: corrected AC-9 exact guardian permission list and AC-11 exact reviewed write-route list; no permissive assertion used.
- Independent review P2 responder membership audit FK: added to Prisma and this unmerged migration. P3 overlapping clinician row action: disabled all action buttons while any request in flight.
- Reviewer test advisories: added PostgreSQL concurrency suite for revoke-role/revoke-specialty/end-assignment, concurrent keys, valid responder FK, 2 guardian links, and feature-off denial. Every clinical or non-synthetic release gate unchanged.
- Previous failing CI 40765592359 tied to old SHA cannot be counted. Current SHA CI PENDING / NOT VERIFIED; wait for 6/6 exact-head before requesting one final Codex review.

## 2026-10-29 — TB-EM-048 Codex pending-list P2 and tests

- Added separated pending and completed-status queries (unbounded pending, 100 most recent completed) for guardian and assigned therapist scoped inboxes. No pending item can disappear under completed history; no status authorization changes.
- Added PostgreSQL case with 101 newer answered requests and verified pending retrieval (NOT YET RUN at new HEAD).
- CI on earlier commits failed in two preexisting permission-expectation tests because new correct permissions were not appended to hardcoded test matrices; fixed both without bypassing policy. Other previous jobs green but cannot qualify updated HEAD.

## 2026-10-29 — TB-EM-048 P1/P2 reviewer remediation

- Codex #109 P1: reading the active guardian link without locking allowed a concurrent removal to commit before a therapist response. Added `FOR UPDATE` lock + revalidation on guardian_link inside response transaction. Added PostgreSQL blocked-response test with an uncommitted guardian-link removal.
- Codex #109 P2: a different request key against an existing pending request was incorrectly reported as successful replay. Now returns explicit 409, preserving genuine idempotency of accepted keys only; tests verify collision rejection, subsequent new request and same-key replay.
- Enabled `HOME_PLAN_REQUESTS_DEMO=true` only in the CI isolated synthetic browser harness and added an actual guardian request → therapist acknowledgement journey, with no clinical plan released.
- New exact-HEAD CI and reviewers pending; no clinical authorization/release.

## 2026-10-29 — TB-EM-048 next work unit opened after PR #108 merged

- Verified predecessor PR #108 exact-head CI 6/6, clean Codex/Mistral/Grok, resolved original threads; owner requested merge and GitHub returned `merged:true` at `0453c5228b397ce6fd99bed05259a7e4c181540d`.
- Scoped TB-EM-048 to **structured guardian request for consideration**, not family clinical plan delivery. Default-deny variable and non-production gate; no free text, shared clinical sources, documents, provider calls or release.
- Added Prisma model/migration, permissions, request DTOs, API controller and dedicated service with active link, membership, service and current therapist-assignment checks; idempotency and pending uniqueness; two fixed response statuses; event audit. Wired family Practice and clinician Practice Feedback panels.
- Added real PostgreSQL API tests for positive/replay, forbidden actors and extra fields, revocation, missing assignment, trial expiry and lifecycle transitions.
- CI and independent review **NOT YET RUN / NOT VERIFIED** at documentation checkpoint.

## 2026-10-29 — TB-EM-047 PR #108 response to Codex, Mistral and Grok

- Checked original head `ed5414add44e30228d8a476abcf6dd28f3edd65b` reviews. Codex: P1 missing required checkpoints, P2 null duration accepted, P2 historical comparison hid duration values. Mistral: P1 failing stale demo journey, P2 missing API/pure/browser tests, plus calendar display recommendation. Grok: no blocking findings, requested boundary coverage.
- Changed DTO to validate duration when present **including null**, so undefined remains optional but explicit null is HTTP 400. Added historical activity duration readout; calendar prefers per-plan override while retaining template source; saved projection guards legacy null. Clinician input marks invalid values; browser test exercises 7, 121, 10.5 and unsaved preview isolation.
- Extended PostgreSQL clinical e2e to assert invalid durations reject with no write; 7-minute duration persists while immutable template snapshot stays 10; clearing on the next save omits override. Added pure read projection and two-version change-detection assertions; repaired stale demo-journey text assertion.
- Changed code and synthetic tests only on feature branch. Exact-head six-job CI and fresh independent reviewer responses **PENDING**, no merge and no deployment.

## 2026-10-27 — PR #97 CodeRabbit and Codex follow-up

- CodeRabbit found that invalid owner comment events could compete with pending dispatches even with noncancelling job-level concurrency. Implemented an eligibility-only `qualify` job that executes no project code or paid API and gates `dispatch` eligibility; added fake-JS validation of exact owner/40-character SHA commands and rejection of ordinary comments.
- Earlier Codex P1 in the test fixture was corrected by using a fresh unreserved head; its original-head test had reused head `a` and failed before exercising the reservation error, while corrected test at head `8eb5935` passed. New exact-head six-job CI and reviewer verdict still pending; no paid Mistral/xAI request was triggered.

## 2026-10-27 — PR #97 follow-up exact-head Codex findings

- Received three additional valid P2 Codex findings after the clean PR #97 rebase: base-sensitive review dedup, durable paid attempt reservation, and fail-stop if HEAD/BASE becomes stale between providers. Implemented all in `.github/workflows/auto-review-trigger.yml`.
- Updated offline fake API test script to verify a rebase retaining the same HEAD is reviewed with a new base, result publication failure does not allow a second paid call, failed reservation prevents provider request, and a changed live HEAD after first provider stops the second. No paid network in tests, no opt-in changed.
- Updated independent-review runbook to distinguish reservation from actual result, mark uncertain attempts INSUFFICIENT_EVIDENCE and require owner billing inspection/approval before any retry. Exact-head CI / reviewer follow-up pending.

## 2026-10-27 — PR #97 CodeRabbit remediation and audit history

- Verified owner merge of #107 on main SHA `294f3d4298bb9a6b378937f7e40c336572ddef1d`.
- Remediated all five CodeRabbit review threads on PR #97 (two major security/availability and three minor correctness/docs). Workflow has job-level `cancel-in-progress:false`, case-normalized `/review-{mistral,grok,both}` commands, old+new filename sensitivity checks and escaped/mention-neutralized model prose.
- Extended existing exact-JavaScript offline unit runner with uppercase selectors, stale payload/live head/base movement during fake calls, forbidden renamed path, excessive patch bytes, HTTP error, invalid response and forged comment/mention model text. This runner uses fake API callbacks only. Provider-paid APIs remain opt-in OFF.
- Newly added computed-key fixture was flagged by Git history Gitleaks in intermediate commit, with no secret disclosed. Eliminated regex false positive and rebuilt a clean feature commit directly from latest merged main, instead of weakening scanner rules. Final-head CI and reviewer feedback pending; do not merge until six real jobs and all threads pass.

## 2026-10-27 — TB-EM-046 integrated source-chain acceptance

- Started work item #106 as an acceptance-only branch stacked on still-unmerged PR #105. Previous PRs #103 and #104 merged following exact-head 6/6 CI and independent no-blocking reviews. Slice #105 remains separately gated.
- Added pure end-to-end sample linking authorized plan version v2/goal, exact observation v2, clinician home activity with saved snapshot priority; older reused-key goal version v1 with a different measurement unit remains isolated. Saved report evidence referring to v1 must be marked `NOT_IN_CURRENT` rather than silently attached to v2. Internal read-model output must contain no invented approval/release claims.
- Added synthetic clinician Child 360 journey responsive check at 320/390/768/1024/1440px with all four stage buttons visible/focusable; existing seven-role browser permission checks retained.
- Created `docs/qa/TB-EM-046-MILESTONE1-ACCEPTANCE.md` status ledger. No tests run yet at this HEAD; all six CI jobs and P0–P2 review required before owner-authorized merge; external hosted QA #81 separate.

## 2026-10-26 — TB-EM-045 integrated synthetic clinician journey

- Independent Slice 16 draft branch from `main@d242a001a880984fc9d4123dff5430aebc440019`. Added four clearly separated Child 360 navigation stages to current plan, exact goal evidence, authorized reports and internal home practice. Uses existing permissioned tabs; no new endpoints or family disclosure.
- Pure summary counts only current plan-version goals, observations matching **both** exact planVersionId and goalKey, current activities and actual authored draft schedules. Never invent report status/count from a workspace that has no report versions.
- Regression tests: pure cross-specialty reused key with withdrawn/superseded version and orphan denial, no fictitious report count. Seven-role Chromium actually clicks all four stages, asserts intended tab and child URL, then returns to Child 360.
- At docs update: run `40395177839` PASS 4 jobs (secret-scan, live-session, preview-container, demo-journey), test IN PROGRESS, compose NOT RUN; Codex P1 handover file omissions addressed by this change. Fresh exact-head CI and review required, no merge/deploy.
- PRs #103 and #104 are independent and still separately qualifying. Hosted issue #61 remains outstanding; all clinical release and real data gates NO-GO.

## 2026-10-26 — TB-EM-044 internal report evidence comparison

- Implemented a pure source-metadata comparison of saved immutable report-version and current authorized report evidence: exact version+goal identity, goal title/measure/baseline/target, source observation ID/date/value including prior sample, assessment IDs, report periods and session count deltas. Reports unverifiable source IDs/legacy goals explicitly, does not equate reused goals across versions and never declares clinical accuracy.
- Added accessible read-only `ReportEvidenceDiff` disclosure to existing `ReportSide.Compare` via current permissioned report evidence; no request or persistence path added, and unchanged server `ReportStatementTrace` remains the source for attribution fingerprint statuses.
- Pure tests include same vs altered recorded value, different version same key, legacy missing source identity, changed measure, empty samples, assessment/session/period changes. Seven-role synthetic Chromium opens saved report comparison and checks new inspector and non-clinical disclaimer.
- Run `40394141714` exact HEAD `4d97f571e5f1f9c0a7f08eaa40600666cafd89a7` PASS **6/6**; Codex NO major findings; zero threads. This mandatory documentation update requires renewed exact-HEAD qualification. PR #103/#105 separately active; no hosted release or deployment.

## 2026-10-26 — TB-EM-043 Slice 14

- Confirmed PR #102 merge `d242a001a880984fc9d4123dff5430aebc440019` and began a focused isolated progress-context branch.
- `apps/web/src/lib/goal-version-context.ts` projects plan-version goal definitions and their own exact scoped observations and clinician checkpoint entries. Separates current vs previous version; nearest older same-key definition differences are labels, not evidence continuity. No cross-version observation aggregations or automatic determination of treatment effect.
- `GoalVersionContext` renders authorized specialty filter, version-specific measurements/source IDs, objective milestone and review dates, source-reviewed checkpoint dates/notes and existing plan-version deep links from Progress. No new role, API, external release or clinical decisions.
- Pure tests cover changed measure and target between reused goal keys, cross-service same key, orphan observation, review record isolation, dates and deterministic ordering. Seven-role synthetic browser adds scoped UI filter, read-only accordion, source metadata and exact-version link assertions; existing five-width test remains. CI/reviews pending.

## 2026-10-26 — TB-EM-042 richer clinician Child 360 event timeline

- Merged PR #101 to main after all 6 exact-head CI jobs and fresh Codex re-review; original nested-summary review thread resolved.
- `child360Timeline` projects five event types solely from permission-scoped `Workspace`: plan-version last-updated records, clinician goal-review checkpoint entries (sort by server-at, show clinician-entered review day separately), measured observation records (exact planVersionId+goalKey), session notes, draft assessments. No appointments/family-practice participation is counted as clinical evidence, and orphaned links remain unattributed.
- `Child360ClinicalTimeline` replaces the existing first-12-event timeline with event-type/specialty filters, count of matching events, explicit filter-empty state, and Show-more pagination in 12-row increments. Navigation targets only existing authorized section tabs. No API/schema/permissions/save/AI/release code touched.
- Pure regression tests cover deterministic chronology, backdated review events, reused goalKey across service/version, missing source, specialty/kind filters and omission of appointment/family records. Synthetic browser checks filter semantics and existing five widths/permission journey. Actual CI not yet run at draft creation.

## 2026-10-26 — TB-EM-041 exact saved clinician home-plan inspection

- PR #100 squash-merged into main after exact-head CI+reviews. Slice 12 is a pure read projection of exact saved `PlanVersion` + permitted local activity templates + optional source report metadata, never working form state.
- Component `SavedHomePlanPreview` appears on the clinician's current plan and selected historical version. Explicit warning marks pending browser edits excluded; current readonly snapshot and dated schedule/frequency/steps/safety/notes shown without signs of approval.
- Original report goal mapping shown only for `origin.originalPlanVersionId === version.id`. Later plan versions show report origin pointer but mapping removed. Missing goal references/legacy library fallback explicitly identified.
- Pure tests include source version isolation, frozen snapshot wins over changed mutable library, legacy/unavailable templates and absence of approved/released flags. Browser history test confirms snapshot source and editor test confirms unsaved notes don't bleed into saved preview. All tests pending independent CI at authoring.
- No API/schema/write path, clinical authorization, guardian release, production or hosted #61 acceptance changed.

## 2026-10-26 — TB-EM-040 home-activity details / therapist instructions

- Based on owner-merged main `f40360b595a42f8735e3f7a80be1221e00dbb0e6` (PR #99). Built `HomeActivityDetails` and pure snapshot-first definition selector. The existing `note` field is already validated by the server as an optional UTF-8 string, max 500 chars, and already transmitted by draft save. This unit exposes it in the clinician editor; unchanged server remains authoritative.
- Activity duration, steps, materials and safety come from plan's saved server-owned `snapshot` first; otherwise explicitly labeled live-library legacy fallback. Clinician notes are separate from template safety and do not rewrite its frozen definition. Saved history renders therapist instructions explicitly; internal calendar displays them without claiming delivery to families.
- Pure test validates snapshot precedence over changed library, unavailable legacy source, note identity change, note bound; synthetic seven-role browser test edits notes, checks dirty submit guard, review safety/duration, historical note, calendar note and responsive journey. Tests added; exact-head CI/review not yet qualified.
- No external AI/STT, data release, clinical signing, recording, real records, scheduling or production deployment.

## 2026-10-26 — TB-EM-039 clinician saved-draft handoff

- Confirmed PR #98 owner-authorized merge at `d9921cb94dca0ca949f1af0b3d1847ebdc51a345`.
- Scoped Slice 10 to single clinician plan-version handoff: pure advisory checklist, modern internal UI, submit button locked until all mounted plan edits are saved or discarded. Existing backend submit remains authoritative, so this is no clinical permission change.
- Regression coverage: pure clean/dirty/other-dirty/new-unlinked states, missing goal/title/summary/safety/schedules/templates, advisory omissions never falsely block a genuinely saved draft. Chromium exercises unsaved schedule preventing submit and pristine reload restoring allowed submit without POST. Tests added, results pending.
- No family clinical release, external AI/STT, real audio/patient data, clinical sign/co-sign, consent, safeguarding action, pilot or deployment.

## 2026-10-26 — TB-EM-038 planned home-practice calendar

- Verified PR #95 merged (main `10f86222365e5ca83d838856e682b64cca8c71dd`), started next single-slice feature branch from main.
- Built monthly grouped, entirely read-only date display from the validated existing one-year WEEKLY/MONTHLY recurrence. Present in current plan and individually selected historical snapshot; no cross-version source association.
- No API/database write, send/release, visit/attendance completion, or home-task progress semantics; date display uses centre-local YYYY-MM-DD without timezone conversion.
- Pure source regression includes overlap, full late month beyond 40-item preview truncation, invalid/undated exclusion, month31 skipped, and source version isolation. Browser test exercises unsaved local calendar, Feb 31 guard and out-of-window month. Tests NOT YET VERIFIED when authored.

## 2026-10-25 — TB-EM-037 goal-review reference comparison

- Owner-authorized squash merge of PR #94 after success (six jobs), Codex clean and Mistral no blocking findings, head `53bf0f267a9408640c3411d4b6332a7547ad6063` to main `40118d49a1486237f54d71f55cc02e1a7dc9d743`. P3 advisories deferred.
- New branch starts at that main SHA. Pure same-goal/same-version checkpoint grouping and explicit selected observation ID set comparison implemented, with recorded timestamp ordering and no outcome aggregation.
- Added responsive, role-preserving synthetic browser overlay test and pure negative/edge regressions; old and current authorized versions use the same read-only component. Tests NOT YET VERIFIED at authorship.
- No clinician approval, sign/co-sign, guardian release, consent, real AI/audio/STT, Render/Neon operations or hosted acceptance updates.

## 2026-10-25 — TB-EM-036 saved-claim inspector start

- Confirmed PR #93 exact HEAD `060abbd87f3973b4208860fd3a4a6dd613268924`: all six jobs successful, Codex original P2 fixed, one review thread resolved, latest exact-head Codex found no major issues; squash-merged as `83c428d201d35fe0bac35c03cd8e4a664699bf39`.
- Started `feature/tb-em-036-claim-source-inspector` from that main SHA; added read-only section and text/source search within authorized report version Compare UI and bounded fictional Chromium positive/negative inspector checks at 320/390/768/1024/1440. Existing authorization/fingerprint enforcement unchanged. Tests NOT RUN at authorship; await exact final HEAD CI and independent code review.
- Hosted issue #61 ledger unchanged; real patient/clinical operations, AI, STT, signature, guardian release and deployment remain blocked.

## 2026-10-25 — TB-EM-035 implementation

Read report version immutability, evidence periods, report decision auth/fingerprint and clinician editor. Branch from merged PR #92 main commit `3cd5fa8`. Extended `ReportsService.evidence()` with timestamp/goal/version-bound goal checkpoint fingerprint metadata but not text, and `ReportDecisionsService` catalogue to allow explicit goal-review source links. Extracted shared `suggestionSources` catalogue for source writer and archived reader; legacy reports lacking checkpoints remain readable. Added pure snapshot trace parser that requires exact section/passage/claim hashes and every cited source to match frozen evidence before displaying clinician wording as linked. Added read projection to existing permission-checked `GET report-versions/:id`, responsive saved-version comparison panel, API/PostgreSQL source/role tests, synthetic immutable text/source mismatch unit cases, and browser legacy+responsive smoke. All features internal, synthetic-only, no auto-generated medical statement. Qualification and independent review pending.

## 2026-10-25 — TB-EM-034 clinician checkpoint slice

From merged main `7f1dee91`, built `POST /clinical/plan-versions/:id/goal-checkpoints` guarded by centre clinical draft permission and existing transaction-scoped therapist assignment. Validates exact goal key, legal past calendar date, minimum note, ≤20 unique observation IDs all belonging to same child/specialty/plan version/goal, matching optimistic plan version and editable draft. Appends tagged record with server-owned actor/timestamp and explicit source IDs to existing planVersion.reviewNotes JSON under compare-and-swap; audit center event contains metadata only, not sensitive note text. Existing supervisor notes projected separately. Added current and historic UI/read-only checkpoints and draft source-selecting form; API negative/positive role and source tests, browser form smoke/width tests. No migration, external AI or clinical release. Tests **not yet executed** at authoring.

## 2026-10-25 — Milestone 1 TB-EM-033 build

Confirmed PR #90 final reviews and CI, squash merged to main. Inspected goal and report evidence UI, Workspace specialty scope, existing plan version exact links. Added pure `goal-review.ts` classifier using `Intl.DateTimeFormat` centre timezone and UTC day math, current-version-only worklist sorted by clinician-selected review date, observation/activity counts that never combine versions, a responsive worklist with focus-to-goal affordance, and exact report Evidence source goal link with historical-version warning in Child 360 plan pane. Added pure boundary/date/version tests and seven-role Chromium responsive/deep-link journey. Code and tests added but CI NOT RUN at authoring. No outcome inference, clinical review decision, releases, signing, AI, STT, notifications or production changes.

## 2026-10-25 — TB-EM-032 source provenance slice

Confirmed PR #89 exact-HEAD CI and review threads, squash merged by owner request. Read the existing `clinical.report_plan_drafted` append-only event metadata, authorized ClinicalService.workspace and report permission enforcement. Added scoped report source projection only for permitted plans and same-child/specialty report records; report version cross-check; original selected goal key mapping (g1 → source goal) limited to initial plan version; clinician read-only PlanEvidenceTrail with exact-version goal observation dates and IDs. Added API access and provenance assertions using synthetic report handoff, pure exact-version isolation tests, and seven-role browser responsive evidence panel checks. No schema migration, hosted deployment, production/clinical approval, guardian release, inference or messaging.

## 2026-10-25 — TB-EM-031 goals & dated home practice

Created feature branch from merged PR #88 main 4e0c3194. Extended GoalDto with optional horizon, targetOn, reviewOn and HomeActivityDto with optional nested schedule (WEEKLY weekdays / MONTHLY monthDay and start/end). ClinicalService validates real calendar dates and bounded recurrence, forces draft cadence labels and captures only supported keys in immutable version snapshot; no DB migration, no clinical authorization change. Frontend typed editor for clinician-selected planning dates, weekly weekday chips/month day and next-occurrence preview; history and version diff include metadata. Added API tests for invalid leap dates, duplicates, no-occurrence range, excessive range, roles and positive persistence, as well as pure recurring-date and responsive synthetic Chromium tests. No tests RUN at this checkpoint; no pilot/deploy/guardian access.

## 2026-10-25 — PR #88 exact-head review responses

Read new Codex P2 at `11ecbb0` and DeepSeek Round 2 `NO_BLOCKING_FINDINGS` with P3 advisories. Implemented synchronous report transition lease for Save version / Send for review (shared with decision and handoff busy refs); added reverse-order Chromium test holding real submit POST and verifying zero plan-draft POST and eventual editor unlock on a simulated failure. Normalized whitespace and short titles at DTO API boundary with 400 assertions; surfaced a confirmed-draft navigation fallback and optional unlock without retrying POST. Prior CI 40193196668 6/6 PASS at old SHA, not claimed for current edits; no hosted run, no clinical authorization. Also recorded earlier failing 40191967253 (Prisma void lock return); query was corrected to text and independently confirmed by later passing PostgreSQL tests.

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
