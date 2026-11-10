# COM-02 — authoritative exact-version LICENSE/NOTICE text verification

Status: **DRAFT CHECKPOINT; NOT IMPLEMENTED, NOT TESTED, NOT LEGALLY APPROVED**.

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
