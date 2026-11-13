# COM-02 — exact-version npm attestation availability from registry, not source authorization

## Purpose and scope

Following merged #362–#364, GitHub issue #356 is the active 53-exact-version publisher-to-source provenance queue; #360 tracks authentic SaaS/Enterprise release and 91 assets. Old overlapping #346, #349, #351, #354 were closed **as duplicate tracking**, not marked legally completed.

The existing CI step `collect-upstream-license-candidates.mjs` already reads **exact** npm registry version manifests and checks their `dist.integrity` against the frozen lockfile. This PR augments every version row with `candidateRegistryAttestationStatus` and `candidateRegistryAttestationUrl`, scoped to HTTPS `registry.npmjs.org/-/npm/v1/attestations/...`. An absent pointer is `NOT_ADVERTISED`; an unsafe/malformed pointer is `INVALID_REGISTRY_ATTESTATION_HINT`. A purported pointer is `UNVERIFIED_REGISTRY_ATTESTATION_POINTER` until independently cryptographically verified; none becomes VERIFIED automatically. Every record has `publisherProvenanceIndependentlyVerified:false`, and the counts report zero independent provenance proofs.

**A pointer does not prove attestation availability, validity or publication-to-source correspondence.** Do not fetch arbitrary URLs; only independently verified npm/Sigstore provenance evidence (including publisher identity, subject name/version and exact published tarball digest and signing certificate/source revision) may justify a future independently approved mapping entry. Repository `gitHead`, `repository.url`, root `package.json` matches and license text hashes remain candidate metadata, not publisher/build attestations.

Official guidance: [npm viewing package provenance](https://docs.npmjs.com/viewing-package-provenance/), [npm audit signatures](https://docs.npmjs.com/cli/audit/), and [npm provenance verification trust model](https://github.com/npm/provenance).

## Required independent evidence path

For exact-version packages advertising attestation pointers, validate using npm-supported signature verification and a trusted registry/Sigstore trust root. `npm audit signatures --json --include-attestations` exposes verified bundles **on a controlled environment with the exact dependency versions installed**. Require the verified attestation to bind the published package subject and tarball SRI to the claimed upstream source/revision before considering a provenance mapping. For non-advertised versions and legacy, DefinitelyTyped and Next monorepo releases, obtain authoritative upstream release/build correspondence separately, or leave unresolved.

The collector's CI output is a **discovery inventory** and cannot substitute for signature verification; no signing key, real publisher artifact, release image, contract, or license approval has been supplied. Never report a pointer as an authoritative provenance certificate. Legal obligations and all clinical G2/G2b gates remain NO-GO.

## Qualification

The full CI performs a new offline adversarial test for URL/domain/protocol/credentials/path/query/path normalization, invalid metadata and forged positive approval; source row counts must remain stable. The already existing full-CI artifact `therabridge-installed-license-files-${github.sha}` includes the exact `/tmp/therabridge-com02-upstream-candidates.json`, preserving observed per-version states for rights review. All counted proofs stay zero until independent verification and authorized decisions.
