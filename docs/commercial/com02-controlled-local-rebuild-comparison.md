# COM-02 — Controlled local tarball comparison (not an attested build)

This tool consumes the published-file inventory created by `inventory-nextjs-published-builds.mjs`, a locally supplied rebuilt `.tgz`, and the **actual independently fetched published npm `.tgz`**. It authenticates that published archive against the independently pinned exact-version SHA-512 SRI in repository `yarn.lock` and reconstructs all file hashes before any published-byte comparison. The readiness JSON is **not** a trust root. It never fetches or executes source and never invokes a package manager.

```bash
node scripts/commercial/compare-nextjs-rebuild.mjs \
  /tmp/therabridge-com02-nextjs-published-build-readiness.json \
  '@next/env@14.2.35' \
  /tmp/independent-next-env-build.tgz \
  /tmp/independently-fetched-published-next-env-14.2.35.tgz \
  /tmp/therabridge-com02-rebuild-comparison.json
```

- **ARCHIVE_BYTES_MATCH_BUILD_ORIGIN_UNATTESTED** means the supplied local compressed tarball's SHA-256 matches the reference published tarball authenticated against the *repository-pinned* exact-version yarn.lock SHA-512 SRI, and its reconstructed file inventory matches. The command exits 0; **build provenance remains unverified**.
- **FILE_BYTES_MATCH_ARCHIVE_BYTES_DIFFER** means packaged file paths, sizes and SHA-256 match, but compressed tarball bytes differ. Exit 1. This is **not** reproducible npm publication.
- **REBUILT_FILES_DIFFER** records missing, additional and modified file paths. Exit 1.
- Untrusted or tampered readiness evidence, missing or changed pinned lock entries, an archive with mismatching SRI, unsafe archive structures, invalid package identities and missing files exit 2 without manufacturing an approval. The source tarball must be fetched independently and its origin retained as separate evidence; authenticity is by SRI, not path name.

The comparator supports three allowlisted signed Next.js exact versions only. As a defense against a forged JSON report, it **recomputes the published archive SHA-256 and entire file inventory from an independently supplied published tarball, verifies its SHA-512 against the exact-version `yarn.lock` entry, and rejects any contradiction**. The published bytes are a mandatory fourth input; a caller cannot cause arbitrary replacement bytes to pass merely by recalculating the report's own inventory hash. It does not execute an actual rebuild, prove signed-source origin, toolchain pinning or reproducibility, or verify genuine image contents; an unauthenticated caller could supply an already-downloaded published archive. Thus `independentlyReproducedFromSignedSource` always stays **false**, including on an exact archive match.

## Next qualification gate

For `@next/env@14.2.35`, independently execute the pinned upstream NCC/TypeScript release in an isolated, network-controlled toolchain with immutable source checkout, pinned build dependencies, captured command transcript, platform/compiler versions and signed provenance receipt. Compare the output with this tool, then verify source/build-to-artifact lineage independently; only afterward consider a *separate* attested-reproducibility determination. Repeat with distinct, pinned Rust/N-API GNU and Musl build matrices for SWC. Do not treat a comparator pass as sufficient evidence.

Fifty other exact npm versions, 91 tracked assets, production OCI manifests, redistribution/licensing rights and counsel approvals remain unresolved. No commercial SaaS or enterprise licensing, legal notices or clinical G2/G2b approval is granted by this step. Preserve all fail-closed controls.
