# COM-02 — DefinitelyTyped 26 exact-version source-history evidence intake

**Status: EXACT npm published tarball and lock metadata verified in CI; ZERO immutable upstream Git revisions or publisher-to-source attestations; ZERO software/clinical licensing approvals.**

This work is a narrower, evidence-backed continuation of [#356](https://github.com/NTinkicht/TheraBridge-Emergent/issues/356), not a new ownership register or license grant. The actual GitHub Actions evidence from PR #379, run `43710311891`, artifact `therabridge-installed-license-files-7d23bfeabeb5e6f90d2cd91b8903721a229248d6`, contains **26 exact `@types` package/version exceptions** in the 53-version source-rights queue: **6 directly declared and 20 transitive**.

These 26 versions have registry exact-version metadata and locked integrity evidence and claim `https://github.com/DefinitelyTyped/DefinitelyTyped.git`, but the exact npm registry manifests do **not** supply valid immutable `gitHead` revisions. A current `types/<name>` directory or a guessed historical Git tag proves neither publication origin nor legal permission. The `@types/node` major lines `20.19.43` and `26.6.5` must be separate records.

## Same-run review receipt

```bash
node --test scripts/commercial/build-definitelytyped-triage.test.mjs
node scripts/commercial/build-definitelytyped-triage.mjs \
 /tmp/therabridge-com02-upstream-candidates.json \
 /tmp/therabridge-com02-source-correspondence-candidates.json \
 /tmp/therabridge-com02-exact-version-rights-queue.json \
 /tmp/therabridge-com02-definitelytyped-26-triage.json
```

The collector enforces exact name/version membership; reconciles upstream candidate, source-correspondence and tarball/rights queue on all 53 versions; verifies all 26 untrusted immutable-source revisions are **null**; checks the published tarball SHA-256, independent registry metadata SHA-256 and equal lockfile SHA-512 SRI; and rejects forged ownership/licensing approvals. The CI receipt is added to the already-established installed-license-evidence artifact, preserving the source commit and run ID. It includes deterministic source **subdirectory candidates**, not verified historical Git paths, commits or copyright assertions.

## Next independent version-by-version proof

1. For each version, establish an independently authoritative historical DefinitelyTyped revision or upstream release manifest corresponding to the exact published package, including the toolchain publisher's provenance/release record. Check whether the relevant `types/<name>` subtree and all dependencies at that immutable revision reproduce the exact tarball declaration files, without assuming the package patch number equals a Git revision.
2. Verify copyright/license texts against independently immutable source and shipped tarball bytes; distinguish publisher package-root notice absence from installed-package license evidence.
3. Record the source publication link only when the independent publisher identity, exact revision, package subject/version and tarball digest are verifiable. If evidence is unavailable, leave the package `REQUIRES_VERSION_SPECIFIC_HISTORICAL_PUBLICATION_AND_RIGHTS_EVIDENCE`. Source-current master, npm manifest `MIT` expression or directory presence are insufficient.
4. Classify actual network use and Enterprise redistribution from a real immutable product release-image digest. Determine rights with authorized owner and counsel. No edition license, final THIRD_PARTY_NOTICES, real patient processing or G2/G2b GO is implied.

### Fail-closed exclusions

The receipt does not fetch an untrusted repository URL, publish contributor names, infer a signed source revision from a lockfile, declare any copyright owner, add a root LICENSE, or substitute its 26-version scope for the other **27 unresolved versions** and **91 non-package asset** rights. Changing the 26-version baseline requires a reviewed inventory change; drift fails CI instead of quietly removing a row.
