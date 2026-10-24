## 2026-10-25 — TB-EM-027 review-queue pagination and expanded QA (PR #79 DRAFT)

Issues #75/#77: CODE ADDED (NOT QUALIFIED). A parameterized PostgreSQL JOIN replaces materialized ACTIVE-child UUID lists, with a centre/active-child/IN_REVIEW scope, server child/service/search filters, bounded 25-row pages, deterministic updatedAt+id order, centre and filtered counts. New 102-report real PostgreSQL regressions exercise pagination beyond 100, metadata and authorizations; disposable synthetic Chromium checks five widths and focus-visible. Existing clinical write/approval/release permissions remain unchanged. Exact-head CI and Codex verdict PENDING at authoring. The clinical disposition for archived-child pending IN_REVIEW reports remains an UNSIGNED owner decision, not an automatic status transition; follow-up policy decision required. No protected Render deployment or #61 acceptance change.

## 2026-10-25 — TB-EM-026 CI failure and regression correction

At `1ad25b581f7aecbe1557979d806fd84edfc570ce`, GitHub CI runs 40130052063 / 40130047227 **FAILED** (API job: 481 PASS / 1 FAIL, `progress-reports.e2e-spec.ts:132`). Cause verified from CI logs and source: archiving a child permanently ends therapist care assignments; restoring the child does not restore their access, so the same workflow's subsequent therapist report read correctly returned 404. Not an application regression. Corrective commit `bfb2340f4099ab3e68512cfb9867a5e37dc627eb` moves the archive/restore queue check into an isolated synthetic PostgreSQL test and explicitly asserts ended therapist assignments and denial of therapist report access after restore; original report workflow is no longer interrupted. New exact-head CI and review **NOT YET QUALIFIED** at authoring. No clinical policy changes, no deployment. Preserve #61 hosted acceptance baseline.

## 2026-10-25 — TB-EM-026 PR #74 DeepSeek review remediation

At previous HEAD `e9325c5322ff666e01313ff448b3ebfe8f417b06`, CI pull-request run 40128332485 and push run 40128329125 both completed SUCCESS (six standard jobs). DeepSeek later reported CHANGES_REQUIRED because the documentation claimed DRAFT-exclusion was tested when it was not. That is a genuine P2 qualification gap; the source predicate was already correct. **This corrective branch adds a real pre-submit DRAFT exclusion test.** It also adds coordinator/foreign-centre access checks, archive/restore visibility, accessible report-specific link names, consistent diacritic folding, clearer centre-wide count and 100-row cap messaging, and a chart-period-independent queue with browser regression. These new modifications are CODE ADDED; **exact corrective HEAD CI and external review remain NOT VERIFIED at this checkpoint**. Existing CI at e9325c5 does not qualify new commits. Longer-term server-side filtered pagination and active-child query performance improvements stay advisory in issue #75. Archived-child IN_REVIEW records remain hidden without status changes; no clinical policy decision made. No protected Render/Neon changes, hosted issue #61 unchanged, clinical gates NO-GO.

## 2026-10-24 — TB-EM-026 supervisor review queue (PR #74, DRAFT)

Source HEAD under qualification: `bc51a8bc8f5430121ec21cff902570709af366d9` plus this correction. Adds server-authorized, metadata-only supervisor review queue to the Progress page with search, links, and PostgreSQL/Chromium regressions. Codex P1 required checkpoint records, and P2 required a populated fixture: both corrected in this branch. **CODE ADDED; new exact-head API/Chromium results NOT YET VERIFIED.** Full six-job Actions CI and fresh independent review required. No merge/Render deploy. External hosted QA issue #61 remains OPEN (53 PASS, 0 FAIL, 47 BLOCKED, 4 NOT TESTED, plus 4 supplemental PASS); real AI/STT, clinical authorization, consent and release remain NO-GO.

## 2026-10-24 — TB-EM-024 draft PR #72

Activity-library staff search/filter implementation and follow-up reviewer corrections on an isolated branch; no deployment, authorization or clinical workflow changes. New CI staff journey exercises displayed specialty labels, ownership buckets, reset, empty matches and five responsive widths. At `b234c519`, all six CI jobs PASS (run 40117705186); exact-head Codex review no findings, DeepSeek `NO_BLOCKING_FINDINGS`. Subsequent read-only role regression plus evidence amendment requires new CI; hosted visual review remains independent. Details: docs/product/TB-EM-024-ACTIVITY-DISCOVERY.md.

## 2026-10-24 — TB-EM-023 PR #71 follow-up (draft)

Guardian-only ProductShell theme scope corrects missing family navigation variables. Reviewer feedback identified that the CI demo journey only asserted CSS class names. The draft PR now adds computed Chromium color assertions for 320/390/768/1024/1440 guardian navigation and a therapist clinical-theme negative case. Authenticated family dark mode is not enabled; fixed-light page wrappers remain a documented P3 future consistency item. CI on the new exact HEAD is PENDING; hosted browser QA NOT RUN; no merge/deployment. See docs/product/TB-EM-023-GUARDIAN-NAV-THEME.md.

# Current state — TheraBridge-Emergent

## TB-EM-023 — merged-ready candidate requires requalification (2026-10-24)

PR [#70](https://github.com/NTinkicht/TheraBridge-Emergent/pull/70) combines P1 persistent source-traced report decisions, P2 six hosted-QA fixes, and P3 activity template and explicit child-wide referent workflows. Earlier implementation head `73c4afb5317bf5eca1723242fcc61cdce01fd6fe` was CI-green (481/481 PostgreSQL tests, six Actions jobs) and reviewed NO_BLOCKING_FINDINGS by Grok/Mistral. Codex found two P2 concurrent child/referent mutations at prior head; both fixed at `73c4afb` with centre→child locking and real PostgreSQL parallel regressions. CodeRabbit verified its two findings addressed. A supplemental DeepSeek review posted from the owner's account identified historical-reason UI, stale omitted/reconsidered navigation and additional QA/doc coverage; this next correction responds to those advisories on the same PR. **The new corrective HEAD has not yet been qualified at authoring**; new exact-head CI and independent review are mandatory before merge. No clinical/real-data permission gate lifted. Render synthetic demo remains unchanged; external hosted acceptance issue #61 is not complete.

Canonical new work-unit technical evidence: `docs/product/TB-EM-023-DELIVERY.md`. Archived TB-EM-019 entries below are historical, not a current branch status.


## TB-EM-019 — independent-review advisory corrections (2026-10-23)

Mistral and Grok source reviews at `b542159a70b0799d920593e4f0c439893e2235f3` found **NO_BLOCKING_FINDINGS**. This follow-up implements MIS-001 stable section-specific evidence headings (with legacy compatibility) and MIS-002 explicit therapist-only practice-feedback failure/retry states. Corrective tests are added but **new exact-head CI is NOT RUN as this commit is authored**. Earlier head: [6/6 PASS](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/40006533539). MIS-003 version-label semantics and MIS-004 remove/re-add snapshot semantics remain unchanged pending product decision. PR #65 remains draft, not merged or deployed. Independent re-review must target the NEW HEAD; clinical controls and external AI remain OFF.


## TB-EM-019 — implemented synthetic-only review candidate (2026-10-23)

**PR:** #65 (OPEN / DRAFT); **base:** `main@b11b41daf9b69883d9ade1a325e32b65cf6090b8`.
**Latest implementation HEAD verified:** `b6a15de2854a45691753d477ed0040b9cc17cac6`.
**Exact-head hosted CI:** [run 39999150532](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39999150532) **6/6 SUCCESS**, including 474 API PostgreSQL tests / 14 suites, demo-journey, preview-container, live-session, Compose and secret scan. A duplicate run at the same SHA also passed.
**Development state:** Current workstream's safe foundation is implemented and integrated; not independently reviewed by Mistral. External Render browser QA for **this PR** is NOT RUN, and the live Render/Neon demo is unchanged. No merge or clinical/production activation authorized.

Delivered: scoped Child 360° team/specialty roles and referent "Not designated"; authenticated summary, authorized synthetic practice feedback, longitudinal exact plan-version weekly/monthly current and historical evidence; source IDs; reviewed deterministic report draft passages (edit/omit/restore/explicit append); clinician-selected goal-linked home activities with immutable server-captured template snapshots; deny-by-default future AI provider seam; five-width Chromium geometry and seven-role synthetic browser regressions. Existing clinical safeguards remain in place.

**Next gate:** independent, read-only Mistral exact-head review → address genuine findings and re-run exact-head CI → explicit owner decision on merge and any demo deployment. Canonical policy decisions D7 / D-NEW-5 and external AI provider selection remain OPEN. Do not confuse deterministic evidence assistance with active generative AI. See `docs/product/TB-EM-019-REVIEW-PACKET.md`.

## Historical records below (do not use as current instructions)


## TB-EM-019 active, synthetic-only (2026-10-23)
Draft PR #65, issue #64, branch feature/tb-em-019-child360-evidence-assist: Child 360, version-exact progress grouping and clinician-reviewed deterministic assistance. Real AI remains OFF. Work QA is running only against last merged hosted demo, not this PR. FreeBuff continues the SAME feature branch after exact-head CI. Mistral review and owner merge remain pending. Entries below are historical.


## Uninserted transcript recovery correction — 2026-10-22

Exact uninserted transcript retained in copy-only recovery after remote completion; no automatic insertion. Fixture/live transcript, revocation/failure regressions PASS; 468/468 PostgreSQL tests (12 suites), types/builds, responsive DOM, fresh migrations and Gitleaks PASS. Isolated real two-tab Actions job added with disposable synthetic seed, read-only permissions and cleanup. Hosted exact-head results follow push; independent review pending. See artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md. No issue #61 changes, merge or deployment.


## Multi-tab concurrency correction — 2026-10-22

Explicit conflict comparison/revalidated deliberate recovery implemented; stale autosave blocked. Full PostgreSQL 468/468 (12 suites), types/builds, real two-tab browser/API/database races and revocation/completion, responsive DOM and legacy migration PASS. Docker socket blocked; hosted exact-head status follows export. ChatGPT review pending. See artifacts/tb-em-015/FINAL-REVIEW-CORRECTIONS.md for execution details and limitations. No issue #61 changes, merge or deployment.


## Final review corrections — 2026-10-22

Final three PR #59 review corrections implemented atop 9e0e739. Operation-bound retries/reconciliation, consistent server-side activity evidence and lossless Unicode-bounded transcript insertion are locally verified. PostgreSQL 468/468 (12 suites), API/web typechecks/builds, five-width DOM, live browser/API/PostgreSQL and legacy migration upgrade PASS. Prior R1–R5 and completed immutability retained. Docker socket blocked; exact-head hosted Actions unverified. ChatGPT primary review pending. No merge/deploy/clinical activation.


## PR #59 repairs — 2026-10-22

R1–R5 repaired for the owner-authorized correction checkpoint; see [point-by-point disposition](../../artifacts/tb-em-015/PR59-DISPOSITION.md). Final API/web typechecks and builds PASS; PostgreSQL 457/457 tests across 12 suites PASS; responsive DOM/legacy draft/delayed saving/pending cleanup PASS; baseline legacy migration upgrade PASS. Correction policy remains OPEN and start corrections fail closed. Completed-session trigger unchanged. Docker access denied; hosted CI, authenticated PR response and fresh independent Mistral re-review pending. Owner authorized commit and managed-Git export on the existing feature branch. The containing correction commit follows original PR head 7e366fb53a471b28f58255987eb018c7804b478e; its exact SHA and remote/PR verification are returned in the export handoff. Local checks are not hosted CI. No merge or deployment authorized.

## Historical addendum — TB-EM-015, 2026-10-21

The original bootstrap record below is historical. The application exists on main through PR #57 (`f49ade4125cdb26e11fd7eb2cc80c292a48f00a9`). Session execution and synthetic dictation are implemented on isolated `freebuff/tb-em-015-session-workflow`; no merge or deployment authorized/performed. API: 453/453 real PostgreSQL tests, typecheck/build PASS. Web typecheck/build, responsive DOM and real browser/API/PostgreSQL synthetic journey PASS. Docker smoke BLOCKED (socket permissions). Real recording/STT, AI, signing/release, consent and pilot use remain disabled. GitHub draft PR/CI and Mistral review require authenticated delivery; see `artifacts/tb-em-015/VALIDATION.md` and `docs/emergent/workunits/TB-EM-015.md` for actual evidence and unresolved boundaries.

## Historical bootstrap record

**As of:** 2026-10-20 (UAE)
**Stage:** PRE-BUILD / documentation bootstrap
**Latest verified content:** Repo initialized with README, AGENTS and starter handover instructions. **No Emergent code has been imported/exported yet.**
**Functional app:** NONE
**Tests executed:** 0
**Database:** NONE
**Production/clinical pilot:** NO-GO
**Synthetic records only:** required for future work.

## Initial work unit

`TB-EM-001` — Emergent feasibility review, GitHub export mechanics, portable stack assessment and Phase 1 plan.

### Required before implementation
- Upload owner-provided master blueprint v2 and continuity protocol to Emergent in the first planning job.
- Review Emergent architecture for support of selected Next.js + NestJS/Fastify + PostgreSQL/Prisma stack.
- Decide whether the build is an approved-stack implementation or *explicitly labeled synthetic prototype*.
- Document how Emergent will export to this **existing** repository branch without overwriting `main`; verify first checkpoint.
- Confirm no real patient/child records, external publishing or unauthorized clinical workflows.

### Remaining
- No source code, data schema, migrations, seeds, API, CI or tests exist.
- No independently reproducible app exists; **TAKEOVER NOT YET VERIFIED**.
- Owner must approve the plan before the first code build.

Once the first verified GitHub export exists, replace these statements with actual branch/SHA, test commands, PASS/FAIL/NOT RUN, source paths, working links and blockers.
