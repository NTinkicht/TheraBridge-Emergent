# ADR-0005: Emergent workspace process shim

Status: **Proposed (needs owner acceptance)**. Recorded as a deviation found during TB-EM-000.  
Date: 2026-10-20

## Context
The plan says NestJS runs on :8001. Inside Emergent, the supervisor config is read-only and always runs:
- `uvicorn server:app --port 8001` in `/app/backend`
- `yarn start` in `/app/frontend` on :3000

Files outside `/app` (for example new supervisor programs in `/etc`) do not survive pod restarts, so replacing the programs is not reliable.

## Decision
- `frontend/package.json` `start` script runs `cd ../apps/web && yarn dev`. Next.js itself serves :3000. The CRA template under `frontend/src` is unused.
- `backend/server.py` is a ~100-line pass-through ASGI proxy. On startup it launches `scripts/workspace/start-api.sh` (Postgres, `prisma migrate deploy`, `nest start --watch` on 127.0.0.1:8002) and forwards every request (method, path, query, headers, body) unchanged to NestJS; responses stream back unchanged. It returns 503 while NestJS is starting.
- The proxy contains no business logic, no auth and no data access.

## Consequences
- Inside Emergent there is one extra hop on API calls. All behavior under test is NestJS behavior.
- Outside Emergent (Compose, CI, local) the shim is not used and NestJS binds :8001 directly.
- On export, `backend/` and `frontend/` should be excluded or deleted when merging into the canonical repository.
