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
