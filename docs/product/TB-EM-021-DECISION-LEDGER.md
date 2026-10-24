# TB-EM-021 — Persistent source-traced clinician decisions (backend foundation)

## Purpose
Create a durable, append-only decision ledger for deterministic draft report suggestions. This is **not** AI output, clinical attestation, approval, signing, consent or release. All data and tests are fictional/synthetic.

## Implementation
- Migration `20261102090000_tb_em_021_report_suggestion_ledger` creates a separate table with an immutable database trigger (UPDATE and DELETE always denied), uniqueness by (reportId, idempotencyKey) and a scope constraint trigger matching report centre/child/specialty/report-author membership.
- `GET /api/centers/:centerId/clinical/reports/:id/suggestion-decisions` returns clinician-authorized proposal source IDs and evidence fingerprint, an internal audit history (last 100 events) and per-section CURRENT/REQUIRES_REVIEW status.
- `POST /api/centers/:centerId/clinical/reports/:id/suggestion-decisions` records `APPLIED`, `OMITTED`, or `RECONSIDERED` for `assessment`, `goals` or `sessions`. Request includes exact expected report version, UUID idempotency key, current server-sourced proposal fingerprint and, for APPLIED, bounded reviewed claim text with an explicit array of source references per claim.
- A deterministic server-side `DETERMINISTIC_V1` source manifest binds assessment IDs, plan-version IDs + goal keys and observation IDs with values/units, or period-bound session aggregates. Each source has a SHA-256 content fingerprint. The client may only cite source keys that the server actually returns for the authorized report and specialty.
- Text resides only in the regular draft's `ProgressReport.sections` (optimistic bump); the immutable ledger stores a hash per reviewed claim, explicit claim→source keys, source digests, actor, timestamp, section hash, outcome and report version, labelled `NON_CLINICAL_DRAFT`. It does not duplicate authored report passages or attach clinical conclusions.
- Append applied text and a stable human-readable reference block to the same report section **within the same database transaction** as the decision and audit event. Omit/reconsider save a history event without inserting text, while incrementing the draft version. Pre-existing draft reference blocks are recognized and cannot be duplicated.
- Deny stale report version, changed evidence fingerprint, unsupported source IDs, invalid claim text, cross-tenant IDs, other-therapist drafts, revoked specialty, role revocation, trial expiry and noneditable reports. Idempotent replay returns prior result only after full live permission/trial revalidation and only for exactly equal payloads.
- Reading history recomputes current source and report-section hashes; changes result in `REQUIRES_REVIEW`, never automatic rewriting, relinking, release, or clinical interpretation.
- Author workflow uses existing `ClinicalService.write` tenant and child locks. No additional privileges granted to clinical supervisors; they may inspect scoped internal review history, not write decisions or access guardian messages.

## Boundaries
The first PR is **backend and database qualification only**. The current report-editor component still uses UI-local suggestion buttons and **does not yet call these ledger endpoints**. Do not claim end-to-end durable clinician decisions are available until the subsequent dependent UI PR is implemented, reviewed and browser-tested.

For session-count suggestions, the trace references period-bound aggregate counts, not individual visit/note IDs. For future claim-level session provenance, extend the evidence manifest to include concrete scoped visit/note IDs without exposing other specialties.

## Qualification
- Test fresh 17-migration PostgreSQL and upgrade from the pre-existing 16-migration schema; migration is additive, never edit earlier files.
- Real PostgreSQL API tests: apply/omit/reconsider persistence, exact source IDs, wrong role/tenant/specialty, stale-version/fingerprint, idempotent replay/mismatch, source/text staleness, revoked specialty and report snapshot immutability.
- Verify database UPDATE/DELETE immutable triggers and fail-closed route inventory.
- All six exact-HEAD GitHub CI jobs must pass and an external independent review must inspect the exact final SHA. No merge/deploy without owner authorization.
- No real patient data, external AI, real STT, messaging, safeguarding escalation or clinical sign/approve/consent/release capability.
