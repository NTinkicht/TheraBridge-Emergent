## 2026-11-24 — PR #494 consolidated shared UX qualification and CI repair (pending)

Initial `59d8dfd` independent Codex review found no major issues; focused Web run 45457048858 FAILED two assertions (literal aria-hidden string vs Boolean, and attribute order of main landmark). Corrected both while preserving the focusable landmark and actual DOM inert checks. Expanded shared navigation scope reset to actor+membership+centre+role identity, consistently clear search and restore focus after link/explicit close, and test same-role membership/actor changes and workspace navigation. Actual isolated seven-role browser now explicitly observes RTL at 390px and at 720 CSS px (half of 1440px reflow exercise), no horizontal overflow, keyboard modal open/close and focus restoration; strict receipt rejects missing or invented RTL/reflow results. CSS viewport reduction is NOT actual browser zoom, translation, real screen-reader or human usability approval. No thresholds lowered; new exact-head CI/review pending. Manual human tasks/AT/visual and artwork publication gates remain open. G2/G2b NO-GO.

## 2026-11-24 — M5 PR B shared UX: actual modal background isolation (qualification pending)

PR #493 synthetic artwork intake merged at `72990af6256f8fddb296837725c38f9e112b87c1` after all six exact-head CI jobs, eight coverage floors, commercial and Codex review PASS; no artwork publication or M5 closure. PR B follows agreed shared UX qualification (#187/#189–194). Source inspection identified a shared shell accessibility gap: aria-modal and keyboard wrap did not make background controls inert; the pointer backdrop was separately keyboard-focusable and breakpoint closure retained an obsolete search. Implemented native inert on background landmarks and controls, backdrop excluded from keyboard/AT order, focus restoration after React removes inert, clear search on breakpoint closure. Mounted regression plus actual browser background-focus denial and restoration in the existing seven-role/five-width shell run. New CI/review NOT RUN at authoring. Human screen-reader/visual/usability acceptance still not run; no waiver, clinical activation, production deployment or commercial approval. Actual artwork custody import and signed approved delivery remain open in #195–200.

## 2026-11-24 — PR #493 saved catalogue artwork comparisons (qualification pending)

Prior `295a96f` full CI 45448677868, focused Web 45448677948 and commercial inventory 45448678114 PASS. The staff gallery now shares only locally verified review-copy object URLs with explicitly requested per-activity saved proposal comparisons in the authorized staff catalogue. Complete bounded history, same centre/template/current version, non-rejected generated locked style/family/scene/digest and valid step required; no auto-match, no candidate byte read, no approved or family delivery. Images and authored instructions shown together with clear non-approval; collection closure and centre/role remount clear previews. Mounted adversarial and source boundary tests added. Latest exact-head tests/review pending. Real private hosted import and separately signed asset/clinical rights remain unresolved; no production deployment, paid host, publication or G2/G2b GO.

## 2026-11-24 — PR #493 complete actual artwork staff review gallery (qualification pending)

Previous `6dfb8d9` exact CI 45446485091, commercial inventory and focused Web PASS; actual Docker build and ClamAV clean fixture, harmless synthetic signature denial, missing socket/config denial independently observed in source-contract logs. New staff-only opt-in complete reference gallery on activity library for therapist/supervisor with manage permission: exact 25 named review PNGs verified as one batch, all-or-nothing local object URLs, canonical specialty/scene order, alt text, cleanup on cancel/unmount/role scope. No guardian rendering, automatic activity mapping, server upload or storage of artwork. Added mounted adversarial regressions and route scope source test. No private host transfer: Render free preview has no durable custody/scanner host; no connected desktop host. Latest exact-head CI/review pending. Gallery is local review only, not hosted artwork publication; G2/G2b NO-GO.

## 2026-11-24 — PR #493 actual scanner container CI qualification (pending)

Exact previous `cac1895` full CI 45444929977, focused Web coverage 45444939225 and commercial inventory qualification 45444929748 PASS; commercial provenance and Smart CI restored. Added mandatory full-mode source-contract step building the isolated operator Dockerfile and exercising real ClamAV UNIX-socket scanning inside the non-root, offline, read-only, capability-dropped container: clean synthetic fixture, harmless unique test-signature rejection, missing socket denial, and missing-config stage denial. Test-only local signature database is not official signature provenance or operational security acceptance; no real artwork, keys, credentials or private evidence in CI. New exact-head CI NOT RUN at commit creation. No paid host, live artwork import, production rights or clinical authorization; G2/G2b remains NO-GO. Separate host import and signed approval remain pending.

## 2026-11-24 — PR #493 commercial inventory reconciliation (CI pending)

Full CI 45422135409 on `e41f7b6` failed in commercial-provenance (`COM02_FULL_SCOPE_UNSAFE_INPUT_ENVELOPE`); Smart CI correctly propagated that failure. The new standalone `Dockerfile.artwork-custody` is automatically inventoried as a fourth container build input: 92 non-package assets (73 image/icon, 15 brand, 4 container build), up from 91. Updated the exact population across COM-02 closure, WU-LIC-01/02/03 and fixtures, with explicit custody Dockerfile presence and substitution regression. 44 npm exception versions unchanged; new build input remains legally unresolved and both editions BLOCKED. No gate weakened, no notice issued, no rights or clinical authorization inferred. Prior six mandatory jobs and focused Web coverage 45422135465 passed; replacement exact-head CI pending. Operator container deployment and its separate OS-package SBOM/licensing review remain unqualified.

## 2026-11-24 — PR #493 isolated actual-custody runtime (qualification pending)

Previous `eea68c1` exact-head six mandatory CI, Smart CI and focused coverage all PASS (45417719257/45417718401). Fresh local recovery verification of the original archive: pinned archive/manifest SHA, ZIP CRC, 25 references/100 exact file digests and Pillow decode PASS. Added separate non-web `Dockerfile.artwork-custody` and explicit `compose.artwork-custody.yaml`: non-root UID 1000, no network, no published ports, read-only root/input/evidence/signature mounts, durable 0700 custody state, real local ClamAV UNIX socket, mandatory signature age preflight and same-host verify-staged; separate from the constrained 512 MiB application preview. Shell syntax/negative command/source contracts added to existing required source tests. No paid Render service or real deployment created. New CI/review, actual container build, trusted updated signature database, signed/factual provider evidence, private host custody execution and approved rendering NOT RUN/NOT OBTAINED; G2/G2b NO-GO. This is a deployable operator recipe, not a live deployment or independent qualification.

## 2026-11-24 — PR #493 actual pack recovery and host custody reconciliation (qualification pending)

Exact source archive recovered from the owner's private Library; 72,825,383 bytes, SHA-256 `8a569794ad95a9cac7f905fd2d8140956489bf62b37875bdf94d85cd410f078b`, manifest `b573eb4f5bb578ed14c5a33688045a24950fa383afc14ed32dec11527502b2c3`. Independent local ZIP CRC, all 25 unique references/100 file hashes/dimensions/full Pillow decode PASS. Prior `a6ca903` full CI 45412387373 and focused web coverage 45412387467 PASS. Added operator-only `verify-staged` command checking complete journal, authenticated custody audit and manifests, exact source master digest, AES-GCM authenticated bytes and dimensions for all 75 encrypted custody files; no decrypted output or publication. New CI/review pending. Actual host execution NOT RUN: preview image has no ClamAV or QA scripts; private durable custody host and factual provider/rights evidence required. No public bytes, signed rights, clinical review or G2/G2b activation claimed.

## 2026-11-24 — PR #493 exact artwork review-to-custody integration (qualification pending)

The preceding `8bf14bb` passed all six required full CI jobs, Smart CI and focused web coverage (runs 45408825043/45408826252). Saved locked-reference proposals now open an exact-reference local verification and explicit staging flow, show the intended authored step, reuse the verified PNG bytes for the existing encrypted/scanned candidate endpoint, and clear local preview/bytes after staging. Wrong scope/hash is denied before submission; ambiguous staging results require inspecting candidate history rather than blind retry. Generic private candidates retain their existing picker. Mounted regression tests added; new exact-head CI/review NOT RUN. No hosted transfer of the 25-source archive, provider/rights or clinical signature, approved-media rendering, public asset delivery or G2/G2b GO claimed. Previously confirmed Render workspace inspected read-only; archive not available in this runtime, no hosted shell/transfer executed.

## 2026-11-24 — PR #493 current-version artwork mapping (qualification pending)

Added staff-manager-only current-version persisted mapping endpoint and opt-in UI snapshot for whole activity and numbered steps. Counts distinguish non-rejected proposals and proposals with an unrevoked scanned candidate; no image bytes, approval, release, or guardian access. Uses existing tenant/role/ownership checks and a repeatable-read transaction; tests added for query scope, denial, version and permission changes, stale/failure states. Full exact-head CI, eight coverage floors and independent review NOT RUN on this change. Host custody, asset-specific signed rights/clinical evidence, actual approved media delivery and M5 closure remain pending; G2/G2b remains NO-GO.

## 2026-11-22 — PR #466 CI failure triage and regression update (REQUALIFICATION PENDING)

Original HEAD `66425674`: both `test` and `measured-web` failed only two stale caseload-copy expectations (`coverage-operational-success-routes`, `coverage-m5-wu2-therapist`; test job 1841 PASS/2 FAIL), while `live-session` timed out seeking a completed session note after history was intentionally hidden by default. Preserved explicit synthetic-only/no-release checks and changed expected wording to the new actual UX. Updated the genuine PostgreSQL/two-tab live-session browser script to check collapsed history, expand it via accessible button and then verify completed note remains disabled. No assertions bypassed or checks disabled. Fresh exact-HEAD six-job CI and all eight >=90% API/Web coverage metrics **PENDING**. Do not merge pending review/owner AT; G2/G2b NO-GO.

## 2026-11-22 — M5 PR3 historical-session regression definitions (UNVERIFIED)

Extended `apps/web/test/coverage-stage2-mounted-clinical-panels.test.cjs` with actual mounted SessionsPanel cases: active editors remain present across history expand/collapse, history not mounted by default, existing review-only mode cannot start sessions. Tests committed but no exact-HEAD result has yet been verified. Verify 320/390/768/1024/1440px keyboard, assistive technology and view-source boundaries; all eight >=90% measured coverage and six required CI jobs remain hard gates, G2/G2b NO-GO remains.

## 2026-11-22 — PR #462 new tests authoring checkpoint (NOT YET FINAL PASS)

Tests committed: custom recurrence `coverage-m5-pr2-custom-recurrence.test.cjs` (actual mounted shared form, boundaries), `coverage-mounted-booking-commands.test.cjs` (3/4 week series request, invalid denial), `coverage-stage2-mounted-appointment-actions.test.cjs` (series summary 1–4), `validators.e2e-spec.ts` (contact formatting and header injection), `centers.e2e-spec.ts` (real PostgreSQL contact creation/edit/clearing, optimistic version and unauthorized coordinator denial), mounted `coverage-stage2-mounted-center-settings.test.cjs` (read-only, invalid, edit, clear), mounted profile title guidance and scoped child directory/guardian deep link tests, plus CI-only Chrome `check-demo-journey.mjs` five-width center contact visibility and guardian quick-link navigation. No clinical/patient facts or real media stored.

**Status:** test definitions committed; exact latest PR HEAD full CI, 8x >=90% metrics, independent final review, owner screenshots/AT are PENDING/NOT RUN at this checkpoint. Do not interpret older SHAs' green receipts or a draft as final qualification. Family/privacy/clinical G2/G2b remains fail-closed.

## 2026-11-22 — Gemini review follow-up tests (NOT YET RUN ON LATEST HEAD)

Added mounted two-consumer `useSyncExternalStore` theme synchronization and cross-tab storage tests, preference-with-storage-disabled fallback and stale-key isolation, AppShell icon state test, and a real coordinator Schedule browser assertion that choosing a therapist via dropdown retains the selected scope but clears the stale directory query. Gemini reported no critical XSS/tenant-isolation finding. **These are committed test definitions, not PASS evidence: new CI, coverage and final independent review pending at this checkpoint.** All clinical/production gates remain fail-closed.

## 2026-11-22 — M5 global dark clinical-assist P2 (NOT YET QUALIFIED)

Independent Codex review found that ReportDecisionAssist and HomePlanSyntheticAssist contained hardcoded white panel/field backgrounds with theme-lightened foregrounds, making explanatory and editable text unreadable in dark staff workspaces. Replaced fixed white surfaces with the existing semantic `bg-surface-white` and set explicit corresponding text where required, without changing any clinical workflow or access rule. Added shared consumer source/contrast regression. Final exact-HEAD CI and independent review and owner visual acceptance pending; G2/G2b remains NO-GO.

## 2026-11-22 — M5 global dark shared ErrorState P2 (NOT QUALIFIED)

Codex reviewed the preceding HEAD and found `ErrorState` used hardcoded dark red body text on a status-danger background now re-themed for dark staff pages. Replaced only that body foreground with shared `text-status-danger` semantic colour, respecting the existing family-specific foreground. Added light/dark 4.5:1 contrast regressions and source-integrated check. Final exact-head CI and independent review remain pending; no owner visual signoff, no clinical GO.

## 2026-11-22 — Dark specialty activity card contract checkpoint (NOT YET QUALIFIED)

Introduced CSS variable-based specialty gradients and solid tints in staff ActivityCard, avoiding near-invisible text against static light backgrounds when users select dark mode. Added source-mounted tests for single and multi-service cases and 4.5:1 contrast assertions on every specialty dark-tint/light-text combination. Full exact-HEAD CI, independent Codex and human visual accessibility acceptance still NOT VERIFIED. No old CI run is claimed for this commit.

## 2026-11-22 — PR #461 shared dark theme and cross-screen P2 checkpoint (NOT QUALIFIED)

**Implementation-only checkpoint:** shared theme code and tests added for staff + guardian across all authenticated route shells. New Playwright computed-style checks exercise 7 synthetic personas × 5 widths (header/sidebar/mobile-nav/page canvas and light-mode restoration), with mounted real/preview role tests, RGB alpha variable tests and WCAG AA text colour-pair unit checks. Children and Schedule share effective combobox selected index; child status changes reset index; guardian mobile foregrounds use family tokens. **No new exact-head CI pass or human visual/AT acceptance is asserted in this checkpoint.** Earlier CI receipts apply only to earlier SHAs. All clinical/rights gates remain fail-closed.

## 2026-11-22 — PR #461 final Codex P2 regression checkpoint

Previous exact `c4a86dba`: full CI SUCCESS, eight coverage metrics PASS (API lines 96.81, branches 91.69, functions 95.72, statements 95.38; Web lines 96.44, branches 90.32, functions 91.49, statements 94.29), live-session, Compose, browser/Child360, preview, Smart CI all green. Final Codex review identified autocomplete keyboard overflow P2, **so that SHA was not merged**. Latest P2-fix source/helper tests are committed but **NEW exact-HEAD CI and Codex review NOT YET VERIFIED**. Manual AT/visual owner QA NOT RUN. No fabricated acceptance.

## 2026-11-22 — M5 owner-feedback PR #461

**Execution status:** NEW CODE + TESTS COMMITTED; exact-HEAD CI, >=90% eight-metric coverage, hosted/viewport keyboard/screen-reader, final independent review and owner visual acceptance: **NOT RUN / NOT VERIFIED** at this log point. No fabricated PASS. Synthetic-only activity fixtures and fail-closed clinical/rights/media safeguards remain unchanged. Target tests: `apps/web/test/m5-ux-shared-feedback.test.mjs` and `apps/web/test/coverage-m5-ux-shared-feedback.test.cjs`; existing full suite is mandatory.

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

## 2026-11-20 — M5 PR1 failed focused coverage follow-up
| Run | Result | Remediation |
|---|---|---|
| Focused Web 44722525253 · 1737/1738 tests | FAIL | Actual anchor counting fixes React wrapper double-match in new pagination test |
| Latest HEAD focused/Web/API and all eight >=90% | PENDING | New CI evidence required |
| Codex on latest HEAD | PENDING | Prior review stale after test corrections |

No CI bypass/exclusions, no clinical activation; G2/G2b NO-GO.

## 2026-11-20 — M5 major PR 1 supervisor request isolation checkpoint
| Check | Status | Evidence |
|---|---|---|
| Scope changes immediately hide previous authorized review queue | IMPLEMENTED / NOT RUN | Keyed supervisor component; deferred mounted synthetic test |
| Search/page response identity guard | IMPLEMENTED / NOT RUN | Scoped request key; deferred pagination test |
| Exact current-head CI, eight >=90% metrics, final Codex review | PENDING | New HEAD must be verified independently |
| Manual usability, WCAG and five viewport acceptance | NOT RUN | External evidence required |

G2/G2b NO-GO and synthetic-only unchanged.

## 2026-11-20 — M5 consolidated PR 1 initial checkpoint
| Scope | Result | Evidence |
|---|---|---|
| WorkspaceTabs fail-closed duplicate/unsafe ID guard | IMPLEMENTED / NOT RUN | Source change and mounted adversarial test in this draft branch |
| Full exact-head CI and 8 API/Web >=90% gates | PENDING | No job receipts for this draft HEAD |
| Independent exact-head Codex review | PENDING | Request after draft opens |
| Manual WCAG, screen-reader, five-width and role usability | NOT RUN | M5-04/06/07/08/09 remain OPEN |

Clinical G2/G2b release remains NO-GO; no real data/media publication.

## 2026-11-20 — M5 major PR2 rights/hold denial slice (unqualified)
M5 PR2 rights-denial regression suite added; NOT RUN locally. Full exact-head CI, eight >=90% coverage metrics, browser/security/preview/SBOM and independent Codex review PENDING. No governance qualification.
G2/G2b NO-GO; synthetic-only; #197 remains OPEN.

## 2026-11-20 — M5 PR2 async scanner identity invariant
| Check | Status | Evidence |
|---|---|---|
| Mutable post-start center/template/draft/version cannot redirect admission evidence | IMPLEMENTED / NOT RUN | PrivateAdmission intent binding; deferred scanner Jest test |
| Exact HEAD full CI and 8 >=90% thresholds | PENDING | New CI must run and be inspected |
| Independent updated-HEAD Codex | PENDING | Request immediately after push |
| Secure persistent storage, rights and clinical release approvals | NOT QUALIFIED | M5-14 #197 OPEN; G2/G2b NO-GO |

## 2026-11-20 — M5 consolidated PR 2 initial checkpoint
| Scope | Result | Evidence |
|---|---|---|
| Quarantine scope/candidate one-shot snapshots, getters/UUID-forgery denial | IMPLEMENTED / NOT RUN | Source change and Jest adversarial tests in draft branch |
| Authenticated persistent media lifecycle | NOT IMPLEMENTED | Requires separate integrated work inside this major PR |
| Full exact-head CI and 8 API/Web >=90% gates | PENDING | No final job receipts |
| Independent exact-head Codex review | PENDING | Request after draft creation |
| Rights, design, clinical and media production approval | NOT OBTAINED | G2/G2b NO-GO; #197 OPEN |

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


## 2026-11-20 — PR #448 Codex P2 remediation checkpoint
Fixed P2: reject accessor-backed or mutated custody records and transition events using a single own-data-property snapshot. Added targeted adversarial Jest regression. Remediation code/test HEAD c9a6257e57fe5de4c9f311b9723bd5806fe1934a; full exact-final-HEAD CI and fresh independent Codex review NOT YET VERIFIED. Do not merge until all eight >=90% coverage gates and required CI/review receipts pass. M5-14 #197 OPEN; G2/G2b NO-GO.

## 2026-11-20 — M5 WU4-K immutable custody state contract
Synthetic Jest tests COMMITTED for immutable custody state contract, but exact-head CI execution NOT YET VERIFIED at PR creation; eight coverage metrics, build, browser, Compose, security/SBOM/provenance, Smart CI and reviewer qualification PENDING. Manual rights/image/clinical testing NOT RUN, no approval claimed.

## 2026-11-20 — PR #449 Codex P2 remediation checkpoint
Fixed P2: reject >8MiB or <33-byte inputs before allocating a private Buffer snapshot. Added targeted adversarial Jest regression. Remediation code/test HEAD 0833634efe44813e146de127f4b5b6c272828f83; full exact-final-HEAD CI and fresh independent Codex review NOT YET VERIFIED. Do not merge until all eight >=90% coverage gates and required CI/review receipts pass. M5-14 #197 OPEN; G2/G2b NO-GO.

## 2026-11-20 — M5 WU4-L bound candidate inspection
Synthetic Jest tests COMMITTED for bound candidate inspection, but exact-head CI execution NOT YET VERIFIED at PR creation; eight coverage metrics, build, browser, Compose, security/SBOM/provenance, Smart CI and reviewer qualification PENDING. Manual rights/image/clinical testing NOT RUN, no approval claimed.

## 2026-11-20 — M5 WU4-J pre-merge checkpoint
Synthetic regression tests committed for rights/provenance evidence helper (strict tenant/draft/template/version/digest matching and independent reviewer identity, source/license/attribution/provider evidence verification; nonpublication receipts). Execution status on new exact PR HEAD: PENDING, NOT YET VERIFIED; secret scan, SBOM, provenance, demo/browser/Compose/preview and Smart CI also PENDING. Production AV/rights/clinical image safety and 5-width manual acceptance NOT RUN. This documentation does not claim successful CI or media clearance.

## 2026-11-20 — M5 WU4-I pre-merge checkpoint
Synthetic regression tests committed for scanner attestation helper (bounded byte snapshot, required trusted scanner, matching digest and byte length, CLEAN verdict and constrained engine/signature version; reject forged, offline and inconsistent scanner results). Execution status on new exact PR HEAD: PENDING, NOT YET VERIFIED; secret scan, SBOM, provenance, demo/browser/Compose/preview and Smart CI also PENDING. Production AV/rights/clinical image safety and 5-width manual acceptance NOT RUN. This documentation does not claim successful CI or media clearance.

## 2026-11-20 — M5 WU4-H PR #445 review remediation
Synthetic Jest tests added for bounded PNG integrity verifier; remediation: Codex P2: check zlib engine consumed-byte count equals entire concatenated IDAT input; adversarial tests for CRC-correct opaque suffix and concatenated streams. Codex P1: required continuity evidence updated. Original pre-remediation run status must not be transferred to revised HEAD; revised exact-HEAD full CI/coverage and Codex review PENDING. Browser/preview/CI on revised HEAD NOT YET VERIFIED. Manual five-width accessibility, real image decoding/security acceptance, antivirus, rights, license, design/clinical review NOT RUN/NOT OBTAINED. G2/G2b NO-GO; M5-14 #197 OPEN.

## 2026-11-20 — M5 WU4-G PR #444 review remediation
Synthetic Jest tests added for private filesystem quarantine adapter; remediation: Codex P2: snapshot candidate Buffer before asynchronous filesystem work and reject symlinked ancestors of configured root; regression tests cover immediate mutation and ancestor alias. Codex P1: required continuity evidence updated. Original pre-remediation run status must not be transferred to revised HEAD; revised exact-HEAD full CI/coverage and Codex review PENDING. Browser/preview/CI on revised HEAD NOT YET VERIFIED. Manual five-width accessibility, real image decoding/security acceptance, antivirus, rights, license, design/clinical review NOT RUN/NOT OBTAINED. G2/G2b NO-GO; M5-14 #197 OPEN.

## 2026-11-20 — M5 WU4-F #443 technical qualification (not clinical approval)
Synthetic API Jest tests were included in successful CI `test` job on #443 HEAD `db2ebecf742621e7cc0acb5ab6905fd6c21d5f06`; these cover quarantine-only immutable candidate intent, fresh random object keys, malformed scope/version, forged approval flags and bad object keys. `secret-scan`, `sbom`, `source-contracts`, `commercial-provenance`, `commercial-contracts`, `live-session`, `compose`, `demo-journey`, `preview-container` and API/Web `test` jobs PASSED for that HEAD. First-attempt `m5-child360-browser` FAILED on login waitForURL 20000ms timeout; retry of failed job PASSED with test assertions unchanged; first-attempt Smart CI failed downstream and retried Smart CI final result needs validation. New-head full CI after recording this documentation is PENDING, not previously passed by association. Actual image byte upload, full decode/CRC, malware scan, rights checks, storage isolation, revocation, 5-width real accessibility and human usability approval NOT RUN. Clinical/rights/image approval NOT OBTAINED. G2/G2b NO-GO.

## 2026-11-18 — PR #436 main advancement reconciliation
Current main advanced after PR opened. This integration replays only #432's missing WU2 qualification/CI acceptance changes, retains new WU4 code and complete handover records verbatim, and preserves the more recent main Child360 domcontentloaded correction. Exact-head CI and independent review must be repeated after this reconciliation; G2/G2b NO-GO.

## 2026-11-18 — PR #436 Codex P2 remediation checkpoint
Codex identified (1) nested/private screenshot data and string-width admission in WU2 evidence and (2) a missing Child360 domcontentloaded wait, previously incorrectly described as preserved. This integration now enforces an exact root/governance/summary/observation schema, JSON primitive types and numeric widths; adversarial cases reject nested metadata, Buffer-style screenshots, unknown root keys and string widths. Restored Child360 waitUntil domcontentloaded with existing role/route/child checks unchanged. Exact-head push+PR CI and independent re-review PENDING; commercial provenance push run previously failed an unexpected Sigstore attestation and is NOT considered cleared. G2/G2b NO-GO unchanged.

## 2026-11-18 — #432 integration verification
Original PR #432 WU2 acceptance restored atop current main, also restoring the Child360 domcontentloaded navigation correction. New head 3-role/5-viewport runtime, adversarial receipt tests and exact-head push/PR CI NOT YET VERIFIED; human/screen-reader/usability approval NOT RUN. G2/G2b NO-GO.

## 2026-11-17 — WU3 qualification exact-head CI retry
Initial unstacked WU2 browser run 44147014875 failed because it lacked prerequisite M5-10 skip link; resolved by stacking on M5-10. Subsequent combined CI run 44148140688 passed the standard seven-role browser observation (175 routes, zero overflow/errors), but flagged Child360 browser hit a Playwright `waitForURL` timeout waiting for full browser `load` after login. Changed only login navigation wait to `domcontentloaded`; the existing role, authorised child, 5-width, denial, loading/retry and other substantive browser assertions remain unchanged. **Corrected current-HEAD CI pending; previous failed run not accepted**. No clinical G2/G2b or human accessibility approval.

## 2026-11-17 — WU3 WU2 role-browser qualification / M5-04 crosswalk · TEST_RESULTS.md
Implemented an isolated *_demo_test Playwright 3-role × 5-viewport (=15) technical qualification of therapist/caseload, coordinator/schedule, supervisor/governance with settled authorized markers, overflow and skip link; screenshot bytes hashed in memory and never archived. Added fail-closed adversarial schema tests (roles, widths, duplicates, sensitive fields, missing checks, approval spoofing), numeric-only evidence artifact, and execution under existing seven-role synthetic demo CI (not a new production runner). Full original CI gates preserved. Technical browser receipt is **not human accessibility or usability approval**; redacted visual review, participant task success/time and real screen readers PENDING. Exact-head CI, Codex and WU2 issue-close decision PENDING; all G2/G2b clinical gates NO-GO. See docs/roadmap/M5-WU3-ACCEPTANCE-AND-RELEASE-LEDGER.md.

## 2026-11-18 — WU4-A M5-B / M5-13 presentation & illustration standard
CI on initial head: web focused coverage PASS; other full CI checks were running. New runtime tests added; exact-head rerun pending. Manual artwork/reference review and WCAG/visual acceptance NOT RUN.

## 2026-11-18 — PR #435 two Codex P2 async UI fixes
Source contract tests added for generation guard, page lifecycle, and all metadata input coverage under disabled fieldset. Actual mounted deferred-page/slow-save visual verification NOT RUN; exact-head push/PR CI pending. Previous workflow status cannot qualify new HEAD.

## 2026-11-18 — PR #435 push-event browser CI remediation
Push-run 44310665716: m5-child360-browser FAILED at waitForURL with `waiting for navigation until load` after login, while pull_request CI was green. Smart-CI-gate FAILED consequentially because browser job failed. Corrected login wait to domcontentloaded with authenticated route and role checks intact; regression assertion added. New exact-head push and PR CI are PENDING. Do not claim PASS.

## 2026-11-18 — WU4-C Codex P2 activity ownership gate
New exact-head CI NOT RUN at this checkpoint. Author-only therapist / supervisor UI gate source-contract tests committed; browser acceptance remains NOT RUN.

## 2026-11-18 — WU4-C paginated proposal history
Paged UI helper and history-append tests committed, exact-head CI NOT YET VERIFIED. Existing head 1d4a2a1 CI PASS; do not transfer this pass to new SHA.

## 2026-11-18 — WU4-C illustration proposal UI
Initial Web focused coverage failed on stale source-string expectation; test replaced with executed API helper assertion. New exact-head CI and manual screen-reader/visual acceptance pending. No claim of accepted illustration assets.

## 2026-11-18 — WU4-B P2 media history pagination
Cursor paging (>100 records), cross-centre cursor refusal, terminal page, and bounded page sizes: regression tests committed; exact-head CI pending, NOT YET VERIFIED. Prior head full CI passed.

## 2026-11-18 — WU4-B / M5-14 activity media drafts
Initial CI test + demo-journey FAILED on test-only TS tuple assertion; fixed in later commit. P1 role/specialty reviewer findings corrected with added negative tests. Exact-head follow-up CI and five-width/manual tests PENDING; no PASS claimed.

## 2026-11-18 — WU4-A M5-B / M5-13 presentation & illustration standard
CI on initial head: web focused coverage PASS; other full CI checks were running. New runtime tests added; exact-head rerun pending. Manual artwork/reference review and WCAG/visual acceptance NOT RUN.

## 2026-11-17 — WU3 M5-10 / M5-04 shared accessibility and performance · TEST_RESULTS.md
Implemented WAI-ARIA horizontal tabs with RTL Arrow/Home/End and disabled navigation, focusable skip-to-main link and named main, explicit focus/reduced-motion/RTL CSS, accessible focusable calendar hours with date-inclusive appointment names and bounded layout, linear source-bound goal history bucketing, and optional shared compact mobile cards preserving desktop semantic table. Coordinator exception view opts into cards at narrow widths. Jest includes mounted RTL, dense exact-version history and mobile/table contracts. No changes to role, tenant, clinical release, consent or server mutation rules; G2/G2b NO-GO unchanged. Exact-HEAD CI, Codex, redacted five-width screenshots, real NVDA/VoiceOver, WCAG contrast, low-bandwidth and measured task performance **PENDING/NOT RUN**; no issue closure claim for #187/#193.

## 2026-11-17 — PR #430 CI regression: generated fixture email-name collision (TEST_RESULTS.md)
Investigated full CI `44149914183`: API integration test `centers.e2e-spec.ts` failed 1/1585 because the random base64url test password included invited local-part `tom` and the production policy correctly rejected it with HTTP 422. No application auth policy was changed. Replaced the test-only generator with 96-bit random hex bytes separated by hyphens, avoiding any contiguous three-character local-part collision; added 128-run actual-policy regression checks for staff/administrator fixture email names. Smart CI gate failure was downstream from API tests. Exact-HEAD rerun, independent review, and full WU3 acceptance remain **PENDING**; do not claim PASS or merge until verified. G2/G2b NO-GO unchanged.

## 2026-11-17 — M5-09 CodeRabbit exact-head findings correction
Independent CodeRabbit review on original PR #430 HEAD found (1) nested FamilyProgress root forcing light despite auto dark wrapper and (2) in-flight reminder save across sibling switches showing a stale toggle. Fixed route-specific `FamilyProgress theme="auto"` (internal clinician previews retain default explicit light); moved pending and server-confirmed per-child reminder state to the keyed, authorized parent; reused existing fail-closed error handling. Added real deferred-resolution and rejection mounted tests for A→B→A switch. No release/consent/role API change. **New exact-head CI and independent re-review PENDING**; initial review findings not claimed closed until results. G2/G2b NO-GO.

## 2026-11-17 — WU3 M5-09 guardian focus and theme · TEST_RESULTS.md
Implemented single authorized child focus and keyboard-operable three-sibling selector, permission-scoped family shortcuts, verified-draft versus release copy, preserved appointment/attendance history/reminder actions, keyed tenant isolation and per-child confirmed reminder choices. Family home/practice/activities/progress now use semantic auto theme, with OS dark palette applied in CSS prepaint. Updated source-mounted 3-sibling/revocation/permission/contrast smoke cases. No API approval/release or family message grants changed. Clinical G2/G2b NO-GO. Exact-head CI, Codex, manually reviewed 320/390/768/1024/1440 light/dark screenshots, screen readers, low-bandwidth and human usability **PENDING/NOT RUN**; do not close #192 without evidence.

## 2026-11-17 — WU2 M5-08 supervisor: TEST_RESULTS.md
**Issue:** #191. Implemented scoped supervisor review queue, evidence-context disclosure, status-aware reviewer decisions and filtered document selection. Existing API role checks remain authoritative; family messaging is not exposed and production signing/release G2/G2b remains **NO-GO**. New synthetic Jest tests committed; CI, Codex exact-head review, five-width screenshots, screen readers, low-bandwidth and manual acceptance **NOT RUN/PENDING** at documentation commit. Do not close #191 pending those results.

## 2026-11-17 — WU2 M5-07 coordinator/admin: TEST_RESULTS.md
**Issue:** #190 · **Branch:** `feat/m5-wu2-coordinator-admin-workspace` · **Implementation:** Center appointment summary, selected-view exception table, time-zone context and clearable staff/child filters without changing booking/recurrence APIs.
**Verification:** code and new synthetic Jest regression coverage committed; exact-HEAD CI, independent Codex review, five-width visual screenshots, real keyboard/screen-reader, performance/low-bandwidth, owner UX qualification and manual acceptance **NOT RUN/PENDING** at this checkpoint. Existing authorization and backend clinical state machines remain unchanged; no cross-tenant/family-message visibility or clinical release. Production G2/G2b clinical signing/release remains **NO-GO**. Issue stays **OPEN** pending full acceptance. Existing CI checks and Web coverage may only be marked PASS after observed exact-head results; not yet qualified.


## 2026-11-17 — WU2 M5-06 therapist: TEST_RESULTS.md
**Issue:** #189 · **Branch:** `feat/m5-wu2-therapist-workspace` · **Implementation:** Task-focused authorized caseload, scoped name and specialty filtering, session-first child care journey, explicit draft versus signing/release distinction.
**Verification:** code and new synthetic Jest regression coverage committed; exact-HEAD CI, independent Codex review, five-width visual screenshots, real keyboard/screen-reader, performance/low-bandwidth, owner UX qualification and manual acceptance **NOT RUN/PENDING** at this checkpoint. Existing authorization and backend clinical state machines remain unchanged; no cross-tenant/family-message visibility or clinical release. Production G2/G2b clinical signing/release remains **NO-GO**. Issue stays **OPEN** pending full acceptance. Existing CI checks and Web coverage may only be marked PASS after observed exact-head results; not yet qualified.


## 2026-11-17 — PR #418 post-merge CI duplication fix — QA results
Combined PR #418 with merged #415/#417 while retaining `commercial-provenance`, `commercial-contracts`, `source-contracts`, original six required jobs and all fail-closed Smart CI, SBOM, secret, database, coverage, browser, Compose and sustained-preview gates. First combined-head run 44122218560 exposed **FAIL** in `source-contracts` source regression: M4-09 and other source-only steps were accidentally duplicated in serial application `test` because merge reconstruction retained setup-node plus subsequent source-only steps. Removed only redundant source-only steps from `test` and preserved the complete checks and numeric source artifacts in independently required `source-contracts`. **Revised exact-head CI and final Codex review PENDING**; no PASS attributed to the corrected commit, no merge until verification. No policy/clinical G2/G2b or rights GO.

## 2026-11-17 — Phase 2B source-contracts follow-up
Additional Phase 2B implementation: moved 12 original source-only M5 IA/route, historic integrity, credential/hosted guard and artifact checks out of the serial application test job into independently **required** `source-contracts` full-mode job, with its own full-history checkout. Its Smart CI required-job map, fail-closed gate and frozen suite inventory were updated. Exact original source check commands and their archived evidence were retained. The main application test keeps locked dependency install, Prisma, migration, coverage and production build. Updated-head CI and Codex **PENDING**, no measured speed claim. 

## 2026-11-17 — CI Phase 2B — isolated Next.js compiler-cache reuse — QA results
Introduced only apps/web/.next/cache persistence through actions/cache@v4 for full test, live-session, demo-journey and flagged m5-child360-browser jobs. Cache keys are per job, OS/arch and lock/source hash; exact-head yarn web build remains in every job with independent build-time flags. No cached runtime bundle, clinical data or browser test outcome. Cross-environment compiled artifact reuse intentionally NOT ENABLED until equivalence is proven; CI, new-head review and timing verification PENDING. All original required gates remain, G2/G2b NO-GO.
Implementation/source assertions written; new branch exact-head execution NOT RUN/PENDING. No PASS claimed on new SHA. Prior base PR #415 full-CI outcome does not qualify this branch.

## 2026-11-17 — CI Phase 2A — independent commercial contracts — QA results
Extracted 32 standalone commercial offline/adversarial test steps (node --test and one Python unittest) from sequential commercial-provenance into an independent required commercial-contracts job. Retained producer order, all exact-version npm/Sigstore/rights steps and archived evidence. Updated fail-closed smart-ci expectedJobs and smart-ci-gate needs plus frozen suite inventory, with negative-path source tests. Full CI, exact-head Codex, runtime comparison and merge NOT RUN/PENDING. Rule 16 targeted mode locked; no approval for clinical G2/G2b or commercial licensing.
Implementation/source assertions written; new branch exact-head execution NOT RUN/PENDING. No PASS claimed on new SHA. Prior base PR #415 full-CI outcome does not qualify this branch.

## 2026-11-17 — CI parallel critical-path implementation (NEW HEAD NOT YET QUALIFIED)
| Check | Status |
| --- | --- |
| Commercial exact 59-step original verification sequence extracted into independent full-mode required job | IMPLEMENTED; full CI **PENDING** |
| Original commercial archive inputs/retention unchanged, no approval inferred | Source-preserved; **new-run artifact inspection PENDING** |
| Former test coverage/build/migrations preserved, original six required checks named | IMPLEMENTED; **new-run full CI PENDING** |
| Smart CI expected job list and final always-running gate include commercial-provenance | IMPLEMENTED; adversarial source tests added; execution **PENDING** |
| Compose no longer waits on main test, remains required success | IMPLEMENTED; execution **PENDING** |
| Four Chromium consumers cache public lockfile-keyed browser download only; `playwright install --with-deps` kept | IMPLEMENTED; execution **PENDING** |
| Existing sustained 10-min 512MiB preview and SBOM, clinical/secret checks | UNCHANGED, new-run **PENDING** |
| Baseline PR #413 pre-change `test`, live-session, demo-journey, Child360, SBOM, secret scan and Compose | Previously OBSERVED PASS on previous CI; NOT evidence for current head |
| Before/after timing and runner cost | **NOT MEASURED** |
| Final-head independent Codex/merge | **PENDING / NOT MERGED** |
| Clinical G2/G2b and commercial rights approvals | **NO-GO**, unchanged |
Details: `docs/qa/CI-PARALLEL-CRITICAL-PATH-2026-11-17.md`.

## 2026-11-17 — M5 WU1 #413 Rule 7 correction / qualification matrix
| Verification | Evidence / accurate status |
| --- | --- |
| Permission-filtered eight-area shell and shared workspace patterns | Previously merged #393 / #395; preserved |
| Desktop/mobile authorized destination search; no-match status; desktop matching groups expanded | IMPLEMENTED in PR #413; source/browser tests added; updated HEAD CI **NOT RUN/PENDING** |
| Multi-context collapsed-rail switcher; role/center search reset; mobile dialog keyboard search | IMPLEMENTED; updated HEAD CI **NOT RUN/PENDING**; revoked-context end-to-end human acceptance NOT RUN |
| WorkspaceTabs active-only ARIA controls; visible focus styles; Jest assertions | IMPLEMENTED; updated HEAD Jest/CI **NOT RUN/PENDING** |
| Original head `20707161b0`: SBOM, secret scan, Smart CI plan | **PASS**, previous HEAD only |
| Original head `20707161b0`: focused Web coverage workflow 44107832991 | **PASS**, previous HEAD only |
| Original head `20707161b0`: remaining six exact-head CI jobs | **IN PROGRESS** at inspection; no PASS claim |
| Original head independent Codex review | **FAIL/P1**: mandatory Rule 7 records not updated; all four corrected on successor HEAD, rereview PENDING |
| Updated HEAD full six CI, Web coverage, SBOM, Smart CI, final Codex | **NOT RUN/PENDING** at documentation commit |
| Five-width private screenshot review, screen readers, low bandwidth, family dark mode, revoked context, owner UX | **NOT RUN/NOT OBTAINED** |
| Clinical G2/G2b signing/release, real AI/STT, clinical approval | **NO-GO**; synthetic-only preserved |

Source and acceptance ledger: `docs/roadmap/M5-WU1-SHELL-DESIGN-CONSOLIDATION.md`. Do not close #186/#187 or merge PR #413 merely on document updates.

## 2026-11-17 — M5-05 scoped route/key + 3-task decision checks (NEW PR)
| Verification | Result |
|---|---|
| Client clinical route remount keyed to active center and child ID | IMPLEMENTED; mounted cross-child SPA test **NOT RUN** |
| Real button task flows: assessments in 2 decisions, sessions/documents in 1 each × three roles × five widths (45) | IMPLEMENTED; exact-head Chromium CI **PENDING** |
| Fail-closed receipt rejects fewer/more than 45 observations | IMPLEMENTED; CI **PENDING** |
| Prior PR #406 slow/503/retry 15+15 and scoped denied-role | PREVIOUS HEAD PASS; new PR head **PENDING** |
| Full CI, Web coverage, container/Compose, final Codex review | **PENDING** |
| Human screen-reader, UX owner acceptance, before/after visuals, actual cross-child race test | **NOT RUN/NOT OBTAINED** |
| Clinical G2/G2b signing, release, consent and AI/STT | **NO-GO**; feature flag OFF by default |
Synthetic CI only; no patient data, passwords, tokens or screenshots saved.

## 2026-11-17 — M5-05 R2 synthetic resilience browser evidence (PR #406)
| Check | Status at implementation checkpoint |
|---|---|
| 3 synthetic clinician roles × 5 widths: delayed authorized GET shows loading without clinical tab panels | IMPLEMENTED; exact-head CI **PENDING** |
| 3 × 5 simulated HTTP 503: visible safe error state and no stale clinical tabs | IMPLEMENTED; exact-head CI **PENDING** |
| 3 × 5 explicit retry after error returns authorized five-tab workspace | IMPLEMENTED; exact-head CI **PENDING** |
| Receipt validator rejects missing/forged slow-load and recovered-response counts | IMPLEMENTED; CI **PENDING** |
| Existing base #403 five-width keyboard, scoped history, denied coordinator | Previously PASS on #403; new HEAD **PENDING** |
| Human screen-reader, accessibility owner approval, full low-bandwidth field trials and task durations | **NOT RUN / NOT OBTAINED** |
| Signing/release/clinical G2/G2b | **NO-GO**, unchanged |
Synthetic CI uses loopback `*_demo_test`, build-time feature flag ON only in the isolated job. Production/default compact flag OFF. No clinical rights or release approvals inferred.

## 2026-11-16 — M5-05 PR #403 disclosure qualification evidence (CURRENT HEAD PENDING)
| Check | Result / evidence |
|---|---|
| Static implementation: default OFF, native `details`, same authorized read models | IMPLEMENTED in PR #403; no production activation |
| Previous source HEAD `fc2c3ff40e` isolated flagged `m5-child360-browser`: Enter expand/collapse + scoped care team/history, 3 roles × 5 widths | PASS (GitHub Actions CI run 43950893656, before Rule 7 docs correction) |
| Previous HEAD `fc2c3ff40e` `live-session`, dedicated web coverage | PASS (same CI/coverage runs, before documentation changes) |
| Current docs-corrected HEAD: complete six required CI jobs, preview-container, Compose, Smart CI gate, web coverage and final Codex review | **NOT RUN / PENDING** at time of this entry; prior-head green status must not transfer |
| New real-user task navigation timings, human screen-reader/WCAG and manual five-width visual acceptance | **NOT RUN / NOT OBTAINED** |
| Low-bandwidth, loading/error/blocked-state browser acceptance | **NOT RUN** |
| Clinical signing, consent/release/AI/STT G2/G2b approval | **NO-GO**, unchanged |
Codex previous-head P1 Rule 7 handover evidence was dispositioned **FIX_NOW** in this same PR. Synthetic only; no screenshots or private clinical payloads are archived. M5-05 #188 remains OPEN.

## 2026-11-16 — #400 CI rounds 1–2 fixes
Round 2 (`264a8ad`): **all 70 API Jest suites / 1585 tests PASS on Node 24.22.2 + NestJS 12**; `live-session`, `demo-journey`, `preview-container`, `sbom`, `secret-scan` PASS. The only failure was the M4-07 performance receipt validator pinning `nodeMajor === 20`; it now requires 24 (the approved runtime) and a new test rejects 20/22/26.
Round 1 on Node 24.22.2: API Jest failed with `Must use import to load ES Module` — Jest 30's `require(esm)` path also needs `vm.SourceTextModule`, i.e. `--experimental-vm-modules` (the migration guide only mentions Node >=24.9). The API `test` and `test:coverage:core` scripts now append `--experimental-vm-modules` to `NODE_OPTIONS`. `demo-journey`/`live-session` failed in `ts-node` seeding with TS 6 `TS5011` (explicit `rootDir` now required with `outDir`): the API base tsconfig sets `rootDir: "./"` (build config keeps `./src`). Local: ts-node seed compile error gone, `tsc` PASS, `nest build` output unchanged (`dist/main.js`), built app loads.

---

## 2026-11-16 — Node 24 LTS + NestJS 12 (LOCAL ONLY on Node 22; EXACT-HEAD CI PENDING)
| Check | Result |
|---|---|
| Installed tree vs Node 24.22.1 engines | PASS (0 incompatible) |
| API `tsc --noEmit` (TS 6.0.3), `nest build` (CLI 12), `require('dist/app.module.js')` | PASS |
| API Jest suite importing Nest 12 | NOT RUN — Node 22 fails with documented `ERR_REQUIRE_ESM`; requires Node >=24.9 (CI) |
| API Jest suite without Nest imports (`fingerprints`) | PASS (2/2) on Jest 30 |
| Web `tsc`, `next build`, node tests, Jest 30 full-source suite | PASS (6/6; 115 suites / 1570 tests) |
| All `scripts/**/*.test.mjs` (incl. new Yarn-alias tests) | PASS |
| CI `test` non-DB steps replayed | PASS except Sigstore steps 37/40 (local limitation, same as `main`) and M4-09 ancestry (shallow clone) |
| npm advisory bulk check | 3 (dev tooling: `glob`, `minimatch`, `deepmerge`) |

---

## 2026-11-16 — COM-02 non-DT successor after PR #394 Next.js 16 (NOT YET QUALIFIED)
Current merged-main locked population is **46=25 DefinitelyTyped+21 other**. New successor reproduces workqueue tests and CI report archiving from #397 on updated main. #397's pre-upgrade CI run 43804692729 had the new workqueue test and generation PASS, and initial P1 handover records corrected; those results cannot be represented as testing the successor's upgraded dependency graph. Final-head successor CI = NOT RUN/PENDING, final-head Codex = PENDING; no publisher, commercial or clinical attestation, actual release image nor human legal approval. Earlier 53=26+27 and 47=26+21 are historical.

## 2026-11-16 — #394 Codex P2 (image layers) fix (LOCAL; exact-head CI PENDING)
| Check | Result |
|---|---|
| `check-image-no-sharp.sh` on simulated `docker save` archives | PASS clean (2 layers incl. gzip); FAIL as expected on a layer with Yarn-cached `sharp`; FAIL as expected with no layers |
| `m2-h06-frontend.test.mjs` same-layer contract | PASS (9/9); FAILS as expected when the strip is moved back to its own `RUN` |
| Real image build + layer scan | NOT RUN locally (no Docker daemon) — `preview-container` and `compose` CI authoritative |

---

## 2026-11-15 — #394 sharp removal (LOCAL; exact-head CI PENDING)
| Check | Result |
|---|---|
| `next build` + `next start` with `sharp`/`@img` removed | PASS — `/login` 200, `/_next/image` 404 |
| Strip command on a simulated tree (root + nested `sharp`, `@img`) | PASS — all removed, verification passes |
| `scripts/qa/m2-h06-frontend.test.mjs` incl. new image/sharp contract | PASS (9/9); negative check with an injected `next/image` import FAILS as expected |
| Docker image build | NOT RUN locally (no Docker daemon) — `preview-container`/`compose` CI authoritative |

---

## 2026-11-15 — Next 16.4.6 + React 19.3 (LOCAL ONLY; EXACT-HEAD CI PENDING)
| Check | Result |
|---|---|
| Installed tree Node 20.20.2 engine compatibility | PASS (0 incompatible) |
| Web `tsc --noEmit`; `next build` (Turbopack) | PASS — 41 app routes + `/_not-found`, `ƒ Proxy` present |
| Web `node --test` | PASS (6/6) |
| Web Jest full-source suite on React 19.3.1 | PASS (114 suites / 1563 tests), coverage audit PASS |
| All `scripts/**/*.test.mjs` | PASS |
| CI `test` job non-DB steps replayed (incl. COM-02 closure ledger, DT probes, M4-08 inventory, M2-H06) | PASS |
| COM-02 Sigstore steps 37/40 | NOT RUN locally (workspace cannot reach Sigstore; same as `main`) |
| API PostgreSQL e2e, live-session, demo-journey, preview-container, compose | NOT RUN locally |
| npm advisory bulk check | 3 remaining (dev-tool transitive), down from 7 |

---

## 2026-11-15 — M5-03 P2 responsive More/scroll checks (NOT YET EXACT-HEAD CI)
Prior CI head revealed TS native details `defaultOpen` unsupported; replaced by controlled `open` and Web build progressed. Exact-head Codex subsequently raised two P2: stale hidden modal after crossing desktop breakpoint, background scroll chain during drawer. Added scoped matchMedia listener and root/body style lock+restore; browser journeys now require 7/7 desktop+mobile navigation AND semantic closure at 1024 then 320 and scroll style restoration. Source tests assert breakpoints/lock cleanup. Full rerun & fresh Codex still required; no UX or clinical certification.

---

## 2026-11-15 — M5-03 grouped shell (UNQUALIFIED UNTIL CI)
Added source test ensuring 20 exact permission identities grouped as merged M5-02 eight-area proposal, preserving family-vs-center Activities. Browser CI seven roles each check desktop rail, mobile quick links, More dialog Tab/Shift+Tab and Escape focus, and exact granted current session navigation vs source NAV. Existing 175 route/viewport observations and M5-01 keyboard receipts retained/extended; no full screen-reader, human task or visual UX approval claimed. Clinical G2/G2b NO-GO.

---

## 2026-11-15 — PR #311 exact-head CI round 1 and live-session root cause
Head `29fdda8`: `test` (full API PostgreSQL e2e + all COM-02 Sigstore steps), `sbom`, `secret-scan`, `demo-journey`, `compose` PASS. `live-session` FAIL (reproduced twice): first autosave PATCH 422 *Performed activities require objective…* with `objectiveLength: 0` while outcome/assistance were set. Root cause: SessionEditor minted the new activity UUID **inside** the `setActivities` updater; Next 15's App Router runs React 19 (bundled 19.2 canary), whose update rebasing replays updaters, re-keying the row and dropping the first edit. Fixed by minting the id once per click outside the updater; new Jest regression (replayed updaters) FAILS on the old code and PASSES on the fix. Separately, Playwright 1.55 settles held routes when their handler is unrouted, so the live race test now continues the held PATCH before unrouting (same race exercised). Local: web tsc PASS, web Jest 114 suites / 1562 tests PASS, coverage audit PASS. New exact-head CI PENDING.

---

## 2026-11-15 — PR #311 coherent security upgrade (LOCAL ONLY; EXACT-HEAD CI PENDING)
Local workspace (Node 22.23.4 with `--ignore-engines` for install only; installed tree checked separately: 0 packages incompatible with Node 20.20.2):
| Check | Result |
|---|---|
| API `tsc --noEmit` (Prisma client generated offline) | PASS |
| API `nest build` | PASS |
| Web `tsc --noEmit`, `next build` (Next 15.5.29) | PASS |
| Web `node --test` unit tests | PASS (6/6) |
| Web Jest full-source coverage suite | PASS (114 suites) |
| All `scripts/**/*.test.mjs` | PASS |
| CI `test` job COM-02 steps 13–34, 36–37, 39–57 replayed | PASS |
| COM-02 steps 35/38 (npm 11.19.1 Sigstore receipt) | NOT RUN locally — same local limitation as `main`; CI authoritative |
| Direct dependency evidence check | PASS (39 entries, approval NONE) |
| API PostgreSQL e2e, live-session, demo-journey, preview-container, compose | NOT RUN locally |
| npm advisory bulk check of yarn.lock | 7 remaining (pre-existing transitive), down from 63 on main |

---

## 2026-11-15 — M5-02 task IA crosswalk (UNQUALIFIED source design)
Added canonical inventory-to-eight-task-area pure source model, enforcing 66 feature IDs, 91 workflow IDs, 20 current nav rows, 7 persona review candidates, two V2 excluded items and no false route permission or UX pass. Adversarial tests and CI receipt wired, but final-head run not yet verified. No in-app change, no screenshots, no screen reader, no end-to-end clickable task tests and no approved human UX signoff; #185 OPEN, G2/G2b NO-GO.

---

## 2026-11-15 — M5-01 keyboard route journeys and timing metric addition (UNQUALIFIED)
Source instrumentation adds 175 route-settle time samples and seven keyboard-path samples to existing isolated synthetic browser CI. New negative tests reject forged PASS, invalid timings, missing/duplicated personas and unsafe receipt fields. Final-head execution not yet verified; task timings, human visual checks and screen-reader validation still NOT RUN. #184 OPEN, clinical G2/G2b NO-GO.

---

## 2026-11-15 — M5-01 client settlement and async failure classification (NEW HEAD PENDING)
Codex P2 observations: 100ms post-DOM wait insufficient for hydrated screens; top-level HTTP 200 cannot prove client data load. Implemented visible loader + aria-busy bounded settling, explicit session/client error, forbidden/timeout outcomes and regression tests. Final-head CI and Codex NOT YET QUALIFIED. Screenshots are transient and not human-reviewed, #184 OPEN, G2/G2b NO-GO.

---

## 2026-11-15 — M5-01 browser viewport capture implementation (CI PENDING)
Added source-derived 175 synthetic route/viewport attempts using real Chromium and disposable database, screenshot SHA-256 and temporary cleanup; output contains only enums/numbers/hashes. Fail-closed schema tests added but NOT YET EXECUTED on final HEAD. No user-oriented screenshots reviewed or UX acceptance; #184 OPEN, G2/G2b NO-GO.

---

## 2026-11-15 — M5-01 source audit: first receipt and P2 regression follow-up
First CI audit step on PR #380 SHA 838d0daa PASS with archived source-only JSON: 41 routes, 20 navigation entries, seven personas, five widths, 175 pending capture points (0 screenshots). Codex P2: partial NAV extraction on object spreads / double-quoted permissions; parser now rejects unsupported items and tests exact literal permissions. **Latest parser-fix head CI/independent review PENDING**. Source-only evidence is not user acceptance; G2/G2b NO-GO.

---

## 2026-11-15 — M5-01 source-only route audit (NEW HEAD CI PENDING)
Created negative regressions for duplicate canonical Next routes, missing navigation, malformed NAV parsing, symlink avoidance and fabricated capture PASS. Full repo audit emits a sanitized JSON inventory and 175 NOT_RUN capture targets to CI artifact. **Tests not yet run on the proposed branch**; screenshots and measured tasks NOT RUN; no accessibility or owner signoff. #184 OPEN, G2/G2b NO-GO.

---

## 2026-11-15 — Protected hosted Render deployment attestation negative tests (NOT RUN)
Added mock Render HTTP GET checks for one latest live deployment with same exact SHA as operator input and current checkout; rejects wrong repo/service, missing token, malformed SHA, stale/newer failed deploy, multiple live deployments and non-200 response. Wired into protected workflow ahead of credential preflight. No protected environment access, no live hosted test, no new CI result yet. Old Render service remains 3cdd722...; previous ten-account run 84 PASS / 0 FAIL / 14 governance BLOCKED does not satisfy M4-02 hosted two-tenant gate. G2/G2b NO-GO.

---

## 2026-11-15 — M4-CLOSE-02 isolated real-PostgreSQL tests and fail-closed hosted receipt (NOT RUN)
Added 3 new real PostgreSQL two-valid synthetic center HTTP tests (authorized reads, foreign-center/foreign-child 403/404 masking with a valid actor, suspended membership revocation even with stale assignment, expired session 401 without harming another center). Added hostile receipt tests for boolean-only v1, duplicate or missing checks, false positive HTTP 401, mismatched protected run, and missing independently existing targets. Execution on latest PR CI is PENDING; NO PASS claimed. Previous protected 42605446171 attempt 2 = 84 PASS / 0 FAIL / 14 policy BLOCKED, not final hosted acceptance. Real Render demo remains on 3cdd722... old SHA. No clinical G2/G2b approval.

---

## 2026-11-15 — M4-CLOSE-01 ancestry and evidence audit (NOT RUN on new HEAD)
New source-executing Node tests assert three exact historic merged SHAs #274/#275/#276, a read-only ancestry command sequence, failure on unreachable commit, incomplete history, forged scope and invalid SHA, plus false-lease and clinical-approval fields set to false. Full CI step wired with checkout fetch-depth 0. **Test execution and full exact-head CI PENDING**; do not claim PASS based on prior #358. Prior #358 exact-head 43692201180 and Web focused 43692201195 SUCCESS; API branches 90.03%, Web branches 90.08% at 93/154 full-source denominator. Hosted protected run 42605446171 attempt 2 = 84 PASS / 0 FAIL / 14 BLOCKED; hosted multi-tenant and revoked-account acceptance still NOT QUALIFIED. G2/G2b NO-GO.

---

## 2026-11-11 — COM-02 #361 release file digest candidate QA (NOT YET RUN)
Added offline `node --test scripts/commercial/review-release-scope.test.mjs` covering empty release manifest fail-closed behavior, immutable OCI digest and SHA256 image-file candidate matching without claimed signatures, duplicate edition/path, traversal, invalid SHA or bytes, counterfeit commercial approvals and missing 53/91 inventory subsets. CI adds output `therabridge-com02-release-scope-review.json`. All image runtime presence statuses stay NOT_INDEPENDENTLY_ATTESTED with zero images initially. Exact-head full CI, Codex pending. Commercial approval 0; G2/G2b NO-GO.

---

## 2026-11-11 — COM-02 #359 observed candidate hash evidence, P2 fix pending exact HEAD
Initial CI producer PASS and bulk review artifact generated. Measured 53 package exceptions, 91 assets, 15 pinned root source matches, 8 curated source revisions, 9/9 literal HTTPS immutable source bytes successfully SHA-256 hashed. All 53 source-publication attestations and 91 actual release presence reviews remain outstanding; **0 legal approvals/THIRD_PARTY_NOTICES**. Codex P2 prior source fetch timeout previously blocked consolidated report; implemented retained unresolved row with no license fetch for any upstream HTTP error (including 404), TIMEOUT or SOURCE_FETCH_FAILED. Added two deterministic negative tests (transient upstream and contradictory source identity). **Final exact-head full CI and clean independent Codex not yet confirmed**; do not interpret text hash as license rights. Clinical G2/G2b NO-GO.

---

## 2026-11-11 — COM-02 mega PR #359 bulk evidence QA (PENDING)
New offline `node --test scripts/commercial/build-bulk-rights-evidence.test.mjs` covers 53-version/91-asset schema joins via small synthetic fixtures; forged approvals, missing/duplicate package/asset, locked integrity or source revision mismatch, unsafe curated path/host, invalid raw UTF-8, network 404 and bounded concurrency. CI producer emits `therabridge-com02-bulk-rights-evidence.json`, never third-party license texts or legal grant. Initial baseline has 53 package exceptions, 91 source assets; 8 curated source versions and 9 candidate immutable upstream LICENSE paths. **Exact-head CI NOT YET RUN/QUALIFIED**, no live 9/9 file existence claimed. Legal approvals 0; G2/G2b NO-GO.

---

## 2026-11-11 — COM-02 #357 measured source correspondence QA (DEDICATED TEST PASS)
**PASS** 7/7 `node --test scripts/commercial/corroborate-source-revisions.test.mjs` on code SHA `8c645d0feb79ddd7fc8cea24425aa6c722e2631b`, CI [42923019170](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42923019170). Positive root package identity, strict GitHub host/full SHA, wrong name/version, invalid bytes/UTF-8, unavailable GitHead, spoofed hostname, publisher/lock mismatch, tampered approvals and bounded concurrency covered. Generated report counts `{exceptions:53,sourceRootManifestMatches:15,stillRequiresIndependentAttestation:53,authoritativeLicenseTextsVerified:0,legallyApproved:0}`. Earlier initial HEAD 4ee9a2 had **FAIL** on wrong test fixture; fixed in 6a8c960 with reviewed P1 disposition. At writing time full integration/preview job on code SHA remained incomplete, so this is **not a full-CI pass claim**. Documentation-only HEAD now must be requalified. Clinical G2/G2b NO-GO.

---

## 2026-11-11 — COM-02 #357 source correspondence collector tests (NOT YET RUN)
Added offline tests for strict exact GitHub origin (no credentials, subdomain spoofing, SSH, queries or traversal), 40-hex commit, immutable root `package.json` name/version and SHA-256, invalid JSON/UTF8/size, preserved missing GitHead and 404/untrusted states, zero authorization and tampered scope. CI runs `node --test scripts/commercial/corroborate-source-revisions.test.mjs` and archives `therabridge-com02-source-correspondence-candidates.json`. Required exact-head CI is pending. No publisher/source correspondence independently attested, no authoritative LICENSE text approval or commercial grant, no G2/G2b activation.

---

## 2026-11-11 — M4-08 Stage 3 PR #353 full-Web instrumented source audit
**PASS focused source-executing audit:** focused run [#42913539171](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42913539171) on code HEAD `96941265146be1803a32d96c7d1124f57e207cb4`: 88/88 Jest suites, 832/832 Web tests PASS, 154/154 instrumented production modules, 9 modules with no executed statements, 90.13% lines / 81.04% branches / 79.24% functions / 86.62% statements. 90% Web line-only Stage 3 target PASSED, no production-module omission, 9 zero-statement files retained. Full 95% M4 API/Web four-metric acceptance **FAIL / NOT QUALIFIED** (lines below 95, branches below 95, functions below 95, statements below 95); separate ≥95% security-critical branch suite and signed clinical G2/G2b gates still unmet. Original full CI on code-head `9694126` passed application tests, SBOM, demo-journey, live-session and Compose but history-wide secret scan FAIL under default generic-api-key for exactly one synthetic recovery test fixture. Proposed strictly scoped allowlist (only default generic-key rule, exact source path, exact noncredential mismatched-password fixture value) is UNVERIFIED pending NEW full CI on final documented head. Preview-container load was still running at prior inspection. Do not infer merge readiness, legal permissions, clinical signing, guardian release or hosted production acceptance from Jest counts.

---

## 2026-11-11 — COM-02 #355 P2 timeout and scanner qualifications (PENDING NEW HEAD)
Added mocked HTTPS trickle stream regression requiring absolute deadline and rejected non-200 response regression requiring immediate request destruction; existing immutable source SHA/path and approval-adversarial tests remain. Earlier code HEAD CI found secret-scan FAILURE: `generic-api-key` on `apps/web/test/coverage-stage3-mounted-recovery-and-feasibility.test.cjs` from a separate Web branch in all-ref history (not a real licensing secret). Added scoped exact fixture allowlist, awaiting new-head Gitleaks verification. **Do not claim PASS** until required latest-head jobs complete. No legal approval, final notices or clinical G2/G2b activation.

---

## 2026-11-11 — COM-02 #355 immutable license source QA (NOT RUN)
Offline tests added: full exact Git commit SHA, reject branch/path traversal, preserve unmapped exceptions, reject invalid or oversized UTF8 text, SHA256 of pinned text only, maintain unresolved package-version correspondence, HTTP failure preservation, false approvals/duplicate or phantom mappings. CI command: `node --test scripts/commercial/verify-immutable-license-texts.test.mjs`; subsequent evidence output `therabridge-com02-immutable-text-evidence.json`. Full exact-head CI and Codex pending. Source mapping register empty (0 independently corroborated Git commits), so expected counts 53 unmapped and 0 verified source texts or legal approvals until actual CI confirms. G2/G2b NO-GO.

---

## 2026-11-11 — COM-02 #352 registry metadata candidate QA (CODE HEAD PASS; DOC HEAD PENDING)
**PASS** on implementation SHA `e0ee645ced29bbe2d603c125e013646a343c1a02`, full CI [42908445420](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42908445420): 6/6 `collect-upstream-license-candidates.test.mjs` tests PASS, malformed response/wrong version/unsafe selector/unavailable HTTP state/fabricated legal approval/duplicate missing row/bounded concurrency regressions exercised. The collector generated `{exceptions:53, exactVersionMetadata:53, missingOrInvalidMetadata:0, authoritativeLicenseTextsVerified:0, legallyApproved:0}`. Required test, secret-scan, live-session, preview-container, demo-journey, Compose and Smart CI passed on SHA. Prior P1 fixture-hash comparison FIXED and resolved; Codex P2 Rule 7 synchronization FIX_NOW in this docs commit. **New documentation HEAD CI and final exact-head review NOT YET RUN**, and this previous success cannot qualify subsequent HEAD. Registry manifest license strings remain candidates only; 0 authoritative exact-version upstream license texts, 0 commercial permission grants, G2/G2b NO-GO.

---

## 2026-11-11 — COM-02 PR #352 exact-version registry candidate tests (NOT YET RUN)
Added offline Node tests for exact scoped package/version URL encoding, invalid/ambiguous versions, mismatched registry manifest identity, byte and parse bounds, registry 404/invalid states, no silent exception loss, fabricated approvals, immutable manifest digest and limited concurrency. CI executes `node --test scripts/commercial/collect-upstream-license-candidates.test.mjs` then generates per-run evidence JSON. **PASS/FAIL pending actual GitHub Actions execution**; prior merged #350 results (53 package-version exceptions, 91 assets, 0 approvals) are baseline only, not evidence of this PR passing. No authoritative upstream license text, sublicense or clinical approvals inferred.

---

## 2026-11-10 — COM-02 exact-version rights register QA (PR #350)
**PASS on prior implementation HEAD `0cf822ace6195d43b281e0a056fcc85d64f5b7d6`**: full GitHub CI [42901575999](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42901575999), including application/test, SBOM, secret scan, live-session, demo-journey, Compose, sustained 10-minute preview and Smart CI. `node --test scripts/commercial/build-license-exception-register.test.mjs` PASS, with positive deterministic per-version evidence and negative tests for duplicate package versions, fabricated commercial approval, inconsistent publisher-license matches, missing installed evidence, phantom publisher records and 0 inferred legal clearance. CI generated: 42 direct; 621 non-direct; 52 without recognized publisher-root LICENSE/NOTICE; 1 unsupported PAX semantics; 53 exception rows; 91 tracked non-package assets; 0 legal approvals. Codex P2 missing-installed-version finding FIXED/RESOLVED; subsequent P1 handover-evidence synchronization FIX_NOW in this documentation update. **New HEAD full CI and final independent review NOT YET RUN**, so do not claim PR merge qualification from the prior success. No upstream license rights, SaaS/enterprise resale permissions, clinical activation or release clearance were tested/approved.

---

## 2026-11-10 — COM-02 non-direct exhaustive evidence (PENDING CI QUALIFICATION)
Added tests proving only exactly pinned SWC 14.2.33 variants gain higher archive caps; unrelated names/versions remain on original caps. Added tests for full observed non-direct population with zero sample deferrals and fail-closed missing-lock cases. Exact-head CI, full publisher artifact and independent Codex review PENDING. The audit result is technical hash provenance, not package legal clearance or redistribution rights.

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

## 2026-11-10 — M4-08 Stage 2 #345 source-executed Web coverage VERIFIED BELOW TARGET
Focused Actions [run #42887887583](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42887887583) on `684565cb64c7cbcfa07266f14893a0591fcfb426`: **PASS 45/45 Web Jest suites, 402/402 tests**, plus prior node-test contract and real audited Istanbul full-source coverage. 154/154 Web source files, no excluded modules; 17 files with zero executed statements. Lines **68.59%**, branches **56.54%**, functions **49.89%**, statements **63.15%**. Stage 1 60% was met and merged in #339; Stage 2 >=80% **NOT MET (11.41 points short)**. New tests execute mounted React actions and API-boundary negative states, with a production fix to stale prior-center summary requests. This focused run is NOT a complete original final-HEAD CI, security-critical 95% branch qualification, clinical acceptance, commercial authorization, hosted multi-role QA, real patient use or release. G2/G2b NO-GO remains enforced.

---

## 2026-11-10 Web M4-08 PR #339 Stage 1 source-wide line coverage: focused CI #42873722265 PASS, head ed3a750946f5a2f1ec38355daa5cb64aabc11b33. 154 / 154 source modules instrumented (no exclusions): 60.08% lines; 48.75% branches; 40.33% functions; 54.24% statements. 18 modules have zero executed statements. Stage 1 owner-approved ≥60% all-source Web LINE target: MET. This is not 95% application coverage, nor 95% security branch coverage, nor final M4 acceptance. Full original exact-head CI and independent review are still required. Commercial SBOM new renderer evidence now records PENDING_UPSTREAM_REVIEW with no license approval. No clinical authorizations changed.

---

## 2026-11-10 — M4-08 mega PR #339 latest measured Web checkpoint (FOCUSED CI PASS; M4-08 NOT QUALIFIED)
- Source-wide genuine Web Jest/Istanbul focused CI #42867251775, branch SHA 2d3839b8acab8dc1f94518a0d75232deb4ad283b: PASS. Denominator 151 Web source files, including 25 zero-statement-coverage modules.
- Web metrics: **51.61% lines, 39.18% branches, 31.28% functions, 45.34% statements**. Stage 1 ≥60% lines: **FAIL / NOT MET**, gap 8.39 points. Stage 2 80%: NOT STARTED.
- Added executed synthetic tests for source-bound/clinical record projections, member and center permissions, family and clinical route states, application decisions, and actual React state transitions in report-to-plan idempotent handoff, error retry, clinician checkpoint choice, guardian reminders and report autosave.
- Focused CI is supplemental, NOT proof of six full original jobs on final HEAD; final-head CodeX and integrated API/security evidence PENDING. No clinical approval, release, real patient data or deployment. G2/G2b NO-GO.

---

## 2026-11-10 — M4-08 Stage 1 PR #339 genuine Web-coverage expansion (NOT YET QUALIFIED)
- OWNER POLICY: general Web lines target staged 60% then 80% (issues #337/#338); security-critical Web logic separately targets ≥95% measured branches. All-source Istanbul denominator and all four metrics preserved. No automatic clinical clearance.
- EXECUTED-TEST FILES ADDED (source-executing Jest, synthetic): coverage-versioned-evidence-regressions.test.cjs and coverage-transport-permissions.test.cjs, covering source/version attribution, missing/reordered/changed evidence, saved-plan snapshots, center/supervisor routes, protected clinical/report command boundaries, and public vs protected invitation operations.
- NEW TEST EXECUTION: NOT VERIFIED on final head yet. Baseline before #334: 151 Web production source modules; lines 10.63%, branches 7.05%, functions 7.86%, statements 9.89%; 123 unexecuted. Re-measure at #339 final head; do not cite previous baseline as current.
- Stage 1 >=60% measured Web line acceptance: **NOT QUALIFIED**. Stage 2 80% **NOT STARTED**. No changes to API/clinical approval; G2/G2b NO-GO.
- Mandatory six-job CI / Smart CI / SBOM / gitleaks / Codex final HEAD: IN PROGRESS, not asserted green. Codex initial P1 Rule 7 handover sync addressed in this update; final-head re-review pending.
## 2026-11-10 — COM-02 next and transitive evidence qualification PENDING
Authored offline test cases for transitive-only selection, source/SRI integrity, installed license matching/mismatch, false approvals and missing lock integrity, plus pinned-version archive limit tests and mandatory SRI for Next.js. Exact-head GitHub tests, network sampling and Codex pending. No real clinical data, legal clearance or signed contract flows tested/authorized.

---

## 2026-11-10 — COM-02 expanded publisher and transitive asset evidence (PENDING QUALIFICATION)
Added regression tests covering installed LICENSE/NOTICE matches/mismatches, false approval rejection, and transitive/asset matrix isolation. Exact-head GitHub test execution and Codex independent review pending. CI must fail on authentic publisher integrity or installed-file hash mismatches and preserve audit artifacts; downloaded publisher text is not copied to repository.

---

## 2026-11-10 — COM-02 publisher tarball evidence (NOT YET CI-QUALIFIED)
Authored tests verifying synthetic tarball SRI, top-level license hashes, tampering rejection, strict registry host validation, invalid archives/lockfile and false approval gates. Local fixtures passed (6/6) before GitHub submission; GitHub CI and exact-head Codex PENDING. The real registry evidence sample is capped and is NOT the entire dependency population or legal clearance.

---

## 2026-11-10 — COM-02 installed-to-Yarn-lock provenance evidence (NOT YET QUALIFIED)
Authored Node tests for version matching, missing versions, false legal approval, duplicate paths, malformed/missing lock entries and untrusted resolved sources. Local fixture tests passed before submission; exact GitHub head full CI, new artifact and Codex review PENDING. No real patient data, billing, licensing activation or clinical NO-GO changes.

---

## 2026-11-10 — COM-02 installed license triage wave 2 (NOT QUALIFIED)
- New tests cover normal triage, forged approvals, malformed hashes/byte lengths, duplicate paths, file-count contradictions, path escapes and compound license candidates. Authored, not yet CI-run on this head.
- Full-CI artifact will include installed-license review queue; no legal/redistribution/clinical approval is implied.
- Full six-job CI, SBOM and Codex final-head review: PENDING.

---

## 2026-11-10 — COM-04 contract draft qualification (NOT RUN)
- Public draft clause completeness/contract-stack review: AUTHORING ONLY; not external counsel review.
- Exact-head CI, source SBOM, secret scan, Codex: NOT YET RUN on this PR head.
- Legal/IP/third-party licensing, UAE health/child data and clinical release: OPEN / NO-GO.
- No runtime, migration, payments or clinical feature changes.

---

## 2026-11-10 — PR #329 Codex P2 workspace local dependencies (FIXED IN CODE, QUALIFICATION PENDING)
- Existing old-head full CI: PASS, but old root-only installed-package artifact is incomplete for non-hoisted packages.
- New regression: hoisted plus apps/api and apps/web physical installed dependencies, symlink avoidance and unsupported workspace glob: AUTHORED, NOT YET RUN on new head.
- Whole-workspace installed dependency inventory totals: NOT VERIFIED until exact-head artifact reviewed.
- Exact-head Codex and CI: PENDING; legal/clinical approval remains OPEN/NO-GO.

---

## 2026-11-09 — COM-02 installed license collector extension (NOT RUN at checkpoint)
Earlier CycloneDX and classifier artifacts inspected: 695 components; no license fields, 695 unknown; this is a verified scanner limitation, NOT commercial clearance. New collector tests and installed package license-file artifact: NOT RUN / NOT VERIFIED on latest head. Full CI and exact-head Codex: PENDING. Direct evidence ledger count 38 with 16 publisher references/22 pending is only a first-pass source summary, not legal approval.

---

## 2026-11-09 — COM-02 direct evidence ledger validation (NOT RUN)
- Source publisher license checks: UPSTREAM GENERAL INFO ONLY; exact locked version, tarball text and package hashes NOT VERIFIED.
- Direct evidence index: 38 declarations; 16 upstream references, 22 pending, 0 legally approved (static authoring count; automated parity checks NOT RUN yet).
- `check-direct-evidence.mjs` regression suite: NOT RUN.
- Full CI, SBOM and actual artifacts on proposed PR head: NOT VERIFIED.
- Independent Codex review: PENDING.
- Commercial ownership, redistribution/attribution and clinical production approvals: BLOCKED/NO-GO.

---

## M4-08 fifteen-route workspace state matrix — UNQUALIFIED UNTIL EXACT-HEAD CI
Added Jest tests executing real Next.js pages for clinical, children, team, schedule, progress, governance, access review, family progress, practice, feedback, setup, centers, center details, profile and activities across loading/error states, plus zero-assignment guardian practice, empty clinical list and messaging disabled state. Workspace/useLoad fixture replaces session/server only, not full integration. Real browser interactions and backend authorization remain separately tested. 151-file denominator and 95% acceptance untouched. Updated numeric receipt pending.

---

## M4-08 API source-boundary coverage — NOT YET CI QUALIFIED
New Jest tests execute API policy, cookie, security and password code on positive and negative branches. No patient or network traffic or clinical actions. The first test job failed 1 of 732 tests on invalid empty cookie name handling; parser corrected and final-head CI pending. Source-wide coverage / CI / Codex evidence pending. Target 95% per API/Web metric remains unmet.


---

## M4-08 Web real-route and permission-navigation coverage — NOT YET CI QUALIFIED
New synthetic source-executing Jest SSR test exercises login, reset/forgot password, unauthorized/404/error routes, form controls and ProductShell role-scoped route visibility (guardian, coordinator, therapist, platform admin, no selected context). This checks markup/permission filtering, not interactive browser behavior, API authorization or clinical release. Final CI, Codex and updated 151-source metrics pending. Target 95% remains unmet.

---

## M4-08 Web auth/time zone execution wave 3 — UNVERIFIED UNTIL CI
Added real ts-jest executed tests for preauth CSRF reuse, 401 session invalidation, forbidden stale CSRF mutation, 204 and error handling; Dubai and New York DST appointment date safety tests. No external requests or patient data. Source-wide coverage metrics and exact-head Codex/CI pending. Target 95%, G2/G2b NO-GO.


---

## M4-08 UI rendering + synthetic dictation tests — NOT YET QUALIFIED
Web coverage wave 2 adds Jest React SSR presentation regression tests, accessible tab keyboard dispatch and synthetic-only dictation finite-state/protection cases. No DOM browser or patient data needed; no false release result. Final measured coverage figures, six-job CI, SBOM and exact-head Codex pending. Clinical NO-GO remains in force.


---

## 2026-11-09 — COM-02 license classifier PR test plan (NOT RUN)
- Source CycloneDX classification, risky/unknown flags and no-auto-approval contract tests: NOT RUN.
- New per-commit license review JSON and notices review artifact: NOT VERIFIED.
- Existing SBOM lock coverage, secret scan, all six application jobs, Smart CI gate: NOT VERIFIED on proposed head.
- Independent Codex review: PENDING.
- Actual license compatibility and commercial owner rights: OPEN; clinical production NO-GO.



---

## M4-08 Web domain executable regression wave — NOT YET CI QUALIFIED
Added synthetic Jest tests with positive and negative flows for eight previously unexecuted Web source modules, plus an instrumented Web summary consistency regression. This is incremental genuine instrumented coverage, not a blanket 95% result. Await actual end-to-end run, source-wide coverage file counts, exact-head Codex and six original CI passes; all clinical approvals remain NO-GO.



---

## M4-08 integrated coverage PR — qualification pending (2026-11-09)
New Node regression tests cover genuine two-sided measurement, below-threshold reporting, forged Web denominators, invalid counters, provenance gaps and 100%-but-still-unapproved safety. CI will emit short-lived sanitized `m4-08-integrated-coverage-<run_id>` artifact. Actual current percentages, six-job final-head CI and Codex disposition remain NOT VERIFIED until executed. G2/G2b NO-GO unchanged.


---

## 2026-11-09 — COM-02 SBOM reconciliation qualification pending
Previous PR-head SBOM job failed with 673 lockfile entries and 666 scanner-discovered; seven missing package name/version pairs, including fsevents, aliases and Playwright. New reconciliation and negative regression added to address that without fabricating licensing metadata. **New-head CI: NOT YET VERIFIED; new-head Codex review: PENDING.** Full commercial rights and vulnerability clearance NOT established; clinical production NO-GO.

---

## 2026-11-09 — COM-02 continuous SBOM PR test plan (NOT RUN at authoring)
- New SBOM validator negative-path Node tests: NOT RUN.
- Fresh source CycloneDX scan and package-lock/Yarn discovery: NOT RUN.
- Per-commit tracked asset hash inventory and artifact upload: NOT RUN.
- Built preview-container OS/runtime CycloneDX scan and validation: NOT RUN.
- Smart CI policy and all existing six full jobs: NOT RUN on proposed head.
- Exact-head independent review: PENDING.
- Full commercial license compatibility/rights approval: OPEN; clinical production authorization NO-GO.
Evidence to be upgraded only from workflow results with source SHA and actual artifacts.


---

## M4-02 two-valid-center real child IDs and tenant revocation (2026-11-09, execution pending)
New real-Postgres authz.e2e-spec.ts test: distinct active Harbor/Cedar centers with actual child records, two authenticated center admins; assert own-child 200, opposite center and wrong-child-in-own-center both 404 twice, revoked membership denies prior session immediately and subsequent sign-in provides no contexts, other center unaffected. CI evidence pending. Existing hosted protected run 42605446171 retry2 genuinely completed 84 PASS / 0 FAIL / 14 clinical BLOCKED, workflow FAILURE by design; not hosted full acceptance. Isolated Neon branch independently has two valid centers, but authenticated test against that branch not executed. No patient data or clinical activation.

---

## 2026-11-09 — COM-01/02 inventory qualification PR (PENDING EXECUTION)
- Node test contract suite authored for inventory discovery, deterministic output, output path confinement, missing manifests, overwrite prevention and unsupported globs: **NOT RUN** at authoring checkpoint.
- Dedicated GitHub Actions workflow created: **NOT RUN** at authoring checkpoint; verify run ID, SHA and jobs before PASS claim.
- Existing full Smart CI, secret scan and synthetic tests on new PR head: **NOT VERIFIED**.
- Full transitive SBOM + asset and model rights clearance: **NOT RUN / BLOCKED** by third-party evidence.
- Commercial IP ownership/legal rights-holder determination: **OPEN**. Clinical production: **NO-GO**.

---

## 2026-11-09 — PR #318 COM governance evidence (corrective Rule 7 update)
Scope: documentation plus optional Node 20 direct-manifest inventory CLI. Review observation: Codex P1 flagged absence of these four canonical evidence entries; changes now address documentation coverage. **No application source, clinical policy, runtime authorization, CI workflow or repository visibility changes.**

| Check | Result | Evidence / limits |
|---|---|---|
| Static inspection of repository package manifests / yarn.lock / Dockerfile / font imports / logo provenance | PERFORMED (partial inventory) | Preliminary file inspection, not comprehensive SBOM or license compatibility clearance |
| All four mandatory handover/QA documents updated | IMPLEMENTED, not independently checked | PR #318 revision; requires independent reviewer verification |
| Dependency CLI invocation and JSON contract | NOT RUN | Execute Node 20 command in CI/local reproducible checkout before asserting PASS |
| Full direct/transitive license, OS/container, font/logo/model audit | NOT RUN | #313 |
| CI required checks / history secret scan on latest PR head | NOT VERIFIED | Await exact-head status |
| Independent Codex review of latest PR head | PENDING | Initial P1 finding addressed in revision, no re-review receipt yet |
| Ownership verification / commercial counsel approval | NOT RUN | #312 and #314 |
| Clinical production authorization | BLOCKED | Existing G2/G2b NO-GO unchanged |


---

## M4-07 actual PostgreSQL reservation and 10-minute capped Docker stress (CI pending)
New test creates synthetic users/roles/guardian/appointment via real HTTP and runs eight overlapping sweeps against real Prisma/PostgreSQL, checks one unique partial-index outbox row/mail and repeat zero-sends. Existing failed-mail and retry DB tests retained. New 600-second loopback /api/health workload against real disposable DB uses 1/4/8 concurrency, quantiles/throughput/errors; real combined preview cgroup memory peak, 512MiB cap, nonroot UID and zero OOM kills. Strict numeric-only receipt and negative tests prevent forged duration or privacy fields. Full CI and Codex outcome PENDING at this writing. Health-only throughput is not full business SLA or direct SQL query trace.

---

## M4-06 final disposable historical archive and CAS tests — 2026-11-09 (CI PENDING)
Additional real Docker PostgreSQL 16 test scripts/qa/m4-disposable-replay.sh capture logical pg_dump at the actual historical migration-prefix state, pg_restore to another disposable DB, perform independent Prisma forward upgrade and prove ledger/marker retention. A separate two-process psql transaction holds a center row while another writer must time out; after commit, CAS stale version updates zero and current-version CAS updates one. Static negative contracts pin archive-before-upgrade and lock timeout. Original rollback/advisory lock/post-upgrade restore remain. This is not a managed Neon pooled migration race or archived external recovery. Real final-head PASS/FAIL not yet known at this point; do not claim success until full CI.

---

## M4-09 PR #307 historical state + disposition tests — 2026-11-09 (FINAL CI PENDING)
Real GitHub issue enumeration matched 75 frozen IDs (55 OPEN, 20 CLOSED), no missing IDs; only #114 was CLOSED but PENDING_EVIDENCE. Independently established PR #145 merge 447d31ec7265fe0b86fcfc282f558be2823a2552, six successful CI jobs in 41243219269, two-session browser path scripts/design/check-handover-sessions.mjs and original closeout evidence. Corrected #114. Register now 20 VERIFIED_IMPLEMENTED, 49 PENDING_EVIDENCE, 5 PARTIAL, 1 POLICY_BLOCKED; status CSV is a dated snapshot, not live availability. New negative tests reject missing/duplicate issue states, invalid timestamps/URLs, fabricated claims or missing SHA/test/reviewer, policy promotion; CI step runs after canonical CSV validation. **Test CI results NOT YET VERIFIED at this note; milestone acceptance still blocked.**

---

## 2026-11-09 — M4-08 PR #306 Web Istanbul source measurement (RUN PENDING)
New test executes production Web TypeScript modules (synthetic-ai-safety, a11y-tabs) under Jest/ts-jest Babel coverage. The collector inventories TS/TSX/JS/JSX/MJS under apps/web/src and audits every module's presence in Istanbul coverage-summary.json, including zero-executed files. Negative tests reject missing modules, denominator manipulation, unexpected files and invalid counters; CI uploads aggregate-only m4-web-coverage-baseline.json if valid. Actual full-head run and figures NOT YET VERIFIED. Existing API measured baseline reported 95.46% lines, 78.83% branches, 93.69% functions, 91.31% statements on earlier commit; no current-head claims. Overall M4 >=95% acceptance remains NOT QUALIFIED.

---

## 2026-11-09 — PR #305 M4-07 synthetic performance CI (PENDING FINAL HEAD)
**Added, not yet accepted:** `apps/api/test/m4-performance.e2e-spec.ts` performs 40 serial and 80 concurrency-8 API `GET /api/health` calls against actual CI PostgreSQL; hard gates all responses 200/DB UP, extracts numeric latency p50/p95/p99/throughput/RSS, and records real bounded appointment EXPLAIN shape. Source-level two Prisma SQL calls per health request is **not a SQL wire query trace**. 5k/10k notice selection timing is measurement without arbitrary timing SLA. `apps/api/test/m4-worker-reliability.e2e-spec.ts` tests parallel idempotence, duplicate suppression and injected first-send retry with mocked Prisma reservation semantics, **not** a real P2002/queue failure. `scripts/qa/m4-performance-evidence.test.mjs` rejects nested metadata and malformed metrics; validated numeric-only report to be uploaded as short-lived artifact. **Actual last-commit CI PASS/FAIL: pending; artifact receipt: pending.** Production resource thresholds and 95% app-wide coverage remain NOT QUALIFIED; no real data, Render change or policy activation.

---

**CI regression FIX_NOW:** Existing M4-08 secret-scan negative test incorrectly modified the first `fetch-depth: 0` in the workflow after adding `smart-plan`, rather than the actual scanner job. Corrected `scripts/qa/check-ci-test-inventory.test.mjs` to mutate the scoped `secret-scan` block and continue proving scanner fail-closed behavior. No secret scanner bypass; fresh exact-head six-job CI and final review pending.

**Additional static-asset safety tightening:** Smart CI now forces FULL CI for potentially executable Web public SVG/HTML/JS/JSON, as well as unknown assets. Only CSS and known non-executable image/font file types may be classified web-style in the simulation; the Rule16 owner-policy lock still prevents any actual job skipping. Regression tests updated; final-head CI/re-review pending.

**Codex P1 Rule 16 disposition (FIX_NOW):** targeted execution cannot be activated by repository variables or GitHub branch protection alone. Existing AGENTS.md Rule 16 mandates six exact-head CI PASS. Production Smart CI classifier now **hard-codes `ownerPolicyApproved:false`**, always selecting FULL even if both activation variables are true; unit tests prove this. A separate, explicit owner-approved Rule 16 amendment, required gate setup, and reviewed code unlock are prerequisites. This PR changes no policy or merge authorization. 

## Smart CI shadow-mode implementation — 2026-11-09 (REVIEW PENDING)

Conservative risk-based Smart CI is implemented on a **review branch**: source `scripts/ci/smart-ci.mjs` selects a bounded PR plan from exact Git base/head tree diff, `smart-ci-gate.mjs` independently verifies actual required job outcomes, and `.github/workflows/ci.yml` preserves the six existing CI job names. All main pushes, forks, non-main PRs, uncertain diffs, API/clinical/auth/DB/workflow/dependency edits and unsupported paths select full CI. Only safe documentation and non-deleting Web static CSS/assets may qualify for targeted mode after a separate admin-controlled activation. **Default SHADOW**: no existing checks are skipped, and `smart-ci-gate` must be made required in GitHub branch protection before enabling targeted mode. The connected GitHub App cannot read/edit branch-protection administration. Script regressions, job-wiring tests and an operator runbook are included. **Not merged or reviewed yet, no test results claimed.** Clinical policy gates, existing protected ten-account acceptance, Render/Neon secrets and operational status are unchanged; no M4 release acceptance implied.

**Planned tests** `node --test scripts/ci/smart-ci.test.mjs scripts/ci/smart-ci-workflow.test.mjs`: full/default shadow, docs and Web static selection, source/mixed/unknown status fail-closed, invalid Git and rename, required-job completion vs unexpected skip, six job-name preservation, branch opt-in gate. **Execution: NOT RUN at authoring.** Requires green six-job final-head CI + independent Codex; no targeted-mode performance results yet. Existing M4-08 API coverage remains measured but below target (95.46 lines, 78.83 branches, 93.69 functions, 91.31 statements; Web app instrumented coverage unmeasured). No relationship between Smart CI green status and M4 clinical approval.

## M4-02 protected ten-account dispatch failure — 2026-11-09

Operator launched [GitHub run 42525996528](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42525996528) from reviewed `main@b38c167831cb42ddde7206128df4f62673a0ac2a`. Its 16 preliminary static/secret-safety contract tests **PASS**, but protected `Private credential and live health preflight` **FAILED with exit code 2 after ~83 seconds**. The seven-role and three-additional-clinician tests were correctly **SKIPPED**, and no hosted-result artifact was uploaded. Runtime secrets were not printed. The 83-second pattern is consistent with three 25s health fetch timeouts plus retry delays; original script masked the failure category, so this is a **suspected network/health cause**, not a verified outage or password failure. Render continued reporting the synthetic deployment `3cdd7226236a6aa7b3f82e04f1d26b9b5bce0b93` LIVE, and returned no HTTP-latency/request time-series evidence for the window. No hosted HA-01–HA-10 PASS may be claimed.

This PR narrows the blocker by logging **only an allowlisted reason code** (e.g. `hosted_public_health_network_or_timeout`, `non_200_response`, `unhealthy_json` or credential-shape error) plus a secret-free `private credential schema validated` checkpoint. No error objects, response bodies, headers, URLs, credentials or cookies are logged. Three retries, strict JSON status=ok/database=up and fail-closed test skips remain unchanged. Unit tests verify reason classification and privacy in both normal CI and manual private workflow. This is a **diagnostic PR**, not acceptance or a bypass. Require 6 final-head CI + independent review; manual workflow dispatch/approval again only after merge. All G2/G2b, D-NEW-5, clinical signing/consent/release/real STT/AI and patient-use NO-GO.

**Actual executed result:** GitHub Actions run 42525996528, 16/16 preflight unit contract checks PASS, main protected credential/health preflight FAIL (unclassified, after ~83s), hosted browser 7-role SKIPPED, hosted 3-role SKIPPED, results absent. New `scripts/qa/prepare-hosted-run.test.mjs` checks successful JSON health, failed response types, network exception classification, invalid JSON, secret-safe errors and unchanged seven-account shape. Not executed until exact-head CI starts. Do not mark protected HA-01…HA-10 PASS.

## M4-08 honest application-wide coverage measurement — 2026-11-09 (PR under review)

A new **non-gating baseline** instruments the full `apps/api/src/**/*.ts` Jest suite rather than confusing fingerprint-only coverage with the application. Existing Web `node --test` runs under V8 observation; a sanitizer/report counts app source files and observed executed modules but **does not pretend that V8 module presence equals Istanbul line/branch/function/statement coverage**. The M4 report explicitly returns `NOT_QUALIFIED` until both API and Web have genuinely instrumented, full-scope four-metric coverage and meet the owner-reviewed ≥95% threshold. Tests fail closed for invalid/missing data and for fabricated API-only PASS. CI archives only aggregate percentages/counts—no raw files, data rows, credentials or cookies. This is **measurement infrastructure**, not an already-passing 95% application gate. New exact-head CI/independent review required; no clinical authorization changes; G2/G2b/safeguarding/consent/signing/release/real AI remain NO-GO.

**Before exact-head CI:** baseline result **NOT RUN**. Validation tests added `scripts/qa/m4-app-coverage-baseline.test.mjs` for full API math, API-only false PASS and missing data. New API coverage report path `.workspace/m4-coverage/api/coverage-summary.json`; Web V8 observation dir is NOT an Istanbul Web coverage result. CI publishes only summarized JSON `m4-coverage-baseline-<run_id>`, 3-day retention. A green CI job means the measurement code executed, **not** that both apps reached ≥95%. Keep all M4-08 checkboxes requiring Web instrumented coverage and owner-signed exceptions OPEN.

## M4-06 non-owner DB role cutover — code-level verification pending, 2026-11-08

**Test scope added:** `scripts/preview/db-role-config.test.mjs` (default legacy, distinct scoped credentials/host/db/schema, wrong role/URL fail-closed, error secrecy, startup migration/runtime contract), `scripts/preview/verify-runtime-db-role.test.mjs` (non-owner positive and owner/inherited owner/superuser/DDL/audit TRUNCATE/denied INSERT negative paths). CI `test` job includes both after Prisma Client generation. At authoring time no new exact-head CI receipt exists; mark results **NOT RUN / PENDING CI**. Prior PR #298 six-job PASS is unrelated to this new change. Actual Render runtime still uses table-owner credentials: operational role segregation, Neon pooled replay and live tenant/QA are **NOT VERIFIED**. All clinical and real release/consent/AI gates NO-GO.

## M4-09 historical closeout evidence reconciliation — PR pending (2026-11-08)

Reconciled the frozen 75 historical GH issues against individual merged PRs, scoped issue closeout comments, six-job exact-HEAD CI receipts and independent review records. **18 rows changed from PENDING_EVIDENCE to VERIFIED_IMPLEMENTED**: already-closed GH waves #117/#118/#119/#120/#121/#124/#126/#127/#128/#129/#130/#131/#132/#134/#135, already-closed handover follow-up #112, plus source-tested clinical integrity #39/#40. **Three** rows (#43 goal-version evidence, #47 guardian replay, #51 specialty disclosure) changed to PARTIAL, retaining their open-issue status until complete original acceptance. #10's note corrected: audit TRUNCATE follow-up #277 is closed, but non-owner runtime privilege is still unverified. Register tally **19 VERIFIED_IMPLEMENTED / 50 PENDING_EVIDENCE / 5 PARTIAL / 1 POLICY_BLOCKED** (75 total, including previously verified #8). This is a source/test/CI disposition update only. Issues #39/#40 must not close before independent review and acceptance of the register; existing 15 GH waves and #112 are already closed. No automated issue closure or clinical activation. All wider M4 qualification and G2/G2b/D-NEW-5 NO-GO controls unchanged.

**Evidence:** PR #139 CI 41191140449; #142 CI 41227497493; #144 CI 41238189611; #145 CI 41243219269; #137 CI 41182772658; #146 CI 41244256922; #285 CI 42462964588. Original closeout GitHub issue comments and independent reviews consulted. These are **prior original-fix tests**, not fresh execution of PR's updated CSV. This branch has not yet produced its own final six-job CI receipt. Historical register validator and negative regressions must pass at exact head. No protected hosted QA or clinical activation is inferred.

## M4-01 evidence reconciliation tranche 2 (2026-11-08; PR pending)

Existing-source audit against 18 current API e2e test modules located **50 additional partial test-to-requirement mappings**: 16 features, 21 workflows, 13 owner requirements. Together with merged PR #296, the canonical CSVs now classify **94 PARTIAL / 116 PENDING_VERIFICATION / 2 V2_EXCLUDED** across 212 entries. By register: 66 features **31 PARTIAL / 34 PENDING / 1 V2**; 91 workflows **36 PARTIAL / 54 PENDING / 1 V2**; 55 owner requirements **27 PARTIAL / 28 PENDING**. IDs, row counts, work-unit ownership and V2 exclusions unchanged. All added mappings reference existing test definitions (not new test results) and explicitly document incomplete end-to-end UI/live/controlled-step requirements, signed clinical policy and real release NO-GO. No claim that these 50 items or 1,023 controlled steps have fully passed acceptance. No code, migration, credentials, production environment or clinical status changed.

**Evidence classification: SOURCE-LOCATED/PARTIAL only.** Tranche-2 source review located 50 existing source-to-test mappings and their scope caveats. No new local/hosted test was executed during preparation, and the prior PR #296 six-job [run 42509655985](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42509655985) applies only to that earlier head. Tranche-2 CI and final-head Codex review PENDING. The existing API E2E tests demonstrate synthetic logic in isolated test environments, *not* real clinical authorization/real data, nor protected HA-01…HA-10 PASS, not 95% application-wide coverage, nor performance benchmarks. Clinical/consent/signing/release/safeguarding and real AI gates NO-GO.

## M4-01 PR #296 — regression-evidence traceability checkpoint (2026-11-08)

**Change scope:** documentation-only CSV reconciliation, 44 existing test-linked rows marked `PARTIAL` (15 features + 15 workflows + 14 owner requirements); 166 rows still `PENDING_VERIFICATION`, two V2-excluded. All mapped claims distinguish test definition from full hosted/UI/controlled workflow acceptance. **No local/hosted tests executed for this change at recording time.** Previous main PR #295 six-job run [42506550732](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42506550732) was successful; it is NOT an exact-head QA receipt for PR #296. The new branch's six-job CI and independent follow-up review must complete before merge. Codex initial P1 Rule 7 handover omission addressed in this tranche; final-head re-review pending. Do not mark M4 accepted based on CSV references, no G2/G2b, signing, release, consent, real AI/STT, D-NEW-5 safeguarding or patient-use activation.

## M4 final read-only qualification — 2026-11-08 live qualification checkpoint (2026-11-08)

Verified via read-only Render and Neon: live branch zero-file diff from M4 main, correct database, 10 synthetic users, 25 completed migrations, audit UPDATE/DELETE and TRUNCATE triggers enabled, 78 FKs. Only one valid center and owner-only application role: full two-tenant and privileged audit integrity NOT VERIFIED. New tests on this PR NOT RUN yet. Protected HA-01–HA-10 and broad coverage NOT RUN. See docs/qa/M4-LIVE-QUALIFICATION-20261108.md.

## M4-F03 controlled acceptance — test evidence (2026-11-08)

**NOT RUN / NOT YET VERIFIED:** New 7+3 protected acceptance receipt validator requires exact SHA, operator approval and separate two-valid-tenant positive/negative/revocation receipt. Negative regressions included in CI. NOT RUN on this final HEAD; protected hosted run and historic/controlled mapping remain unverified. G2/G2b NO-GO. Require six exact-head CI jobs and independent review before any merge.

## M4-F02 reliability/QA — test evidence (2026-11-08)

**NOT RUN / NOT YET VERIFIED:** Protected extra-account retry-safety regression added; measured Istanbul API/Web threshold parser and negative regressions added to required CI suite. NOT RUN on this final HEAD; actual application-wide measurements and load baselines NOT PROVIDED. Require six exact-head CI jobs and independent review before any merge.

## M4-F01 security/database — test evidence (2026-11-08)

**NOT RUN / NOT YET VERIFIED:** New synthetic PostgreSQL catalog/Public TRUNCATE privilege and simultaneous audit UPDATE/DELETE rejection regression. Existing transactional password recovery and early-boundary tests reused. NOT RUN on this final HEAD; Render runtime DB role, pooled migrations and full HTTP matrix still unverified. Require six exact-head CI jobs and independent review before any merge.

## M4-C04 Historical evidence gate — test evidence

**Result: NOT YET VERIFIED on final HEAD.** Historic issue validator now emits a conservative 75-row disposition summary and lists independently-evidenced VERIFIED_IMPLEMENTED candidates while explicitly setting automatic closure and M4 milestone closure authorization to false. Negative tests reject false evidence, policy block without proof and misleading completion assertions. No historical issue is auto-closed. #183/#167 remain open and C01–C03 independent qualifications are dependencies. Record actual CI run, PASS/FAIL and independent review before Rule 16 merge; no clinical activation, protected release, or live-patient processing.

## M4-C03 Acceptance/traceability — test evidence

**Result: NOT YET VERIFIED on final HEAD.** Protected extra-therapist QA now rejects authenticated-denial 401 as session loss, requires 403 or masked 404, and gates unassigned/wrong-centre negative PASS behind a successful same-session authorized clinical workspace control. A seed-source contract test checks IDs and deterministic namespace against `seed-demo.ts`. NO hosted ten-account success, valid two-tenant test or 1,023-step private source verification is claimed. Workstreams #175/#176 (and prior merged #177) with #266/#268/#269 still need hosted/traceability evidence. Record actual CI run, PASS/FAIL and independent review before Rule 16 merge; no clinical activation, protected release, or live-patient processing.

## M4-C02 Database/infra/coverage — test evidence

**Result: NOT YET VERIFIED on final HEAD.** CI suite inventory now verifies pinned Gitleaks version/SHA-256, fail-closed all-ref and tracked-file scans, and standards-compliant TOML syntax via built-in Python `tomllib`; negative Node tests exercise removed safeguards and malformed configuration. No DB migration or runtime query code changed in this tranche. Application-wide 95% coverage, database contention, Render resource and load qualification remain NOT VERIFIED. Parents #180/#181/#182 stay OPEN. CI-run link, job-by-job PASS/FAIL and final reviewer receipt must be recorded after execution; no hosted ten-account or clinical acceptance is inferred.

## M4-C01 Security closure — test evidence

**Result: NOT YET VERIFIED on final HEAD.** Authenticated seven-role forbidden-route QA now rejects 401 as session loss, requiring 403 or masked 404 before an isolation PASS. `hosted-role-guards.test.mjs` adds this negative regression. This is synthetic, read-only QA; no change to the production clinical guards. Broader M4-04/M4-05 matrices and final exact-head six CI jobs/independent review remain PENDING. Parent issues #178/#179 stay OPEN; signed clinical activation remains NO-GO. CI-run link, job-by-job PASS/FAIL and final reviewer receipt must be recorded after execution; no hosted ten-account or clinical acceptance is inferred.

## M4-05 PR #286 — PostgreSQL early-boundary fault injection (2026-11-08)

**Evidence status: NOT RUN / NOT YET VERIFIED on final HEAD.** Test source at code commit `b932971cb79c578e79d560faec72775a7c1ffded` adds two parameterized, real-PostgreSQL cases in `apps/api/test/auth.e2e-spec.ts`: (1) synthetic trigger rejecting `auth_identity` UPDATE, (2) synthetic trigger rejecting `session` UPDATE. Each expects password reset HTTP 500, unchanged `verification_token.used_at`, unchanged password hash and previously active session, followed by trigger teardown, successful same-token retry, revoked old session, new-password login and HTTP 422 replay rejection. **These new tests are separate from the existing `audit_event` INSERT fault-injection rollback case merged in PR #284.** No runtime, hosted or live-patient acceptance is inferred. Initial code-head CI workflow [42475586207](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/42475586207) was in progress when inspected; final HEAD after documentation remediation needs its **own** six-job CI and independent re-review. Record PASS/FAIL and the immutable run SHA here only after an observed result. No 95%-coverage or clinical release claim.

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

**M4-06 P1 audit TRUNCATE QA — 2026-11-08:** PR #281 introduces `apps/api/test/m4-db-integrity.e2e-spec.ts` regression: check `audit_event_no_truncate` enabled, reject TRUNCATE, confirm original row retained, then INSERT accepted; existing UPDATE/DELETE regression remains. Test setup uses transactional owner-only trigger disable/reenable inside `resetDb`; verify it cannot leave protection disabled on failure. Baseline `92158e7` first-head six CI jobs were running when this record was authored; tests on this new documentation-fix HEAD are **NOT RUN/PENDING**, no PASS claimed. Migration upgrade, backup/restore, operational non-owner privilege and reviewer signoff NOT VERIFIED; #277/#180 OPEN, clinical NO-GO.

---

**M4-04 clinical read security reconciliation — 2026-11-08:** PR #271 implements active-membership and live-supervisor checks for clinical child, progress and review-queue reads, plus specialty-revocation and suspension negative tests. Reconciled after M4-05/#272 merge. Final new-head six-job CI and independent implementation review NOT YET VERIFIED. The remaining P0 #178 authorization/CAS/browser scope and all clinical NO-GO remain OPEN.

---

**M4-05 partial security implementation — 2026-11-08:** PR #272 / issue #179 now adds origin-based password-reset throttling with generic responses, an API abuse regression, and previously added expiry/no-cache tests. Exact-head CI and independent review are NOT VERIFIED. Recovery UI, unsigned MFA, dirty-form and edit-conflict UX remain OPEN; clinical NO-GO remains in force.

---

**M4-09 historical issue evidence integration — 2026-11-08:** PR #276 tracks 75 frozen historical issues with zero unverified closures, exact snapshot/URL checks and fail-closed evidence requirements. The required CI test job executes its validator and negative regressions alongside merged M4-08 inventory tests. Post-reconciliation six-job CI and final exact-head reviewer acceptance are PENDING; full #266 evidence triage and clinical NO-GO remain unchanged.

---

**M4-07 implementation reconciliation — 2026-11-08:** PR #274 preserves the linear appointment/recipient lookup and explicit date-window/duplicate regressions. This merge checkpoint incorporates #273 database integrity and #275 QA inventory without dropping their source, CI or Rule-7 handover changes. Latest exact-head CI and independent review require requalification after this merge commit. Existing synthetic-only, clinical and real-delivery NO-GO gates remain intact.

---

# M4-08 QA checkpoint — 2026-11-08

CI verifier and negative tests COMMITTED; full exact-head CI is not yet verified. Inventory records existing API and web test-suite counts only, not line/function/branch coverage. Existing core fingerprint threshold remains 95 statements/functions/lines, 90 branches; measured app-wide baseline is UNKNOWN. No clinical activation or protected hosted acceptance qualified.

---

# M4-06 QA checkpoint — 2026-11-08

New real-Postgres audit/foreign-key/index regression tests **COMMITTED, NOT YET VERIFIED** on exact-head CI. Existing M2 migration already enforces append-only audit rows, validated clinical FKs and tenant hot-path indexes; no redundant SQL migration. Pending six CI jobs, independent review and database concurrency/Neon validation. Do not treat this test alone as complete M4-06 or signed clinical approval**M4-03 reviewer regression update — 2026-11-07:** Code+tests committed: original/extra protected JSON parse errors sanitized; local exclusive seed file lock prevents concurrent consumption/cleanup; overlap regression in `seed-transactions.e2e-spec.ts`; malformed original/sidecar regression in `demo-seed-config.e2e-spec.ts`. First CI on an earlier head failed demo journey because runner provided only 7 secrets; corrected to 7+3. Later earlier-head gitleaks flagged a synthetic JS expression in malformed fixture; exact historical expression exception added and TOML restored. **Latest exact-head CI and new independent review pending**, not claimed PASS. Protected ten-role live hosted HA-01…HA-10 still NOT RUN; real clinical data/signing/release/AI remains NO-GO.

---

# M4-03 QA checkpoint — 2026-11-07 — PR #270

**Source implementation and tests committed; latest exact-head CI / independent review PENDING at writing.** This paragraph is not an assertion of successful hosted account authentication or clinical authorization.

| Scenario | Current evidence state |
|---|---|
| Independent 7/3 local credential files, restart and permission modes | Test committed; CI result PENDING |
| Fresh ten-account protected local seed | Existing integration test + added idempotent coverage; final-head CI PENDING |
| Actual legacy seven→ten upgrade without rotating seven hashes | New PostgreSQL integration test committed; final-head CI PENDING |
| Three additional recoverable passwords, no unexported identities | New local sidecar logic and tests committed; final-head CI PENDING |
| DB rollback/file cleanup and ambiguous COMMIT retention | Existing + new fault injection and real DB checks; final-head CI PENDING |
| Operator seven-only secret fail-closed | Regression committed; final-head CI PENDING |
| Private hosted ten-account HA-01…HA-10 | NOT RUN; #268 |
| Historical source evidence and Mistral QA hardening | OPEN #266/#269 |
| Real patient data, signing/release, external AI/STT | NO-GO |

No passwords, cookies or patient data were introduced into the PR or QA artifacts.

---

**Codex P2 correction QA update (M4-02, 2026-11-07):** Old-head CI `0ad1d96285` passed but had two logic gaps: cleared-cookie test was not a server-revocation test and child-list team was not proof of actor specialty. Corrected with independent pre-logout cookie replay requiring 401, all-assigned-child `ClinicalService.workspace.child.services` actor service assertions, and explicit offline regression cases for stale-cookie 200 and wrong-actor specialties; CI inclusion added. **At this checkpoint final-head six-job CI and fresh review are PENDING**, protected hosted ten-account HA-01…HA-10 **NOT RUN**, and two-valid-tenant/revocation cases #268 **BLOCKED**. Never report these as live PASS; no clinical activation.

---

# M4-02 QA checkpoint — 2026-11-07 — PR #267

**Status:** QA code IMPLEMENTED on PR branch; code tests / exact-head CI **PENDING** at writing; **actual protected hosted ten-account QA NOT RUN**. No real credentials, child data or clinical functionality used. This is not a declaration of deployed SHA acceptance.

| Evidence | State |
|---|---|
| Three extra role identity, specialty and child-assignment contracts | Implemented; final-head CI verification pending |
| Three extra login / secure cookie / allowed clinical read / denied unassigned real seeded child read / absent-center denial / logout + stale session | Implemented; protected manual hosted execution NOT RUN |
| Seven legacy role forbidden API GET and stale logout checks | Implemented; protected manual hosted execution NOT RUN |
| Invalid credentials, output redaction, workflow gates and fail-closed offline tests | Implemented; final-head CI verification pending |
| Full-history secret scan | Earlier branch had a deterministic test-fixture match and a transient TOML syntax error; corrected; final-head result PENDING |
| Six exact-head mandatory CI jobs / independent exact-head review | PENDING |
| Two *valid* centres, true cross-tenant isolation, therapist revocation, expiry, verified Render SHA | BLOCKED for disposable synthetic fixture; linked #268 |
| Clinical signing, real family releases, external AI/STT, real patient data | NO-GO |

For every HA-01…HA-10 item, record actual hosted evidence after main-only protected workflow. Do not infer PASS from the synthetic seed, unit test or last week's deployment.

---

# M4-02 QA checkpoint — 2026-11-07

**PLANNING ONLY / NOT IMPLEMENTED / NOT TESTED**. Added `docs/qa/M4-02-TEN-ACCOUNT-ACCEPTANCE.md` with ten-account acceptance matrix HA-01…HA-10; no new hosted QA workflow dispatched or credentials collected. No claim of login PASS or role-isolation qualification from prior demo deployment. PR #265 M4-01 predecessor merged after exact-head 6/6 CI success, Codex no-major-issues; M4-01 row-level evidence remains #175/#266. Current M4-02 branch CI and private-hosted ten-account acceptance NOT RUN; real clinical usage NO-GO.

---

> **M4-01 correction QA update (2026-11-07):** Claude independently executed original-head validator PASS (66/91/55), checked 75/75 historic issue references and confirmed exact prior HEAD `f9f8de4` all six CI jobs green on runs 42386951474 and 42386954197. Those are **previous-head results only**. New code adds mandatory test-job gate for roadmap validator and negative-path regression cases; **final-head CI and updated review pending at writing**. The implementation-level 66/91/55 and 1,023-step clinical qualification remain **NOT VERIFIED**. Sensitive clinical activation continues NO-GO.

# Active QA checkpoint — 2026-11-07 — M4-01 / PR #265

**Type:** Documentation/inventory; no clinical code changes. **Validation performed:** GitHub connector reads confirmed 66 distinct original IDs (1–66), 91 distinct `WF-` IDs including `WF-X6` explicitly V2 excluded, and 55 distinct `OB-` IDs (01–55). This is a **structural COUNT/UNIQUENESS PASS only**, not proof of implementation or requirement coverage.

| Gate | State at documentation update |
|---|---|
| GitHub 66/91/55 uniqueness and V2 exclusion | **PASS** (connector-assisted file read/check) |
| `node scripts/qa/check-roadmap-registers.mjs` execution | **NOT RUN**; pending exact-head execution |
| Six required GitHub Actions CI jobs on updated final SHA | **NOT RUN / NOT QUALIFIED** (new SHA created by these updates) |
| Codex independent review of original HEAD `602d3111e4` | **P1 raised**: Rule 7 handover/QA update missing; being fixed |
| Fresh final-head Codex review | **PENDING** |
| Per-item 66/91/55 merged-code/hosted acceptance | **NOT VERIFIED**; #175 remains open |
| 1023 controlled workflow steps | **NOT VERIFIED**; source not accessible through current GitHub connection |
| Clinical signing/release, real STT/AI, real-patient/pilot use | **NO-GO** |

Do not describe this status as six-job CI PASS or as a complete audit. Historical M3 notes below remain preserved as historic checkpoints.

---

# M3-AI06 implementation checkpoint — 2026-11-02

M3-AI06 PR #159 adds browser adversarial tests: malicious fictional instruction in report draft and role-spoofing home-plan instruction must block examination. Six exact-head CI and final review PENDING, no PASS claim.

# M3-AI05 implementation checkpoint — 2026-11-02

M3-AI05 PR #158 adds browser regressions for mandatory examine/acknowledge before report/home-plan insertion, invalidation after text edit, and rejection without draft mutation. All six current-head CI jobs NOT YET QUALIFIED; final independent review PENDING.

# M3-AI04 implementation checkpoint — 2026-11-02

M3-AI04 PR #157 browser coverage added for stale report autosave revision, changed goal provenance, and scoped source-inspection links. Exact-head six CI and independent review PENDING — no M3-AI04 PASS claim.

# M3-AI03 implementation checkpoint — 2026-11-02

M3-AI03 PR #156 browser regression added for offline shortlist, review, discard, edit, explicit insertion and undo. Exact-head CI NOT RUN/NOT VERIFIED yet. No claims of test PASS.

# QA checkpoint — 2026-11-02 — M3-AI02 PR #155

New browser regression covers synthetic proposal, no implicit insert, discard, explicit clinician edit/insert and autosave. M3-AI02 local execution NOT RUN; CI six-job qualification PENDING; independent implementation review PENDING. Predecessor M3-STT01 PR #154: 6/6 CI PASS. Historical results follow.

# Historical QA checkpoint — 2026-11-01 — TB-EM-053 PR #152

Private policy v1.1 FR-1..FR-9 from merged PR #48. **Synthetic-only release workflow implemented and CI-verified at code head `70c5a083`.** [Run 41331698946](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41331698946): **6/6 required jobs PASS** (`test`, `secret-scan`, `live-session`, `preview-container`, `demo-journey`, `compose`); API **672/672 tests PASS across 29 suites**, including TB-EM-053 isolated policy/rendering, real PostgreSQL grant, denial, withdrawal, revocation, supersession and concurrent duplicate cases. A subsequent extension explicitly covers the seven roles (platform admin, center admin, coordinator, speech therapist, OT therapist, supervisor and guardian) in the family-release endpoint integration test; **that extension is pending CI**. Demo-journey already contains the separate seven-role synthetic browser smoke but is not independent full family-release visual acceptance. Codex final-head review remains PENDING; no real-patient release or clinical signing authorized. Documentation/test extension requires a fresh final-head run.

# Historical QA checkpoint — 2026-11-01 — TB-EM-052 PR #151

| Evidence | Result |
| --- | --- |
| Earlier pure-model head `03576c9`, CI #41310558590 | Six required jobs passed; does not qualify later heads |
| Attempted database-assignment head, CI #41313442496 | PostgreSQL tests passed, but **required TB-EM-051 authorization check FAILED**; executable mutations removed, not bypassed |
| Codex review head `48c457e` | P1 missing handover/QA updates and two P2 state-machine invariants; all designated FIX_NOW |
| P2 fixes `0ee93a6`, tests `2f1816d` | Code committed; current exact-head CI #41315328179 queued at last check — **NOT VERIFIED** |
| Clinical activation / protected release | **NO-GO**; five professional attestations, PD-06 and G2/G2b/G3-G7 remain pending |

No real child/guardian data used. No transfer endpoint or assignment mutation remains in this PR.

# Latest QA checkpoint — 2026-10-31 — M2-H06 review remediation

| Work unit | Current qualification | Review/QA evidence |
| --- | --- | --- |
| M2-H05 #143 | **MERGED** | `f30a659`, 616/616 tests, six jobs green, Codex no major issues |
| M2-H06 #144 | **PENDING exact-head CI and final Codex review; DO NOT MERGE** | Codex previous-head `1c0c4b3` two P2 findings **FIX_NOW**: preserve unchanged first-overlap end ISO and reject nonexistent spring-gap time. Fix commits `42719a5` / `b3eaae8`; new tests `1a9e6e0`. Both review threads resolved, zero deferrals. Current #128 source `components/clinical/ReportToPlanHandoff.tsx` with idempotent server transaction, not old child360 path. |

Synthetic-only, all clinical activation/release/production NO-GO.

# Latest QA checkpoint — 2026-10-31 — M2-H06 #144 in progress

| Work item | Status | Evidence / blockers |
| --- | --- | --- |
| M2-H05 #143 | **MERGED** `f30a659` | exact-head `05c781e`, 616/616 tests, 6/6 CI jobs green, final Codex no major issues; four findings resolved; zero deferrals |
| M2-H06 #144 (#127–#130) | **IMPLEMENTED IN DRAFT; CI/REVIEW PENDING** | `scripts/qa/m2-h06-frontend.test.mjs` added to CI test job (cross-zone, repeated DST, second-precision, CSRF 401/relogin, ApiError.code, provider/messages, headers/dev gate). Existing API/web and live-session/demo/container/compose checks still required. No claim of passing until observed on exact head. |

Do not merge M2-H06 on documentation-only or earlier-head checks. Synthetic-only, signing/consent/safeguarding/protected release/production NO-GO.

# Latest QA checkpoint — 2026-10-31

| Work item | Exact HEAD | Outcome | CI/review |
| --- | --- | --- | --- |
| M2-H05 PR #143, merged | `05c781edca0b70da72a3c360e7c8d44eabe09258` → main `f30a659` | **PASS: 616/616 tests** | 6/6 jobs green, run 41236118987; Codex final no major issues; four inline threads resolved; no deferrals |
| M2-H06 (#127,#128,#129,#130), planning-only branch | initial draft checkpoint | **NOT IMPLEMENTED / NOT TESTED** | CI and independent review of implementation pending; DO NOT MERGE |

Clinical gates continue to fail closed; synthetic-only scope, protected release and deployment NO-GO.

## 2026-10-31 — M2-H05 Codex security P1 remediation pending final qualification

| Finding | Fix and test | Status |
| --- | --- | --- |
| Pre-authorization WITHDRAWN status leak to revoked therapist | `bc70c5f` enforces transactional active child + matching specialty before withdrawal/goal checks; `e6b9f88` real HTTP/DB verifies authorized 409, revoked known/unknown both 404 | **P1 FIX_NOW; fresh six-job CI + final-head Codex review pending** |
| Prior 3 P2 + 2 P3 | DST/legacy-title preservation and new boundaries, unchanged | **FIX_NOW; must requalify combined final HEAD** |
| Clinical release, real records, production | No change to clinical approval gates | **NO-GO** |

## 2026-10-31 — M2-H05 extra review boundary tests pending final qualification

| Finding | Fix/test | Status |
| --- | --- | --- |
| Mistral P3 unmeasured legacy long/whitespace title round-trip | `ff05058` stores original title for wholly unchanged definition; `9f3b979` real PostgreSQL and HTTP test | **FIX_NOW — final CI pending** |
| Mistral P3 explicit fold-time change | `7871202` checks earlier-fold 00:45Z after changing 02:30→02:45, distinct from room-only 01:30Z preservation | **FIX_NOW — final CI pending** |
| Codex three P2s | DST preserve, measured/checkpointed title bytes, 201–300-char legacy and new-200 cap | **FIX_NOW — final CI pending** |
| Clinical gates | No policy activation or real records | **NO-GO** |

## 2026-10-31 — M2-H05 long legacy goal title regression pending final qualification

| Finding | Remediation | Status |
| --- | --- | --- |
| Codex P2 unchanged legacy measured titles 201–300 chars blocked by newly strict 200 DTO | `a79735c` restores historic DTO cap 300; `276a7e7` enforces new/redefined max 200 in service; `ca001a7` tests measured 250-char round-trip and new 250-char HTTP 400 | **FIX_NOW; fresh six-job CI and final-HEAD independent review pending** |
| Earlier red test 612/613 | `6ea9fc4` seeds imported whitespace before observation to obey immutable Postgres trigger | **FIX_NOW; verify fresh CI** |
| All owner-gated clinical release and real records | No change | **NO-GO** |

## 2026-10-31 — M2-H05 review-driven regression coverage (pending final CI)

| Area | Change | Gate |
| --- | --- | --- |
| Existing recurring fold bookings | `02a0485` maintains existing appointment UTC instants for room/clinician/duration-only changes; new HTTP/DB regression `57651b9` covers 2027 Paris later fold | **PENDING final-head 6/6 CI + review** |
| Legacy immutable goal titles | `51c672d` retains exact stored title for measured/checkpointed goal round-trips; `ca12b89` tests real DB and 409 on actual rename | **PENDING final-head 6/6 CI + review** |
| Prior implementation head | `7f77d66` exact code review found two P2s; earlier 611/611 + 6/6 green is historical and not merge evidence for the new head | **SUPERSEDED** |
| Clinical release / real children | Unchanged unsigned governance gates | **NO-GO** |

## 2026-10-31 — M2-H05 implementation validation: 611/611 and six CI jobs PASS

| Gate | Result | Evidence |
| --- | --- | --- |
| Implementation head | `55163d5fe7d1d567d8ec66f1499bc9d745c459f0` | M2-H05 PR #143, all frozen #122/#123/#125 code and regression tests |
| API/PostgreSQL | **PASS — 23/23 suites; 611/611 tests** | [Test job on run 41233257189](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41233257189); positive/negative DST, HTTP IANA/percentage/calendar/trim, report RETURN, withdrawal/stale evidence, historical snapshots |
| API typecheck, API/web build, browser journeys, synthetic seven-role demo | **PASS** | Same exact implementation HEAD run |
| Secret scan, preview container, portable Docker Compose | **PASS** | Same run |
| Required six checks (test, secret-scan, live-session, preview-container, demo-journey, compose) | **6/6 PASS on implementation HEAD** | [GitHub Actions 41233257189](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41233257189) |
| After final docs-update HEAD and exact implementation Codex review | **PENDING AT THIS CHECKPOINT** | Must requalify on final PR HEAD. Prior planning-only Codex review at `5f17f99` is not sufficient. |
| Signed clinical approval, real patient data and family release/deployment | **NO-GO** | No approval policy activated. |

## 2026-10-31 — M2-H05 #143 implementation verification (ongoing)

| Gate | Status | Evidence |
| --- | --- | --- |
| Frozen issue implementation #122/#123/#125 | **CODE + NEW TESTS PRESENT / DRAFT** | `apps/api/src/common/zoned.ts`, `operations/schedule.service.ts`, `clinical/{clinical,reports,governance}.service.ts`, current DTOs and `common/validators.ts` |
| DST fold/gap, host-TZ, 23/25h day, leap/month-end tests | **ADDED; full-suite result pending** | `apps/api/test/timezone-validation.e2e-spec.ts` |
| Impossible dates, IANA, percent bounds, trim tests | **ADDED; full-suite result pending** | `apps/api/test/validators.e2e-spec.ts` |
| Returned report conflict and withdrawn evidence/workspace/observation | **ADDED; PostgreSQL result pending** | `apps/api/test/governance.e2e-spec.ts` |
| Initial CI [41232387309](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41232387309) | **FAILED (fixed)** | TS18048 report progress `cur` possibly undefined; fixed `e469b7c`. Do not use initial run for merge. |
| Second code CI [41232523644](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41232523644) | **605/610 PASS; 5 FAIL (corrected on later HEAD)** | Three existing suites expected 422 instead of new DTO 400, former DST fold/gap behavior, or stale-tab message regex. Tests updated `f9f5e8f`/`30d3f05`; message `65e1b39`. |
| WITHDRAWN saved report evidence at SUBMIT | **ADDED; latest PostgreSQL result pending** | Reject stale source `PLAN_VERSION_WITHDRAWN` in `b7c1b15`; e2e `4077393`. |
| Six-job exact-final-HEAD CI, independent implementation Codex review and P0–P3 dispositions | **PENDING** | Previous `5f17f99` Codex reviewed only planning files, not feature code. |
| Clinical approval, release, real records, production | **NO-GO** | Existing unsigned governance policy unchanged; synthetic fixtures only. |

## 2026-10-31 — M2-H04 completion evidence and M2-H05 draft baseline

| Gate | Result | Evidence |
| --- | --- | --- |
| M2-H04 PR #142 implementation (#124/#121 carryover + #120/#119/#126) | **MERGED** | `b95a0ce6e5504c7660bdc265ea08ba3f9a754e23` |
| PR #142 exact final HEAD | **VERIFIED** | `58c0c40989d289cab838953a2403af706e300f41` |
| PR #142 test / secret-scan / live-session / preview-container / demo-journey / compose | **6/6 PASS** | [run 41227497493](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41227497493) |
| PR #142 independent Codex final-head review | **PASS — no major issues** | Exact `58c0c40` receipt; all 17 distinct findings FIX_NOW and review threads resolved |
| M2-H05 (#122/#123/#125) implementation / tests / final review | **NOT STARTED / NOT RUN / NOT QUALIFIED** | Planning-only draft checkpoint in `docs/emergent/workunits/M2-H05.md`; no claims of code remediation |

Synthetic data only; clinical signing, release and production approval still NO-GO. Historical QA entries below record their original state and are not current M2-H05 results.

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

### M2-H04 `61d8068` full-implementation CI and Codex P2 disposition (2026-10-31)

- GitHub Actions run `41213918173` on exact HEAD `61d806864021ca2606f15597d5e68fff5006effd`: **six of six required jobs PASS** (`test`, `secret-scan`, `live-session`, `preview-container`, `demo-journey`, `compose`); API PostgreSQL Jest **592/592 PASS across 21 suites**. The forward-only migration applied and API/web built.
- Codex on that head flagged two **P2** issues, neither waived: an oldest-first 200-plan cap making new drafts inaccessible, and synthetic outbox failure stranding reminder reservations. Fixes and focused regressions are being added in the same PR. **No final-head PASS claimed until these fixes run again**. A second Codex review must inspect that amended HEAD.

### M2-H04 `6c8e87b` second review checkpoint (2026-10-31)

- Run `41215010673` on `6c8e87b7414650beaa3b5ae28cd6a202fe963bb8`: all 21 PostgreSQL test suites, **594/594 API tests PASS**; remaining Compose verification was still in progress at this checkpoint.
- Codex's second implementation review found one further **P2** in `PlanEditor`: a same-child workspace refresh after a family preview unmounted already-loaded older plan pages. Revised UI code preserves and refreshes prior pages, with a read-only synthetic Playwright overlay exercising an older-plan preview through a workspace reload. **Third exact-head CI and Codex review pending; do not merge yet.**

### M2-H04 `5c733f5` third review and amended acceptance (2026-10-31)

- `5c733f5` completed the amended synthetic demo-journey browser check; Codex independently raised two new P2 boundary cases: first-page `hasMorePlans` metadata stale after a 200-to-201 plan creation, and an older-plan preview UI assertion racing the workspace refresh.
- The next amendment synchronizes metadata when no older page is loaded, records a refresh completion revision only after parent and older-page reloads, and tests both a simulated 200-to-201 UI boundary and preview persistence after that completion signal. **Current amended HEAD still requires 6/6 CI and fresh Codex verification.**

### M2-H04 `5a703d5` fourth review — further P2 remediation pending verification (2026-10-31)

- Codex identified that older plans loaded in the Therapy Plan tab vanished from Progress and Sessions on tab switch, and that a bounded template library had no server-side search/pagination path. Both are treated as **blocking P2** findings.
- Pending next-head CI: share older plan/evidence pages in the parent child workspace; expose bounded searchable/paged activity templates including specialty-before-cap filtering and plan-editor search; regression-test 210 library entries, plan-tab to Progress-tab persistence, and selection beyond the initial library page. **All six CI jobs and new Codex review are required; not yet qualified.**

### M2-H04 `21b5f5d`/`b0dce10` CI and Codex follow-ups (2026-10-31)

- `21b5f5d` demo-journey failed because its old result-count expectation assumed client-only filtering; the updated exact-head run on `b0dce10` passed API/web build, PostgreSQL test job, secret scan, live-session and preview-container but failed a synthetic-browser assertion that tried to wait for a native `<option>` to be *visible* (the option existed but HTML option nodes are not visible to that wait). The browser regression now checks option existence before selecting it.
- Codex also found a real assessment-history retrieval gap after the 200-assessment cap and a search-input focus loss during server-side refresh. Corrections add shared 200-record assessment pages, a visible retrieval button, 206-assessment PostgreSQL coverage, and persistent search controls. **Pending new exact-HEAD six-job CI and Codex verification; no merge qualified yet.**

### M2-H04 `7d58c9c`/`ab494609` further qualification and discovery fixes (2026-10-31)

- Run on `7d58c9c`: 21/21 PostgreSQL API suites PASS, browser `demo-journey` PASS, secret-scan, live-session and preview-container PASS; Compose was still running at this checkpoint. This is **not** final HEAD.
- Run on `ab494609`: 595/596 API tests PASS; one concurrency test was overly strict about the audit reason when two correctly serialized referent-clearing paths race. The assertion now accepts the two explicit reasons while still requiring null final referent and monotonic history. Demo-journey failed due to use of an unsupported Playwright Locator focus helper; repaired using `document.activeElement`. These test corrections reached subsequent heads.
- Codex on `ab494609` flagged two more blocking P2 discovery gaps: older reports and late-sorting active therapists hidden by 200-entry caps. Added stable bounded report paging and staff specialty/search/offset paging, exact-ID referent lookup, load-more controls and 205-record real-PostgreSQL regressions. **Exact final-head six-job CI and independent review remain mandatory.**


## M2-H07 — implementation test inventory (2026-11-01)
**Result: NOT RUN / NOT YET VERIFIED on final HEAD.** Code adds `apps/api/test/handover.e2e-spec.ts` child-scoped pagination cases (101 unrelated cancellations, older selected-child retrieval, active proposal persistence, invalid/unauthorized/cross-center parameters); `scripts/design/check-handover-sessions.mjs` real independent coordinator/incoming therapist/second manager browser sessions (acknowledge, cancel, readiness status synchronization, 320/390, keyboard/IDs, denied child query, no assignment); `run-demo-live.mjs` isolated synthetic runner opt-in. Existing `scripts/design/check-child360-logic.mjs`, API suites and all six required CI jobs remain mandatory. No hosted production or patient test implied. Pending CI evidence must be attached by run ID and immutable SHA, never inferred from file presence.


## M2-H07 CI qualification checkpoint — 2026-11-01
GitHub Actions [run 41242446451](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41242446451) completed **SUCCESS, 6/6 jobs** at implementation HEAD `0955bb3e66033a5099a46506990ffa1b6bdadda9`: test (23/23 suites, 617/617 API tests, web build + frontend regression), secret-scan, live-session, preview-container, demo-journey (including three-browser handover synchronization), compose. The initial earlier SHA typecheck failure was fixed by adding the required `createdAt` to a synthetic child fixture. **This documentation update creates a new HEAD**; latest exact-head CI and final Codex review must still be rechecked before merge. No governance release approvals changed.
## M2-QA01 simplified synthetic evidence — 2026-11-01

Offline QA contracts: **34/34 PASS** for `hosted-readonly`, preflight, workflow paths, report sanitization/HTML, privacy-redacted layout-only PNG references, hash verification, exclusive directory reservation and historical crypto compatibility, run locally with temporary fictional fixtures. The new HTML/JSON/PNG packaging is **NOT RUN** on live hosted environment; full repository CI and exact-head review pending. Public repository artifacts cannot be treated as private, and redacted images cannot prove text/dialog appearance. Previous protected hosted run #5: **7 PASS / 0 FAIL / 35 BLOCKED** on its 42-case subset, encrypted historical artifact; 35 visual/dialog reviews outstanding. Fixed 104-case baseline remains **53 PASS / 0 FAIL / 47 BLOCKED / 4 NOT TESTED**. No clinical authorization inferred.
# M3-AI01 qualification — 2026-11-02

New `apps/api/test/ai-foundation.e2e-spec.ts` covers default-disabled provider, deterministic offline fictional drafts, prompt/request fingerprint separation, staging/production refusal and malformed/duplicate/over-budget evidence. Tests **NOT YET RUN** in this environment. Exact-head CI and independent reviewer **PENDING**; do not count as PASS before GitHub Actions evidence. Prior M2 PR #152 merged; production clinical gates remain NO-GO.

# M3-STT01 synthetic transcription QA — 2026-11-02

Extended `scripts/design/check-session-workflow.mjs` with simulated capture start/pause/resume/stop, disabled transcription until stopped, French fictional transcript, unsaved-before-insert and explicit discard. Existing network/permission/provider/cancel/empty failure probes remain. **NOT YET RUN** on this implementation SHA; exact six-job CI and final independent review pending. No real audio/STT testing or clinical authorization implied.


## 2026-11-02 — Hosted stakeholder rehearsal checks (PR #162)

Historical live protected run [41451350004](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/41451350004) on merged PR #160 runner: **43 PASS, 0 FAIL, 14 BLOCKED**. The two BLOCKED per role are mutation/form validation and clinical/AI draft review; expected exit code 2, not a confirmed UI defect. PR #162 adds checks for a real assigned fictional child, all six interactive clinical tabs, loaded report list/empty (no error), disabled AI banner and clearly labeled guardian sample progress. These new checks are **NOT RUN / NOT ACCEPTED** pending merge and protected live dispatch. No clinical release permissions or 104-case baseline changes.

## 2026-11-02 — Additional fictional center roster, NOT RUN

Seed regression added for idempotent 6 children, 3 display-only extra therapist memberships, guardian siblings, 15 demo appointments and unchanged 7 auth identities. **New tests NOT RUN; CI and hosted deployment PENDING.** Historical protected interactive run 41461657662 remains 47 PASS / 0 FAIL / 14 BLOCKED. Never infer clinical acceptance from synthetic demo fixture counts.


## 2026-11-02 — Three synthetic therapist identities (PR pending)
**PENDING CI/REVIEW/DEPLOYMENT:** New tests assert 10 local auth identities after repeat seed, three Ahmed sibling links, therapist behavioral specialty and 15 appointments; hosted preview rejects a missing/malformed three-password secret. Additional protected browser runner verifies three distinct synthetic therapist logins, therapist context and logout. Historical seven-role run 41489268355 was dispatched separately; its status does not prove new account access. No new clinical sign-offs or family releases.


## 2026-11-12 — COM-02 PR #362 candidate Docker release evidence
Implemented offline unittest cases for streaming byte hashing, traversal, duplicate archive member paths, mutable/forged digest pins, Docker inspect RepoDigests mismatch and no automatic approvals. Full GitHub Actions execution and exact-head result **PENDING** at implementation checkpoint. No actual image export or cryptographic publication attestation has been executed; do not mark any of the 53 npm versions or 91 source assets legally approved. G2/G2b remain NO-GO.

## 2026-11-12 — PR #362 capture integration verification candidates
Added tests for tagged image references (registry port and tag), matching local Docker-export candidate into release scope without rights promotion, and rejection of forged independent signature, copyright approval, complete-runtime-mount assertions, or negative omitted entry counts. These are **implemented test cases, not yet a verified green exact-head run**. Review/commercial go-live unapproved.

## 2026-11-12 — PR #362 canonical Docker RepoDigest fixture
Added mocked image inspect/create/export successful SHA-256 capture with canonical tagless RepoDigest, version-tagged image input and registry port. This covers the previous real-world false-reject condition without weakening digest requirement. New case not yet confirmed by final-head CI. Clinical/commercial authorization remains NO-GO.

## 2026-11-12 — PR #362 offline merger regressions
New Node tests for successful candidate-only dual-edition merging, rejected swapped/duplicate editions, fabricated signature and legal fields, path traversal/duplicate file rows, malformed digests and file-order canonicalization. Test execution on final GitHub head not yet confirmed; no authorization claims. Python Docker capture tests remain a separate full-CI gate.

## 2026-11-12 — COM-02 DSSE signed OCI candidate attestation test scope
New offline Node `node --test scripts/commercial/verify-oci-dsse.test.mjs` exercises valid pinned-key Ed25519 DSSE for exact two-edition image digest and SHA-256 inventory; wrong trust key, corrupted signature, signed wrong digest, forged file inventory, swapped edition, forged schema/legal permissions, unsigned envelope, malformed encoding, tampered local file capture and unsupported RSA key. At commit creation **NOT YET EXECUTED IN GITHUB CI**, no acceptance claims. No real publisher/registry attestations or commercial/clinical permissions verified.

## 2026-11-12 — COM-02 signed candidate-to-rights integrity fixtures
New adversarial Node tests: valid two-edition signed local capture against all package/asset records, both edition asset byte matches/absences without authorizations, omitted package/asset rows, forged rights, corrupted manifest image digests and SHA-256 hashes, wrong independently pinned Ed25519 key, signed forged file-inventory hash, invalid signature, and signed fabricated approval. **Tests added, not yet proven green on final PR head**. Clinical G2/G2b and commercial grants stay NO-GO.

2026-11-12 Added supplemental obligation preservation and negative tests to PR #364 signed rights reconciliation: require OS_RUNTIME_CONTAINER, POSTGRES_REDIS and MODELS_DATASETS_EXTERNAL_SERVICES exactly once with their unresolved reasons; reject missing/duplicate/unexpected categories, modified reasons, or forged commercial approval. New-head CI qualification pending; do not mark as passed until runner reports results.

## 2026-11-13 — M4-08 owner-revised 90% qualification evidence (PR #358)
**Target:** full-source API/Web lines, branches, functions and statements >=90% on exact raw Istanbul ratios; formerly 95%, explicitly revised by owner. No production source exclusions or denominator reduction. **Verified Web focused result** at head `ae5c3a8`, GitHub Actions run `43488342915`: 1,557 tests / 114 suites PASS; all 154 Web source modules instrumented; lines 96.03%, branches 90.00% (audit below90=[]), functions 90.71%, statements 93.67%; two zero-statement Web modules remain in denominator. **Last verified API before additional coverage suites:** head `d215843`, run `43485535949`, 1,331 API tests / 58 suites PASS, 93 modules; lines 96.86%, branches 88.19%, functions 95.73%, statements 95.14%. New clinical/invitation/report source-executing tests are **NOT YET VERIFIED** on final head. Codex review on prior head `6d74f0d` raised Rule 7 evidence P1 and integrated-threshold/manual-dispatch P2s; corresponding code/document corrections require new CI and final-head review. Do not claim API 90% or PR final qualification yet; clinical G2/G2b NO-GO.

## 2026-11-13 — npm Sigstore bundle-verification acceptance scope
New offline Node tests for scoped PURL encoding; exact pinned npm Sigstore verifier and in-toto Statement v1 digest/PURL match; forged signed version, package name or tarball SRI; invalid/missing bundle export; missing/extra/duplicate verified entries; nonzero audit exit; SLSA source commit claim not automatically approved. These are implementation tests; final-head CI results and real trusted bundle statuses are pending. No licensing or clinical approval inferred.

2026-11-13 Initial PR #366 real npm evidence observed 3 advertised/verified CLI bundles, 0 second-stage matching signed subjects (BAD_SIGNED_STATEMENT); no publisher-to-source mapping may be approved. Added raw npm 11.19.1 audit JSON to exact-head CI artifact. Existing adversarial parser tests passed after expected identity rejection fix; full new-head CI and external Codex review pending.

2026-11-13 Updated Sigstore tests to require two authentic signed in-toto statements (publish v0.1 + SLSA v1) for each exact npm PURL/SHA512, reject missing/duplicate/type mismatch, forged subjects, wrong workflow repository, and no-candidate/invalid-audit false success. The first live verifier run archived original bundles but yielded 0/3 due unsupported publish statement; updated matcher needs final-head CI evidence before any new verified counts are reported.

2026-11-13 Regression: mismatched signed workflow repository must reject even with valid outer signed npm package subject and digest, so SLSA source revision claims cannot be silently empty. First CI failed 1 of 8 focused tests (7 passed); corrected parser awaiting fresh exact-head CI and Codex.

## 2026-11-13 — signed npm release to Next.js source manifests
New tests cover 53/3 version-set selection; three signed SLSA revision claims and exact raw/receipt SHA-256 binding; one exact @next/env source manifest; two parent SWC source manifests; wrong source versions and timeout; counterfeited signature receipts, removed/duplicated versions, raw bundle swapping, modified signed source commit, unsafe path traversal. No test claims binary/package reproducibility, rights-holder approval or G2/G2b clinical GO. Exact-head full CI and Codex qualification pending.

## 2026-11-13 — signed npm archive/build-readiness tests
New offline Node cases: allowlist only the 3 signed Next.js versions, exact SHA512 tarball SRI, regular tar file SHA256/paths, reject duplicated names, traversal, symlink or global tar extension, reject absent/mismatched source package version and build commands. Actual published tarball/immutable source data qualified only after full CI. All completed build/release and legal approval counters remain zero.

2026-11-13 New Codex P2 regression: zero verified tarballs -> NO_VERIFIED status; partial/recipe gap -> PARTIAL status; exactly 3 verified archives and recipes -> complete inventory status (not reproduced build). File lists retain individual SHA-256/path/byte values and stable serialization. Latest corrected-head CI pending.

2026-11-15 — COM-LAUNCH suite added (six tests) for default blocked SaaS/Enterprise, fabricated approval, fake image digest, duplicated/missing obligations, forged evidence, and clinical G2/real-patient bypass. CI-wired but NO exact-head run PASS claimed until completed. The validator cannot grant legal/clinical authorization.

2026-11-15 — Added seven COM-02 comparator tests for authentic archive same/different bytes, altered contents, forged legal grant, unsupported identity, tampered file inventory, attacker-rehashed fake archive/readiness and mispinned SRI. CI integrated on latest main; run results pending. No source reproduction, commercial or clinical approval.

2026-11-15 — COM-05 draft policy has seven Node regression suites for unpriced editions, forged license/quota, expiry not deleting data or blocking export, cross-tenant/billing-clinical bypass, unsafe phone-home or issuer, unauthorized lifecycle automation, invalid editions/states. Test implementation committed and wired into full CI; exact-head qualification PENDING. No approvals implied.

2026-11-15 — COM-01 new eight-test Node suite validates eight unresolved rights categories, nine draft contract sections, eleven non-approving decision IDs and SHA source references; rejects omitted/duplicated scope or contract section, forged OPEN-to-VERIFIED rights row, adopted proposed notice, missing clinical safeguard and leaks of raw contributor/contract text. CI wired; exact-head outcome PENDING.

2026-11-15 — COM-01 latest Codex P2 follow-up: draft agreement's NOT SIGNABLE disclaimer and all seven approval-matrix rows (OPEN/BLOCKED/NO-GO) now strictly validated; forged APPROVED/GO changes rejected. Reused strict COM-05 parser against misleading input. Fresh exact-head CI and Codex required; no clinical/commercial approval.

2026-11-15 — COM-02 15-root independent GitHub manifest observations: 15 exact source name/version match, 13 claimed repo direct, 2 alternative repo at exact same commit; no archive-to-source reproducibility or rights approvals. New seven-test regression suite checks all 53 preserved, forged source SHA/repo/commit and alias, missing/duplicate rows, fake commercial/clinical approvals and safe transient source HTTP failure. CI pending on exact PR head.

2026-11-15 — Additional corroboration: GitHub API resolves `nuxt/consola` -> `unjs/consola` to repository ID `127546642`, and `Sebmaster/tr46.js` -> `jsdom/tr46` to repository ID `36964214`. Same exact original Git revisions contain matching name/version manifests. This verifies current GitHub repository redirects, not legal copyright transfer, npm publisher-to-source build proof, or redistribution clearance. Added frozen IDs and forgery regression; exact-head CI/Codex must requalify.

2026-11-15 — COM-02 DefinitelyTyped 26-version audit: added six Node adversarial test scenarios for exact 53-way membership, 26 versions and two node majors, SRI/registry/tarball mismatches, fabricated immutable commits and authority, forged approvals and missing/duplicated rows. New per-commit CI artifact is unapproved candidate evidence. Exact-head CI/Codex PENDING; no false publication lineage.

2026-11-15 — New COM-02 closure ledger regression scenarios cover exact 53/26/27 population; 15+7+3+2 group classification; 91 source asset hashes and 73+15+3 category conservation; fabricated publisher/revision/approval, missing or duplicated package records, altered image approval; missing or unverified SaaS/Enterprise release claims. CI wired; exact-head full qualification pending. Neither legal nor clinical approval issued.

2026-11-15 — New DT publisher hash tests: 64-lowercase hex @types fingerprint candidate capture, missing/malformed/non-type differentiation, no publisher authority, and 26-version triage count/status. Reject mismatched hash/status, fabricated verified status, missing Git sha and false rights upgrades. CI existing collector and DT triage tests are wired; run outcome pending.

2026-11-15 — New COM-02 immutable Git source verifier test suite: publisher shallow-sorted JSON + normalized newline SHA-256, exact Git blob equality, deliberate content mismatch, tampered Git blobs, unknown/unpinned source SHA and path, forged triage provenance/licensing and changed 26-version inventory. GitHub source snapshot observations are best-effort receipts with zero legal/source-publisher attestation. CI/Codex pending; G2/G2b NO-GO.

2026-11-15 — Added six adversarial 2023 prepublication snapshot probe scenarios: correct candidate record and nonauthorizing counters, forged publisher approval, wrong version, Git API outage, invalid 26-version triage and mismatched boolean/status. CI live Git observations PENDING. Source snapshot matches are not historical publication attestations.

2026-11-15 — Extended COM-02 historical snapshot PR with a third exact candidate: @types/cookiejar@2.1.5 at Git commit 7aa25146316b7bafa0863d69bc5f125cde97f216 (2023-11-20 23:33:15 UTC), distinct from its mismatched 2023-11-03 commit; both source package/index Git blobs match the later 2026 verified fingerprint input blobs. CI now recomputes the whole pinned historical tree, NOT an authenticated original publication or commercial clearance. Exact-head CI and Codex qualification pending, G2/G2b NO-GO.

## 2026-11-17 — COM-02 current-main carry-forward QA truth
Prior exact-run 43952347637 and 43952897398 on predecessor licensing branch: adversarial offline comparison tests PASS; nine original npm archive comparisons PASS, **8 raw published package.json SHA-256 matches**, **1 source difference (@tokenizer/token@0.3.0)**, **1 current source-root pending frozen observation (unicode-emoji-modifier-base@1.0.0)**; all nine attempted tarballs Yarn SRI plus archive SHA256 verified; 0 publisher-source independently attested, 0 legal approvals. Codex P1 on tenth root and emoji-regex two-version fixture both fixed and tested; original threads resolved. Latest-main carry-forward head **NOT RUN / NOT QUALIFIED** until new six-job CI, SBOM and independent Codex. G2/G2b NO-GO.

## 2026-11-17 — COM-02 #405 independent raw Git source vs locked npm archive tests (NOT RUN)
New tests cover exact Git blob SHA1 and raw manifest SHA256, byte-equal and npm-generated differing manifests, forged package name/version, source commit, locked SHA256, Yarn SHA512 SRI, wrong archive content and false rights/clinical approvals. Network original npm archive comparison and CI receipt now wired after predecessor #407 9-source-root receipt. **Exact-head tests NOT RUN; actual npm archived output NOT OBSERVED; independent Codex PENDING.** Historical #407 remains 8 matched frozen roots + @tokenizer/token mismatch + unicode-emoji-modifier-base missing independent frozen source comparison. No commercial or clinical GO.

## 2026-11-17 — COM-02 #405 first CI test result / repair
Run 44013997014: offline strict source/Git blob/SRI/identity adversarial tests PASS; live original npm archive read FAIL COM02_405_NOT_ALLOWLISTED. Root cause: Yarn v1 exact archive URL uses registry.yarnpkg.com (allowed by existing production tariff checker), but new script recognized only npmjs.org. Expanded exact host allowlist to include Yarn registry. Corrected code and final-head CI NOT YET RUN; source-to-published npm raw manifest byte match remains UNKNOWN; source SHA256/Git blob SHA1 independently corroborated. No publication-build or rights approval.

## 2026-11-17 — COM-02 #405 verified additive tenth Git/npm source-root evidence
**Run 44014352663:** Offline adversarial tests PASS; original locked npm archive vs exact immutable Git source source-root comparison PASS. Current unicode-emoji-modifier-base@1.0.0 raw source SHA256 **242f5577f26c3fff547508911718348993d5ef04ff72a44c71115ce002521301** == original npm package.json SHA256; Git blob SHA1 independently verified; locked npm archive SHA256 b753860ffa1f54f2b415de82e23d2ce79a89bfdc5fff1a4361a32cc8215ff4e5 and Yarn SRI verified. Receipt status EXACT_RAW_MANIFEST_MATCH_NOT_PUBLISHER_ATTESTATION; publisherBuildLineageIndependentlyAttested false, sourceCopyrightRightsApproved false, commercial/SaaS/Enterprise/G2/G2b false. Combined with merged #407: 9/10 exact source-root manifest byte matches, 1 tokenizer mismatch, none missing source observation at this checkpoint. This is not full tarball/build proof or legal clearance. **Updated Rule7 HEAD CI/Codex PENDING**; historical earlier run does not qualify changed head.

## 2026-11-17 — COM-02 #402 tokenizer source/npm field classifier (NOT RUN)
New offline adversarial cases for path escaping, arrays, fields added/removed/changed, value SHA256 redaction, JSON depth/size limits and forged commercial population approvals. Same-run live CLI checks pinned Git source SHA256+Git SHA1, Yarn original archive SHA512+SHA256, published manifest SHA256 from prior validated mismatch, and exact identity; emits no raw third-party text or permission. CI tests/artifact wiring committed but **new exact-head Node tests NOT RUN, live mismatch JSON fields UNKNOWN, required CI and Codex PENDING**. No source-build authenticity, rights, SaaS/Enterprise or G2/G2b approval.

## 2026-11-17 — COM-02 #402 first full CI negative and repair
Run 44016599836 failed at shell exit 127 when a mistakenly placed `/tmp/therabridge-com02-tokenizer-manifest-diff-402.json` line was executed as a shell command in earlier #405 verifier step, before new tests. Its preceding exact npm/source verification result was PASS. Fixed workflow artifact path placement at aa26fabc; **revised exact head CI NOT YET VERIFIED**, true field-drift outcome UNKNOWN. No publisher, commercial, release or clinical approval.

## 2026-11-17 — COM-02 #402 real tokenizer npm/Git manifest drift result
CI 44016933031: offline field-drift classifier adversarial tests **PASS**, live original locked npm package archive vs immutable Git source classification **PASS**, receipt inspected. Exact published package.json SHA256 a677763aaed22462b4f9df2526b1038cef3a90bc6cf80be27b4e65d0f14472a9 != source SHA256 17a56b5bea3a89c3fc67b4b75769414c6c4910e483cd47da1d2a2b02c3ffaa69, **JSON leaf changes 0**, status RAW_BYTES_DIFFER_BUT_JSON_LEAVES_EQUAL_UNATTESTED. Original npm tarball SHA256 911758ceca239c8e5372700eedfbbd514f16d3c117b5af0a648f6e720487c209 and Yarn SRI verified. No independent publisher build attribution, no legal approval or G2/G2b; actual editions unknown. **Final Rule7-updated HEAD full CI/Codex PENDING**, previous CI does not qualify changed head.



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

## 2026-11-22 — CI optimization qualification PR #469
Status: NOT YET QUALIFIED; implementation committed, full exact-head CI and Codex review pending. No claim of executed coverage or actual docs-only reduction until merge and a real docs-only PR are independently observed. Expected: full PR + main policy/code checks, narrowed docs-only secret-scan/SBOM/smart-targeted/smart-ci-gate with all heavy jobs explicitly SKIPPED, NOT PASSED. Regression tests cover protected/mixed/deleted/type-changed docs and full fallback. No clinical release.

## 2026-11-23 — #473 21: version-scoped authoring steps (EXACT-HEAD QUALIFICATION PENDING)
PlanVersion editor: mounted summary/goals/activities, no implicit draft save or release. Code and synthetic regression tests committed on the PR branch. All eight >=90% coverage floors, full per-PR CI, Codex P0/P1/P2 review disposition, five-width visual and keyboard/AT checks, and explicit owner acceptance remain separate and are **NOT YET CLAIMED**. Clinical G2/G2b NO-GO, permissions, consent, and rights restrictions stay unchanged. Do not close the observation based only on the existence of this PR.
## 2026-11-23 — PR #474, observations 22–24 (NOT YET QUALIFIED)
Assessment specialty help is factual and non-diagnostic; report/plan authoring gains accessible draft-only step guidance, not a completed persisted wizard. Staff handover and family plan requests are separate from sample practice feedback. Full CI, eight >=90% coverage gates, independent Codex findings, five-width keyboard/AT and owner acceptance are pending; clinical G2/G2b NO-GO stays fail-closed. Do not mark these items DONE on PR creation alone.

## 2026-11-23 — PR #475, guardian observations 28–31 (NOT YET QUALIFIED)
Rights-safe compact practice cards, a distinct family-documents destination, authorized linked-child tabs and clarified home-practice naming are implemented. The charts remain synthetic regardless of selected child; real family files remain blocked by the existing server release/consent gates. Full CI, eight >=90% metrics, Codex and five-width keyboard/AT/owner verification are pending. No production clinical or image rights approval is implied; G2/G2b remains NO-GO.

## 2026-11-23 — PR #477, owner observation 25 (PARTIAL; NOT QUALIFIED)
Optional staff-only PNG header/dimension check is implemented locally inside the pre-existing private metadata proposal panel; it never uploads, stores, previews, approves, sends or publishes image bytes. Added bounded/invalid/stale-choice/no-network mounted tests in apps/web/test/coverage-m5-obs25-local-media-readiness.test.cjs; execution and full exact-HEAD CI, eight >=90% API/Web metrics, independent review and five-width keyboard/AT/owner acceptance are PENDING. Image upload/storage/rights/scan/approval remain owner-gated in M5-14 #197; no real clinical release or G2/G2b GO. See docs/roadmap/M5-OWNER-OBS25-ACTIVITY-MEDIA-READINESS.md.

## 2026-11-23 — PR #480, observations 11, 13, 22–25, 27 and M4 CI (DRAFT, QUALIFICATION PENDING)
PR #480 restores #474's specialty assessment guidance, guided report/plan creation and separate practice feedback/handover/plan requests inadvertently removed by #475. It adds admin-managed non-self-assignable specialty/responsibility grants with server-side tamper rejection (#27), separately encrypted/versioned restricted family-reported child intake (#11), scanned encrypted private child-photo candidate and linked-guardian consent/denial/revocation (#13), and scanned encrypted private activity illustration candidate staging to exact media draft/version (#25), with no public/clinical publication. M4-06 disposable Docker port replay parser has a fail-closed robustness and diagnostic update. All new private-media operations require secure TB_PRIVATE_DATA_KEY_B64 and trusted local TB_MEDIA_CLAMD_SOCKET, otherwise deny; no pretend scanner/rights/clinical GO. Source and mounted tests added. Full exact-HEAD CI, eight >=90% API/Web coverage checks, independent review, five-width visual/AT and real deployed scanner/key workflow remain NOT VERIFIED. See docs/roadmap/M5-OWNER-OBS11-13-22-27-RECONCILIATION.md.

## 2026-11-23 — PR #481 M5 shared UX (implementation / acceptance separate)
New one-PR follow-up from merged #480 for issues #187/#189/#190/#191/#192: token-based light/dark clinical action text and target sizes, report optional-drafting progressive disclosure (without touching auto-save or clinical gates), labeled session action controls, center/member-scoped schedule reset and stale-query suppression, supervisor keyboard focus, three-sibling guardian screen-reader announcement. Source/mounted regressions plus isolated five-width therapist/coordinator/supervisor and five-width light/dark guardian browser evidence runner added. Technical receipts use no screenshot bytes or identifying information. A separate 4-role x 5-width x 5-state pending human matrix contains 100 cases and 500 explicit NOT_RUN manual checks (keyboard, screen-reader, focus, contrast and overflow). Browser evidence, all eight >=90% coverage gates, exact-head independent Codex review and full CI are NOT CLAIMED PASS until observed; real screen-reader and user task-timing/owner acceptance remain NOT_RUN. G2/G2b clinical NO-GO, no family-message leak, no real media release. See docs/qa/M5-04-06-07-08-09-UX-QUALIFICATION.md.

## 2026-11-23 — PR #482 M5-12–17 media dependency chain (draft / NO-GO)
From merged main `41b751b6713c9a65825ad6c1a324b8f96de4a04b`, PR #482 prepares M5-13 style reference packet (five specialty families x five archetypes, 4:3 square-safe crop; no generated or approved images), M5-14 atomic revocation of linked encrypted quarantined activity-image candidates whenever an authenticated writer rejects the exact draft version, and an offline Ed25519 independently provisioned trust-anchor verifier for style owner/design/clinical, storage security/privacy, and individual asset rights/design/clinical review receipts. It ships NO trusted human keys/signatures and grants NO live read/approval/release. M5-17 new transactionally scoped real synthetic database inventory counts center/global stored activity templates, drafts, quarantined/revoked/stale candidates and flags missing approval model; published denominator and coverage remain unknown rather than 100%. Actual human design/clinical/security/legal review, generated 4:3 reference images, media derivatives, approved immutable read model, pilot 20–30, 100% truly published coverage, screen-reader and owner usability review remain NOT RUN/BLOCKED. Adversarial tests wired into full CI and demo-journey artifact. No clinical G2/G2b GO or family media release. See `docs/roadmap/M5-12-17-ORDERED-MEDIA-QUALIFICATION.md`, `docs/product/M5-13-ILLUSTRATION-REFERENCE-PACKET-v1.md`. Exact-head CI, coverage and independent review remain UNVERIFIED until verified on final PR head.

## 2026-11-23 — PR #482 follow-up: per-step illustration binding and private candidate status history
Added an additive nullable step ordinal to activity media drafts, an exact-version server check that the step exists, bounded tenant-authorized candidate status history (status, dimensions, version, timestamps only; no digest, bytes, key or URL), and a clinician-only UI for selecting an activity step and inspecting quarantined/revoked candidate metadata. Added adversarial API tests for invalid steps, foreign draft/cursor, redaction and pagination. This is implementation progress only: style, rights, design/clinical signoff, immutable approved projection, image read/publishing, generated artwork and pilot remain NOT APPROVED/NOT RUN; G2/G2b NO-GO. Exact-HEAD CI and independent review must be checked after the commit.

## 2026-11-23 — PR #482 P2 security repairs
Fixed Codex P2 final-upload/reject race with the same draft-row FOR UPDATE lock in both transactions and a second draft-state check after locking; wired two actual isolated PostgreSQL interleaving orders into the demo CI runner (cleanup after test). Fixed the offline Ed25519 approval-chain verifier so every asset's signed digest is recomputed from the immutable subject and must bind to the *same* verified style/security subjects. Added adversarial cross-chain tests, plus candidate cursor validation fix. These changes create no clinical/image read, sign-off or publication authority. CI/review evidence pending observation on exact HEAD.

## 2026-11-23 — PR #482 M5-12 catalogue metadata/filter implementation
Added nullable clinician-authored category and skill, and array equipment fields (empty default) with additive migration; backward-compatible create/edit/duplicate handling; centre-authorized server-side exact category/skill/equipment filtering, search integration, and opt-in progressive-disclosure filters in the activity library. Staff can edit and read these fields; unknown legacy clinical taxonomy stays null instead of being fabricated. API tests check AND predicates with tenant scope and absence of synthetic defaults. No change to the quarantined artwork read/release boundary, no generated image qualification, G2/G2b remain NO-GO. CI and review pending exact-HEAD verification.

## 2026-11-23 — WU1 shared UX engineering qualification (branch, NOT YET CI-QUALIFIED)
From merged `main@7322aa7`, WU1 reconciles M5-04/06/07/08/09/10/11 against actual #395/#413/#420–422/#430–481 code rather than open issue counts. Fixed genuine supervisor-queue same-scope failed-refresh stale report-link exposure (retained useLoad results) with fail→retry mounted regression; schedule already had equivalent fail-closed masking. Added 7 persona × 5 real viewport × 2 theme browser interaction checks for all shared app shells, nav/header text contrast, mobile More Escape/focus and scroll unlock, desktop rail, 390 theme reload and no overflow; strictly numeric/no-private-data validated 35-row CI artifact with human approval remaining NOT_RUN. Consolidated minimal owner+qualified AT triage and unwaived 100×5 original manual register in `docs/qa/M5-WU1-FINAL-SHARED-UX-RECONCILIATION.md`. Full exact-head CI, >=90% eight gates and independent Codex review PENDING; no human screen reader, measured task improvement or owner signoff is fabricated. Clinical G2/G2b NO-GO unchanged.

## 2026-11-23 — WU2-A illustration-style consistency and security (PR draft, acceptance NOT APPROVED)
- Created **actual 25 AI-rendered concept images** as a separate conversation artifact (5 scene archetypes × 5 families; 4:3, 320×240 individual review crops), recorded contact-board digest `169c34a1589084b2cc7dd722bb0ec839165453a1b2a31b80f2ae6d2ff32e40a5`. Binary concept artwork is **NOT committed to GitHub**, does not exist in the runtime and is NOT approved/production master imagery. `docs/product/M5-WU2A-REFERENCE-CONCEPT-REGISTER.md` captures this honestly. Human review must vet proportions, therapeutic poses, props, rights, and brand compliance; reference guide and board are NOT APPROVED.
- Added one proposed `m5-b-v1` Direction B style contract with five visual families, five archetypes, 1600×1200 master/1200×1200 safe-square specification. The catalogue/print projection, staff media-draft form, activity cards and therapist picker use the same style identity; the proposed style field is read-only and new unsupported style proposals fail server-side even outside HTTP DTO validation. All present illustration cards remain text-only placeholders, not generated/approved images.
- M5-14 security: added authenticated `POST /centers/:centerId/activities/:templateId/media-drafts/:draftId/candidates/:candidateId/revoke` for single-candidate, **tenant+activity+draft+author** scoped atomic CAS revocation with the same draft-row lock as upload/draft rejection, append-only centre audit, redacted false-authority response and no publication/read endpoints. The author can revoke unsafe candidates even if centre trial writes are restricted; no grant or approval is assumed. Staff status UI requires explicit confirm, clears cached candidate rows while revocation is checked and re-fetches after success.
- Tests: source contract for 25 no-approval slots, style equality across front/API/cards/print, adversarial wrong styles; backend reauthorization/foreign/stale revocation/audit atomicity; mounted UI confirm/403 redaction. Full exact-HEAD CI/8×>=90% API+Web coverage/Codex independent review pending, not claimed PASS.
- **Human gates unchanged:** owner+design+clinical frozen reference-board signoffs, privacy/security storage assurance, individual legal/rights approvals, full-size master images/derivatives, actual production scanner/storage, consent/guardian permissions and G2/G2b clinical release all NOT APPROVED / NO-GO. WU2-B/C and public image rendering remain blocked pending independent approvals.
\n## 2026-11-23 — M5 WU2-A evidence/preflight continuation (provisional; CI pending)\nPinned original 25 concepts via independent board/manifest hashes and explicit integrity test, with human review checklist. Added operator-only live ClamAV UNIX socket PING/VERSION/synthetic stream probe + server-key AES-GCM self-test. Does not assert real deployed runtime verified, scanner negative control, legal hold, retention/deletion, backup, privacy/legal/clinical approvals, or published media. No G2/G2b release. Refer to docs/product/M5-WU2A-REVIEW-HANDOFF.md and docs/qa/M5-MEDIA-OPERATOR-PREFLIGHT.md.\n
## 2026-11-23 — All 25 illustration concepts: therapist acceptance reported, signed review pending
User reports that a therapist approved all 25 concept images in the existing hash-verified m5-b-v1 board. The exact 25 IDs and image SHA-256 fingerprints are pinned in docs/product/M5-WU2A-THERAPIST-CONCEPT-APPROVAL-REPORT.json and an adversarial no-release test. This is user-reported concept-review acceptance, NOT an identified independently signed CLINICAL_STYLE Ed25519 receipt; the signed human approval chain must continue to fail closed. WU2-B internal-only engineering can proceed; OWNER_STYLE/DESIGN_STYLE, legally cleared provider/asset rights, production 1600x1200 masters, independent media security/privacy approval and per-asset clinical instructions review remain pending. No public images, no runtime permission change and G2/G2b remains NO-GO. See docs/roadmap/M5-WU2B-POST-THERAPIST-APPROVAL-PLAN.md. Latest branch exact-HEAD CI and Codex review not yet verified.
\n## 2026-11-23 — WU2-B private catalogue and controlled-generation implementation (unqualified)\nOwner reports decisions 1–3 complete (owner/design, clinical, legal/IP); independently signed/evidenced receipts still pending verification, not fabricated. 25 m5-b-v1 reference metadata slots and locked offline generation plans with rights/provider evidence digests; 1600x1200 PNG private quarantine preflight with bounded decoder/CRC added on branch. No paid generation, production master, actual scanner/storage attestation, guardian read, image publication or G2/G2b activation. Exact-head CI, 8x >=90% coverage, independent Codex review and owner/AT testing NOT RUN/PENDING. See docs/roadmap/M5-WU2B-PRIVATE-PIPELINE-IMPLEMENTATION.md.\n
## 2026-11-23 — WU2-C private master derivation (IN PROGRESS, NO PUBLICATION)
From merged WU2-B PR #487 (main e4797db), add a strict 1600x1200 PNG decoding and deterministic 1200x1200 safe-square crop plus 400x300 4:3 sampled thumbnail derivative pipeline. No sharp/libvips dependencies; RGB and alpha-safe RGBA outputs. Recompute source/provenance/derivative digests, validate full zlib consumption, disallow metadata/unsafe chunks, verify output integrity, and exclude raw bytes from ordinary JSON receipt logging. Candidate output remains PRIVATE_UNREVIEWED_DERIVATIVES with scanner, storage, individual asset QA, signatures and rights verification NOT QUALIFIED. 25 original 1600x1200 masters NOT PROVIDED; no real assets have been generated or deployed. Public/guardian reads and G2/G2b remain disabled. Node adversarial fixture tests added to full CI; exact-HEAD CI, eight >=90% coverage metrics and Codex final review NOT RUN on new PR yet. See docs/roadmap/M5-WU2C-PRIVATE-DERIVATIVE-QUALIFICATION.md.


## 2026-11-24 — M5 WU2-C operator encrypted illustration custody (PR not yet qualified)
Continues merged #488 strict private master derivatives. New isolated script scripts/qa/m5-wu2c-private-custody.mjs implements actual trusted-local ClamAV UNIX socket scanning (PING/VERSION/INSTREAM), all-three-asset scan gate, AES-256-GCM encrypted private 0700/0600 atomic staging, HMAC-chained local audit, default seven-day retention and explicit legal-hold-clearance expiry purge, synthetic-only. No new API routes or public/guardian reads; model provider invocation, real 1600x1200 images, operational S3, key rotation, backups, human signed approvals and independent security qualification remain unavailable. All returns fail-closed, G2/G2b NO-GO. Added adversarial tests in unchanged full CI; exact-head results, 8x >=90% coverage, independent Codex review, five-width/manual owner/security acceptance are NOT YET VERIFIED. See docs/roadmap/M5-WU2C-PRIVATE-CUSTODY-AND-SECURITY.md.\n

## 2026-11-24 — M5 WU2-D production illustration intake (PR #490; qualification pending)

From merged PR #489 main@0047280b, source candidate implements fixed 25-slot `m5-b-v1` production manifest, exact 1600×1200 fictional master provenance/intake, HMAC-bound optional model/run and prompt/source hash in pre-existing ClamAV-scanned encrypted private custody, duplicate-safe private inventory and adversarial offline synthetic tests. REAL 1600×1200 ART, licensed provider execution, clinician/design/rights signatures, provider legal evidence, independent storage/AV/security acceptance, 100% genuine published-image coverage and manual five-width/AT review have NOT occurred. No active API, guardian delivery, patient media or G2/G2b GO. The added blocking CI source test and existing eight ≥90% API/Web floors, final-head Codex review and manual acceptance are PENDING verification; do not mark PASS on commit creation. Trace docs/roadmap/M5-WU2D-PRODUCTION-ILLUSTRATION-QUALIFICATION.md; #196 #197 #198 #200.


## 2026-11-24 — M5 WU2-E staff-only numbered step/illustration fallback

**Predecessor:** M5 WU2-D PR #490 merged as `29ea7651c34264e4b4ffc4169ac6fae7a70f3742`. PR #491 implementation: version-bound immutable `m5-b-v1` numbered metadata projection, staff-only collapsible/semantic 4:3 no-image placeholders in the existing activity illustration proposal panel, 1/2/3-column CSS responsive layout, hostile-record denial, tests on existing family/clinical/session/print image-denial surfaces. No new media read endpoint, signed approval, provider invocation or image bytes; G2/G2b NO-GO; guardian/public image delivery disabled. Real 1600x1200 production art, per-image clinical/design/legal and alt/AT reviews, storage/privacy security certification and production acceptance remain NOT RUN/NOT PROVIDED. Exact-HEAD full CI, all eight >=90% coverage floors, final independent Codex review and manual five-width evidence PENDING at commit time; do not treat this planning handover as PASS. Docs: `docs/roadmap/M5-WU2E-PRIVATE-CATALOGUE-STEP-INTEGRATION.md`. M5-12 #195, M5-16 #199 remain OPEN.


## 2026-11-24 — M5 WU2-F genuine illustration pilot blocked readiness (PR #492)

**Predecessor:** WU2-E #491 merged at `9449a4ba00824814fbf59942bbf6caa6d94620e7`. Implemented portable **synthetic-only** `scripts/qa/m5-wu2f-pilot-readiness.mjs` and adversarial tests for one RepeatableRead snapshot of canonical ActivityTemplate/MediaDraft/PrivateMediaCandidate metadata, center-owned template version and specialty matching, immutable m5-b-v1 25-slot private-production operator receipt reconciliation, honest 20-candidate preview, and SHA-256-bound privacy-safe aggregate blockers. The new test is blocking in full demo-journey CI. No new media route, actual art, reviewer credential, release schema, clinical gate, published activity status or guardian access. **Published activity denominator UNKNOWN; published image percentage UNKNOWN; private receipts NOT independently approved; G2/G2b NO-GO.** A maximum of 25 distinct slot references can be planned under the current source matrix; a genuine 26–30 unique-art pilot needs separately approved additional images. Actual 1600x1200 art, provider contracts, per-asset clinician/design/legal signatures, S3+ClamAV security/retention, five widths/assistive technology owner acceptance: NOT PROVIDED/NOT RUN. PR #492 new code exact-HEAD CI and final reviewer **PENDING** at documentation commit; tests must not be marked PASS until observed. Details and external owners: `docs/roadmap/M5-WU2F-PILOT-COVERAGE-AND-ACCEPTANCE.md`. Keep #200 and approval predecessors open.


## 2026-11-24 — M5 PR A (#493): actual generated artwork intake
25 owner-directed fictional artwork sources generated and selected; 100 normalized master/review/card/square derivative files locally hash/dimension/decode/PNG integrity and ZIP CRC checked (pack SHA `8a569794ad95a9cac7f905fd2d8140956489bf62b37875bdf94d85cd410f078b`). Source files 1448×1086, resized 1600×1200 masters, no claim of native provider masters. Source implementation: exact 25-reference registry, local staff-only review PNG preview, specialty/scene/version-scoped metadata and server hash binding to existing scanned quarantine upload; operator-only full-pack integrity and batch custody entrypoint. No public image bytes or remote approved image delivery. Actual host scan/custody, independent signed rights/clinical asset approval, published catalogue/step mappings, deployed integration and human AT acceptance remain NOT RUN / OPEN. Full CI and exact-head review PENDING. G2/G2b NO-GO. See `docs/roadmap/M5-PR-A-ARTWORK-INTEGRATION.md`.


## 2026-11-24 — PR C private mapping integrity slice (qualification pending)
Current-version staff snapshot now remounts on center/template/version changes, discards old in-flight results, rejects malformed or duplicate slot inventories and reports proposed/scanned slot coverage separately from approved illustration coverage. Mounted adversarial regressions added. This is a preparatory slice only: approved persistent references, secure retrieval, catalogue/guardian rendering, actual published inventory coverage, private host import and signed evidence remain outstanding. Exact-HEAD CI/review NOT RUN at commit creation. No release or read gate changed; G2/G2b NO-GO.
