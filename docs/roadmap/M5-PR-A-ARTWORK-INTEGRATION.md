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

## 2026-11-24 — PR #493 current-version artwork mapping (qualification pending)

Added staff-manager-only current-version persisted mapping endpoint and opt-in UI snapshot for whole activity and numbered steps. Counts distinguish non-rejected proposals and proposals with an unrevoked scanned candidate; no image bytes, approval, release, or guardian access. Uses existing tenant/role/ownership checks and a repeatable-read transaction; tests added for query scope, denial, version and permission changes, stale/failure states. Full exact-head CI, eight coverage floors and independent review NOT RUN on this change. Host custody, asset-specific signed rights/clinical evidence, actual approved media delivery and M5 closure remain pending; G2/G2b remains NO-GO.


## 2026-11-24 — PR #493 exact artwork review-to-custody integration (qualification pending)

The preceding `8bf14bb` passed all six required full CI jobs, Smart CI and focused web coverage (runs 45408825043/45408826252). Saved locked-reference proposals now open an exact-reference local verification and explicit staging flow, show the intended authored step, reuse the verified PNG bytes for the existing encrypted/scanned candidate endpoint, and clear local preview/bytes after staging. Wrong scope/hash is denied before submission; ambiguous staging results require inspecting candidate history rather than blind retry. Generic private candidates retain their existing picker. Mounted regression tests added; new exact-head CI/review NOT RUN. No hosted transfer of the 25-source archive, provider/rights or clinical signature, approved-media rendering, public asset delivery or G2/G2b GO claimed. Previously confirmed Render workspace inspected read-only; archive not available in this runtime, no hosted shell/transfer executed.


## 2026-11-24 — PR #493 actual pack recovery and host custody reconciliation (qualification pending)

Exact source archive recovered from the owner's private Library; 72,825,383 bytes, SHA-256 `8a569794ad95a9cac7f905fd2d8140956489bf62b37875bdf94d85cd410f078b`, manifest `b573eb4f5bb578ed14c5a33688045a24950fa383afc14ed32dec11527502b2c3`. Independent local ZIP CRC, all 25 unique references/100 file hashes/dimensions/full Pillow decode PASS. Prior `a6ca903` full CI 45412387373 and focused web coverage 45412387467 PASS. Added operator-only `verify-staged` command checking complete journal, authenticated custody audit and manifests, exact source master digest, AES-GCM authenticated bytes and dimensions for all 75 encrypted custody files; no decrypted output or publication. New CI/review pending. Actual host execution NOT RUN: preview image has no ClamAV or QA scripts; private durable custody host and factual provider/rights evidence required. No public bytes, signed rights, clinical review or G2/G2b activation claimed.

After a successful stage, verify from the same private host with the same server-held key:
```sh
node scripts/qa/m5-pr-a-artwork-pack.mjs verify-staged /private/illustrations /private/custody /private/m5-artwork-intake.jsonl
```
A complete run must report 25 references and 75 authenticated encrypted files. This is storage integrity, not an independent scanner/rights/clinical approval. Do not run on an active staging/purge host; reconcile in an exclusive operator maintenance window.

## 2026-11-24 — PR #493 isolated actual-custody runtime (qualification pending)

Previous `eea68c1` exact-head six mandatory CI, Smart CI and focused coverage all PASS (45417719257/45417718401). Fresh local recovery verification of the original archive: pinned archive/manifest SHA, ZIP CRC, 25 references/100 exact file digests and Pillow decode PASS. Added separate non-web `Dockerfile.artwork-custody` and explicit `compose.artwork-custody.yaml`: non-root UID 1000, no network, no published ports, read-only root/input/evidence/signature mounts, durable 0700 custody state, real local ClamAV UNIX socket, mandatory signature age preflight and same-host verify-staged; separate from the constrained 512 MiB application preview. Shell syntax/negative command/source contracts added to existing required source tests. No paid Render service or real deployment created. New CI/review, actual container build, trusted updated signature database, signed/factual provider evidence, private host custody execution and approved rendering NOT RUN/NOT OBTAINED; G2/G2b NO-GO. This is a deployable operator recipe, not a live deployment or independent qualification.

### Isolated operator runtime (not the application image)

On an authorized Linux Docker host with at least 3 GiB reserved for the one-shot custody process, prepare four separate directories outside the source repository. The state directory must be owned by UID 1000 and mode 0700 on durable encrypted storage, with private backup/retention controls. Extract the pinned archive into the input directory. Supply actual rights/provider evidence in provider-evidence.json, and a trusted host-maintained ClamAV signature directory updated before use (main, daily and bytecode databases). The scanner does not fetch updates during the run; independently verify official signature provenance and freshness. Supply TB_PRIVATE_DATA_KEY_B64 and TB_ARTWORK_OPERATOR_ID from the authorized secret store/interactive private shell, never Git or command arguments. Set TB_ARTWORK_PACK_DIR, TB_ARTWORK_EVIDENCE_DIR, TB_ARTWORK_SIGNATURE_DIR, TB_ARTWORK_STATE_DIR to the actual absolute host paths. All inputs must be readable by UID 1000. Do not use the public demo host's ephemeral filesystem. Build only this separate operator image; review its upstream package provenance, SBOM and licensing before distributing or deploying it. The existing public preview and release images are untouched.

```sh
docker compose -f compose.artwork-custody.yaml build
docker compose -f compose.artwork-custody.yaml run --rm artwork-custody verify
docker compose -f compose.artwork-custody.yaml run --rm artwork-custody stage
docker compose -f compose.artwork-custody.yaml run --rm artwork-custody verify-staged
```

Run in an exclusive maintenance window. A failed or partial run requires reconciliation; do not delete the journal or blindly rerun. No approval is implied by a successful custody receipt.
