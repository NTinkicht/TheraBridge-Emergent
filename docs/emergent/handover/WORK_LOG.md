# WORK_LOG

## TB-EM-000 feasibility and portability gate (2026-10-20)

**Objective:** prove Next.js + NestJS/Fastify + PostgreSQL/Prisma runs end to end in Emergent and is portable outside it. No fallback to FastAPI/MongoDB.

**What changed and why**
- Yarn 1 workspace monorepo: `apps/api` (NestJS 10.4 + Fastify, Prisma 5.22), `apps/web` (Next.js 14.2.35, Tailwind 3.4, IBM Plex via @fontsource, Lucide).
- Prisma model `FeasibilityProbe` (`feasibility_probe`) and migration `20261020143505_tb_em_000_feasibility_probe`.
- `/api/health`, `/api/health/probe` (POST/GET). Strict DTO validation (whitelist + forbid unknown fields), CORS allow-list from env, env vars required without defaults.
- Direction B tokens in `apps/web/src/styles/tokens.ts` (single source for Tailwind and `--tb-*` CSS variables), 3px signature band, `BrandMark`, `StatusPill` using the owner status vocabulary.
- Logo: original stored byte-for-byte (sha256 `542f4281fd52778010a653f65ec36bec5aa5b0a77c77137774fe00eb6e4f8219`); derivatives created by `scripts/brand/derive-logo.py` (crop + white-to-alpha).
- Portability: `docker-compose.yml` (postgres, api, web), two Dockerfiles, `.env.example` files, `.nvmrc`, `yarn.lock`, CI workflow.
- Emergent-only shims: `backend/server.py` (proxy, ADR-0005), `frontend/package.json` `start` script now runs `apps/web`, `scripts/workspace/*` (Postgres, ADR-0004).

**Decisions:** ADR-0001 (stack), ADR-0004 (Postgres in workspace), ADR-0005 (workspace process shim, deviation from "NestJS binds 8001" inside Emergent only).

**Test evidence:** `docs/emergent/qa/TEST_RESULTS.md`.

**Mocked/disabled:** nothing mocked. No auth, no tenants, no mailbox endpoint (TB-EM-001, PLANNED).

**Next action:** owner exports to `emergent/phase-1-center-foundation` and reports SHA; CI result on that SHA decides the Compose/CI rows.
