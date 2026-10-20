# RUN_LOCAL: clean-machine steps (no Emergent)

Status of these instructions: Option A was executed by GitHub Actions (`compose` job, run 39474586243 on `66254a1`: TESTED: PASS). A manual run on a clean machine outside Emergent: **NOT RUN**.

## Option A: Docker Compose (recommended)

Requirements: Docker 24+ with Compose v2, git.

```bash
git clone git@github.com:NTinkicht/TheraBridge-Emergent.git
cd TheraBridge-Emergent
git checkout phase-1-center-foundation
cp .env.example .env                    # placeholders only
docker compose up --build -d --wait     # postgres, api (runs prisma migrate deploy), web
curl -s http://localhost:8001/api/health  # latest migration: 20261020190000_tb_em_001_retire_feasibility_probe
open http://localhost:3000              # page shows Responding on all 4 rows
docker compose down -v                  # remove containers and the synthetic DB volume
```

## Option B: Node on the host

Requirements: Node 20 (`.nvmrc`), Yarn 1.22, PostgreSQL 15 or 16.

```bash
yarn install --frozen-lockfile
cp apps/api/.env.example apps/api/.env      # edit DATABASE_URL / DATABASE_URL_TEST for your Postgres
cp apps/web/.env.example apps/web/.env.local
createdb therabridge && createdb therabridge_test   # or use: docker compose up -d postgres
yarn workspace @therabridge/api prisma migrate deploy
yarn dev:api     # http://localhost:8001/api/health
yarn dev:web     # http://localhost:3000
```

## Tests

The integration tests refuse to run unless `DATABASE_URL` names a database ending in `_test`.

```bash
export DATABASE_URL=postgresql://USER:PASS@127.0.0.1:5432/therabridge_test?schema=public
yarn workspace @therabridge/api prisma migrate deploy
yarn workspace @therabridge/api test
yarn workspace @therabridge/api typecheck
yarn build
```

## Environment variables

| Name | Used by | Source |
|---|---|---|
| `DATABASE_URL` | api, prisma CLI | Owner vault / local Postgres |
| `DATABASE_URL_TEST` | humans/scripts only (tests read `DATABASE_URL`) | Local Postgres |
| `PORT`, `HOST` | api | Deployment config |
| `CORS_ORIGINS` | api | Web origin(s), comma-separated |
| `NEXT_PUBLIC_API_BASE_URL` | web (build time) | Public API origin |
| `POSTGRES_*`, `API_PORT`, `WEB_PORT` | docker compose | `.env` copied from `.env.example` |

No secret values are committed. Example values are local-only.
