# NEXT_WORK

## Immediate (owner): export TB-EM-002

1. Save to GitHub on the existing branch `phase-1-center-foundation`. Never choose Force Push. If force is offered, save to `phase-1-center-foundation-tb-em-002` instead.
2. CI: `secret-scan`, `test` (167 API tests) and `compose` should be green. The Docker smoke-test mismatch is handled in PR #12 on GitHub.
   - The compose step still checks for the `tb_em_001_tenancy_roles` migration name. PR #12 or a follow-up should accept the newer `tb_em_002_center_applications`.
3. File N8–N11 from `docs/emergent/qa/OPEN_ISSUES.md` on GitHub.

## Next work unit: TB-EM-003 center provisioning (blueprint Phase 1)

- Approved applications (`provisioning.status = AWAITING_PROVISIONING`) become centers:
  - unique slug, time zone and plan;
  - created in one transaction with an application event `provisioned` and an audit event.
- Direct provisioning by platform operators without an application.
- Requires new permissions `platform.centers.create` and `platform.centers.read` in `policy.ts`, `PERMISSIONS_MATRIX.md` and the matrix test.
- Replace the disabled "Provision center" button on `/app/applications/[id]`.
- The first administrator invitation stays in TB-EM-004.

## Operational notes

- After a workspace restore, run `scripts/workspace/ensure-postgres.sh`, then `cd apps/api && yarn -s prisma migrate deploy && yarn -s seed:synthetic`.
- To clean up test applications, temporarily disable the `application_event_no_update` trigger inside a transaction. This is for synthetic preview data only.
- The real owner account must never be created in Emergent.
