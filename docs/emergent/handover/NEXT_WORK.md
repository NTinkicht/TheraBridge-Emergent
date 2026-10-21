# NEXT_WORK

## Immediate (owner): export TB-EM-001 (checkpoints A, B and C)

1. Save to GitHub → `NTinkicht/TheraBridge-Emergent` → the **existing** branch `phase-1-center-foundation`. This is a fast-forward from the accepted checkpoint 0 history.
   - Never choose Force Push.
   - If force is offered, save to `phase-1-center-foundation-tb-em-001` instead.
2. CI must show `secret-scan`, `test` and `compose` all green.
   - `test` runs 133 API tests against PostgreSQL 16.
   - `compose` boots the stack with `.env.example` values and checks that the latest migration is `tb_em_001_tenancy_roles`.
3. File the non-blocking issues from `docs/emergent/qa/OPEN_ISSUES.md` (N1–N7) on GitHub.

## Next work unit: TB-EM-002 center applications (scope per blueprint; confirm authorization before starting)

- Must build on the session, CSRF and `@RequirePermission` patterns. Every new route must declare its access, or boot fails.
- Add new permissions to `apps/api/src/auth/policy.ts` and `docs/emergent/security/PERMISSIONS_MATRIX.md` together; a test enforces that they match.
- Public application submission needs `@Public({ preAuth: true })` plus its own rate limit through `RateLimitStore`.

## Operational notes

- After a workspace restore, run `scripts/workspace/ensure-postgres.sh`, then `cd apps/api && yarn -s prisma migrate deploy && yarn -s seed:synthetic`.
- Preview `apps/api/.env` holds `DEPLOYMENT_ENV=preview`, `COOKIE_SECURE=true` and a workspace-only `AUTH_SECRET`. It is gitignored and never exported.
- The real owner account must never be created in Emergent.
