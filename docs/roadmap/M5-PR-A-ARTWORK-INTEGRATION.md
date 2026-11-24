# M5 PR A — generated artwork intake and integration

Predecessor: #492, main `4633940f6cf36272ae3bcd7b2693f0190127de7c`. Traces #195–199.

## Actual artwork inventory
The owner directed creation of the 25 fictional images in the accepted Direction B style and authorized this integration. The 25 selected 1448×1086 sources were normalized to 1600×1200 RGB PNGs; these are resized derivatives, not native 1600×1200 provider originals. The selected 25-source pack excludes later style-drift variants. Local processing produced 25 masters, 25 400×300 RGB review PNGs (under the existing 512 KiB API limit), 25 400×300 WebP cards and 25 400×400 center-square WebPs. All 100 image files passed local checks of SHA-256, dimensions, decode, PNG chunk CRC/structure, and archive integrity. This is not a ClamAV receipt or independent artwork clinical review.

Private transfer package: `TheraBridge-M5-Illustration-Intake.zip`, 72,825,383 bytes; SHA-256 `8a569794ad95a9cac7f905fd2d8140956489bf62b37875bdf94d85cd410f078b`. Exact manifest SHA-256 `b573eb4f5bb578ed14c5a33688045a24950fa383afc14ed32dec11527502b2c3`. The archive bytes remain outside public Git.

## Implemented
- Canonical 25-reference registry pins real review PNG hashes, lengths, scene, specialty, alt descriptions and style, with no approval claims. Source contract checks frontend/backend equality.
- Existing authorized center activity manager proposal panel now offers specialty-filtered actual artwork selection, exact byte verification, temporary local reference preview and metadata prefill. Rights/provider terms remain explicit inputs. No raw file, object URL, child data or artwork bytes are transmitted to the metadata API; local object URLs are revoked when selection or scope changes.
- Existing whole-activity or numbered-step draft workflow persists the selected version and source reference. Server checks canonical scene/family and generated source type, exact SHA/length/dimensions before scanning, then rechecks the draft source and activity version in the existing scoped transactions. The established encrypted private candidate endpoint, size cap, ClamAV, revocation, audit, and guardian/public denial remain intact.
- `scripts/qa/m5-pr-a-artwork-pack.mjs` verifies the exact 25/100-file package and provides an operator-only path to the existing WU2-C encrypted master/derivative custody. It requires real host scanner and key plus provider and rights evidence; never invents provider run metadata or claims an accepted review. An exclusive private JSONL journal prevents a blind retry after partial staging. Use an operator-controlled private journal path. Do not commit the pack, journal, or evidence secrets into the public repository.
- Tests: canonical registry/hash mismatch and role boundary source contract; API unit cases; mounted local preview/cancellation/cleanup interactions. Fast source-contract CI test runs before browser work. Existing six exact-head checks and eight coverage floors remain unchanged.

## Operator execution
Extract the private ZIP outside the repository. Run:
```
node scripts/qa/m5-pr-a-artwork-pack.mjs verify /private/illustrations
node scripts/qa/m5-pr-a-artwork-pack.mjs stage /private/illustrations /private/custody /private/provider-evidence.json authorized-operator /private/m5-artwork-intake.jsonl
```
The latter requires a host with working ClamAV UNIX socket, encryption key and actual evidence file with providerId/providerTermsSha256/commercialLicenseSha256. It creates quarantined custody bundles, not released catalogue art. Before resuming an interrupted batch, reconcile the journal and custody audit; do not delete a journal or blindly replay. To register a review copy in the staff application, choose the exact reference in the existing private proposal panel, select its named review PNG, use metadata, supply factual provider/rights evidence, save draft and attach the same review PNG through the existing private upload. A proposal can be tied to a real existing numbered source step; scene/family matching is not proof of step congruence.

## Remaining delivery
Pack generated and locally verified. App private-reference intake implemented. Actual host ClamAV/KMS custody execution, signed asset-specific rights/clinical review, persistent approved-media read model, activity-version mappings to released images/steps, translated alt, catalogue/family rendering and full M5 qualification remain NOT VERIFIED / NOT IMPLEMENTED as applicable. Do not claim all 25 are in the deployed app or 100% released coverage. G2/G2b remains NO-GO. This PR is not yet fully qualified; final exact-head CI, review and human acceptance must be observed. No release permission is changed.
