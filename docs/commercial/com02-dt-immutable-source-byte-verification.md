# COM-02 — Reproduce exact DefinitelyTyped publisher fingerprints from immutable source bytes

**No historical publisher→Git build attestation established. No software or asset rights approved.**

This implementation continues [#356](https://github.com/NTinkicht/TheraBridge-Emergent/issues/356) after merged #382, #384 and #386. The exact same-run CI version/rights evidence contains **26** `@types/` versions (6 direct, 20 transitive) with 26 advertised `typesPublisherContentHash` SHA-256 candidates. These are **not signed build provenance**; source publication revisions are still not independently identified.

## Verified upstream recipe

The exact pinned `microsoft/DefinitelyTyped-tools` revision `381c47f6a6d3d76dd6773e782f4896123b40d54b` computes `typesPublisherContentHash` by selecting the `getFiles()` declaration-file set in source filesystem order, appending source `package.json`, sorting only top-level package JSON keys, concatenating `path**content` records with `||`, normalizing CRLF and CR to LF, and hashing UTF-8 with SHA-256.

Source references: `packages/definitions-parser/src/packages.ts`, `packages/definitions-parser/src/lib/definition-parser.ts`, `packages/utils/src/miscellany.ts`, `packages/publisher/src/generate-packages.ts`. An exact publisher hashing-recipe revision must ultimately be selected **per historical publication date**, not assumed unchanged across every package.

`verify-dt-immutable-source.mjs` takes a same-run 26-version evidence receipt, exact name/version, immutable **40-character Git commit**, and an explicit `types/<name>[/vN]` path. It uses only bounded GitHub `git/commits`, `git/trees`, and `git/blobs` APIs for `DefinitelyTyped/DefinitelyTyped`, rejects redirects, authenticates each blob against its Git SHA-1, enforces size/path/tree limits, and computes a candidate SHA-256. A match is strictly `IMMUTABLE_SOURCE_BYTES_MATCH_UNATTESTED_PUBLICATION`, never `publisherToSourceAttested` or a license grant. This is a technical hash of Git source bytes, not signed GitHub or npm publisher identity. Git SHA-1 is not equivalent to a signed upstream source release.

For manual historical candidates, from an authorized environment with an independently obtained Git commit:

```bash
node scripts/commercial/verify-dt-immutable-source.mjs \
  /tmp/therabridge-com02-definitelytyped-26-triage.json \
  @types/methods 1.1.4 \
  <exact_40_hex_historical_commit> \
  types/methods \
  /tmp/com02-methods-historical-candidate.json
```

The input commit must come from independently documented historical source publication evidence, not a synthesized npm version tag or a branch tip. Before confirming correspondence, also independently check exact npm tarball bytes/SRI, source archive/build recipe, publication timestamp, publisher/builder authority and upstream revision, including generated files and notices; compare version-specific `types/<name>[/vN]` subtrees. The tool **deliberately** never returns a positive historical-build attestation.

## Two real bounded source probes

Full CI additionally fetches a frozen upstream Git revision `DefinitelyTyped/DefinitelyTyped@302dab5cd36dba67332a8fde616727f7936de115` (a **2026-11-14 snapshot, not a verified publish commit**) for `@types/methods@1.1.4` and `@types/cookiejar@2.1.5`. It archives `therabridge-com02-dt-snapshot-probes.json` inside the existing per-commit installed-license evidence artifact. Each probe reports `IMMUTABLE_SOURCE_BYTES_MATCH_UNATTESTED_PUBLICATION`, `IMMUTABLE_SOURCE_BYTES_NOT_MATCHED`, or `SOURCE_PROBE_NOT_ESTABLISHED`, including content hashes where available. A network outage or rate limit never becomes a false match; zero independent publication attestations and commercial approvals remain invariant.

These probes are a smoke test of a **real upstream Git object retrieval and hash comparison**, not an assertion that the pinned 2026 snapshot is the historical origin of either npm publication. Their results do not generalize to the other 24 versions.

## Remaining 26 + 27 + 91 + 2 edition responsibilities

- **26 DefinitelyTyped**: match each version's exact publisher fingerprint to an independently discovered historically applicable, immutable source revision; additionally authenticate the published npm archive/build and the publisher. No source lineage is established just because the source's name and major/minor version coincide.
- **Other 27 exact npm exceptions**: retain the existing fail-closed groups—15 root-manifest metadata matches, 7 no pinned Git revision, 3 Next.js monorepo subpath mismatches, 2 legacy repository-origin aliases. The signed three Next.js npm archives have distinct publisher-SRI proof, not full build-to-source or license clearance. One TAR semantic-PAX case remains separately unresolved.
- **91 tracked assets**: 73 images/icons, 15 brand and 3 container-build sources require rights holders, permitted SaaS/network versus Enterprise redistribution and explicit release-file proof. Git source paths alone cannot prove image inclusion or absence.
- **Actual SaaS / Enterprise artifacts**: connected Render currently exposes only the synthetic `therabridge-ahmed-synthetic-demo` deployed with `Dockerfile.preview` on its synthetic branch. There is no verified independently published commercial SaaS OCI digest, separately delivered Enterprise OCI digest, exact shipped filesystem inventory or immutable per-edition source/SBOM/notice reconciliation. The existing `build-com02-closure-ledger.mjs` and `review-release-scope.mjs` remain authoritative for the two editions' **UNVERIFIED** technical states.

These obligations should be closed **only against real evidence from the actual release**. Do not replace existing legal intake/contract drafts; source and public GitHub visibility do not grant resale rights. Clinical G2/G2b remains NO-GO, billing remains inactive, no real-patient data or clinical signing is authorized.

## Qualification

The source verifier uses offline adversarial tests with mock Git objects, including valid source equality, wrong publisher hash, forged approval, unsupported source paths and mismatched Git blob content. CI also runs the two live exact-commit probes without converting their output into a release approval. Exact final-head full CI, independent Codex and review-thread disposition are required before merging this PR.
