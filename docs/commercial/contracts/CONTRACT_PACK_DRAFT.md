# TheraBridge — MSA and SaaS / Enterprise contracting pack

**PUBLIC WORKING DRAFT — NOT A SIGNABLE AGREEMENT, OFFER, COPYRIGHT LICENSE OR PRODUCTION AUTHORIZATION.**
**Every [BRACKETED] field is an unresolved business/legal approval item, not a proposed default.**
Prepared for COM-04 (#315). All rights-holder and third-party-rights decisions remain subject to COM-01/02/03. Have UAE-qualified counsel prepare the enforceable final language and reconcile local regulatory requirements before use.

## 0. Document map and precedence (to be confirmed by counsel)

Documents: (1) signed Order Form; (2) executed Data Processing Addendum; (3) MSA; (4) applicable SaaS or Enterprise Schedule; (5) Security, Service-Level, Support and Acceptable Use Schedules. Precedence for conflicts, particularly privacy/security and non-waivable rights, **must be determined in the executed contract**. Neither product documentation nor repository access automatically changes agreed fees, rights or clinical authorization.

Definitions for review:
- **Provider**: [verified contracting entity], not yet determined.
- **Customer**: [legal customer entity].
- **Services**: explicitly ordered hosted features or separately licensed deployments.
- **Authorized Users**, **Tenant**, **Site**, **Covered Environment**: as specified in the order; one SaaS center is not automatically one enterprise installation.
- **Customer Data**: data submitted, uploaded or generated on Customer's behalf; distinguish clinical records, metadata, telemetry and properly anonymized aggregation.
- **Provider Materials**: software, templates, designs, general know-how and Provider-owned improvements, only to the extent ownership is verified.
- **Protected Clinical Functions**: signing, co-signing, consent, release, safeguarding, live transcription/AI and other workflows gated by separately approved governance.

## A. Master Services Agreement — clause draft / legal decisions

### A1. Parties, scope, authority
Identify exact registered legal parties, addresses, signatories, order forms, affiliates and commencement. The provider warrants authority **only after** signed IP contributor/institution/partner evidence is verified. Neither an unreviewed public repository nor the draft proposed proprietary notice establishes ownership.

### A2. Orders and change control
Orders must specify SaaS/Enterprise schedule, term, deployment geography, named service limits, permitted environments, support tier, fees/taxes and referenced approved policy versions. No silent expansion of licensed sites, seats or production clinical functions. Changes to material prices, subprocessors, data locations or regulated usage require negotiated notice/consent and an amendment process [APPROVAL REQUIRED].

### A3. Limited commercial use rights
Subject to payment and the applicable schedule, the verified rights holder proposes a limited, non-exclusive, non-transferable right to use the explicitly ordered service/software during the term for Customer's internal authorized purposes. The agreement does **not** transfer source code, exclusive IP, marks, third-party materials, derivative-work rights, clinical approvals, unrestricted sublicensing or redistribution. Statutory rights and enforceability must be reviewed by counsel. Publicly accessible historical source copies and third-party license obligations cannot be overridden by this clause.

### A4. Provider and customer responsibilities
Provider: operate and maintain its agreed service boundary; deliver controls described in the approved security schedule; notify material service changes; preserve documented audit/exit behavior. Customer: designate administrators and lawful data basis, configure organizational roles, ensure qualified clinical oversight, supply accurate authorizations, manage endpoint/user security, verify content and comply with lawful use. **AI outputs and clinical drafts require authorized human review; no automatic diagnosis or protected clinical release is promised.**

### A5. Data, privacy and confidentiality
Customer retains rights in Customer Data, subject to lawful handling and documented processing roles. Provider may process it only for contracted purposes and a signed DPA; define lawfully authorized subprocessors, hosting locations, cross-border transfers, access controls, breach handling, support access and retention. Separate Customer confidential information from public marketing/demo material. Do not use real patient or child information in a synthetic demonstration environment.

### A6. Fees, invoices and taxes
No amounts or tax treatment are approved here. Reference only the signed Order Form: [PRICE], [CURRENCY], [BILLING INTERVAL], [TAX/VAT RESPONSIBILITY], [REFUND POLICY], [PAYMENT TERM], [DISPUTE PROCESS], [PRICE REVIEW]. Any automatic renewal and notice period require explicit approved terms. A payment failure must not block legally required export or unsafe-to-interrupt clinical access.

### A7. Service changes, suspension and continuity
Specify proportional temporary restriction for material abuse/security incidents and a documented appeal/remediation pathway. **No billing-based interruption may disable approved emergency clinical continuity, audit access, lawful data retrieval or required retention.** Clinical safety gates remain fail-closed; this clause grants no exception. Require an offboarding and read-only/export protocol independent from entitlement expiry.

### A8. Intellectual property, third-party notices and feedback
Clearly reserve rights only to materials actually owned/licensed by the confirmed rights holder. Preserve vendor and open-source obligations, attribution, trademark restrictions and patent notices. Customer ownership of custom integration artifacts, feedback permissions and commissioned deliverables require separately approved terms. No hidden assignment by merely reporting a defect.

### A9. Warranties, disclaimers and liability
Counsel must determine an enforceable warranty scope, service remedies, exclusions, caps, carve-outs (e.g. confidentiality, security, IP infringement, gross misconduct) and applicable mandatory protections. **Do not insert an assumed liability cap or promise clinically safe outcomes.** Claims/indemnity procedures, defense control and exclusions remain [COUNSEL DECISION].

### A10. Term, termination and transition
Specify start/end, renewals, cause/cure, data export window, secure return/deletion, backup purge exceptions, evidence certificates and legal-hold preservation. For enterprise, also specify disabling future usage without deleting Customer Data and how to migrate to another deployment. Survival of confidentiality, payment, IP and data-return obligations must be approved.

### A11. Governing law and dispute resolution
Jurisdiction, court/arbitration forum, language precedence, notices, signature formalities, assignment, subcontracting, audit rights, force majeure and order of precedence all remain [UAE COUNSEL REVIEW]. No forum or regulatory interpretation is implied by this draft.

## B. SaaS Subscription Schedule

1. **Hosted model:** one or more approved Customer tenants provisioned only in [APPROVED HOSTING REGION(S)], operated by [OPERATOR]. Do not promise UAE-only residency until verified across infrastructure, backups, logs, subprocessors and support.
2. **User rights:** named/role-based authorized users, permitted child/site counts, storage and AI quotas only as stated in the executed Order Form; no invented SKU allowances.
3. **Tenant boundary:** cross-center, therapist-specialty and guardian authorization enforced independently of billing; Customer admin responsibilities and security incident escalation identified.
4. **Subscription states:** trial / active / suspended / expired defined in approved policy. Distinguish subscription state from clinical authorization. Grace warnings, renewals, quota changes and historical audit must be covered by an engineering-tested design.
5. **Availability:** measurable SLA only per the separate signed Service-Level Schedule; exclusions, planned maintenance, outage measurement and credits must not be assumed.
6. **Data return:** documented structured export for Customer's lawful records, transition support [CHARGE/NO CHARGE], retention periods and final deletion proof [APPROVAL].
7. **Features and integrations:** third-party AI/STT, email, payment and identity providers may be disabled absent consent, contractual clearance and clinical sign-off. External service failure and degraded mode need tested behavior.
8. **Clinical constraints:** no actual patient processing, family release or live model output based solely on subscription activation.

## C. Enterprise Deployment License Schedule

1. **Deployment grant:** limited term deployment on [SPECIFIC SITES / INSTANCES / INFRASTRUCTURE], with [NAMED TENANTS/SEATS]. Distinguish production from test/DR standby and forbid unapproved resale, service-bureau and subhosting, subject to enforceable law and third-party terms.
2. **Delivery:** artifact format [CONTAINER/OTHER], version/build digest, SBOM, third-party notices, integrity checks, security baseline, supported platform and deployer/operator responsibilities agreed in the Order Form.
3. **Operational ownership:** customer-managed infrastructure and network controls, key handling, database, backups, telemetry, patch windows and cybersecurity incidents require a shared-responsibility matrix. Provider remains accountable for Provider-controlled components only.
4. **Updates:** annual maintenance, supported version window, vulnerability remediation, security hotfix entitlement, compatibility notices and optional upgrade services to be priced/approved.
5. **License verification:** activation and renewal mechanism must support disaster recovery and intermittent disconnection, and must not lock emergency access, legally required data export, retention or audit. No kill-switch or unapproved phone-home.
6. **Audit:** proportionate compliance attestation, minimum necessary telemetry, confidentiality safeguards and reasonable notice, subject to governing law.
7. **Third-party redistribution:** every bundled OS, database client, model, font, image, transitive dependency and proprietary right requires documented legal clearance and accompanying notices before distribution.
8. **Source escrow:** optional only under a signed independent escrow addendum specifying custodian, exact deposit scope, verification, release triggers, permitted post-release use, updating cadence and confidentiality. No routine source transfer.
9. **End of term:** cease unlicensed use through a safe transition process, preserve Customer Data, required records and lawful audits; preserve business continuity and apply clinical safeguards independently.

## D. Data Processing Addendum (DPA) — mandatory decision fields

- Identify controller, processor, joint/independent processing if applicable, categories of data subjects including minors, data categories (potentially sensitive health/therapy/education data), purposes, instructions and treatment of pseudonymized/synthetic data.
- Enumerate authorized subprocessors, country/region, data flow, transfer mechanism, onward access, approval/objection notices, subcontractor agreements and independent services; keep schedule updated.
- Technical controls: encryption at rest and transit, key custody, OIDC/session protections, tenant isolation, least-privilege personnel access, logging, backup integrity, vulnerability and secure-development processes; do not claim a certification not evidenced.
- Security incidents: detection, preservation, escalation, notices [TIMELINE BASED ON LEGAL DUTY], responsibility allocation, forensics and regulator/data-subject communications.
- Customer requests: access, correction, export, deletion, restriction, retention and minor/guardian authority validation; jurisdiction-specific rights to be decided with counsel.
- Return/deletion: export format, verified restoration/readability, backup cycles, legal holds, deletion certificates and retained aggregate evidence without exposing personal information.
- Audit/assurance: reasonable evidence packages, independent assessment, restrictions on sensitive security data and mutually agreed on-site audits where required.
- Annex: customer-specific data-flow map, records of processing, hosting/backup locations, subprocessors, signed annex dates and version.

## E. Security Schedule — non-assertive requirements

Record each control with **provider/customer owner, implementation evidence, exception, auditor, and current verified status**. Controls to qualify: identity and MFA requirements, password/session handling, role and specialty permissions, encryption, secret storage, access logging, secure SDLC/SBOM, vulnerability management, incident response, log retention/redaction, monitoring, backup/restore and disaster recovery, penetration testing, vendor risk, data isolation, geographic transfer and business continuity. No blanket promise of ISO/SOC certifications, uptime, residency or disaster-recovery objectives without independently verified evidence. Clinical consent/signing/safeguarding gates must remain excluded from commercial activation.

## F. Service Level and Support Schedule — fields requiring approval

| Field | Signed schedule must specify |
| --- | --- |
| Service coverage | Production services, region, support hours and excluded customer-controlled infrastructure |
| Availability target | [TARGET %], [MEASUREMENT SOURCE], [MONTHLY/OTHER PERIOD] |
| Calculation | Observable uptime denominator, planned maintenance, excluded causes, partial service and degraded modes |
| Support severity | [P1/P2/P3/P4 DEFINITIONS], safety/security escalation and customer contacts |
| Response / restoration | [ACKNOWLEDGEMENT CLOCK], [UPDATE FREQUENCY], [RESTORATION OBJECTIVE] |
| Maintenance | Advance notice, emergencies, compatibility and communication channels |
| Incident report | Evidence protection, postmortem delivery timeline, remediation commitments |
| Remedy | [SERVICE CREDITS], [CREDIT CAP], [CLAIM WINDOW], exclusion and dispute procedure |
| Backups / DR | [RPO], [RTO], retention, region, restore test frequency and owner |
| Termination transition | Data export support, read-only window, retention/deletion and business continuity |

**Service credits and support targets are not approved.** Any emergency safety response is governed by signed clinical procedures, not an unverified commercial SLA.

## G. Acceptable Use and Clinical Accountability Schedule

Define prohibited misuse (unauthorized access, credential sharing, scraping, unlawful data upload, malicious code, rights infringement, unsupported third-party deployment, unsafe automation) and proportionate incident response. Authorized medical/therapy roles remain accountable for reviewing assessments, plans, AI suggestions and releases. No clinical functionality is assumed certified, enabled or medically indicated. Do not use demo/test facilities for real patients; no automated diagnosis, therapy outcome guarantee or unauthorized consent substitution. Avoid any rule that blocks lawful emergency response or compelled data disclosure.

## H. Order Form — blank template, not an offer

- **Provider legal entity / authority:** [UNVERIFIED]
- **Customer legal entity / affiliates / addresses:** [CUSTOMER TO PROVIDE]
- **Agreement ID / effective date / signature authority:** [PENDING]
- **Product edition / schedule:** [SAAS / ENTERPRISE]
- **Service description / approved version:** [SPECIFY]
- **Tenant(s) / licensed sites / environments / seats / storage / AI quotas:** [PENDING]
- **Hosting region / customer-managed infrastructure / subprocessors:** [PENDING]
- **Commercial term / renewal / notice / grace and exit:** [PENDING]
- **Fees / currency / taxes / invoicing / payment / refunds:** [PENDING]
- **SLA / support / maintenance / DR / change and exit assistance:** [PENDING]
- **Data retention / processor roles / accepted DPA version:** [PENDING]
- **Bundled third-party notices and enterprise distribution clearance:** [PENDING]
- **Additional approved annexes, negotiated deviations and priority:** [PENDING]
- **Customer/Provider signatures:** [EXECUTED ONLY IN PRIVATE CONTRACT SYSTEM]

## I. Approval and traceability matrix

| Approval gate | Evidence reference | Status |
| --- | --- | --- |
| Rights-holder, academic/student/partner contributions | Restricted COM-01 register #312 | OPEN |
| Exact dependency/asset/model rights and SaaS/enterprise obligations | COM-02 #313 and #327 | OPEN |
| Final authoritative repository proprietary notice | COM-03 #314 | BLOCKED |
| Legal text, privacy law, child/health data and signatory authority | COM-04 #315 | OPEN |
| Tier/limit/expiry and customer continuity policies | COM-05 #316 | OPEN |
| Billing, enterprise deployment and production readiness | COM-06 #317 | OPEN |
| G2/G2b and clinical/consent/safeguarding/AI release approval | Independent clinical governance | NO-GO |

**No signing or commercial distribution of this draft.** Counsel/authorized ownership, privacy, security and clinical reviewers must sign off their respective scope separately, with privileged evidence retained outside GitHub.
