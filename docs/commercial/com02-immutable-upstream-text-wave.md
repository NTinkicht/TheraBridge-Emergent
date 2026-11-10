# COM-02 — authoritative exact-version LICENSE/NOTICE text verification

Status: **IMMUTABLE-TEXT VERIFIER IMPLEMENTED; CI/REVIEW PENDING — NOT LEGALLY APPROVED**.

Predecessor: [merged PR #352](https://github.com/NTinkicht/TheraBridge-Emergent/pull/352), merge `c96b1838856188a67e7f1491277de065f00e6312`. Tracking: [#354](https://github.com/NTinkicht/TheraBridge-Emergent/issues/354), parent #351 and #349.

## Verified starting point

The registry metadata candidate collector covers **53/53** exact unresolved npm package versions, with **0 authoritative exact-version upstream license texts**, **0 inferred commercial legal approvals** and **91 separately unresolved tracked assets**. Its registry fields are candidates, not legal evidence of license rights.

## Frozen safety obligations

- Require independently verified exact package-to-upstream source revision mapping; do not infer `vX.Y.Z` from an npm version or use mutable branch tips.
- Retrieve exact LICENSE/NOTICE/COPYRIGHT text at an immutable, verified revision through strict network, byte and encoding limits; hash actual bytes. Do not publish unscreened legal text in public source.
- Treat unavailable or ambiguous proof as unresolved, never approved. Keep the one semantic-PAX publisher exception fail-closed.
- Build counsel-facing SaaS/network and enterprise/customer-managed distribution review, with production artifact-derived package scope, native/OS/asset/image rights tracked separately.
- Update all four Rule 7 handover files. Test real negative security and legal-approval paths. Exact-head green CI and Codex required.
- Preserve public GitHub access, unsigned proprietary licensing, no final third-party notices, and clinical G2/G2b NO-GO.

This checkpoint itself grants no rights.

## Implemented source-text evidence gate

`scripts/commercial/verify-immutable-license-texts.mjs` handles explicit package/version → GitHub owner/repository/full 40-byte commit SHA/path mappings, never inferred from npm tags or moving repository branches. It only fetches immutable `raw.githubusercontent.com` source paths, rejects redirects, invalid paths and non-UTF-8 or oversized documents, and records actual SHA-256 bytes. It records the evidence state as `IMMUTABLE_SOURCE_BYTES_HASHED_CORRESPONDENCE_UNVERIFIED`, **not** independently verified source-to-package lineage, licensing consent or approved redistribution.

The initial `docs/commercial/immutable-upstream-source-mappings.json` has **zero mappings**: no authoritative correspondence has yet been individually confirmed, so all 53 rows remain explicitly unmapped. The verifier is wired after the registry candidate collector in CI and retains per-commit JSON evidence. Any mapping added later must be independently corroborated with exact package/version source publication and reviewed by counsel; immutable source bytes alone are not permission.

No raw third-party license texts are committed to this public repository. No final notices or legal grant.
