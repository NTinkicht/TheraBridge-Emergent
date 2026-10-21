# TB-EM-009 — Progress Tracking, Clinical Report Drafting and Family Progress Demonstration

Status: IMPLEMENTED (2026-10-21). Synthetic data only. Not for clinical use. TB-EM-008 accepted (CI 367/367; issues #36–#40 recorded for GitHub-based corrections).

## Delivered

| Area | What works |
|---|---|
| Goal charts | An SVG chart for each goal shows the recorded observations in date order against the baseline and target lines. No trend line or projection is drawn. A screen-reader table lists the same values. Used on the dashboard, the workspace Progress tab, the report evidence panel and the family format |
| Progress dashboard | `/app/progress` for therapists (assigned child and service pairs only) and supervisors (whole center). Filters: child, service, goal, and a period of 30/90/180/365 days or custom dates (from after to shows an error and hides the results). Counts show goals with recorded data, not enough data (1 observation) and no data. Each goal compares the last value before the period with the latest value in it |
| Report drafts | `progress_report`, one per draft, written only by its author (a THERAPIST assigned to the service). On creation the sections are prefilled with facts only: assessment summaries copied as written, each goal's recorded values (count, first and most recent), and session draft and completed visit counts. The clinician summary, recommendations and family summary start blank. Home activity completion is never used |
| Autosave and conflicts | Saves about 1.2 s after typing stops, using optimistic `version`. A stale tab gets a 409 and a conflict panel with "Copy my text" and "Reload latest version". Leaving the page with unsaved changes asks for confirmation |
| Versions and history | `report_version` is an immutable history (a database trigger blocks UPDATE). Kinds: CREATED, SAVED, SUBMITTED. Each version stores its sections and an evidence snapshot. Any version can be compared section by section with the live draft |
| Supervisor review | Send for review requires a clinician summary. A CLINICAL_SUPERVISOR can add comments and return the report for revision; the notes are kept on the report. A report in review is read-only for the author |
| Family-safe preview | A staff-only internal preview, marked "Internal preview: not released". It shows only the family-friendly summary and the recorded values |
| Family progress demo | `/app/family-progress` for GUARDIAN (`family.progress.demo`) shows a fixed synthetic example (Juniper, a sample child), clearly labelled. No guardian route reads clinical records |
| Release records | `report_release` exists as a separate model for future release records. A database trigger refuses every INSERT, and the release route requires `clinical.report.release` (DENY) |
| Still disabled | Signing, plan approval, report release, real guardian report access, AI drafting, media and safeguarding-dependent operations |

## Migration
`20261026090000_tb_em_009_progress_reports`

## Tests
- `apps/api/test/progress-reports.e2e-spec.ts` covers the dashboard scope and statuses, the factual prefill (no invented trend words), autosave conflicts, versions, the submit rule, comments and return, release DENY, family preview content, the demo isolation and the database triggers.
- The full API suite passes 374/374.
- Testing agent iteration 15: all requested flows pass. Its 1 MEDIUM and 3 LOW findings were then fixed:
  - Compare now uses the live draft text.
  - Stale dashboard results are hidden when the period is invalid.
  - The success notice now survives the reload.
  - A duplicate test id was renamed.

## Open (non-blocking)
- N28: autosave writes one audit event per save. Consider coalescing them.
- N29: supervisors cannot open the report list from the dashboard directly; they go through the child workspace Reports tab.
