# M5 WU2-E — Illustrated catalogue and step integration (private-first)

**Predecessor:** WU2-D private intake PR #490 merged as `29ea7651c34264e4b4ffc4169ac6fae7a70f3742`.

## Purpose

Integrate the **single locked `m5-b-v1` illustration system** with current staff-authorized activity metadata, image-first catalogue placeholders and clinically authored numbered steps, without creating any guardian/public image fetch or implying media approval.

## Non-negotiable prerequisites for release

1. Actual 25 `1600×1200` production art masters still **NOT PROVIDED** (the accepted 320×240 set is only concept evidence); provider commercial evidence, per-image design/clinician/rights signatures and independently qualified AV/private-object-store operations still pending.
2. The current schema has **no published activity flag** and no approved/released media projection. `ActivityMediaDraft` is only `DRAFT|REJECTED`; private candidates remain `QUARANTINED|REVOKED`, rights unverified.
3. **No new image URL, private bytes, object key, release toggles, guardian image read, print disclosure or clinical activation.** G2/G2b remains NO-GO.

## Work plan

- Reuse existing `projectCatalogueActivity` and `projectPrintableActivity` rather than replacing shared authorizations or card behavior.
- Add a deliberately **private staff-only metadata preview** showing numbered, clinician-written step cards and 4:3 placeholders with textual styles and warnings, never images. Each step must remain exact activity-version-scoped, no invented advice, language translation, rights claims or image-selection authority.
- Keep the existing clinic palette, keyboard semantics, five widths and low-bandwidth fallback. Avoid changing guardian/card/printing generic components absent a genuine need.
- Verify private preview source contract, placeholder denial under forged metadata and no remote URLs or cross-tenant fetching, along with full exact-HEAD CI and eight ≥90% API/Web coverage floors.

## Exit criteria and evidence truth

This PR can qualify the **private shell integration**, not M5-12/16 publication. Manual asset QA, real operational private media scanning/security certification, asset-specific clinician/design/legal approval, delivered alt translations, full card/print visual acceptance, 100% actual published activity coverage and owner/AT sessions remain **NOT RUN**. Keep #195 #199 #198 #197 #200 open until those independent decisions and signed gates exist.
