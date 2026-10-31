## 2026-10-31 — M2-H04 #142 combined five-issue checkpoint (test status NOT VERIFIED)

| Gate | Current status | Evidence / limitation |
| --- | --- | --- |
| #141 M2-H03 | MERGED DOCUMENTATION ONLY | `232c73c`; #124/#121 fixes did not exist in the merged diff |
| #142 M2-H04 scope | OPEN DRAFT / 5 ISSUES | #124, #121 carried into original #120, #119, #126 under explicit owner approval |
| #124 first HTTP hardening slice | SOURCE/TEST EDITS IN PROGRESS — NOT VERIFIED | Cache headers, account-wide PostgreSQL password-change limit, Prisma error sanitization, Fastify body cap and new tests; CI/test results not yet claimed |
| #121, #120, #119, #126 | NOT IMPLEMENTED / NOT TESTED | Must be completed in this PR; see five-issue acceptance matrix |
| Six CI jobs and final independent code review | NOT RUN on completed implementation | Opening draft/plan review never qualifies a merge |
| Clinical/production governance | NO-GO | Unsigned approvals unchanged; synthetic only |

## 2026-10-31 — Current M2-H03 #141: planning-only review, NOT functional qualification

| Check | Result | Evidence / remaining limitation |
| --- | --- | --- |
| Predecessor M2-S01 #140 | PASS / MERGED | Main `803ad48343f4881045622853c04c7eafefea6380`; 580/580 tests, six green CI jobs, completed no-blocking reviews |
| M2-H03 opening HEAD `bbc85cdb` | PLANNING-ONLY | Only work-unit plan and AGENTS Rule 17; no HTTP or therapist-revocation runtime changes |
| Opening-head GitHub CI | PASS FOR DOCS DIFF ONLY | `41193760260` (six jobs green); this does not establish #124/#121 functionality |
| M2-H03 HTTP and revocation implementation | **NOT STARTED / NOT TESTED** | #124/#121 still require code changes and real-PostgreSQL regression tests |
| Codex/Gemini/Grok/Mistral reviews | PLANNING HEAD ONLY | Codex P2 stale handover records fixed in subsequent commit; other reviewers' current-issue acceptance guidance captured in the plan |
| Current post-review-fix HEAD CI | NOT YET VERIFIED | Re-run and record exact final HEAD; current documentation changes do not substitute for feature tests |
| Clinical signatures, safeguarding, consent, releases, real-data deployment | NO-GO | Owner governance gates remain unsigned; no production changes |

Older test notes below are historical snapshots and may contain superseded M2-S01 next-action status.

## 2026-10-31 — M2-S01 first CI diagnostic and UI notice repair

- Initial head `4b4bc1c` passed API typecheck, API tests and API build, but both demo-browser journeys failed while waiting for `messages-demo-disabled`: deployed permission withholding also hid the informational locked-message page.
- Corrected the page to use existing harmless, read-only session permissions (`family.portal.read|center.summary.read`) so the **disabled notice is visible**, without reinstating `center.messages.use` or any messaging API capability.
- This repair must be requalified on its own exact-head test, secret scan, preview, browser, demo journey and compose checks. No merge/activation is claimed here.

## 2026-10-31 — M2-S01 family messaging fail-closed checkpoint

| Gate | State | Evidence/limitation |
| --- | --- | --- |
| Prior M2-H02 PR #139 | PASS / MERGED | `dafe526b`; 574/574 tests, six green exact-head CI jobs twice, Codex no findings |
| New M2-S01 (#35) code | IMPLEMENTED IN DRAFT, NOT QUALIFIED | Server free-text list/read/create/reply/status and deployed permission claims deny by default; only isolated Jest/CI synthetic fixtures remain enabled |
| Deployment-negative security matrix | ADDED, NOT RUN | Local, preview, development, staging and production with demo flag set; `NODE_ENV` and missing Jest worker gates; revocation of historical guardian thread |
| Six current-head CI jobs | NOT RUN | test, secret-scan, live-session, preview-container, demo-journey, compose required |
| Independent current-head review | NOT RUN | Required under Rule 16 before merge |
| D-NEW-5 safeguarding / D4 custody / D7 consent | NO-GO | Unsigned policies; no real family messaging or activation |

## 2026-10-31 — M2-H02 CI/security verification checkpoint

| Evidence | State | Exact result / limitation |
| --- | --- | --- |
| Policy PR #138 / Rule 16 | PASS, MERGED | Main merge `39c9888`; six required green jobs and Codex no findings on reviewed head |
| M2-H02 code PR | OPEN | [#139](https://github.com/NTinkicht/TheraBridge-Emergent/pull/139), both #117 and #118, no deployment |
| API typecheck, API/web build on `f6a6d2b` | PASS | GitHub Actions PR `test` job `124506918245` |
| Real-PostgreSQL e2e and static CAS tests on `f6a6d2b` | PASS | **19/19 suites, 574/574 tests**, including revocation, isolation, two-actor CAS and same-center cross-child ID checks |
| Browser live-session, synthetic journey, preview, secrets at `f6a6d2b` | PASS | Individual run checks were green on this pre-final commit; full six-job gate and fresh exact-final-head review still required |
| Two source lock refinements and this handover update | PENDING FINAL CI | Must rerun all mandatory checks on resulting head, not inherit `f6a6d2b` PASS |
| Independent final-HEAD review | PENDING | Earlier reviews cover older commits only; no final approval inferred |
| Clinical release, real patient data, signed governance | NO-GO | Fail-closed clinical gates unchanged |

## 2026-10-31 — M2-H02 GH-01 policy-only draft checkpoint (NOT RUN)

| Item | State | Evidence / limitation |
| --- | --- | --- |
| PR #137 exact-head qualification and merge | PASS (previous PR) | 6/6 CI, 570/570 tests, Codex no findings, merged main `3d133c2` |
| Proposed AGENTS.md Rule 16 autonomous-merge condition | PROPOSED, NOT YET IN MAIN | Requires exact-head CI/review and every finding disposition; deferred non-blocking items linked to GitHub issues |
| GH-01 specialty-authz implementation and real DB negative matrix | NOT STARTED | Current draft changes are only policy and checkpoint docs |
| New PR exact-HEAD 6 CI jobs | NOT RUN | A new PR / new HEAD requires new evidence |
| Independent current-HEAD review | NOT RUN | No conclusion claimed |
| Clinical activation, real data or published migration rename | NO-GO / OPEN | No change to signed owner gates |

## 2026-10-31 — PR #137 first corrected-head CI failure and fixture repair

CI run [41182535567](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41182535567) on HEAD `94ba59f`: `secret-scan`, `live-session`, `preview-container`, `demo-journey` **PASS**; `test` **FAIL** (569 pass, 1 fail across 18 suites); `compose` SKIPPED. The sole failure was the pre-existing real-PostgreSQL rollback fixture `rolls back demo DB and removes pre-staged credentials on mid-seed failure`: its `failAt` mock exposed `$transaction` but not the newly required post-failure `authIdentity.count` query, so recovery correctly retained credentials for an uncheckable outcome. Commit `5efcb49` exposes the real committed read in that wrapper; code behavior and other tests unchanged. **New final HEAD six-job CI NOT YET VERIFIED.**

## 2026-10-31 — PR #137 follow-up P3 regression ledger (NOT RUN at documentation checkpoint)

| Regression | State | Expected invariant |
| --- | --- | --- |
| PostgreSQL committed then the client loses COMMIT acknowledgement | ADDED, NOT YET VERIFIED | Seven local identities are committed and the protected credential file remains available |
| Existing demo user missing a local authentication identity | ADDED, NOT YET VERIFIED | Seed refuses an unexported random password; DB remains at six identities; prior credentials preserved |
| Interrupted pre-COMMIT credential staging | ADDED, NOT YET VERIFIED | No demo users + preexisting file gives actionable, fail-closed recovery message; after verified test-file removal rerun creates seven identities |
| Previously covered mid-transaction PostgreSQL rollback | CODE UPDATED, RE-RUN PENDING | Zero committed identities after rollback; newly staged file removed only when zero demo identities are independently confirmed |
| Exact corrected-HEAD six CI jobs | NOT VERIFIED | Must qualify final HEAD, not prior `49c99db` or `5daa691` |
| Independent Codex review of final HEAD | NOT VERIFIED | Prior reviews do not qualify the new code |
| Migration chronology, production and clinical use | OPEN / NO-GO | No historical rewrite, no real clinical activation |

Review source: PR #137 review 5717799244, follow-up 5717859375. Code commits: `05d7f7a`, `5daa691`.

## 2026-10-30 — PR #137 independent review remediation evidence

| Check | State | Evidence |
| --- | --- | --- |
| P2 protected demo credentials fail before DB commit | IMPLEMENTED; NEW HEAD CI PENDING | Exclusive file create, write, fsync before DB mutates; rollback cleanup |
| Filesystem TOCTOU collision | NEW HEAD CI PENDING | Mock write of rival credentials file between checks; assert no account insert |
| Real PostgreSQL rollback | NEW HEAD CI PENDING | Fault injection after initial DB writes for both synthetic and demo seeds |
| Argon2 CPU work outside transaction | IMPLEMENTED; NEW HEAD CI PENDING | Sequential password pre-hash before interactive DB transaction |
| Migration new-folder future skew and direct-main-push guard | NEW HEAD CI PENDING | Added negative fixtures and GitHub main-push comparison |
| Exact corrected-HEAD six CI jobs | NOT VERIFIED | Previous `06b2f21` success applies only to older commit |
| Independent final-head review | NOT VERIFIED | Prior Codex no-findings receipt is outdated after fixes |
| Migration chronology rename | OPEN / NOT DONE | Historic migration identity left unchanged pending applied-DB ledger |
| Clinical/real-data deployment | BLOCKED / NO-GO | Signed owner policies absent |

Review disposition: PR #137 conversation comment #6531973532.

## 2026-10-30 — M2-H01 first exact-HEAD CI receipt

Commit `b1155a1673a5efe2cf67765188cb9211ac884568`; [GitHub Actions CI run 41056461993](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41056461993): **6/6 SUCCESS** on this recorded commit. Required jobs `test`, `secret-scan`, `live-session`, `preview-container`, `demo-journey`, and `compose` all concluded successfully. The `test` job included migration guard negative fixtures, exact base-HEAD migration immutability, Prisma additive upgrade, API fault-injection seed tests, TS check, API build and real browser regression. The demo and preview jobs exercised the existing hosted-synthetic demo startup behavior.

**Scope caveat:** This receipt applies exclusively to the cited SHA. Subsequent documentation/implementation commits require a fresh six-job qualification. The migration identifier rename suggested in #134 remains intentionally excluded pending existing-deployment migration ledger review; therefore GH-18 is not declared fully closed. Independent review and merge approval remain pending.

## 2026-10-30 — M2-H01 / GH-18 provisional verification ledger

| Acceptance item | Result | Evidence / limitation |
|---|---|---|
| Published Prisma migrations are immutable | NOT RUN | New guard compares base and HEAD blob SHAs on PR |
| Migration guard negative-path fixtures (7) | NOT RUN | `node --test scripts/qa/check-migration-history.test.mjs` in `test` CI |
| Synthetic account DB seed fault injection | NOT RUN | Jest `seed-transactions.e2e-spec.ts` |
| Children's Home demo DB seed fault injection | NOT RUN | Same Jest suite; protected credentials exported only after transaction |
| Fresh DB + migration continuity | NOT RUN | Existing CI Prisma migrate deploy/status test preserved |
| Hosted demo seven-role idempotent seed | NOT RUN | Existing `demo-journey`/preview CI |
| Six exact-HEAD CI jobs | NOT RUN | Qualification required before merge |
| Independent review | NOT RUN | Required after code stabilization |
| Clinical authorization and real-data deployment | BLOCKED / NO-GO | Unchanged signed-policy gates |

Historical migration folder rename from GH-18 is not applied: no evidence yet that rewriting a published Prisma migration identifier can safely preserve existing deployments. Must inspect deployed migration ledgers and validate a forward-compatible plan if needed; never imply this audit subitem has passed.

## 2026-10-29 — TB-EM-051 unsigned transfer policy check (NOT RUN at initial design commit)

Created `docs/policy/TB-EM-051-AUTHORIZATION-GATES.json` with nine unsigned owner gates, zero signatures, blocked activation in development/CI/preview/staging/production and explicit denial scenarios. Created `scripts/qa/verify-tb-em-051-gates.mjs`: validates decision uniqueness/completeness, fails on any unexpectedly enabled/approved state; seven policy negative fixture mutations must be rejected (plus an assignment-mutation sentinel), and the current governance controller/service must still expose only non-authorizing simulation/operational proposal/readiness with hardcoded no-access/transfer markers. Wired into `.github/workflows/ci.yml` required test job. **NOT EXECUTED** at this checkpoint; exact new SHA six CI jobs and independent P0–P2 review pending. The script is a source/contract guard, not a proof of real clinical permissions or transfer readiness. No patient, consent, safeguarding, clinician signature, family release, external AI or hosted acceptance undertaken. Clinical NO-GO / external QA #81 unchanged.

## 2026-10-29 — TB-EM-050 first review corrections; corrected HEAD NOT RUN/NOT VERIFIED at documentation commit

Original PR #113 HEAD `7b6551f8dc`: GitHub Actions run 40780220643 finished six green jobs; first-round Codex completed no major issues. New code removed Prisma interactive transaction and pinned row locks from manager readiness reads, still performs active manager/tenant/role verification; response adds server `checkedAt` ISO timestamp. UI re-synchronizes proposal row status with response and labels freshness; no actual transfer or consent. Expanded existing PostgreSQL handover.e2e suite with explicit archived child after ACKNOWLEDGED (child false, receipt true, readiness always false) and CLINICAL_SUPERVISOR forbidden. New full two-session Playwright UI regression is deferred to issue #114 and is not falsely marked passed. **New HEAD full six-job CI, rerun and second review PENDING**, not covered by original CI. Hosted #81 and clinical NO-GO unchanged.

## 2026-10-29 — TB-EM-050 read-only handover readiness (NOT RUN at first commit)

Baseline PR #111 merged main ef1761a36d62bd626baf9a587798f0fc11afd35b; exact-head PR CI run 40778143037 passed all six. TB-EM-050 new endpoint and UI code not yet executed in CI at documentation checkpoint. New real PostgreSQL handover.e2e tests assert: manager-only GET, read-only fixed-shape readyForTransfer=false regardless of operational acknowledgement, active source/target specialty checks, flags off denied, nonexistent and cross-tenant proposals 404, recipient therapist 403, cancelled not open, zero readiness audit writes and unchanged assignment. Required new-head CI and independent re-review NOT VERIFIED; no claims of passing tests or clinical readiness.

## 2026-10-29 — Review policy implementation and P3 regression: NOT YET RUN

Prior PR #111 e7caba017fac 6/6 exact-head CI PASS; cannot transfer that verdict to new HEAD. New PostgreSQL test deliberately holds the center FOR UPDATE lock, confirms one waiting cancellation then two waiting competing operations via pg_stat_activity, releases, verifies cancel 201 / acknowledge 404, one cancellation event, zero acknowledgement events and unchanged active assignments. Frontend manager panel disables duplicate source/service proposal when PENDING_ACK or ACKNOWLEDGED exists, with visible explanatory notice; server CAS/409 unchanged. Tests and code have been committed but exact-HEAD CI has not yet completed; do NOT claim PASS. No clinical release or production deployment.

## 2026-10-29 — TB-EM-049 corrected test ledger

Initial run 40772381693, head 0d170d3: test FAILURE (3 failed / 553 tests; handover.e2e-spec.ts only), compose SKIPPED; other jobs green. Real SQLSTATE 23514 prevented inserts. Source-equals-target test also expected 404 vs actual 422. Additive migration and service validation fixes applied (NOT VERIFIED at new HEAD). Added PostgreSQL tests for old simulation isolation, completed history cap, source assignment ended, concurrent specialty/assignment lock-wait, cancellation scope, duplicate proposal. All six corrected-head CI jobs and final independent P0-P2 review PENDING. No clinical handover/release allowed.

## 2026-10-29 — TB-EM-049 handover preparation checks (NOT RUN)

Added real PostgreSQL e2e suite handover.e2e-spec.ts with: manager proposal, duplicate pending prevention and cancel; wrong-therapist/unauthorized role denied; recipient sees only own opaque operational request without child identity or clinical drafts; receiver acknowledges with original assignment unchanged; invalid service reason/free-text rejection; inactive specialty denial; feature flag OFF read/write rejection; concurrent proposals dedupe. Updated full role permission test map, exact write-route inventory and security matrix. CI six-job new exact-head status NOT VERIFIED, no Codex result, no merge/deploy. Clinical release, reassignment and hosted #81 NO-GO intact.

## 2026-10-29 — PR #109 reviewer fixes / verification pending

Previous exact-head run 40765592359 failed 2 assertions in apps/api/test/authz.e2e-spec.ts (AC-9/AC-11), causing Compose skip. Revised exact full permission and route snapshots without weakening; NEW HEAD CI PENDING.
Added tests (not verified yet) for:
- concurrent role removal, specialty removal and assignment ending block a therapist response using real PostgreSQL row lock contention; after revocation commit response must deny and no clinical.home_plan_request_answered event is recorded;
- rival keys simultaneously sent for same pending link/service → one 200, one 409, winner idempotently replays, exactly one event;
- responding membership FK rejects nonexistent membership;
- two linked guardians submit independent request keys and get distinct scoped results; clinician responds independently;
- HOME_PLAN_REQUESTS_DEMO=false returns only disabled empty status views and rejects mutations.
Existing tests for guardian revocation race, history pending beyond 100, valid/invalid statuses and cross-role denial retained. All six CI jobs and final Codex review NOT YET VERIFIED. Hosted #81 and clinical NO-GO unchanged.

## 2026-10-29 — TB-EM-048 new verification items

- Earlier GitHub CI `test` FAIL: 2 test suites (`operations.e2e-spec.ts`, `authz.e2e-spec.ts`) retained old fixed permission expectations; new correct guardian and therapist request permissions were unlisted. Expected matrices updated. Initial `practice.e2e-spec.ts` PASS prior to adding revocation-lock and history-limit cases.
- New regression 101 newer answered records plus old pending request: ADDED, exact-HEAD NOT RUN; expected all pending remain reachable while only 100 recent completed are returned.
- Final current-HEAD CI 6/6 and independent no-blocking reviewer result: NOT VERIFIED. Nothing merged or deployed.

## 2026-10-29 — TB-EM-048 reviewer regression additions (current head NOT VERIFIED)

- Initial Codex P1 guardian removal/therapist response TOCTOU: **FIX IN CODE, CI PENDING**. New PostgreSQL test holds guardian_link removal transaction, waits for response lock contention, commits removal, expects response 404 and zero answer audit events.
- Initial Codex P2 different-key false replay: **FIX IN CODE, CI PENDING**. New test expects HTTP 409 for an unaccepted second key while another pending request exists, then creates a valid request with that key after prior acknowledgement; identical accepted key replays original request.
- Browser CI now enables request flag only on disposable localhost demo test DB, submits guardian request, verifies no draft leakage, and reopens as assigned therapist for fixed-status acknowledgement. **EXACT-HEAD RUN NOT YET VERIFIED**.
- Original and current CI results must not be mixed; hosted clinical/production NO-GO unchanged.

## 2026-10-29 — TB-EM-048 provisional test ledger

- PostgreSQL test assertions **ADDED, NOT VERIFIED**: guardian request with active assigned therapist; denied before assignment, wrong child, unknown service, free-text/extraneous fields, admin/guardian/supervisor/wrong therapist calls; idempotent key and duplicate pending; clinician fixed response; no clinical release; second request after acknowledgement; revoked guardian link and therapist reassignment removal; trial expiry mutation denial; audit event count.
- Migration and Prisma-generated client **NOT YET VERIFIED**. Browser UI for family and clinician views **NOT YET EXECUTED** at this checkpoint. Six-job PR CI **NOT YET VERIFIED**. Reviewer verdict **PENDING**.
- Clinical signing, releases, consent grants, safeguarding, real AI/STT, production use: **NO-GO**, unchanged. Hosted #81 acceptance remains **BLOCKED/INCOMPLETE**.

## 2026-10-29 — PR #108 TB-EM-047 duration-override verification ledger

- Original PR HEAD `ed5414add44e30228d8a476abcf6dd28f3edd65b`: CI `demo-journey` **FAIL** at stale exact-copy assertion ("Duration is taken from the activity definition"); other jobs were reported green by Mistral but original job logs were not used as qualification for subsequent commits. Corrected in `scripts/design/check-demo-journey.mjs`.
- New API regression assertions **ADDED, NOT VERIFIED AT NEW HEAD**: explicit null, zero, 121, fractional 10.5, negative -1 => HTTP 400 without revision mutation; valid 7 minutes persists in homeActivities with original snapshot 10; omitting override on next save removes it, snapshot unchanged. Existing role/specialty denials retained.
- Pure logic assertions **ADDED, NOT VERIFIED AT NEW HEAD**: saved projection retains source minutes and flags effective override; clearing falls back to original; changes between 5/15 overrides are recorded with same immutable snapshot minutes.
- Synthetic Chromium assertions **ADDED, NOT VERIFIED AT NEW HEAD**: 7 allowed, 121 and 10.5 disable Save, unsaved value never shown in persisted preview; corrected display-copy check. Historical comparison now renders each override explicitly.
- Full current exact-head CI six jobs: **NOT VERIFIED**. Independent fresh exact-head reviews: **NOT VERIFIED**. Hosted browser/cookie QA #81: **BLOCKED/INCOMPLETE**. No clinical approval, release, or production readiness established.

## 2026-10-27 — PR #97 preflight gate verification (PENDING final HEAD)

- New offline assertions execute the exact Node code from the GitHub Actions `qualify` shell gate and check owner-only valid commands (including uppercase), rejected mention-only/malformed/partial commands, leading/trailing whitespace, unauthorized authors, and the `dispatch.needs.qualify` dependency.
- Earlier P1 fixture on stale HEAD reused a prior reservation; corrected at commit `8eb5935`. API `test` passed on that corrected head. Fresh exact-HEAD CI after added preflight and audit changes not yet verified; no live model API calls/clinical outcomes claimed.

## 2026-10-27 — PR #97 paid provider safety regressions added (PENDING exact-head CI)

- Offline fake API tests now also cover base SHA change with identical HEAD, reservation persistence before a billed provider call, GitHub result-publication failure and retry suppression, GitHub reservation-write failure preventing any API request, and break rather than continue when a first provider observes stale HEAD while both provider APIs are enabled.
- Earlier clean commit `8e29c401296cd75d35a454628d5052ea8997ef04` passed secret-scan and review dispatch; newly added P2 logic/tests/docs alter HEAD, so all six jobs **NOT VERIFIED** at this update. No live API charges, no real patient data, no production release.

## 2026-10-27 — PR #97 reviewer dispatcher CI tests (NOT RUN at rebased HEAD)

- Added exact GitHub Actions `github-script` offline fixtures, **no paid network requests**: uppercase manual selectors / SHA, zero spend by default, dedupe, stale pull event, head/base moving mid-call, forbidden source rename, excessive patches, HTTP 429, invalid JSON, escaped HTML/mentions/forged result markers, real PASS only after validated response. Failures return INSUFFICIENT_EVIDENCE.
- CodeRabbit five comments addressed in code; initial intermediate-commit secret scan FAILED because generic regex matched computed fixture API-key name, not a real credential. Scanner allowlist NOT weakened; source fixed and branch is clean-rebased on merged main to drop the flagged intermediate commit from reachable git history.
- Fresh full six-job CI, exact-head scanner, reviewer outcomes and thread resolution **NOT YET VERIFIED** at authoring. No live Mistral/Grok call authorized; hosted UI acceptance #81 remains separate.

## 2026-10-27 — TB-EM-046 acceptance additions (NOT RUN at branch HEAD)

- Added cross-workstream pure fixture: saved v2 goal's actual observation, old v1 same goal key and incompatible percent measurement, saved home-activity snapshot preferred over updated template library, and internal saved report v1 source remains `NOT_IN_CURRENT` relative to v2. No cross-version evidence aggregation, clinical approval or family release.
- Added seven-role synthetic browser checks that all four Child 360 care-stage controls are responsive and operable at widths 320, 390, 768, 1024 and 1440px. Existing exact-child navigation and role isolation tests retained.
- New ledger `docs/qa/TB-EM-046-MILESTONE1-ACCEPTANCE.md`. **No exact-head tests/CI/reviews executed at authoring**. Hosted external acceptance issue #81 remains independently BLOCKED/INCOMPLETE; clinical/release/real patient safeguards unchanged.

## 2026-10-26 — TB-EM-045 synthetic care journey status, pending final-head verification

- Pure test authored (NOT independently executed before original-head CI): two synthetic current plans, superseded plan and reused goalKey; asserts exact current-version observation count (2), current goal count (3), current home activity count (2), authored schedule count (1), no inferred reportCount.
- Disposable seven-role Chromium CI run `40395177839`: **PASS** demo-journey on original feature HEAD `e7ed6c921ce0d9bd18c8ff297aae703cfa07f001`; four step-click/tab/child identity checks included and five standard responsive widths retained. This is synthetic CI coverage, NOT hosted QA.
- Same original-head CI: **PASS** secret-scan, live-session, preview-container; **IN PROGRESS** test; **NOT RUN** compose (at time of writing). A new documentation commit changes HEAD; all results must be re-verified exact-head before any qualification or merge.
- Codex identified missing mandatory checkpoint updates as P1, addressed by this documentation change. No production/family release/real data or external QA verification.

## 2026-10-26 — TB-EM-044 source consistency evidence

- `scripts/design/check-child360-logic.mjs` now pure-tests immutable vs current report evidence: same-version exact source IDs and values, changed value on same source ID, same goal key on different version, unavailable/legacy source identity, changed measure, no samples, date-period, assessment and session differences. Tests use fictional synthetic read models only.
- `scripts/design/check-demo-journey.mjs` adds internal saved-vs-current report evidence disclosure, explicit NOT clinical validation notice and visible source/assessment/session summaries; existing seven-role permission and responsive loops retained.
- PR #104 earlier exact head `4d97f571e5f1f9c0a7f08eaa40600666cafd89a7`: CI `40394141714` **PASS 6/6** (test, secret-scan, live-session, demo-journey, preview-container, compose); Codex NO major issues. Required docs additions change HEAD, so **new exact-head CI NOT RUN** at authoring and qualification pending.
- No hosted QA issue #61 evidence, clinical source authentication/approval, guardian release or production verification claimed.

## 2026-10-26 — TB-EM-043 tests authored, awaiting exact-head CI

- Pure: same reused `same-key` across speech plan v1 percent and v2 count and unrelated OT level goal; observation evidence, checkpoint notes and source IDs stay separate by BOTH `planVersionId` and `goalKey`. Definition field differences flagged, orphan evidence excluded, saved target/horizon/reviewOn retained, deterministic output checked.
- Browser: clinician Progress tab shows goal version context, specialty filter reveals only authorized plans, saved baseline and target in each expanded version, exact plan-version deep link; existing seven-role, five-width Chromium run retained. Test fixtures synthetic only.
- No hosted #61 acceptance, medical effectiveness proof, signing or family release implied.

## 2026-10-26 — TB-EM-042 additions (NOT YET VERIFIED at authoring)

- `scripts/design/check-child360-logic.mjs` adds the pure authorized timeline projection fixture: 2 distinct service/plan versions sharing a goal key, server-created checkpoint with backdated clinician date, completed/in-progress notes, assessment and 3 recorded observations including an orphan. Assert ten events, including two same-day goal checkpoints ordered newest-first by their full server-recorded timestamps, sorted dates, same-version goal labels, no attribution for orphan, filter event/service counts, deterministic order and no appointments/family outcomes in clinical evidence.
- Existing seven-role synthetic Chromium `check-demo-journey.mjs` visits Child 360, verifies event-type filter excludes unrelated event categories, service scope shows speech-only records, restores filters and retains existing viewport 320/390/768/1024/1440 and role-isolation checks. Exact-head CI pending.
- This is internal read-only clinical history, not a diagnosis, approval, guardian release, real hosted QA or proof of clinical efficacy; issue #61 acceptance baseline unchanged.

## 2026-10-26 — TB-EM-041 tests added (NOT YET EXECUTED)

- Pure source check `scripts/design/check-child360-logic.mjs`: `savedPlanProjection` displays exact version ID/revision/summary/goal definitions/activity notes/saved snapshots; live library changes do not overwrite saved definition; later version cannot inherit original report goal mapping even if keys coincide; absent linked goal, legacy/missing snapshot behavior and absence of release/approval claims.
- Disposable, existing seven-role Chromium journey adds saved plan inspection for active editor and exactly selected historical version, checks original stored snapshot instead of later template, explicit internal no-release disclaimer, unsaved editing warning and omission of browser-only therapist instructions while the plan editor remains dirty. Existing viewport/permission checks retained.
- No hosted issue #61 evidence generated; no clinical approval. Exact-head CI and independent review pending.

## 2026-10-26 — TB-EM-040 test additions (NOT YET EXECUTED at creation)

- `scripts/design/check-child360-logic.mjs`: pure `homeActivityDefinition` saved-snapshot wins over mutable template title/duration/steps/safety; note is plan-only, no snapshot changes; legacy and unavailable fallbacks explicit; note-only change visible as plan version difference; 500-character DTO-aligned limit.
- `scripts/design/check-demo-journey.mjs`: synthetic clinician edit of activity-specific note; `plan-submit` remains disabled while unsaved; active safety and definition duration visible; monthly calendar day includes authored note without save; historic plan inspection labels a frozen clinician note; maintains seven-role and 320/390/768/1024/1440 responsive checks. No real data or family disclosure.
- Exact-head CI and independent reviewer results pending. Hosted QA ledger #61 unchanged (53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED +4 historical supplemental PASS).

## 2026-10-26 — TB-EM-039 (added tests, NOT YET EXECUTED at writing)

- `scripts/design/check-child360-logic.mjs`: pure handoff: clean valid draft permits requesting supervisor review, any dirty plan or new-unlinked draft is blocked, advisory missing summary/goal links/schedules/templates/goal dates do not become invented clinical eligibility gates. No approval state or outcome inference.
- `scripts/design/check-demo-journey.mjs`: synthetic authenticated clinician workflow prepares an UNSAVED schedule, verifies `plan-submit` disabled and save-first explanation; after route overlay removal/reload, verifies stored clean draft can still request review. Also verifies plan B supervisor submission is blocked while plan A has dirty local edits and restored when plan A's contents are reverted, using the existing synthetic two-plan response overlay. Existing multi-role, viewport, exact-version and no-write browser suite retained.
- No actual patient data or clinical signoff. Tests pending GitHub exact-head CI. Hosted external acceptance issue #61 unaffected.

## 2026-10-26 — TB-EM-038 (tests added; NOT YET RUN)

- `scripts/design/check-child360-logic.mjs`: checks exact-version grouped month entries, weekly + monthly ordering, invalid/undated omission, missing 31st, invalid month, overlap, no completion/outcome fields; verifies 30 scheduled dates in a late month despite 40-event `scheduledDays` preview cap.
- `scripts/design/check-demo-journey.mjs`: in already-authorized synthetic clinician workspace, add valid October 31 plan schedule WITHOUT save, inspect calendar date and selected item, assert explicit unsaved preview, verify no February 31 and no out-of-window entries; retains 320, 390, 768, 1024, 1440 responsive checks and all seven role checks. Historical read-only source data remains unchanged.
- No clinical or hosted acceptance claimed. Exact-head GitHub CI NOT YET VERIFIED at writing. Hosted issue #61 ledger unchanged.

## 2026-10-25 — TB-EM-037 (tests added, NOT RUN at writing)

- Pure TS source regression in `scripts/design/check-child360-logic.mjs`: same plan-version/goal timeline only; explicit source intersection/only-earlier/only-later; backdated `reviewedOn` vs immutable event time; same-time stable order; duplicate source IDs; mismatched goals, inverted, identical or absent selections denied; no claimed progress/clinical effectiveness.
- Synthetic seven-role CI Chromium journey extended with **fictional authorized-GET response overlay**, two reviews and three fictional observation refs. Checks render, exact reference difference counts, selection denial for reversed records, 320/390/768/1024/1440 width geometry, then removes the overlay before continuing real authorized flows. This is UI coverage only, not clinical validation or hosted QA.
- At branch creation code and test changes are added, NOT YET EXECUTED/VERIFIED; no PASS may be claimed until exact-head CI results. Hosted issue #61 remains **53 PASS, 0 FAIL, 47 BLOCKED, 4 NOT TESTED**, +4 historical supplemental PASS.

## 2026-10-25 — TB-EM-036 inspector regression coverage (NOT RUN)

- Added synthetic Chrome journey checks for two fictional statement associations, filters by report section and claim/source terms, mismatch warning persistence, zero-results state, responsive geometry at 320/390/768/1024/1440 px. Uses a loopback-only mocked report-version response after real authorized role login; **not** trusted clinical evidence or new source-hash validation. Existing 7-role synthetic suite and real Postgres PR #93 tests remain separate.
- At authoring: source updated, GitHub six-job CI not yet executed/inspected; PASS count for this slice is zero, not verified. No external hosted QA performed. Issue #61 authoritative acceptance remains **53 PASS, 0 FAIL, 47 BLOCKED, 4 NOT TESTED** (+4 historical supplemental PASS).

## 2026-10-25 — TB-EM-035 qualification planned (NOT YET RUN)

New PostgreSQL `report-decisions.e2e-spec.ts` covers an actual synthetic clinician goal-review checkpoint attached to exact plan version and observation, valid source picker ref, rejected alien checkpoint ref (422), frozen report-version statement trace with full claim/source binding, and cross-specialty/guardian/unassigned denial. New pure `report-statement-trace.e2e-spec.ts` covers exact saved section/passage/claim/source matching, edited section refusal, changed checkpoint/value fingerprint, missing legacy sources, malformed claim maps, and two separate clinician passages. Disposable seven-role Chromium now opens a legacy saved report-version comparison with an explicit 'no source-linked statements' state and checks 320/390/768/1024/1440 widths. **CODE ADDED; CI/TESTS NOT EXECUTED at authoring.** Predecessor PR #92 6/6 PASS and squash merged `3cd5fa8`. Hosted #61 unchanged (53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED plus four historical supplemental PASS).

## 2026-10-25 — TB-EM-034 regression coverage (ADDED / NOT YET RUN)

New `clinical.e2e-spec.ts` PostgreSQL test covers therapist-only current draft checkpoint, unassigned therapist 404, supervisor/admin/guardian write denial, invalid/mismatched/duplicate source IDs, nonexistent goal, invalid/future dates, insufficient narrative, CAS stale version replay 409, true immutable observations/goals preserved, supervisor authorized read and internal audit record containing no narrative text. Browser journey checks clinician checkpoint form, enabled draft with explicit goal selection, and five responsive widths WITHOUT posting. Historical plan versions show read-only tagged checkpoints. **Unverified at authoring**; existing hosted issue #61 remains 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 historical supplemental PASS).

## 2026-10-25 — TB-EM-033 synthetic qualification plan (NOT YET RUN)

Added pure `goal-review` assertions for centre-local Asia/Dubai vs America/Los_Angeles dates, past/today/14-day/later/absent/invalid review dates, sorting current version only, exact `(planVersionId,goalKey)` evidence counts and activity links; no historical goal observation bleed. Added Chromium checks for displayed review worklist, jump/focus to authorized goal, 320/390/768/1024/1440 responsive bounds, report Evidence version/goal deep link and permission-checked Child 360 navigation. All assertions added, NOT VERIFIED at file authoring. Last merged PR #90 6/6 PASS at `da55a3f`, squash `b2d34c0`. No hosted QA update: issue #61 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 supplemental PASS).

## 2026-10-25 — TB-EM-032 planned tests (ADDED / NOT YET RUN)

Expanded `progress-reports.e2e-spec.ts` after real saved report→draft handoff: therapist/supervisor see source plan projection referencing exact report and saved version; manually authored unrelated plan source remains null; source original version goal g1 maps to the exact observed source plan version+key; new draft observations remain empty; guardian, admin and coordinator denied clinical workspace; unassigned therapist 404. Pure `plan-evidence.ts` regression asserts sort/order and strict plan-version+goal filter, no cross-plan or reused-key evidence bleed, no source mapping on later versions. Disposable seven-role Chromium tests staff-only evidence panel presence and 320/390/768/1024/1440 responsive bounds. **NOT YET EXECUTED**. PR #89 predecessor 6/6 SUCCESS at `9865032`; squash `a84edafb`. Hosted issue #61 stays 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 historical supplemental PASS).

## 2026-10-25 — TB-EM-031 planned qualification (ADDED / NOT YET RUN)

Added real PostgreSQL tests to `apps/api/test/clinical.e2e-spec.ts`: short/long goal fields and target/review dates, invalid calendar dates and horizon, weekly and monthly cadence/unique weekdays, impossible range, >366-day window, no-occurrence period, clinician authorization and supervisor read-only, persisted schedule, frozen activity snapshot, guardian denial and no inherited observations. Added pure UI recurrence tests for leap years, month 31 skip-not-roll, week selections, no-occurrence rejection and version-diff change detection in `scripts/design/check-child360-logic.mjs`. Disposable Chromium journey tests horizon/date editing, required schedule fields, next occurrences and responsive 320/390/768/1024/1440 widths using an authorized synthetic response overlay without committing data. **Tests not executed at this checkpoint; exact SHA/CI receipt pending.** Prior PR #88 6/6 success at `77f3c26d`, squash merged into main as `4e0c3194`. No hosted acceptance or real patient testing; official issue #61 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 supplemental PASS).

## 2026-10-25 — PR #88 review follow-up qualification

At previous exact SHA `11ecbb05f1d29244143078c12f53fd2c6eb4cc9b`, Actions CI [40193196668](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/40193196668) completed **6/6 SUCCESS** (PostgreSQL API, seven-role synthetic Chromium at 320/390/768/1024/1440, live-session, preview-container, secret-scan, Compose). This supersedes earlier historical code-head failures for qualification of that SHA only. Explicit failure record: [40191967253](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/40191967253) at `4183112` failed PostgreSQL plan-draft creation because `pg_advisory_xact_lock` yielded a `void` value unsupported by Prisma `$queryRaw` deserialization; demo browser also assumed saved report-version fixture; both fixed in later commits and passing in 40193196668. Follow-up reviewer P2 adds a browser regression that holds report submit POST, attempts handoff during pending transition, requires zero plan-draft POST, locked edit controls, then restores editing on synthetic failed submit. DTO API regression now rejects whitespace-only `title: "   "` and short trimmed `title: "a  "` (400). Both **ADDED / NOT YET RUN at authoring**. Hosted issue #61 stays 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 historical supplemental PASS). No clinical release or deployment.

## 2026-10-25 — TB-EM-030 corrected regression evidence (PENDING latest HEAD)

First CI run 40191079510 at 4ddf99a: the new `progress-reports.e2e-spec.ts` test PASSED; API test job failed only because `authz.e2e-spec.ts`'s explicit write-route list omitted the new permissioned POST (corrected in follow-up commit). This run must NOT be claimed fully green. Corrections after original code head: serialize concurrent same-report-plan requests, replay prior matching content via immutable source event after a new UUID, freeze and flush report editor autosave before handoff, lock input during uncertain result, preserve exact retry payload until confirmed/explicitly abandoned; added API + browser regressions. **New exact-head CI/Chromium/tests are NOT YET VERIFIED at authoring.** No hosted QA, 104-case acceptance update, release or real data; #61 stays 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 historical supplemental PASS).

## 2026-10-25 — TB-EM-030 new regression checks (ADDED / NOT RUN)

The PostgreSQL report workflow now includes report-to-plan handoff verification for exact saved snapshot, author and assignment boundaries, 403/404 denial, wrong source/version/key, duplicate selections, stale revision, new goal identity, zero inherited observations, no home activities, source-only audit metadata, and exact replay with same request ID. Disposable seven-role Chromium script checks opt-in selection/no false create affordance and 320, 390, 768, 1024, 1440 px responsive handoff. **All new assertions CODE ADDED, execution NOT YET VERIFIED.** Exact SHA and CI receipt pending. No new authorized hosted QA, no released clinical data and no #61 update: 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 historical supplemental PASS).

## 2026-10-25 — TB-EM-029 verified CI plus subsequent P3 adjustments

**PASS**: exact `b7c38759be4a09413ce8c7f4458405cd4097fefc` GitHub Actions CI [40188527231](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/40188527231), all six jobs (demo-journey, preview-container, live-session, test, secret-scan, compose) completed SUCCESS, including read-only plan comparison regressions and five-viewport synthetic loopback browser checks. DeepSeek source-level verdict on this SHA: NO_BLOCKING_FINDINGS. **NOT YET VERIFIED**: exact post-P3 correction SHA must receive its own CI. New code handles missing legacy snapshot arrays and labels mutable-library fallbacks; no new hosted browser run or protected deployment. Official #61 remains **53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED** (+4 historical supplemental PASS). Do not count synthetic CI browser checks as hosted acceptance.

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
## 2026-10-31 — M2-H04 #142 new-code CI checkpoint (NOT QUALIFIED)

| Check / exact HEAD | Evidence |
| --- | --- |
| `e71ad7d` first implementation CI | `secret-scan`, `preview-container`, `live-session` PASS; `test` FAIL at migration chronology guard (published Nov 3 future-dated baseline), `compose` SKIPPED. No pass claimed. |
| Chronology guard local negative/positive tests after fix | `node --test scripts/qa/check-migration-history.test.mjs`: **11/11 PASS**. New migration at published-head+1h; no published SQL touched. |
| HTTP and therapist revocation tests | New e2e fixtures added, real DB run PENDING |
| DB integrity and reminder sweep regressions | New real DB fixtures added, run PENDING |
| Final-head six required CI jobs + independent Codex | PENDING; PR #142 DRAFT, NO MERGE |
| Protected clinical/real-data release | NO-GO; unchanged |

