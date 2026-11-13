# COM-02 — Actual npm archive evidence and reproducibility blockers

After merged PRs #365–#367, three Next.js package versions have npm 11.19.1-verified Sigstore publish and SLSA statements, and immutable source manifests under their signed commits have been corroborated (one exact package manifest and two native SWC parent-source manifests). These do **not** establish that anyone can independently reproduce the published tarballs.

## Implemented technical evidence

`scripts/commercial/inventory-nextjs-published-builds.mjs` consumes the same-run full 53-version registry queue, cryptographic npm verifier receipt, raw verified Sigstore bundle JSON, and immutable source review. It rejects evidence not bound by matching SHA-256 hashes and requires the three exact signed Next.js package versions and source commit claims.

It downloads each allowlisted **published exact-version npm .tgz** over HTTPS from `registry.npmjs.org`, validates the entire compressed archive against the lockfile's SHA-512 SRI, decompresses under strict byte budgets, safely enumerates regular tar entries and hashes their file bytes (without executing the archives). It records each archive's compressed SHA-256, the deterministic listing SHA-256, the number of generated JavaScript files, and the number/bytes of shipped native `.node` binaries.

It independently fetches the signed commit's immutable `packages/next-env/package.json` or `packages/next-swc/package.json` and checks the source-manifest SHA-256 from PR #367's real artifact. It records:
- **`@next/env@14.2.35`**: `ncc build ./index.ts`, `tsc ...` scripts with `@vercel/ncc` source dependency, generated JavaScript. A full reproducible build must reproduce generated `dist` bytes and the npm archive file set, order, metadata and SRI.
- **`@next/swc-linux-x64-gnu@14.2.33`** and **`@next/swc-linux-x64-musl@14.2.33`**: signed parent `@next/swc@14.2.33` source and Rust/N-API native-release scripts. A reproducible native build also needs the correct compiler/Rust toolchain, Cargo.lock, GNU/Musl target, native dependency availability, compiler flags, N-API packaging and official CI release inputs. Merely rebuilding in an arbitrary environment is not a byte-identical reproduction.

Outputs distinguish an SRI-verified **published archive and file inventory** from independently reproduced build bytes. All outputs explicitly retain `completePublishedArchivesReproduced:0`, `nativeSWCTarballsRebuiltByteIdentically:0`, `legallyApproved:0`, no final notices, no SaaS/Enterprise license grant and no clinical G2/G2b transition. A network/TAR/recipe mismatch remains an explicit evidence blocker rather than a fabricated success.

## Qualification and remaining steps

CI runs adversarial tests for exact package allowlisting, SHA-512 integrity mismatch, unsafe tar paths, duplicate tar entries, unsupported symlink/extended metadata, absent source build recipe, and false version claims. The new full-CI artifact `therabridge-com02-nextjs-published-build-readiness.json` lets release engineering plan a controlled rebuild. **No rebuild is performed or claimed by this PR.**

The other 50 npm package versions and 91 assets remain separately unresolved (#356/#360). This is source-to-distribution *evidence gathering*, not legal approval for resale, SaaS/network access or on-prem redistribution.
