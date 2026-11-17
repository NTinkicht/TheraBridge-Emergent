# WU-LIC-02 — exact-version source, asset rights and dual-edition release evidence

**Implementation branch: pending exact-head CI and independent Codex qualification. No legal, commercial, patient or clinical approval.**

## Purpose

This is the single-PR integration of COM-02 follow-ups [#356](https://github.com/NTinkicht/TheraBridge-Emergent/issues/356), [#360](https://github.com/NTinkicht/TheraBridge-Emergent/issues/360), and technical successors [#402](https://github.com/NTinkicht/TheraBridge-Emergent/issues/402) and [#405](https://github.com/NTinkicht/TheraBridge-Emergent/issues/405). It builds on merged WU-LIC-01 [#414](https://github.com/NTinkicht/TheraBridge-Emergent/pull/414).

All counts derive from the current **Node 24/NestJS 12/Jest 30** locked 44-version population, not stale 53-version historical issue titles: 21 DefinitelyTyped, 23 non-DT, 10 root source-manifest candidates. Historical comparative evidence gives eight same-run exact byte matches, one raw-byte tokenizer mismatch, and the tenth independent source-root match (9 matches / 1 raw mismatch). **There are still zero independently authenticated publisher-to-source build attestations.**

## Technical work

- `scripts/commercial/build-wu-lic-02-edition-rights-queue.mjs` regenerates WU-LIC-01 qualification from the exact same ledger, original locked npm/source receipt pair and comparison, and requires byte-identical WU-LIC-01 receipt. It refuses combined evidence from different runs, revisions or manifests.
- Strictly binds `docs/commercial/release-file-evidence.json` to the closure ledger's source digest. A missing actual release image stays **UNKNOWN**, never `NOT_SHIPPED`. A locally exported image's hash match remains `UNATTESTED`; it cannot authenticate production deployment, customer delivery, SBOM or legal redistribution.
- Generates **44 per-package decisions** (immutable original registry archive hash, candidate Git SHA, source-status class, separate SaaS vs Enterprise requirements); **91 per-asset decisions** (source SHA, category, per-edition candidate hash comparison and rights-holder/notice obligations); and **four supplemental domain queues** for OS/container, Postgres/Redis, models/datasets/services, and fonts/brands/media.
- Creates separate **SAAS** and **ENTERPRISE** release gates, preserving null release digests and negative approval states without independently signed publication and real-file evidence.
- Tests inventory drift, missing or duplicated assets, forged ownership, mixed-run evidence, release-manifest mismatch, candidate-scope mismatch and false clinical approval.
- Executes in the full CI test job and archives `therabridge-wu-lic-02-edition-rights-queue.json` in the same exact-head receipt bundle. Per-PR source SBOM refresh and the existing signed candidate capture/verification tooling are preserved.

## Externally missing evidence — no fabricated approval

| Evidence track | What authorized humans/operators must supply |
|---|---|
| 44 exact package versions | Original npm exact tarball SHA/SRI, authenticated publisher release statement/build provenance bound to immutable upstream source commit and build recipe, exact LICENSE/NOTICE copyright and counsel disposition **or authenticated nonshipment for the particular release edition** |
| 91 tracked assets | Rights-holder, license/permission, attribution and authorized SaaS-network or Enterprise-redistribution scope, linked to original source hash |
| Actual SaaS image | Independently verified registry signature and immutable OCI digest, complete image file hashes and genuine deployed/runtime SBOM, independent authenticated production deployment receipt |
| Actual Enterprise image | Independently verified customer-distributed OCI or installation-bundle digest, signed image and filesystem/SBOM evidence, independently authenticated actual customer-delivery receipt |
| OS/DB/AI and external services | Exact shipment versions, native library and image distribution requirements, vendor AI/model/data terms, security and residency obligations |
| Final human decisions | COM-01 IP chain of title, UAE-qualified counsel approvals, final notices, SaaS/Enterprise agreements and owner commercial release approvals |

A local DSSE-signature or matching `package.json` does **not** satisfy publisher identity, signed registry release or actual shipment. Neither positive nor negative commercial image distribution claims may be inferred from absent image artifacts. The repo remains public per owner policy. G2/G2b **NO-GO** and real patient/signing/consent release restrictions remain unchanged.

## Final qualification

Before merging: exact-head full required CI, commercial-inventory, SBOM, secret scan, Smart CI, independent Codex review, disposition of all actionable P0/P1/P2, clean conflicts. Keep #356/#360 and launch #371 OPEN while authentic external release and rights evidence is missing. No automatic commercial/clinical GO.
