# COM-02 — Installed license-file review queue (engineering wave 2)

**Status: TECHNICAL TRIAGE, NOT LEGAL CLEARANCE.** Tracks #313 and #327. The public GitHub repository, synthetic demonstration, approved SBOM generation and clinical NO-GO are unchanged.

## Provenance and execution
The full-CI `test` job first performs a frozen Yarn installation, then runs `collect-installed-licenses.mjs` against root and physical workspace-local `node_modules`. Its existing immutable artifact contains package name, installed version and path, manifest-declared license candidate, LICENSE/COPYING/NOTICE/COPYRIGHT filenames, byte lengths and SHA-256 digests. The new `build-installed-license-review.mjs` consumes **that actual installed inventory**, rejects inconsistent counts, missing digests, duplicate paths or fabricated approval claims, and emits a deterministic version-specific review queue.

Command after a frozen install:

```sh
node --test scripts/commercial/build-installed-license-review.test.mjs
node scripts/commercial/collect-installed-licenses.mjs . /tmp/therabridge-installed-licenses.json
node scripts/commercial/build-installed-license-review.mjs /tmp/therabridge-installed-licenses.json /tmp/therabridge-installed-license-review.json
```

The new report is included in the **existing** `therabridge-installed-license-files-<SHA>` full-CI artifact. Do not count source SBOM components and installed Linux package entries as identical populations. CI retention is limited; archive approved release evidence separately.

## Categories
- `NO_LICENSE_FILE`: installed package has no matching top-level file; retrieve authoritative published files/text.
- `MISSING_MANIFEST_LICENSE`: a file exists but the installed manifest has no license declaration.
- `RESTRICTIVE_LICENSE_CANDIDATE`: candidate string contains potentially restrictive indicators requiring qualified human review; this is not a legal determination.
- `COMPOUND_OR_EXCEPTION_CANDIDATE`: expression includes OR/AND/WITH; counsel must interpret the options and obligations.
- `FILE_PRESENT_UNREVIEWED`: file hashes exist, but authenticity, text, copyright and redistribution obligations are still unverified.

Every row is `UNRESOLVED`, with `legalApproval=false`, `publishedPackageTextVerified=false`, `actualLicenseTextReviewed=false`, `saasObligationsReviewed=false` and `enterpriseRedistributionReviewed=false`. These fields must **not** be flipped automatically from a scanner label or on-disk file hash.

## Remaining for COM-02 closure
1. Reconcile exact published package tarball/version/integrity and publisher URL against the lockfile, on-disk hashes and source SBOM, distinguishing aliases/platform-optional/dev-only installs.
2. Obtain authentic LICENSE and NOTICE texts with cryptographic digests, copyright holders, SPDX and source URLs; create a legally reviewed obligations matrix for SaaS hosting versus enterprise distribution.
3. Review Debian/Node/Redis/PostgreSQL/container binaries, fonts and icons, logos, catalogue illustrations, AI models/providers, datasets and the GitHub-public-history security assessment.
4. Document named verification owners and legal decisions in controlled storage; issue final customer-facing third-party notices only after qualified counsel/rightsholder approval.
5. Do not close #312, #313, #314 or #327 on this automated pipeline alone. No proprietary root LICENSE, clinical activation, real patient data, commercial invoices or billing changes.

The report is a reproducible prioritization aid; no compliance certification is claimed.
