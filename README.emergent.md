# TheraBridge V1 (Emergent build)

> Synthetic-data proof of concept. **Not for clinical use.** Clinical pilot and production: **NO-GO**.

This file is named `README.emergent.md` so it does not collide with the canonical repository `README.md`.
The root `README.md` in this export is the unmodified Emergent template file; drop it when merging (see `docs/emergent/operations/EXIT_FROM_EMERGENT.md`).

## Current functional scope (honest)

Only work unit **TB-EM-000** (feasibility and portability gate) exists:

- Next.js 14 App Router page (`apps/web`) using Direction B tokens and the TheraBridge `BrandMark`.
- NestJS 10 on Fastify (`apps/api`), all routes under `/api`:
  - `GET /api/health` returns API status, the PostgreSQL version, the applied Prisma migrations and the schema checkpoint.
  - The TB-EM-000 probe endpoints (`/api/health/probe`) and the `feasibility_probe` table were **retired in TB-EM-001 checkpoint 0** (migration `20261020190000_tb_em_001_retire_feasibility_probe`).
- PostgreSQL 15 (workspace) / 16 (Compose, CI) via Prisma 5.22 with two committed migrations.

No product features exist yet: no login, no tenants, no roles. TB-EM-001 to TB-EM-006 are **PLANNED**.

## Layout

```
apps/api        NestJS + Fastify + Prisma (the only place for business logic)
apps/web        Next.js App Router + Tailwind (UI only)
assets/brand    Original logo (byte-for-byte) + derived crops + fidelity report
scripts/brand   Logo derivation script (crop + white-to-alpha, no redrawing)
scripts/workspace  Emergent-workspace-only helpers (Postgres + API launcher)
docs/emergent   Handover, architecture/ADRs, operations, QA evidence
backend/, frontend/  Emergent template shims only (ADR-0005). Not application code.
```

## Run

See `docs/emergent/operations/RUN_LOCAL.md`. Short version:

```bash
cp .env.example .env
docker compose up --build
# web http://localhost:3000, api http://localhost:8001/api/health
```

## Status vocabulary

IMPLEMENTED, TESTED: PASS, TESTED: FAIL, PLANNED, NOT RUN. See `docs/emergent/qa/TEST_RESULTS.md`.
