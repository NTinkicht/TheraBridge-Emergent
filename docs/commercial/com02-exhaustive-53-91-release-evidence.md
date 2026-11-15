# COM-02 full-scope evidence closure matrix — 53 npm versions, 91 assets, two editions

> **Re-baseline 2026-11-15 (PR #311, Nest 11 / Next 15.5.29 dependency security upgrade):** the exact population is now **47** npm exceptions — the same **26** DefinitelyTyped versions plus **21** others: **11** immutable root `package.json` observations, **7** without a pinned revision (now including the three Next.js 15.5.29 packages, which carry signed SLSA provenance but no registry `gitHead`), **2** subpath-published LGPL-3.0-or-later `@img/sharp-libvips-*@1.3.4` binaries whose repository root has no manifest (HTTP 404), and **1** legacy untrusted repository identity. Removed from the lock: Next 14 `@next/*`, `@swc/counter`, `busboy`, `streamsearch`, `consola`, `eastasianwidth`, `emoji-regex@9.2.2`, `tmp@0.0.33`, `tr46@0.0.3`. Assets (91) and every BLOCKED/UNRESOLVED conclusion below are unchanged; the historical text below describes the pre-upgrade 53-version snapshot.

**BLOCKED. Evidence integrity implementation; not independently established publication lineage, actual commercial release artifact, licensed IP, or clinical authorization.**

Tracks [#356](https://github.com/NTinkicht/TheraBridge-Emergent/issues/356), [#360](https://github.com/NTinkicht/TheraBridge-Emergent/issues/360), [#371](https://github.com/NTinkicht/TheraBridge-Emergent/issues/371). This reconciles the previously separate, existing exact-version registries; it does not duplicate npm collectors, source-file hasher, signature verification, asset hashing or contract drafting.

## Verified evidence at this checkpoint

- The existing frozen publisher/installed evidence has **53 exact npm exceptions**, including the **26** DefinitelyTyped exact version records. None of those 26 has an independently pinned historical source commit. Their target subtrees are names such as `types/babel__core`, not proof that the current branch or a guessed tag produced npm's release. The upstream DefinitelyTyped README documents automated publication by DefinitelyTyped-tools and its independent patch-version process; those are **generic publisher-process context**, not version-specific signed records.
- Other **27** publisher source-rights rows have: **15** exact immutable root `package.json` observations (including separately documented two historical GitHub repository redirects), **7** without a pinned revision, **3** Next.js monorepo subpackage root mismatches, and **2** legacy untrusted repository identities. A source-root match is **not** npm publisher-to-source build proof.
- Existing tracked nonpackage source rights: **73** image/icon, **15** brand, **3** container-build paths. All **91** remain `UNRESOLVED`. File hashes do not establish copyright ownership or that those bytes are shipped to customers.
- The connected Render service `therabridge-ahmed-synthetic-demo` uses `Dockerfile.preview`, on `chatgpt/tb-em-018-hosted-demo-activation`; it is a **synthetic** demo, not production SaaS nor a customer-distributed Enterprise image. No verified commercial release image digest, independent registry publisher signature, independent deployment attestation, commercial immutable image SBOM, or approved redistribution record is available for either edition. We did not deploy or publish a new image.
- The project's existing **one semantic-PAX tar header exception** remains explicitly unresolved; no weakened TAR parser or automatic license approval.

## New executable cross-evidence report

`scripts/commercial/build-com02-closure-ledger.mjs` consumes, in one exact CI run:

1. `/tmp/therabridge-com02-exact-version-rights-queue.json`
2. `/tmp/therabridge-com02-source-correspondence-candidates.json`
3. `/tmp/therabridge-com02-bulk-rights-evidence.json`
4. `/tmp/therabridge-com02-definitelytyped-26-triage.json`
5. `docs/commercial/release-file-evidence.json` (currently no actual images)

It checks the **53-to-53-to-53 exact-version join**, immutable `@types` subdirectory targets, mandatory unresolved provenance, exact tariff digest consistency, the **91** source asset hashes/categories and each edition's real candidate-image file-list classification through the existing `reviewReleaseScope` validator. It emits one per-version/per-asset/two-edition JSON with independent publication, distribution, legal and clinical decisions **all false**. Partial manifests, changed count, forged publisher claims, legal approvals, renamed/omitted assets and fabricated release approvals fail closed.

```bash
node --test scripts/commercial/build-com02-closure-ledger.test.mjs
node scripts/commercial/build-com02-closure-ledger.mjs \
  /tmp/therabridge-com02-exact-version-rights-queue.json \
  /tmp/therabridge-com02-source-correspondence-candidates.json \
  /tmp/therabridge-com02-bulk-rights-evidence.json \
  /tmp/therabridge-com02-definitelytyped-26-triage.json \
  docs/commercial/release-file-evidence.json \
  /tmp/therabridge-com02-closure-ledger.json
```

Full CI archives the report in the existing `therabridge-installed-license-files-<sha>` artifact alongside the exact inputs. Avoid stale committed generated reports.

## How genuine evidence can clear technical and legal blockers

| Scope | New independently verifiable proof required | Current truthful disposition |
| --- | --- | --- |
| 26 DefinitelyTyped versions | Per-version release publication timestamp and independent publisher/build ID; exact immutable DefinitelyTyped commit and `types/<package>` subtree; source files/publisher tarball bytes or signed reproducible build evidence; same package subject/version and tarball SHA-256 | **26 unresolved historical publication links** |
| 15 source-root matches | Verified upstream source commit and immutable manifest **plus** independently authenticated npm publisher build subject, exact matching tarball hash, release workflow/issuer and archive files | **15 source-root matches, zero independently verified publication-to-source links** |
| 7 no-revision cases | Exact immutable upstream source/release commit tied to package version, registry archive and signed publisher evidence | **7 unresolved** |
| 3 Next.js monorepo cases | Match exact subpackage build inputs, npm version and separately signed publication to pinned source; valid archive SRI alone is insufficient | **3 unresolved source-build identities** |
| 2 legacy repositories | Independently confirm canonical repository identity and immutable historical commit; no unchecked Git/SSH URL or arbitrary redirect | **2 unresolved origins** |
| 91 assets | Actual independently authenticated edition-specific release image file paths/content SHA and source-asset byte match; original creators' permissions for branding/images, derivative rights, font/AI/provider terms | **91 unresolved legal rights and shipment status** |
| SaaS | Registry-qualified OCI image digest plus signed publication/build and authenticated production deployment receipt; file/OS/npm SBOM, service region/subprocessors, per-component network rights | **No independently verified SaaS commercial artifact** |
| Enterprise | Separately digest-pinned actual shipped customer image with independently verified registry signature, authentic delivery receipt and complete OS/runtime/image/font/asset notice and redistribution review | **No independently verified Enterprise deliverable** |

A local Docker export, even paired with a self-signed DSSE statement, remains **unattested local candidate evidence**. Existing scripts `capture-docker-release.py`, `merge-release-captures.mjs`, `verify-oci-dsse.mjs`, `reconcile-signed-release-rights.mjs` and `review-release-scope.mjs` must not be bypassed. An authoritative deployment/delivery digest, independently trusted signing identity and restricted counsel decisions must be supplied **from real release process owners**, not invented in source code. A true image can have additional mounted/runtime materials absent from Docker export; confirm those separately.

The contract pack already exists and all reviewer approvals remain external. Keep public GitHub visibility, billing inactive, no clinical signing/transcription/AI or patient processing and G2/G2b **NO-GO**. The report is a gap-and-evidence ledger, never a customer license grant.
