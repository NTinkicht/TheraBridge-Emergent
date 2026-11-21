# COM-02 — Installed package ⇄ Yarn lockfile provenance reconciliation

**Scope:** #313 / #327. **Status:** TECHNICAL LOCK METADATA ONLY; NOT PACKAGE-TARBALL, LICENSE-TEXT, REDISTRIBUTION OR LEGAL VERIFICATION.

The frozen Yarn 1 lockfile contains exact package version declarations, registry `resolved` sources and declared integrity checksums. The previous installed LICENSE/NOTICE queue records hashes of actual on-disk license-related files. This PR adds a deterministic join between both sets and publishes a third JSON file in the **existing** full-CI installed-license artifact.

## Execution after `yarn install --frozen-lockfile`

```sh
node --test scripts/commercial/reconcile-installed-lock.test.mjs
node scripts/commercial/reconcile-installed-lock.mjs \
  /tmp/therabridge-installed-license-review.json \
  yarn.lock \
  /tmp/therabridge-installed-lock-provenance.json
```

Each output includes exact installed name, version, installation path, inherited license triage, Yarn lock-status category, non-secret digest of the `resolved` source, lockfile-declared integrity, and explicit `tarballBytesVerified: false`, `authoritativeLicenseTextVerified: false` and `legalApproval: false`. It also includes SHA-256 of the lockfile and installed-review input for provenance.

## Review categories and safeguards

- `LOCK_METADATA_PRESENT_NOT_TARBALL_VERIFIED`: matching version, source and integrity declaration; **not** a verified npm package tarball.
- `INSTALLED_VERSION_NOT_IN_LOCK`: installed name/version is missing from selectors; inspect aliases, generated packages and workflow drift.
- `AMBIGUOUS_LOCK_SOURCES`: multiple different resolved sources or integrity strings for a matched package.
- `LOCK_INTEGRITY_UNAVAILABLE` or `LOCK_RESOLVED_SOURCE_UNAVAILABLE`: incomplete lock metadata; do not assume authenticated publishing.
- `OTHER_OR_MISSING_SOURCE`: source is outside recognized public npm registry host patterns; requires manual independent review.

Tests reject invented legal approvals, duplicate installed paths, unsupported lock headers and missing versions. A missing/ambiguous installed package mapping is **retained in the evidence**, not falsely reported as approved. Locked-but-not-installed packages, optional cross-platform binaries, OS packages, artwork, fonts, models and other ecosystems still require separate reconciliation.

**Next verification step:** retrieve the exact locked tarballs through a controlled and authenticated fetch pipeline, compare the downloaded bytes to declared integrity, extract genuine LICENSE/NOTICE texts and record cryptographic digests, copyright and attribution. Distinguish downloaded bytes, installed on-disk files and source SBOM. Legal obligations and whether SaaS versus on-premise enterprise distribution is permitted require rights-holder/qualified counsel review. The public GitHub repo, governance G2/G2b clinical NO-GO and absence of root proprietary LICENSE remain unchanged.
