# TB-EM-026 — Supervisor report review queue (synthetic-only)

Issue: #42 (N29). Added a supervisor-only report inbox in the existing Progress page, without introducing approval/signing/release permissions.

API: `GET /api/centers/:centerId/clinical/reports/review-queue` requires `center.clinical.review`, and service enforces `CLINICAL_SUPERVISOR`. The service selects **only metadata** of `IN_REVIEW` reports whose child is ACTIVE and belongs to the specified center. No sections, evidence, family data or messages are returned. Results are ordered by updated timestamp, capped at 100 with an accurate total.

UI: Supervisors see a labelled, searchable read-only queue on Progress with child and service filters, retry, loading and empty states. The table links only to the pre-existing guarded report detail screen. Chart date controls do not filter reports; this is disclosed. Therapists and other roles never render the queue, and API authorization is independent of UI hiding.

Tests: PostgreSQL now explicitly asserts zero queue items while the report is DRAFT (the previously missing DeepSeek F1/P2 assertion); verifies IN_REVIEW inclusion and RETURNED exclusion, coordinator/guardian/therapist/admin 403, platform and foreign-centre 404, plus archive/restore visibility. The existing seven-role Chromium journey checks populated queue rows, search and direct-link semantics, accessible link naming and chart-range independence. No new migration.

NO-GO unchanged: external AI, audio/STT, clinical signing, approval, release, consent grant, safeguarding and messaging; no real data, demo redeployment or production/pilot.

## Independent review corrections (checkpoint)

Codex P1: Updated `CURRENT_STATE`, `NEXT_WORK`, `WORK_LOG`, and `docs/qa/TEST_RESULTS` for this branch with `CODE ADDED / CI PENDING` status. Codex P2: CI-only disposable OT report is moved to `IN_REVIEW` after the therapist journeys, then the supervisor Chromium journey asserts the actual rendered row/link, nonmatching search, matching search and restoring the result, with no report mutation. The live protected synthetic demo is untouched. New exact-head tests/review must be verified; do not promote coding assertions to PASS from source alone.

## Independent DeepSeek review F1–F10 disposition (2026-10-25)

- F1 **P2 fixed**: pre-submission DRAFT exclusion now directly asserted; previous qualification wording was inaccurate.
- F2 **P3 reinforced**: coordinator added to real PostgreSQL denies; guardian was *already* in the existing test (the review incorrectly said omitted). Cross-centre supervisor URL 404 now asserted.
- F3 **P3 test added**: archive suppresses queue without changing report status; restoring makes the pending item visible again. Governance of archived pending reports remains unsigned, and no automatic action is enabled.
- F4 **P3 fixed**: report-specific link accessible names.
- F5 **P3 fixed**: NFKD case/diacritic folding consistent with activity library.
- F6 **P3 mitigated**: a visible cap warning and capped empty state, while full server-side filtered pagination remains a separate enhancement (#75).
- F7 **P3 deferred**: existing database has no child relation on ProgressReport; optimizing active-child ID materialization needs schema/API performance work in a separate reviewed PR.
- F8 **P3 corrected historically**: previous e9325c5 six-job CI success recorded in required handovers; current corrective HEAD tests require fresh execution.
- F9 **P3 accepted fixture**: CI-only direct report-state setup is limited to disposable synthetic DB. A separate PostgreSQL test covers the actual submit transition.
- F10 **P3 fixed**: queue rendered independently of chart date validity, with browser regression.

After code changes, CI and independent exact-head re-review must complete before merge. No external hosted acceptance or clinical use claimed.
