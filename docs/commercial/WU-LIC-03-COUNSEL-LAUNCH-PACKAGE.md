# TheraBridge WU-LIC-03 — Counsel-ready commercial authorization package

> **DRAFT — NOT EXECUTED — NOT A LICENSE, SALE AUTHORIZATION, REGULATORY CLEARANCE OR CLINICAL APPROVAL.** Prepared for review by the verified rights-holder, commercial contracting entity and appropriately qualified UAE counsel. No names, signatures, effective dates, ownership assertions, redistributable grants or patient-processing permissions are assumed.

**Intended delivery:** one consolidated WU-LIC-03 PR, building on #414 (WU-LIC-01), #416 (WU-LIC-02), [COM-LAUNCH #371](https://github.com/NTinkicht/TheraBridge-Emergent/issues/371). Existing COM-01 #312, COM-02 #356/#360, COM-03 #314, COM-04 #315, COM-05 #316 and COM-06 #317 remain the authoritative workstreams; this document indexes their decisions instead of duplicating or closing them.

## A. Non-negotiable use and repository rules

1. **Public GitHub is not an open-source grant.** Visibility, forks or cloning enabled by GitHub do not prove a right to use, deploy, copy, modify, redistribute, sublicense, commercialize, or access customer source. Do not publish a definitive copyright-owner LICENSE or promise rights before COM-01 ownership and all obligations are verified.
2. Two distinct editions require separate grants: **owner-hosted SaaS**, including applicable network-use/vendor obligations, versus **customer-distributed Enterprise/on-prem**, including binary/container redistribution and full notices/source-offer obligations. Neither may inherit the other's authority.
3. The exact source SBOM and source file inventory are **not the shipped OCI image SBOM**. Candidate local Docker exports, source manifest byte equality, pinned Git commits, unverified signers and static registry metadata are NOT authenticated publisher/build lineage, production deployment, customer delivery or nonshipment proof.
4. Current exact dependency inventory: **44** outstanding package versions (21 DefinitelyTyped, 23 other), **91** tracked assets (73 image/icon, 15 brand, 3 container), four supplemental obligations (OS/base/native; Postgres/Redis; AI/models/data/services; fonts/brand/media). These figures must be revalidated against the exact lock and each release candidate. Issue titles mentioning 53 are historic snapshots, not the current lock.
5. Clinical G2/G2b **NO-GO**, no real-patient processing, therapist clinical signing, consent, approved report release, or production patient deployment based on this package. Commercial legal approval does not override any clinical safety or privacy gate.

## B. IP chain of title — COM-01 required signed matrix

For **every original code and design contribution**, restricted materials, course or student/employee work, third-party content and institutional/partner deliverable, create an **external controlled rights register** with: unique contribution/file digest, original contributor, contribution date, project/institution context, employer/student/contractor/partner agreement ID and effective dates, authorized rights-owner legal name, assignment or explicit license scope, ownership restrictions, duration, jurisdictions, right to sublicense, evidence location/access classification, legal reviewer and signed disposition. Include HCT/student employment or sponsorship restrictions and partner-owned logos/content; do not speculate. Keep personal agreements OUT of this public repository; publish only verified SHA-256 receipt IDs and status.

**Gate:** no operative proprietary copyright grant, license owner designation, customer contract signature or sublicensing until all material contribution rights and authority are formally established. Unresolved entries = **BLOCK**.

## C. Existing commercial contract deliverables — COM-04, NOT execution

See [counsel contract and notice schedule](WU-LIC-03-CONTRACT-REVIEW-SCHEDULE.md). It gives separate draft checklists and proposed negotiation clauses for SaaS and Enterprise, with explicit placeholders rather than presumed governing law, liability caps, service levels, pricing, health regulation or copyright authority. Reuse already-prepared COM-04 source contracts as primary drafts where available; cross-check clauses to that schedule and record exact reviewer-approved revisions before any use.

SaaS: MSA/terms; subscription and order form; services, availability and support/SLA; acceptable-use; privacy notice and DPA; processor roles, lawful purpose/authority, data residency/transfers, subprocessor list, deletion and export, breach response, audit, access restrictions, confidentiality, IP, limitations, termination, regulatory accountability.

Enterprise: EULA/order form with site/center/seat/environment grants, permitted maintenance/backup, disallowed redistribution/sublicensing unless separately licensed, updates/security, install and customer-controller responsibilities, third-party notices and source/offer requirements, support/SLA, escrow *if agreed*, termination/deletion and permitted exit.

## D. Third-party exact-version and asset counsel queue

CI builds `therabridge-wu-lic-03-counsel-launch-readiness.json` from the **same-run** WU-LIC-02 rights queue and the tracked non-authorizing launch decision register. Output includes original exact npm archive hashes; pinned immutable source candidates when available; 44 package decisions × SaaS/Enterprise; 91 source asset SHA-256 records × SaaS/Enterprise; OS/DB/AI/font distribution obligations; and 9 (SaaS) / 9 (Enterprise) mandatory human release signoffs.

Before counsel accepts an obligation row, independently verify: the publisher's original archive and signed provenance/build recipe, exact relevant immutable LICENSE/NOTICE texts and copyright owners, runtime/build/dev/optional scope from a **signed actual edition image**, network use vs binaries redistribution, SPDX conditions/notice/source-offer and contractual supplier rights. An independently authenticated per-edition **not shipped** result may close a specific release obligation only for that exact immutable release, never globally.

**No final THIRD_PARTY_NOTICES or LICENSE** may be generated by this script. A generated draft does not itself grant copyright permission.

## E. Release candidate evidence — one signed decision per edition

| Gate | SaaS | Enterprise |
|---|---|---|
| Verified IP and legal entity | COM-01 + contracting entity | Same, independent approval |
| Customer legal document | SaaS subscription/MSA, DPA, SLA | Enterprise EULA, order form, DPA/support where applicable |
| Release identity | Authenticated signed OCI registry image digest | Authenticated delivered image/bundle digest and customer delivery |
| Shipped file/SBOM proof | Full deployed file hashes + signed image/runtime SBOM | Full shipped file hashes + signed image/bundle SBOM |
| Third-party license rights | Network/service obligations per real deployment | Distribution, notices, source/offer obligations per shipped binary |
| 91 assets | Per-asset permission + edition scope | Per-asset explicit redistribution permission |
| Supplemental infrastructure | OS/DB/AI/font and supplier/network terms | OS/DB/AI/font plus redistributable install rights |
| Business/owner/counsel | Human signed, dated, scoped decision | Separate human signed, dated, scoped decision |
| Clinical processing | **NO-GO**, separate G2/G2b governance | **NO-GO**, separate G2/G2b governance |

**Evidence chain**: sign a manifest with immutable OCI digest, full sorted shipped file hashes and reference BOM; independent signer/certificate authority/trust chain validation; original release publisher identity and registry publication; actual deployment or customer delivery record; each per-component legal disposition; final human signed *edition-specific* decision with signatory authority, date, scope and immutable approval artifact hash. No signature values or privileged agreements in a public repository.

## F. Launch register and failure behavior

`docs/commercial/launch-decision-register.json` deliberately contains only `BLOCKED` entries, null release digests and empty human evidence. The new verifier **fails CI** on evidence injection, forged signoff, false notice issue, missing/reordered requirements, missing/duplicate package or asset rows, false provenance or an attempt to flip clinical gates. It creates a **BLOCKED** counsel-report artifact successfully when facts remain unresolved. This is not a release-enabling check. The machine cannot turn GO from mere JSON content; any genuine approvals require a separately reviewed control and independent verification of signatures.

**Intake and rollout:** collect IP evidence privately → obtain counsel preliminary ownership opinion → independently authenticate source publication and release images → verify exact shipped rights/attribution → negotiate SaaS or Enterprise contract separately → sign scoped owner and counsel decision → consider a dedicated security/privacy clinical release workflow, never from this PR.

## G. Work still open after WU-LIC-03 implementation

- #312: actual IP and contributor assignment evidence;
- #356/#360: 44 immutable publisher/build rights, 91 asset permissions and genuine signed SaaS/Enterprise images;
- #314: legally reviewed final owner-specific proprietary LICENSE, NOTICE and THIRD_PARTY_NOTICES;
- #315: actual counsel-reviewed customer agreements;
- #371: human signoff and commercial launch decision;
- #316/#317: post-V1 entitlements, billing, operational controls.

**WU-LIC-03 closes only the *engineering and draft integration* of these gates when its exact-head CI and Codex review pass; it does not close the above legal issues or authorize either edition.**
