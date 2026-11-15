# COM-01 / COM-03 / COM-04 — legal rights and contract decision intake

**OPEN — NO APPROVED COPYRIGHT OWNER, COMMERCIAL LICENSE, CUSTOMER CONTRACT, OR CLINICAL RELEASE.**

This intake is a compact **crosswalk of existing records**, not new legal doctrine and not a replacement for:
- [COM-01 #312](https://github.com/NTinkicht/TheraBridge-Emergent/issues/312): `docs/commercial/ip-rights-evidence-register.md` (eight open rights categories);
- [COM-03 #314](https://github.com/NTinkicht/TheraBridge-Emergent/issues/314): `docs/commercial/proposed-proprietary-notice.md` (NOT ADOPTED);
- [COM-04 #315](https://github.com/NTinkicht/TheraBridge-Emergent/issues/315): `docs/commercial/contracts/CONTRACT_PACK_DRAFT.md` (nine existing lettered contract sections);
- [COM-05 #316](https://github.com/NTinkicht/TheraBridge-Emergent/issues/316): `docs/commercial/com05-entitlement-design.json` (no pricing, billing or commercial grant).

## Public evidence packet (no personal/privileged material)

Run against the exact checked-out commit:

```bash
node --test scripts/commercial/build-com01-counsel-packet.test.mjs
node scripts/commercial/build-com01-counsel-packet.mjs \
  docs/commercial/ip-rights-evidence-register.md \
  docs/commercial/contracts/CONTRACT_PACK_DRAFT.md \
  docs/commercial/proposed-proprietary-notice.md \
  docs/commercial/com05-entitlement-design.json \
  /tmp/therabridge-com01-counsel-intake.json
```

The generated JSON includes SHA-256 identifiers for each of these **public working drafts**, eight anonymized evidence-scope IDs, nine existing contract-section IDs and eleven unresolved authorization decisions. It deliberately excludes author names, signed agreements, confidential contracts, privileged legal opinions, personal identifiers, customer/patient information, supposed legal conclusions and actual contract paragraphs. It enforces **all OPEN** and **zero approvals**; it cannot be edited into a signing mechanism. Keep the report ephemeral to CI or release review; re-run against exact target revisions rather than trusting a stale JSON file.

## Human-review handoff

| Reviewer | Required privately stored evidence/decision | Public status |
| --- | --- | --- |
| Authorized rights owner / UAE IP counsel | Source-contribution origin and contributor rights, institutional/student/employment status, assignments, private specification provenance, material derivative rights | UNRESOLVED |
| Institution / partners where applicable | Academic ownership policies, partner branding/content/service-use terms and required permissions | UNRESOLVED |
| Software supply-chain / legal reviewers | 53 tracked npm exceptions, third-party licenses/notices, asset rights, actual SaaS vs Enterprise release file/digest and redistribution scope, OS/fonts/media/model supplier terms | UNRESOLVED |
| Business entity and counsel | Verified legal selling entity, signature authority, contemplated proprietary notice, public-source access treatment, applicable UAE law/jurisdiction | UNRESOLVED |
| Privacy/security/clinical reviewers | Data residency, DPA roles/subprocessors, clinical regulatory status, consent/safeguarding and G2/G2b approvals | NO-GO |
| Finance/operations/counsel | Price, VAT, service tiers, SLA/RPO/RTO, support response terms, liability, retention, Enterprise permitted sites, annual renewals and order form | UNRESOLVED |

For every external item, the responsible reviewer should privately record: exact source/version or contribution scope, original author/rightsholder, governing contract/policy or immutable upstream record, reviewer role, approval/refusal date, intended SaaS and Enterprise permissions, limitations, authorized signatory and reference to a restricted evidence location. Do not publish signatures, names, private repository contents, employee/student agreements or privileged commentary in the public repo.

**Decision separation:** Verified ownership does not automatically clear third-party packages, Enterprise redistribution, privacy law or clinical practice. Counsel review of the draft contract pack does not issue patient consent or turn G2/G2b GO. The repository remains **public** by owner decision; public availability alone grants no proprietary commercial use permission, but existing third-party rights and any valid prior grants remain unaffected.

## Technical gate and acceptance

CI validates the *presence* and *unapproved status* of the eight rights rows, the nine existing contract sections and the draft notice. Missing/duplicated source categories, unjustified approval changes and unsupported entitlement status fail the test. Passing is **document integrity evidence only**, not legal readiness, independent contributor attribution or counsel approval.

Future private counsel decisions must be processed through a separately approved workflow binding the reviewer authority, signed evidence references and exact release rights. Do **not** weaken this source crosswalk to accept `APPROVED` strings in a public Markdown table. Do not add root `LICENSE` based on this report.

Related: [COM-LAUNCH #371](https://github.com/NTinkicht/TheraBridge-Emergent/issues/371), [release actual-file evidence #360](https://github.com/NTinkicht/TheraBridge-Emergent/issues/360), [npm source rights #356](https://github.com/NTinkicht/TheraBridge-Emergent/issues/356).
