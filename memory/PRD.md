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

- 2026-10-20 TB-EM-000 correction round 1: first export b86028e (branch `phase-1-center-foundation`) failed CI 39445386310 because yarn.lock and the .env.example files were missing (Emergent .gitignore lines plus auto-commit). Fixed and committed locally (d170878 + docs commit). Probe writes are now behind a flag, use server-generated labels, and have a row cap and rate limit. Added an allow-list integration script. Clean-clone pipeline PASS; 16/16 API tests. The corrected export SHA is pending.

## Backlog
- P0: Owner exports to `emergent/phase-1-center-foundation` (no Force Push), reports SHA; CI result on SHA.
- P0 (needs approval): TB-EM-001 auth & sessions.
- P1: TB-EM-002 public application, TB-EM-003 review/provisioning, TB-EM-004 invitations/outbox/onboarding, TB-EM-005 trial limits/expiry.
- P2: TB-EM-006 responsive/a11y pass + handover; Phase 2/3.

## Next tasks
- 2026-10-20 TB-EM-D01 design direction "Calm Precision, with warmth at home": `/design-preview` with 5 representative screens plus family dark, a shared design kit and token additions. Awaiting owner approval before it is applied across V1.
- 2026-10-20 TB-EM-D01 r2: owner approved the direction, with Jakarta headings and Plex body/data. Fixed platform metric states, added scroll cues, removed the dark flash, added focus and accessibility fixes and client-only dates. Testing agent iteration_6 passed 100%. 21 acceptance screenshots committed. Awaiting independent visual acceptance.

- 2026-10-20 Design baseline ACCEPTED by owner. r3 polish done locally (desktop platform/family spacing, wrapping mobile activity names, outdated doc lines removed). TB-EM-001 proposal written at docs/emergent/workunits/TB-EM-001.md; ADR-0006 (local sign-in, OIDC-ready) chosen; review after every checkpoint. TB-EM-001 NOT approved, NOT started. Owner account for seeding: nassim.tinkicht@gmail.com (password from env).

Wait for owner approval of TB-EM-001 and the next exported SHA.

- 2026-10-20 TB-EM-001 APPROVED WITH CHANGES (R1 owner bootstrap separate from seed and never in preview; R2 no secrets in Git, memory/test_credentials.md pointers only; R3 session-bound CSRF + Origin + rotation; R4 deny-by-default + escalation protection, clinical DENY; R5 multi-instance PG-backed rate limits + trusted proxies). Recorded in workunits/TB-EM-001.md and ADR-0006. CI run 39474586243 (66254a1) green, test + compose. Checkpoint 0 IMPLEMENTED: probe endpoints, guard and env flag removed, table dropped, schema_info placeholder added; 8/8 API tests. Owner account is NOT seeded; it is created only via a future bootstrap:owner CLI run by the owner outside the preview.

STOP: export checkpoint 0 and wait for independent review. Checkpoint A is not authorized.

- 2026-10-20 Review of the checkpoint 0 export 217c94ac87b2 (CI green) found the secret scan missing. Added the `secret-scan` CI job (gitleaks 8.30.1, checksum-pinned, full history + tracked files, redacted), `.gitleaks.toml` and `.gitleaksignore`. The initial historical scan of all public branches is clean. STOP for independent verification; checkpoint A is not authorized.
