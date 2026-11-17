# COM-02 #402 — Exact npm/source manifest difference classification

**Work unit implemented, final-head CI and review not yet qualified.** Based on merged PR #408.

The previous 44-version COM-02 same-run source-root receipt found nine raw manifest byte matches and one raw-byte difference: `@tokenizer/token@0.3.0`. This WU independently fetches the original npm registry archive and immutable Git source bytes to identify whether the difference is JSON whitespace/property order only, or which manifest field paths differ, without publishing third-party text.

Pinned identity and hashes:
- Git source: `Borewit/tokenizer-token@e068a455370090f44c757946b8571bb3fb1f117e`, `package.json` raw SHA-256 `17a56b5bea3a89c3fc67b4b75769414c6c4910e483cd47da1d2a2b02c3ffaa69`, Git blob SHA-1 `ad87e5bb1377de7fb461f8d4a74e099e29479d8f`.
- Original npm tarball: SHA-256 `911758ceca239c8e5372700eedfbbd514f16d3c117b5af0a648f6e720487c209`, pinned Yarn SHA-512 integrity.
- Original published npm root `package.json` SHA-256 `a677763aaed22462b4f9df2526b1038cef3a90bc6cf80be27b4e65d0f14472a9`.

The verifier reuses the strict immutable-Git-object and npm-tarball checks from #405, then compares manifest JSON semantics recursively. It records only paths, change classes, and value types; never writes raw values or package content to public CI evidence. It aborts on changed package name/version, digest drift, unsafe keys, excessive depth or size, and any trust/rights contradictions.

Possible report states: `RAW_BYTES_DIFFER_BUT_SEMANTICALLY_EQUAL` (formatting-only), `SEMANTIC_MANIFEST_FIELD_DIFFERENCES` (field-level difference), or a failed CI. The frozen original byte mismatch is expected; if it disappears unexpectedly, the run fails instead of rewriting history.

**Limits:** JSON semantic equivalence is not authenticated npm publication/build provenance. Even explainable generated metadata differences do not authenticate npm publisher, release workflow, source bundle, legal license/right to distribute, or actual SaaS and Enterprise OCI receipts. Clinical G2/G2b remain NO-GO; all 91 asset obligations and exact publisher/source and rights follow-ups remain open.

Full qualification requires same-run CI JSON receipt, six required jobs, Smart CI, SBOM, independent exact-head Codex and Rule7 records. No real recordings, clinical signing or production deployment.
