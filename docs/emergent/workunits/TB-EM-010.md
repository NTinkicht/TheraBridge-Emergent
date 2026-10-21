# TB-EM-010 — Family Home Practice and Outcomes (synthetic demonstration)

Status: IMPLEMENTED (2026-10-21). Synthetic data only. Not for clinical use. TB-EM-009 accepted (CI 374/374; findings are GitHub #41–#44).

## Specification

| # | Requirement | Implementation |
|---|---|---|
| 1 | Family daily and weekly activity view | `/app/practice` (GUARDIAN, `family.practice.read`). Tabs: Today, This week (with previous-week navigation; next is disabled on the current week) and History. Child tabs appear when more than one child is linked. Each card has steps, materials, minutes, frequency and safety guidance in an expandable section. Every card is labelled "Sample activity", with a banner saying it is not a released plan |
| 1 | Completed / pending / skipped | Each planned day shows the recorded choice, "Not recorded yet" (past, no answer) or "Coming up" (future) |
| 1 | Sample schedule | Platform library templates matching the child's services (up to 4). A fixed synthetic schedule alternates between every day and Mon/Wed/Fri. Days use the center's time zone. The therapist's draft home plan is never read by any family route |
| 2 | Fixed choices | `COMPLETED`, `NEEDED_HELP`, `NOT_COMPLETED`, `SKIPPED` (DTO `IsIn` plus a DB CHECK). Any extra field is rejected with 400, so free text, photos, video and consent-dependent fields are impossible |
| 2 | Confirmation | The dialog goes choose → confirm ("You can't change it after saving") → save |
| 2 | Idempotency | The client creates one UUID `idempotencyKey` per dialog and reuses it for every retry. Same key and same payload → 200 `replayed:true`. Same key with a different payload → 409. A new key for an already-recorded slot → 409 (unique `guardian_link_id, template_id, practice_date`) |
| 2 | Result states | Success is shown only after a server response (with the server time). Failure appears on a 4xx with the server message. Unknown appears on a network error or 5xx, with "Check if it was saved" (`GET family/practice/outcomes/:key`); a resend uses the same key. Nothing is stored offline, and the UI says so |
| 2 | Recording window | Only planned days, only up to today, and only within the last 7 days |
| 2 | History | `GET family/practice/history`. Each guardian sees only their own recordings, with dates, choices and "Seen by care team" |
| 3 | Practice feedback inbox | `/app/practice-feedback` (`center.practice.read`). Therapists see only children and services they are actively assigned to; supervisors see the whole center read-only. Filters: child, activity, answer, status (new or acknowledged) and from/to dates (from after to shows an error and sends no request). Rows read "Family chose: X" with no interpretation |
| 3 | Acknowledge | `POST clinical/practice-feedback/:id/acknowledge` (`center.practice.acknowledge`, assigned THERAPIST only). It is idempotent (`already:true`) and records who acknowledged it |
| 3 | Separation | `practice_outcome` is its own table, with no link to observations, goals, plans or reports. Dashboards and reports never read it |
| 5 | Guardian authorization | Every family query uses active links only (`removed_at IS NULL`), so removing a link cuts read and record access immediately. Outcomes stay visible to the care team, marked "guardian access since removed" |
| 5 | Feature gates | `FAMILY_PRACTICE_DEMO=true` is required to record, and it is always off in production and staging. Responses expose `gates` (practiceDemo, clinicalPlanRelease:false, freeText:false, media:false, consentDependent:false). The trial read-only state blocks new outcomes |
| 5 | Synthetic-only records | `synthetic` column with a DB CHECK (`synthetic = true`) |
| 6 | Audit | `family.practice_recorded` and `clinical.practice_acknowledged` |

## End-to-end workflow coverage
1. Therapist builds a draft home plan and uses "Preview as family" (TB-EM-008). The plan stays a draft and is not released.
2. Family explores the labelled sample activities at `/app/practice`.
3. Family records a fixed-choice outcome through the confirmation step.
4. Therapist sees it under Practice feedback, separate from clinical records, and acknowledges it.
5. The family's history then shows "Seen by care team".

## Test traceability
| Requirement | Automated test |
|---|---|
| Week view, statuses, 7-day window | `practice.e2e-spec.ts` (week and previous-week slots) |
| Idempotent replay, key mismatch, duplicate slot | `practice.e2e-spec.ts` (201 / 200 replayed / 409 / 409) |
| Fixed choices, no free text | `practice.e2e-spec.ts` (`GREAT` → 400, `note` → 400) |
| Future, too-old and unplanned days | `practice.e2e-spec.ts` (422 ×3) |
| Recipient-specific history | `practice.e2e-spec.ts` (second guardian cannot see or look up by key) |
| Therapist scope, filters, supervisor read-only, acknowledge | `practice.e2e-spec.ts` |
| Separation from observations | `practice.e2e-spec.ts` (`observation.count() == 0`) |
| Immediate revocation | `practice.e2e-spec.ts` (link removed → empty list, 404 on lookup and record) |
| Gate off | `practice.e2e-spec.ts` (403) |
| DB synthetic constraint, audit events | `practice.e2e-spec.ts` |
| Permission matrix and route inventory | `authz.e2e-spec.ts` |
| UI flows (desktop and 390 px) | Testing agent iteration 16 |

## Migration
`20261027090000_tb_em_010_practice_outcomes`

## Results
- The full API suite passes 399/399 (after updating the health migration-name pattern to `_tb_em_0\d\d_`).
- Testing agent iteration 16: 100% of the requested flows pass. Its 3 LOW findings were then fixed:
  - The inbox no longer sends a request when the dates are invalid.
  - An acknowledge error is now shown.
  - "This week" now resets to the current week.
- The child's name ("For Alex") was also added to the page.

## Open (non-blocking)
- N30: the guardian top navigation scrolls sideways at 390 px, and the active "Practice" tab can be cut off.
- N31: the date filters use the native date picker.
