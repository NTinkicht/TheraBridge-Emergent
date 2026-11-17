# WU-LIC-03 — Counsel contract and proprietary notices review schedule

> **ALL TERMS ARE DISCUSSION DRAFTS / NOT EXECUTED.** No legal advice, no accepted obligations, no customer quote, no license grant and no authority to use clinical data. Approved source agreements and the legal entity must be verified by qualified counsel. Keep the repository public as directed; visibility is not permission to use or redistribute.

## 1. Common commercial agreement decision record

**Placeholders requiring independent human evidence**: verified legal contracting entity; verified original copyright owner; executed assignment dates; other contributors and institutional/students' permissions; customer legal entity and governing venue; permitted purposes and jurisdictions; effective date; service description and excluded clinical functions; selected edition; per-seat/site/tenant limits; payment schedule, applicable taxes and VAT; subprocessor list and agreed security schedule; retention/deletion; incident notification periods; support/SLA metrics; liability allocation and caps; insurance; termination rights; source escrow *only if negotiated*; signatures and exact approved revision digest.

Contract record fields (private signing workflow): `contractType`, `edition`, `revisionSha256`, `counselApprovalId`, `ownerAuthorityEvidenceId`, `signerNameAndCapacity`, `signedDate`, `customerCounterparty`, `executionReceipt`. **None may be inferred, auto-populated, or fabricated by CI.**

## 2. SaaS MSA / terms — issues for counsel

- **Grant proposal (non-operative):** narrow, non-exclusive, non-transferable subscription access for named customer tenants and lawful staff for the contract term, subject to paid entitlement and approved safe service scope. No source-code grant or binary redistribution is implied.
- **Service:** exact hosted features; separately documented excluded G2/G2b clinical sign/release, real-patient processing, consent, model claims, regulatory certifications and safety-critical operation.
- **Fees & subscription:** purchase order, tier, permitted tenants/seats, measurable AI/storage quotas, billing date, renewals and termination. Financial terms, taxes, chargebacks and price changes require finance/counsel review.
- **DPA/security:** data owner/controller and processor roles by actual flow; lawful basis; UAE/other applicable healthcare and child-data requirements to be established; region/subprocessors and cross-border transfer terms; minimum security controls, breach notification, incident response, retention, export and verified deletion; audit and subcontractor flow-down.
- **SLA/support:** clear measurement and exclusions, scheduled maintenance, response/repair targets and service credits where negotiated. Do not promise uptime/incident deadlines without operational validation.
- **Risk and IP:** warranty disclaimer within mandatory law, appropriate caps, third-party rights and indemnity, confidentiality, trademark use, misuse and abuse reporting, customer content and feedback, expiry, suspension and data export, availability of court/regulator orders.
- **Exit:** safe export and lawful retention unaffected by account billing; contractual data disposition and post-termination obligations; never auto-disable critical care access or erase mandated records due to subscription status.

## 3. Enterprise/on-prem EULA and order form — issues for counsel

- **Licensed deliverable:** digest-pinned image/bundle and exact approved files, edition/version and installed environments; no grant to SaaS host or re-offer as a service without separate written approval.
- **Scope and license metric:** explicit number of centers/sites, installation copies, permitted test/staging/production environments, authorized named users, backup and recovery copies, affiliated entities, audits and renewals. Limits must be explicitly stated on signed order form.
- **Restrictions:** copying, modification, decompilation, reverse engineering and resale only to the extent enforceable and consistent with mandatory law and third-party licenses. Do not claim proprietary rights over open-source dependencies.
- **Delivery, updates and support:** delivery receipt, patch/update matrix, supported runtime/OS versions, dependency notices, data residency, customer admin/security responsibilities, hosting upgrades, vulnerability response and end-of-support. Escrow and source access only if separately agreed and legally permitted.
- **Redistribution:** only components with independently confirmed redistribution license/notice/source-offer obligations may be included; actual image files and OSS/license notices are part of the package. Unresolved equals **NO DISTRIBUTION**.
- **Acceptance/termination:** per-delivery signed acceptance, permitted evaluation period if negotiated, rollback, backup/deletion and source retrieval, contract dispute forum and liability allocation approved by counsel.

## 4. DPA, privacy, security and SLA annexes (both editions as applicable)

Document controller/processor roles separately for family, children, therapist, center and institutional recipients; actual processing purposes, data categories, hosting and transfers, retention/deletion periods, audit trails and security; subprocessor due diligence and AI/model provider terms. Identify incident classification, breach notification process, independent testing, recovery objectives, support priority matrix and service credit rules. All timelines, jurisdictions and liabilities are placeholders pending legal/security review.

## 5. Root proprietary notice and third-party notices strategy — COM-03

**Do not install a purported final LICENSE into this public repository from the draft.** Proposed wording for counsel review only:

> TheraBridge original materials are made visible for review. This visibility does not constitute a license to copy, modify, deploy, distribute, sublicense or commercially exploit them. Any permission must be in a separate written agreement with the legally verified rights-holder. Third-party materials remain subject to their respective licenses and rights. This notice cannot limit rights granted under applicable third-party licenses or mandatory law.

Potential final notices include owner-specific original work reservation (only after chain of title), exact SPDX/license text and copyright holders, required attribution, third-party source offers where legally required, font/brand/media permission disclosures, edition/version-specific notices and privacy/security notices. Avoid calling this draft a valid governing LICENSE or treating SPDX metadata as verified text.

## 6. Separate approval and release evidence files

**SaaS approval checklist:** verified owner/contracting entity + SaaS MSA/order form + DPA + cloud/data/supplier obligations + independently signed registry OCI and deployed file SBOM + 44 exact-version and 91 assets rights + counsel and owner human approval.

**Enterprise checklist:** verified owner/contracting entity + EULA/order form + redistribution authority and notices/source obligations + signed customer-distributed image/bundle with file SBOM and actual delivery receipt + 44 exact-version and 91 assets rights + counsel and owner human approval. Enterprise requires additional redistribution proof even when SaaS later becomes approved.

Do not record completed signatures, signer identity or approved legal authority in unverified public JSON. Sensitive agreement receipts should stay in separately access-controlled storage; only safe hash references may enter the public counsel evidence package. Neither commercial decision overrides G2/G2b clinical NO-GO.

## 7. Decision log (owner/counsel completion only)

| Decision | Responsible evidence owner | Current outcome |
|---|---|---|
| IP chain of title (students, faculty, contractors, partners) | Verified rights-holder and UAE-qualified IP counsel | **BLOCKED** |
| SaaS customer terms/DPA/SLA | Contracting entity, counsel, privacy/security reviewers | **DRAFT** |
| Enterprise EULA/redistribution notices | Contracting entity, counsel, exact edition release publisher | **DRAFT** |
| Original copyright LICENSE/NOTICE | Independently verified owner and counsel | **BLOCKED** |
| Actual signed SaaS OCI, SBOM and delivery evidence | Release/security approvers | **BLOCKED** |
| Actual signed Enterprise deliverable and customer receipt | Release/security approvers | **BLOCKED** |
| Package and asset permissions | Proven rights-holders and counsel | **BLOCKED** |
| Clinical G2/G2b and real-patient release | Separate authorized clinical and privacy governance | **NO-GO** |
