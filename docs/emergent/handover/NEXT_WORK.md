# NEXT_WORK

## Immediate (owner): export TB-EM-001 checkpoint 0, then independent review

1. In Emergent, choose Save to GitHub → `NTinkicht/TheraBridge-Emergent` → the **existing** branch `phase-1-center-foundation`. Local history is `66254a1` plus new commits, so this is a fast-forward.
2. If Emergent shows a conflict or offers **Force Push**: cancel, and save to a **new** branch `phase-1-center-foundation-cp0` instead.
3. Check that `main` (`b951f1c`) is unchanged.
4. The Actions run for the new SHA must show both `test` and `compose` green. The compose smoke test now asserts that the probe returns 404 and that the latest migration is the retirement migration.
5. Reviewer checklist for checkpoint 0:
   - no `/api/health/probe` route;
   - no `PROBE_WRITES_ENABLED` anywhere;
   - the `feasibility_probe` table is dropped;
   - the `schema_info` placeholder is present and justified (Prisma needs at least one model);
   - `memory/test_credentials.md` holds no secrets.

**STOP.** Checkpoint A starts only after checkpoint 0 is independently accepted **and** checkpoint A is explicitly authorized.

## Design baseline

Accepted by the owner on 2026-10-20, and the r3 polish was accepted by independent review. Apply the kit to every V1 screen. Do not create competing systems.

## Remaining TB-EM-000 items

- ADR-0005 (workspace proxy shim): needs owner acceptance.
- Cold-clone drill by an independent person or agent: **NOT RUN**.
- Compose and CI: TESTED: PASS in GitHub Actions (runs 39470630845 and 39474586243).

## Next: TB-EM-001 checkpoint A (not authorized)

Spec: `docs/emergent/workunits/TB-EM-001.md`, §3 (checkpoint A), §6 (secrets policy), §7 (AC 1–7 and 13–20), §8 (test plan). Mandatory owner corrections R1–R5 apply. The highlights:

- Session-bound CSRF synchronizer token, an HMAC pre-auth token, Origin/Referer/Sec-Fetch-Site checks, `__Host-` cookies, and rotation on login, context switch and password change.
- PostgreSQL-backed atomic lockout and rate-limit counters, shared across instances, with `TRUSTED_PROXY_CIDRS` (required). Includes the two-instance and spoofed-XFF regression tests.
- The `bootstrap:owner` CLI (TTY only, refuses in preview, ci and shared-synthetic) is separate from `seed:synthetic` (random disposable passwords in the gitignored `.workspace/local-credentials/`).
- Secret scan in CI: done in the checkpoint 0 correction (`secret-scan` job). Checkpoint A must keep it green.
- Drop `schema_info` once the identity models exist.

## Risks / dependencies

- Unrelated Git history between the branch and `main` (see `EXIT_FROM_EMERGENT.md`).
- Workspace PostgreSQL survives only as long as `/app/.workspace/pgdata`. After a workspace restore, run `scripts/workspace/ensure-postgres.sh` (needed on 2026-10-20).
- The Emergent proxy shim (ADR-0005) must forward `X-Forwarded-For` for the trusted-proxy design. Verify this in checkpoint A.
