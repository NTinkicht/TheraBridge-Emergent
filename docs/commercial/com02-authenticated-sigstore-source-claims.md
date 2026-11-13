# COM-02 — cryptographically authenticated npm Sigstore source claims

Following merged PR #365, 53 exact npm versions are unresolved; registry manifests for three packages advertise provenance: `@next/env@14.2.35`, `@next/swc-linux-x64-gnu@14.2.33` and `@next/swc-linux-x64-musl@14.2.33`. **The other 50 remain in the independent lineage evidence queue.**

## Technical implementation

`scripts/commercial/verify-npm-sigstore-bundles.mjs` uses an isolated temporary npm project and a pinned `npm@11.19.1` CLI with no package lifecycle scripts. It generates and installs only the exactly advertised versions, then calls `npm audit signatures --json --include-attestations` (the newer CLI's verified attestation bundle JSON option). npm's Sigstore trust-root and transparency-verification implementation is responsible for cryptographic validation of the bundles; the local JS does **not** blindly accept unsigned bundles. Successful CLI exit, zero invalid/missing entries, exact npm package-lock version and registry integrity, and signed in-toto Statement v1 subject PURL + tarball SHA-512 correspondence are all required for `PINNED_NPM_SIGSTORE_BUNDLE_VERIFIED_SUBJECT_AND_DIGEST`.

The CI JSON receipt records the pinned npm verifier version, the SHA-256 of its full response, subject and bundle-match results, and any source-revision claims in SLSA v0.2/v1 payloads. It does **not** archive source code or overwrite any approved mapping. Even with authenticated Sigstore claims, the signed source commit must be checked against the exact upstream immutable repository revision and claimed build/publish context before the publication-to-source register is approved. Bundle presence, matched digest and cryptographic signature do not establish source reproducibility, copyright or license rights.

If npm lacks verified bundle export, the raw response is invalid, any package subject/digest differs, or the npm CLI cannot independently validate a signature, no new mapping is approved. The report always has `independentlyCorroboratedPublisherToSource:0`, `legallyApproved:0`, commercial approvals false and clinical G2/G2b false.

## Execution

```bash
node --test scripts/commercial/verify-npm-sigstore-bundles.test.mjs
node scripts/commercial/verify-npm-sigstore-bundles.mjs \
  /tmp/therabridge-com02-upstream-candidates.json \
  /tmp/therabridge-com02-verified-npm-bundle-candidates.json
```

The exact-head full CI archives the receipt in the already established commercial evidence artifact. A trust-root-verification issue, upstream provenance mismatch or external registry outage is not permission to make an exception. Separately, the actual customer-shipped SaaS and Enterprise production OCI digests, 91 source-asset rights and supplemental OS/infra/models/data distribution obligations remain tracked in #360. Legal contracts/notices remain NO-GO pending rights-holder and counsel decisions.
