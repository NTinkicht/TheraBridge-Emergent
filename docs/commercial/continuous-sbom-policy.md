# Continuous SBOM policy — TheraBridge

**State:** Implementation under review; first successful CI run is required before claiming active enforcement.

## Ownership decision
The GitHub source repository stays **PUBLIC**, to preserve existing CI/Actions operating capacity. SBOM artifacts contain package/component metadata and tracked asset filenames and checksums only; they are not a copyright license, a vulnerability verdict, or permission to commercialize.

## Mechanism

- **Every pull request commit:** the unconditional `sbom` job in `.github/workflows/ci.yml` scans the checked-out commit with Syft via Anchore's GitHub Action and exports a CycloneDX JSON SBOM.
- **Every push to main (including each merged PR):** the same `sbom` job generates a new artifact for that exact commit SHA. No manual regeneration or committed JSON diff is necessary.
- **Merge protection:** the `smart-ci-gate` requires `sbom: success` for all Smart CI modes, including docs and web-style. Changes to `yarn.lock`, dependencies and workflows still force full CI. Configure the repository's required status check **smart-ci-gate** in branch protection, and do not bypass it.
- **Artifact identification:** `therabridge-source-<sha>.cyclonedx.json` and `therabridge-assets-<sha>` are attached to the workflow run, retained for 30 days. Source scan covers the root workspace and its lockfile, including discoverable transitive npm dependencies.
- **Container evidence:** the full preview-container CI job scans the built `tb-synthetic-preview:ci` container and publishes `therabridge-preview-image-<sha>.cyclonedx.json`, capturing discoverable container/OS/runtime packages. The preview job remains a mandatory full-mode check.
- **Validity checks:** reject absent/unparsable/empty source SBOMs, missing npm components, and malformed/non-versioned metadata; a lightweight negative-path test suite verifies the validator. `scripts/commercial/asset-inventory.mjs` inventories tracked images, font binaries and Dockerfiles with SHA-256 hashes and explicitly **unverified** rights.

## Measured source-scanner limitations (CI run 42620571637)\n\nThe initial strict lockfile comparison counted 673 resolved Yarn name/version pairs and 666 scanner-discovered npm pairs. Seven exact omissions are documented and fail-closed if their versions drift: `fsevents@2.3.2`, `fsevents@2.3.3` (optional macOS package), `string-width-cjs@4.2.3`, `strip-ansi-cjs@6.0.1`, `wrap-ansi-cjs@7.0.0` (Yarn alias names), and `playwright@1.48.2`, `playwright-core@1.48.2` (root dev-tool scanner omissions). They are **not verified by Syft** and **not legally cleared**; open issue #313 remains responsible for rights review. Any other missing name/version fails CI. Coverage is not misrepresented as 100%.\n\n## Limits — no implied complete clearance

Syft detects packages and available license metadata; discovery depends on manifests and files present. It does not prove full legal license compliance. Image/illustration, brand, font licensing, model provider contracts, outsourced services, dataset rights, training data, cloud services, or unpublished dependencies require separate human review in #312/#313. Some root/source SBOM packages and image/OS packages overlap. An SBOM for a preview image does not replace an SBOM of each separate production image or deployment digest.

- The GitHub Actions artifact is **per-commit evidence with 30-day retention**, not a permanent, always-current tracked `SBOM.json` committed to Git.
- For a release or enterprise delivery, archive and attest SBOMs and match them to actual immutable image digests in your long-term release repository/registry. Set a permanent release-retention policy prior to commercial launch.
- The `sbom` gate is necessary but insufficient: vulnerability triage, policy review, third-party NOTICE texts, model and asset rights, and clinical authorizations remain separate gates.
- CLI inventory fields `licenseStatus: NOT_VERIFIED` must never be upgraded based on an SBOM scanner label alone.

## Verification acceptance

A PR is qualified only after an exact-head CI run confirms (1) `sbom` green, (2) valid download artifacts for source and assets, (3) required full suite and container SBOM green, (4) Smart CI gate green, and (5) independent review. A merge must create a separate successful `main` commit SBOM. Record corresponding run IDs and SHAs, do not infer them.
