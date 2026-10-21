# NEXT_WORK

## Immediate (owner): export TB-EM-010 Family Home Practice and Outcomes

1. Save to GitHub on `phase-1-center-foundation`. Never Force Push. CI should show 399 API tests. New migration: `20261027090000_tb_em_010_practice_outcomes`. New env flag: `FAMILY_PRACTICE_DEMO` (local/CI only).
2. File N30–N31 from `workunits/TB-EM-010.md`.

## Previous: export TB-EM-009 Progress Tracking and Report Drafting (accepted)

1. Save to GitHub on `phase-1-center-foundation`. Never Force Push. CI should show 374 API tests. New migration: `20261026090000_tb_em_009_progress_reports`.
2. File N28–N29 from `workunits/TB-EM-009.md`.

## Previous: export TB-EM-008 Clinical Workspace foundations (accepted)

1. Save to GitHub on `phase-1-center-foundation`. Never Force Push. CI should show 367 API tests. New migration: `20261025090000_tb_em_008_clinical_workspace`.
2. File N25–N27 from `workunits/TB-EM-008.md`.

## Previous: export TB-EM-007 Parent Experience Round 2 + Scheduling (accepted)

1. Save to GitHub on `phase-1-center-foundation`. Never Force Push.
2. CI: `secret-scan` and `test` (329 API tests) should be green. Newest migrations: `20261024090000_tb_em_007_parent_messaging_scheduling`, `20261024091000_tb_em_007_thread_child_fk`.
3. File N20–N24 from `docs/emergent/qa/OPEN_ISSUES.md`. N17/N18 are resolved by TB-EM-007.
4. Confirm the two policy decisions in `workunits/TB-EM-007.md` (household threads, messaging after trial expiry).

## Previous: export TB-EM-005 + Center Operations (accepted, CI 301/301)

1. Save to GitHub on `phase-1-center-foundation`. Never choose Force Push. If force is offered, save to `phase-1-center-foundation-center-ops` instead.
2. CI: `secret-scan` and `test` (301 API tests) should be green. The `compose` smoke check is handled in PR #12. The newest migration is `20261023090000_tb_em_005_006_trials_center_operations`.
3. File N17–N19 from `docs/emergent/qa/OPEN_ISSUES.md`. Close #24 when the trial behaviour is accepted.

## Next candidates (not authorized)

- Clinical milestone: therapy plans and approvals, session notes, progress reports. It needs an owner-approved clinical policy first; clinical capabilities stay DENY.
- Approved email provider behind `DevMailboxService.send` so reminders reach real inboxes (needs owner approval).
- In-app notifications and unread badges in the nav.

## Operational notes

- Invitation links in the preview are written only to `apps/api/.outbox/*.json` (gitignored, mode 0600).
- Harbor and Cedar are trial centers (30 days from their creation). Only one active child is allowed per center during the trial.
- After a workspace restore: run `scripts/workspace/ensure-postgres.sh`, then `cd apps/api && yarn -s prisma migrate deploy && yarn -s seed:synthetic`.
- `center_event`, `application_event` and `message` are append-only. To clean up synthetic test data, disable their triggers inside one transaction (preview only).
