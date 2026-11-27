# M5 — A: Engineering closeout (2026-11-27)

Baseline: main `f0ecbb30ee071c4e0111332225ed733795685b1c`, merged PR #498. Render reports deployment `dep-dc35eqfavr4c73ecega0` live, promoted commit `32e0ddc43962cca33e3d5adb003538646cb48f66`. Render deployment metadata records main CI 45538070406 attempt 2 passed; this is not a fresh independent CI job inspection.

## Frozen original 17 requirements

| Items | GitHub issue status at baseline | Engineering reconciliation |
| --- | --- | --- |
| M5-01/02/03/05/10 | closed (#184–186, #188, #193) | preserve existing implementations and tests; do not reopen without concrete regression |
| M5-04/06/07/08/09/11 | open (#187, #189–192, #194) | #494 consolidated shared UX tests; manual visual/AT/task evidence remains separate, inspect exact final browser evidence |
| M5-12/13/14/15/16/17 | open (#195–200) | #493/#495 secure private intake/delivery; #496/#497/#498 generic synthetic references and layout. 25 generic assets and 67 frozen mappings are not clinical published coverage or signed rights evidence |

First engineering gap: exact hosted generic art verification is reproducible via `node scripts/qa/m5-hosted-shared-illustrations.mjs`. It checks all 25 manifest-bound URLs for status, type, length, immutable caching, nosniff, bounded body and exact SHA-256; two wrong/unknown routes must deny with an empty no-store 404. No credentials, redirects, patient media, private data, writes or approval inference. Receipt contains only fixed public reference IDs and bounded result codes. The source-contract tests use real committed derivative files and adversarial fixtures, not a live hosted receipt.

Live probe attempted in the current execution environment: DNS resolution failed before HTTP. Status **NOT RUN / unavailable from this runtime**, not a failed Render service and not a pass. Run the command from a network-enabled authorized operator environment after deployment. Separately verify actual 7-role × 5-width hosted DOM/screenshots, guardian record button geometry, image natural dimensions and private staff preview controls; obtain human visual/AT/usability evidence without fabricating it. Reconcile all remaining issue-specific acceptance evidence before closing any issues. Maintain all eight measured >=90% coverage floors, all mandatory CI gates and exact-head independent Codex review.

Scope freeze: no new roadmap requirement, real-patient processing, clinical gate changes, commercial clearance or production deployment. G2/G2b remains NO-GO. Existing synthetic-only design and permissions preserved.


## 2026-11-27 — M5 A actual seed and Chromium geometry (qualification pending)
Prior PR #499 HEAD 8b32b07 full CI 45977638576 PASS, including mandatory eight measured coverage floors, source-contract hosted-checker tests, demo-journey and Smart CI; exact-head Codex no findings. Added direct fresh CI PostgreSQL catalogue inventory reconciliation against locked 67 identities (fresh row count measured at runtime, not asserted equal to historical hosted count). Real guardian Chromium exercises five widths: date-left/record-right geometry and nonoverlap; family card exact source, decoded 400×300 WebP, alt, full width, aspect ratio and no figcaption. CI preview-only HTTP route must still deny; browser context fulfills only exact fixed local digest-verified derivatives. This is offline synthetic DOM evidence, not hosted HTTP or human visual acceptance. New exact-head CI and Codex pending; G2/G2b unchanged.


## Exact-head engineering qualification — 75befdc (2026-11-27)

[CI 45979276036](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/45979276036) completed successfully, tested synthetic merge checkout `6fc8cfe3d8f093c4ddfb233c0f608c1dd885ec5b` against base `f0ecbb30`. All full-mode jobs and Smart CI passed; targeted alternative correctly skipped. Exact-head [Codex review](https://github.com/NTinkicht/TheraBridge-Emergent/pull/499#issuecomment-7215518961) reported no findings. Actual disposable PostgreSQL seed log: **10/10 fresh rows** map to a reference; **67/67 frozen identities** checked separately. Do not report 67 actual hosted activities without a new authorized hosted inventory. Guardian five-width image decoding, width/ratio, action geometry and denial of direct CI preview-only image route passed in the real browser job using local verified fixtures. No external image receipt yet.

Measured full-scope coverage (lines / branches / functions / statements): API 95.10 / 90.34 / 93.98 / 93.64%; Web 96.25 / 90.28 / 91.41 / 94.36%; all eight pass. [Integrated receipt](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/45979276036/artifacts/15188836459). [Seven-role shell](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/45979276036/artifacts/15189425429), [role viewport](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/45979276036/artifacts/15188314185), [guardian technical](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/45979276036/artifacts/15188632594), [integrated technical](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/45979276036/artifacts/15188084490), [synthetic media inventory](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/45979276036/artifacts/15188059947) and [manual NOT_RUN matrix](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/45979276036/artifacts/15188264527) were uploaded by successful steps; their existence is not human sign-off or an independent inspection of ZIP contents.

### Original twelve open issues — engineering versus remaining qualification

| Issue | Evidence already delivered | Remaining / no waiver |
| --- | --- | --- |
| #187 M5-04 | #456 shared patterns, #494 shell isolation and focus, seven-role shell + role viewport artifacts | Reconcile token/pattern adoption on redesigned pages; human contrast, focus, RTL, visual review |
| #189 M5-06 | #466 therapist task workspace/history; #494 shared shell; real demo-journey | Verify specialty-specific remaining journeys and actual manual usability; do not assume every report/plan transition qualified |
| #190 M5-07 | #462 custom recurrence/contact/role UI, coordinator real browser flow and #494 | Verify exception/resource scope and operational tasks, actual manual acceptance; M7 features remain separate |
| #191 M5-08 | #456 queue stale guards; real browser child/specialty filters and read-only state; #494 | Source-bound review follow-up and denial evidence, human acceptance; no signing/release |
| #192 M5-09 | #494 family scope/modal, #497/#498 artwork, #499 five-width geometry, three-sibling CI browser | Hosted role/access observations and manual dark/light, screen reader and usability |
| #194 M5-11 | Technical browser artifacts and benchmark validator | Real paired task completion/time measurements and rollout/rollback approval; manual receipt is NOT_RUN |
| #195 M5-12 | #493/#495 private catalogue read path; #496–498 generic 25 thumbnails and frozen map; #499 offline fixture verification | Actual hosted delivery and approved published catalogue inventory; no conflation with generic images |
| #196 M5-13 | #486 reported therapist concept approval 25/25; locked m5-b-v1 style; #493 produced masters and derivatives | Independently signed style/rights evidence where required; do not re-request unchanged concept feedback |
| #197 M5-14 | #493 scanner container, #495 signed read and scoped R2 custody code; #497 bundled generic demo images | Actual private custody/import, operational retention/privacy/security and rights receipts |
| #198 M5-15 | #493 generated pack and private verification/selection; #495 approval checks | Genuine provider/rights and per-asset reviewer evidence, production qualification |
| #199 M5-16 | #495 signed step-specific staff/family code and #458 text steps | Actual authorized step-specific image evidence, clinical congruence, print/alt/AT; generic reference is not a step illustration |
| #200 M5-17 | #492 inventory and pilot readiness; #495 aggregate released plan coverage; #499 fresh DB and frozen identities | Formal pilot acceptance and actual approved published denominator; never substitute generic map coverage |

No issue closed by association. No new clinical features or approvals. The five already-closed issues are not reopened.

### Live evidence attempt

Current runtime DNS lookup still fails. To obtain independent real HTTP evidence without a new CI workflow, PR #499 temporarily adds an observation to the existing full source-contracts job, restricted to this PR in the same repository. Fixed public synthetic origin only, no credentials, redirects, private data, mutations or clinical operations. The bounded probe runs for at most 180 seconds and archives a distinct receipt; failures/timeouts stay explicitly non-PASS and do not make external Render uptime a required source CI dependency. Offline fixture tests remain mandatory. This observation is of the deployed #498 synthetic demo, not PR #499 deployed code. If incomplete, do not claim hosted delivery verified. It does not replace authorized hosted seven-role verification or human acceptance.
