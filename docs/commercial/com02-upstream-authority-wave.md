# COM-02 — upstream authority and distribution evidence wave

Status: **REGISTRY METADATA CANDIDATE COLLECTOR IMPLEMENTED; qualification pending / NOT LEGALLY APPROVED**.

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

## Implemented evidence wave

`scripts/commercial/collect-upstream-license-candidates.mjs` queries the npm registry for each exact name/version in the already verified exception register, using a hard allowlist (`registry.npmjs.org`, HTTPS 443), strict exact-version names and paths, bounded concurrency and response size, no redirects or executable metadata. The registry version identity must match the requested exact package/version; the raw response SHA-256 is recorded. Network failures and invalid evidence are individual per-version unresolved statuses, not missing records.

The output `therabridge-com02-upstream-authority-candidates-v1` is archived per-commit from full CI. It records manifest license expression and repository URL **solely as candidates**, plus version identity, manifest byte SHA-256, registry `dist.integrity` and match to the frozen Yarn SRI where available. No repository LICENSE/NOTICE text is claimed verified, no upstream git tag or source commit is assumed, no legal clearance is created, and no final third-party notices are issued.

This phase does **not** yet fulfill the authoritative upstream text collection or rights-holder review for 53 exceptions. That remains required before eventual SaaS or enterprise rights approval. Deployed/build/dev package distribution scope similarly remains `NOT_CLASSIFIED` until objectively checked against the actual release artifact.
