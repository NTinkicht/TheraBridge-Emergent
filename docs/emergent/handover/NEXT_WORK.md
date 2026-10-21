# NEXT_WORK

## Immediate (owner): export TB-EM-005 + Center Operations

1. Save to GitHub on `phase-1-center-foundation`. Never choose Force Push. If force is offered, save to `phase-1-center-foundation-center-ops` instead.
2. CI: `secret-scan` and `test` (301 API tests) should be green. The `compose` smoke check is handled in PR #12. The newest migration is `20261023090000_tb_em_005_006_trials_center_operations`.
3. File N17–N19 from `docs/emergent/qa/OPEN_ISSUES.md`. Close #24 when the trial behaviour is accepted.

## Next candidates (not authorized)

- Parent experience, round 2: messages between families and the care team, appointment reminders through the outbox, and a family view of attendance history.
- Scheduling, round 2: recurring appointments, a calendar grid view, and a therapist list filtered by assignment (N17).
- Clinical milestone: therapy plans and approvals, session notes, progress reports. It needs an owner-approved clinical policy first; clinical capabilities stay DENY.

## Operational notes

- Invitation links in the preview are written only to `apps/api/.outbox/*.json` (gitignored, mode 0600).
- Harbor and Cedar are trial centers (30 days from their creation). Only one active child is allowed per center during the trial.
- After a workspace restore: run `scripts/workspace/ensure-postgres.sh`, then `cd apps/api && yarn -s prisma migrate deploy && yarn -s seed:synthetic`.
- `center_event` and `application_event` are append-only. To clean up synthetic test data, disable their triggers inside one transaction (preview only).
