# ARCHITECTURE (as of TB-EM-000)

```
Browser ──HTTPS──> preview ingress ──/api/*──> :8001 ──> NestJS (Fastify) ──Prisma──> PostgreSQL
                                  └──other──> :3000 Next.js App Router (UI only)
```

| Service | Path | Runtime | Port (Compose/local) | Port (Emergent) |
|---|---|---|---|---|
| web | `apps/web` | Next.js 14.2, React 18, Tailwind 3.4 | 3000 | 3000 (via `frontend/package.json` start shim) |
| api | `apps/api` | NestJS 10.4, Fastify 4, Prisma 5.22 | 8001 | 8002, fronted by `backend/server.py` proxy on 8001 (ADR-0005) |
| db | n/a | PostgreSQL 16 (Compose/CI), 15.19 (workspace) | 5432 | 5432 on 127.0.0.1 (ADR-0004) |

**Rules already in force**
- All API routes are under `/api` (`configureApp` in `apps/api/src/bootstrap.ts`, shared with tests).
- Business logic lives only in `apps/api`; Next.js has no route handlers.
- Configuration only via env vars, required at boot with no defaults (`apps/api/src/config/env.ts`).
- Browser calls the API at `NEXT_PUBLIC_API_BASE_URL`; CORS is an explicit allow-list (`CORS_ORIGINS`).

**Planned (not built):** auth/sessions, tenancy, roles, outbox, audit (see the approved Phase 1 plan and `NEXT_WORK.md`). Redis/BullMQ and S3-compatible storage are deferred to Phase 2.
