## 2026-11-22 — M5 owner feedback PR3 therapist workspace (PARTIAL, NOT QUALIFIED)

After #462 merged, PR3 work begins with observation 16 task-oriented clinical caseload entrance and observation 17 completed historical sessions collapsed by default. Active `IN_PROGRESS` SessionEditor instances stay mounted so unresolved local drafts/autosave/conflicts are not discarded when history is toggled. History is rendered only after an explicit accessible control. No clinical schema or access policy changed. Other PR3 observations 15, 18–24 remain OPEN; owner visual/AT and all qualification gates remain NOT_RUN/UNVERIFIED. G2/G2b NO-GO unchanged.

## 2026-11-22 — M5 owner-feedback PR2 #462 (IMPLEMENTED, NOT QUALIFIED)

Predecessor PR #461 merged at `a88d5cdd`; no unmerged work inherited. Draft PR #462 now implements owner items **04, 09, 10, 14**: custom 1–4 week appointment recurrence using existing `SeriesDto.intervalWeeks` bounds, accurate SeriesSummary, nullable/versioned center contact email/phone migration with tenant-scope and server-side validation/audit, explicit editable job-title vs administrator-assigned role guidance, and center-scoped child quick links to existing profile/guardian section only when a guardian is linked. Unit/mounted/PostgreSQL and five-width synthetic browser test *definitions* committed, not yet final qualified. **Item 11** sensitive child intake, **13** protected photo and **27** self-managed specialty/role grant policy are GATED pending separately approved clinical/privacy/authorization design. No public/patient data, media publishing or G2/G2b activation. Latest exact-head CI, >=90% eight-metric coverage, final reviewer and owner visual acceptance still PENDING/NOT RUN at checkpoint.

## 2026-11-22 — PR #461 Gemini review follow-up (IMPLEMENTED; FINAL QUALIFICATION PENDING)

Gemini review reported no critical new XSS/tenant-isolation issue, and identified independent per-hook theme-state desynchronization, AppShell dark-icon CSS coupling and stale Schedule search text following dropdown selection. Replaced per-component state with shared `useSyncExternalStore` / storage-event subscription while preserving explicit light/dark validation, the family migration key and visual-only behavior. Preview icons now render from the reactive theme; Schedule clears stale directory search when a therapist is chosen from the scope-authorized dropdown while preserving the selected filter and full directory. Added two-consumer/cross-tab/error-path tests, mounted icon test, and CI-only Playwright selection regression. **New exact-HEAD CI and independent Codex re-review NOT YET VERIFIED; owner visual/AT acceptance remains NOT_RUN.** Clinical gates G2/G2b NO-GO unchanged.

## 2026-11-22 — M5 global dark clinical-assist P2 (NOT YET QUALIFIED)

Independent Codex review found that ReportDecisionAssist and HomePlanSyntheticAssist contained hardcoded white panel/field backgrounds with theme-lightened foregrounds, making explanatory and editable text unreadable in dark staff workspaces. Replaced fixed white surfaces with the existing semantic `bg-surface-white` and set explicit corresponding text where required, without changing any clinical workflow or access rule. Added shared consumer source/contrast regression. Final exact-HEAD CI and independent review and owner visual acceptance pending; G2/G2b remains NO-GO.

## 2026-11-22 — M5 global dark shared ErrorState P2 (NOT QUALIFIED)

Codex reviewed the preceding HEAD and found `ErrorState` used hardcoded dark red body text on a status-danger background now re-themed for dark staff pages. Replaced only that body foreground with shared `text-status-danger` semantic colour, respecting the existing family-specific foreground. Added light/dark 4.5:1 contrast regressions and source-integrated check. Final exact-head CI and independent review remain pending; no owner visual signoff, no clinical GO.

## 2026-11-22 — PR #461 Codex dark specialty-card P2 correction (UNQUALIFIED HEAD)

Codex independently identified that staff ActivityCard surfaces still used literal light specialty tint/gradient values with light text in dark mode, breaking contrast. Updated only ActivityCard presentation to map approved specialty identities to semantic `--tb-specialty-*` CSS variables (single and multiple-service gradient). The approved literal specialty metadata, permissions and guardian card behavior are unchanged. Mounted card regressions and numerical dark-text/tint >=4.5:1 checks added. Full exact-head CI and independent review still PENDING. G2/G2b NO-GO preserved.

## 2026-11-22 — PR #461 shared dark theme and cross-screen P2 checkpoint (NOT QUALIFIED)

M5 observation 32 was corrected from guardian-only to all authenticated roles. Implemented shared clinical/family dark semantic RGB+hex tokens, persisted prepaint preference and theme switches in real ProductShell and preview AppShell, plus matching sidebar/header/mobile/More colours and readable raster logo chips. A seven-persona × five-viewport Playwright computed-style check, mounted role/theme regressions and WCAG colour-pair tests were added. Codex P2 child index/ARIA desynchronization was fixed via a shared effective index used in both Children and Schedule pickers; guardian mobile inactive foregrounds now use family tokens. Existing pending Codex P2s must be re-reviewed. **Latest exact-head CI, coverage, independent review and human visual/AT acceptance are NOT YET VERIFIED; do not merge or declare M5 complete.** Clinical G2/G2b remains NO-GO.

## 2026-11-22 — PR #461 final Codex P2 autocomplete visibility fix (UNQUALIFIED HEAD)

Codex exact-HEAD review on `c4a86dba` identified a real P2: keyboard active option could move beyond an eight-suggestion dropdown. Shared `revealActiveSuggestion` listbox-scoped scroll helper now handles forward/backward selection, viewport bounds and malformed index without page scrolling; both children and Schedule therapist lists are wired to this helper. Added mounted overflow/reverse-scroll and source integration regressions. Prior exact-head `c4a86dba` had all six core CI gates plus 8 unrounded API/Web >=90% metrics green. **The new P2 fix HEAD is not yet requalified; final CI, new independent review and human accessibility evidence remain pending.** All clinical G2/G2b NO-GO gates unchanged.

## 2026-11-22 — M5 owner-feedback shared UX PR #461 (DRAFT; NOT QUALIFIED)

- Owner's 32 unique manual findings mapped to 5 packages. This PR addresses #1/#2/#3/#5/#6/#7/#8/#12/#26/#32, shared across administrator, coordinator, therapists, supervisor and guardian.
- Implemented on isolated branch: schedule scrollport-aligned header/body and therapist typeahead; authorized child-name suggestions and stable child columns; responsive staff activity cards, existing approved specialty tints with optional multi-service gradient presentation, clear activity provenance and stable action zones; family-only theme tokens on authenticated shell surfaces.
- No change to real clinical signing, STT, guardian release, source rights, actual approved images or backend authorization. Multi-service persisted activity assignment is NOT IMPLEMENTED by this package (existing templates still have one service).
- **CI/coverage, real hosted browser, visual 320/390/768/1024/1440, assistive technology and final independent review: NOT RUN / NOT VERIFIED at documentation checkpoint.** Do not merge or deploy without subsequent exact-HEAD qualification and owner review.

## 2026-11-20 — M5-14 post-merge offline staging integration (NOT QUALIFIED)
Created an INTERNAL, no-HTTP, private-only candidate staging composition to connect full PNG integrity validation, independent trusted-scanner attestation and actual exclusive filesystem quarantine writes against one snapshotted byte buffer and exact immutable tenant/activity/draft intent. Hardened LocalQuarantineWriter to reject forged/accessor-backed and mutation-prone intents before any async IO. New test exercises persisted private 0600 PNG, exact SHA, no URL/key in receipt, late caller byte/scope mutation, duplicate writes, infected/stale/error scanner proofs, corrupted PNG, forged rights and malicious property getters. Tests/TS typecheck/full CI/Codex review NOT YET RUN/VERIFIED. No request endpoint, DB custody CAS, production trusted scanner, object-store adapter, promotion, images in UI, read/delivery, derivatives or signed rights/clinical approval. DO NOT mark #197 complete. Continue only with trusted transactional actor/tenant/version/quota/CSRF binding, durable custody/audit, storage and independent safety and rights approvals; G2/G2b NO-GO, synthetic-only.

## 2026-11-20 — PR #459 push CI cancellation and fail-closed gate remediation (requalification PENDING)
Push CI run 44771870835 on HEAD c32ea29fa1cf4826ffe0b81164d67b0f51c7af6b cancelled demo-journey after its 15-minute job timeout; the Playwright Chromium --with-deps step alone consumed approximately 10 minutes and the synthetic browser journey remained in progress when the timer expired. Dependent smart-ci-gate correctly FAILED on cancelled required demo-journey. The separate exact-SHA PR CI run 44771887645 completed SUCCESS, including demo-journey and smart-ci-gate. Increase only the demo-journey timeout budget to 25 minutes to tolerate variable runner browser dependency installation; leave every real test, requirement, CI dependency, hard Smart CI failure condition, security job, SBOM, provenance and all eight >=90% API/Web measured gates unchanged. New HEAD full push/PR CI, eight measured coverage metrics and independent final-head Codex review are NOT YET VERIFIED. M5 manual accessibility/UX/rights/owner acceptance remains NOT_OBTAINED; PR stays DRAFT, synthetic-only, G2/G2b clinical NO-GO.

## 2026-11-20 — M5 PR4 live synthetic browser evidence integration (qualification PENDING)
Added a source-executing integration bridge to join the *actual* M5-01 seven-role/175-route browser receipt with the WU2 3-role x five-width=15 observed screenshot-hash/role/route/keyboard/overflow receipts from the existing isolated *_demo_test runner. The bridge validates both original evidence contracts, rejects missing/duplicate/forged receipts and malicious identity coercion, retains actual baseline route failures/overflow for review, and records a 75-row five-width x five-state x three-role manual matrix as NOT_RUN. An explicit NOT_QUALIFIED manual result and no owner/asset/accessibility/clinical approval are invariant. CI demo-journey now runs adversarial bridge tests and uploads a numeric/synthetic-only receipt; no screenshot bytes, passwords or patient data are published. Existing CI/security/Smart CI/coverage denominators and all eight >=90% gates remain unchanged. New final-HEAD integrated CI and fresh Codex review NOT YET VERIFIED. Human screenshots, WCAG screen-reader/contrast, task-time >=95%/30% targets, rights/visual and owner signoffs still NOT_OBTAINED. G2/G2b NO-GO; do not close M5 from synthetic technical receipt alone.

## 2026-11-20 — M5 major PR #459 exact-review P2 fixes (NOT YET QUALIFIED)
Codex HEAD 900ef979 P2 #4643663535: pending-matrix and qualified-receipt dimensions previously accepted sparse arrays; both now share dense own-data descriptor validation, reject holes/accessors/duplicates, and cannot treat a zero-sized expected matrix as PASS. Codex P2 #4643663550: receipt role/journey/width/state are now primitive-type-and-domain-checked *before* joining the key; crafted object toString/valueOf cannot mutate manual check results or spoof PASS, and string widths are rejected. Adversarial source-executing Node tests added for one-hole role/journey matrices, inherited/accessor index, object coercion and evidence mutation. Code commits 69eadab/b70429b; tests 6cf3c7b/8be3415. Full exact-final-HEAD CI, independent Codex re-review, all eight unrounded >=90% API/Web metrics, real browser/keyboard/screen-reader and owner visual/usability signoff PENDING. No completed human test or clinical release claimed. G2/G2b NO-GO and synthetic-only restrictions remain. PR #459 remains DRAFT, M5 issue #168 OPEN.

## 2026-11-20 — M5 major PR 4 integrated acceptance instrumentation (DRAFT / NOT QUALIFIED)
Six source-level QA scripts from pre-existing isolated preparation branch reconciled into latest main after merged PRs #456/#457/#458. Added executable Node adversarial test step inside required full-mode source-contracts job; preserved all existing security, browser, coverage, SBOM, provenance, preview, Smart CI and >=90% unrounded API/Web gates. Evidence matrix requires 5 viewport widths and 5 UI states per declared synthetic role/journey, with manual checks initialized NOT_RUN (never fabricated). Synthetic task benchmarking requires >=20 paired samples per group, >=95% success and >=30% median improvement; synthetic PASS is NOT human usability approval. Exact-final-HEAD full CI, review, hosted browser runs, manual keyboard/screen reader, contrast, five-width visuals, real task observations and owner milestone signature NOT RUN/PENDING. Clinical G2/G2b NO-GO and asset/legal publication restrictions unchanged. M5 subordinate issues stay open until per-issue evidence is recorded.

## 2026-11-20 — PR #458 instrumented Jest ESM runtime remediation (qualification pending)
Focused measured-Web run 44747919462 failed all 34 new genuine catalogue Jest cases before execution: dynamic import of .mjs lacks Node --experimental-vm-modules. Scoped NODE_OPTIONS only to existing Jest invocation in both full CI and focused coverage workflows; source inventory, original 90% hard gate, test collection, security/Smart CI and coverage denominators unchanged. Added real catalogue boundary tests remain intact. Exact-HEAD rerun, actual measured 8 metrics and independent Codex re-review pending; no PASS claimed. Synthetic-only, G2/G2b NO-GO.

## 2026-11-20 — PR #458 measured Web branch coverage recovery (qualification pending)
CI run 44746036294: API 1729/1729 and Web 1739/1739 tests passed, but mandatory measured Web branches 89.26% (<90%), with 62 uncovered source branches in apps/web/src/lib/illustrated-catalogue.mjs. Kept full 162-file denominator and all eight >=90% required gates unchanged. Added Jest execution-level adversarial catalogue tests for trusted projection, malicious descriptors, sparse arrays, filtering, denied image publication and immutable print snapshots; legacy Node tests remain. Local Jest NOT RUN, latest-head integrated CI and numeric coverage PENDING; no PASS or clinical approval claimed. Synthetic-only; G2/G2b NO-GO.

## 2026-11-20 — M5 PR1 stale supervisor authorization error remediation (NOT QUALIFIED)
Codex P2 on PR #456 identified late 403/404 from an unmounted scoped supervisor queue reaching the shared session handler. Scoped onError now checks mounted state; a deferred 403 after switching centre/child/specialty is regression-tested and must not redirect the new scope. Code commits 6814d48 and 49d9f82. Full exact-HEAD CI and new independent Codex review PENDING; no PASS or issue closure claimed. Remaining full role journeys and five-width acceptance incomplete. G2/G2b NO-GO and synthetic-only remain.

## 2026-11-20 — M5 PR1 focused CI failure corrected (new qualification pending)
Focused `measured-web` run 44722525253 failed one of 1738 tests: the new deferred-pagination test counted both a Next Link React wrapper and rendered anchor for the same `data-testid`. Corrected assertions to count actual rendered `<a href>` nodes, without changing production behavior or weakening tests. Also adjusted loading assertion for wrapper nesting. New exact-head CI, 8 >=90% metrics and Codex re-review PENDING; no PASS claimed. M5 role/UX acceptance remains incomplete, G2/G2b NO-GO.

## 2026-11-20 — M5 major PR 1 supervisor scope isolation (unqualified code checkpoint)
Added keyed supervisor queue remount on center/child/specialty changes and exact request-key response binding for search and pagination. Prevents old authorized report links from remaining visible under newly selected scopes while next API request is pending. Deferred-response mounted tests added for changed centre and page. This is not proof of complete supervisor acceptance; local tests NOT RUN; new exact-HEAD CI and independent Codex re-review PENDING. Clinical signing and family releases remain G2/G2b NO-GO.

## 2026-11-20 — M5 major PR 1 consolidation checkpoint (DRAFT / NOT QUALIFIED)
Initial scoped workspace UI hardening rejects duplicate, empty or unsafe tab identities and renders no tab panel rather than risking stale cross-role/cross-child content association. Mounted adversarial regressions added. This is only the first implemented slice of the owner's consolidated M5-04/06/07/08/09 package; role journey completion, exact-HEAD CI, eight >=90% coverage metrics, screen-reader/manual accessibility evidence and Codex review are NOT RUN/PENDING. No clinical release or real patient information; G2/G2b NO-GO.

## 2026-11-20 — M5 major PR2 rights/hold denial slice (unqualified)
M5 PR2: Added standalone fail-closed custody rights/hold validator. It is NOT wired to DB, storage or endpoints; no authority to read, release or publish.
G2/G2b NO-GO; synthetic-only; #197 remains OPEN.

## 2026-11-20 — M5 major PR 2 async media scope binding regression (NOT QUALIFIED)
Private admission no longer reads caller-owned tenant/template/draft/version metadata after asynchronous scanner execution. The private intent, created from strict validated snapshots before scan, remains the only output identity. A deferred-scanner Jest regression mutates all caller-owned scope identifiers/version while scan is pending and asserts the original validated scope and fail-closed output. Code/test committed, local execution NOT RUN; exact-HEAD CI, 8 >=90% gates and new Codex review PENDING. Does not enable storage or publication; M5-14 #197 OPEN, G2/G2b NO-GO.

## 2026-11-20 — M5 major PR 2 media-lifecycle consolidation (DRAFT / NOT QUALIFIED)
First real safety slice snapshots and validates untrusted quarantine-scope and candidate metadata before any identifier/key is generated, rejecting accessor-backed, coercible UUID, and extra-field inputs. Adversarial Jest cases added. This does NOT implement authenticated storage, real scanner, derivative generation, legal approval, durable custody audit or publication. Local tests, exact-head CI, eight >=90% coverage metrics and Codex review NOT RUN/PENDING. M5-14 #197 OPEN, G2/G2b NO-GO, synthetic-only.

## 2026-11-20 — PR #458 M5-16 print-safe instruction projection (qualification pending)
Implemented an immutable, text-only clinician-preview projection with numbered accessible step labels, safely copied materials/equipment/safety and explicit synthetic-not-approved status. No user-supplied image URL, real media, approval or release permissions are exposed. Regression tests cover snapshot immutability, step numbering, malicious indexed getters and missing instructions. Local tests NOT RUN. New exact-HEAD full CI, eight unrounded >=90% API/Web gates, independent Codex review, five-width and manual keyboard/screen-reader acceptance PENDING. M5-16 #199 and M5 parent remain OPEN; G2/G2b NO-GO, synthetic-only restrictions preserved.

## 2026-11-20 — M5-10 keyboard disabled-tab regression (qualification pending)
Synthetic-only WU: WAI-ARIA keyboard navigation now excludes aria-disabled tabs as well as native disabled tabs, preserving focus/click guards. Regression checks the filtered selector and avoids activating the disabled tab. Local tests NOT RUN; exact-HEAD full CI, all eight >=90% measured coverage gates, browser checks and independent Codex review PENDING. This is a narrow accessibility slice, not closure of #193 or manual WCAG/screen-reader acceptance. G2/G2b NO-GO unchanged; no clinical release or real data.

## 2026-11-20 — M5-14 custody audit candidate-byte boundary fix (qualification pending)
Code now rejects invalid, noninteger and out-of-range candidateBytes in the synthetic immutable custody chain verifier; adversarial tests include 33-byte and 8 MiB boundaries. Local tests NOT RUN. Exact-HEAD CI, eight >=90% API/Web measured coverage gates, and independent Codex review PENDING. No real storage, media read, rights approval or publication; G2/G2b NO-GO. M5-14 #197 remains OPEN.

## 2026-11-20 — M5-14 WU4-O immutable custody chain verifier (draft, qualification pending)
Implemented pure hash-chain verifier with strict tenant, revision and final-state binding; no storage or approval. Synthetic-only; G2/G2b NO-GO remains fail-closed, no real images, storage, clinical data, media publication, licensing approval, or permission grant. Adversarial Jest tests committed; local tests NOT RUN. Full exact-HEAD CI, all eight >=90% measured coverage gates, and independent Codex review PENDING. Issue #197 stays OPEN; production integration, rights sign-off and real authorization remain blocked. Handover record only, not a qualification receipt.
## 2026-11-20 — PR #450 Codex P2 remediation
Corrected audit evidence to derive from a single own-data-property custody record snapshot (not Proxy getters). Added adversarial regression tests. Exact-head CI and new independent Codex review are PENDING; no merge or coverage qualification claimed. M5-14 #197 remains OPEN, G2/G2b NO-GO, synthetic-only and no image publication or real media access.


## 2026-11-20 — PR #451 Codex P2 remediation
Corrected private read denial to reject non-primitive UUID identities before coercion or normalization. Added adversarial regression tests. Exact-head CI and new independent Codex review are PENDING; no merge or coverage qualification claimed. M5-14 #197 remains OPEN, G2/G2b NO-GO, synthetic-only and no image publication or real media access.

## 2026-11-20 — PR #448 Codex P2 remediation checkpoint
Fixed P2: reject accessor-backed or mutated custody records and transition events using a single own-data-property snapshot. Added targeted adversarial Jest regression. Remediation code/test HEAD c9a6257e57fe5de4c9f311b9723bd5806fe1934a; full exact-final-HEAD CI and fresh independent Codex review NOT YET VERIFIED. Do not merge until all eight >=90% coverage gates and required CI/review receipts pass. M5-14 #197 OPEN; G2/G2b NO-GO.

## 2026-11-20 — M5 WU4-K immutable custody state contract
Versioned QUARANTINED→REJECTED/REVOKED→PURGE_PENDING→PURGED transitions with expected-revision compare, legal-hold purge denial, immutable fail-closed flags, and identity/digest validation; no file mutation is performed. Clinical approvals, public images, real media processing and G2/G2b GO are NOT enabled; issue #197 OPEN.

## 2026-11-20 — PR #449 Codex P2 remediation checkpoint
Fixed P2: reject >8MiB or <33-byte inputs before allocating a private Buffer snapshot. Added targeted adversarial Jest regression. Remediation code/test HEAD 0833634efe44813e146de127f4b5b6c272828f83; full exact-final-HEAD CI and fresh independent Codex review NOT YET VERIFIED. Do not merge until all eight >=90% coverage gates and required CI/review receipts pass. M5-14 #197 OPEN; G2/G2b NO-GO.

## 2026-11-20 — M5 WU4-L bound candidate inspection
One private Buffer snapshot is checked by existing PNG header/full CRC+inflate verifier, scoped randomized quarantine intent and trusted scanner attestation. Cross-checks hash, byte count, tenant, activity, draft and version; outputs only nonrelease evidence. Clinical approvals, public images, real media processing and G2/G2b GO are NOT enabled; issue #197 OPEN.

## 2026-11-20 — M5 WU4-J pre-merge checkpoint
Partial internal rights/provenance evidence helper: strict tenant/draft/template/version/digest matching and independent reviewer identity, source/license/attribution/provider evidence verification; nonpublication receipts. Not connected to an API, real media scanning, rights approval or publication. M5-14 #197 remains open; G2/G2b NO-GO.

## 2026-11-20 — M5 WU4-I pre-merge checkpoint
Partial internal scanner attestation helper: bounded byte snapshot, required trusted scanner, matching digest and byte length, CLEAN verdict and constrained engine/signature version; reject forged, offline and inconsistent scanner results. Not connected to an API, real media scanning, rights approval or publication. M5-14 #197 remains open; G2/G2b NO-GO.

## 2026-11-20 — M5 WU4-H PR #445 review remediation
bounded PNG integrity verifier implemented (partial): full PNG chunk ordering, exact CRCs, IDAT inflation and row/filter framing for constrained RGB/RGBA subset, rejecting malformed/unknown chunks and unconsumed compressed bytes; NO independent sandbox pixel decoder, AV, upload, storage or approval. Codex P2: check zlib engine consumed-byte count equals entire concatenated IDAT input; adversarial tests for CRC-correct opaque suffix and concatenated streams. Codex P1: required continuity evidence updated. Original first-head PR CI is not exact-head acceptance for revised branch. All eight >=90% API/Web metrics and full CI required on latest commit. G2/G2b NO-GO, #197 open; human rights/clinical/WCAG approvals NOT OBTAINED.

## 2026-11-20 — M5 WU4-G PR #444 review remediation
private filesystem quarantine adapter implemented (partial): write-only local quarantine to a private 0700 root; exclusive 0600 files; candidate SHA-256 and byte-length verification, with NO HTTP upload/read route, approved state, public URL or production object store. Codex P2: snapshot candidate Buffer before asynchronous filesystem work and reject symlinked ancestors of configured root; regression tests cover immediate mutation and ancestor alias. Codex P1: required continuity evidence updated. Original first-head PR CI is not exact-head acceptance for revised branch. All eight >=90% API/Web metrics and full CI required on latest commit. G2/G2b NO-GO, #197 open; human rights/clinical/WCAG approvals NOT OBTAINED.

## 2026-11-20 — M5 WU4-F PR #443 quarantine-intent boundary (current state)
PR #442 merged as `c958ed963d9d0042145b2f60d473309aaebe359e`; #443 retargeted to main. Implemented internal immutable private-quarantine candidate intent with scoped centre/template/draft/version, SHA-256 candidate fingerprint, fresh random object keys, deny-by-default read/publication flags and synthetic adversarial Jest tests. No object storage, binary upload, decoder/CRC, AV scan, derivatives, rights/clinical approval, guardian projection or release exists. G2/G2b NO-GO. Earlier #443 browser CI `m5-child360-browser` timed out on login in first attempt; its exact-HEAD retry PASSED, as did API/Web test, coverage, SBOM, provenance, contract, preview, live-session, demo-journey and Compose jobs. Final Smart CI gate on retry and independent reviewer P2 documentation disposition require confirmation on new exact HEAD. Human accessibility, image safety, rights and usability approvals NOT OBTAINED. M5-14 remains open.

## 2026-11-18 — PR #436 main advancement reconciliation
Current main advanced after PR opened. This integration replays only #432's missing WU2 qualification/CI acceptance changes, retains new WU4 code and complete handover records verbatim, and preserves the more recent main Child360 domcontentloaded correction. Exact-head CI and independent review must be repeated after this reconciliation; G2/G2b NO-GO.

## 2026-11-18 — PR #436 Codex P2 remediation checkpoint
Codex identified (1) nested/private screenshot data and string-width admission in WU2 evidence and (2) a missing Child360 domcontentloaded wait, previously incorrectly described as preserved. This integration now enforces an exact root/governance/summary/observation schema, JSON primitive types and numeric widths; adversarial cases reject nested metadata, Buffer-style screenshots, unknown root keys and string widths. Restored Child360 waitUntil domcontentloaded with existing role/route/child checks unchanged. Exact-head push+PR CI and independent re-review PENDING; commercial provenance push run previously failed an unexpected Sigstore attestation and is NOT considered cleared. G2/G2b NO-GO unchanged.

## 2026-11-18 — PR #432 integration into main (WU3-C acceptance qualification)
Restored original #432 WU2 browser qualification, 3 roles × 5 viewport sizes, fail-closed receipt validator, private synthetic browser runner and numeric-only CI artifact. Preserved all later main implementation and previous handover records. The original main still used a full-load Child360 wait, so this reconciliation restores the missing domcontentloaded correction; WU2 and seven-role login navigation now wait for actual authenticated pathname and still require role authorization verification. CI and Codex on integration HEAD PENDING. No human accessibility/usability approval or G2/G2b GO.

## 2026-11-17 — WU3 qualification exact-head CI retry
Initial unstacked WU2 browser run 44147014875 failed because it lacked prerequisite M5-10 skip link; resolved by stacking on M5-10. Subsequent combined CI run 44148140688 passed the standard seven-role browser observation (175 routes, zero overflow/errors), but flagged Child360 browser hit a Playwright `waitForURL` timeout waiting for full browser `load` after login. Changed only login navigation wait to `domcontentloaded`; the existing role, authorised child, 5-width, denial, loading/retry and other substantive browser assertions remain unchanged. **Corrected current-HEAD CI pending; previous failed run not accepted**. No clinical G2/G2b or human accessibility approval.

## 2026-11-17 — WU3 WU2 role-browser qualification / M5-04 crosswalk · CURRENT_STATE.md
Implemented an isolated *_demo_test Playwright 3-role × 5-viewport (=15) technical qualification of therapist/caseload, coordinator/schedule, supervisor/governance with settled authorized markers, overflow and skip link; screenshot bytes hashed in memory and never archived. Added fail-closed adversarial schema tests (roles, widths, duplicates, sensitive fields, missing checks, approval spoofing), numeric-only evidence artifact, and execution under existing seven-role synthetic demo CI (not a new production runner). Full original CI gates preserved. Technical browser receipt is **not human accessibility or usability approval**; redacted visual review, participant task success/time and real screen readers PENDING. Exact-head CI, Codex and WU2 issue-close decision PENDING; all G2/G2b clinical gates NO-GO. See docs/roadmap/M5-WU3-ACCEPTANCE-AND-RELEASE-LEDGER.md.

## 2026-11-18 — WU4-A M5-B / M5-13 presentation & illustration standard
PR #433 implements visual-family presentation mapping and adds a draft version-controlled style guide. Original six clinical service IDs remain unchanged. Independent illustration/clinical approval is NOT OBTAINED; G2/G2b remains NO-GO.

## 2026-11-18 — PR #435 two Codex P2 async UI fixes
Codex P2 #435 corrections: close/reopen invalidates pending first-page and cursor-page replies via generation guard. Save locks all metadata inputs via disabled fieldset until POST settles, preventing unsaved post-click edits being wiped. No clinical/guardian publication; G2/G2b NO-GO.

## 2026-11-18 — PR #435 push-event browser CI remediation
Push-run verification exposed Child360 SPA login navigation timeout on `load`; updated waitForURL to `domcontentloaded` without removing browser assertions. Smart CI gate remains strict. New exact-head CI NOT VERIFIED.

## 2026-11-18 — WU4-C Codex P2 activity ownership gate
WU4-C PR #435 P2 correction: only owning therapists and clinical supervisors can see a centre activity's private media proposal editor. Server authorization unchanged; non-owner therapists retain Duplicate to customize. No clinical publication.

## 2026-11-18 — WU4-C paginated proposal history
WU4-C displays all paged activity media proposal history through authenticated tenant-scoped API. No actual image, rights approval, clinical signoff, guardian publication or release supported.

## 2026-11-18 — WU4-C illustration proposal UI
PR #435 adds an authenticated staff-only metadata proposal/rejection panel on the existing activity library; no guardian image preview, unapproved upload or publication; G2/G2b NO-GO.

## 2026-11-18 — WU4-B P2 media history pagination
M5-14 metadata draft registry now supports bounded cursor paging for all historical proposals and rights records; no real storage, asset approval or publication. G2/G2b fail-closed.

## 2026-11-18 — WU4-B / M5-14 activity media drafts
PR #434 adds a metadata-only media proposal registry, tenant-scoped rights metadata, revision checks and audit log. No storage adapter, approved bytes, clinical/guardian publishing or governance activation. P1 reviewer specialty and role alignment corrected; requalification pending.

## 2026-11-18 — WU4-A M5-B / M5-13 presentation & illustration standard
PR #433 implements visual-family presentation mapping and adds a draft version-controlled style guide. Original six clinical service IDs remain unchanged. Independent illustration/clinical approval is NOT OBTAINED; G2/G2b remains NO-GO.

## 2026-11-17 — WU3 M5-10 / M5-04 shared accessibility and performance · CURRENT_STATE.md
Implemented WAI-ARIA horizontal tabs with RTL Arrow/Home/End and disabled navigation, focusable skip-to-main link and named main, explicit focus/reduced-motion/RTL CSS, accessible focusable calendar hours with date-inclusive appointment names and bounded layout, linear source-bound goal history bucketing, and optional shared compact mobile cards preserving desktop semantic table. Coordinator exception view opts into cards at narrow widths. Jest includes mounted RTL, dense exact-version history and mobile/table contracts. No changes to role, tenant, clinical release, consent or server mutation rules; G2/G2b NO-GO unchanged. Exact-HEAD CI, Codex, redacted five-width screenshots, real NVDA/VoiceOver, WCAG contrast, low-bandwidth and measured task performance **PENDING/NOT RUN**; no issue closure claim for #187/#193.

## 2026-11-17 — PR #430 CI regression: generated fixture email-name collision (CURRENT_STATE.md)
Investigated full CI `44149914183`: API integration test `centers.e2e-spec.ts` failed 1/1585 because the random base64url test password included invited local-part `tom` and the production policy correctly rejected it with HTTP 422. No application auth policy was changed. Replaced the test-only generator with 96-bit random hex bytes separated by hyphens, avoiding any contiguous three-character local-part collision; added 128-run actual-policy regression checks for staff/administrator fixture email names. Smart CI gate failure was downstream from API tests. Exact-HEAD rerun, independent review, and full WU3 acceptance remain **PENDING**; do not claim PASS or merge until verified. G2/G2b NO-GO unchanged.

## 2026-11-17 — M5-09 CodeRabbit exact-head findings correction
Independent CodeRabbit review on original PR #430 HEAD found (1) nested FamilyProgress root forcing light despite auto dark wrapper and (2) in-flight reminder save across sibling switches showing a stale toggle. Fixed route-specific `FamilyProgress theme="auto"` (internal clinician previews retain default explicit light); moved pending and server-confirmed per-child reminder state to the keyed, authorized parent; reused existing fail-closed error handling. Added real deferred-resolution and rejection mounted tests for A→B→A switch. No release/consent/role API change. **New exact-head CI and independent re-review PENDING**; initial review findings not claimed closed until results. G2/G2b NO-GO.

## 2026-11-17 — WU3 M5-09 guardian focus and theme · CURRENT_STATE.md
Implemented single authorized child focus and keyboard-operable three-sibling selector, permission-scoped family shortcuts, verified-draft versus release copy, preserved appointment/attendance history/reminder actions, keyed tenant isolation and per-child confirmed reminder choices. Family home/practice/activities/progress now use semantic auto theme, with OS dark palette applied in CSS prepaint. Updated source-mounted 3-sibling/revocation/permission/contrast smoke cases. No API approval/release or family message grants changed. Clinical G2/G2b NO-GO. Exact-head CI, Codex, manually reviewed 320/390/768/1024/1440 light/dark screenshots, screen readers, low-bandwidth and human usability **PENDING/NOT RUN**; do not close #192 without evidence.

## 2026-11-17 — WU2 M5-08 supervisor: CURRENT_STATE.md
**Issue:** #191 · **Branch:** `feat/m5-wu2-supervisor-workspace` · **Implementation:** Scoped review queue, review-step hierarchy, source-only metadata disclosure, filtered document selection and role-limited internal governance actions.
**Verification:** code and new synthetic Jest regression coverage committed; exact-HEAD CI, independent Codex review, five-width visual screenshots, real keyboard/screen-reader, performance/low-bandwidth, owner UX qualification and manual acceptance **NOT RUN/PENDING** at this checkpoint. Existing authorization and backend clinical state machines remain unchanged; no cross-tenant/family-message visibility or clinical release. Production G2/G2b clinical signing/release remains **NO-GO**. Issue stays **OPEN** pending full acceptance.


## 2026-11-17 — WU2 M5-07 coordinator/admin: CURRENT_STATE.md
**Issue:** #190 · **Branch:** `feat/m5-wu2-coordinator-admin-workspace` · **Implementation:** Center appointment summary, selected-view exception table, time-zone context and clearable staff/child filters without changing booking/recurrence APIs.
**Verification:** code and new synthetic Jest regression coverage committed; exact-HEAD CI, independent Codex review, five-width visual screenshots, real keyboard/screen-reader, performance/low-bandwidth, owner UX qualification and manual acceptance **NOT RUN/PENDING** at this checkpoint. Existing authorization and backend clinical state machines remain unchanged; no cross-tenant/family-message visibility or clinical release. Production G2/G2b clinical signing/release remains **NO-GO**. Issue stays **OPEN** pending full acceptance.


## 2026-11-17 — WU2 M5-06 therapist: CURRENT_STATE.md
**Issue:** #189 · **Branch:** `feat/m5-wu2-therapist-workspace` · **Implementation:** Task-focused authorized caseload, scoped name and specialty filtering, session-first child care journey, explicit draft versus signing/release distinction.
**Verification:** code and new synthetic Jest regression coverage committed; exact-HEAD CI, independent Codex review, five-width visual screenshots, real keyboard/screen-reader, performance/low-bandwidth, owner UX qualification and manual acceptance **NOT RUN/PENDING** at this checkpoint. Existing authorization and backend clinical state machines remain unchanged; no cross-tenant/family-message visibility or clinical release. Production G2/G2b clinical signing/release remains **NO-GO**. Issue stays **OPEN** pending full acceptance.


## 2026-11-17 — PR #418 post-merge CI duplication fix — Current state
Combined PR #418 with merged #415/#417 while retaining `commercial-provenance`, `commercial-contracts`, `source-contracts`, original six required jobs and all fail-closed Smart CI, SBOM, secret, database, coverage, browser, Compose and sustained-preview gates. First combined-head run 44122218560 exposed **FAIL** in `source-contracts` source regression: M4-09 and other source-only steps were accidentally duplicated in serial application `test` because merge reconstruction retained setup-node plus subsequent source-only steps. Removed only redundant source-only steps from `test` and preserved the complete checks and numeric source artifacts in independently required `source-contracts`. **Revised exact-head CI and final Codex review PENDING**; no PASS attributed to the corrected commit, no merge until verification. No policy/clinical G2/G2b or rights GO.

## 2026-11-17 — Phase 2B source-contracts follow-up
Additional Phase 2B implementation: moved 12 original source-only M5 IA/route, historic integrity, credential/hosted guard and artifact checks out of the serial application test job into independently **required** `source-contracts` full-mode job, with its own full-history checkout. Its Smart CI required-job map, fail-closed gate and frozen suite inventory were updated. Exact original source check commands and their archived evidence were retained. The main application test keeps locked dependency install, Prisma, migration, coverage and production build. Updated-head CI and Codex **PENDING**, no measured speed claim. 

## 2026-11-17 — CI Phase 2B — isolated Next.js compiler-cache reuse — Implementation checkpoint
Introduced only apps/web/.next/cache persistence through actions/cache@v4 for full test, live-session, demo-journey and flagged m5-child360-browser jobs. Cache keys are per job, OS/arch and lock/source hash; exact-head yarn web build remains in every job with independent build-time flags. No cached runtime bundle, clinical data or browser test outcome. Cross-environment compiled artifact reuse intentionally NOT ENABLED until equivalence is proven; CI, new-head review and timing verification PENDING. All original required gates remain, G2/G2b NO-GO.


## 2026-11-17 — CI Phase 2A — independent commercial contracts — Implementation checkpoint
Extracted 32 standalone commercial offline/adversarial test steps (node --test and one Python unittest) from sequential commercial-provenance into an independent required commercial-contracts job. Retained producer order, all exact-version npm/Sigstore/rights steps and archived evidence. Updated fail-closed smart-ci expectedJobs and smart-ci-gate needs plus frozen suite inventory, with negative-path source tests. Full CI, exact-head Codex, runtime comparison and merge NOT RUN/PENDING. Rule 16 targeted mode locked; no approval for clinical G2/G2b or commercial licensing.


## 2026-11-17 — CI parallel critical-path workstream (single PR, new-head CI PENDING)
Separated 59 original installed-license, npm publisher/Sigstore, COM-02 rights and release evidence verification steps (including their unchanged archived outputs) from sequential `ci/test` into a separately **required** `commercial-provenance` job. Preserved all other test/coverage/build/migration checks, original six required jobs, and the new fail-closed `smart-ci-gate` accounting. Compose now starts after smart-plan independently of test, but is still a required successful full-mode gate. Added lockfile-scoped public Chromium cache in four browser consumers, retaining every `playwright install --with-deps` validation. Existing 10-minute, 512MiB non-root sustained container load unchanged. Shadow-mode / Rule 16 hard-lock remains in place (no targeted skipping, no quality gates relaxed). Implementation and regression tests committed; **new HEAD workflow CI, Codex review and before/after timing measurement PENDING**. No clinical G2/G2b GO, licensing clearance or deploy. Evidence: `docs/qa/CI-PARALLEL-CRITICAL-PATH-2026-11-17.md`.

## 2026-11-17 — M5 WU1 single-PR M5-03/04 consolidated shell and design patterns (#413; Codex P1 FIX)
PR #413 on `feat/m5-wu1-shell-design-consolidation` consolidates M5-03 #186 and M5-04 #187 over existing merged #393 and #395. Implemented session-permission-filtered desktop and mobile destination search, zero-result status, automatic expansion of matching desktop groups, an authorized collapsed-rail workspace switcher shown only when multiple contexts exist, reset of nav search/drawer state on role/center changes, search within mobile dialog keyboard trap, active-only ARIA tab-panel control references, and focus-visible outlines in reusable workspace components. Added source, Jest and synthetic Chromium regression assertions; see `docs/roadmap/M5-WU1-SHELL-DESIGN-CONSOLIDATION.md`. Codex's first review of head `20707161b0` found **P1 Rule 7 omission**: this and the other three handover files had not been updated. This checkpoint explicitly remedies the documentation omission, **not yet qualified** on new HEAD. On original head, SBOM/secret scan/Smart CI plan and focused Web coverage were PASS; main CI still IN PROGRESS at inspection. New-head six required CI checks, independent Codex review and merge **PENDING**. Real screen-reader, private screenshot inspection, family dark/low-bandwidth, revoked center/child/specialty switch and human UX signoff **NOT RUN**. Do not close #186/#187 or assert full WU1 acceptance. Clinical G2/G2b **NO-GO**; no permission widening, real data, Render/Neon changes or clinical activation.

## 2026-11-17 — M5-05 scoped route remount + task-flow verification (NEW PR, CI PENDING)
Implemented route-and-tenant keyed `ClinicalChild` remount to discard prior child state, tab selection, paginated history and in-flight data when changing child or center. Scope key derives from authenticated active center context and route child ID, not user-visible text; existing server authorization remains the source of truth. Extended the flagged synthetic Chromium suite with three representative task flows (Overview → Care → Assessments, Overview → Sessions, Overview → Documents) at five widths and three clinical roles: expected **45 task-flow assertions**, with at most two navigation decisions. Evidence exists as code only; **exact-head CI and independent review PENDING**, not human UX signoff. Feature flag OFF by default, clinical G2/G2b NO-GO. M5-05 #188 remains OPEN.

## 2026-11-17 — M5-05 R2 slow/error/recovery browser check (PR #406, CI PENDING)
The existing isolated synthetic CI Child 360 browser harness now intercepts only scoped GET workspace calls to verify a pending-loading skeleton (no clinical tabs), simulated HTTP 503 (explicit error with no tab panels), and user-activated Retry (five restored authorized tabs). Three synthetic authorized personas × five widths = 15 slow-loading and 15 failed-and-retried observations. Existing coordinator denied access, role-specialty scoping, five-tab keyboard navigation and clinical controls are unchanged. Synthetic fixture only; no clinical writes, patient data, tokens or screenshots are archived. Code and negative receipt tests committed to draft PR #406, but **full exact-head CI and independent reviewer qualification NOT RUN/PENDING at time of this checkpoint**. Default `NEXT_PUBLIC_M5_CHILD_COMPACT` OFF, clinical G2/G2b NO-GO; M5-05 #188 remains OPEN for human review and broader acceptance.

## 2026-11-16 — M5-05 task-first compact Child 360 Overview (PR #403, QUALIFICATION IN PROGRESS)
Implemented the optional `compact` mode in `Child360`, selected **only** by `NEXT_PUBLIC_M5_CHILD_COMPACT=true` in the already feature-gated Child 360 route. Action cards, journey, specialty-scoped permissions and original non-compact UI are preserved. Authorized care team, goals/appointments/session evidence, non-clinical therapist-only family feedback and clinical history remain present behind native keyboard-accessible disclosure sections with summary labels; they start collapsed but are not removed or reclassified as clinical approvals. The current dedicated synthetic CI browser suite exercises disclosure Enter expand/collapse at 320/390/768/1024/1440 with speech therapist, OT therapist and supervisor.
Codex exact-head `fc2c3ff40e` P1 requested this Rule 7 checkpoint (FIX_NOW). On that previous head, `m5-child360-browser` and `live-session` had passed, while full suite/container remained in progress. **The documentation-updated HEAD has NOT yet completed exact-head CI or final-head review**; none of the previous head's evidence qualifies it. Human screen-reader, visual screenshot, low bandwidth, error/blocked-state UX and clinical task usability signoff remain NOT RUN/NOT OBTAINED. Feature flag remains **OFF by default**; G2/G2b **NO-GO** and synthetic-only/role-specialty scoping remain binding. M5-05 issue #188 stays OPEN.

## 2026-11-16 — Node 24 LTS + NestJS 12 runtime work unit (DRAFT PR, NOT QUALIFIED)
Node 20 has been end-of-life since 2026-04-30. ADR-0001 Amendment 1 (proposed; owner sign-off at merge) moves the runtime to **Node 24 LTS** (`.nvmrc` 24, `engines >=24.9 <25`, `node:24-bookworm-slim` in all three images, CI via `.nvmrc`). Node 22 was rejected (maintenance-only, EOL 2027-04-30; NestJS 12's documented Jest support for its ESM-only packages needs Node >=24.9); Node 26 deferred. API: all `@nestjs/*` 12.5.0 / CLI + schematics 12.0.13 (Fastify stays 5.12.8), TypeScript 6.0.3 (required by `@nestjs/schematics` 12; unused `baseUrl` removed), Jest 30.5 / `@types/jest` 30, `@types/node` 24. App code stays CommonJS and loads Nest 12's ESM packages via `require(esm)` (verified: `nest build` output loads). The #311 `light-my-request` 6.6.0 dedupe is removed (fresh 6.8.x / `cookie@2`, Node 22+ only, now fine). Web Jest config drops the explicit TS-6-deprecated `moduleResolution: 'Node'`. COM-02 lock tooling now understands Yarn `npm:` aliases (Jest 30 installs `react-is@18.3.1` as `@jest/react-is-18`), so they reconcile to the real package instead of `NO_LOCK_MATCH`. COM-02 re-baselined, nothing approved: population 46 → 44; DefinitelyTyped 25 → 21; three new signed out-of-scope dev/CI packages (`@pkgr/core`, two `@unrs/resolver-binding-*`) accounted for and UNRESOLVED; root observations 9 bound / 6 retired (`emoji-regex@9.2.2` bound again, `esrecurse`/`glob-to-regexp`/`punycode` retired); curated licence paths updated accordingly. Advisories unchanged at 3 (dev tooling). Exact-head CI and Codex review PENDING.

---

## 2026-11-16 — COM-02 non-DT workqueue successor to #397 after merged #394 (UNQUALIFIED)
The Next.js 16/React 19 PR #394 merged during qualification of #397, changing the exact COM-02 ledger population to 46 = 25 DefinitelyTyped + 21 other npm versions; the 53/26/27 and 47/26/21 snapshots are historical, not current. Recreated the workqueue script, adversarial tests, same-run CI generation and archived evidence on a clean Next 16 main-based successor branch, without overwriting dependency or M5 work. PR #397's prior CI showed both new steps PASS and Codex P1 Rule 7 correction, but that head predates #394 and does not qualify the successor. Successor exact-head CI, signed archive receipt and fresh Codex NOT RUN/PENDING. No independent publisher-to-source proof, 91 asset permissions, real SaaS/Enterprise delivery proof, counsel release, or G2/G2b GO.

## 2026-11-16 — #394 Codex P2 fixed: sharp/libvips removed from every image layer
Codex (review of `6a6da78`, P2) correctly found that the previous separate `RUN` only hid `sharp`/`@img` from the merged filesystem: the binaries stayed recoverable from the committed `yarn install` layer, and Yarn's package cache was not cleaned. Both Dockerfiles now install, delete `node_modules/sharp` and `node_modules/@img`, run `yarn cache clean`, and verify `/repo` plus the Yarn cache are free of them **in one `RUN` instruction (one layer)**. CI additionally scans every layer of the built preview image and the compose web image (`scripts/preview/check-image-no-sharp.sh`, via `docker save`) and fails on any `node_modules/sharp|@img` path or `libvips*.so`. The earlier claim "never shipped" is only true from this fix onward.

---

## 2026-11-15 — Next image optimizer disabled; `sharp`/libvips removed from release images (#394)
TheraBridge never imports `next/image`, so Next's optional `sharp` (LGPL-3.0-or-later `@img/sharp-libvips-*` binaries) was installed and shipped but never executed. `next.config.mjs` now sets `images: { unoptimized: true }` (the `/_next/image` endpoint returns 404), and both runtime images (`Dockerfile.preview`, `apps/web/Dockerfile`) delete every `node_modules/sharp` and `node_modules/@img` after `yarn install` and before the web build, failing the build if any remain. A contract test fails if `next/image` is imported, the flag is removed, or either Dockerfile loses the fail-closed strip. The packages remain in `yarn.lock` and the CI install, so COM-02 still tracks them as UNRESOLVED development/CI dependencies; the counsel question narrows from distribution to dev-tool use. Re-enabling image optimization requires a new owner/counsel decision.

---

## 2026-11-15 — Next.js 16.4.6 + React 19.3 web upgrade (DRAFT PR, NOT QUALIFIED)
Follows merged #311. Next.js 15 left Maintenance LTS on 2026-10-21, so the web app moves to Next 16.4.6 (Active LTS) on the unchanged Node 20 runtime (Next 16 needs >=20.9). The app's own `react`/`react-dom` are now 19.3.1 (+ `@types/react(-dom)` 19.3.0, `react-test-renderer` 19.3.1), so unit tests run the same React major as the App Router's bundled 19.3 canary — the mismatch that hid the #311 SessionEditor bug. Code: `src/middleware.ts` → `src/proxy.ts` (`proxy` export, same matcher, still a convenience redirect only — the API makes every authorization decision); one React 19 `useRef` typing fix; `tsconfig` `jsx: react-jsx` + `.next/dev/types` include (the values Next 16 enforces). Builds use Turbopack (default) with no webpack config. npm advisory bulk check: 7 → 3 (the high `postcss@8.4.31` pinned inside Next 15 is gone; remaining `glob`/`minimatch` via `@nestjs/cli`, `deepmerge`). COM-02 re-baselined, nothing approved: population 47 → 46; DefinitelyTyped 26 → 25 (`@types/react`/`react-dom` 19.3.0, `@types/prop-types` dropped) now pinned once as `DEFINITELYTYPED_VERSIONS` (schema ids containing `-26-` are kept as stable identifiers); Next.js chain pins 16.4.6 / `refs/tags/v16.4.6`; `@next/env` source recipe now `build:source`. NestJS stays on 11 (Nest 12 needs Node 22). Exact-head CI and Codex review PENDING.

---

## 2026-11-15 — M5-03 Codex P2 remediation (UNQUALIFIED new HEAD)
First M5-03 grouped shell PR #393 correctly built after native <details> type fix; new independent Codex review identified responsive More drawer stale-open/focus and background-scroll risks. Added desktop breakpoint close + visible rail focus, scoped body/root overflow lock with cleanup restoration and overscroll containment; seven-role Chromium resizing and scroll state negative-tested. All CI and new exact-head Codex required again; #186 OPEN, G2/G2b NO-GO.

---

## 2026-11-15 — M5-03 eight-area grouped ProductShell (IN PR, NOT QUALIFIED)
M5-01 #184 and M5-02 #185 are CLOSED in GitHub; merged M5-02 #387 provides eight-area source proposal. M5-03 #186 first executable shell tranche adds exactly eight permission-filtered desktop task areas, optional compact icon rail, authorized breadcrumb, mobile three-link quickbar and complete More dialog with keyboard focus return; original mobile dropdown retained for compatibility. New CI source-crosswalk check and seven synthetic-role actual session permission/More/rail test. No API role changes, no persistent stale context, G2/G2b NO-GO. Final-head CI/Codex and manual UX acceptance pending; #186 OPEN.

---

## 2026-11-15 — PR #311 merged with latest `main` (#383–#387) and closure ledger re-baselined
`main` added the COM-02 exhaustive closure ledger (#384) and DefinitelyTyped publisher fingerprints (#386), both pinned to the old 53-version population. Merged and re-baselined to the exact 47-version set using the shared pins: 26 DefinitelyTyped (unchanged), 11 root-manifest, 7 missing-revision (incl. Next.js 15.5.29, which has signed provenance but no registry gitHead), 2 subpath-published LGPL `@img/sharp-libvips-*` (root manifest 404 accepted for those exact ids only), 1 legacy repository. 91 assets and every BLOCKED/UNRESOLVED/NO-GO conclusion unchanged. Previous #311 head `79e106c` was green on all six required jobs + sbom + Smart CI gate; new merge head requalification PENDING.

---

## 2026-11-15 — PR #311 Dependabot security bump made coherent (REQUALIFICATION PENDING)
Dependabot's grouped security PR mixed majors (`@nestjs/core`/`platform-fastify` 12 with `@nestjs/common` 10, Next 16) and resolved `cookie@2.0.2` (Node >=22) through `light-my-request@6.8.x`, so every install-based CI job failed on the approved Node 20 runtime. Replaced it with one coherent upgrade inside the approved stack (ADR-0001 unchanged): all `@nestjs/*` 11.x (core/common/platform-fastify/testing 11.2.10, cli 11.0.24, schematics 11.1.0) bringing Fastify 5.12.8, find-my-way 9.10.x, @fastify/middie 9.3.x; Next 15.5.29 (React 18 kept); Playwright 1.55.1 (workflow images aligned). Lockfile dedupes `light-my-request` to 6.6.0 (the version `@nestjs/platform-fastify` pins) and `@types/estree` to 1.0.9, keeping every installed package Node-20 compatible. Code changes: Next 15 async `cookies()` in the root redirect (+ its unit test), Nest 11 `wrapper.metatype` null-narrowing in the route-access verifier (deny-by-default unchanged). npm advisory bulk check: 63 findings on main → 7 (all pre-existing transitive: `postcss@8.4.31` pinned inside Next, `glob`/`minimatch` via `@nestjs/cli`, `deepmerge`).
COM-02 evidence re-baselined, never approved: exact unresolved population 53 → 47; Next.js signed-source chain now pinned once in `scripts/commercial/com02-nextjs-pins.mjs` (v15.5.29, `refs/tags/v15.5.29`); two newly signed **LGPL-3.0-or-later** `@img/sharp-libvips-*@1.3.4` binaries (Next's optional `sharp`) must be verified and accounted for but stay UNRESOLVED outside the Next.js chain; four 2026-11-15 root observations (consola 2.15.3, emoji-regex 9.2.2, tmp 0.0.33, tr46 0.0.3) are RETIRED (absent from lock; reappearance fails closed); two curated licence-path rows for removed versions dropped; direct-evidence ranges updated. No licence, SaaS/enterprise, commercial or G2/G2b clinical decision changed. Exact-head six-job CI and independent Codex review PENDING.

---

## 2026-11-15 — M5-02 canonical task IA proposal IN PR (not qualified)
A design-only, source-derived eight-area navigation taxonomy maps all 66 features, 91 workflows and 20 current permission-conditioned NAV entries with seven role review candidates. No UI refactor, real permission grant, clinical/UX approval or authorized route added. Feature #39 and WF-X6 remain V2 excluded. Exact-head CI/Codex required. #185 remains OPEN; G2/G2b NO-GO.

---

## 2026-11-15 — M5-01 keyboard and machine timing tranche (IN PR, NOT QUALIFIED)
Merged prior source #380 and 175-viewport browser #381 baselines; this new independent PR adds route settling times, seven safe synthetic keyboard journeys (desktop Enter Home, mobile select focus/Shift+Tab, Enter sign-out), strict no-secret receipt and negative tests. No full-task measurements, human visual review, screen-reader approval or clinical gate changes. Full CI/Codex pending. #184 stays OPEN, G2/G2b NO-GO.

---

## 2026-11-15 — M5-01 browser observer Codex P2 remediations (REQUALIFICATION PENDING)
Codex first-head review found two P2 accuracy defects: pre-hydration skeleton capture and HTTP-200 masking asynchronous client errors. Observer now uses bounded two-stage visible-loading settlement, explicit client error/permission denial and LOAD_TIMEOUT classifications. Unit regressions cover those failure modes. Full CI and final-head independent review pending; #184 remains OPEN and browser output is NOT human UX PASS. No G2/G2b changes.

---

## 2026-11-15 — M5-01 isolated synthetic browser observations (IN PR, NOT QUALIFIED)
After merged source-only #380, this PR adds a loopback disposable Chromium observer for seven role personas × five widths × five route entries. Screenshots are transient and erased; only numeric/enum observations and hashes are archived. New script tests and CI/reviewer qualifications PENDING. No human visual, screen-reader, full-task timing, private screenshot review or owner approval; #184 OPEN, G2/G2b NO-GO.

---

## 2026-11-15 — M5-01 Codex P2 NAV parser correction (NEW HEAD UNQUALIFIED)
First CI source-audit step PASS at reviewed-old HEAD 838d0daa; artifact measured 41 canonical pages, 20 NAV entries, 175 NOT_RUN targets; zero screenshots or owner/clinical approvals. Codex P2 on that SHA identified silent omission of NAV spreads and double-quoted permission parsing. Replaced the parser with literal-only complete-consumption logic and adversarial tests rejecting unsupported entries/expressions, accepting exact double-quoted permissions. **New head full CI and fresh independent Codex review PENDING**; PR #380 remains OPEN, #184 OPEN, G2/G2b NO-GO.

---

## 2026-11-15 — M5-01 initial source UI audit (OPEN PR; NOT QUALIFIED)
Source inventory of Next pages and permission-filtered ProductShell NAV, plus a planned seven-persona × five-viewport × five-entry capture matrix. Added fail-closed duplicate/orphan-route checks and no-secret source metrics. CI and independent Codex review pending; **zero browser screenshots, zero usability measurements, zero accessibility approvals**. Never call SOURCE_INDEXED_ONLY an observed UX result. Details: docs/roadmap/M5-01-UI-SOURCE-BASELINE.md; #184 remains OPEN, G2/G2b NO-GO.

---

## 2026-11-15 — M4-CLOSE-02 protected Render SHA attestation (IN PR, NOT QUALIFIED)
PR adds read-only Render service identity and latest-LIVE deployment API checks *before* protected ten-account credentials. Current shared demo old SHA 3cdd722... differs from main. Render workspace has no disposable TheraBridge test service or Postgres instance; no infrastructure changed. Secret TB_HOSTED_RENDER_READONLY_API_KEY is required but NOT VERIFIED configured. Guard tests and full CI NOT RUN on new HEAD; protected two-valid-tenant acceptance remains NOT RUN and #176/#268 OPEN. Details: docs/roadmap/M4-CLOSE-02-PROTECTED-EXECUTION-READINESS.md. G2/G2b NO-GO.

---

## 2026-11-15 — M4-CLOSE-02 isolated two-valid-tenant qualification (IN PR; NOT HOSTED-ACCEPTED)
Existing Render demo remains live on old deployment SHA 3cdd7226236a... (Nov 8); no deployment or shared DB mutation authorized. Test-only PR adds guarded real-PostgreSQL two-valid-centre access, cross-tenant denial, therapist revocation, expired-session tests and a fail-closed 8-check structured protected-hosted receipt validator. All new test/CI results PENDING. The previous protected 10-account run 42605446171 yielded 84 PASS / 0 FAIL / 14 BLOCKED, not current-HEAD or two-hosted-tenant sign-off. #176/#268 and G2/G2b remain OPEN/NO-GO. See docs/roadmap/M4-CLOSE-02-HOSTED-ACCEPTANCE.md.

---

## 2026-11-15 — M4-CLOSE-01 evidence reconciliation (IN PR; unqualified)
Seven of nine M4 parent issues closed (#175/#177–#182); #176 hosted acceptance and #183 historical audit remain open. Follow-ups #266 (212-row/1,023-step evidence), #268 (two-valid-tenant protected QA), #279 (historic feature-branch force-ref audit) remain OPEN. PR #358 merged 90% four-metric API/Web qualification (CI 43692201180; merge 800e5c27). New PR adds read-only ancestor checks for #274/#275/#276 plus non-force process runbook; **new PR CI and Codex NOT RUN/PENDING**; zero new acceptance/clinical approval. Canonical receipt: docs/roadmap/M4-CLOSE-01-EVIDENCE-RECONCILIATION.md. G2/G2b NO-GO.

---

## 2026-11-11 — COM-02 #361 release scope comparator (IMPLEMENTED, CI PENDING)
After #359 merged with full CI and clean Codex, opened one grouped #361 release-image and source publication attestation followup. Implemented conservative exact asset SHA-256-to-pinned OCI image file candidate comparison, preserving all 53 package and 91 asset exception rows, no uploaded/signed release images yet. The checked-in image evidence manifest is empty; no shipping status is independently attested. No source-to-publisher attestation, customer license approval, final THIRD_PARTY_NOTICES or clinical G2/G2b gate changes. Added regression tests/CI artifact; exact-head full CI and independent review NOT YET QUALIFIED.

---

## 2026-11-11 — COM-02 #359 final upstream outage-boundary clarification
All upstream HTTP failures (including 404) in prior pinned-source corroboration preserve the package's unresolved queue row without automatically treating it as verified LICENSE text; actual contradicted source identity, altered Git SHA, wrong repository or lock integrity remain hard failures. A 404 negative regression was added. **Final exact-head full CI and clean Codex review pending**.

---

## 2026-11-11 — COM-02 mega PR #359 measured 53/91 bulk evidence (FINAL CI PENDING)
Initial CI artifact verified 53/53 package exceptions and 91/91 tracked assets; 8 curated exact Git source versions yielded 9/9 SHA-256 immutable LICENSE/NOTICE **text candidates**. Provenance triage: 15 pinned source-root package name/version matches, 26 DefinitelyTyped lacking GitHead, 7 other missing revisions, 3 Next.js monorepo mismatches and 2 legacy unsafe repository claims. Every package remains independently un-attested; all legal approval, final notices, commercial grants 0. The 91 tracked assets split 73 image/icon, 15 brand and 3 container-build paths, all with production release presence **NOT VERIFIED**. Codex P2 transient timeout failure fixed by preserving row and skipping source fetch rather than losing whole audit; CI and review of final documentation HEAD PENDING. G2/G2b NO-GO.

---

## 2026-11-11 — COM-02 mega PR #359 bulk evidence checkpoint (CODE COMMITTED / CI PENDING)
Consolidated 53 npm exact-version publisher exceptions and 91 tracked assets into one counsel-facing fail-closed evidence generator. Eight immutable exact package-version source commit entries with nine candidate LICENSE/NOTICE paths are guarded against forged registry SHA, source Git commit or host and fetch only bounded UTF-8 source bytes; no raw third-party legal texts committed. Source-root candidate matching remains NOT independent release provenance, 0 authoritative legal interpretations/approvals, 0 commercial license grants or final notices. All source assets have production release presence UNKNOWN and SaaS/enterprise rights pending; semantic-PAX remains unresolved. Clinical G2/G2b NO-GO. New HEAD CI, Codex and merge NOT YET QUALIFIED.

---

## 2026-11-11 — COM-02 #357 measured source-root candidate evidence
Code checkpoint `8c645d0feb79ddd7fc8cea24425aa6c722e2631b` — GitHub Actions full-CI run [42923019170](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42923019170): new corroboration tests **7 PASS / 0 FAIL**, source candidate generation PASS. Recorded exact-version `53` exceptions, `15` registry gitHead+immutable source-root manifest name/version matches, **53 still independently un-attested**, `0` authoritative upstream LICENSE texts verified, `0` legal approvals. Six-job full CI was **still underway when this note was committed**; any later documentation HEAD requires fresh CI and independent review. The 91 non-package assets, PAX review and G2/G2b NO-GO remain open.

---

## 2026-11-11 — COM-02 #357 source-correspondence candidate collection (CODE COMMITTED / TESTS PENDING)
Added exact registry gitHead candidate field and bounded immutable GitHub source root `package.json` identity matching with SHA-256, without authorizing package-to-Git source correspondence or legal rights. CI produces a 53-version evidence candidate register, retains unmatched/invalid records, and preserves 91 separately tracked assets. No independently attested source-version mappings, no authoritative upstream text/source approvals, no final notices or G2/G2b clinical release. Actual new-head test, six required jobs and independent Codex review PENDING.

---

## 2026-11-11 — M4-08 Stage 3 PR #353 achieves genuine ≥90% Web line coverage (merge qualification PENDING)
Stage 2 PR #345 merged into main as `60a419a9b1b5e45c2125a0a8c2f908874b8e02d3`; Stage 3 draft PR #353 expands source-mounted child/guardian, admin invitations, session optimistic reconciliation, family practice, internal plans/report/governance, sign-in/recovery, calendar, timezone/DST and synthetic source-integrity/human-review barriers. **Verified** focused run [#42913539171](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42913539171) on code HEAD `96941265146be1803a32d96c7d1124f57e207cb4`: 88/88 Jest suites, 832/832 Web tests PASS, 154/154 instrumented production modules, 9 modules with no executed statements, 90.13% lines / 81.04% branches / 79.24% functions / 86.62% statements. All source files remain in denominator; the ≥90% Web **line** milestone is achieved, while four-metric ≥95% Web/API and ≥95% safety-critical branches remain NOT QUALIFIED. Full six-job exact-head CI and independent Codex review are PENDING. Initial full-CI scan found one generic-api-key detection limited to a deterministic synthetic mismatched-password input fixture in test history; a tightly scoped single-rule, exact-path, exact-value synthetic mismatched-password exception in `.gitleaks.toml` has been proposed, and its full-history CI rerun is PENDING. No blanket secret-scan disabled. G2/G2b clinical/AI release and commercial legal approvals NO-GO.

---

## 2026-11-11 — COM-02 #355 Codex P2 and unrelated all-ref secret scan (REQUALIFICATION PENDING)
Codex review found the HTTPS license-text downloader's inactivity-only timeout could be bypassed by trickle-stream responses; fixed with absolute bounded request deadline, cleanup on settlement and no-drain rejects, with deterministic Node regression tests. A full CI run on earlier HEAD detected `generic-api-key` in the explicitly fictional M4-08 Web password reset test in a separate branch because Gitleaks scans `--all` Git history. Applied a narrow combined exact-file/exact synthetic-literal allowlist in `.gitleaks.toml`, without bypassing other secrets. Latest implementation HEAD exact CI and reviewer pending; no commercial legal approval, verified source mapping, final notices or G2/G2b clinical activation.

---

## 2026-11-11 — COM-02 #355 immutable source text verifier (IMPLEMENTED / CI NOT RUN)
Added strict full-commit-pinned upstream LICENSE/NOTICE SHA-256 verifier, with a deliberately empty correspondence map and evidence-only CI artifact. No repository source-to-npm-version correspondence is independently verified, so all 53 candidate package versions are unresolved; no upstream text, commercial approval, final notices, production clinical approval or G2/G2b activation. Security negative tests added; exact-head full CI and independent review pending.

---

## 2026-11-11 — COM-02 #352 measured candidate collection (code HEAD PASSED; doc-only HEAD pending)
**Verified on code HEAD `e0ee645ced29bbe2d603c125e013646a343c1a02`:** full CI run [42908445420](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42908445420) SUCCESS, six new exact-version registry metadata adversarial tests PASS, **53/53 exact-version registry metadata responses**, 0 missing/invalid candidate manifests, 0 authoritative upstream LICENSE-text proofs, 0 legally approved packages. SBOM, gitleaks, live-session, demo-journey, Compose, 10-minute preview and Smart CI all green on code head. Codex earlier P1 incorrect test digest linkage fixed; later P2 correctly requires updating Rule 7 files with this evidence. This documentation update creates a NEW HEAD requiring its own exact-head CI/Codex review before merge. 91 tracked assets, upstream copyrights, SaaS and enterprise distribution rights still OPEN; public repository unchanged and G2/G2b NO-GO.

---

## 2026-11-11 — COM-02 PR #352 registry authority candidate collector (IMPLEMENTED; CI/REVIEW PENDING)
Added bounded `collect-upstream-license-candidates.mjs` and negative-path tests for exact npm registry name/version metadata, SHA-256 manifest bytes, and per-version failure states. Every unresolved exception remains in output even when registry evidence is missing; no registry manifest field substitutes for authoritative exact-version source LICENSE text or legal permission. CI artifact generation is wired, **not yet verified** on implementation SHA. 53 package-version exceptions and 91 non-package assets remain review scope from merged #350. Legal approvals 0; SaaS vs enterprise redistribution and clinical G2/G2b NO-GO unchanged.

---

## 2026-11-10 — COM-02 PR #350 exact-version rights evidence (IMPLEMENTED; final new-head qualification pending)
Added reproducible `therabridge-com02-exact-version-rights-queue-v1` generator plus CI evidence artifact to reconcile pinned publisher tarball evidence against independent installed package physical-copy inventory. It refuses missing or phantom name/version coverage, duplicates, fabricated approvals and inconsistent published/installed license-file claims. Earlier application CI run [42901575999](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42901575999) PASSED on code HEAD `0cf822ace6195d43b281e0a056fcc85d64f5b7d6` including application tests, SBOM, secrets, Compose, live-session, demo, 10-minute synthetic preview and Smart CI. Generated counts: 42 direct + 621 non-direct versions examined; 52 no recognized publisher-root LICENSE/NOTICE, 1 unresolved PAX archive; 91 tracked non-package assets; 0 legal approvals. Codex P2 independent inventory coverage fixed; later Codex P1 required updating all four Rule 7 evidence files, now being addressed. This documentation change creates a NEW HEAD requiring fresh exact-head CI and independent review; not merge-qualified yet. Copyright/rightsholder ownership, upstream license terms and SaaS/enterprise distribution still need qualified approval. Public repo, unsigned commercial contracts and clinical G2/G2b NO-GO unchanged.

---

## 2026-11-10 — COM-02 complete installed non-direct publisher classification (review pending)
Prepared full-CI exact name/version verification for all observed 620 non-direct installed-version rows, with cap 768, distinct physical copy tracking and pinned SWC Linux 14.2.33 48/256-MiB archive exceptions. Other packages keep 16/64-MiB limits; integrity, per-copy LICENSE/NOTICE matches and zero legal approvals fail closed. Independent CI/review pending; clinical G2/G2b NO-GO unchanged.

---

## 2026-11-10 — M4-08 Stage 2 #345 measured ≥80% Web line target MET; merge qualification PENDING

- **Exact code SHA `8af17a710793ea40b5c92350ad600ffb3bf982f9`**, focused full-source instrumented Istanbul [run #42905581705](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42905581705): **PASS 67/67 suites, 604/604 tests**, full **154/154 production Web source modules**, 15 files with zero executed statements. **Lines 80.28%, branches 69.14%, functions 65.09%, statements 75.86%.** The owner-directed ≥80% genuine Web **line** Stage 2 target is MET by **0.28 percentage points**, **not** a ≥95% critical-branch qualification, clinical acceptance, legal approval, or a full CI/merge PASS.
- Source-executing mounted regressions added across plan versions, editing, report optimistic autosave and handoff lease, supervisor review queue, scheduling/calendar, recurrence and conflicts, therapist assignment and revocation, guardian requests, actual message inbox/recipient isolation, home-practice idempotency and timeout recovery, platform trial administration, synthetic grant recovery, account-security rotation/global sign-out, application review decisions, center settings, self-profile, activity library, simulated multilingual dictation and accessible scroll-strip interactions. Transport mocked; production component logic executes. All sources including uncovered files remain in denominator. Fail-closed source audit and sanitized per-file hotspots retained; no denominator tricks.
- Latest branch at this checkpoint remains **DRAFT** until original full exact-head CI, Smart CI, SBOM/gitleaks, seven-role synthetic acceptance, container/Compose, independent exact-head Codex, P0/P1/P2 disposition and branch/main reconciliation meet repository requirements. The separate ≥95% security-critical branch qualification and 15 zero-statement modules remain documented work; no claim of general 95% coverage. G2/G2b clinical NO-GO unchanged.
- Stage 3 owner-required ≥90% full-Web line coverage tracked at #348; execute after Stage 2 merged. No stage merge if any required gate red or no independent review.

---

## 2026-11-10 — M4-08 Stage 2 #345 source-verified checkpoint: 74.95% Web lines (NOT QUALIFIED)
- **Code SHA `dc5e54906fad12a80be6935524d18efa64880d7d`**, focused original full-Web Istanbul [run #42902267598](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42902267598): **PASS 55/55 Jest suites, 499/499 tests**, 154/154 production source modules with 15 zero-statement modules. **Lines 74.95%, branches 62.38%, functions 57.23%, statements 69.87%.** This is focused coverage, not all original CI checks or final-head Codex, and ≥80% Stage 2 is **NOT MET** (gap **5.05 percentage points**).
- Added actual mounted production-source regressions across appointment status, cancellation and recurrence, booking assignment/series collision and timezone, therapist handover readiness fail-closed, guardian home-plan request, fixed-choice home practice exact-key uncertainty, platform trial bounds, application detail session/decision controls, team directory/invitations, schedule route and responsive ScrollStrip, synthetic existing grant withdrawal/revocation. Tests use synthetic backend I/O; no real clinical data, signing, release or permission grant.
- Corrected failing initial test fixtures/assertions using exact CI evidence; **the PASS above is the authoritative measured run**, not prior red heads. CI additionally emits sanitized ordered uncovered file/line/branch hotspots for genuine quality-first work, without exclusions.
- **Next**: develop one cohesive additional domain batch on #345 against ranked uncovered real source (PlanEditor, ReportEditor, SessionEditor, Messages, PlanVersionHistory, current routes); reach ≥80% genuine full-source Web lines, maintain separate ≥95% safety-critical branch goal. Then exact-final-HEAD full original CI, Smart CI, SBOM/gitleaks, seven-role synthetic browser, container/Compose and Codex review; resolve P0–P2 and reconcile current main before merge. **M4-02 hosted ten-account QA, historical audit M4-09, COM-02 legal clearance and G2/G2b clinical NO-GO are independent.** Stage 3 ≥90% owner target tracked #348 after Stage 2 merges.

---

## 2026-11-10 — M4-08 Stage 2 #345 high-risk PlanEditor test batch (focused VERIFIED; full CI PENDING)
Exact commit `765ae0347a87f6ce1b0beddacd95eae96871d593`: focused Web CI [#42897868594](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42897868594) **PASS 45/45 Jest suites, 414/414 tests**. Full source audited 154/154 Web production modules (17 zero-statement modules); **69.15% lines, 57.39% branches, 50.71% functions, 63.89% statements**. Stage 2 >=80% lines remains **NOT MET**, gap **10.85 percentage points**; this measurement is NOT comprehensive final-head full CI, independent Codex review, 95% security-critical branch qualification, clinical or commercial approval. Source-verified earlier Stage 2 fix prevents stale report-history rows after child/center switch. Seven mounted PlanEditor tests added for source-scoped activity search pagination, network retry, unsaved/other-version edits, saved draft review, returned/withdrawn version state, new draft version. The first focused run failed three new test-harness expectations; repaired mock resets/async flushing/double component-node matching; the passing run is authoritative. Next: prioritize uncovered high-line-count real Web components and browser-mounted interactions; preserve full denominator, original CI, Smart CI, SBOM/gitleaks, review and Rule 7. Stage 3 >=90% target tracked in #348 only after #345 >=80% is merged. Clinical G2/G2b NO-GO unchanged.

---

## 2026-11-10 — M4-08 Stage 2 #345 (DRAFT, NOT QUALIFIED)
Stage 1 PR #339 merged as `77cbf7c0b95e69b53686fceabfb49c7af986476e`, closing #337 on real 60.08% source-wide Web lines. Separate Stage 2 PR #345 implements #338 toward >=80%. Latest **verified focused** run #42887887583 at `684565cb64c7cbcfa07266f14893a0591fcfb426` PASSED **45/45 suites, 402/402 tests**, with genuine full-scope 154/154 Web files: **lines 68.59%, branches 56.54%, functions 49.89%, statements 63.15%**, 17 zero-statement-coverage modules. Remaining to 80% lines: **11.41 points**. Stage 2 remains OPEN/DRAFT; full original exact-head CI and Codex independent review not yet qualified. Production session-controller stale-tenant summary fetch was prevented before authorization-dependent lookup; synthetic invitation and guardian/report/clinical controls gained mounted negative tests. Clinical G2/G2b NO-GO and family release restrictions unchanged.

---

## 2026-11-10 Stage 1 M4-08 source-wide Web line target MET, but PR #339 UNMERGED. Focused CI run 42873722265 PASS on ed3a750946f5a2f1ec38355daa5cb64aabc11b33: 154 source files; lines 60.08%, branches 48.75%, functions 40.33%, statements 54.24%, 18 zero-statement modules. All-source instrumentation unchanged. Does NOT constitute the security-critical 95% branch goal, M4 final acceptance, a full-CI green head or Codex review. Clinical G2/G2b NO-GO persists; no family clinical release, no real data.

---

## 2026-11-10 — M4-08 PR #339 staged Web coverage measured checkpoint (NOT QUALIFIED)
Confirmed focused Jest/Istanbul run #42867251775 on commit 2d3839b8: Web full-source 151 modules, **51.61% lines, 39.18% branches, 31.28% functions, 45.34% statements**, 25 modules with zero executed statements. Stage 1 owner-approved 60% line target still SHORT by 8.39 percentage points; Stage 2 80% not started. New mounted React test renderer (pinned 18.3.1) executes real report-to-plan idempotent retry, clinician checkpoint selection, guardian reminder rollback, clinician scoped feedback and report autosave revision/error paths. Supplementary focused Web test green, not full M4 acceptance or clinical approval; exact final head CI/Codex remain pending. G2/G2b NO-GO preserved.

---

## 2026-11-10 — M4-08 Stage 1 Web mega-coverage PR #339 (IN PROGRESS, NOT QUALIFIED)
Owner approved replacing the blanket 95% Web coverage acceptance with staged **≥60% then ≥80% all-source Web line** gates (#337 then #338). Safety-critical Web auth/session/CSRF/access/release control has a separate ≥95% **branch** target; API, 100% defined critical journeys and all clinical NO-GO controls remain unchanged. The existing 151-file/full-production-source Istanbul denominator and all four measured metrics remain mandatory. PR #339 adds executable Jest regressions for versioned evidence, saved-plan projections, strict clinical/administrative/report transport paths and no-release boundaries. Tests are AUTHORED; exact-head CI, actual new coverage delta, final-head Codex, and Stage 1 ≥60% qualification PENDING. This is NOT a deployment, clinical authorization, release or 60%-coverage claim. Stage 2 #338 remains BLOCKED until Stage 1 measures ≥60% and merges.
## 2026-11-10 — COM-02 transitive publisher verification wave + pinned Next.js exception (in review)
Added first 160 bounded exact installed non-direct name/version publisher tarball checks with SRI and installed license SHA256 comparisons, plus a fixed-version Next.js 14.2.35 48-MiB compressed/256-MiB expanded exception. No other version gains higher bounds. Full CI artifact, security tests and Codex qualification pending. Approval 0; legal/SaaS/enterprise and clinical gates remain closed.

---

## 2026-11-10 — COM-02 full direct publisher verification and rights inventory (qualification pending)
A consolidated audit change extends bounded concurrent exact-tarball/SRI downloads across installed direct names/versions, performs publisher-to-installed LICENSE/NOTICE hash comparisons, and produces a transitive + tracked-asset legal-review queue. No published license or distribution legally approved; technical CI/Codex pending.

---

## 2026-11-10 — COM-02 bounded exact npm publisher tarball evidence (PR qualification pending)
Created authenticated HTTPS npm-registry-only tarball verifier with exact Yarn SRI check and top-level LICENSE/NOTICE digest inventory. Bounded sample (8 packages) and explicit unresolved statuses; no text or tarballs published. Unit and negative fixtures authored, CI and Codex still pending. NOT legal approval or full package coverage; public repo and G2/G2b NO-GO retained.

---

## 2026-11-10 — COM-02 lockfile-to-installed evidence reconciliation (in review)
Added an offline evidence join from installed LICENSE/NOTICE queue to exact Yarn v1 name/version/declared integrity and resolved-source hashes. Missing/ambiguous packages stay UNRESOLVED. No published tarball bytes or legal license texts verified. Full CI and Codex final head pending; no commercial/clinical approvals.

---

## 2026-11-10 — COM-02 installed-license triage wave 2 (review pending)
Authoring: a deterministic fail-closed installed license review report from the frozen Yarn install inventory, including exact name/version/path and LICENSE/NOTICE hashes, with separate restrictive/missing/compound categories. All records remain UNRESOLVED and legally unapproved; COM-01/02/03 clearance and clinical NO-GO unchanged. Full CI and Codex are pending.

---

## 2026-11-10 — COM-04 contract suite draft (review pending)
Added public, non-binding draft MSA/SaaS/Enterprise/DPA/Security/SLA/AUP/Order Form clauses and an approval-control index under docs/commercial/contracts/. No contracting entity, legal rights, tax, price, service guarantee, data residency or clinical permission is asserted. COM-01/02/03 and UAE counsel approval remain mandatory. PR exact-head CI/review NOT YET QUALIFIED.

---

## 2026-11-10 — COM-02 PR #329 non-hoisted workspace audit correction
Codex P2 identified root-only installed-license package scanning and missing physical workspace-local dependencies. Collector now scans supported root Yarn workspaces and physical workspace node_modules, keeping symlink avoidance; negative/fixture tests added. Historical root-only 669 package / 24 missing-file totals are not asserted as whole-workspace results. Exact-head CI and Codex re-review PENDING. No legal/commercial clearance; public repository and clinical NO-GO unchanged.

---

## 2026-11-09 — COM-02 installed package file inventory extension
PR #329 now also records exact installed package LICENSE/NOTICE file filenames and SHA-256 hashes from the existing frozen Yarn install in full CI. Source SBOM of 695 components yielded zero license declarations (all UNKNOWN), motivating file-based evidence collection. Legal licenses/redistribution approval remain UNVERIFIED. New tests and final-head CI/Codex NOT VERIFIED at checkpoint. Clinical NO-GO and public GitHub preserved.

---

## 2026-11-09 — COM-02 direct license upstream evidence ledger (in review)
Added first-pass upstream publisher evidence for 38 declared direct dependencies (16 upstream references, 22 PENDING); none approved or exact-version verified. CI enforcement checks future direct dependency additions/changes have a review entry. This does not complete transitive/OS/fonts/images/model provenance verification or IP ownership. Repository stays public for Actions; clinical production remains NO-GO. PR exact-head CI/review NOT VERIFIED at authoring checkpoint.

---

## 2026-11-10 — M4-08 consolidated workspace-route matrix (pending verification)
Added source-executing React SSR tests across fifteen real app workspace pages, their loading/error branches, guardian synthetic home practice empty state and the fail-closed messaging notice. Replaced only Workspace/useLoad at the synthetic test boundary; these are not interactive browser or API-permission tests. Full 151 Web source denominator unchanged. CI, new measured coverage and independent review pending; M4-08 95% NOT QUALIFIED, G2/G2b NO-GO.

---

## 2026-11-10 — M4-08 API branch-safety coverage wave (review pending)
Added Jest executed-code tests for six-role permission matrix, unsigned clinical/messaging denials, cookie construction and parsing, trusted proxy IP chain resolution, token comparisons and password policy fail-closed paths. Uses synthetic values; one production-safe parser correction now skips whitespace-only invalid cookie names; no clinical release change. CI and exact-head Codex pending, 95% target NOT QUALIFIED.


---

## 2026-11-10 — M4-08 real cross-role Web route coverage wave 4 (review pending)
Added genuine Jest/React SSR execution of authentication and recovery pages, access-denied/not-found/error fallbacks, actual shared form/brand components and cross-role application shell permission-based navigation. Role fixture tests cover guardian, coordinator, therapist, platform administrator and missing active context. The runner resolves real @/ imports; no runtime permissions or clinical gates changed. CI and independent review pending; 95% not qualified.

---

## 2026-11-09 — M4-08 Web session/CSRF + timezone test wave 3 (pending qualification)
Added source-executing synthetic Jest tests for Web authentication transport (pre-auth CSRF concurrency, session revocation on 401, 204, network error and protected mutation) and center-local time handling (missing timezone fail-closed, Dubai conversion, DST skipped/repeated times, preserved original offset). No runtime or clinical changes; 95% goal remains NOT QUALIFIED; exact-head CI/Codex pending.


---

## 2026-11-09 — M4-08 Web UI execution wave 2 (PR pending)
Created real React server-rendered component tests for accessible locked actions, family/clinical UI states, metric loading and guard-preserving keyboard tab navigation; added synthetic-only dictation state, cancellation, provider failure and disabled real-microphone tests. No 95% acceptance claim. CI/Codex not yet qualified; clinical G2/G2b NO-GO unchanged.


---

## 2026-11-09 — COM-02 license classification (PR pending)
Adds exact-commit scanner license candidate review queue and unapproved third-party notices draft to recurring SBOM job, with flags for copyleft/source-available/noncommercial and unknown terms. Separate assets/containers/fonts/AI rights register OPEN. No component is auto-approved. CI and independent review PENDING; public repo and clinical NO-GO unchanged.



---

## 2026-11-09 — M4-08 executed Web domain regression wave (review pending)
Added Jest/ts-jest executed branch tests for planning handoff, goal-review dates, progress bucket isolation and Child 360 timeline provenance; synthetic fixtures only, no API writes. The existing whole-source Web 95% target remains NOT QUALIFIED. Exact-head CI and independent review still required.



---

## 2026-11-09 — M4-08 integrated API/Web evidence PR (qualification pending)
Existing full API instrumented Jest report and Web all-source Istanbul audit are reused. A new joint report records exact run/SHA, four-metric coverage, actual API/Web file scope, zero-statement Web files and explicit sub-95% metrics. The receipt is NOT a release approval or a 95% pass. CI, independent review and actual current-head percentages remain pending.


---

## 2026-11-09 — COM-02 SBOM lockfile reconciliation review follow-up
Codex P2 on PR #323 identified incomplete source SBOM coverage checks. Strict Yarn lockfile version comparison exposed seven entries omitted by Syft scan (including platform-optional and alias packages). Added explicit scanner-vs-lockfile reconciliation with source provenance properties and full name/version validation before artifact upload. THIS IS NOT A CLAIM OF INSTALLED PACKAGE OR LICENSE VERIFICATION. CI and Codex re-review PENDING on the new head; retain public repo and clinical NO-GO.

---

## 2026-11-09 — COM-02 continuous SBOM per PR/main (in review; CI pending)
SBOM automation is proposed in a PR: mandatory per-commit CycloneDX source SBOM + tracked asset hash inventory, integrated into all Smart CI modes, with preview-container image SBOM for full mode. On each push to main, the unconditional source SBOM job will publish a fresh source artifact. No root LICENSE adopted; full asset/model/legal rights and production license clearance OPEN. No clinical/business runtime or public GitHub visibility changes. Latest-head CI, actual generated artifacts and Codex review: **NOT YET VERIFIED** at authoring checkpoint. See docs/commercial/continuous-sbom-policy.md.


---

## M4-02 two-valid-centre child scope regression — 2026-11-09 (CI pending)
Protected interactive 10-account run 42605446171 retry 2: 84 PASS, 0 FAIL, 14 policy BLOCKED; not full hosted acceptance. Existing real PostgreSQL two-center summary/role/context and guardian-message revocation tests already passed in CI. Independently read-only checked isolated Neon branch br-raspy-sound-baxyuq2a: two ACTIVE synthetic centers, children 6+1, members 9+1; no mutation. Current implementation PR adds actual two-center cross-child ID isolation, double repetition, live-session membership revocation and unaffected center positive control on disposable PostgreSQL. CI/review pending; protected hosted two-center app and clinical gates not approved.

---

## 2026-11-09 — COM-01/02 evidence and inventory qualification (PR pending)
Commercial IP evidence register added without claiming ownership; Node 20 direct dependency inventory contract tests and lightweight dedicated GitHub Actions qualification added. Public GitHub visibility explicitly preserved. Full SBOM, rights-holder determination and real clinical approval remain OPEN/NO-GO. Exact-head CI and independent review PENDING.

---

## 2026-11-09 — COM-01/02/03 commercialization governance foundation (PR #318, review pending)
PR #318 adds a conditional legal readiness register, hybrid SaaS/enterprise roadmap, preliminary dependency/asset evidence, dependency audit runbook, **non-binding** proposed proprietary notice, and Node 20 direct-manifest inventory script. User explicitly keeps GitHub repository **public** for GitHub Actions/CI constraints. This change does not amend clinical access, billing, tenant behavior, repository visibility, deployment or actual commercial licensing. **Unresolved:** institution/student/contributor/partner IP rights #312; full direct/transitive/container/asset/model license inventory and public exposure #313; lawyer-approved rights holder and final root LICENSE #314. A final repository license is NOT adopted. V1 clinical approvals remain NO-GO. Inventory execution, exact-head CI, secret scan, and independent post-fix review NOT RUN/NOT VERIFIED at this checkpoint.


---

## M4-07 final synthetic qualification PR — 2026-11-09 (CI/review pending)
Re-audited issue #181: #274, #288/#292 and #305 already implemented notice batching, worker mocked failure/replay, real disposable API 120-request latency/throughput baselines and non-root CI. This consolidated PR adds actual PostgreSQL eight-way reminder reservation contention and three replays, plus a 600-second (200s each concurrency 1/4/8) loopback API+Postgres workload in the unified nonroot 512MiB preview with cgroup peak and OOM observation, validated sanitized receipt. Execution and exact-head independent review not yet verified at this record. Does not certify tenant-wide workloads, SQL trace, durable worker dead-letter, owner-defined SLA targets or clinical release.

---

## M4-06 final disposable qualification PR — 2026-11-09 (CI/review pending)
Merged #273/#281/#291/#295 protect audit FK/index/UPDATE/DELETE/TRUNCATE and atomic rollback. Merged #299/#300 deployed non-owner runtime and owner-only migration credentials to synthetic Render/Neon; #304 passed disposable historical-prefix replay, transaction rollback, advisory contention and restore. New consolidated M4-06 qualification extends the existing CI-only script: archive actual pre-upgrade synthetic DB, restore/upgrade an independent DB, cross-session row CAS with bounded PostgreSQL lock timeout. Required CI and exact-head Codex not yet attested at this checkpoint. This is NOT a real external archived snapshot or Neon PgBouncer race; business performance/DR budgets and retention policy sign-off remain open. Clinical G2/G2b NO-GO.

---

## M4-09 PR #307 historical issue reconciliation — 2026-11-09 (FINAL CI/REVIEW PENDING)
Actual REST API enumeration of GitHub issues reconciled all 75 frozen historical IDs: 55 currently OPEN and 20 CLOSED. Canonical evidence register stale only at #114, CLOSED and independently verified by merged PR #145 (447d31ec; six-job run 41243219269, two-session Chromium QA). Updated CSV to 20 VERIFIED_IMPLEMENTED, 49 PENDING_EVIDENCE, 5 PARTIAL, 1 POLICY_BLOCKED; no bulk issue closes. Added frozen GitHub status CSV and fail-closed validator/negative CI tests. Real clinical/policy release gates NO-GO; all outstanding M4-02/06/07/08/09 acceptance OPEN. Latest PR #307 CI and Codex results NOT VERIFIED yet.

---

## M4-08 PR #306 coverage instrumentation — 2026-11-09 (FINAL CI/REVIEW PENDING)
Implemented a separate Jest/ts-jest Istanbul Web source-wide measurement runner, actual executed synthetic safety/accessibility Web TS tests, fail-closed per-file source-denominator audit (including unexecuted TS/TSX/JS/JSX/MJS modules), aggregate-only sanitized receipt and CI artifact. API-wide Jest coverage was already measured; no replacement or lowered 95% policy. Current exact-head CI and independent review NOT VERIFIED; M4-08 #182 stays OPEN. No clinical/Render changes.

---

## M4-07 current implementation checkpoint — 2026-11-09 (PR #305; CI AND REVIEW PENDING)
PR #305 introduces actual **CI-isolated**, in-process Fastify health API measurements against a real disposable PostgreSQL `*_test` DB (40 serial and 80 concurrency-8 GET requests); p50/p95/p99, throughput, RSS and a bounded appointment PostgreSQL query plan. It also adds deterministic worker notification/idempotence/failed-send retry contract tests, and 5,000/10,000 synthetic notice selection measurements. The numeric-only CI artifact guard strictly allowlists every nested field; `.github/workflows/ci.yml` archives `m4-performance-synthetic-<run-id>` only after report validation. See `docs/qa/M4-07-DISPOSABLE-PERFORMANCE-QUALIFICATION.md`. **Latest final-head six-job CI, Codex review and measured results are pending**, so no M4-07 release qualification or merged status may be asserted. Shared Render/Neon unchanged; clinical G2/G2b NO-GO.

---

**CI regression FIX_NOW:** Existing M4-08 secret-scan negative test incorrectly modified the first `fetch-depth: 0` in the workflow after adding `smart-plan`, rather than the actual scanner job. Corrected `scripts/qa/check-ci-test-inventory.test.mjs` to mutate the scoped `secret-scan` block and continue proving scanner fail-closed behavior. No secret scanner bypass; fresh exact-head six-job CI and final review pending.

**Additional static-asset safety tightening:** Smart CI now forces FULL CI for potentially executable Web public SVG/HTML/JS/JSON, as well as unknown assets. Only CSS and known non-executable image/font file types may be classified web-style in the simulation; the Rule16 owner-policy lock still prevents any actual job skipping. Regression tests updated; final-head CI/re-review pending.

**Codex P1 Rule 16 disposition (FIX_NOW):** targeted execution cannot be activated by repository variables or GitHub branch protection alone. Existing AGENTS.md Rule 16 mandates six exact-head CI PASS. Production Smart CI classifier now **hard-codes `ownerPolicyApproved:false`**, always selecting FULL even if both activation variables are true; unit tests prove this. A separate, explicit owner-approved Rule 16 amendment, required gate setup, and reviewed code unlock are prerequisites. This PR changes no policy or merge authorization. 

## Smart CI shadow-mode implementation — 2026-11-09 (REVIEW PENDING)

Conservative risk-based Smart CI is implemented on a **review branch**: source `scripts/ci/smart-ci.mjs` selects a bounded PR plan from exact Git base/head tree diff, `smart-ci-gate.mjs` independently verifies actual required job outcomes, and `.github/workflows/ci.yml` preserves the six existing CI job names. All main pushes, forks, non-main PRs, uncertain diffs, API/clinical/auth/DB/workflow/dependency edits and unsupported paths select full CI. Only safe documentation and non-deleting Web static CSS/assets may qualify for targeted mode after a separate admin-controlled activation. **Default SHADOW**: no existing checks are skipped, and `smart-ci-gate` must be made required in GitHub branch protection before enabling targeted mode. The connected GitHub App cannot read/edit branch-protection administration. Script regressions, job-wiring tests and an operator runbook are included. **Not merged or reviewed yet, no test results claimed.** Clinical policy gates, existing protected ten-account acceptance, Render/Neon secrets and operational status are unchanged; no M4 release acceptance implied.

**Next:** obtain six exact-head CI jobs and independent Codex review, disposition findings, merge, then validate shadow classifications and separately request GitHub admin to make `smart-ci-gate` required. Never enable target flags before protection is verified. Active M4 acceptance remains open.

## M4-02 protected ten-account dispatch failure — 2026-11-09

Operator launched [GitHub run 42525996528](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42525996528) from reviewed `main@b38c167831cb42ddde7206128df4f62673a0ac2a`. Its 16 preliminary static/secret-safety contract tests **PASS**, but protected `Private credential and live health preflight` **FAILED with exit code 2 after ~83 seconds**. The seven-role and three-additional-clinician tests were correctly **SKIPPED**, and no hosted-result artifact was uploaded. Runtime secrets were not printed. The 83-second pattern is consistent with three 25s health fetch timeouts plus retry delays; original script masked the failure category, so this is a **suspected network/health cause**, not a verified outage or password failure. Render continued reporting the synthetic deployment `3cdd7226236a6aa7b3f82e04f1d26b9b5bce0b93` LIVE, and returned no HTTP-latency/request time-series evidence for the window. No hosted HA-01–HA-10 PASS may be claimed.

This PR narrows the blocker by logging **only an allowlisted reason code** (e.g. `hosted_public_health_network_or_timeout`, `non_200_response`, `unhealthy_json` or credential-shape error) plus a secret-free `private credential schema validated` checkpoint. No error objects, response bodies, headers, URLs, credentials or cookies are logged. Three retries, strict JSON status=ok/database=up and fail-closed test skips remain unchanged. Unit tests verify reason classification and privacy in both normal CI and manual private workflow. This is a **diagnostic PR**, not acceptance or a bypass. Require 6 final-head CI + independent review; manual workflow dispatch/approval again only after merge. All G2/G2b, D-NEW-5, clinical signing/consent/release/real STT/AI and patient-use NO-GO.

**M4-02 #176/#268 remains BLOCKED:** actual ten-account tests not executed. Main Render app still LIVE by provider status; independent GitHub-runner network access to `/api/health` needs exact failure classification after diagnostic merge. Disposable two-centre Neon branch remains separate. No live database/environment/secrets changed by this PR. M4 #167 remains open.

## M4-08 honest application-wide coverage measurement — 2026-11-09 (PR under review)

A new **non-gating baseline** instruments the full `apps/api/src/**/*.ts` Jest suite rather than confusing fingerprint-only coverage with the application. Existing Web `node --test` runs under V8 observation; a sanitizer/report counts app source files and observed executed modules but **does not pretend that V8 module presence equals Istanbul line/branch/function/statement coverage**. The M4 report explicitly returns `NOT_QUALIFIED` until both API and Web have genuinely instrumented, full-scope four-metric coverage and meet the owner-reviewed ≥95% threshold. Tests fail closed for invalid/missing data and for fabricated API-only PASS. CI archives only aggregate percentages/counts—no raw files, data rows, credentials or cookies. This is **measurement infrastructure**, not an already-passing 95% application gate. New exact-head CI/independent review required; no clinical authorization changes; G2/G2b/safeguarding/consent/signing/release/real AI remain NO-GO.

**Status:** branch candidate, **not merged / no baseline receipt yet**. M4-08 #182 and epic #167 remain open. Existing Render synthetic demo remains on exact `3cdd7226236a6aa7b3f82e04f1d26b9b5bce0b93` with restricted database runtime role, 10 users and 6 children. Protected HA-01…HA-10 and true hosted 2-centre authenticated tests unexecuted. Do not infer release readiness from this CI PR.

## M4-06 staged non-owner database runtime PR — 2026-11-08 (REVIEW PENDING)

Current Render synthetic demo **still uses the table-owning Neon login**; no operational least-privilege claim. On this review branch, preview startup now supports an explicit default-OFF `TB_DB_ROLE_SEPARATION=true` mode. Under opt-in, a separate privileged `MIGRATION_DATABASE_URL` is confined to `prisma migrate deploy` and synthetic `seed:demo`; the API retains its independent `DATABASE_URL`. URL/credential-target validation and read-only PostgreSQL catalog privilege checks fail closed, refusing an owner/superuser/DDL-capable/actively TRUNCATE-capable API login. Runtime source, unit contracts, Docker copy, CI test hook and operator instructions included. **Not merged, CI/review pending, actual Neon role/Render rollout NOT EXECUTED.** The existing live demo must not be switched or redeployed without the controlled operational cutover. M4 #180 and epic #167 remain OPEN. G2/G2b/D-NEW-5 and all clinical/release/AI gates NO-GO.

## M4-09 historical closeout evidence reconciliation — PR pending (2026-11-08)

Reconciled the frozen 75 historical GH issues against individual merged PRs, scoped issue closeout comments, six-job exact-HEAD CI receipts and independent review records. **18 rows changed from PENDING_EVIDENCE to VERIFIED_IMPLEMENTED**: already-closed GH waves #117/#118/#119/#120/#121/#124/#126/#127/#128/#129/#130/#131/#132/#134/#135, already-closed handover follow-up #112, plus source-tested clinical integrity #39/#40. **Three** rows (#43 goal-version evidence, #47 guardian replay, #51 specialty disclosure) changed to PARTIAL, retaining their open-issue status until complete original acceptance. #10's note corrected: audit TRUNCATE follow-up #277 is closed, but non-owner runtime privilege is still unverified. Register tally **19 VERIFIED_IMPLEMENTED / 50 PENDING_EVIDENCE / 5 PARTIAL / 1 POLICY_BLOCKED** (75 total, including previously verified #8). This is a source/test/CI disposition update only. Issues #39/#40 must not close before independent review and acceptance of the register; existing 15 GH waves and #112 are already closed. No automated issue closure or clinical activation. All wider M4 qualification and G2/G2b/D-NEW-5 NO-GO controls unchanged.

**Status:** M4-09 register reconciliation is on a review branch and is **not qualified until six exact-HEAD CI jobs plus independent review**. M4 epic #167 and M4-09 #183 remain OPEN. Protected ten-account/two-tenant QA, nonowner Neon DB runtime role, full measured API/Web 95% coverage, performance/load/worker, 1,023 controlled step evidence and owner signoff all remain separate gates.

## M4-01 evidence reconciliation tranche 2 (2026-11-08; PR pending)

Existing-source audit against 18 current API e2e test modules located **50 additional partial test-to-requirement mappings**: 16 features, 21 workflows, 13 owner requirements. Together with merged PR #296, the canonical CSVs now classify **94 PARTIAL / 116 PENDING_VERIFICATION / 2 V2_EXCLUDED** across 212 entries. By register: 66 features **31 PARTIAL / 34 PENDING / 1 V2**; 91 workflows **36 PARTIAL / 54 PENDING / 1 V2**; 55 owner requirements **27 PARTIAL / 28 PENDING**. IDs, row counts, work-unit ownership and V2 exclusions unchanged. All added mappings reference existing test definitions (not new test results) and explicitly document incomplete end-to-end UI/live/controlled-step requirements, signed clinical policy and real release NO-GO. No claim that these 50 items or 1,023 controlled steps have fully passed acceptance. No code, migration, credentials, production environment or clinical status changed.

**Status:** tranche 2 branch **not merged, exact-head CI and Codex review not yet complete**. M4 epic #167 and #175/#266 remain open. The unexecuted protected ten-account/two-valid-tenant run, runtime non-owner database role, full API/Web measured coverage, workload/worker benchmark and 75 historic issue evidence remain separate exit criteria. Clinical G2/G2b, D-NEW-5, signing, consent and release, real STT/AI and patient use remain NO-GO.

## M4-01 traceability reconciliation — PR #296 (2026-11-08; REVIEW PENDING)

The three canonical registers now include **44 PARTIAL source-to-test matches**: 15/66 features, 15/91 workflows, 14/55 owner requirements. **166** other entries remain `PENDING_VERIFICATION`, with **two V2 exclusions** unchanged. Existing test file names and scenario descriptions are present in the CSVs; this is **not** full controlled-step execution or hosted evidence and must not be called 44 completed features. PR #296 is a documentation-only, unmerged review branch based on `main@6793dc225ae2900fe73f0992c81c93bb9cf9223b`. Its current-HEAD CI/review is **PENDING**. M4 #167 and #175/#266 remain OPEN. Protected ten-account/two-tenant acceptance, non-owner runtime DB role, measured application-wide 95% API/Web coverage, load/worker qualification and historic issue dispositions remain open. Clinical G2/G2b, D-NEW-5, consent/signing/release, real STT/AI and real patient use NO-GO.

## M4 final read-only qualification — Remaining M4 evidence (2026-11-08)

Final M4 code-level remediation in progress: the RBAC protected-runner probes now require a real center and static controller/permission consistency, plus a PostgreSQL audit transaction rollback test. Read-only Render/Neon verification confirms 10 accounts, 25 migrations and 2 active audit guards on the correctly selected live database. Formal acceptance remains OPEN: only one live synthetic center; no protected run, independent non-owner DB role or application-wide coverage metrics.

## M4-F03 controlled acceptance/closure — Current state (2026-11-08)

Added executable sanitized two-report 7+3 identity acceptance validator with exact deployed SHA and separate two-valid-tenant/revocation receipt, and negative tests for missing evidence. No protected hosted acceptance run is asserted. Controlled 1,023 workflow-step mapping, historic 75 issue dispositions, #175/#176/#183/#266/#268/#279 and epic #167 remain OPEN until reviewed evidence. Clinical gates NO-GO. This branch's new tests have NOT RUN on its final HEAD; six-job CI and independent review pending.

## M4-F02 reliability/QA measurement — Current state (2026-11-08)

Protected extra therapist QA now writes a mode-0600 temporary sanitized result and atomically replaces stale private report on retry. Regression simulates two runs and asserts safe replacement, perms and no credential disclosure. Measured Istanbul API/Web coverage validator rejects missing/low coverage; actual API/Web 95% measurement and performance/resource proof NOT YET VERIFIED. #181/#182/#269 remain tracked; no clinical activation. This branch's new tests have NOT RUN on its final HEAD; six-job CI and independent review pending.

## M4-F01 security/database qualification — Current state (2026-11-08)

Merged auth atomicity PRs #272/#284/#286 and DB triggers #273/#281 reused. New PostgreSQL synthetic audit concurrency plus PUBLIC TRUNCATE privilege-negative regression in apps/api/test/m4-db-integrity.e2e-spec.ts. Runtime least-privileged DB role, pooled migrations and full security matrix NOT YET VERIFIED; parent #179/#180 and #280 remain evidence-owned. No clinical activation. This branch's new tests have NOT RUN on its final HEAD; six-job CI and independent review pending.

## M4-C04 Historical evidence gate — 2026-11-08

Historic issue validator now emits a conservative 75-row disposition summary and lists independently-evidenced VERIFIED_IMPLEMENTED candidates while explicitly setting automatic closure and M4 milestone closure authorization to false. Negative tests reject false evidence, policy block without proof and misleading completion assertions. No historical issue is auto-closed. #183/#167 remain open and C01–C03 independent qualifications are dependencies.

## M4-C03 Acceptance/traceability — 2026-11-08

Protected extra-therapist QA now rejects authenticated-denial 401 as session loss, requires 403 or masked 404, and gates unassigned/wrong-centre negative PASS behind a successful same-session authorized clinical workspace control. A seed-source contract test checks IDs and deterministic namespace against `seed-demo.ts`. NO hosted ten-account success, valid two-tenant test or 1,023-step private source verification is claimed. Workstreams #175/#176 (and prior merged #177) with #266/#268/#269 still need hosted/traceability evidence.

## M4-C02 Database/infra/coverage — 2026-11-08

CI suite inventory now verifies pinned Gitleaks version/SHA-256, fail-closed all-ref and tracked-file scans, and standards-compliant TOML syntax via built-in Python `tomllib`; negative Node tests exercise removed safeguards and malformed configuration. No DB migration or runtime query code changed in this tranche. Application-wide 95% coverage, database contention, Render resource and load qualification remain NOT VERIFIED. Parents #180/#181/#182 stay OPEN.

## M4-C01 Security closure — 2026-11-08

Authenticated seven-role forbidden-route QA now rejects 401 as session loss, requiring 403 or masked 404 before an isolation PASS. `hosted-role-guards.test.mjs` adds this negative regression. This is synthetic, read-only QA; no change to the production clinical guards. Broader M4-04/M4-05 matrices and final exact-head six CI jobs/independent review remain PENDING. Parent issues #178/#179 stay OPEN; signed clinical activation remains NO-GO.

## M4-05 password reset early-boundary tests — PR #286 (2026-11-08)

Implementation HEAD before this handover update: `b932971cb79c578e79d560faec72775a7c1ffded`. Adds **two real-PostgreSQL fault-injection test cases** at the `auth_identity` UPDATE (credential mutation) and `session` UPDATE (session revocation) transaction boundaries. Both assert that failure leaves the reset token unspent, original password hash and session intact, then demonstrate same-token success after removing the synthetic trigger, session invalidation, new password login and replay rejection. These supplement (do not replace) the **audit INSERT failure** rollback regression delivered in merged PR #284. No runtime implementation changes or patient data; G2/G2b and clinical release remain NO-GO. **Current qualification: NOT YET VERIFIED on final documentation HEAD**; initial code-head CI run 42475586207 was in progress when checked, and the Rule 7 corrective commit necessarily requires new exact-HEAD CI and independent review. Parent #179 and follow-up #280 remain open until evidence permits closure.

**M4-04 clinical provenance test reconciliation — 2026-11-08:** PR #285 adds synthetic negative tests for #39 session-note provenance and #40 plan author-only draft mutations. Reconciled with merged M4-05 transactional reset and narrow historical secret-scan exception from PR #284; neither production security nor clinical NO-GO changed. New six-job CI/review pending, #39/#40/#178 remain OPEN.

---

**M4-05 atomic reset remediation — 2026-11-08:** PR #284 implements a single PostgreSQL transaction for reset token, password hash, sessions, origin lockouts and audit receipt. Synthetic fault-injection regression and full-history scanner's exact historical fixture exception added. Branch reconciled after M4-08 PR283 merge; new six-job CI and independent exact-HEAD review NOT YET VERIFIED. Issues #280/#179 OPEN; clinical NO-GO unchanged.

---

**M4-08 suite inventory baseline — 2026-11-08:** Added versioned `docs/qa/M4-08-REVIEWED-SUITE-BASELINE.json` enumerated from `main@a43e37bac6c5619f7499d7ff7b49a345f1ef7ac4` (32 API E2E suites, 2 web suites). QA checker now fails on removed/renamed tracked suites, reports new additions, and preserves existing six-job/fingerprint-only coverage gates. New CI and independent review PENDING; 95% *application-wide* coverage remains NOT MEASURED and M4-08 #182 stays OPEN. Clinical NO-GO unchanged.

---

**M4-01 source count verified from PRIVATE owner workbook — 2026-11-08:** `TheraBridge_V1_Exhaustive_Workflows_Step_Screen_Audit.xlsx` from owner Library is 237,877 bytes, SHA-256 `cc7e2d76b15d77853d08d726d4f1aa1e7ade0031ce115372056f1b7c5e15fee4` (matches hash in preserved controlled annex). Exact workbook has 1,023 unique step IDs across 90 V1 workflows; catalogue has 91, with WF-X6 excluded. Design evidence: 108 mapped awaiting verification, 880 lacking exact step-node mapping, 35 QA-only/not executed. This validates historical inventory identity/count only, NOT running code, current Figma review, signed clinical policy, 1,023-step QA PASS or permission to publish source. Row-by-row app/test evidence remains OPEN in #266/#175.

---

**M4 source/historical evidence update — 2026-11-08:** This branch pins accessible PRIVATE V0.9.16 controlled draft source blobs (unsigned, clinical NO-GO), records M4 #177 closed, updates four of 75 historical issue rows (#8 verified; #10 and #21 partial; #35 policy-blocked), and maintains all other issues PENDING_EVIDENCE. Register validator CI and independent review PENDING. No new runtime capability or policy activation.

---

**M4-06 P1 audit TRUNCATE protection — 2026-11-08:** PR #281 / issue #277 adds forward-only migration `20261108100000_m4_audit_truncate_guard` (statement-level BEFORE TRUNCATE trigger and PUBLIC privilege revoke), plus a real PostgreSQL denial-and-append regression. Test-only `resetDb` uses one transaction to temporarily disable/reenable that trigger for full fixture reset, rollback restoring it on failure. DB owners/superusers retain the ability to bypass triggers; operational least-privilege credentials and verified restore/upgrade remain required. First-head CI and fresh independent code review were initiated; Codex P1 Rule 7 documentation finding FIX_NOW in this commit. Current commit CI NOT RUN; #277/#180 remain OPEN, clinical NO-GO preserved.

---

**M4-04 clinical read security reconciliation — 2026-11-08:** PR #271 implements active-membership and live-supervisor checks for clinical child, progress and review-queue reads, plus specialty-revocation and suspension negative tests. Reconciled after M4-05/#272 merge. Final new-head six-job CI and independent implementation review NOT YET VERIFIED. The remaining P0 #178 authorization/CAS/browser scope and all clinical NO-GO remain OPEN.

---

**M4-05 partial security implementation — 2026-11-08:** PR #272 / issue #179 now adds origin-based password-reset throttling with generic responses, an API abuse regression, and previously added expiry/no-cache tests. Exact-head CI and independent review are NOT VERIFIED. Recovery UI, unsigned MFA, dirty-form and edit-conflict UX remain OPEN; clinical NO-GO remains in force.

---

**M4-09 historical issue evidence integration — 2026-11-08:** PR #276 tracks 75 frozen historical issues with zero unverified closures, exact snapshot/URL checks and fail-closed evidence requirements. The required CI test job executes its validator and negative regressions alongside merged M4-08 inventory tests. Post-reconciliation six-job CI and final exact-head reviewer acceptance are PENDING; full #266 evidence triage and clinical NO-GO remain unchanged.

---

**M4-07 implementation reconciliation — 2026-11-08:** PR #274 preserves the linear appointment/recipient lookup and explicit date-window/duplicate regressions. This merge checkpoint incorporates #273 database integrity and #275 QA inventory without dropping their source, CI or Rule-7 handover changes. Latest exact-head CI and independent review require requalification after this merge commit. Existing synthetic-only, clinical and real-delivery NO-GO gates remain intact.

---

# M4-08 QA suite coverage inventory — 2026-11-08

PR #275 / issue #182: checked-in API/web test suite inventory and six required CI job presence verifier, plus negative regressions. Measured 95/90/95/95 coverage gate applies ONLY to `apps/api/src/common/fingerprints.ts`; general 95% application coverage remains UNKNOWN, not claimed. CI now invokes the inventory verifier. Exact-head CI and review pending after base reconciliation; clinical NO-GO unchanged.

---

# M4-06 parallel database integrity checkpoint — 2026-11-08

**PR #273 / issue #180.** Existing M2 migration already provides audit append-only database trigger, clinical foreign keys and tenant indexes. Added real PostgreSQL regression for audit INSERT vs forbidden UPDATE/DELETE, validated plan-version center/author FK and scoped appointment/assignment indexes. No redundant migrations or clinical activation introduced. **New test code committed; final exact-head CI and reviewer NOT YET VERIFIED.** Remaining DB concurrency, Neon locking and performance investigation still open. Coordinates with M4-03 merged main and M4-07 runtime branch**M4-03 review status correction (2026-11-07):** Codex found two actionable P2 issues on earlier implementation HEAD: overlapping upgrade could consume a sidecar later removed by rollback, and malformed JSON could leak a password fragment in CLI error text. Both were FIX_NOW and are corrected in PR #270 with exclusive local seed lifecycle lock + error sanitization and negative-path regressions. Demo-journey CI initially failed because its runner supplied only seven secrets; runner now supplies independent ten-account secrets. Historical fixture gitleaks false-positive narrowly excluded; final CI and fresh review still pending. Parallel PRs #271–#276 are planning-only and remain independently scoped. No clinical activation.

---

# Active M4 checkpoint — M4-03 credential/seed integrity — 2026-11-07

**PR:** [#270](https://github.com/NTinkicht/TheraBridge-Emergent/pull/270) — runtime implementation committed and being submitted for independent review. **Issue:** [#177](https://github.com/NTinkicht/TheraBridge-Emergent/issues/177). **Predecessor:** M4-02 PR #267 merged at `8174a87ed27e2424500f64256742ab134f15fa3d`. M1–M3 remain owner-closed; no clinical activation.

**Implemented:** independent original-seven/extra-three secret generation and protected file modes; seven→ten local seed with a separately recoverable three-password file; unchanged seven-password hashes; preview fail-closed for partial operator secrets; database rollback/ambiguous-commit credential retention; new real PostgreSQL and fault-injection regression tests. Review/CI actual status: **PENDING final-head verification** at documentation update. Hosted private ten-account HA-01–HA-10 remains NOT RUN; #268 and #269 keep remaining QA evidence and P3 hardening visible.

**Parallel M4 workstreams:** Draft PRs #271 (authorization), #272 (HTTP/security), #273 (DB integrity), #274 (worker/performance), #275 (CI/coverage) and #276 (historical audit). These are planning drafts, not claimed as independently running agents or qualified implementations. Dedicated file ownership prevents overlapping code; #275 must rebase final CI after #270.

---

**Review correction (2026-11-07, M4-02 PR #267):** Codex identified two actionable P2 findings on reviewed HEAD `0ad1d96285`: (1) stale-session test used a cleared cookie, (2) child-list team membership could mask the actor's wrong specialty. Both fixed on PR branch; pre-logout cookie now replayed privately with isolated context, and exact actor-filtered `ClinicalService.workspace.child.services` is validated across *every* assigned child. Added regression tests and workflow CI gate. **Latest exact-head CI and second Codex review remain pending.** Protected real ten-account run NOT RUN; controlled two-valid-tenant/revocation cases #268 remain release blocked. No clinical activation.

---

# Active checkpoint — M4-02 implemented for review — 2026-11-07

**Issue:** #176. **PR:** #267. **Implementation:** three extra-therapist read-only session/scope/permission checks, seven-role read-denial and stale logout verification, sanitized result artifacts, protected workflow isolation, offline tests and CI gates. No clinical or production behavior changed.

**State:** Implementation committed, exact final-head CI and independent review NOT YET QUALIFIED at writing; protected ten-account hosted authentication QA NOT RUN. One-centre mock-denial is not proof of valid two-tenant isolation; deferred controlled multi-tenant/revocation/deployment attestation [#268](https://github.com/NTinkicht/TheraBridge-Emergent/issues/268) (P1/P0 release gate). M1–M3 owner-closed; G2/G2b and other unsigned clinical gates remain NO-GO. Prior planning and M4-01 entries below are historical.

---

# Active checkpoint — M4-02 ten-account hosted synthetic acceptance — 2026-11-07

**Status:** PLANNING ONLY, NOT IMPLEMENTED/NOT TESTED. **Issue:** #176. **Predecessor:** PR #265 merged `aa14fb46976a30fd41ec800e1060c3e7f64125f0`. The M4-02 acceptance plan is at `docs/qa/M4-02-TEN-ACCOUNT-ACCEPTANCE.md`. Preserve 7 existing and 3 extra QA identities securely; do not print secrets. M1–M3 closed and clinical activation NO-GO. Historical entries below superseded.

---

> **Review reconciliation update (2026-11-07):** Grok exact-head review found no blocking findings; Claude identified P1 V1/V2 school-scope contradiction, P1 documentation-unit misrouting, P2 cross-register ownership contradictions, plus CI/validator and provenance suggestions. Fixed feature #39 as V2-DEFERRED consistent with WF-X6; assigned implementation owners across 66/91/55; standardized evidence states; added enforced CI regression tests for false verification, bad ownership, V2 mismatch, BOM/quoted cells. Deferred unavailable canonical private specs and 1,023 step evidence to [#266](https://github.com/NTinkicht/TheraBridge-Emergent/issues/266), linked to open #175. Final-head CI and re-review MUST be checked independently; this note does not claim green final-head CI.

# Active checkpoint — M4-01 canonical roadmap reconciliation — 2026-11-07

**Owner status:** Milestones 1, 2 and 3 are CLOSED; older M3-AI06 sections below are historical, not active next actions. **Current PR:** [#265](https://github.com/NTinkicht/TheraBridge-Emergent/pull/265) (not merged). **Issue:** [#175](https://github.com/NTinkicht/TheraBridge-Emergent/issues/175); M4 tracking [#167](https://github.com/NTinkicht/TheraBridge-Emergent/issues/167).

**Delivered on PR branch:** 66 numbered original capabilities → M4–M11 work units, 91 controlled workflow IDs, 55 owner requirement IDs, pre-new-roadmap historical 75-open-issue snapshot, and CSV structural check. These are **unverified reconciliation registers**; no new clinical functionality, policy signing, production/deployment or real data. The source 2026-10-22 workbook furnished workflow/owner ID titles. Private clause-level canonical specs and historical 1023 workflow steps remain to be inspected before #175 closure.

**Latest review/check status:** Codex reviewed PR #265 at original head `602d3111e4`; P1 Rule 7 handover documentation gap is being fixed on this branch. Structural row/unique counts checked through GitHub file reads: 66/66, 91/91, 55/55; `WF-X6` marked V2 excluded. Node script execution: **NOT RUN here**. Full six-job exact-head CI: **IN PROGRESS / NOT YET QUALIFIED** on original head; fresh head requires fresh CI/review. No claim of V1 or clinical qualification.

---

# M3-AI06 implementation checkpoint — 2026-11-02

M3-AI05 PR #158 merged at bfc2a9b. M3-AI06 PR #159 implementation adds deterministic safety verdicts for fictional report and home-plan suggestions and adversarial browser tests; exact-head CI/review pending. No external AI or clinical activation.

# M3-AI05 implementation checkpoint — 2026-11-02

M3-AI04 PR #157 merged at 47945ec. M3-AI05 PR #158 now implements a local explicit clinician review sequence for fictional suggestions, without granting clinical approval or release. Browser regressions added. CI/final review PENDING.

# M3-AI04 implementation checkpoint — 2026-11-02

M3-AI03 PR #156 merged at 92709d5. M3-AI04 PR #157 now contains synthetic-only evidence snapshot and stale/tamper validation in clinician report/home-plan draft UIs, plus browser tests. CI and independent implementation review are PENDING; no clinical release, external AI or real data.

# M3-AI03 implementation checkpoint — 2026-11-02

M3-AI02 PR #155 merged as 066f628. M3-AI03 PR #156 now has synthetic-only therapist home-plan proposal code and browser regression. Tests, CI and final review are PENDING; no live data, external AI, signing or family release.

# Current status — 2026-11-02 — M3-AI02 PR #155 implementation and qualification pending

M3-STT01 PR #154 merged at `d4fa4b5` (6/6 CI PASS, clean exact-head review). M3-AI02 PR #155 now implements offline, fictional-evidence clinician report proposal generation, review/edit/discard and explicit insertion. No external model, real data, clinical authorization, signing or release. The M3-AI02 exact-head CI and independent implementation review are PENDING; this is not merge-qualified. Historical checkpoints follow.

# Historical status — 2026-11-01 — TB-EM-053 PR #152 implementation in progress

Private owner policy [PR #48](https://github.com/NTinkicht/TheraBridge/pull/48) **merged** as TB-EM-053 v1.1 (FR-1..FR-9), approved for synthetic development/testing only. [Emergent PR #152](https://github.com/NTinkicht/TheraBridge-Emergent/pull/152) is **ready for independent final review** after building an authenticated, tenant/child/recipient-scoped synthetic-only family release workflow: immutable family-rendering hashes, clinician review-state approval explicitly unsigned, guardian consent and withdrawal, recipient grants, access revocation/supersession, no-store guardian viewing, notification capture and audit, clinician/guardian UI and additive default-deny migrations. Exact-head CI [#41331698946](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41331698946) passed all **6/6 jobs** at code head `70c5a083`: **672/672 API tests, 29 suites**. Earlier Codex P1 documentation and P2 withdrawal findings are fixed and resolved. **Final review/merge remain pending** and the next documentation-only SHA must be requalified. Clinical signatures, legacy release/consent gates, real-patient activation and production processing remain blocked; professional attestations and explicit separate owner activation still pending. Earlier historical handover records below are superseded.

# Historical status — 2026-11-01 — TB-EM-052 PR #151 synthetic-only checkpoint

Milestone 2 M2-H01 through M2-QA01 are merged (latest predecessor M2-QA01 #147). Current ordered item 11/12 is [TB-EM-052 PR #151](https://github.com/NTinkicht/TheraBridge-Emergent/pull/151), **OPEN / NOT MERGE-QUALIFIED**. Owner product-policy baseline v1.1 approved in [private PR #47](https://github.com/NTinkicht/TheraBridge/pull/47); OD-1..OD-8 accepted, provisional P-1..P-5 recorded. Clinical governance, DPO, safeguarding, security, legal attestations and formal PD-06 parameters remain pending. Clinical activation, real-patient transfers, consent/signing/release and deployment remain NO-GO.

The PR adds pure synthetic timing and state-machine decision models with isolated tests. It **does not** add executable reassignment, expand RBAC, or alter published migrations. The attempted demo database assignment swap was removed after the independent TB-EM-051 authorization gate correctly rejected it (CI #41313442496). Codex review of head `48c457e` raised P1 required handover/QA documentation and P2 invalid revision/cancelled-departure bugs; these are being corrected. Exact current-head CI and re-review remain PENDING. Historical M2-H06 entries follow.

# Latest status — 2026-10-31 — M2-H06 PR #144 reviewer repairs, CI pending

Correction: current `components/clinical/ReportToPlanHandoff.tsx` exists and makes a **single idempotent atomic** report-to-plan transaction; only historical child360 path is gone. The current `reports.service.ts` transaction creates plan/version/goals/audit together, with lock + retry fingerprint. #128 error handling now uses centralized 401 listener and exposed `ApiError.code`. Codex's two P2 DST findings at `1c0c4b3` both **FIX_NOW**, fixed via preserved unchanged end UTC instant and rejection of nonexistent spring-forward local times; regression tests added, both threads resolved, no deferrals. PR #144 still **NOT MERGE-QUALIFIED**; latest six CI and exact-head re-review pending, clinical NO-GO maintained.

# Latest checkpoint — 2026-10-31 — M2-H06 implementation in progress (PR #144)

Predecessor M2-H05 #143 merged as `f30a659`; 616/616 tests and 6/6 jobs green, Codex clean, no deferrals. Current [M2-H06 PR #144](https://github.com/NTinkicht/TheraBridge-Emergent/pull/144) has actual frontend code and test commits for #127–#130, adapted to the current code tree: center-zone SessionEditor + auth/CSRF lifecycle, shared /app session provider with center timezone preload, API codes, recovery boundaries, defensive headers, regression tests. Historical handoff split-create flow is absent; current `PlanEditor` uses an atomic plan API. **Draft / NOT MERGE-QUALIFIED**, six exact-HEAD checks and fresh Codex review pending, no approved clinical release or deployment. Supersedes earlier same-day planning-only entry.

# Latest checkpoint — 2026-10-31 — Milestone 2 M2-H06 opening (planning-only)

M2-H05 [PR #143](https://github.com/NTinkicht/TheraBridge-Emergent/pull/143) MERGED as `f30a65956f6f103c4dd5ec7403c98757f6364eee`. Final exact-head `05c781e`: 616/616 tests, all six CI jobs green (run 41236118987), independent Codex no-major-findings review; four inline findings fixed and resolved; zero deferrals. The next frozen work item is **M2-H06 (#127, #128, #129, #130)** on `feature/m2-h06-frontend-reliability-architecture`. This branch at opening documents scope ONLY; implementation **NOT STARTED** and M2-H06 tests **NOT RUN**. No clinical release or production authorization: signing, consent, safeguarding activation, protected releases, live audio, real patient data and production deployment remain **NO-GO**. See `docs/emergent/workunits/M2-H06.md`.

## 2026-10-31 — CURRENT: M2-H05 Codex P1 security leak fixed; review gate pending

- Codex exact `7a75667` found pre-auth withdrawal-status response after clinician assignment revocation. **P1 FIX_NOW** `bc70c5f` now authorizes active child and matching plan specialty before any status/goal diagnostics inside the transaction; `e6b9f88` tests revoked withdrawn/unknown plan requests return identical 404 while authorized withdrawal returns 409. No deferral; all clinical release/real record gates remain NO-GO. Requalify latest HEAD with six CI jobs and new Codex review before merge.

## 2026-10-31 — CURRENT: M2-H05 review P3 compatibility + DST boundary fixes

- Small Mistral suggestions **FIX_NOW**: `ff05058` + `9f3b979` preserve unmeasured legacy 250-char whitespace title on unchanged save; `7871202` asserts explicit DST-fold time edits intentionally choose earlier instant while room-only edits preserve a prior booking. Three Codex P2s and both P3 suggestions handled, no deferred findings. Final exact-HEAD 6/6 CI + independent Codex review remain pending; no clinical activation or production.

## 2026-10-31 — CURRENT: M2-H05 third Codex P2 compatibility fix; final gates pending

- New Codex exact-head P2: existing measured/checkpointed goals with 201–300-character titles must remain saveable. `a79735c` accepts historic 300-char DTO and `276a7e7` limits new/redefined goals to 200 via fingerprint-equivalent legacy exception. `ca001a7` adds measured 250-char round-trip/400-on-new regression. Reviewer disposition **FIX_NOW**, no deferral. Prior two P2s and Postgres fixture ordering fixed; exact final-head CI + fresh Codex review still required. Governance NO-GO unchanged.

## 2026-10-31 — M2-H05 Codex code review: two P2 fixes implemented; requalification pending

- [PR #143](https://github.com/NTinkicht/TheraBridge-Emergent/pull/143) moved to ready-for-review at final docs HEAD `7f77d66`. Codex's exact-HEAD review identified two **P2** regressions, both **FIX_NOW**: room-only recurring-series updates could shift a legacy DST-fold booking; globally trimmed goal titles could block summary-only saves of observed/checkpointed legacy drafts.
- Remediations on branch: `02a0485` preserves booked occurrence instants unless the series' wall time actually changes; `51c672d` restores the exact stored immutable goal title when its trimmed equivalent round-trips. PostgreSQL/HTTP regressions: `57651b9` (Paris fold room-only update) and `ca12b89` (legacy measured title byte-faithful save plus real redefinition still rejected).
- **At this checkpoint** fresh exact-HEAD 6/6 CI and new independent Codex review remain PENDING; do not merge based on older six-job green run 41233986911 or Codex review of `7f77d66`. All clinical activation, consent/release, live records and production remain NO-GO. Next after qualified merge: M2-H06 #127/#128/#129/#130.

## 2026-10-31 — M2-H05 implementation HEAD CI qualified; final review/handover HEAD gate separate

- [PR #143](https://github.com/NTinkicht/TheraBridge-Emergent/pull/143) implements frozen #122, #123 and #125. Its implementation HEAD `55163d5fe7d1d567d8ec66f1499bc9d745c459f0` completed **23/23 suites, 611/611 API tests** and **6/6 exact-HEAD CI PASS** ([run 41233257189](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41233257189)). Includes new HTTP-invalid-zone/percentage tests, 23/25-hour DST days, fold/gap policies, withdrawn-plan evidence and stale report submission guard, historical snapshot preservation, and tenant-scoped SQL status selection. Previously recorded red runs were resolved by later commits.
- **At this checkpoint:** after documentation commits, reverify all six checks on the new HEAD, then mark ready for review and obtain a new independent Codex review of *that same final HEAD*. Disposition any new comments before Rule 16 merge. Canonical PR body holds live gate status. Clinical/real data/signing/safeguarding/consent/release/production remain NO-GO. Next frozen item after eligible merge: **M2-H06 #127/#128/#129/#130**.

## 2026-10-31 — CURRENT: M2-H05 #143 implementation in review qualification

- [PR #143](https://github.com/NTinkicht/TheraBridge-Emergent/pull/143) remains **OPEN DRAFT**, now contains application and regression-test changes for frozen **#122, #123, #125** (item 6/12). DST folds select the earlier instant; gaps explicitly reject. Current center-local day boundaries and date validation no longer use host-timezone assumptions or regex-only checks. Reports/governance distinguish stale versions and invalid states; WITHDRAWN plans stay historical and cannot enter new active evidence/observations.
- Subsequent API test [41232523644](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41232523644): **605 PASS, 5 FAIL** (old HTTP 422 assertions now correctly HTTP 400 for DTO-invalid inputs; fold first occurrence; stale-tab message). Compatibility assertions updated; stale-tab wording preserved. Report SUBMIT also now fails closed with `PLAN_VERSION_WITHDRAWN` if its saved source evidence was withdrawn before submission; covered by new PostgreSQL regression. Latest CI still pending.
- New synthetic regression tests: `timezone-validation.e2e-spec.ts`, `validators.e2e-spec.ts` and real-PostgreSQL `governance.e2e-spec.ts` additions. First code CI [41232387309](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41232387309) failed a TS narrowing assertion, fixed at `e469b7c`. **Exact final-HEAD 6/6 CI, implementation Codex review and all finding dispositions are PENDING; NO MERGE yet.**
- The pinned audit references obsolete monolithic paths/models; the implementation maps to current split NestJS/Prisma services, described in `docs/emergent/workunits/M2-H05.md`. No owner approval for clinical signing, consent, safeguarding, family release or real data: all **NO-GO**. After qualified merge, open M2-H06 (#127–#130) immediately. Historical checkpoints follow.

## 2026-10-31 — CURRENT: M2-H05 planning-only draft (after M2-H04 merge)

- **Latest verified merge:** [M2-H04 PR #142](https://github.com/NTinkicht/TheraBridge-Emergent/pull/142) merged as `b95a0ce6e5504c7660bdc265ea08ba3f9a754e23`; #124/#121 H03 carryover plus #120/#119/#126 H04 fixes, six exact-HEAD CI PASS ([run 41227497493](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41227497493)), final-head Codex no major issues and 17 review findings fixed/dispositioned.
- **Current frozen item 6/12:** M2-H05 — Clinical, Scheduling and Validation Correctness: **#122, #123, #125**. Draft planning checkpoint only: **implementation NOT STARTED; tests NOT RUN; final independent implementation review NOT DONE**. See `docs/emergent/workunits/M2-H05.md`.
- Synthetic-only and clinical sign-off/release/consent/safeguarding/production **NO-GO** unchanged. Earlier dated sections below are historical checkpoints and superseded for current next action.

## 2026-10-31 — LATEST: M2-H04 combined implementation checkpoint on PR #142 (draft, unqualified)

- Five-issue code changes are now in PR #142: #124 HTTP hardening, #121 transactionally-ended therapist assignments/series/visits and guardian notices, #120 current-schema FK/index/audit-trigger and transfer-version migration, #119 center-lock downgrade and batched conflict reads, #126 list bounds/reminder dedupe/expired rate-limit pruning. Tests include real-PostgreSQL suspension/referent/series and audit-trigger regressions, reminder idempotency, shared password-change rate limiting and migration-history guard.
- **NOT DONE:** final real-PostgreSQL API suite and six exact-HEAD CI jobs, independent final Codex code review, any newly raised P0–P3 dispositions, migration upgrade validation and further review of N+1/CAS/actor FK coverage. PR must remain **DRAFT / NO MERGE** until those checks pass. #141 previously merged docs-only; this PR remains the explicit home of both carried issues.
- The published baseline has a Nov 3 future-dated migration that makes the old `now+2d` guard unsatisfiable on Oct 31. A narrowly bounded +1 hour append allowance and negative test were added without touching prior migration SQL. This must be independently reviewed.
- Clinical policies/real data/release/production **NO-GO**. Once M2-H04 qualifies and merges, immediately start M2-H05 (#122, #123, #125).

## 2026-10-31 — CURRENT: M2-H04 PR #142 with explicit unfinished M2-H03 carryover

- M2-H03 [PR #141](https://github.com/NTinkicht/TheraBridge-Emergent/pull/141) **merged at `232c73c` with documentation/workflow only**; its #124 HTTP-security and #121 therapist-revocation feature fixes remain **UNIMPLEMENTED**. The owner's specific 2026-10-31 instruction places both in current [M2-H04 PR #142](https://github.com/NTinkicht/TheraBridge-Emergent/pull/142), alongside original #120, #119 and #126. All five must be implemented and tested **inside #142** before it qualifies.
- Current #142 work is **IN PROGRESS**, with initial #124 HTTP cache/privacy, shared password-change rate-limit, safe Prisma mapping and request-size work being prepared. **Feature tests/CI: NOT YET VERIFIED.** No #121/#120/#119/#126 fixes are claimed. This supersedes the older M2-H03-next instructions below.
- Reviewers must use the five-issue matrix in `docs/emergent/workunits/M2-H04.md`. Keep PR #142 draft until actual code, real-PostgreSQL tests, all six final-head CI checks, and a fresh independent review pass. Clinical signing, safeguarding, consent/release and real-data deployment remain NO-GO. Next after qualified merge: **M2-H05 (#122, #123, #125)**.

## 2026-10-31 — CURRENT: M2-H03 (#124, #121) planning checkpoint; M2-S01 merged

- **Latest predecessor:** M2-S01 [PR #140](https://github.com/NTinkicht/TheraBridge-Emergent/pull/140) merged to `main` at `803ad48343f4881045622853c04c7eafefea6380` after 580/580 API tests, six green required CI jobs and no-blocking independent reviews. Its fail-closed family messaging remains synthetic-only; safeguarding approval is still NO-GO.
- **Current frozen-roadmap item 4/12:** M2-H03 [PR #141](https://github.com/NTinkicht/TheraBridge-Emergent/pull/141) is the HTTP Security and Therapist Revocation work unit for [#124](https://github.com/NTinkicht/TheraBridge-Emergent/issues/124) and [#121](https://github.com/NTinkicht/TheraBridge-Emergent/issues/121). The opening HEAD `bbc85cdb174be6b1f43726e161b54cfd8a82cbb3` contained only a work-unit plan and AGENTS Rule 17.
- **Implementation: NOT STARTED. Functional regression tests: NOT RUN. Clinical/deployment activation: NO-GO.** Six passing jobs at the *opening documentation-only* commit are not evidence of HTTP or revocation corrections. Codex flagged this stale handover state at that HEAD (P2), which this checkpoint fixes.
- Work proceeds on #141 under the scoped M2-H03 plan. After implementation, require real-PostgreSQL regressions, all six exact-final-HEAD CI jobs, independent final-code review and explicit finding dispositions. Do not merge a planning-only checkpoint. **Next after a qualifying #141 merge: M2-H04 (#120, #119, #126)**.
- Entries below record historical states at their original dates; instructions naming M2-S01 as still open/next have been superseded by this latest checkpoint.

## 2026-10-31 — M2-S01 (#35) safeguarding D-NEW-5 fail-closed implementation (DRAFT)

- The preceding [M2-H02 PR #139](https://github.com/NTinkicht/TheraBridge-Emergent/pull/139) merged to main at `dafe526b2565cf31aa749af71db0eed7f67bfe13` after **574/574 API tests, 6/6 CI jobs and exact-HEAD Codex no findings**. This supersedes the older "#139 open" checkpoint below.
- The next frozen-roadmap unit is **M2-S01: Family Messaging Security and Fail-Closed Enforcement (#35)**. Free-text messaging is disabled in all deployments even if a demo flag is set. Only isolated Jest/CI fixtures can exercise old synthetic threads. No safeguarding, D4 custody, D7 consent or production policy is invented.
- New code is **DRAFT / NOT MERGED**; all six CI checks, exact-head independent review and P0–P3 dispositions must pass before Rule 16 merge. No deployment or clinical activation.

## 2026-10-31 — M2-H02 (#117 + #118), current hardening; PR #138 policy MERGED

- The owner's **frozen 12-PR Milestone 2 order** remains binding. M2-H02 is PR [#139](https://github.com/NTinkicht/TheraBridge-Emergent/pull/139) and covers both issue #117 (specialty/caseload authorization) and #118 (tenant-pinned compare-and-swap mutations). M2-S01 (#35) is next, **only after** #139 qualifies and merges.
- PR #138 merged to main at `39c9888ff3ea96971da9c28f338a52d7d8c6dce1`; AGENTS.md Rule 16 is now effective for *eligible* synthetic-only work, with exact-final-head CI, independent review, P0–P3 dispositions and linked deferrals mandatory.
- PR #139 adds live-schema therapist assignment + membership-specialty checks; revocation-aware clinical, report, governance and practice read/write scoping; non-confirming 404 behavior; center/child/service/actor CAS binding; and deterministic real-PostgreSQL regression cases and AST safeguards. Row locks serialize clinical edits and practice acknowledgement with assignment changes.
- Evidence at pre-handover HEAD `f6a6d2b`: 19/19 API test suites, **574/574 tests PASS**, typecheck/API build and web build PASS in the PR test job; other exact-head checks and final-head review are separately required. Current PR is **OPEN, not merged**. This checkpoint is not a claim of final qualification.
- All work remains **synthetic-only**; clinical signing, releases, real audio, real health records and production activation stay NO-GO pending distinct owner/governance approval.

## 2026-10-31 — M2-H02 / GH-01 draft foundation: autonomous merge rule proposed

After owner-authorized PR #137 merge (main `3d133c278f0b1fad3ba84b0e8e2ce70db1443ee8`), initiated next Wave 1 security work unit GH-01 (#117) as a draft PR. This first checkpoint proposes owner-authorized autonomous merges only after exact-HEAD 6/6 CI, independent current-head review, complete all-severity review disposition and linked, bounded deferrals. Clinical activation, real data and separately signed governance remain explicit owner gates. **Policy is proposed, not effective until its PR merges.** GH-01 specialty-access code/tests NOT STARTED; no security remediation claim, no merge or deployment.

## 2026-10-31 — PR #137 three follow-up P3 fixes (code committed; qualification pending)

At implementation HEAD `5daa691`, the local Children's Home synthetic seed preserves its exclusively staged credential file if a transaction rejection has an uncertain COMMIT outcome (committed identities visible or verification unavailable); it deletes the file only after confirming zero demo identities. A rerun with an existing user lacking a local identity now fails closed instead of assigning a random password that was never exported. An orphan credential-file error explicitly explains a possible interrupted run and requires verifying that no demo users exist before removal. Three real-PostgreSQL regression scenarios were added for unknown COMMIT acknowledgement, missing identity, and interrupted-run recovery. Exact final-HEAD six-job CI and independent re-review remain NOT VERIFIED. No clinical activation, migration rewrite, deploy or merge.

## 2026-10-30 — M2-H01 review remediation, requalification pending

PR #137 independent review on `06b2f21` identified one P2 credential-file/DB commit ordering defect plus P3 issues. FIX_NOW: secure demo credentials are now exclusively created, fsynced, and confirmed **before** DB account writes/commit, and removed after a DB rollback; Argon2id hashes prepared sequentially outside the transaction. Added real PostgreSQL rollback and filesystem-race regressions, future-dated migration rejection, direct-main-push immutability guard, identical-content rename and migration-lock metadata tests. All suggestions were dispositioned in PR discussion (comment #6531973532); GH-18 historical migration rename remains OPEN pending deployed ledgers. Corrected exact-head CI/review **NOT YET VERIFIED**, no merge. Existing clinical activation UNSIGNED/NO-GO.

## 2026-10-30 — M2-H01 Migration and CI Foundation (implementation branch; UNQUALIFIED)

Work item GH-18/#134, branch `feature/m2-h01-migration-ci-seed-integrity`. Corrected stale audit source paths by addressing the actual `seed-synthetic.ts` and `seed-demo.ts`. Both now use interactive PostgreSQL transactions for all seed DB reads/writes and defer protected credential-file export until successful commit. Added focused injected-failure Jest tests and immutable-migration Git blob guard with negative-path tests. PR test CI now uses full history and compares previously published migration blobs against the exact PR base. No historical migration folder was renamed or rewritten: deployed Prisma migration IDs/checksums must not be changed without existing-database migration provenance and an explicitly validated compatibility procedure. Branch CI, live fresh/upgraded DB tests, reviewers and merge are **NOT YET VERIFIED**. Synthetic only; clinical G2/G2b NO-GO.

## 2026-10-29 — TB-EM-051 transfer authorization / design-only work unit (DRAFT)

Merged TB-EM-050 PR #113 into main at `05cec48b929206cb14371cc36805aa3b0ee4f9fc` following 6/6 exact-head CI and clean second Codex plus independent re-reviews. Owner authorized the **next design work unit**, not real transfers. Created branch `feature/tb-em-051-transfer-authorization-design`. Published `docs/product/TB-EM-051-CLINICAL-TRANSFER-AUTHORIZATION.md` with private V0.9.16 source-candidate traceability, unsigned 9-decision matrix, proposed atomic transfer lifecycle and deny-path tests, without codegen for unsigned `transferCaseload`. Added `docs/policy/TB-EM-051-AUTHORIZATION-GATES.json` with all decisions UNSIGNED, approvals empty, real transfer execution BLOCKED in all environments; `scripts/qa/verify-tb-em-051-gates.mjs` with fail-closed invariants and adversarial negative fixtures wired to required GitHub test CI. Policy issue [#115](https://github.com/NTinkicht/TheraBridge-Emergent/issues/115) tracks human signatures and owner decisions. No API route, assignment mutation, schema migration, consent, release, real STT/AI, hosted configuration, pilot or production. **At checkpoint: exact-HEAD six-job CI and review NOT YET VERIFIED; do not merge without qualification and owner instruction.** Hosted QA #81 still incomplete.

## 2026-10-29 — PR #113 TB-EM-050 first-round review remediation (requalification pending)

At original exact HEAD 7b6551f8dc76a4748462425aadb54e8e6a06a903: required six-job CI PASS (40780220643), Codex code review completed with zero major findings, and independent Mistral/other reviewer reports found no critical authorization/clinical exposure. Owner directed addressing *all* comments and a second review. Updated the read-only readiness handler to use lock-free noninteractive Prisma queries with active/center/role membership re-check, rather than pin an interactive transaction and its row locks; advisory read consistency is explicitly not an authorization. Added checkedAt server timestamp. Manager UI now aligns proposal row status/actions with the newly retrieved readiness status and displays checked time. Expanded PostgreSQL tests to assert archived child still cannot qualify (CHILD_SERVICE_ACTIVE false even after incoming ACK) and CLINICAL_SUPERVISOR denial. Dedicated multi-session Chromium regression deferred to issue #114 with acceptance plan. Docs/product/TB-EM-050-HANDOVER-READINESS.md records every suggestion as FIX_NOW or DEFER_ISSUE. **New final-head six-job CI and second review NOT YET VERIFIED**. Draft/unmerged; clinical/release/pilot NO-GO unchanged.

## 2026-10-29 — TB-EM-050 operational handover readiness (DRAFT, UNQUALIFIED)

Owner authorized PR #111 / TB-EM-049 merge after exact-head 6/6 CI, two no-blocking independent reviews, and explicit instruction to skip Codex; merged to main as ef1761a36d62bd626baf9a587798f0fc11afd35b. Permanent AGENTS.md review disposition rule is now in main. On feature/tb-em-050-handover-readiness, added manager-only, read-only GET of an operational proposal readiness checklist with live child/service, source assignment, receiving therapist membership/specialty and acknowledgement checks. Clinical authorization, purpose-specific consent and receiving clinician's approved clinical scope explicitly remain unmet; readyForTransfer/accessGranted/assignmentChanged/clinicalHandover/released are always false. Admin UI shows blockers, never exposes data to incoming unassigned therapist. Real PostgreSQL lifecycle/tenant/flag tests added. No actual reassignment, record transfer, consent/signature, release, hosted enablement or production; new exact-HEAD CI and review NOT YET VERIFIED.

## 2026-10-29 — Owner-enforced review disposition rule on PR #111

Owner approved mandatory FIX_NOW / DEFER_ISSUE / DECLINE_WITH_REASON decisions for **all future review suggestions**, including P3s. Codified in AGENTS.md, docs/handover/REVIEW_DISPOSITION_RULE.md, CONTINUITY_PROTOCOL.md, and .github/PULL_REQUEST_TEMPLATE.md (effective on main after this PR merges). Two PR #111 P3s are implemented in this branch: source-assignment duplicate proposal button guard and deterministic PostgreSQL concurrent cancel/acknowledge lock-wait regression. One broader cancelled-history UX issue deferred to GitHub #112; active requests are never truncated. Existing Codex request on e7caba017fac was RUNNING when these owner-approved changes were made; **that earlier SHA does not qualify the new HEAD**. The new exact-HEAD CI remains unverified at documentation commit. No merge and no clinical authorization/deployment.

## 2026-10-29 — TB-EM-049 review corrections, revised CI PENDING

Original PR #111 head 0d170d3 red CI: database CHECK rejected all new handover statuses. Corrected using additive migration which permits fixed non-authorizing operational statuses and reason codes but preserves legacy SIMULATION_ONLY and source/target inequality. Added partial unique index for open proposals and composite list indexes; legacy governance access now lists only SIMULATION_ONLY. New source-before-self validation, center/actor-scoped status-CAS on cancel, membership/assignment row locks for acknowledge, no actionable request truncation under 100+ cancelled rows. UI clarification and redundant disabled fetch removed. Added real PostgreSQL concurrency and pagination tests. Exact-head six-job CI and independent re-review NOT VERIFIED. Draft/unmerged; real clinical handover, access transfer, signing and release remain NO-GO.

## 2026-10-29 — TB-EM-049 first slice therapist replacement / handover preparation (DRAFT, NOT QUALIFIED)

Owner-authorized PR #109 merged (merge SHA fc92124ab6c8769a65b1df41857c3c75b11a68cd, source HEAD c4e9cef487867711827a61ded0f5c827cee03d04 green 6/6 and four resolved Codex threads). New branch feature/tb-em-049-therapist-handover creates *operational handover preparation*, not live replacement. Distinct PENDING_ACK/ACKNOWLEDGED/CANCELLED CaseloadTransferDraft statuses (legacy SIMULATION_ONLY unchanged). Center-admin/coordinator can propose or cancel; an explicitly named incoming active therapist can acknowledge, without child identity or clinical information in recipient list. No assignment mutation, automatic clinical access, signing or release. Server HANDOVER_DEMO flag defaults OFF and production/staging reject even when enabled. UI in Child Care Team and therapist Practice Feedback; PostgreSQL tests added, CI and reviews NOT VERIFIED. Formal transfer/clinical acceptance remains NO-GO in a later focused slice.

## 2026-10-29 — PR #109 latest review remediation (CI pending; NOT MERGED)

Addressed exact-head Codex P1 and independent Mistral/Grok review findings: fixed failing AC-9 guardian permissions snapshot and AC-11 newly authorized POST routes inventory (maintaining strict assertions); serialized staff role/specialty/profile edits via center→membership locks against clinician acknowledgements; response now locks membership and active care assignment before guardian link and revalidates active therapist role, specialty, assignment and child/link. Added responder membership FK+Prisma relation to additive PR-only migration, and disabled clinician actions across all rows during a request. Expanded real-PostgreSQL e2e to cover concurrent role/specialty/assignment revocation, distinct pending request-key competition, FK integrity, two authorized guardians independently requesting and replying, and synthetic flag-off denial. Exact-head CI NOT VERIFIED after these commits; no re-review request yet, avoiding Codex credit waste. Clinical signing, release, STT and hosted NO-GO unchanged.

## 2026-10-29 — TB-EM-048 pending-inbox and CI authorization expectation fix

Codex identified a further P2: an unanswered request could fall below the 100-row recent history window. Guardian and therapist inboxes now collect ALL currently pending records separately from the 100 most recent completed records, keeping older pending requests actionable. Added PostgreSQL 101-completed-record regression. Initial PR CI `test` FAILED due only to unchanged `operations.e2e-spec.ts` and `authz.e2e-spec.ts` hardcoded role lists; both were updated with the four explicit TB-EM-048 permissions without widening other roles. Current exact-head CI and independent review remain UNVERIFIED. Clinical and hosted NO-GO unchanged.

## 2026-10-29 — TB-EM-048 Codex review corrections (latest HEAD CI PENDING)

Codex flagged P1 revocation/respond race and P2 false idempotency for a second key colliding with a pending request. The draft branch now locks/revalidates guardian_link under the response transaction before CAS update, and a conflicting second request key now returns HTTP 409 rather than a false replay. PostgreSQL tests exercise the guardian-link removal commit while response waits on the row lock, deny the response, and assert no response event; the different-key collision/retry path is also asserted. Synthetic seven-role CI demo now tests guardian request → assigned therapist acknowledgement in a disposable database only. All exact-head CI and independent re-review **NOT YET VERIFIED**. No merge/deploy/release.

## 2026-10-29 — TB-EM-048 Milestone 2 guardian home-plan requests (DRAFT / NOT QUALIFIED)

After owner-authorized PR #108 merge `main@0453c5228b397ce6fd99bed05259a7e4c181540d`, started separate branch `feature/tb-em-048-guardian-plan-requests`. Added an opt-in, synthetic-only structured guardian request lifecycle with persistent PostgreSQL records, one-pending-per-link/service index, active-guardian/assigned-therapist row scoping, idempotent submissions and fixed acknowledgement/closed-unavailable responses. Added explicit role permissions, request/response API, guardian Practice and clinician Feedback panels, and real-PostgreSQL regression fixtures. No raw messages, medical advice, clinical plan publication, approval or signing. `HOME_PLAN_REQUESTS_DEMO` defaults OFF and is always prohibited for staging/production; hosted Render unchanged. **Exact-head CI, full browser acceptance, independent P0–P2 review NOT VERIFIED**. Keep as draft; no merge or deploy.

## 2026-10-29 — TB-EM-047 PR #108 clinician per-plan activity duration (DRAFT; qualification PENDING)

- Focused synthetic-only clinician home-plan change on branch `feature/tb-em-047-home-duration-override`: optional whole-minute (1–120) per-plan duration via existing author-only and revision-checked plan-version update; server-owned saved activity snapshot minutes and library remain unchanged. Empty override omitted; explicit JSON null now rejected by DTO; all invalid values rejected at API boundary.
- Saved plan preview renders effective duration and unchanged template duration with source labeling. Historical version comparison displays the previous and compared plan-specific durations (rather than incorrectly showing only the same template minutes); internal home-practice calendar favors plan override, leaving source context visible.
- Added browser positive/negative edit interactions, pure source/saved-version difference assertions and real-PostgreSQL e2e HTTP validation for null, 0, 121, noninteger 10.5 and -1 plus positive 7-minute persistence and clearing. Prior demo-journey stale assertion caused FAIL on first PR head; corrected on subsequent branch head.
- Latest complete six-job CI for corrected head: **NOT YET VERIFIED**; independent Codex/Mistral/Grok comments on original head require fresh exact-HEAD review. Do not infer PASS from earlier CI and do not merge automatically. External hosted QA #81 remains BLOCKED/INCOMPLETE; no clinical signing, release, real AI/STT, guardian publication or production deployment.

## 2026-10-27 — PR #97 exact manual command preflight (CI PENDING)

CodeRabbit identified one additional minor dispatch reliability issue: owner comments that are not actual `/review-*` commands could contend in the serialized job concurrency queue. Added a separate non-secret, no-checkout `qualify` job with an exact full-string owner/command/hex-SHA preflight, while eligible automatic PR events continue through `always()` with the skipped prerequisite. Only preflight-qualified manual comments enter the paid dispatch group. The offline CI fixture extracts and executes this real preflight JS and tests valid/uppercase commands and invalid/partial/mention-only/other-author comments. Codex P1 about reusing a previously reserved SHA in the failed-reservation unit fixture was fixed earlier by a fresh 'e' SHA; corrected prior-head API tests passed. Full six-job CI after this workflow update remains required. Zero-spend default and clinical NO-GO unchanged.

## 2026-10-27 — PR #97 Codex P2 paid-call hardening (UPDATED; HEAD CI PENDING)

Fresh exact-head Codex review identified three additional P2 cases beyond the original five CodeRabbit issues: provider review markers failed to incorporate changed BASE, a paid result could be billed twice if comment publication failed before deduplication, and the second provider could be billed using stale HEAD/BASE after the first provider's response. PR #97 now keys dispatch/result/attempt markers by provider + HEAD + BASE, stores a durable review-attempt marker with GitHub before contacting a paid API (abort on write failure; no automatic reattempt), rechecks the live PR before each request, and stops remaining providers on a stale comparison. Offline regression fixture tests include retargeted base with same head, publication failure replay prevention, reservation failure with zero API calls, and no second request after stale first provider. A recorded attempt is NOT a verified review and cannot be automatically retried; owner must inspect billing and approve manually. All paid APIs remain OFF by default; no live Mistral/xAI call in ChatGPT. Fresh exact-head six-job CI and independent review required, no merge/clinical release claimed.

## 2026-10-27 — PR #97 automated independent-review dispatcher (FIXED, CI PENDING)

PR #107/TB-EM-046 was squash-merged as main@294f3d4298bb9a6b378937f7e40c336572ddef1d after 6/6 synthetic CI and no open review threads. Separate PR #97 implements an opt-in automated independent-review dispatcher, not any clinical workflow. CodeRabbit identified five issues on original PR head: cancelled in-flight metered API calls via workflow-wide concurrency, insensitive prior renamed path, uppercase command false negative, unsanitized model output spoofing, and unclear ChatGPT GitHub write-access wording. Fixed via job-level serialized noncancelling concurrency, live exact head/base checks, source/destination sensitive-file filters, normalized manual command, escaped/mention-neutralized model prose and corrected write-enabled-doc language. Expanded **offline-only** fixture tests for current/stale/mid-call head/base, invalid JSON, HTTP failure, forbidden rename/oversized patches, uppercase commands, malicious output and default zero-spend. Old intermediate test commit triggered a Gitleaks false positive from a computed fixture key; clean one-commit rebasing onto main removes that intermediate history from this PR branch. The scanner and tests need fresh exact-head qualification. TB_PAID_REVIEW_OPT_IN remains OFF by default. No Mistral/xAI API charged, no access grant, approvals, merge, pilot, signing or release implied.

## 2026-10-27 — TB-EM-046 Milestone 1 synthetic acceptance closeout (CODE ADDED, CI NOT RUN)

Work item #106, stacked draft branch `feature/tb-em-046-clinician-acceptance` from integrated Slice 16 PR #105 exact parent HEAD `90bd9eb8d996c198db0fb34d16d61eeda2cb79a4`. PRs #103 (advanced goal history) and #104 (saved/current report source comparison) are merged. This slice adds source-isolated **combined** regression of the current goal/observation, prior same-key goal from a different unit, frozen internal home activity snapshot and saved report prior-version evidence; never transfers evidence to a newer version. Synthetic seven-role Chromium extends four-stage child care navigation with 320/390/768/1024/1440 viewport geometry and keyboard-operable button assertions. A new explicit Milestone 1 acceptance ledger `docs/qa/TB-EM-046-MILESTONE1-ACCEPTANCE.md` marks all exact-branch tests NOT RUN until this branch CI completes, hosted external QA #81 blocked/incomplete, and all clinical/release/production gates NO-GO. No API, database, approval, consent, family release or hosted deployment changed. Keep PR #106 stacked until #105 is merged, then retarget to current main and requalify if needed.

## 2026-10-26 — TB-EM-045 / Milestone 1 Slice 16 (IMPLEMENTED, QUALIFICATION IN PROGRESS)

`feature/tb-em-045-clinician-journey-navigation` is an independent focused draft PR #105 initially based on `main@d242a001a880984fc9d4123dff5430aebc440019`; earlier Slice 14 #103 and Slice 15 #104 have not yet been merged into this branch. New `clinicianJourneySummary` and `ClinicianJourneyPanel` guide clinicians from the authorized Child 360 overview to existing Plan Goals → exact-version Progress Evidence → authorized Reports → internal Home-Plan Drafts, always within the same child context. Current-plan goal/observation counts require exact `planVersionId + goalKey`, exclude superseded/withdrawn and orphan sources. Report/version data is not included in this Workspace and no report count/review status is inferred. Parent practice, messaging, appointments, consent and clinical release are excluded. No new API/schema/DB/write/permissions or AI/STT access.

Qualification at docs update: original-head CI run `40395177839` showed PASS secret-scan, live-session, preview-container, seven-role synthetic demo-journey; `test` IN PROGRESS and `compose` NOT RUN (dependent job). Codex exact-head P1 required these four handover/QA files, now addressed in this commit. Changes after this documentation update require NEW exact-head CI and re-review; no QA issue #61 hosted evidence, production deployment, clinical approval or release claimed.

## 2026-10-26 — TB-EM-044 / Milestone 1 Slice 15 (CODE QUALIFIED AT EARLIER HEAD; DOC UPDATE PENDING RETEST)

Draft PR #104, `feature/tb-em-044-report-evidence-diff`, initially branched from `main@d242a001a880984fc9d4123dff5430aebc440019` independently of still-draft Slices #103/#105. Adds a pure read-only comparison between exact frozen selected `ReportVersion.evidence` and the existing permissioned current `ReportDetail.evidence`: period/assessment/session source differences; per-goal exact planVersionId+goalKey and definition comparison, observation ID/date/value differences (including prior point), missing legacy identifiers and zero-evidence states explicitly marked. `ReportEvidenceDiff` disclosure appears within the already-authorized internal saved-vs-current report version inspector. No new server API/DB/schema/permissions or writes, clinical verification, approval, AI/STT, guardian access, PDF export, release or pilot.

At previous exact HEAD `4d97f571e5f1f9c0a7f08eaa40600666cafd89a7`, CI `40394141714` completed **6/6 SUCCESS** (test, demo-journey, secret-scan, preview-container, live-session, compose); Codex latest review NO major issues and zero unresolved findings. This checkpoint documentation UPDATE changes HEAD; new exact-head CI/review still required. External hosted QA issue #61 remains unchanged.

## 2026-10-26 — TB-EM-043 Milestone 1 Slice 14 — exact-version longitudinal goal context (CODE ADDED; CI PENDING)

PR #102 / TB-EM-042 was owner-authorized squash-merged into main at `d242a001a880984fc9d4123dff5430aebc440019` after exact-head 6/6 CI, clean Codex and Mistral re-reviews and zero unresolved inline findings. Slice 14 now adds `goalVersionContext`, a pure read-only projection of already-authorized clinician Workspace plan versions, each version's saved goal definition (including short/long objective horizon and target/review dates), observation source records, and its own clinician checkpoint history. This reveals exact-version evidence counts and source IDs as well as comparisons to the nearest older version REUSING the same goal key. Differences in title/measure/baseline/target/horizon/dates are explicitly flagged as a definition boundary; even identical definitions do not establish cross-version continuity. No observations, clinician reviews or outcome claims aggregate across versions, other plans or specialties. `GoalVersionContext` on the existing Progress tab supplies accessible per-version accordion inspection and authorized specialty filter. No new API, DB, schema, external AI/STT, family disclosure, signatures, clinical conclusions or release. Pure and seven-role Chromium tests added; exact-head CI not yet verified. Hosted issue #61 remains separate.

## 2026-10-26 — TB-EM-042 / Milestone 1 Slice 13 (CODE ADDED; CI NOT YET VERIFIED)

PR #101 / TB-EM-041 exact saved home-plan preview was owner-authorized squash merged into `main@91036e063db2afc07fac2d9cdb6951d47e4711d1`, after exact-head six-job CI success (including corrected seven-role Chromium journey), Codex latest-head no-major review and all inline threads resolved. New independent branch `feature/tb-em-042-child360-clinical-timeline` expands the clinician's existing Child 360 read-only clinical activity timeline from a 12-record mixed snapshot to an event-type/specialty filterable, paginated **complete** timeline of already-authorized workspace plan versions, clinician goal-review checkpoints, observations, unsigned session notes and draft assessments. Exact plan-version and goal keys determine observation labels, including an explicit unavailable-link fallback; same goal keys across versions are not combined. Goal reviews order by their server-recorded event timestamp, distinct from the clinician-entered reviewedOn calendar day. Plan-version updates are labeled as records rather than interpretation of clinical progress, attendance, approval or clinical outcomes. Family practice feedback, communications and appointments do not enter this clinical-evidence timeline; no new endpoint, permissions, mutations, report signing or family release. Pure source tests, Chromium filtering/role/width journey tests added; CI not yet executed at authoring. Hosted issue #61 ledger unchanged.

## 2026-10-26 — TB-EM-041 / Milestone 1 Slice 12 (CODE ADDED; CI NOT YET VERIFIED)

PR #100 / TB-EM-040 was exact-head six-job CI GREEN, Codex and Mistral NO_BLOCKING_FINDINGS, no unresolved review threads and owner-authorized squash-merged into `main@ab9a87737d5c104890ed4e40d5609fc58adae1fa`. New single-work-unit branch `feature/tb-em-041-exact-plan-preview` adds an explicitly staff-only, read-only saved-version home-plan preview for the current plan and exactly selected historical plan version. The preview reads ONLY the persisted plan version already returned by the specialty-authorized Workspace projection, not unsaved editor state; warns explicitly when there are browser-only changes; shows summary, goal metadata, linked activity/goal titles, source-defined duration/materials/steps/safety, clinician-authored notes, validated schedule dates and explicit draft-only/no-release status. Saved activity snapshot takes precedence over mutable library fallback; unavailable/legacy sources are conspicuously labeled. Report provenance carries only report-version metadata and maps original goal definitions ONLY if preview version ID equals `source.originalPlanVersionId`; never infers continuity across later versions. No API/DB/schema/roles, external AI/STT, authorization, family clinical visibility, clinical signing/approval, printable released document or deployment changes. Pure and seven-role synthetic browser tests added, CI not yet verified. Hosted QA issue #61 unchanged.

## 2026-10-26 — TB-EM-040 / Milestone 1 Slice 11 (CODE ADDED; CI NOT YET VERIFIED)

PR #99 / TB-EM-039 was owner-authorized squash-merged into main at `f40360b595a42f8735e3f7a80be1221e00dbb0e6` after exact-head 6/6 CI and no blocking Codex/Mistral review. New Slice 11 branch `feature/tb-em-040-home-activity-details` adds explicit internal therapist instruction editing (existing `HomeActivity.note` ≤500 characters) and snapshot-first read-only activity definition details (duration, age band, materials, steps and safety) on the permitted clinician's saved or current draft plan. The date-calendar internal per-day preview also displays these authored instructions and source-defined duration. Historic saved-version inspector labels clinician notes and preserves frozen activity snapshots rather than silently swapping later library content. Current mutable-library/absent fallback is clearly labeled. No independently editable per-plan duration, new DB/API/DTO/permissions, automatic AI, clinical sign/approval, notifications or family release added; duration is the saved source-template duration (or clearly labeled current library fallback). Pure and disposable Chromium checks added but exact-head CI NOT YET VERIFIED. Hosted issue #61 remains unchanged.

## 2026-10-26 — TB-EM-039 / Milestone 1 Slice 10 (IMPLEMENTED; CI NOT YET VERIFIED)

PR #98 / TB-EM-038 internal monthly calendar passed all six CI jobs and independent no-blocking review, then was owner-authorized squash-merged into main at `d9921cb94dca0ca949f1af0b3d1847ebdc51a345`. Slice 10 starts at that exact main SHA. Identified a genuine workflow mismatch: the clinician plan editor previously allowed `Send for review` while current plan edits (or another mounted plan) were unsaved. This could submit a *different stored draft* than the visible one. Added a pure, read-only clinician handoff checklist over the already-authorized working draft: summary/goals/activity counts, explicit goal links, invalid and undated schedules, missing template/snapshot context, missing safety notes and optional goal dates. These are advisory *planning omissions*, NEVER medical readiness, approval or external release. Sending the **saved** draft for supervisor review is disabled while local or other-plan edits exist; server retains final authorization/validation authority. No database, API, consent, family disclosure, clinical approval or deployment change. Pure/Chromium tests added but CI and independent review not yet verified. Hosted #61 acceptance remains separate.

## 2026-10-26 — TB-EM-038 / Milestone 1 Slice 9 (CODE ADDED; CI NOT YET VERIFIED)

PR #95 / TB-EM-037 longitudinal clinician checkpoint comparisons was confirmed merged into main at `10f86222365e5ca83d838856e682b64cca8c71dd` on 2026-10-25 20:10:43 UTC. Slice 9 branch `feature/tb-em-038-internal-home-calendar` starts at that exact merged HEAD. Added a compact responsive **read-only** home-practice month calendar on the current plan editor and historical plan-version inspector. It renders only each already-authorized version's clinician-authored weekly/monthly schedule dates, month navigation, daily planned activity details and linked goal labels. Unsaved edit previews are explicitly flagged; historical titles prefer saved snapshots and label live-library legacy fallback. The existing schedule validator enforces a local-calendar 366-day bound; a full selected month is expanded separately from the previous 40-item first-occurrences preview cap, and nonexistent 29/30/31 dates are never shifted or fabricated. Undated/legacy and invalid schedules are explicitly excluded from plotted dates. No schedule persistence/API/DB change, appointments, attendance, completion, notification, family access, clinical approval or inference. New pure recurrence and seven-role browser journey tests added, but exact-head CI/independent review have NOT YET BEEN VERIFIED. External hosted issue #61 baseline unchanged (53 PASS, 0 FAIL, 47 BLOCKED, 4 NOT TESTED +4 historical supplemental PASS). PR #97 review automation remains separate and open.

## 2026-10-25 — TB-EM-037 / Milestone 1 Slice 8 (CODE ADDED; NOT YET QUALIFIED)

PR #94 / TB-EM-036 saved-claim inspector merged at `40118d49a1486237f54d71f55cc02e1a7dc9d743` after exact-head six-job CI SUCCESS, clean Codex review, Mistral independent NO_BLOCKING_FINDINGS and no unresolved threads. Three P3 advisory filter/test items remain non-blocking. New single-work-unit branch `feature/tb-em-037-checkpoint-comparison` adds a read-only clinician checkpoint comparison for two saved entries of ONE goal within ONE already-authorized plan version. The UI presents each clinician note and distinguishes observation UUIDs in both reviews, earlier only and later only; it does not calculate clinical trends, silently equate goals across plan versions, claim verification, or confer approval. The reusable comparison is available beside active checkpoint history and within previously saved version inspection; it reuses existing permissioned Workspace data only. Pure regression covers mixed goal keys, backdated review dates versus event chronology, duplicate source IDs, inverted/same/missing indices and no clinical outcome. Fictional Chromium read-model overlay tests two reviews, counts, chronological rejection and 320/390/768/1024/1440 widths. No new backend/API/schema/write path, guardian visibility, AI/STT or deployment. Code and tests committed, exact-head CI/independent review NOT YET VERIFIED. Hosted #61 remains 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 supplemental historical PASS).

## 2026-10-25 — TB-EM-036 / Milestone 1 Slice 7 (CODE ADDED, NOT QUALIFIED)

PR #93 / TB-EM-035 was owner-authorized squash-merged into main at `83c428d201d35fe0bac35c03cd8e4a664699bf39` after 6/6 exact-head Actions jobs PASS, Codex P2 chronology regression fixed, final-head review without major findings and all threads resolved. New isolated branch `feature/tb-em-036-claim-source-inspector` adds a strictly read-only search/section filter for already permissioned frozen saved statement traces: accurate displayed/total clinician-statement counts, recorded source counts and exact-goal links. Non-attributable mismatches remain visible when searching the relevant section and the overall warning count is preserved. Fictional Chromium response overlay tests multi-claim filtering, mismatch handling and five viewport widths; real backend hash/auth verification remains under the existing PR #93 API tests. No new endpoints, migrations, report writes, family visibility, AI, clinical approval/signing or deployment. CODE/TESTS ADDED, CI NOT YET VERIFIED; PR pending qualification. Hosted #61 acceptance remains 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 supplemental historical PASS).

## 2026-10-25 — Milestone 1 / TB-EM-035 saved report statement trace (draft)

PR #92 / TB-EM-034 clinician-authored goal-review checkpoints was squash-merged into `main` at `3cd5fa8dbb152ed170057d249af5ae075d8ec5bf` after exact-head 6/6 CI and resolved reviews. New branch `feature/tb-em-035-report-statement-trace` builds on the existing non-authorizing, immutable `ReportSuggestionDecision` ledger. Snapshot evidence includes same-child/service, exact plan-version/goal clinician review checkpoint **source identity and fingerprint only** (no checkpoint narrative), bounded to the report period. The existing APPLIED decision source picker accepts these refs. A shared deterministic source catalog prevents writer/viewer identity drift. A report-version read now reconstructs a clinician-authored passage only when saved section and passage/individual claim hashes match and EACH cited source's fingerprint matches the frozen evidence; altered text, missing sources or malformed legacy decisions show explicit NON-ATTRIBUTABLE status rather than invented citations. Staff-only compare UI shows linked statements and source references to the already permissioned Child 360 goal view. No schema migration, family release, clinical signing/approval, diagnosis, inference, AI or pilot. API/pure/7-role browser tests ADDED, CI **NOT YET VERIFIED** at log time. Hosted #61 remains unchanged.

## 2026-10-25 — Milestone 1 TB-EM-034 (DRAFT; qualification pending)

PR #91 was squash-merged into main at `7f1dee91c6db013a8406103fc10b6e6801724af2` after six successful CI jobs, exact-head Codex review without major findings and all threads resolved. Mistral MIS-001 (P1 mapping compile error) and MIS-002 (P3 unused midnight helper) were addressed, including America/Los_Angeles spring/fall DST tests. Next branch `feature/tb-em-034-goal-review-checkpoints`: internal clinician-entered review checkpoint attached to a saved plan version and goal, with explicit selected observation UUIDs and a narrative note. Persisted as tagged append-only entries in existing protected PlanVersion review ledger, separated from supervisor notes in the authorized workspace read projection. Therapist draft author + specialty/child/centre permissions + optimistic version required. No changes to goal definitions or observation measurements, no clinical authorization, approvals, family sharing or migration. API/Chromium tests added but **NOT YET RUN at this checkpoint**; hosted QA issue #61 unchanged.

## 2026-10-25 — TB-EM-033 goal review readiness (draft, unqualified)

PR #90 was merged into main at `b2d34c0ebcfd9fb6eaa0412f75965cb3dd43fb79`, with exact-head 6/6 CI, Codex no unresolved findings and owner-authorized squash. New branch `feature/tb-em-033-goal-review-readiness` builds **read-only** clinician review-date worklists from permitted current plan versions, clinician-entered `reviewOn`/`targetOn`/horizon, exact-version observation count and goal-linked home activity count. Classification uses centre-local calendar date and distinguishes past due/today/within 14 days/later/no date; this is a reminder, NOT clinical verdict. Worklist can focus an existing goal editor. Report evidence now links to exact plan-version/goal via child workspace permissioned URL, explicitly warning when source is historical or unavailable; no goal-key reattribution. New pure helper/browser tests ADDED, NOT RUN at checkpoint. No new DB migration, authorization or family release. Hosted #61 unchanged.

## 2026-10-25 — Milestone 1 / TB-EM-032 plan evidence provenance (DRAFT; unqualified)

PR #89 (goal horizons, planning dates and bounded weekly/monthly home schedules) has been squash-merged into `main` at `a84edafb9822103d57f8bf27209161060bc337a1`. Exact PR HEAD `9865032` had 6/6 PASS and Codex/DeepSeek no blockers, with only P3 advisories. Next branch `feature/tb-em-032-plan-evidence-provenance` adds a source provenance read projection to the authorized Child 360° workspace, joining only saved TB-EM-030 report-to-plan source events whose plan, child, specialty, report/version records are in scope. It shows originating report/version, original goal-definition source keys (only in first plan version), and existing observations for the EXACT plan-version+goal pair. No automatic measurement import, clinical inference, family access, approval or release. Staff UI links to the already-authorized report page, with server permission enforcement. API/Pure/Chromium regression code added; **not executed or qualified at authoring**. #61 hosted acceptance unchanged.

## 2026-10-25 — Milestone 1 slice 2 / TB-EM-031 (DRAFT, qualification pending)

PR #88 **merged** to main in squash commit `4e0c3194d149113d6bd89c258798a786b58ddf60`, after exact-head 6/6 CI and all threads resolved. New branch `feature/tb-em-031-goal-horizons-home-schedule` adds optional SHORT_TERM/LONG_TERM objective horizon, target/review calendar dates, and structured weekly/monthly home activity schedule with explicit bounded start/end range. This extends existing immutable plan-version JSON snapshot model without database migration and retains legacy unspecified fields. API validates actual dates (including leap years), ≤366-day range, unique weekdays / monthly 1–31, no mixed schedule attributes, and at least one occurrence; server normalizes schedule frequency and keeps therapist/plan-version/center isolation. UI includes responsive clinician editor, recurrence preview and planning comparison/history; added PostgreSQL API, pure calendar logic and browser regression. **TESTS CODE ADDED BUT NOT YET QUALIFIED** at this checkpoint. Dated recurrence creates NO appointments, patient communication, release, clinical approval, medical inference, or parent-facing content. Hosted #61 unchanged.

## 2026-10-25 — PR #88 latest reviewer corrections (qualification pending new HEAD)

PR #88 is READY FOR REVIEW and **unmerged**. The prior exact-head CI run [40193196668](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/40193196668) at `11ecbb05f1d29244143078c12f53fd2c6eb4cc9b` passed 6/6 jobs (API/PostgreSQL, responsive seven-role browser, live-session, preview-container, secret scan, Compose). This is evidence for that SHA ONLY. Codex's new exact-head P2 noted the reverse-order race: Submit report, THEN initiate handoff before Submit completes. The code now reserves a synchronous shared transition lock before awaiting autosave/submit; handoff, evidence decisions, preview and editing cannot overlap it. Added a held-POST browser regression; API plan-draft titles trim before validation; confirmed draft has Open draft recovery link/explicit report-editor unlock if navigation is stalled. New HEAD CI / fresh independent review **NOT YET VERIFIED at this entry**. Policy gates remain DENY, synthetic only. Hosted acceptance #61 unchanged.

## 2026-10-25 — TB-EM-030 refinement checkpoint

Milestone 1 PR #88 remains DRAFT. A first exact-head CI run found ONE missing new endpoint in the existing authz route allowlist; the new report-plan API PostgreSQL test suite passed. The allowlist was corrected. Codex first review found two P2 frontend risks: report autosave/hand-off race and uncertain retry payload reset. ReportEditor now exposes a versioned save/lock lease; ReportToPlanHandoff flushes the queue before starting, locks typing while the request is unresolved, retains immutable payload for retry, and requires explicit acknowledgement to abandon. Backend uses a transaction-scoped advisory lock and append-only fingerprinted source event to replay same-content requests even after a browser reload with a different UUID. New concurrency + responsive browser regressions are in the branch. **Latest exact-head CI and re-review are pending at this checkpoint; do NOT infer PASS.** All clinical policy gates unchanged, no hosted deployment or #61 acceptance change.

## 2026-10-25 — Milestone 1 / TB-EM-030 (draft, not yet qualified)

First integrated milestone slice implemented on branch `feature/tb-em-030-report-to-plan-draft` from main `f237e7b1ea4329fb80b36b600b15d1ddf9d95fed`: assigned report author selects verified goal definitions from an EXACT saved report-version evidence snapshot and requests one transaction to create a NEW draft therapy/home plan. The plan receives newly allocated goal keys with no inherited progress, empty home activities, and an explicit draft-only summary. Server checks active role/child/service/trial, report author, report revision/status and report snapshot, records exact report/version/goal refs in append-only centre event and uses a caller request UUID for scoped idempotent replay. Client opens the draft plan editor in the same child context. No automatic treatment inference, external model, report prose copying, family release, approval, consent or protected deployment. Code and test assets added; **NOT RUN** at this checkpoint. Existing hosted issue #61 stays at 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 supplemental PASS).

## 2026-10-25 — TB-EM-029 review closeout checkpoint (PR #87)

DeepSeek re-reviewed code head `b7c38759be4a09413ce8c7f4458405cd4097fefc`: `NO_BLOCKING_FINDINGS`; both original Codex P2 defects were fixed, all inline threads resolved. CI run [40188527231](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/40188527231) completed SUCCESS 6/6 at that SHA. Three optional P3 follow-ups are being completed in the same PR: explicitly label legacy current-library titles even in comparison headings, tolerate missing arrays in older persisted activity snapshots, and update QA receipts. The final docs/code commit will need fresh exact-head CI; do not attribute previous CI to new commits. No live hosted acceptance, database mutation, Render deployment, clinical release or signing. Issue #61 remains 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 historical supplemental PASS).

## 2026-10-25 — TB-EM-029 Child 360 clinical plan history (DRAFT; not yet qualified)

Feature branch `feature/tb-em-029-plan-version-history` from merged main `65809a96d83f2dfa44ae5481c3f232b32c2b790d`. Adds read-only saved version selection, author/status/date/review-note inspection, two-version goal and home-activity definition comparison in the existing clinical Therapy plan tab. Definitions are scoped to ONE already-authorized plan returned by the existing clinician workspace endpoint, with no new API/schema/permissions. Changed goal measures/baselines/targets are flagged as definition changes, never automatically combined as clinical progress. No approvals, signing, release, external AI or guardian clinical exposure. Pure comparison regression and disposable synthetic loopback browser overlay are CODE ADDED; GitHub CI and independent review **NOT RUN at this checkpoint**. Hosted seven-role acceptance has NOT been repeated or upgraded: issue #61 remains 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 historical supplemental PASS). No deployment or production changes.

## 2026-10-25 — PR #86 mobile UX and hosted QA collector (handover checkpoint)

Current work unit: PR #86, baseline application head c2b5311b732e83b5e6055e79337a854682aaf725 (before documentation-only updates). Code adds permission-filtered mobile full-label native navigation, an initially collapsed staff Activity Library creation form, authorized unique-role selection after login when the synthetic account has multiple workspaces, and non-sensitive QA_PUBLIC_SUMMARY counts/reason codes. Earlier Codex P2 navigation/redirect/browser-script defects have been addressed. DeepSeek final re-review of this code head: NO_BLOCKING_FINDINGS, after retracting an erroneous P2. Existing source-level verification does not prove hosted login execution. Two exact-code-head Actions workflows completed SUCCESS: ci #40185953803 and qa-readonly-contracts #40185953799. The later Codex P1 checkpoint-documentation finding is being resolved by this documentation-only update; new exact-head qualification is pending. PR #86 remains unmerged until gates are satisfied. No hosted run/deploy authorized or performed in this work unit. #61 official acceptance: 53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED (+4 historical supplemental PASS). No clinical, consent, safeguarding, real-data or production permissions changed.

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


## M2-H07 implementation checkpoint — 2026-11-01
PR #145 on `feature/m2-h07-accessibility-performance-handover` addresses #131/#132/#112/#114 on the merged M2-H06 baseline. Current-code mapping: shared UI controls in `centers/kit.tsx` and `design/*`, scheduling in `operations/Calendar.tsx`, recurrence in `clinical/HomePracticeCalendar.tsx`, operational handover in split `clinical/governance.*` and `operations/HandoverProposalPanel.tsx`. Unique IDs, touch targets, keyboard tab navigation, modal focus; memoized projection/calendar layout; manager-only scoped paginated history and PostgreSQL regression; and genuine cross-role Chromium synthetic handover journey are committed. **Not qualified**: final exact-head six CI jobs and independent review pending. This checkpoint does not assert passing tests, release permissions, or clinical approval. G2/G2b and all signing/consent/transfer/release gates remain NO-GO.


## M2-H07 CI qualification checkpoint — 2026-11-01
GitHub Actions [run 41242446451](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41242446451) completed **SUCCESS, 6/6 jobs** at implementation HEAD `0955bb3e66033a5099a46506990ffa1b6bdadda9`: test (23/23 suites, 617/617 API tests, web build + frontend regression), secret-scan, live-session, preview-container, demo-journey (including three-browser handover synchronization), compose. The initial earlier SHA typecheck failure was fixed by adding the required `createdAt` to a synthetic child fixture. **This documentation update creates a new HEAD**; latest exact-head CI and final Codex review must still be rechecked before merge. No governance release approvals changed.
## M2-QA01 synthetic report simplification — 2026-11-01

PR #147 integrates `main` login-readiness fixes and implements short-lived, sanitized HTML/JSON and **layout-only redacted PNG** synthetic QA artifacts in place of mandatory ciphertext/decryption for subsequent hosted runs. The repository is public: do not claim artifacts are private or that redacted images prove dialog/text content. Historical run #5 returned 7 PASS / 0 FAIL / 35 BLOCKED; it used the old encrypted format. The fixed #61 104-case baseline is unchanged; visual acceptance remains open. This PR has not yet passed final CI/review and does not deploy or release clinical functionality.
# Current state — 2026-11-02 — Milestone 3 M3-AI01

Milestone 2's 12/12 ordered PRs are **merged**; final TB-EM-053 PR #152 merged as `17f8ed255c114c4912111e720a99592052aa03bc`. The owner approved Milestone 3's seven-item Intelligent Assistance roadmap, beginning with **M3-AI01 AI Foundation**. The isolated M3-AI01 branch introduces offline, bounded synthetic AI fixture infrastructure and versioned prompt/fingerprint contracts while the Nest runtime's actual `DisabledClinicalAiProvider` stays registered. New-branch exact-head CI and independent review are **PENDING**. Live clinical AI, real STT, production release/signing and patient processing remain **NOT AUTHORIZED**. Historical checkpoints below are superseded.

# Current state — 2026-11-02 — M3-STT01 implementation in progress

M3-AI01 PR #153 merged as `a9202bdb323154810597ccfc4dd5fb031b685512` after exact-head six-job CI and clean Codex review. M3-STT01 draft PR #154 is now being implemented: simulated, no-audio capture controls and EN/AR/FR fictional transcript fixtures extend the existing clinician-controlled editing and insertion workflow. New code-head CI/independent review **PENDING**; real microphone, storage, external STT, clinical AI, real-patient processing, signing and release remain disabled. Earlier checkpoints below are historical.


## 2026-11-02 — Hosted stakeholder rehearsal (PR #162)

Reviewed PR #160 merged and live synthetic Render commit `f1216b1735d5c548424f4b5da3c1961793be0a4d` is healthy. Protected interactive run [41451350004](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41451350004): **43 PASS / 0 FAIL / 14 BLOCKED** (two intentionally excluded clinical/form cases per role); exit code 2 is deliberate and not a confirmed app defect. PR #162 adds **NOT YET RUN** hosted rehearsal assertions for assigned fictional child, six clinical tabs, unavailable-AI banner and guardian sample progress. CI/review pending. No clinical/AI activation or baseline promotion.

## 2026-11-02 — Expanded synthetic demo roster (implementation pending)

New isolated branch adds five fictional children, including Amina and Zayd as Ahmed siblings, plus three **display-only** fictional therapists (ABA, OT, Speech), assignments and five future synthetic appointments. Existing seven hosted login accounts and secrets are unchanged; new staff have no authentication identities. A 25-minute stakeholder presenter script is included. **CI, independent review, Render deployment and hosted verification NOT RUN** for this branch. Clinical/AI gates NO-GO, 104-case acceptance baseline unchanged.


## 2026-11-02 — Three synthetic therapist identities (PR pending)
The owner authorized individual demo logins for Dalia Mansour (behavioral/ABA), Nour Haddad (OT) and Huda Rahim (Speech). A separate three-password `DEMO_EXTRA_PASSWORDS_JSON` is required on Render; the original seven-password `DEMO_PASSWORDS_JSON` is preserved. Three display-only membership records are promoted into local therapist authentication identities idempotently. The private hosted runner adds `TB_HOSTED_QA_EXTRA_USERS_JSON` for targeted role/session/logout checks while retaining its seven baseline users. **NOT YET DEPLOYED OR HOSTED-VERIFIED.** No real clinical authorization, AI release or acceptance promotion.


## 2026-11-12 — PR #362 COM-02 candidate runtime capture checkpoint
Added a digest-pinned local Docker-export file inventory tool, offline negative tests, and full-CI test wiring. This is *candidate* technical evidence, **not** independently signed production OCI evidence, SaaS/enterprise rights approval, signed customer terms or clinical authorization. No release images supplied, no publication lineage approved among 53 unresolved versions, and all 91 source assets require distribution-scope/rights review. CI and Codex remain PENDING on the new head; the PR must stay draft until qualified. G2/G2b NO-GO.

## 2026-11-12 — PR #362 capture-to-scope compatibility correction
The existing release comparator rejected the tagged image reference the new Docker-export capture emits. Corrected bounded image reference validation, added end-to-end candidate comparison regression, and fail-closed forged capture provenance negative fixtures. Current source is committed; all required CI and independent Codex verification must be repeated on final SHA. Release images still absent; no rights or G2/G2b approvals.

## 2026-11-12 — COM-02 canonical Docker RepoDigest validation
Fixed legitimate Docker registry-port/tag digest matching; added mocked exact repository-and-sha256 test. No image has been independently captured/signed, and all 53 package publication and 91 asset rights checks remain unresolved. Final-head CI/Codex required before merge.

## 2026-11-12 — PR #362 paired release capture preparation
Added strict offline manifest merger for distinct SaaS/Enterprise candidate Docker exports, rejecting counterfeit signature and approval fields and unsafe file inventory metadata. New Node tests and full CI job wiring added. No actual release edition artifacts yet; signed OCI verification, 53 npm publication versions, 91 asset redistribution and counsel remain open. Exact-head green CI and Codex unverified; PR stays draft.

## 2026-11-12 — COM-02 next consolidated PR after merged #362
Opened follow-up branch for offline DSSE Ed25519 verification of exact dual-edition OCI digest and filesystem-inventory claims. Verifier accepts only a separately approved, pinned public-key SPKI SHA-256 and valid DSSE PAE signature; explicitly declines to infer publisher identity, production deployment, legal grants or clinical G2/G2b authorization. Ephemeral-key adversarial tests and CI wiring implemented. Real release signed attestations, 53 npm source lineages, 91 asset rights and counsel decisions remain unverified; new PR full CI/Codex pending.

## 2026-11-12 — COM-02 paired signed-release-rights reconciliation
Following merged #363, implemented a fail-closed, fully reverified DSSE + two-edition Docker export + complete bulk package/source-asset evidence join. Output distinguishes exact signed LOCAL candidate hashes from actual release and legal rights; no publisher authority or independently attested production deployment can be claimed. Offline adversarial CI test wiring added. Full CI/Codex qualification pending; actual 53 npm publisher lineages and 91 assets remain unresolved. G2/G2b NO-GO unchanged.

2026-11-12 PR #364 Codex P2 remedied: signed candidate-to-rights join now preserves the three unresolved OS/container, PostgreSQL/Redis and models/datasets/external-service obligation rows, validates exact categories/reasons and prohibits false approval. New regression cases added; final-head CI and Codex qualification pending.

## 2026-11-13 — M4-08 owner-revised 90% full-source coverage qualification (PR #358)
Owner explicitly superseded the prior 95% stretch coverage requirement with **90% for API and Web lines/branches/functions/statements**. The 93 executable API modules and all 154 Web modules remain instrumented without exclusions or denominator changes. The most recent successful Web-focused verification on head `ae5c3a8` measured Web lines 96.03%, branches 90.00% (raw gate >=90), functions 90.71%, statements 93.67%; 1,557 Web tests / 114 suites passed. The last validated API aggregate on earlier head `d215843` was lines 96.86%, branches 88.19%, functions 95.73%, statements 95.14%. New clinical authorization, invitation, and report evidence tests on later commits require exact-head CI measurement; API >=90 branches **NOT YET VERIFIED**. Coverage is not clinical release approval. PR #358 remains draft, exact-head Codex re-review/CI and six required job receipts pending; G2/G2b signing, consent and release remain NO-GO.

## 2026-11-13 — COM-02 authenticated npm Sigstore claim verification
Following merged PR #365, implementing pinned npm 11.19.1 Sigstore trust-chain and transparency-log verification for the three advertised exact-version npm packages, plus strict signed PURL and SHA-512 digest binding and SLSA source revision claim extraction. This is authenticated *source claim candidate* evidence, never independently corroborated source build reproducibility or license authority. The other 50 versions, 91 tracked assets and actual production OCI releases remain unresolved; G2/G2b NO-GO.

2026-11-13 PR #366 initial real signed bundles: pinned npm CLI completed, but second-stage in-toto payload parser matched 0/3 (BAD_SIGNED_STATEMENT), so signed source-correspondence remains 0. Added exact raw npm verified-bundle JSON archival to enable inspection, while preserving 53/53 package unresolved and all legal/clinical NO-GO. Historical synthetic M4 `fictional` rejected-password test narrowly allowlisted from all-refs gitleaks without weakening general scan.

2026-11-13 COM-02 #366 authentic bundle schema reconciliation: npm 11.19.1 verified bundles contain in-toto v0.1 publish + v1 SLSA statements for all three scoped packages. Source claims @next/env 14.2.35 -> vercel/next.js commit 7b940d9ce96faddb9f92ff40f5e35c34ace04eb2; SWC GNU/Musl 14.2.33 -> 5a97b408c2d8668bed1642d382fc1d78ed3731cc; both commit IDs independently confirmed to exist via GitHub API. Updated verifier to require exact paired PURLs + SHA512 and derive status from results. Full latest-head CI/Codex pending; zero confirmed reproducible source-build/license/clinical grants.

2026-11-13 PR #366 Codex P1 found an inconsistent signed SLSA workflow repository could yield an empty source claim without rejection. Fixed with mandatory at least one matching GitHub source URI + immutable commit and existing negative regression. Previous result-derived receipt status P2 fixed. Current HEAD CI and Codex still required; licensing, real release and clinical approvals unchanged.

## 2026-11-13 — COM-02 signed Next.js source manifests
After PR #366 merged (`11cfc8ee`), implemented an exact trusted receipt/raw Sigstore/53-version queue join for the 3 signed Next.js packages; independently fetches immutable source manifests under signed commits and records SHA-256 and source version; distinguishes direct @next/env source from parent SWC version for GNU/Musl native binary. No native tarball reproducibility or legal permission inferred. 50 unadvertised packages and 91 assets still unresolved, G2/G2b NO-GO. New PR CI/review pending.

## 2026-11-13 — COM-02 npm tarball reproducibility prerequisites
After merged #367, PR work inventories exact 3 signed npm package archives from registry with lockfile SHA-512, bounded/safe file hashes, generated JS/native binary counts and signed immutable Next.js ncc/TypeScript or Rust/N-API build recipes. Does NOT attempt native builds or certify byte-for-byte reproducibility. Keeps source/rights evidence for remaining 50 npm versions, 91 source assets and actual SaaS/Enterprise OCI releases unresolved. Clinical G2/G2b NO-GO.

2026-11-13 PR #368 initial CI verified exact published 3 npm archives and source recipes; GNU SWC binary 131,406,240B, Musl 156,809,432B. Zero actual reproducible tarballs. Codex P2 fixed: persist each shipped file's SHA256/path/bytes and derive report status from real success/partial/failure rather than static string. Latest-head CI/review pending.

2026-11-15 — COM-LAUNCH #371 edition-specific approval register branch established. Separate SaaS and Enterprise gates default BLOCKED, zero issued commercial rights or clinical G2/G2b GO. Existing contract pack reused rather than rewritten. Exact-head full CI/review and merge pending.

2026-11-15 — PR #373 COM-LAUNCH authorization controls are merged at 14138186a572b0f54d3cddc2dcbd81d3a311fcbb. COM-02 comparator requalified on current main after Codex P2: published archive must pass exact-version yarn.lock SHA512 SRI and every member file must match authenticated bytes; untrusted readiness self-hashes cannot authorize published-byte match. New focused branch awaiting exact-head CI/Codex, no rights or clinical grants.

2026-11-15 — COM-05 edition/entitlement design-only safety contract in PR branch (not runtime). Starter/Professional/Enterprise unpriced/unapproved; subscription states declared only; no pricing, issuer, license activation, clinical G2/G2b release or irreversible data effects. Existing COM-LAUNCH #373 and published-SRI comparator #375 are merged; release OCI scope and chain-of-title still absent.

2026-11-15 — COM-05 design PR #376 merged into main at 170a77504b5b7a71af915d118690f868ac6a6a51 with exact-head green CI and clean Codex. COM-01 legal authority remains OPEN. A new source-only COM-01 crosswalk tracks eight existing unresolved IP scopes, nine existing draft contract sections and eleven human signoff decisions, without asserting ownership or adopting a license. No commercial/clinical approval.

2026-11-15 — COM-01 legal intake has Codex P2 remediations: strict JSON validation via COM-05 policy verifier, strict existing unapproved contract header and seven matrix statuses. Eight adverse test scenarios wired into CI. No legal owner, signing, vendor notices or G2/G2b authorization claimed. Exact-head green full CI plus renewed Codex qualification still required.

2026-11-15 — COM-02 upstream evidence: all 15 immutable source-root package.json name/version pairs independently checked at exact Git commits (13 on registry-claimed GitHub paths, two on alternate public repos with historical aliases UNVERIFIED). New machine-readable observation snapshot and offline 53-row reconciler remain nonauthorizing; no npm publication/build correspondence, third-party redistribution approval, clinical G2/G2b GO or actual commercial OCI image.

2026-11-15 — Additional corroboration: GitHub API resolves `nuxt/consola` -> `unjs/consola` to repository ID `127546642`, and `Sebmaster/tr46.js` -> `jsdom/tr46` to repository ID `36964214`. Same exact original Git revisions contain matching name/version manifests. This verifies current GitHub repository redirects, not legal copyright transfer, npm publisher-to-source build proof, or redistribution clearance. Added frozen IDs and forgery regression; exact-head CI/Codex must requalify.

2026-11-15 — COM-02 PR #379 is already merged with full CI and clean Codex. The latest verified source evidence artifact (run 43710311891) contains 26 exact @types/DefinitelyTyped rows (6 direct, 20 non-direct), no immutable npm gitHead and no independent source lineage. A targeted fail-closed 26-version evidence-receipt implementation is open on a new branch; all rights and G2/G2b stay NO-GO.

2026-11-15 — COM-02 next consolidated 53-version/91-asset/two-edition release readiness matrix in review branch. Exact frozen groups: DT 26 (no historical Git commit); 15 source-root metadata-only; 7 no revision; 3 Next monorepo source-subpath gaps; 2 untrusted origins. The commercial release-image manifest has no SaaS or Enterprise image, independent publication or deployed-product receipt. All owner/asset/redistribution rights OPEN and G2/G2b NO-GO. PR #379 and #382 were merged, not reopened.

2026-11-15 — New COM-02 exact DefinitelyTyped publisher metadata discovery branch: upstream DefinitelyTyped-tools `typesPublisherContentHash` algorithm independently located in pinned source; capture per-exact-version 64-hex registry candidate fingerprints and emit counts in DT 26-version report. This identifies publisher-supplied content fingerprints but no authentic historical Git source commit, trusted build lineage, copyright permission, customer OCI or clinical GO.

2026-11-15 — COM-02 new immutable DefinitelyTyped source-byte verifier branch: exact Git commit/tree/blob inspection, Git blob SHA-1, publisher SHA-256 algorithm and bounded source probes for two frozen 2026 snapshot examples. This does not identify historical publisher commits or authenticate an npm build. Existing 26+27 package, 91 asset, 2-edition closure ledger remains fail-closed. Render only synthetic TheraBridge preview; no commercial release image or clinical approval.

2026-11-15 — COM-02 PR #389 exact immutable source-byte tool has verified 2/2 November 2026 snapshot matches but remains in full CI. Historical prepublication candidate branch now probes 2023-11-03 Git source bytes against @types/methods@1.1.4 and @types/cookiejar@2.1.5 publisher fingerprints, recording zero signed publisher/build attestation, zero legal grant and clinical G2/G2b NO-GO. 26+27 npm versions, 91 asset rights, and actual SaaS/Enterprise release images not cleared.

2026-11-15 — Extended COM-02 historical snapshot PR with a third exact candidate: @types/cookiejar@2.1.5 at Git commit 7aa25146316b7bafa0863d69bc5f125cde97f216 (2023-11-20 23:33:15 UTC), distinct from its mismatched 2023-11-03 commit; both source package/index Git blobs match the later 2026 verified fingerprint input blobs. CI now recomputes the whole pinned historical tree, NOT an authenticated original publication or commercial clearance. Exact-head CI and Codex qualification pending, G2/G2b NO-GO.

## 2026-11-17 — COM-02 exact npm source-root evidence carried onto current M5 main (UNQUALIFIED NEW HEAD)
After M5-05 #403 advanced main and made licensing PR #404 non-mergeable through shared handover files, rebuilt unchanged COM-02 implementation on updated main without replacing M5 files. Current locked 44 exceptions = 21 DefinitelyTyped + 23 other; 10 root candidates: 9 frozen observations, one unicode-emoji-modifier-base@1.0.0 pending independent observation (#405). Verified prior exact-run 43952347637 and 43952897398: nine original npm archives SRI+sha256 qualified, eight exact published package.json/source manifest matches, one @tokenizer/token@0.3.0 mismatch (#402), one pending root counted unavailable. Previous Codex P1 ten-vs-nine and ambiguous emoji-regex fixture were FIX_NOW with regression tests PASS. **New current-main head full CI and Codex NOT RUN / PENDING**. No authenticated publisher build, legal grant, commercial SaaS/Enterprise release or G2/G2b GO.

## 2026-11-17 — COM-02 #405 additive tenth root validation (UNQUALIFIED HEAD)
Following merged #407, independently reconstructed 1,271 raw Git bytes of unicode-emoji-modifier-base@1.0.0 at exact upstream commit 16333bdecc0e399f18bedd00b36995f3399ac5ec: SHA256 242f5577f26c3fff547508911718348993d5ef04ff72a44c71115ce002521301, Git blob SHA1 41420b11a80e2ba36975c65e2503e6f4327ad41c. New fail-closed script and offline tests verify this immutable Git source against original SRI-qualified locked npm archive and emit non-authorizing receipt to full CI. No original npm archive match/mismatch result is yet observed from new CI, and final-head CI and Codex PENDING; the previous #407 current 10-root receipt remains eight matches, one tokenizer mismatch #402 and this tenth pending observation #405. Publisher build attestation, legal/rights, 91 assets, real SaaS/Enterprise release and G2/G2b all NO-GO.

## 2026-11-17 — COM-02 #405 tenth npm source-root manifest exact match (measured)
Real GitHub Actions run 44014352663: independent immutable Git source vs original SRI-qualified Yarn npm archive for unicode-emoji-modifier-base@1.0.0 **EXACT_RAW_MANIFEST_MATCH_NOT_PUBLISHER_ATTESTATION**. Source raw package.json SHA256 and published package.json SHA256 both 242f5577f26c3fff547508911718348993d5ef04ff72a44c71115ce002521301; immutable Git blob SHA1 41420b11a80e2ba36975c65e2503e6f4327ad41c at 16333bdecc0e399f18bedd00b36995f3399ac5ec; npm archive SHA256 b753860ffa1f54f2b415de82e23d2ce79a89bfdc5fff1a4361a32cc8215ff4e5. Original nine observed roots from merged #407: eight exact raw manifest matches, one @tokenizer/token@0.3.0 raw mismatch (#402); additive tenth makes **9 exact raw manifest matches, 1 mismatch, 0 missing Git source observations**, although historical 15-row snapshot stays unchanged. Publisher-to-source build independently attested 0; commercial/rights, 91 assets, real SaaS/Enterprise delivery, G2/G2b NO-GO. Final updated-head CI and Codex pending, no merge yet.

## 2026-11-17 — COM-02 #402 raw npm/source tokenizer manifest drift investigation (unqualified)
Merged #408 added tenth independent raw manifest-byte match, leaving **9 matched + 1 @tokenizer/token@0.3.0 raw mismatch** across ten frozen/current exact npm source-root versions. New work unit fetches frozen @tokenizer/token immutable Git source at e068a455370090f44c757946b8571bb3fb1f117e and original locked npm tarball, verifies source SHA256/Git blob SHA1 plus archive Yarn SRI/SHA256, binds to same-run existing source comparison receipt, and records deterministic JSON pointer field-difference kinds and SHA256 hashes (no unreviewed license text). Code/tests/CI and artifact wiring implemented, but **new exact-head tests and live field-difference receipt NOT RUN**, Codex PENDING, no merge. No publisher/build/rights, 91 assets, real SaaS/Enterprise OCI evidence or G2/G2b authorization.

## 2026-11-17 — COM-02 #402 measured published tokenizer manifest semantic correspondence
Real CI 44016933031 same-run archived `therabridge-com02-tokenizer-manifest-diff-402.json` reports **RAW_BYTES_DIFFER_BUT_JSON_LEAVES_EQUAL_UNATTESTED** for @tokenizer/token@0.3.0. Published npm root package.json raw SHA256 a677763aaed22462b4f9df2526b1038cef3a90bc6cf80be27b4e65d0f14472a9 differs from immutable Git source raw SHA256 17a56b5bea3a89c3fc67b4b75769414c6c4910e483cd47da1d2a2b02c3ffaa69, but **0 JSON leaf field/value changes**, exact package identity and frozen original npm archive SHA256 911758ceca239c8e5372700eedfbbd514f16d3c117b5af0a648f6e720487c209 verified. Thus ten current source-root manifest candidates now have nine raw byte matches plus one JSON field-equivalent raw-byte mismatch. Not a signed npm publisher/build link, reproducible full source/recipe proof or legal clearance. New Rule7-updated head full CI and Codex PENDING. 44 npm exceptions/91 assets/actual SaaS/Enterprise OCI and clinical G2/G2b NO-GO.



## 2026-11-17 — WU-LIC-01 consolidated provenance qualification (branch, NOT APPROVED)
Single main-based licensing branch adds @tokenizer/token@0.3.0 strict exact npm/source semantic classifier, independent immutable npm archive and Git manifest rechecks, 44 exact-version/91 asset fail-closed same-run receipt reconciliation, adversarial tests and CI artifact. Historical 10 root candidates = 9 raw manifest byte matches + 1 tokenizer difference, **not publisher-build attestation**. 21 DefinitelyTyped + 23 non-DT remain externally unverified for authenticated publisher-to-source lineage; all 91 asset rights and genuine signed SaaS/Enterprise OCI distribution remain unresolved. See docs/commercial/WU-LIC-01-CONSOLIDATED-PROVENANCE.md. This commit is unqualified until exact-head full CI, Smart CI/SBOM and independent Codex review; do not merge with red checks or unresolved P1/P2. Commercial/IP/counsel grants and G2/G2b remain false; no real patient or production operations.


## 2026-11-17 — WU-LIC-02 exact 44 npm / 91 asset dual-edition evidence integration (UNQUALIFIED BRANCH)
One PR on latest M5-integrated main: adds scripts/commercial/build-wu-lic-02-edition-rights-queue.mjs and adversarial tests, joins exact WU-LIC-01 requalification and original npm/Git source receipts to exhaustive 44 exact npm versions, 91 tracked source assets, and docs/commercial/release-file-evidence.json, with the image digest matched to the ledger. Same-run CI archives a separate SaaS/Enterprise legal-and-release decision queue; no signed customer-distributed OCI artifacts, deployment SBOM, authenticated publisher-to-source build attestations, 91 rights-holder grants or legal signatures are provided. A missing actual image is UNKNOWN, never verified not shipped. Source counts: 21 DT, 23 non-DT, 10 source-root candidates with 9 raw manifest byte matches / one tokenizer difference, zero publisher attestations. Four supplemental obligations (OS/container, Postgres/Redis, external AI/models/data, fonts/brands/media) remain unresolved. See docs/commercial/WU-LIC-02-EDITION-RIGHTS-EVIDENCE.md. Final exact-head full CI, archived receipt and independent Codex approval PENDING; do NOT merge until qualified. G2/G2b NO-GO, no real-patient or production clinical actions; both commercial editions remain blocked.


## 2026-11-17 — WU-LIC-02 first CI failure and reviewer P1 corrected (NEW HEAD PENDING)
Initial PR #416 CI on a89680feba0fe22af3b0e186d89766e462c298cd failed dedicated WU-LIC-02 tests (10 failures) before the evidence archive: synthetic editionFixtures mutated the ledger after WU-LIC-01 receipt queue SHA binding, causing WU_LIC_01_MIXED_SOURCE_QUEUE_OR_LOCK. Independent Codex review confirmed P1. Corrected in 7823a10b5de424dd7c8977148a9816330500bb9c: recompute immutable queue SHA from the finalized fixture and rebind root, tokenizer and same-run comparison receipts before qualify(). Fail-closed production verifier was not relaxed. Exact new-head CI, current-head Codex qualification and archive evidence still pending; preserve SaaS/Enterprise and G2/G2b NO-GO.


## 2026-11-17 — WU-LIC-03 consolidated counsel launch gate (BRANCH / EXACT-HEAD QUALIFICATION PENDING)
One batched PR implements scripts/commercial/build-wu-lic-03-counsel-gates.mjs with adversarial tests, CI same-run archival and separate SaaS vs Enterprise per-component authorization matrices. Inputs: exact WU-LIC-02 44 npm exception/91 asset rights queue and docs/commercial/launch-decision-register.json; output maintains zero publisher/build attestations, zero legal approvals, unsigned OCI releases, no final LICENSE/third-party notice, blocked commercial editions and G2/G2b NO-GO. Counsel-ready draft (NOT executed agreement) and SaaS MSA/DPA/SLA, Enterprise EULA/order form, IP chain-of-title, notices, security/privacy and clinical handoff checklists: docs/commercial/WU-LIC-03-COUNSEL-LAUNCH-PACKAGE.md and WU-LIC-03-CONTRACT-REVIEW-SCHEDULE.md. Existing legal workstreams COM-01 #312, COM-02 #356/#360, COM-03 #314, COM-04 #315, COM-LAUNCH #371 remain open pending authenticated external proofs and real counsel/owner signatures. CI/Smart CI/review and merge status NOT YET VERIFIED; do not claim commercial GO or production patient access.


## 2026-11-17 — WU-LIC-04 post-V1 commercial activation SPEC ONLY (exact-head CI pending)
Separate commercial edition plans STARTER/PROFESSIONAL (owner-hosted SaaS) and ENTERPRISE (customer-managed signed installation), with quotas/pricing/taxes and billing provider explicitly TBD; draft tenant entitlement state machine, idempotent API and payment-webhook contracts, onboarding and Enterprise OS/DB/Redis/storage/OIDC/data residency/backup requirements. Machine-readable docs/commercial/wu-lic-04-activation-contract.json and docs/commercial/WU-LIC-04-POST-V1-ACTIVATION.md, adversarial scripts/commercial/validate-wu-lic-04-spec.mjs + tests in required commercial-contracts CI job. V1 freeze not evidenced (M5 runtime still active), per COM-05 #316 and COM-06 #317 *no* commercial API, Prisma migration, billing, payment, actual user onboarding, entitlement enforcement, clinical feature, or approval flags enabled in this PR. Implementation after signed V1 feature-freeze plus separate owner/finance/counsel/license/security and G2/G2b clearance; no real patient or production clinical use. Test and code review pending, do not label the PR merged/qualified yet.


## 2026-11-20 — M5-14 WU4-N private media read-denial proof (#197)
Isolated deterministic deny receipt for every custody state; validates exact center, version, revision, SHA and closed publication/read flags; rejects accessor-backed records, cross-center requests and forged rights. No URL, cache grant, token, object access or actual revocation is implemented. Future authorized storage/cache revocation and permissioned retrieval require separate approvals and integration. Regression tests added; local tests NOT RUN; exact-HEAD CI, all eight >=90% measured coverage gates and independent Codex review PENDING. #197 remains OPEN, clinical G2/G2b NO-GO, synthetic-only, no rights or publication approval.


## 2026-11-20 — M5-14 WU4-P private cache denial (draft, qualification pending)
Implemented generic immutable no-store 404 response contract; no HTTP integration or media access. Synthetic-only; G2/G2b NO-GO remains fail-closed, no real images, storage, clinical data, media publication, licensing approval, or permission grant. Adversarial Jest tests committed; local tests NOT RUN. Full exact-HEAD CI, all eight >=90% measured coverage gates, and independent Codex review PENDING. Issue #197 stays OPEN; production integration, rights sign-off and real authorization remain blocked. Handover record only, not a qualification receipt.


### 2026-11-20 — M5 major PR 3 initial synthetic catalogue contract
Owner-approved four-package grouping: isolated illustrated-catalogue projection and source-bound Node regression tests added to `apps/web/src/lib/illustrated-catalogue.mjs` and `apps/web/test/illustrated-catalogue.test.mjs`. Presentation-only filter and numbered instruction projection deliberately emit NO image URL, even when an input claims publication. This is NOT integrated into staff catalogue yet; no asset inventory, human approvals, image generation, pilot, or five-width acceptance is completed. Tests/CI/Codex NOT RUN at authoring. Dependency on major PR 2 private media remains OPEN. M5-12/13/15/16/17 remain OPEN; G2/G2b NO-GO and synthetic-only enforced.


### M5 PR1 CI follow-up — 2026-11-20
On PR #456, exact-head CI for `8905ffb` failed the `demo-journey` job (run 44724232146): Playwright timed out filling the hidden `review-queue-search` input after specialty selection remounted and collapsed the optional queue disclosure. Commit `fb5e4c3` explicitly reopens the disclosure before testing search, preserving the filter assertions. Fresh exact-head CI and Codex re-review are required; this is **not** a PASS or merge qualification. Synthetic-only and G2/G2b NO-GO remain unchanged.

## 2026-11-22 — Smart CI optimization PR #469 (NOT YET QUALIFIED)
Owner authorized narrow, added/modified narrative Markdown-only PR execution with real secret-scan, SBOM, Smart CI docs contract and required gate. Full eight >=90% metrics and all original workers remain mandatory for code, policy, workflows, QA/legal/security evidence and main pushes. Duplicate feature-branch push events are removed; main push, PR and manual events remain. PR #469 exact-head complete CI, independent review and merge remain NOT RUN/IN PROGRESS; no clinical policy is activated.

## 2026-11-23 — #473 21: version-scoped authoring steps (EXACT-HEAD QUALIFICATION PENDING)
PlanVersion editor: mounted summary/goals/activities, no implicit draft save or release. Code and synthetic regression tests committed on the PR branch. All eight >=90% coverage floors, full per-PR CI, Codex P0/P1/P2 review disposition, five-width visual and keyboard/AT checks, and explicit owner acceptance remain separate and are **NOT YET CLAIMED**. Clinical G2/G2b NO-GO, permissions, consent, and rights restrictions stay unchanged. Do not close the observation based only on the existence of this PR.
## 2026-11-23 — PR #474, observations 22–24 (NOT YET QUALIFIED)
Assessment specialty help is factual and non-diagnostic; report/plan authoring gains accessible draft-only step guidance, not a completed persisted wizard. Staff handover and family plan requests are separate from sample practice feedback. Full CI, eight >=90% coverage gates, independent Codex findings, five-width keyboard/AT and owner acceptance are pending; clinical G2/G2b NO-GO stays fail-closed. Do not mark these items DONE on PR creation alone.

## 2026-11-23 — PR #475, guardian observations 28–31 (NOT YET QUALIFIED)
Rights-safe compact practice cards, a distinct family-documents destination, authorized linked-child tabs and clarified home-practice naming are implemented. The charts remain synthetic regardless of selected child; real family files remain blocked by the existing server release/consent gates. Full CI, eight >=90% metrics, Codex and five-width keyboard/AT/owner verification are pending. No production clinical or image rights approval is implied; G2/G2b remains NO-GO.
