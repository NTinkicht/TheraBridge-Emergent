# Logo derivatives

Source: `assets/brand/original/TheraBridge-Logo-original.jpg` (1376x768 JPEG, kept byte-for-byte, sha256 `542f4281fd52778010a653f65ec36bec5aa5b0a77c77137774fe00eb6e4f8219`).

Method (`scripts/brand/derive-logo.py`): crop by ink bounding box (8px padding) and convert white to alpha with the exact inverse of compositing over white. Pixels within 12/255 of white (JPEG background noise) become fully transparent. No redrawing, recoloring or vectorizing.

| Asset | Crop box (x0,y0,x1,y1) | Recomposited over white vs original: max / mean abs diff (0-255) | Verdict |
|---|---|---|---|
| Full lockup (symbol + wordmark + "AI-Powered…" line) | 257,101,1050,747 | 11 / 0.30 | Accepted for light surfaces |
| Symbol only | 292,101,1050,503 | 11 / 0.26 | Accepted for light surfaces |
| Wordmark only | 257,561,1036,701 | 11 / 0.40 | Accepted for light surfaces |

The max difference of 11 equals the noise floor (removed near-white JPEG noise); mean difference is below 0.5.

Web files (`apps/web/public/brand/`): `therabridge-{lockup,symbol,wordmark}@1x.png` and `@2x.png`, `favicon.ico` (16/32/48), `favicon-32.png`, `apple-touch-icon.png` (on white).

Visual side-by-side check: `assets/brand/qa/lockup-side-by-side.png` (original | on #FFFFFF | on #F6F7F9 | on #052464).

## Rejected / limitations
- **Rejected for dark backgrounds.** The original artwork is on white; its white puzzle seams and anti-aliasing become transparent, so on #052464 the mark looks washed out. Family dark mode (later phase) needs separately supplied dark-background artwork.
- The wordmark's "g" descender is 1px above the tagline; the wordmark crop stops at that gap (no tagline pixels included).
- The supplied tagline "AI-Powered Continuous Pediatric Therapy" differs from the blueprint tagline. The full lockup is preserved as supplied; UI text keeps "Coordinated care, meaningful progress." pending owner decision. The TB-EM-000 page uses symbol + wordmark only.
