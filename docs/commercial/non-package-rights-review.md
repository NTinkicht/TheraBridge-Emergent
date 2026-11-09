# COM-02 — non-package commercial rights review register

Status: **OPEN — no legal or commercial clearance established**.

Automated source license reports are CI artifacts, **not authoritative notices**. Manual rights reviews remain necessary for the following categories.

| Category | Source / evidence | Required verification | Status |
| --- | --- | --- | --- |
| Preview container | `Dockerfile.preview`, per-commit preview-image CycloneDX | OS and runtime license notices, build/runtime distribution obligations; pin actual release digest | OPEN |
| Compose services | `docker-compose.yml`; Postgres/Redis and any later services | Separate upstream image SBOMs and redistributable licenses per actual distributed image | OPEN |
| Font binaries | `@fontsource/*` packages and bundled UI font files | Exact font families, font OFL/license texts, notices and bundling permissions | OPEN |
| UI icons | `lucide-react`, bundled icons and derivatives | Actual library and included asset license/attribution | OPEN |
| Original logo | `assets/brand/original/TheraBridge-Logo-original.jpg` | Creator, assignment/permission, trademarks and permitted customer usage | OPEN |
| Derived brand assets | `scripts/brand/derive-logo.py` and generated derivatives | Confirm underlying logo rights and any embedded third-party content | OPEN |
| Task catalogue images | Source and generated illustrations as introduced | Creation provenance, provider terms, models, input rights, third-party references, permitted commercial deployment | OPEN |
| AI providers/models | M3-AI work units and actual integration configs | Provider identity, commercial license, data-processing terms, model weights/usage restrictions, health data residency | OPEN |
| External datasets/services | Actual API/data-source integration inventory | Data/database rights, service conditions, commercial reuse and redistributable content | OPEN |
| Academic contributions | HCT/student/partner source contributions | Legal authorizations/assignments, independent source provenance | OPEN in COM-01 |

**The automated workflow cannot close any OPEN row.** Record external LICENSE/NOTICE source text hashes, authoritative upstream URL and exact tested version in restricted review evidence as appropriate. A lawyer or authorized owner must review reciprocal licensing obligations for both hosted SaaS and enterprise redistribution, particularly network copyleft and source-available terms.

## CI output and evidence semantics

Every PR and push to `main` emits the reconciled CycloneDX source SBOM, tracked-asset SHA inventory and `therabridge-license-review-<sha>` artifact containing JSON classification plus **THIRD-PARTY NOTICES REVIEW DRAFT**. Risk classifications are preliminary. **No final THIRD_PARTY_NOTICES.md is issued and no component is approved from scanner metadata alone.** Flag potentially restrictive terms for expedited review; missing metadata is always marked UNKNOWN_REVIEW. Fail CI rather than silently omit malformed/unknown component records. See #313 for legal license clearance.

## Release gates

- Before customer-facing SaaS use: review all applicable direct/transitive licenses, SaaS/network obligations, model/data processing rights, fonts/logo/illustrations and the verified source rights.
- Before enterprise deployment: review distributable image and OS/runtime packages, complete license notice texts, installation rights, sublicensing constraints, and immutable build/digest SBOMs.
- Retain public GitHub visibility for CI. License audit does not authorize clinical go-live.
