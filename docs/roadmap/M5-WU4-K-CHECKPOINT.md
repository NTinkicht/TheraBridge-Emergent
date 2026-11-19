# M5 WU4-K — immutable custody state contract

## Current bounded implementation
Versioned QUARANTINED→REJECTED/REVOKED→PURGE_PENDING→PURGED transitions with expected-revision compare, legal-hold purge denial, immutable fail-closed flags, and identity/digest validation; no file mutation is performed.

## Scope and tests
Synthetic Jest regression tests cover allowed behavior and denial of stale, forged and unsafe variants. This is a server-only isolated helper, **not** a public endpoint, real-media admission, scanner certification, legal approval, clinical release or image publication.

## Remaining
actual transactional storage state, audit provenance, retention policy, legal-hold ownership, orphan removal, durable deletion evidence and authenticated access.

## Qualification
Exact-head full CI, Smart CI, eight API/Web >=90% genuine coverage metrics, independent Codex final-head review, reviewer findings and human image/legal/clinical verification PENDING at PR opening; NOT RUN is not PASS. M5-14 #197 remains open. G2/G2b NO-GO.
