# COM-02 #405 — additive exact-version source-root byte comparison

**Implementation checkpoint: CI qualification pending.**
This work unit follows merged PR #407 (commit `589c36b7b86624d89ff9c39c549f553916fe7e1e`). It must not edit the dated 2026-11-15 fifteen-source observation snapshot or claim any npm publication attestation.

Target: `unicode-emoji-modifier-base@1.0.0`, now the tenth current `SOURCE_ROOT_MANIFEST_ONLY` package in the Node24/Nest12/Jest30 exact 44-version COM-02 ledger.

Independent immutable source check carried out on 2026-11-17:
- Git repository `mathiasbynens/unicode-emoji-modifier-base`
- Exact Git commit `16333bdecc0e399f18bedd00b36995f3399ac5ec` (GitHub commit title “Release v1.0.0”)
- `package.json` raw bytes **1,271**, independently computed SHA-256 `242f5577f26c3fff547508911718348993d5ef04ff72a44c71115ce002521301`
- Git-blob SHA-1 over exact Git header + raw bytes `41420b11a80e2ba36975c65e2503e6f4327ad41c`, matching GitHub blob observation
- The candidate exact npm archive SHA-256 in the workqueue is `b753860ffa1f54f2b415de82e23d2ce79a89bfdc5fff1a4361a32cc8215ff4e5` — this is independently revalidated only when the CI receipt is generated
- `MIT` is **unapproved upstream license metadata**, not TheraBridge commercial license clearance

The dedicated `verify-com02-root-405.mjs` obtains the immutable source manifest directly from `raw.githubusercontent.com` and the frozen Yarn lockfile original `registry.npmjs.org` tarball (no redirects/alternate hosts). It checks both Git-object SHA-1 and raw Git-manifest SHA-256, source name and version, Yarn SHA-512 SRI, publisher archive SHA-256, bounded strict TAR extraction and published package identity. Its reported outcome is exactly one of:
- `EXACT_RAW_MANIFEST_MATCH_NOT_PUBLISHER_ATTESTATION`
- `RAW_MANIFEST_DIFFERS_FROM_IMMUTABLE_GIT_SOURCE`
- or an explicit failed CI / absent receipt for unavailable or contradictory evidence

One successful comparison will **not** close COM-02's publisher-to-source lineage requirement. Git revision and manifest bytes neither prove npm publisher identity nor reproduce a trusted build. Full release file and build recipe comparisons, source-rights text and third-party obligations, 91 asset rights, independently authenticated SaaS production and customer Enterprise OCI receipts, counsel and clinical G2/G2b gates remain BLOCKED.

Evidence receipt is appended to the same-run GitHub Actions installed-license archive, with no publisher/commercial/clinical flags ever true. Rule 7 handover documents distinguish test implementation from current-head CI and independent Codex evidence. No clinical signing, real data or SaaS deployment is enabled.
