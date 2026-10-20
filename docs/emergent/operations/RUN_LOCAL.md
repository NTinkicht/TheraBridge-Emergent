# RUN_LOCAL: clean-machine steps (no Emergent)

Status of these instructions: **NOT RUN** outside Emergent yet. CI (`.github/workflows/ci.yml`) executes the same steps on every push.

## Option A: Docker Compose (recommended)

Requirements: Docker 24+ with Compose v2, git.

```bash
git clone git@github.com:NTinkicht/TheraBridge-Emergent.git
cd TheraBridge-Emergent
git checkout emergent/phase-1-center-foundation
cp .env.example .env                    # placeholders only; set PROBE_WRITES_ENABLED=true to try the probe write
docker compose up --build -d --wait     # postgres, api (runs prisma migrate deploy), web
curl -s http://localhost:8001/api/health
curl -s -X POST http://localhost:8001/api/health/probe -H 'Content-Type: application/json' -d '{"source":"cli"}'   # 404 unless PROBE_WRITES_ENABLED=true
curl -s http://localhost:8001/api/health/probe
open http://localhost:3000              # page shows Responding on all 4 rows and the probe rows
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

The integration tests refuse to run unless `DATABASE_URL` names a database ending in `_test`. They delete rows from `feasibility_probe` in that database.

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
| `PROBE_WRITES_ENABLED` | api (required, `true`/`false`, no default) | `false` everywhere except demos of the gate |
| `NEXT_PUBLIC_API_BASE_URL` | web (build time) | Public API origin |
| `POSTGRES_*`, `API_PORT`, `WEB_PORT` | docker compose | `.env` copied from `.env.example` |

No secret values are committed. Example values are local-only.
