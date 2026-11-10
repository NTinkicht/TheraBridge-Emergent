# COM-02 — corroborate publisher versions to immutable source revisions

**Status: DRAFT OPENING CHECKPOINT ONLY — NOT IMPLEMENTED, NOT TESTED, NOT APPROVED.**

Predecessor: [PR #355](https://github.com/NTinkicht/TheraBridge-Emergent/pull/355), merged at `25cd4382247b6d5bc811840b6990f29b2240296e`. Tracks [#356](https://github.com/NTinkicht/TheraBridge-Emergent/issues/356) and parent #354.

## Verified baseline

- 53/53 exact-version npm registry manifest *metadata candidates* previously collected.
- Existing immutable-source fetch/hash verifier has full exact-head CI and final Codex qualification.
- **Zero independently corroborated package-to-repository-commit mappings**, zero authoritative exact-version upstream source-license proofs, zero commercial approval.
- 91 separately tracked non-package assets; one semantic-PAX archive remains fail-closed.

## Frozen execution boundaries

1. Independently corroborate exact publisher package versions to specific immutable repository commits or signed release artifacts before populating mappings. Do not assume npm version → Git tag or infer source ownership from a registry manifest.
2. Validate the source mapping, actual LICENSE/NOTICE/COPYRIGHT file bytes and SHA-256, provenance, rights holder and conditions with explicit statuses for mismatches and unavailable sources.
3. Distinguish technical evidence from UAE counsel-reviewed SaaS and customer-redistributed enterprise licensing; no automatic legal approvals, final notices or proprietary LICENSE publication.
4. Maintain full-source and release-image/OS/native/asset/model/data scope evidence; never silently omit the 53 package-version exception population or 91 assets.
5. Update all four Rule 7 handover files and obtain six exact-head CI green jobs and independent Codex review before merge.
6. Preserve public repository visibility and clinical G2/G2b NO-GO.

The existence of this draft is not authority to license or deploy TheraBridge commercially.
