# M5 WU4-D — implementation checkpoint (19 November 2026)

**Status: PARTIAL IMPLEMENTATION; NOT ACCEPTED; NOT RELEASED.**

Predecessor planning-only #437 merged at `6e4b83a`; the actual code is isolated in a new PR. This increment adds staff-only 4:3 unavailable-image slots and an accessible grid/list view switch, while preserving server-scoped activity discovery, pagination, specialty text, safety steps, and staff-only proposal management. Guardian activities retain their existing presentation; no proposed/unknown asset URLs enter either UI.

The existing activity media registry stores **proposal metadata only**, with no independently accepted binary storage, license verification, clinical approval, immutable image approval, or safe publication projection. Consequently all staff catalogue images must render the explicit non-image placeholder; this is *not* the M5-12 done criterion of accepted illustrations on every active published activity.

**Verification to complete:** exact-head TypeScript/build, source contracts, API/browser/real mounted tests, five viewport widths (320/390/768/1024/1440), keyboard/screen-reader/RTL, low bandwidth, independent review, and all required push and PR workflows. The added Node source-boundary test is useful but not a substitute for mounted interaction or browser qualification. Track skipped/unrun tests honestly.

**Next ordered work:** implement a trusted approved-media/read-model only after real private byte ingestion, malware/type/dimension verification, immutable rights+review approval and explicit owner/clinical release decisions exist. Until then do not fabricate an approval state or publish imagery. M5-12 #195 stays OPEN. G2/G2b stay NO-GO.
