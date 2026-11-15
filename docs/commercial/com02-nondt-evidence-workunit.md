# COM-02 — Non-DefinitelyTyped publication and rights evidence workqueue

This work unit introduces `scripts/commercial/build-com02-nondt-workqueue.mjs` and adversarial tests. It consumes the **same-run** output of `build-com02-closure-ledger.mjs`, not an independently editable package list. It preserves exact name/version, upstream source SHA candidate, tarball SHA-256, and a per-category evidence request. All publication, legal and commercial approvals remain false.

## Important moving-baseline rule

The previously documented **53 = 26 @types + 27 other** exceptions is a historical lockfile population. After merged dependency PR #311, the current main closure matrix documents **47 = 26 + 21**. Open PR #394 proposes **46 = 25 + 21** after Next.js 16 and React 19. The generator deliberately derives the required totals from a qualified current closure ledger and rejects count contradictions; it must not be fed a historical ledger and represented as proof of the latest lockfile. Rerun the full existing evidence collectors and closure ledger after any dependency merge. It does not merge or supersede #394.

## Execute from the same validated CI run

```bash
node --test scripts/commercial/build-com02-nondt-workqueue.test.mjs
node scripts/commercial/build-com02-nondt-workqueue.mjs \
  /tmp/therabridge-com02-closure-ledger.json \
  /tmp/therabridge-com02-nondt-workqueue.json
```

Outputs are **candidate task lists**, not source or distribution attestation. Preserve the exact same-run ledger and raw archive/registry/signature/source evidence in CI; only then may a record be independently qualified.

## Four non-@types queues

- **Source-root metadata-only:** independently bind the exact npm tarball digest, publisher build, immutable upstream commit and authenticated workflow/issuer. A matching root manifest alone does not prove the package was built from that tree.
- **Missing immutable revision:** retrieve canonical release commit and signature/build provenance; separate signed npm version from exact source linkage.
- **Monorepo/subpath binaries:** verify actual subpackage build tree, native OS/runtime dependencies and LGPL notice/source provision obligations; specifically assess optional `sharp-libvips` artifacts for Enterprise.
- **Untrusted legacy origin:** verify canonical owner/repo and immutable commit without relying on redirects or metadata claims.

The 91 asset rights, shipped file comparisons, production SaaS deployment proof and customer Enterprise digest/delivery/SBOM remain separate unresolved controls. No real OCI image is invented here. A workqueue status can never be interpreted as counsel approval, intellectual property ownership, customer license issuance or clinical G2/G2b clearance.

## Qualification

Run targeted Node tests, then full PR CI and independent Codex on the exact final HEAD. If CI reports a failure, fix it on this PR. Integrate the new workqueue as a same-run CI artifact only after the existing closure ledger input path is verified to be available in that job. Never weaken the existing closed-world checks to accommodate a mismatched dependency baseline.
