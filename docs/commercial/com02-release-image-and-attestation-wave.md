# COM-02 — independently attested release-image and publication lineage

**Status: release-scope inventory comparison implemented; full CI and independent review pending.**

Tracks #360, #356, #354 and #349. Follows merged mega PR #359 (`16316d3f41c1f1c1b9f20b8ea5ce00961dc6dd4e`).

## One cohesive follow-up

- Reconcile **actual pinned SaaS and enterprise release-image file inventories** against 91 tracked source assets and installed SBOM packages. A source path category, container Dockerfile, or development screenshot is not proof that its bytes ship to a customer. No image digest/inventory means distribution status UNKNOWN.
- Independently attest the **53 exact npm package versions** to immutable upstream release artifacts. Keep root-package matches, DefinitelyTyped history, Next.js monorepo subpackages and rejected repository URL classes distinct; no unverified branch/tag inference.
- Join pinned authoritative license/notice text bytes and actual shipped scope into a human/counsel-reviewed SaaS-network and enterprise redistributable obligations matrix. Third-party copyright, rights-holder and distribution terms remain unapproved until verified.
- Preserve semantic-PAX exception, OS/base-image/Redis/Postgres/font/media/brand/AI/data supplier checks and no auto-issued notices.
- Require adversarial offline tests, all four Rule 7 files, full exact-head CI including ten-minute preview, Codex review and normal merge controls.

No license grant, clinical G2/G2b approval or production commercial release is implied by this draft.

## Executable release-inventory evidence added

`scripts/commercial/review-release-scope.mjs` consumes the complete previously generated 53-exception and 91-source-asset COM-02 rights report with a separate release-file evidence manifest. It rejects duplicate package or asset rows, missing version counts, invalid asset paths and SHA-256 hashes, non-pinned OCI digest declarations, duplicate release editions, counterfeit attestation claims and any premature legal approval. It emits per-asset hash comparisons against each edition's candidate release-file listing, **never independently attested release presence or commercial rights**. Even a matching SHA-256 is merely a match to untrusted provided file-list data, not proof the image was actually published or signed.

The checked-in `docs/commercial/release-file-evidence.json` intentionally provides **zero release images** because neither actual customer edition has supplied an independently captured/signed image filesystem inventory. All release presence and source publication attestations remain unresolved. SaaS-network and enterprise-redistribution rights are still pending counsel. No inferred third-party notices, proprietary grants, or G2/G2b clinical authorization.

Dedicated adversarial tests are included in CI and the report is uploaded with the existing exact-run licensing evidence. Actual exact-head CI status: **PENDING**.
