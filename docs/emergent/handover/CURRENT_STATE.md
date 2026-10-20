# CURRENT_STATE

Updated: 2026-10-20 (UTC)

## Checkpoint

| Field | Value |
|---|---|
| Work unit | TB-EM-000 feasibility and portability gate |
| Repository | `NTinkicht/TheraBridge-Emergent` |
| Target branch | `emergent/phase-1-center-foundation` (new branch, **never Force Push**) |
| Commit SHA | **PENDING: owner presses Save to GitHub and reports the SHA** |
| Export status | **UNEXPORTED / AT RISK** until the SHA is reported and verified on GitHub |
| `main` unchanged after export | NOT VERIFIED (owner checks on GitHub) |

## Work-unit status

| Item | Status |
|---|---|
| Next.js App Router web app on :3000 | IMPLEMENTED, TESTED: PASS (preview check) |
| NestJS on Fastify API under `/api` | IMPLEMENTED, TESTED: PASS |
| PostgreSQL in workspace (ADR-0004) | IMPLEMENTED, TESTED: PASS |
| Prisma migration `tb_em_000_feasibility_probe` | IMPLEMENTED, TESTED: PASS (dev + test DB) |
| Probe write/read through public preview URL | IMPLEMENTED, TESTED: PASS |
| API integration tests (Jest + Supertest, real PostgreSQL) | TESTED: PASS (10/10) |
| `next build` / `nest build` production builds | TESTED: PASS (in workspace) |
| Dockerfiles + `docker-compose.yml` | IMPLEMENTED, **NOT RUN** (no Docker in Emergent) |
| GitHub Actions CI `.github/workflows/ci.yml` | IMPLEMENTED, **NOT RUN** (runs on first push) |
| Cold-clone drill | **NOT RUN** |
| Logo derivatives (light surfaces) | IMPLEMENTED, checked against original (see `docs/emergent/brand/LOGO_DERIVATIVES.md`) |
| TB-EM-001 to TB-EM-006 | PLANNED (not authorized) |

## Working URLs (Emergent preview, ephemeral)

- Web: https://therabridge.preview.emergentagent.com/
- API: https://therabridge.preview.emergentagent.com/api/health

## Known defects and limitations

1. **NestJS does not bind :8001 directly inside Emergent.** The read-only supervisor always runs `uvicorn server:app` on :8001, so `backend/server.py` is a pass-through proxy to NestJS on 127.0.0.1:8002 (ADR-0005). In Compose, CI and local runs NestJS binds :8001 itself.
2. PostgreSQL is not Emergent-managed. Binaries under `/usr` may vanish on pod restore; `scripts/workspace/ensure-postgres.sh` reinstalls them (first request after restore can return 503 for about 1 minute). Data dir `.workspace/pgdata` is gitignored and synthetic-only.
3. Workspace runs PostgreSQL 15.19 (Debian bookworm package); Compose and CI use PostgreSQL 16. The single migration uses only portable SQL.
4. `POST /api/health/probe` is public and unauthenticated (no rate limit, no CSRF). It accepts only a constrained label and is to be removed or protected in TB-EM-001.
5. Emergent preview cannot be deployed with this stack (Emergent deploy supports React/FastAPI/MongoDB only).
6. Root `README.md`, `backend/`, `frontend/`, `memory/`, `plan/`, `tests/`, `test_reports/`, `.emergent/` are Emergent template/platform files. They must not overwrite canonical repo files on merge.
7. Logo derivatives are valid on light surfaces only; on dark backgrounds they wash out (rejected for dark use).
