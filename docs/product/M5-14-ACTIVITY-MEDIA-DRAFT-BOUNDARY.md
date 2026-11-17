# M5-14 — Activity illustration proposal registry (WU4-B)

**Status:** Engineering proposal only; NO approved/published assets. This PR adds a database-backed, tenant-scoped **metadata draft queue**, not a finished media upload or delivery system.

- Activity template and immutable template version are captured when proposing a media brief.
- Access uses existing session/CSRF and center.activities.manage permission. Service enforces centre-owned activity, therapist author scoping, centre trial/write gate, stale-version refusal and transactionally logged events.
- Accepts source type, license, source reference, provider terms (mandatory for generated), scene, style version and alt text.
- No arbitrary URL, object-storage path, image bytes, preview endpoint, clinical publication or guardian delivery.
- Only DRAFT and REJECTED states exist in schema and SQL CHECK, deliberately blocking silent approval.
- Optimistic concurrency for rejection prevents conflicting review actions. Historical rejected draft remains queryable.

**Critical remaining for #197:** provision real private object storage adapter and signed byte-ingestion protocol (type/size/virus/dimensions/hash), derivative/crop pipeline, verified rights evidence, independent human reviewer workflow, immutable approved asset/version snapshot, sensitive delivery and revocation, retention/orphan cleanup, integration and adversarial API/browser tests. Do not close #197 or publish assets on this PR alone. G2/G2b NO-GO.


## Pagination (Codex P2 remediation)
GET media-drafts accepts optional UUID cursor and integer limit (1–100, default 50). Results are ordered by immutable createdAt DESC + id DESC; nextCursor is the last returned ID when hasMore. The cursor must belong to the same center and activity, else 404. No approval or publication is enabled.
