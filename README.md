# TheraBridge Emergent

Synthetic-data-only, non-clinical proof of concept built with NestJS/Fastify, Prisma/PostgreSQL, Next.js and Yarn workspaces. **Not approved for real patient use, consent, clinical release, therapist transfer or signing.**

## Local development

Use Node 20 and Yarn 1. Install dependencies with `yarn install --frozen-lockfile`. Copy `.env.example` to `.env` and configure local-only secrets and PostgreSQL; refer to `apps/api/.env.example` for required API flags. Start disposable dependencies with `docker compose up --build --wait`, or run the API and web workspaces with `yarn dev:api` and `yarn dev:web` against an independently configured local database. Do not point local tools at shared or patient databases.

## Quality gates

- `yarn workspace @therabridge/api typecheck` and `yarn workspace @therabridge/api test`: TypeScript and database-connected Jest suite (needs isolated PostgreSQL and migrations).
- `yarn workspace @therabridge/api test:coverage:core`: **measured** Jest threshold for `src/common/fingerprints.ts`: 95% statements/lines/functions, 90% branches. This narrowly scoped regression gate is **not** a claim of repository-wide coverage.
- `yarn workspace @therabridge/web test`: zero-dependency Node unit tests for trusted upstream origin parsing; `yarn workspace @therabridge/web build` builds the web app.
- GitHub CI additionally runs immutable migration guards, secret scans, a real browser/API/Postgres journey, Docker Compose, and a unified Render-style synthetic preview with UID 1000 and HTTP health checks.

## Container runtime and deployment

The API and web Docker images run as unprivileged UID 1000, with writable Next cache and Prisma-runtime paths. The unified `Dockerfile.preview` uses the same non-root identity, a health check and two separately bounded 192 MiB Node V8 heaps; these are *old-space* ceilings, not full RSS limits. The preview launcher strictly requires synthetic preview configuration, private loopback API proxy, secure cookies, disabled family messaging, and an explicit dedicated demo database. Render's free-tier 512 MiB memory limit remains a resource constraint: validate actual RSS under load before relying on hosted availability.

## Governance and next work

See `AGENTS.md`, `docs/emergent/workunits/M2-H08.md`, `docs/emergent/handover/CURRENT_STATE.md`, and `docs/emergent/qa/TEST_RESULTS.md`. Milestone 2 progresses in frozen PR order; all clinical policy/consent/safeguarding approval gates remain independently blocked.
