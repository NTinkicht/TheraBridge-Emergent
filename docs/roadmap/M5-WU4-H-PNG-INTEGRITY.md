# M5 WU4-H — Full-file PNG framing, CRC and bounded inflate validation

**Status: pure candidate-verifier slice only; does not attach to upload.**

## Delivered
- Rejects incomplete/malformed/CRC-invalid chunk framing, chunk ordering, missing IDAT/IEND, trailing data and all ancillary/unrecognized chunks including text metadata and animated PNG.
- Accepts only the constrained preflight 8-bit RGB/RGBA non-interlaced subset.
- Inflates IDAT under strict maximum output cap computed from trusted dimensions, verifies exact scanline count and filter byte range 0..4.
- Returns immutable bounded metadata and **approved=false**, **safeForStorage=false**, **publishEnabled=false**; no PNG bytes or output URL.
- Synthetic Jest cases for valid candidate and malicious CRC, chunks, decompression, filters and missing data.

## Not done
- A sandboxed independent pixel decoder and content safety scan are still required; zlib scanline verification alone is NOT a safe image decoder. No malware/virus scan, derivative production, human rights review or license evidence exists.
- No endpoint, storage link, approval transition, guardian projection or production activation. Clinical G2/G2b NO-GO.
- Full exact-head CI, independent review and genuine >=90% API/Web lines/branches/functions/statements required; visual, legal and clinical approvals NOT OBTAINED.

**Issue:** #197 remains open. Independent of WU4-G local quarantine adapter; neither PR grants publication.
