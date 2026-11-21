# TheraBridge — commercial legal readiness (working register)

Status: **UNVERIFIED — NOT APPROVED FOR COMMERCIAL LICENSING OR CLINICAL PRODUCTION**
Last reviewed: 2026-11-09
Tracking: #312 #313 #314 #315 #316 #317

This is a planning record, not a declaration of ownership, a software license, or legal advice. The repository's publication status or possession of its source code does not establish exclusive IP ownership.

## Release gates
| Gate | Evidence needed | Status |
| --- | --- | --- |
| IP ownership | Contributor-by-contributor rights register, signed assignments/agreements, counsel determination | OPEN |
| Academic/institutional rights | Applicable student/employment policies, any institutional claims, written clearances | OPEN |
| Partner rights | Sponsorship, deliverables, content and use-rights agreements | OPEN |
| Third-party licenses | Dependency and asset inventory, obligations, attribution and commercial compatibility | OPEN |
| Source exposure | Public repository history/forks, access controls, any restricted material and secrets | OPEN |
| Rights-holder identity | Authorized legal party for copyright notice, invoices and contracts | OPEN |
| UAE legal/regulatory | Health data, privacy, child safeguards, residency, clinical role, customer terms | OPEN |
| Clinical production | All clinical governance, consent and safeguarding approval gates signed | BLOCKED |

## Rights inventory template
Record each material asset or contribution: `asset/path | author/source | date | employment/student/contract basis | written permission reference | third-party license | commercial right verified? | reviewer | disposition`.

Do **not** store privileged contracts, personal identifiers, signatures, confidential partner agreements or patient data in the source repository. Maintain evidence links in restricted storage; record only non-sensitive status and reviewer roles here.

## Public source caution
Owner decision (2026-11-09): **keep GitHub repository public intentionally** to avoid current GitHub Actions/CI limitations. Do not propose or perform a privacy transition as part of commercialization. Public visibility is distinct from granting an open-source license; confirm rights before adding the authoritative proprietary notice. Existing public copies/forks and third-party rights still require assessment. `package.json`'s `private: true` relates to package publishing, not repository visibility.

## Decision record
- Proposed business model: proprietary hybrid SaaS + annually licensed enterprise deployments.
- No authoritative rights holder has been identified or approved.
- Do not add a final `LICENSE` or `LICENSE.md` asserting exclusive rights until #312 and #313 are cleared.
- Keep V1 runtime untouched by commercialization work.
- Customer terms cannot override third-party licensing obligations or authorize unapproved clinical use.
