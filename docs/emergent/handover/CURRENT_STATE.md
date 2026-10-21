# CURRENT_STATE

Updated: 2026-10-20 (UTC)

## Checkpoint

| Field | Value |
|---|---|
| Work unit | TB-EM-001 **checkpoint 0** (design polish ACCEPTED; probe retirement IMPLEMENTED, awaiting independent review) |
| Last verified export | `66254a1` on `phase-1-center-foundation`. It matched local history (checked via the GitHub API). GitHub Actions run `39474586243`: `test` **TESTED: PASS**, `compose` **TESTED: PASS** |
| Checkpoint 0 export SHA | `217c94ac87b2`. GitHub Actions run `39538224035`: `test` **TESTED: PASS**, `compose` **TESTED: PASS** (verified via the public GitHub API). The independent review found the secret-scan step missing |
| Checkpoint 0 correction (secret scan) | IMPLEMENTED locally. Export SHA **PENDING: owner exports and reports it**. CI `secret-scan` job **NOT RUN** until export. Status **UNEXPORTED / AT RISK** until then |
| Other remote branches | `review/fix-compose-probe-env` (a net-zero add/revert pair) and `review/record-tb-em-000-checkpoint` belong to independent reviewers. They are not merged and were not touched |
| Repository | `NTinkicht/TheraBridge-Emergent` |
| Actual exported branch | `phase-1-center-foundation` (Emergent created it without the planned `emergent/` prefix) |
| First export SHA | `b86028eb1c64bb3941cc04064c68d29273de64af` (reported by owner) |
| First export CI | GitHub Actions run `39445386310`: **TESTED: FAIL**; `compose` job skipped |
| First export defects (owner review) | root `yarn.lock` missing; `.env.example`, `apps/api/.env.example`, `apps/web/.env.example` missing |
| Root cause | (1) Emergent appended `.env`, `.env.*`, `*.env` to `.gitignore`, which ignored every `.env.example`. (2) Emergent's auto-commit never staged `yarn.lock` (it stayed untracked). |
| Fix | `.gitignore` ends with `!.env.example` / `!**/.env.example`; `yarn.lock` and templates committed explicitly in local commit `d170878`; CI fails fast if any of them is missing |
| Corrected export SHA | Verified: `4c077b2` (run 39470630845 PASS), then `66254a1` (run 39474586243 PASS) |
| Export status of corrections | Exported and verified |
| `main` unchanged | Owner-verified for the first export: NOT RECORDED. Re-check after re-export |
| Common ancestor with `main` | **None** (unrelated history). Integrate with `scripts/integration/import-emergent-export.sh` (see `EXIT_FROM_EMERGENT.md`) |

## Work-unit status

| Item | Status |
|---|---|
| Next.js App Router web app on :3000 | IMPLEMENTED, TESTED: PASS (preview check) |
| NestJS on Fastify API under `/api` | IMPLEMENTED, TESTED: PASS |
| PostgreSQL in workspace (ADR-0004) | IMPLEMENTED, TESTED: PASS |
| Prisma migration `tb_em_000_feasibility_probe` | IMPLEMENTED; table retired by `20261020190000_tb_em_001_retire_feasibility_probe` (TESTED: PASS, dev + test DB) |
| Probe write/read endpoints | **RETIRED** in checkpoint 0 (404, TESTED: PASS on API tests and the public preview URL) |
| API integration tests (Jest + Supertest, real PostgreSQL) | TESTED: PASS (8/8 after checkpoint 0) |
| Clean clone of the local commit: frozen-lockfile install, generate, migrate, typecheck, tests, both builds | TESTED: PASS (workspace, not GitHub) |
| Probe write protection | Superseded: the endpoint was removed in checkpoint 0 |
| Integration script against a simulated `main` with unrelated history | TESTED: PASS |
| `next build` / `nest build` production builds | TESTED: PASS (in workspace) |
| Dockerfiles + `docker-compose.yml` | IMPLEMENTED, TESTED: PASS in GitHub Actions (`compose` job, run 39474586243). Not runnable inside Emergent (no Docker) |
| GitHub Actions CI `.github/workflows/ci.yml` | TESTED: PASS on `4c077b2`, `66254a1` and `217c94a` (checkpoint 0). The new `secret-scan` job is NOT RUN until export |
| Secret scan (gitleaks 8.30.1, `.gitleaks.toml`) | Initial historical scan TESTED: PASS. It covered all 45 commits on all 4 public branches (`main`, `phase-1-center-foundation` and both `review/*` branches). 6 raw findings, all reviewed as false positives with no values displayed: a `${VAR}` reference, kebab-case test IDs, and prose in `main`'s README (fingerprinted in `.gitleaksignore`). Re-scan: 0 findings. A planted canary secret was detected and its value was not printed |
| Cold-clone drill | **NOT RUN** |
| Logo derivatives (light surfaces) | IMPLEMENTED, checked against original (see `docs/emergent/brand/LOGO_DERIVATIVES.md`) |
| TB-EM-001 | APPROVED WITH CHANGES (R1–R5 recorded in `docs/emergent/workunits/TB-EM-001.md`). Checkpoint 0 IMPLEMENTED. Checkpoints A–C **not authorized** |
| TB-EM-002 to TB-EM-006 | PLANNED (not authorized) |
| Design direction TB-EM-D01 (`/design-preview`, fixtures only) | **ACCEPTED as the V1 design baseline** (owner, 2026-10-20). r3 polish: **ACCEPTED** by independent review (2026-10-20). Screenshots in `docs/emergent/design/screenshots/` |

## Working URLs (Emergent preview, ephemeral)

- Web: https://therabridge.preview.emergentagent.com/
- API: https://therabridge.preview.emergentagent.com/api/health

## Known defects and limitations

1. **NestJS does not bind :8001 directly inside Emergent.** The read-only supervisor always runs `uvicorn server:app` on :8001, so `backend/server.py` is a pass-through proxy to NestJS on 127.0.0.1:8002 (ADR-0005). In Compose, CI and local runs NestJS binds :8001 itself.
2. PostgreSQL is not Emergent-managed. Binaries under `/usr` may vanish on pod restore; `scripts/workspace/ensure-postgres.sh` reinstalls them (first request after restore can return 503 for about 1 minute). Data dir `.workspace/pgdata` is gitignored and synthetic-only.
3. Workspace runs PostgreSQL 15.19 (Debian bookworm package); Compose and CI use PostgreSQL 16. The single migration uses only portable SQL.
4. The TB-EM-000 public probe write endpoint was removed in checkpoint 0. The API has no write endpoints at all. `schema_info` is a temporary non-domain table (Prisma needs one model) and will be dropped in checkpoint A.
5. Emergent preview cannot be deployed with this stack (Emergent deploy supports React/FastAPI/MongoDB only).
6. Root `README.md`, `backend/`, `frontend/`, `memory/`, `plan/`, `tests/`, `test_reports/`, `test_result.md`, `.emergent/` are Emergent template/platform files. The integration script never copies them.
8. Emergent's auto-commit may again skip `yarn.lock` or re-append `.env*` ignore lines. After every export, check on GitHub that `yarn.lock` and the three `.env.example` files exist (the CI guard step also fails if they don't).
9. The CI failure cause for run 39445386310 was **inferred, not confirmed** (most likely `actions/setup-node` with `cache: yarn` and no `yarn.lock`). Every later run is green.
10. `memory/test_credentials.md` is Git-tracked. Per owner correction R2 it holds pointers only, never passwords.
7. Logo derivatives are valid on light surfaces only; on dark backgrounds they wash out (rejected for dark use).
