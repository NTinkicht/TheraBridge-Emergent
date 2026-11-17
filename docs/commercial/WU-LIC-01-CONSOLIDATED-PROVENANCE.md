# WU-LIC-01 — Exact-version provenance triage consolidation

Status: **IMPLEMENTED ON BRANCH; EXACT-HEAD CI/INDEPENDENT REVIEW PENDING.** This is an evidence-workflow milestone, **not** a completed publisher-to-source attestation or commercial authorization.

## Population and already-established technical evidence
- Node 24/NestJS 12/Jest 30 lock: **44 exact unresolved npm versions** = **21 DefinitelyTyped** and **23 other packages**, grouped as 21 historical DT, 10 immutable source-root candidates, 7 missing revisions, 3 monorepo/subpath packages, 3 untrusted legacy origins.
- The ten source-root candidates have **nine original npm/source raw package.json matches**, plus a byte mismatch for `@tokenizer/token@0.3.0`. The tenth root `unicode-emoji-modifier-base@1.0.0` was independently checked in #408.
- The tokenizer raw SHA mismatch is investigated against original locked npm bytes and immutable source objects in #411 and the additional strict validator carried forward from #412.
- **91 nonpackage assets** remain tracked, without proved legal rights or authentic commercial release distribution.
- Original inventory epic #313 was closed; substantive exception rights remain in #356 and release delivery in #360.

## This PR
1. Carries #412 immutable npm/source tokenizer difference explanation, offline adversarial tests and bounded network verifier onto the latest merged M5 main. It does not overwrite M5 documentation, workflow or UI changes.
2. Adds a same-run **fail-closed WU-LIC-01 reconciliation** of the 44-package/91-asset closure ledger, the independent tenth-source root receipt (#405), and the tokenizer receipt (#402). Exact names, versions, original archive digests, schemas, group sizes and denial states are checked. Duplicate/missing versions/assets, false approval flags and mismatched records fail the CI job.
3. Archives a JSON qualification receipt with input hashes, exact population counts, and explicit unverified publication and rights states. No third-party license text or secrets are included.
4. Adds CI regression tests and updates Rule 7 handovers; requires all exact-head jobs and independent Codex review before merge.

## Must NOT be considered completed by this PR
- Independently authenticated **npm publisher-to-exact-Git-source/build** correspondence for any of the 44 versions; matching package.json is only candidate evidence. No invented upstream tags or automatic promotion.
- Authoritative exact-license text/copyright obligations and counsel decisions; 91 asset permissions; actual signed production SaaS or customer-distributed Enterprise OCI images, files, and BOM join.
- COM-01 ownership, COM-03 final LICENSE/notices, COM-04 SaaS/Enterprise contracts, COM-LAUNCH #371 human authorization.
- Real-patient operation or clinical G2/G2b approval. All approval flags remain **false**.

## Independent decisions required to close historical exceptions
For every unresolved exact version obtain publisher-signed immutable release/build lineage and version-specific source/license evidence, **or** prove nonshipment for the exact signed commercial image, **or** obtain documented legal disposition/remediation. Unverifiable evidence must remain **UNRESOLVED** and fail commercial release approval. No percentage of technical manifest matches substitutes for this decision.

## Merge gates
Exact-head six CI jobs, SBOM and Smart CI, security/secret scanning, fresh independent Codex review, no unresolved P0/P1/P2, clean mergeability. Until then the PR is not qualified. Keep source repo public and all synthetic-only clinical controls fail-closed.
