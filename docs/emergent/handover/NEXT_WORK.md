# NEXT_WORK

## Immediate (owner): export TB-EM-003/004

1. Save to GitHub on `phase-1-center-foundation`. Never choose Force Push. If force is offered, save to `phase-1-center-foundation-tb-em-003-004` instead.
2. CI: `secret-scan` and `test` (API suite against PostgreSQL) should be green. The `compose` smoke check still expects an older migration name; PR #12 or a follow-up should accept `20261022090000_tb_em_003_004_provisioning_onboarding`.
3. File N8–N16 from `docs/emergent/qa/OPEN_ISSUES.md` on GitHub (link them to #18 where relevant).

## Next milestone (not yet authorized): center operational workflows and the parent experience

- Children and family records inside a center, guardian invitations reusing the `invitation` model (new kind, GUARDIAN role).
- Guardian–child access links and the parent portal (warm family theme).
- Treatment records and therapy-plan approvals once the owner approves a clinical policy (clinical capabilities stay DENY until then).

## Operational notes

- Invitation links in the preview are written to `apps/api/.outbox/*.json` (gitignored, mode 0600). Read them with shell access only.
- After a workspace restore, run `scripts/workspace/ensure-postgres.sh`, then `cd apps/api && yarn -s prisma migrate deploy && yarn -s seed:synthetic`.
- `center_event` and `application_event` are append-only. To clean up synthetic test data, temporarily disable their triggers inside a transaction (synthetic preview data only).
- The real owner account must never be created in Emergent.
