# M5 WU4-E — candidate media intake preflight checkpoint

**Status: PARTIAL IMPLEMENTATION; NO UPLOAD, STORAGE, APPROVAL OR PUBLICATION.**

**Base:** merged PR #441 on main. **Parent:** M5-14 #197; prerequisite to M5-12 #195 and M5-15 #198.

## Implemented
- A pure, bounded, server-side candidate-header preflight with explicit rejection of non-Buffer, truncated, oversized, non-PNG, malformed IHDR, unsupported format parameters, extreme dimensions and pixel count.
- A SHA-256 fingerprint used **only** to identify candidate bytes, not to attest their safety or rights.
- Immutable result with `approved=false`, `publishEnabled=false` and `safeForStorage=false`. No URL, image bytes, public data projection, storage key, download route or approval method is returned.
- API Jest rejection and positive-metadata checks using fictional synthetic input. Preflight is intentionally **not called by a controller**.

## Unmet engineering prerequisites (mandatory before upload)
1. Provision center-private quarantined object storage with write-only intake, authenticated tenant/version/ownership binding and encryption; no public object URLs.
2. Full-file structural decoder + checksum and IDAT/CRC verification in sandbox, AV/malware scanning, decompression bomb controls, content-type and declared extension mismatch rejection; enforce pixel memory and CPU bounds.
3. Safe derivative/crop generation and exact master/derivative versioned integrity; secure redacted telemetry and orphan deletion.
4. Rights/license and source-provider evidence verification, independent human image/clinical design review, immutable approved-state migration + audit, revoke/retention and cache invalidation; never infer approval from upload alone.
5. API integration + adversarial tenant/role/CSRF/version/quota tests, five-width accessible UI/Playwright, low-bandwidth evidence, full required exact-HEAD CI and Codex review.

## Non-negotiable
This preflight only inspects **header-level plausibility**; it does not verify PNG CRC, full-file structure, image safety, copyright, consent or suitability. A successful return must never authorize upload acceptance or rendering. Clinical G2/G2b, real media and clinical release remain NO-GO. Keep #197 open and record all human acceptance as NOT OBTAINED.
