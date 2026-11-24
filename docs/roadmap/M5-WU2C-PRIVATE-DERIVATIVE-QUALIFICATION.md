# M5 WU2-C — Private production-master and derivative qualification

Parent: M5-14 #197; support M5-12 #195, M5-15 #198, M5-16/17 #199/#200. Predecessor: merged PR #487 on `main@e4797db`.

**Implementation status:** code and synthetic fixtures in a review PR. No real 1600×1200 originals are provided, imported, scanned, approved, published or rendered. Owner reports prior design/clinical/legal concept decisions complete; identity-verified signed receipts and source/rights records remain separately required.

## Deterministic offline, private-only transformation

`scripts/qa/m5-wu2c-private-derivatives.mjs` accepts exact one pinned `m5-b-v1` reference ID, the existing 25-item SHA-bound batch/evidence input and a 1600×1200 RGB/RGBA PNG **Buffer** in a trusted operator process. No HTTP endpoint, provider generation API, database mutation, storage mutation, public paths or remote media read is present.

The pipeline:

1. Clones the input byte buffer *before any await*, rejects invalid format/size, and verifies the frozen 25-reference plan and provider/terms/license SHA-256 evidence fields.
2. Requires one noninterlaced, 8-bit RGB/RGBA 1600×1200 PNG with no unreviewed chunks. Checks exact framing, IHDR, each CRC, contiguous IDAT, IEND, complete zlib input consumption and bounded row decompression (no hidden second zlib stream or decompression bomb).
3. Reconstructs PNG filter methods 0–4 into pixel bytes; produces a lossless center crop of x=200..1399 as a **1200×1200 safe-square**, and a **400×300 4:3 thumbnail** using 4×4 box-average pixels and premultiplied-alpha handling.
4. Encodes stripped, deterministic PNG derivatives without EXIF/ICC/text/metadata and independently decodes them again; binds master, crop, thumbnail, prompt, source-concept and provider/rights evidence hashes in an immutable JSON-safe receipt.
5. Delivers private derivative buffers solely to an explicitly trusted offline caller. The buffers are nonenumerable to avoid leaking through ordinary JSON status logging. No public URL or read capability is generated.

## Status truth, not security approval

The returned status is `PRIVATE_UNREVIEWED_DERIVATIVES`. Scanner examination of **each derivative** is `NOT_PERFORMED_ON_DERIVATIVES`. Encrypted private object-store integration, deployed ClamAV negative control, retention/deletion/legal-hold/backup tests, independent privacy/security review, asset-specific legal/clinician/designer decisions and image-delivery authorization remain **not qualified**.

Input/provider SHA-256 fields bind evidence subjects; they are not a substitute for a verified license, clinician identity or trusted Ed25519 signatures. The synthetic fixture is a generated red/green/blue test raster, **not** a real therapy illustration or clinical advice. No clinical/public/guardian release; G2/G2b remain NO-GO.

## Quality gate

- Synthetic fixture tests cover real 1600×1200 source, 1200×1200 safe-square, 400×300 card, RGB, RGBA/transparent alpha, exact output hashes, determinism, denial metadata, corrupted CRC, trailer bytes, wrong source, wrong reference/provider fields and buffer mutation after caller invocation.
- CI source tests run as a blocking step alongside WU2-B in full `demo-journey` job, while all six required jobs, Smart CI and 8 × >=90% API/Web measurement remain unchanged.
- PR must have exact-head green CI, reviewer dispositions and independent Codex final-head clearance before merge.
- Real production masters must be created separately; this engineering code does **not** create or approve the 25 actual illustrations.
