# COM-02 — signed Next.js npm release claims vs immutable upstream source manifests

## Existing verifiable provenance

Merged PR #366 established 3 exact package versions for which npm 11.19.1 verifies paired Sigstore publish v0.1 and SLSA v1 statements. All signed subjects match the exact npm lockfile SHA-512 and package PURLs. There are 53 original unresolved versions (the other 50 do not advertise this provenance). No right to commercially redistribute was thereby established.

| npm published package | Signed GitHub source commit | Exact commit file to corroborate | What it can prove |
| --- | --- | --- | --- |
| `@next/env@14.2.35` | `7b940d9ce96faddb9f92ff40f5e35c34ace04eb2` | `packages/next-env/package.json` | Same named source package has version 14.2.35 |
| `@next/swc-linux-x64-gnu@14.2.33` | `5a97b408c2d8668bed1642d382fc1d78ed3731cc` | `packages/next-swc/package.json` | Parent SWC source package is version 14.2.33, **not** native binary byte reproducibility |
| `@next/swc-linux-x64-musl@14.2.33` | `5a97b408c2d8668bed1642d382fc1d78ed3731cc` | `packages/next-swc/package.json` | Parent SWC source package is version 14.2.33, **not** native binary byte reproducibility |

The commit IDs and these exact source-package manifest/version pairs were also independently inspected against the official `vercel/next.js` repository using GitHub on November 13, 2026, before automation.

## New machine-checkable evidence

`scripts/commercial/corroborate-signed-nextjs-source.mjs` consumes three *matching evidence files from the same CI run*: all 53 unresolved exact-version registry candidates, the trusted pinned npm Sigstore verification receipt, and the original npm-verified bundle JSON. It verifies the SHA-256 bonds between files, re-parses raw signed statements and requires their exact equality to the trusted summary, checks the source repository `https://github.com/vercel/next.js`, workflow `refs/heads/14-2-1`, immutable source Git commit, and scoped package/PURL/sha512 integrity. It then fetches only the allowlisted immutable paths from `raw.githubusercontent.com`, checks each JSON name/version and records the source manifest SHA-256.

A failure to retrieve or match an upstream source manifest is recorded as unavailable or mismatched; it does not constitute approval. The entire 53-package queue remains unresolved. Even a successful 3/3 immutable source manifest match is **not** byte-for-byte reproduction of the published npm archives, nor validation that the signed build workflow executed the claimed build recipe without hidden dependencies, and it cannot determine license, ownership, SaaS network rights or Enterprise distribution rights.

The report separates:
- `SIGNED_REVISION_IMMUTABLE_EXACT_PACKAGE_MANIFEST_MATCH` for `@next/env`;
- `SIGNED_REVISION_IMMUTABLE_PARENT_SWC_SOURCE_MANIFEST_MATCH_ONLY` for native GNU/Musl packages; and
- fetch/mismatch statuses for any unresolved upstream evidence.

These are explicit **source-manifest corroboration**, not legal or reproducible build approvals. The run leaves `independentlyReproducedPublishedNpmTarballs: 0`, `legallyApproved: 0`, commercial and G2/G2b clinical decisions false.

## Qualification and next legal evidence

Full CI executes offline adversarial tests (forged or omitted package, substituted raw bundle, edited receipt, bad SLSA source claim, changed version, malformed source) and actual immutable source-file fetches, retaining `therabridge-com02-nextjs-immutable-source-review.json` in the already-established 30-day CI artifact. For the other 50 exact package versions, obtain independently corroborated release/build source correspondence or leave them unresolved. For real SaaS/Enterprise shipments, see #360 (customer-delivered OCI digests and 91 asset rights). Authenticated source claims do not confer license permission or final notices.
