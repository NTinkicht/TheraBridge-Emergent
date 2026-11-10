# COM-02 — corroborate publisher versions to immutable source revisions

**Status: Candidate source-correspondence collector implemented; exact-head CI and independent review pending — NOT LEGALLY APPROVED.**

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

## Implementation checkpoint

`scripts/commercial/collect-upstream-license-candidates.mjs` records exact-version npm registry `gitHead` only when it is a syntactically valid full Git object ID. `scripts/commercial/corroborate-source-revisions.mjs` strictly parses an exact `github.com/owner/repo` repository claim; only when a 40-byte hex `gitHead` is present does it fetch `package.json` through the existing bounded, no-redirect `raw.githubusercontent.com` HTTPS reader at that immutable commit. It records raw SHA-256 and only marks `REGISTRY_GITHEAD_MATCHES_IMMUTABLE_SOURCE_ROOT_MANIFEST_ONLY` when the exact package name and version match.

**This is a candidate discovery mechanism, not independent upstream release-to-package attestation.** An npm publisher can claim `repository` and `gitHead` fields; matching those against a root source manifest alone cannot prove that npm distribution came from the stated commit. Monorepo subpackages (root manifest mismatch) remain unresolved until correct package-path lineage is independently established. All 53 exceptions remain in the output regardless of missing or rejected metadata. The output includes zero authoritative LICENSE text verifications, zero legal approvals, zero source-version independent attestations and still reports all 91 separately unresolved assets.

The collector emits an exact-commit metadata candidate queue and does not mutate the empty, signed-source-approval mapping register. There is no automatic transition to commercial licensing.

## Additional integrity precondition

The resolver refuses to fetch Git source candidates unless the npm manifest was retrieved for the **exact package version**, its raw metadata SHA-256 is present, and its `dist.integrity` matches the frozen Yarn lock integrity. Unmatched manifests, missing SRI or mismatches yield `REGISTRY_MANIFEST_OR_LOCK_INTEGRITY_UNCONFIRMED` per package, never a positive source-correspondence claim. This preserves a strict separation between content-lock evidence, upstream source-root matching, independent package publication attestation and commercial rights.
