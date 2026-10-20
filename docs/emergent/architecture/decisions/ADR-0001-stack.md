# ADR-0001: Application stack

Status: **Approved by owner** (Phase 1 plan, preferred stack)  
Date: 2026-10-20

## Context
The blueprint and continuity protocol prefer Next.js App Router, TypeScript, NestJS/Fastify, PostgreSQL/Prisma. Emergent's default template is React (CRA) + FastAPI + MongoDB. A silent stack switch is forbidden.

## Options
1. Preferred stack (Next.js + NestJS/Fastify + PostgreSQL/Prisma).
2. Emergent default (React + FastAPI + MongoDB): rejected by owner, no fallback allowed.

## Decision
Option 1, gated by TB-EM-000. Yarn 1 workspaces monorepo; Node 20; TypeScript strict in both apps.
Pinned majors: Next.js 14.2, React 18.3, NestJS 10.4 with `@nestjs/platform-fastify`, Prisma 5.22, Tailwind 3.4, Jest 29 + Supertest 7.

## Consequences
- Emergent one-click deploy is unavailable (supports only its default stack). Hosting is external.
- Docker cannot run inside Emergent; Compose and CI are verified externally.
- Emergent's supervisor commands are read-only, requiring workspace shims (ADR-0005).
- TB-EM-000 result: the stack runs end to end in the workspace (see `docs/emergent/qa/TEST_RESULTS.md`).
