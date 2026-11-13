# COM-02 — exact-version npm attestation availability from registry, not source authorization

## Purpose and scope

Following merged #362–#364, GitHub issue #356 is the active 53-exact-version publisher-to-source provenance queue; #360 tracks authentic SaaS/Enterprise release and 91 assets. Old overlapping #346, #349, #351, #354 were closed **as duplicate tracking**, not marked legally completed.

The existing CI step `collect-upstream-license-candidates.mjs` already reads **exact** npm registry version manifests and checks their `dist.integrity` against the frozen lockfile. This PR augments every version row with `candidateRegistryAttestationStatus` and `candidateRegistryAttestationUrl`, scoped to HTTPS `registry.npmjs.org/-/npm/v1/attestations/...`. An absent pointer is `NOT_ADVERTISED`; an unsafe/malformed pointer is `INVALID_REGISTRY_ATTESTATION_HINT`. A purported pointer is `UNVERIFIED_REGISTRY_ATTESTATION_POINTER` until independently cryptographically verified; none becomes VERIFIED automatically. Every record has `publisherProvenanceIndependentlyVerified:false`, and the counts report zero independent provenance proofs.

**A pointer does not prove attestation availability, validity or publication-to-source correspondence.** Do not fetch arbitrary URLs; only independently verified npm/Sigstore provenance evidence (including publisher identity, subject name/version and exact published tarball digest and signing certificate/source revision) may justify a future independently approved mapping entry. Repository `gitHead`, `repository.url`, root `package.json` matches and license text hashes remain candidate metadata, not publisher/build attestations.

Official guidance: [npm viewing package provenance](https://docs.npmjs.com/viewing-package-provenance/), [npm audit signatures](https://docs.npmjs.com/cli/audit/), and [npm provenance verification trust model](https://github.com/npm/provenance).

## Required independent evidence path

For exact-version packages advertising attestation pointers, validate using npm-supported signature verification and a trusted registry/Sigstore trust root. `npm audit signatures --json` audits installed-package registry signatures and supported provenance in a controlled environment, but **its JSON output must not be assumed to export verified attestation bundles** (CLI output varies by version). For independent provenance evidence, retrieve the exact package/version's attestation bundle through a supported registry interface, verify Sigstore trust chain and transparency evidence, then bind the authenticated publisher, signed subject and tarball digest to the claimed upstream source/revision. Without this separate proof, keep publication-to-source correspondence unresolved. For non-advertised versions and legacy, DefinitelyTyped and Next monorepo releases, obtain authoritative upstream release/build correspondence separately, or leave unresolved.

The collector's CI output is a **discovery inventory** and cannot substitute for signature verification; no signing key, real publisher artifact, release image, contract, or license approval has been supplied. Never report a pointer as an authoritative provenance certificate. Legal obligations and all clinical G2/G2b gates remain NO-GO.

## Qualification

The full CI performs a new offline adversarial test for URL/domain/protocol/credentials/path/query/path normalization, invalid metadata and forged positive approval; source row counts must remain stable. The already existing full-CI artifact `therabridge-installed-license-files-${github.sha}` includes the exact `/tmp/therabridge-com02-upstream-candidates.json`, preserving observed per-version states for rights review. All counted proofs stay zero until independent verification and authorized decisions.

## Actual CI evidence on initial PR #365 head

Downloaded and inspected the complete exact-run GitHub Actions artifact for run `43425805033`. It contains **53/53 exact-version npm registry metadata records**, of which **3 advertised a registry attestation URL**, **50 did not**, **0 had malformed pointers** and **0 were independently publisher-to-source verified**. The three *unverified* lead versions were:

- `@next/env@14.2.35` — registry advertises an attestation endpoint.
- `@next/swc-linux-x64-gnu@14.2.33` — registry advertises an attestation endpoint.
- `@next/swc-linux-x64-musl@14.2.33` — registry advertises an attestation endpoint.

The repo's provenance tool now also attempts a real `npm audit signatures --json` in an isolated temporary npm project with the **exact versions, no package lifecycle scripts and explicit npm registry**, retaining its raw JSON and deterministic receipt as separate files in the existing CI artifact. It requires exact npm-lock integrity correspondence and **does not auto-mark any of the three as having authoritative source provenance**: signed subject/version, source repository/commit, publisher authority and build transparency must still be checked separately. Registry/network/install failures produce explicit `NOT_ESTABLISHED` receipts, not invented signatures. Signed local Docker claims remain distinct from production release provenance.

This snapshot is evidence of registry **advertisement**, not yet cryptographic proof of an independently trustworthy upstream release or legal permission. Exact-head CI and Codex must be checked again after adding the npm CLI observation workflow.

### Codex P2 correction
Raw registry-advertised URL text is validated **before** URL normalization; nested raw or percent-encoded traversal is rejected and the URL's decoded attestation subject must match the exact npm name@version. npm CLI JSON is retained as an **audit observation only**; it does not guarantee access to a verified Sigstore bundle or authoritative source revision. Separate supported bundle retrieval and independent verification remain required.
