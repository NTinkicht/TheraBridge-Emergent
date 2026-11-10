# COM-02 consolidated direct verification, transitive and asset obligations queue

**Not legal clearance.** This PR extends the earlier eight-sample publisher-tarball verifier to every installed direct-dependency name/version in the frozen evidence set, with at most six concurrent HTTPS downloads and a 12-second elapsed-time limit per request. Missing, ambiguous, unsafe, unavailable, oversized and unverifiable packages remain **UNRESOLVED**, not approved. Real integrity mismatches fail CI while the detailed evidence uploads even on failed checks.

After exact Yarn integrity verification and package-root license-file SHA-256 extraction, the verifier compares matching license filenames with the installed on-disk `node_modules` license-file SHA-256. Mismatched hashes produce `UNRESOLVED_INSTALLED_LICENSE_HASH_MISMATCH` and fail the CI check. No comparison is claimed where publisher or installed license files are absent, renamed or ambiguously mapped.

The second, consolidated evidence report collects:
- Each direct installed package's technical verification state, on-disk comparison and unresolved SaaS/on-premises rights review.
- All installed packages not named as direct dependencies, including transitive/optional packages, with installed license-file presence and explicit unresolved publisher verification and redistribution obligations.
- Tracked image/font/icon and Dockerfile assets with source SHA-256, bytes, unresolved ownership and distribution rights.
- A cross-ecosystem legal-review checklist. All approval flags remain false.

The files `therabridge-publisher-tarball-evidence.json` and `therabridge-com02-obligations-queue.json` are attached to the existing per-commit installed-license artifact on full CI alongside previous reports and SBOM. They contain hashes and status metadata, not binary tarballs or packaged license text. The audit does not download transitive tarballs, validate image layers/OS packages, inspect untracked or network-fetched assets, or review legal license texts.

## Remaining acceptance gates

Independent counsel/rightsholder must evaluate package-specific LICENSE/NOTICE and copyright, SaaS network terms, enterprise/on-prem redistribution and attributions; also audit OS/container images, runtimes, databases, Redis, font licenses, brand logos, illustrations, models, datasets, and deployment artifacts. Ownership/IP chain and customer contracts remain unsigned. No proprietary root LICENSE, no clinical G2/G2b activation and no automatic commercial approvals.

All source inputs are committed or produced by full CI; the new queue is regenerated on each full CI run. Smart-targeted jobs may legitimately skip it when the full test job is not scheduled; do not claim an artifact exists for skipped runs.
