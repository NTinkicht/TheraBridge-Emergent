# COM-02 — Controlled local tarball comparison (not an attested build)

This tool consumes the **same-run, cryptographically verified** published-file inventory created by `inventory-nextjs-published-builds.mjs` and a locally supplied, rebuilt `.tgz` archive. It never fetches or executes source and never invokes a package manager.

```bash
node scripts/commercial/compare-nextjs-rebuild.mjs \
  /tmp/therabridge-com02-nextjs-published-build-readiness.json \
  '@next/env@14.2.35' \
  /tmp/independent-next-env-build.tgz \
  /tmp/therabridge-com02-rebuild-comparison.json
```

- **ARCHIVE_BYTES_MATCH_BUILD_ORIGIN_UNATTESTED** means the supplied local compressed tarball's SHA-256 matches the independently SRI-verified published tarball and its file inventory matches. The command exits 0; **build provenance remains unverified**.
- **FILE_BYTES_MATCH_ARCHIVE_BYTES_DIFFER** means packaged file paths, sizes and SHA-256 match, but compressed tarball bytes differ. Exit 1. This is **not** reproducible npm publication.
- **REBUILT_FILES_DIFFER** records missing, additional and modified file paths. Exit 1.
- Untrusted or tampered evidence, unsafe archive structures, invalid package identities and missing files exit 2 without manufacturing an approval.

The comparator supports three allowlisted signed Next.js exact versions only. It does not execute an actual rebuild, prove signed-source origin, toolchain pinning or reproducibility, or verify genuine image contents; an unauthenticated caller could supply an already-downloaded published archive. Thus `independentlyReproducedFromSignedSource` always stays **false**, including on an exact archive match.

## Next qualification gate

For `@next/env@14.2.35`, independently execute the pinned upstream NCC/TypeScript release in an isolated, network-controlled toolchain with immutable source checkout, pinned build dependencies, captured command transcript, platform/compiler versions and signed provenance receipt. Compare the output with this tool, then verify source/build-to-artifact lineage independently; only afterward consider a *separate* attested-reproducibility determination. Repeat with distinct, pinned Rust/N-API GNU and Musl build matrices for SWC. Do not treat a comparator pass as sufficient evidence.

Fifty other exact npm versions, 91 tracked assets, production OCI manifests, redistribution/licensing rights and counsel approvals remain unresolved. No commercial SaaS or enterprise licensing, legal notices or clinical G2/G2b approval is granted by this step. Preserve all fail-closed controls.
