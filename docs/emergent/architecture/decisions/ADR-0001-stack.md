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

## Amendment 1 — runtime and framework majors (2026-11-16)
Status: **Proposed; owner instructed implementation in session 2026-11-16** — formal sign-off is the owner's merge of the PR that introduces this amendment.

Context: the pinned majors above went out of upstream support. Node.js 20 reached end of life on 2026-04-30; Next.js 14/15 left LTS; NestJS 10 is superseded. #311 (NestJS 11 / Fastify 5 / Next 15) and #394 (Next 16 / React 19) already moved majors inside the approved stack without updating this ADR; this amendment records them and the runtime move.

Decision (same stack, updated pins):
- **Node.js 24 LTS** (`.nvmrc` 24, `engines` `>=24.9 <25`, `node:24-bookworm-slim` images). Node 22 rejected: maintenance-only and EOL 2027-04-30; NestJS 12's documented Jest support for its ESM-only packages needs Node >=24.9. Node 26 deferred: LTS only since 2026-10-28 and removes legacy APIs; revisit once Prisma/argon2 are verified on it.
- Next.js 16 (App Router) with React 19; NestJS 12 with `@nestjs/platform-fastify` (Fastify 5); Prisma 5.22 (unchanged); Tailwind 3.4 (unchanged); Jest 30 + Supertest 7; TypeScript 6.0 in the API (required by `@nestjs/schematics` 12), web unchanged on 5.6.
- Application code stays CommonJS; NestJS 12's ESM packages are consumed through Node's `require(esm)`.

Consequences: CI, local development and all images must use Node >=24.9; API Jest tests cannot run on older Node. No authorization, clinical, data-handling or deployment policy changes.
