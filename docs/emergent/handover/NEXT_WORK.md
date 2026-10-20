# NEXT_WORK

## TB-EM-000 verification (owner-side GitHub review, 2026-10-20)

- Export present: `phase-1-center-foundation` at `fa9f7f4cdb570f04a4c0756abdfc14e7271841a2`.
- GitHub Actions run `39448713740` checked out this exact SHA: `test` PASS (16/16) and `compose` PASS (Docker build, healthy containers and smoke checks).
- `main` remains unchanged at `b951f1c6d04ed465f1c990a997b5dbcbe51dfe0c`.
- Original export has **unrelated Git history**; the allowlist integration PR into `main` is a separate uncompleted step.
- The optional manual cold-clone/takeover demonstration (including making an external code change) is not yet executed.
- **Next work unit TB-EM-001 remains unauthorized** until explicit owner approval. Clinical/production NO-GO.

## Immediate (owner): re-export the TB-EM-000 corrections

1. In Emergent: Save to GitHub → `NTinkicht/TheraBridge-Emergent` → choose the **existing** branch `phase-1-center-foundation`. The local history is `b86028e` plus new commits, so this is a fast-forward and needs no force.
2. If Emergent shows a conflict or offers **Force Push**: cancel. Save to a **new** branch `phase-1-center-foundation-fix1` instead.
3. On GitHub, check that the branch tip contains `yarn.lock`, `.env.example`, `apps/api/.env.example` and `apps/web/.env.example`, and that `main` has the same SHA as before.
4. Check the Actions run for the new SHA. Both `test` and `compose` must be green. Report the SHA and run ID so they can be recorded.
5. Integrate only via `scripts/integration/import-emergent-export.sh` and a reviewed PR (`EXIT_FROM_EMERGENT.md`).

## Remaining blockers before TB-EM-000 can be accepted

- CI on the corrected SHA: NOT RUN.
- Docker Compose: NOT RUN anywhere yet.
- ADR-0005 (workspace proxy shim): needs owner acceptance.
- Cold-clone drill by an independent person/agent: NOT RUN.

## Next work unit (requires separate approval): TB-EM-001 authentication and sessions

- Argon2id passwords; opaque session token in HttpOnly/Secure/SameSite=Lax cookie; PostgreSQL `Session` table; 30 min idle / 12 h absolute.
- Login lockout (5 failures / 15 min), generic errors, CSRF double-submit + Origin check.
- `User`, `AuthIdentity`, `Session`, `LoginAttempt`, `VerificationToken` (hashed tokens only).
- Dev mailbox module registered only when `NODE_ENV!=production` AND `DEV_MAILBOX_ENABLED=true` AND request from localhost; disabled on the Emergent preview; test asserts 404 when disabled.
- Remove the `/api/health/probe` write endpoint (or put it behind platform-admin auth) as the first TB-EM-001 change. Until then it stays behind `PROBE_WRITES_ENABLED` (default `false` in all templates).
- Acceptance: Jest/Supertest against real PostgreSQL for happy path, lockout, expired session, logout, revoke-all.

## Risks / dependencies

- Unrelated Git history on the new branch (see `EXIT_FROM_EMERGENT.md`).
- Workspace PostgreSQL survives only as long as `/app/.workspace/pgdata`.
