# TB-EM-026 — Supervisor report review queue (synthetic-only)

Issue: #42 (N29). Added a supervisor-only report inbox in the existing Progress page, without introducing approval/signing/release permissions.

API: `GET /api/centers/:centerId/clinical/reports/review-queue` requires `center.clinical.review`, and service enforces `CLINICAL_SUPERVISOR`. The service selects **only metadata** of `IN_REVIEW` reports whose child is ACTIVE and belongs to the specified center. No sections, evidence, family data or messages are returned. Results are ordered by updated timestamp, capped at 100 with an accurate total.

UI: Supervisors see a labelled, searchable read-only queue on Progress with child and service filters, retry, loading and empty states. The table links only to the pre-existing guarded report detail screen. Chart date controls do not filter reports; this is disclosed. Therapists and other roles never render the queue, and API authorization is independent of UI hiding.

Tests: existing PostgreSQL report workflow verifies draft is absent until submitted, queue includes the submitted report only, non-supervisor roles receive 403, and returning report clears queue; the seven-role Chromium journey covers authorized API, read-only UI and search/empty state. No new migration.

NO-GO unchanged: external AI, audio/STT, clinical signing, approval, release, consent grant, safeguarding and messaging; no real data, demo redeployment or production/pilot.
