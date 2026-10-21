# TB-EM-007 — Parent Experience, Round 2 + Scheduling Enhancements

Status: IMPLEMENTED (2026-10-21). Synthetic data only. Not for clinical use.
Owner direction: continue after the TB-EM-005/006 acceptance (CI 301/301). Non-blocking issues from earlier reviews are GitHub #25–#29. The Docker smoke fix stays in PR #12.

## Scope delivered

| Area | What works |
|---|---|
| Recurring appointments | `appointment_series` (weekly or every 2 weeks, chosen ISO weekdays, a count of up to 60 or an end date up to 26 weeks ahead). Visits are stored as `appointment` rows with `series_id` and `occurrence_date`. On a clash the API returns 409 with `conflicts[]`, and `skipConflicts` books the rest |
| Exceptions | Moving or cancelling one visit sets `is_exception`. "This and following" (`PATCH series/:id`) changes the time, length, therapist or room of untouched future visits and keeps their dates. It is all-or-nothing on clashes, with optimistic `version`. "Cancel this and following" requires a reason and ends the series when nothing is left |
| Time zones | `apps/api/src/common/zoned.ts` and `apps/web/src/lib/operations.ts` share the same rules. Local wall time is kept across daylight-saving changes. Repeated local times resolve to the later instant; times skipped by the clocks move forward by the gap. Unit-tested for Europe/Berlin and America/New_York |
| Booking choices | The book dialog lists only services with an active assignment for the child, and only the therapists assigned for that service (lead preselected). Assigning a therapist now requires their profile to list the specialty and the child to need the service (API 422 + UI filter) |
| Calendar | Responsive day/week time grid in the center's zone with therapist and child filters, a now line, a status legend and lanes for overlapping visits. Clicking an empty slot books at that time. On mobile the week view becomes an agenda and the day view is a grid. Appointment panel with every action |
| Reminders | `NoticesService.runDue()` sends a 24-hour reminder to connected guardians who keep emails on. One per appointment, guardian and start time, enforced by a partial unique index. It runs every `REMINDER_SWEEP_SECONDS` (preview: 300) or via `POST /api/platform/reminders/run` (platform admin). Moves and cancellations within 14 days send change notices. Delivery is **restricted synthetic outbox only** (`DevMailboxService`); no external email |
| Family view | Upcoming visits with clear status (Booked / Cancelled), "Time changed" and "Repeating visit" tags. Attendance history (120 days) with attended / missed / cancelled counts. A per-child appointment-email switch that changes only the guardian's own link. Staff reasons are never shown to families |
| Messages | Operational, non-clinical threads per child (categories scheduling / attendance / logistics / other) with a visible non-clinical notice. Guardians: threads about children currently linked to their own account. Therapists: assigned children. Admins and coordinators: the whole center, and they can close or reopen. Clinical supervisors have no access. Unread tracking per user. `message` is append-only (DB trigger). History events never contain message text |

## Permissions added
`family.preferences.update` (GUARDIAN), `center.messages.use` (CENTER_ADMIN, COORDINATOR, THERAPIST, GUARDIAN), `center.messages.manage` (CENTER_ADMIN, COORDINATOR), `platform.reminders.run` (PLATFORM_ADMIN). Clinical capabilities stay DENY.

## Policy decisions to confirm (owner)
- A thread is shared with **all current guardians** of the child (household thread). Restrictions between separated guardians need an owner-approved custody policy.
- After a trial expires, families cannot send messages (all writes are paused), but reminders are still sent.

## Migrations
`20261024090000_tb_em_007_parent_messaging_scheduling`, `20261024091000_tb_em_007_thread_child_fk`.

## Tests
`apps/api/test/parent-scheduling.e2e-spec.ts` (4 tests: DST and expansion; series, conflicts, exceptions and following; reminders, opt-out and family history; messages scope, revocation and isolation). Full API suite 329/329. Testing agent iteration 13 (frontend): ~93%, 1 HIGH fixed (structured error details), then follow-up fixes.
