# NEXT_WORK

## Immediate (owner)

1. In Emergent: Save to GitHub → repository `NTinkicht/TheraBridge-Emergent` → **Create new branch** `emergent/phase-1-center-foundation`. **Never choose Force Push.**
2. On GitHub: confirm `main` is unchanged; record the branch SHA in `CURRENT_STATE.md` (Emergent agent records it once reported).
3. Check the GitHub Actions run for that SHA. Jobs `test` and `compose` replace the **NOT RUN** rows with real PASS/FAIL.
4. Optional: cold-clone drill per `docs/emergent/operations/RUN_LOCAL.md`.
5. Decide: continue in this job, or start a fresh Emergent job imported from the branch.

## Next work unit (requires separate approval): TB-EM-001 authentication and sessions

- Argon2id passwords; opaque session token in HttpOnly/Secure/SameSite=Lax cookie; PostgreSQL `Session` table; 30 min idle / 12 h absolute.
- Login lockout (5 failures / 15 min), generic errors, CSRF double-submit + Origin check.
- `User`, `AuthIdentity`, `Session`, `LoginAttempt`, `VerificationToken` (hashed tokens only).
- Dev mailbox module registered only when `NODE_ENV!=production` AND `DEV_MAILBOX_ENABLED=true` AND request from localhost; disabled on the Emergent preview; test asserts 404 when disabled.
- Remove or protect the public `/api/health/probe` write endpoint.
- Acceptance: Jest/Supertest against real PostgreSQL for happy path, lockout, expired session, logout, revoke-all.

## Risks / dependencies

- Unrelated Git history on the new branch (see `EXIT_FROM_EMERGENT.md`).
- Workspace PostgreSQL survives only as long as `/app/.workspace/pgdata`.
