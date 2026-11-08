# M4-06 — Safe migration/runtime database credential separation (synthetic-only)

**Status:** Implementation candidate; CI/review and live cutover are independent gates. The existing Render demo is **not** role-separated merely because this code merges. Operational owner signoff is required before a live environment-variable change.

## Why this change is needed

The synthetic preview previously ran `prisma migrate deploy`, `seed:demo` and the Nest API with the same `DATABASE_URL`. The live Neon database `therabridge_demo_m3_preview` had one table-owning login (`therabridge_demo_preview_owner`), and application users can therefore disable their own audit triggers. Earlier real PostgreSQL UPDATE/DELETE/TRUNCATE tests prove trigger behavior in that context, **not** non-owner immunity.

## Two-stage rollout

1. **Code stage:** Merge this change after six exact-head CI jobs and independent review. With `TB_DB_ROLE_SEPARATION=false` (default), the existing synthetic preview startup behavior is unchanged, and the current demo remains explicitly **NOT QUALIFIED** for least-privileged runtime access.
2. **Controlled credential cutover:** In the authorized **NTinkicht** Render workspace and exactly the verified Neon project/branch/database, provision a **read_write**, `public`-schema, *non-admin* application login on the **same** `therabridge_demo_m3_preview` database. Keep the table owner as the privileged migration/seed identity. Use Neon least-privilege role provisioning (NOT its default admin access). Secret values must be held only by the approved Neon/Render secret managers; never commit or copy them into QA logs or PR comments.
3. Set `MIGRATION_DATABASE_URL` to the **owner** connection URL and `DATABASE_URL` to the distinct **application read_write** role URL, confirming same normalized host/port, database and schema. Use an independent operator-verified Render deploy SHA and controlled staged Render environment update. Finally enable `TB_DB_ROLE_SEPARATION=true`. Do not switch the runtime URL earlier: legacy startup would attempt migrations as a non-owner and fail.
4. Startup validates the two URLs without echoing them, applies Prisma migrations and synthetic seed using **migration** credentials, then uses **runtime** `DATABASE_URL` for a read-only catalog privilege preflight. A failed preflight prevents API startup. The runtime role must not own or inherit ownership of application tables, be superuser/CREATEDB/CREATEROLE, create schema objects, or TRUNCATE the audit table, and must retain audit INSERT permission.
5. After deployment, execute protected ten-account role tests on the independently attested live SHA, plus transactional insert, denied audit UPDATE/DELETE/TRUNCATE, session lifecycle, pooled Neon connection behavior and new/old migration replay on **disposable synthetic** fixtures. Record exact run, SHA, active database and role type, not password/URI. Existing G2/G2b, D-NEW-5, consent/release/AI gates remain NO-GO.

## Failure/recovery boundaries

If the credential preflight, migrations, seed, or health checks fail, do not bypass security checks or weaken PostgreSQL triggers. Restore the last verified Render configuration and exact deployed commit through the authorized operations mechanism, with a log of the failed attempt and evidence. This does **not** imply clinical/patient readiness. Test any rollback rehearsal in a disposable synthetic branch before relying on it.

## Code/QA scope

- `scripts/preview/db-role-config.mjs` checks opt-in, URL parsing, distinct logins, same underlying branch endpoint/database/schema and omits secrets from errors.
- `scripts/preview/verify-runtime-db-role.mjs` checks the actual PostgreSQL role and audit-table privileges, read-only.
- `scripts/preview/start.sh` uses privileged `MIGRATION_DATABASE_URL` only for migration and synthetic seed, never the Nest process. Old mode remains unchanged until opt-in.
- `Dockerfile.preview` includes the runtime scripts, `render.yaml` declares the operator-held secret and default off flag, CI includes contract/negative tests.

**Exit gate:** no M4-06 closure from code alone. Require the actual Render runtime login proven to be non-owner, Neon direct/pooled replay, migration/rollback correctness, load/concurrency evidence, final six-job CI and owner operational acceptance.
