# NEXT_WORK

## Immediate (owner): re-export the TB-EM-000 corrections

1. In Emergent: Save to GitHub → `NTinkicht/TheraBridge-Emergent` → choose the **existing** branch `phase-1-center-foundation`. The local history is `b86028e` plus new commits, so this is a fast-forward and needs no force.
2. If Emergent shows a conflict or offers **Force Push**: cancel. Save to a **new** branch `phase-1-center-foundation-fix1` instead.
3. On GitHub, check that the branch tip contains `yarn.lock`, `.env.example`, `apps/api/.env.example` and `apps/web/.env.example`, and that `main` has the same SHA as before.
4. Check the Actions run for the new SHA. Both `test` and `compose` must be green. Report the SHA and run ID so they can be recorded.
5. Integrate only via `scripts/integration/import-emergent-export.sh` and a reviewed PR (`EXIT_FROM_EMERGENT.md`).

## Design baseline

Accepted by the owner on 2026-10-20. Apply the kit to every V1 screen, starting with the TB-EM-001 sign-in and shell. Do not use the old Figma layouts and do not create competing systems. r3 polish (checkpoint 0) is done locally; review it with the next export.

## Remaining blockers before TB-EM-000 can be accepted

- CI on the corrected SHA: NOT RUN.
- Docker Compose: NOT RUN anywhere yet.
- ADR-0005 (workspace proxy shim): needs owner acceptance.
- Cold-clone drill by an independent person/agent: NOT RUN.

## Next work unit (requires separate approval): TB-EM-001 authentication and sessions

Full proposal: `docs/emergent/workunits/TB-EM-001.md` (scope, acceptance criteria, migrations, tests, estimate). Owner is reviewing it. Already decided: local sign-in designed for later OIDC (ADR-0006), and an independent review stop after each checkpoint (0, A, B, C). Summary:

- Argon2id passwords; opaque session token in HttpOnly/Secure/SameSite=Lax cookie; PostgreSQL `Session` table; 30 min idle / 12 h absolute.
- Login lockout (5 failures / 15 min), generic errors, CSRF double-submit + Origin check.
- `User`, `AuthIdentity`, `Session`, `LoginAttempt`, `VerificationToken` (hashed tokens only).
- Dev mailbox module registered only when `NODE_ENV!=production` AND `DEV_MAILBOX_ENABLED=true` AND request from localhost; disabled on the Emergent preview; test asserts 404 when disabled.
- Remove the `/api/health/probe` write endpoint (or put it behind platform-admin auth) as the first TB-EM-001 change. Until then it stays behind `PROBE_WRITES_ENABLED` (default `false` in all templates).
- Acceptance: Jest/Supertest against real PostgreSQL for happy path, lockout, expired session, logout, revoke-all.

## Risks / dependencies

- Unrelated Git history on the new branch (see `EXIT_FROM_EMERGENT.md`).
- Workspace PostgreSQL survives only as long as `/app/.workspace/pgdata`.
