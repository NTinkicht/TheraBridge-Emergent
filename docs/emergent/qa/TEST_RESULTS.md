# TEST_RESULTS

Environment: Emergent workspace, Debian 12, Node 20.20.2, Yarn 1.22.22, PostgreSQL 15.19, Prisma 5.22.0, Next.js 14.2.35, NestJS 10.4.  
Branch: `phase-1-center-foundation`. First export `b86028eb1c64bb3941cc04064c68d29273de64af`. Corrected export `fa9f7f4cdb570f04a4c0756abdfc14e7271841a2`. Verified GitHub Actions run `39448713740` (triggered on an audit/review branch pointing at this exact SHA): **test PASS, compose PASS**.  
Date: 2026-10-20 (UTC)

## Correction round 1 (after owner review of b86028e)

| # | Check | Status |
|---|---|---|
| C1 | GitHub Actions run 39445386310 on b86028e | **TESTED: FAIL** (owner-reported). `compose` job skipped. Cause inferred: missing `yarn.lock`. Logs not visible from Emergent |
| C2 | `yarn.lock`, `.env.example`, `apps/api/.env.example`, `apps/web/.env.example` tracked in git (`git ls-files`) | TESTED: PASS |
| C3 | Clean `git clone` of the local commit → files present → `yarn install --frozen-lockfile` → `prisma generate` → `prisma migrate deploy` (fresh `therabridge_ci_test` DB) → api typecheck → api tests 16/16 → `nest build` → `next build` | TESTED: PASS (`PIPELINE_EXIT=0`) |
| C4 | API tests 16/16 incl. disabled-flag 404, required flag, client label rejected, 200-row cap, 10/min rate limit | TESTED: PASS |
| C5 | `scripts/integration/import-emergent-export.sh` against a simulated origin (`main` with README.md, AGENTS.md, blueprint; export branch with unrelated history) | TESTED: PASS: `main` SHA unchanged, canonical README kept, no template/platform files copied, 79 allow-listed paths staged |
| C6 | Preview URL: health shows `probeWrites.enabled=true`; client `label` → 400; `{source}` → 201 with server label; browser write + read-back | TESTED: PASS |
| C7 | Docker Compose build/up | **TESTED: PASS** on Ubuntu GitHub Actions, run `39448713740` (`compose` job built and started web/api/PostgreSQL, smoke tests passed) |
| C8 | GitHub Actions on corrected export SHA | **TESTED: PASS**: 16/16 Jest integration tests, typecheck/builds, and Docker Compose smoke test in run `39448713740` |

The tables below are the original first-round results. The API suite has since grown from 13 to 16 cases.

## Historical first-round summary (superseded by correction round 1 above)

The 13-test and Docker/CI NOT RUN entries below describe the original uncorrected workspace only. For corrected-checkpoint acceptance, rely on the C1–C8 table and exact-SHA independent GitHub Actions run `39448713740`.

| # | Check | Status |
|---|---|---|
| 1 | API integration tests vs real PostgreSQL (13 cases) | TESTED: PASS |
| 2 | API typecheck (`tsc --noEmit`) | TESTED: PASS |
| 3 | `nest build` | TESTED: PASS |
| 4 | `next build` (includes type check) | TESTED: PASS |
| 5 | Prisma migration applied to dev and `_test` DBs | TESTED: PASS |
| 6 | Public preview URL: GET health, POST probe, GET probe (curl) | TESTED: PASS |
| 7 | Preview browser check: page loads, 4 stack rows "Responding", Write probe row → row read back, persists after reload; 390px no horizontal overflow | TESTED: PASS |
| 7b | Independent Emergent testing agent (API + UI, iteration_1) | TESTED: PASS (1 minor security finding, fixed, see below) |
| 8 | Docker Compose build/up | **NOT RUN** (Docker unavailable in Emergent) |
| 9 | GitHub Actions CI | **NOT RUN** (runs on first push) |
| 10 | Cold-clone drill | **NOT RUN** |

## 1. API integration tests

Command:
```bash
cd apps/api
DATABASE_URL=postgresql://therabridge:***@127.0.0.1:5432/therabridge_test?schema=public yarn prisma migrate deploy
DATABASE_URL=postgresql://therabridge:***@127.0.0.1:5432/therabridge_test?schema=public yarn test
```
Output:
```
PASS test/health.e2e-spec.ts
  TB-EM-000 feasibility probe (real PostgreSQL via Prisma)
    ✓ GET /api/health reports PostgreSQL up and the Prisma migration applied
    ✓ POST /api/health/probe writes a row that GET reads back and the database holds
    ✓ the row survives an application restart (persisted, not in memory)
    ✓ POST /api/health/probe rejects label too long with 400 and writes nothing
    ✓ POST /api/health/probe rejects label with forbidden characters with 400 and writes nothing
    ✓ POST /api/health/probe rejects unknown source with 400 and writes nothing
    ✓ POST /api/health/probe rejects unexpected field with 400 and writes nothing
    ✓ POST /api/health/probe rejects missing body fields with 400 and writes nothing
    ✓ POST /api/health/probe rejects application/x-www-form-urlencoded bodies with 415 and writes nothing
    ✓ POST /api/health/probe rejects text/plain bodies with 415 and writes nothing
    ✓ POST /api/health/probe rejects multipart/form-data; boundary=x bodies with 415 and writes nothing
    ✓ routes exist only under the /api prefix
    ✓ CORS allows the configured origin and not others
Tests:       13 passed, 13 total
```

## 2-4. Typecheck and builds

```
yarn workspace @therabridge/api typecheck   → exit 0
yarn workspace @therabridge/api build       → exit 0 (dist/main.js)
yarn workspace @therabridge/web build       → exit 0, route / prerendered static, First Load JS 90.9 kB
```

## 6. Public preview URL (curl)

```
GET  https://therabridge.preview.emergentagent.com/api/health
→ {"status":"ok","framework":"nestjs-fastify","database":{"status":"up","engine":"postgresql","version":"15.19 (Debian 15.19-0+deb12u1)"},"migrations":{"applied":1,"latest":"20261020143505_tb_em_000_feasibility_probe"}}
POST https://therabridge.preview.emergentagent.com/api/health/probe {"label":"curl-preview-check","source":"cli"} → 201 {"id":"1c2e6ddb-…","label":"curl-preview-check"}
GET  https://therabridge.preview.emergentagent.com/api/health/probe → {"total":1,"items":[{"id":"1c2e6ddb-…"}]}
GET  https://therabridge.preview.emergentagent.com/ → 200
```

## 7. Preview browser check (Playwright via Emergent screenshot tool)

- 1920x800: all 4 stack rows "Responding"; click `probe-write-button` → total 1 → 2 and `probe-readback-confirmed` shown; after reload total still 2.
- 390x844: horizontal overflow check returned `[]` after fixing a grid min-width defect found during the check (first run: overflow in stack-check card, TESTED: FAIL → fixed → TESTED: PASS).

## 7b. Independent testing agent (iteration_1)

- Backend 100%, frontend 100%; Jest re-run 10/10 at that time.
- Finding (minor, security): POST accepted `application/x-www-form-urlencoded` (Fastify form parser), letting a cross-site HTML form write without CORS preflight. **Fixed** in `apps/api/src/bootstrap.ts`: any request body that is not `application/json` gets 415. Three regression tests added (13/13 PASS). Public URL re-check: form post → 415, JSON post → 201.
- Cosmetic: stack-check detail text truncated at 390px → now wraps.
- Rows created during testing were deleted from the dev DB.

## Not run (explicit)

- Docker Compose, Dockerfiles, CI workflow, cold-clone drill: authored, **NOT RUN**.
- Viewports 320/768/1024/1440: **NOT RUN** for TB-EM-000 (responsive pass is TB-EM-006).
