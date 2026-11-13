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

### Live evidence reconciliation checkpoint
First full CI run on PR #366 executed npm 11.19.1's verified-bundle export successfully. Its summary reported 3 verified CLI attestation entries but **zero signed subject matches in the second-stage parser** because the real statements failed the script's stricter Statement-v1 shape check. Those packages must remain unresolved, not counted as authenticated source versions. The updated workflow now retains the **original npm 11.19.1 verified-bundle JSON** alongside its SHA-256-linked summary for manual review and corrective parser qualification. This raw signed material may contain public certificate and transparency-log evidence; do not treat the attached registry material as licensing consent. The first CI was also blocked by a historical synthetic M4 test literal, scoped narrowly in .gitleaks.toml without disabling secret scanning.

### Authenticated statement formats observed in the raw npm 11.19.1 artifact

The live CI artifact provides two Sigstore-verified bundle entries per Next.js package, matching the actual pinned CLI schema: one **in-toto Statement v0.1 npm publish attestation** (`https://github.com/npm/attestation/tree/main/specs/publish/v0.1`) and one **in-toto Statement v1 SLSA provenance** (`https://slsa.dev/provenance/v1`). Each uses a scoped PURL (`pkg:npm/%40next/...`) and the exact locked SHA-512. The verifier now requires both, rejects duplicate/absent types or mismatching subjects and records source revision claims from the SLSA build definition. A valid source revision **claim** is not proof that published bytes are reproducible from the repository or an intellectual-property license.

From the authenticated SLSA payloads:
- `@next/env@14.2.35`: repository `https://github.com/vercel/next.js`, workflow branch `refs/heads/14-2-1`, source commit `7b940d9ce96faddb9f92ff40f5e35c34ace04eb2`. The immutable commit was independently confirmed to exist via GitHub's repository commits API.
- `@next/swc-linux-x64-gnu@14.2.33` and `@next/swc-linux-x64-musl@14.2.33`: same repository/workflow branch, source commit `5a97b408c2d8668bed1642d382fc1d78ed3731cc`, independently confirmed to exist via GitHub's commits API.

The first script version rejected the genuine paired statement schema and recorded 0/3 second-stage matches. This correction and the Codex finding on false-positive receipt status are now implemented, but **latest-head CI and Codex qualification are required before claiming the updated verifier's 3/3 output**. The independent repository-check evidence above establishes commit existence, not reproducibility, source-tree copyright clearance, or permission to redistribute.

### Source-workflow consistency gate (Codex P1)
A valid pair of npm-verified publish/SLSA attestation statements now also requires at least one SLSA `resolvedDependencies` GitHub repository source URI containing an immutable 40-character Git commit that matches the signed `externalParameters.workflow.repository`. Missing or contradictory signed source metadata produces `MISSING_CONSISTENT_SIGNED_SOURCE_REVISION`, not an empty yet 'verified' provenance record. A separate negative regression for an inconsistent workflow repository remains mandatory. The top-level receipt status is derived from actual verified package subject counts, not a static success string.
