# ADR-0004: PostgreSQL inside the Emergent workspace

Status: **Approved by owner** (Phase 1 plan)  
Date: 2026-10-20

## Context
Emergent provides MongoDB only. The approved stack needs PostgreSQL.

## Decision
Install PostgreSQL from Debian packages inside the workspace container and run it from a persistent data directory `/app/.workspace/pgdata` (gitignored), listening on 127.0.0.1 only.
`scripts/workspace/ensure-postgres.sh` is idempotent: installs binaries if missing, stops the distro default cluster, `initdb` if needed, starts the server detached (`setsid`), creates the role and the dev and `_test` databases parsed from `apps/api/.env`.
It runs automatically on every backend start (via `scripts/workspace/start-api.sh`).

## Consequences
- Not Emergent-managed: no backups, may need reinstall after a fork or restore (handled by the script; first start after restore takes about 1 minute).
- Workspace runs PostgreSQL 15.19; Compose and CI use 16. Migrations must stay portable SQL.
- Data is synthetic only; losing it is acceptable. Schema lives in committed Prisma migrations.
- The script is Emergent-only and is never used by Docker, CI or local development.
