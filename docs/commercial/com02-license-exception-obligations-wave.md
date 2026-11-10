# COM-02 — versioned publisher-license and redistribution evidence (next qualification)

Status: **IMPLEMENTED IN PR #350 / qualification pending — NOT legally approved**.

Predecessor: [PR #347](https://github.com/NTinkicht/TheraBridge-Emergent/pull/347) merged at `8c81651a1858359022b022e759299fd5abfe640f`.
Tracking: [issue #349](https://github.com/NTinkicht/TheraBridge-Emergent/issues/349), #346, COM-01 #312.

## Reproducible baseline from #347 CI

| Evidence class | Direct versions | Non-direct versions | Legal approval |
| --- | ---: | ---: | --- |
| Publisher tarball SRI and packaged-to-installed LICENSE/NOTICE hashes match | 36 | 574 | 0 |
| Tarball SRI verified; no recognized published package-root LICENSE/NOTICE | 6 | 46 | 0 |
| Unsupported PAX semantic override | 0 | 1 | 0 |
| Deferred/version sample limit | 0 | 0 | 0 |

Totals are **distinct package name/version rows** (42 direct + 621 non-direct), not physical installed copies or legal redistribution permissions. The remaining rights exception population is **52 no-root-license versions and one unresolved semantic-PAX archive**.

## Evidence record required per version

- Exact package name, version, pinned lockfile URI and SRI, published tarball SHA-256 (if verified), installed license file name/digest and every installed physical copy.
- Whether source is **publisher tarball / upstream verified exact-version source / installed-only / external third-party statement**. Never present those classes as interchangeable.
- SPDX/manifest claim as a *candidate only*; upstream published LICENSE/NOTICE URL, exact bytes digest, copyright and notice conditions with independent verification.
- Whether package is runtime-used, build-time, development-only, optional/platform, and whether it ships in the immutable enterprise image.
- Separate network/SaaS and customer-distributed enterprise obligations, source-offer/patent/trademark flags and required notices.
- Verifier/verification date/evidence link, rights-holder/counsel reviewer, decision owner, follow-up or replacement owner, and explicit state: `UNRESOLVED`, `EVIDENCE_VERIFIED_NOT_APPROVED`, `PERMISSION_REQUIRED`, or `REPLACE`. No automated commercial approval.

## Non-package coverage

Actual shipped OS layers, preview/release image digest SBOM, Redis/Postgres, IBM Plex/Plus Jakarta font files, icon assets, TheraBridge original/derived logo, illustrations, any model weights/providers and external datasets/services. Track copyright ownership, generated-media provider terms, authorized commercial use and customer redistribution.

**Governance:** This draft provides no commercial clearance, final THIRD_PARTY_NOTICES.md, customer contract, proprietary root LICENSE, real-patient processing, or clinical G2/G2b activation. Those remain separate written authorization gates.

## Automated technical evidence pipeline (PR #350)

`scripts/commercial/build-license-exception-register.mjs` generates a deterministic `therabridge-com02-exact-version-rights-queue-v1` from the direct/non-direct publisher audit results, frozen Yarn lock text, exact installed files and tracked assets. Its per-version exception records link the locked package source and integrity candidate, publisher tarball SHA if available, installed LICENSE evidence for every physical copy, and separately unresolved SaaS/network and enterprise-redistribution obligations. Installed LICENSE files never automatically become publisher-root-license proof. Runtime vs dev/optional classification remains `NOT_CLASSIFIED` until checked against real release artifacts; no inferred approval.

Exact-head CI tests approval forgery, duplicate package versions, missing source scope and contradictory matched-license claims. The generated JSON is archived with the installed license evidence on every full CI run, not committed as a stale snapshot. **Generated CI data cannot substitute for counsel review, actual production image digest, original branding assignments or commercial rights permissions.**

Technical outstanding queue must be computed from the latest CI artifact rather than assumed to remain at the #347 baseline. Reviewer evidence/authoritative upstream exact-version license text and copyright are still OPEN; final notices prohibited.
