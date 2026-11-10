# COM-02 — post-#344 technical exception and distribution evidence gate

Status: **OPEN — technical classification only; 0 legally approved packages**.

Baseline: PR #344 merged as `acd2ce50a2af97d05eee3c82934a55612a835990`. CI evidence counted 42 installed direct rows (36 verified published/installed license-file matches, 6 no recognized publisher package-root license file) and 621 distinct installed non-direct rows (574 matched, 44 without recognized package-root license file, 3 unsupported tar header records). No rows were deferred. Physical package copies may exceed unique version rows.

## Exception classes and disposition

| Class | Count | Required next evidence | Status |
| --- | ---: | --- | --- |
| PAX/GNU tar extension | 3 | Strict safe parser plus matching SHA-256 of published/installed license files; inspect `busboy@1.6.0`, `streamsearch@1.1.0`, `tmp@0.0.33` | OPEN |
| Tarball SRI verified but no package-root LICENSE/NOTICE | 50 | Exact-version publisher/upstream license text, copyright holder, authoritative URL, text SHA-256, NOTICE where needed; differentiate installed text from published bytes | OPEN |
| Fonts, logos, illustrations, models and datasets | Inventory tracked separately | Specific rights owner, source, attribution and commercial use grant; no approval from a filename or package manifest | OPEN |
| OS/container and distributable runtime | Release image digest must be pinned | Reproducible OS/component SBOM, approved notice and redistribution requirements | OPEN |

## Obligations (counsel decision required)

For each verified upstream license and asset, compare:
- **Hosted SaaS:** network-use clauses, service-provider terms, notices in web UI/service, API/model/data-processing and territorial restrictions.
- **Enterprise/on-prem:** binary/container/OS and fonts/asset redistribution, complete notices, source-offer/corresponding-source obligations if applicable, sublicensing, patent and trademark conditions, customer deployment restrictions.
- **Dev-only/not distributed:** record exact justification; no automatic assumption that absence from a production artifact settles network-use or build-time rights.

All evidence remains `UNRESOLVED` or `VERIFIED_TECHNICAL_EVIDENCE_NOT_APPROVED` until owner/counsel documents the applicable classification. Never promote to `APPROVED` from CI or manifest metadata. Draft notices are not final customer disclosures.

No proprietary root LICENSE, legally binding customer contracts or real clinical data/activation is authorized by this work. Public GitHub visibility and the G2/G2b NO-GO remain unchanged.

Tracking: #346, parent #313 / #327 (technical issue closure does not mean commercial clearance).
