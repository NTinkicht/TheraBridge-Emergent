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
