# M5 WU2-D — Production illustration assets and asset-specific qualification

**Predecessor:** merged WU2-C PR #489, merge `0047280b4188a7b5530987545abf412a7f0dafde`.

**Milestone scope:** M5-13 (#196), M5-15 (#198), M5-17 (#200), supporting media model #197 and catalogue #195.

## Objective

Take the **25 immutable `m5-b-v1`** accepted-as-reported **320×240 concept previews** through an operator-only production master intake and QA process:

1. Regenerate or independently supply **original 1600×1200** fictional-people illustrations with locked style, exact enumerated specialty and scene, verified safe-square crop.
2. For each actual production asset record immutable provider/model/run, source concept digest, planned prompt digest, rights/license document digests, master digest, and a retention-safe operator reference; never include real child identifiers or clinical notes.
3. Verify complete, nonduplicated **5 scene × 5 family** production inventory; validate derivative dimensions and source digests, and attest three separate private ClamAV scans plus AES-256-GCM storage in the existing merged WU2-C host adapter.
4. Prepare asset-specific **design/clinical/legal/right** acceptance ledger. Each reviewer must independently sign their exact image and source digest, not the earlier preview or a simulated generated receipt.
5. Keep all media in **private quarantine**, with no browser URL, API release, guardian read or clinical G2/G2b activation until independent security/privacy, rights and clinical release gates approve a later work unit.

## Current limitation / exact truth

User-reported design, clinician concept screening and legal/IP choices are accepted as **owner report**. They are not independently verified signatures, rights contracts or new production-image acceptance. No real 1600×1200 image bytes or licensed provider credentials are present in the repository. **Do not invent image assets, generation events, provider prices or signatures.** A provider adapter or operator asset import must require separate authenticated terms and actual image bytes.

This PR initially contains the ordered WU2-D checkpoint. Subsequent commits will implement the portable production batch/receipt guard with adversarial offline synthetic tests. Real output assets and their human signoffs remain explicit external dependencies.

## Security and quality acceptance

Source and image-provider input are untrusted. Never use patient/family media. Reject wrong size, checksum mismatch, missing provider-rights evidence, stale/misassigned slot, reused provider run ID, duplicate/master collision, unsafe clinical/style flags, cross-version submission and tampered entry. No forged safety clearance. Keep existing full exact-HEAD CI, 8 × ≥90% API/Web coverage floors, six required jobs, independent Codex final-HEAD review and reviewer disposition policy. Update the four handover/QA evidence records with PASS/FAIL/NOT_RUN accurately.

### Exit inventory

| Gate | Current result |
|---|---|
| Immutable reference board / 25 concept checks | Existing owner-reported concept acceptance; no repetition |
| Actual 25 production master images | NOT PROVIDED |
| Approved commercial provider generation | NOT EXECUTED |
| Production media AV/encryption runtime | NOT INDEPENDENTLY QUALIFIED |
| Reviewer signoffs on actual masters | NOT PROVIDED |
| 100% real published-activity coverage | NOT VERIFIED |
| Guardian/public image release | DISABLED |
| Clinical G2/G2b | NO-GO |

## Implemented in this PR (source candidate — exact-head qualification pending)

- `scripts/qa/m5-wu2d-production-assets.mjs` derives the exact 25 canonical, source-hash-pinned `m5-b-v1` slots without inventing any production image bytes. Strict operator-reported source/model/run/terms/license and SHA-256 provenance is bound to the original 1600×1200 PNG structural preflight, with no child data, approval or publish flags.
- `admitProductionMasterOnHost` snapshots caller-controlled image/evidence before awaits, requires the pre-existing real private ClamAV + server-held-key operator adapter, and reports only private quarantine details. It does not accept browser-provided scanner verdicts or authorize image read.
- The existing WU2-C quarantine adapter now optionally embeds exact, validated provider run/model, prompt, source and master digests in its AES-GCM-custody HMAC manifest. Direct calls with swapped digests or accessor-backed metadata fail closed. Missing metadata for older WU2-C custody remains backward-compatible.
- `reconcileProductionAssets` detects duplicate slots, provider runs, master hashes and custody bundle IDs; its 25×5×5 ledger ALWAYS marks real image clinical/design/rights and independent media-security approvals as pending. 25 operator-reported private receipts are **never** interpreted as 100% approved or published coverage.
- Blocking synthetic/adversarial Node tests are wired to the existing full `demo-journey` CI stage. They cover source/crop provenance, immutable byte snapshots, API/guardian denial, duplicate and tampered metadata, and actual synthetic private encrypted custody HMAC linkage.
- No provider SDK, credentials, generation invocation, production original image bytes, clinician identity, public routes, final image approvals or clinical activation were added.

## Actual deliverable gap and next qualification

To finish all WU2-D acceptance, a commercially licensed model or authorized illustrator must **actually produce** each 1600×1200 master in the locked style using fictional subjects. An authorized operator must ingest each actual master on a correctly configured private host, collect the resulting encrypted HMAC manifest references, then obtain independently attributable **asset-specific** design, clinical/anatomy, legal/rights and accessibility signoffs, and independent operational media-security qualification. A genuine verified inventory must replace the empty/pending ledger. This PR implements intake and proof binding, **not** the unprovided image generation or signoffs. Guardian/public delivery and G2/G2b remain disabled.

**Quality:** Latest full CI and all eight ≥90% API/Web coverage floors: NOT YET VERIFIED. Codex latest-head review: NOT YET VERIFIED. Five-width real-image QA, human/AT acceptance, independent rights and privacy reviews: NOT RUN. Exact final-HEAD checks required before merge.