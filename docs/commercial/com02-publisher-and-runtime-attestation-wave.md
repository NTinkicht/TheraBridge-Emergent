# COM-02 — publisher attestation and real release capture

**Status: DRAFT OPENING CHECKPOINT — NOT IMPLEMENTED, QUALIFIED OR LEGALLY CLEARED.**

Predecessors: merged [PR #359](https://github.com/NTinkicht/TheraBridge-Emergent/pull/359) and [PR #361](https://github.com/NTinkicht/TheraBridge-Emergent/pull/361); parent [issue #360](https://github.com/NTinkicht/TheraBridge-Emergent/issues/360).

## One grouped substantive evidence wave

1. Consume exact-version npm tarball SHA-256 and registry claims, corroborate immutable source revision against independent signed publisher artifact provenance or approved reproducible build evidence, and preserve explicit **NOT_INDEPENDENTLY_ATTESTED** for any of the 53 package versions lacking independent linkage.
2. Resolve 26 DefinitelyTyped release history claims, 7 other unavailable GitHead cases, 3 Next.js monorepo subpackages, 2 legacy repository URL claims, and 15 pinned root-manifest candidates without guessing tags or source file locations.
3. Implement *actual runtime capture* for each built container edition, pin OCI digest and capture filesystem SHA-256 inventory tied to that image, with independent cryptographic attestation verification where available. Do not treat user-supplied JSON or an unsigned image file list as verified deployment.
4. Join all 91 source assets and OS/base-image/library SBOM components against actual release-image snapshots, preserving unknown rights and distinguishing source-only assets from observed shipped bytes. Keep immutable LICENSE/NOTICE text hashes separate from their legal application.
5. Produce counsel-oriented per-asset SaaS/network versus on-prem/enterprise redistribution review, zero inferred grants and never automatically issue commercial final notices. Preserve the semantic-PAX publisher exception and all G2/G2b clinical NO-GO safeguards.

## Review gates

All four Rule 7 documents; offline source-attestation, digest/path/conflict and forged signature negative tests; exact-head full CI (including sustained preview); independent Codex review; explicit findings disposition. This document is a draft technical brief, not approval to deploy or sell.

## Implemented in this PR — Docker-exported candidate release evidence (not independent attestation)

- `scripts/commercial/capture-docker-release.py` accepts only a named SaaS or Enterprise image referenced as `registry/path:tag@sha256:<64-hex>`. It checks the local Docker image's RepoDigests for the *exact supplied reference*, creates a disposable container, streams `docker export` through a bounded tar-file SHA-256 inventory, and removes that container. It does **not** download, sign, attest or deploy images.
- Usage on an appropriately provisioned, trusted build/release runner: `python3 scripts/commercial/capture-docker-release.py SAAS registry.example/project/app:version@sha256:<digest> /tmp/saas-candidate.json`. Run separately for Enterprise and have an authorized release operator reconcile the two JSON `images` arrays before calling `review-release-scope.mjs`. These are **candidate evidence only**.
- File content is hashed without extraction. Non-regular entries are counted as omissions; Docker volumes and runtime mounts are excluded; these limitations are recorded in the manifest. Exported filesystem cannot prove an image was pushed, signed, deployed or licensed. Zero images have been captured in this PR; checked-in release-file evidence intentionally remains empty.
- Offline `python3 -m unittest discover -s scripts/commercial -p test_capture_docker_release.py -v` checks real SHA-256 bytes, path traversal, duplicate file entries, invalid digest pins, mismatched Docker inspect metadata, and fail-closed approval markers. Added to required full CI. Exact-head CI, reviewer findings and hosted release evidence remain pending.
- Remaining work in **this same PR**: signed OCI manifest and image-digest evidence, independent verification of 53 npm publication lineages, source-vs-shipped comparison of 91 assets, base-image/native SBOM, and counsel-approved SaaS/enterprise rights. Until those prerequisites are obtained, package publication, artifact shipped scope, legal grant, notices and G2/G2b clinical release remain unapproved.

### Integration correction and adversarial validation

The release-scope comparer now accepts safely bounded tagged image names (including port-qualified registry references) produced by the Docker capture script; previously the candidate `imageRef` colon was incorrectly rejected. Added a candidate round-trip fixture and rejected forged `independentSignatureVerified`, `commercialApproval`, runtime-mount completeness and manipulated non-regular-entry counters. Legacy manually supplied candidate inventories remain explicitly untrusted, and no capture is promoted to signed evidence. Exact-head CI/review **PENDING** after this fix.

### Docker canonical RepoDigest enforcement
The local image lookup now normalizes an optional tag off the canonical `RepoDigests` comparison while preserving the exact repository name (including registry port) **and immutable sha256 digest**. This prevents false negatives on normal Docker inspect metadata without accepting a digest from another repository. Dedicated mocked Docker export tests cover this path; original image rights remain unapproved. Final-head CI and independent Codex review still PENDING.

### Dual-edition candidate manifest merger

New `scripts/commercial/merge-release-captures.mjs` consumes separately produced local `SAAS` and `ENTERPRISE` Docker export candidate JSON and writes a new combined manifest; example: `node scripts/commercial/merge-release-captures.mjs /tmp/saas.json /tmp/enterprise.json /tmp/com02-unattested-images.json`. It fails closed on wrong/duplicate editions, arbitrary injected fields, forged signed/legal approvals, malformed digest and asset file paths, duplicate file entries, and exceeded size limits. This output can be passed to `review-release-scope.mjs` with the existing bulk rights evidence. Both images retain `UNATTESTED_CANDIDATE`; summary counts `independentlyVerifiedReleaseImages: 0`, and no commercial rights are granted. A dedicated offline Node test suite is wired into full CI; no real edition images have been provided.

## Actions restart attempt — 2026-11-12

Previous exact-head GitHub Actions CI and commercial-inventory runs ended with `startup_failure` before any jobs executed. GitHub refused full-run retries. This documentation-only commit requests fresh PR/push workflow runs; it does not change source-code semantics, assert CI success, attest image contents, approve third-party rights, or change clinical G2/G2b gates. Review and exact-new-head CI must both be requalified before merging.
