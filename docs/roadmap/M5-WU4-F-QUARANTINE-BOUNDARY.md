# M5 WU4-F — Quarantine storage isolation foundation

**Status:** engineering-only draft. No storage connection, upload endpoint, malware scan, image decoder, approved record, rendering, or release is enabled.

**Dependency:** WU4-E PR #442, stacked branch; rebase onto main only after #442 merges and re-run exact-head CI/review.

## This work unit
- Adds an immutable internal candidate object-intent descriptor, bound to center, template, draft, template version, candidate checksum and byte count.
- Intent is restricted to a **private-quarantine** bucket class, with a fresh opaque random object key per attempt. No client-supplied filename, public URL, pre-signed upload/read link, approval or read grant is generated.
- Invalid UUID scope, version, candidate safety flags, hash and object key are refused. Adversarial Jest tests prove isolation properties.
- No API/controller invokes this descriptor and no storage adapter writes bytes. This is an isolation *contract*, not a completed storage pipeline.

## Follow-up for genuinely usable quarantine storage
1. Provision private authenticated object store with encryption, isolation policy, short-lived **write-only** admission and end-to-end audit.
2. Integrate with transactional `ActivityMediaDraft` ownership, trial, role/tenant, specialty, CSRF and immutable template version checks; prove adversarial revocation and time-of-check/time-of-use behavior.
3. Stream bounded data to quarantine; verify complete PNG file/CRC, sandboxed decode and decompression-bomb limits, malware scanner, content hash and secure derivatives.
4. Maintain separate independent rights and clinician/design approval records; build revocation/retention/orphan cleanup and no cross-center leak tests. Only then evaluate a version-pinned approved read projection.
5. Execute required >=90% line/branch/function/statement gates per API and Web, original CI, security/SBOM/provenance, synthetic browser and independent exact-head Codex review. Real manual accessibility, image safety and legal approvals still required.

G2/G2b clinical NO-GO and synthetic-only demonstration remain unchanged. M5-14 #197 and M5-12 #195 stay open.
