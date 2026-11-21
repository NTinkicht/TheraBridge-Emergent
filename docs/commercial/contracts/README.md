# TheraBridge commercial contract pack — drafting control

**STATUS: COUNSEL-REVIEW DRAFT; NON-BINDING; NOT FOR CUSTOMER SIGNATURE.**
**Rights holder, contracting entity, effective jurisdiction, clinical deployment approval and third-party rights: NOT VERIFIED.**

Tracking: COM-01 #312, COM-02 #313, COM-03 #314, COM-04 #315, COM-05 #316, COM-06 #317. This folder contains publicly shareable generic templates only. Do not include signatures, actual customer information, staff details, health information, privileged legal advice, tax identifiers or prices in the public repository.

## Contract architecture

| Instrument | Purpose | Required independent approval |
| --- | --- | --- |
| Master Services Agreement (MSA) | Common commercial/contract framework, IP and liability | Rights holder + UAE-qualified counsel |
| SaaS Schedule | Hosted access, tenant subscriptions and continuity | Security/privacy/finance/product owners |
| Enterprise License Schedule | Designated installation/site/use, upgrades, escrow | Rights holder + deployment/security owners |
| Order Form | Commercial terms, locations, tiers, limits, contract precedence | Authorized seller and purchaser |
| Data Processing Addendum (DPA) | Personal/child/health data roles, subprocessors, location, exit | Privacy counsel + customer controller |
| Security Schedule | Controls, incident handling, audit and continuity | Security + operator |
| Service-Level & Support Schedule | Availability, measurement, response, maintenance, remedies | Operations + finance |
| Acceptable Use Schedule | Authorized use, abuse controls, clinical accountability | Product + clinical/legal |

All instruments are consolidated as structured **draft clauses** in [CONTRACT_PACK_DRAFT.md](CONTRACT_PACK_DRAFT.md). They are not a license grant or marketing claim.

## Required decisions before any document becomes operative

1. Identify verified software-rights holder and the separately authorized selling entity, with evidence in the restricted COM-01 register.
2. Complete third-party copyright/license notices and SaaS-versus-enterprise redistribution assessment (COM-02); account for previously public code and existing forks.
3. Determine UAE jurisdiction, data residency, health/child-data requirements, regulatory classification, permitted clinical purpose, controller/processor roles and conflict-of-law handling with qualified counsel.
4. Select approved hosting regions and named subprocessors; assess customer-managed enterprise environments independently.
5. Approve pricing, VAT treatment, refunds, support hours, support severity clock, uptime metric, exclusions, service credits, retention/deletion windows, breach notices and liability caps. All bracketed fields remain undecided, not defaults.
6. Ensure licensing, payment or tenant suspension cannot disable emergency clinical access or mandatory export; no real data until G2/G2b and other named clinical gates are separately approved.
7. Verify signature authority and store executed contracts only in access-controlled contract storage outside this public repository.

## Document lifecycle

DRAFT -> business/security/privacy/clinical review -> counsel-redlined -> rights-holder decision -> approved version and signatory authority -> controlled customer issue -> countersigned and archived.

Do not replace a bracketed item with an invented value, and do not publish executed agreements, privileged redlines or personal identifiers. Preserve this pack's version and change-control log as non-confidential metadata only. Changes to source-code license or commercial runtime require independent tracked PRs and gates.

## Release separation

- Synthetic preview = engineering demonstration only; not permission for clinical operation.
- Commercial contract approval = contract authority only; not permission for real-patient clinical use.
- Production clinical pilot = independent governance/consent/safeguarding/security/privacy evidence and explicit responsible approvals.
- Customer contract execution must not be described as completing any missing clinical gate.
