# NEXT_WORK

## TB-EM-000 verification (owner-side GitHub review, 2026-10-20)

- Export present: `phase-1-center-foundation` at `fa9f7f4cdb570f04a4c0756abdfc14e7271841a2`.
- GitHub Actions run `39448713740` checked out this exact SHA: `test` PASS (16/16) and `compose` PASS (Docker build, healthy containers and smoke checks).
- `main` remains unchanged at `b951f1c6d04ed465f1c990a997b5dbcbe51dfe0c`.
- Original export has **unrelated Git history**; the allowlist integration PR into `main` is a separate uncompleted step.
- The optional manual cold-clone/takeover demonstration (including making an external code change) is not yet executed.
- **Next work unit TB-EM-001 remains unauthorized** until explicit owner approval. Clinical/production NO-GO.

## Immediate next actions

1. Review and merge the documentation-only acceptance PR into `phase-1-center-foundation` when satisfied. Do not merge unrelated histories directly into `main`.
2. Perform the optional independent human/agent cold-clone and takeover demonstration from `docs/emergent/operations/RUN_LOCAL.md` and record evidence.
3. Stage an allowlisted integration into a **new branch from canonical `main`** with `scripts/integration/import-emergent-export.sh phase-1-center-foundation`. Inspect every staged file, especially vendor shims and existing branding, before opening a PR.
4. Request explicit owner authorization before starting TB-EM-001. Clinical pilot and production remain NO-GO.

## Remaining tasks before integration into canonical main

- Optional manual developer takeover test (edit + test + PR outside Emergent): NOT RUN.
- Source history consolidation by allowlisted integration PR: NOT RUN.
- ADR-0005 workspace proxy: accepted as Emergent-only compatibility shim; never required outside Emergent.
- CI test and Docker Compose run against exact corrected export SHA: PASS (run `39448713740`).

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
