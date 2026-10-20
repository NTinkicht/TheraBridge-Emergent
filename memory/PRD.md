# TheraBridge V1 — PRD (Emergent job memory)

## Original problem statement
I want to build **TheraBridge V1**, a complete multi-tenant SaaS application for pediatric therapy centers, therapists, administrators, and families. Two attached documents: the product/visual design blueprint (Master Blueprint v2) and the mandatory engineering continuity and handover protocol. Preferred stack Next.js, NestJS/Fastify, PostgreSQL/Prisma. Preserve the TheraBridge Direction B visual identity. Plan all six roles, implement Phase 1 (platform administration, center registration, approval, trial onboarding). Save to `NTinkicht/TheraBridge-Emergent` on an isolated branch without overwriting docs/history. Maintain code, schemas, ADRs, tests and handover docs in GitHub after every work unit. Any AI developer must be able to continue without Emergent. Synthetic data only; unsigned clinical permissions disabled; not for clinical use.

Owner-approved plan (conditional): **only TB-EM-000 (feasibility and portability gate) is authorized.** Stop for owner review afterwards.

## Architecture
Yarn workspaces monorepo: `apps/web` (Next.js 14 App Router, Tailwind, Direction B tokens), `apps/api` (NestJS 10 + Fastify, Prisma 5.22, PostgreSQL). Emergent-only shims: `backend/server.py` proxy :8001 → NestJS :8002 (ADR-0005); `frontend/package.json` start runs apps/web; `scripts/workspace/*` run PostgreSQL 15 from `/app/.workspace/pgdata` (ADR-0004). Docker Compose + CI authored for outside Emergent.

## User personas
Platform admin, center admin, center applicant, secretary/coordinator, therapist, clinical supervisor, parent/guardian (Phase 1 builds the first three; others reserved/denied).

## Core requirements (static)
Multi-tenant isolation, deny-by-default authorization, server-side sessions, audit, trial limits (30 days / 1 child planned / 3 therapists), Direction B UI, handover docs every work unit, owner status vocabulary (IMPLEMENTED, TESTED: PASS/FAIL, PLANNED, NOT RUN).

## Implemented
- 2026-10-20 TB-EM-000: health + probe endpoints, Prisma migration, preview page, logo derivatives, Compose/Dockerfiles/CI (NOT RUN), handover pack under `docs/emergent/`. API e2e 13/13 PASS; testing agent iteration_1 PASS; 415 for non-JSON bodies added after test finding.

## Backlog
- P0: Owner exports to `emergent/phase-1-center-foundation` (no Force Push), reports SHA; CI result on SHA.
- P0 (needs approval): TB-EM-001 auth & sessions.
- P1: TB-EM-002 public application, TB-EM-003 review/provisioning, TB-EM-004 invitations/outbox/onboarding, TB-EM-005 trial limits/expiry.
- P2: TB-EM-006 responsive/a11y pass + handover; Phase 2/3.

## Next tasks
Wait for owner review of TB-EM-000 and the exported SHA.
