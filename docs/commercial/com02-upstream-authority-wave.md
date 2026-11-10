# COM-02 — upstream authority and distribution evidence wave

Status: **DRAFT CHECKPOINT; IMPLEMENTATION NOT STARTED / NOT TESTED / NOT LEGALLY APPROVED**.

Predecessor [PR #350](https://github.com/NTinkicht/TheraBridge-Emergent/pull/350) merged as `5550979d194401c665d929c68c0224a3eee0b5c6`. Tracks [#351](https://github.com/NTinkicht/TheraBridge-Emergent/issues/351) and parent #349.

## Exact installed scope

The #350 qualified CI produced **53 unresolved package-version rows** (52 without a recognized publisher-root license file and 1 unsupported PAX archive) from 42 direct and 621 non-direct examined. There are **91 tracked non-package assets** and **zero legally approved entries**.

## Required qualification

- Obtain version-locked upstream authority evidence with independently verified URL, exact file bytes/digest, copyright and NOTICE conditions. A license field, upstream branch HEAD or local installed LICENSE file is not sufficient for a verified license grant.
- Clearly separate publisher-tarball provenance, source repository attribution and actual license obligations. Fail closed on missing, ambiguous, moving or unauthenticated evidence.
- Distinguish SaaS/network use from enterprise/customer-managed redistributable images and data/model/branding rights; runtime-vs-development classification requires artifact-derived proof.
- Preserve one unresolved PAX semantics archive until an alternate verifiable source is available; never weaken parser safety.
- Keep CI evidence as a review artifact and do not issue final customer notices or automatic legal approvals.
- Update the four Rule 7 handover files with actual tests before promotion. G2/G2b clinical release remains NO-GO.
