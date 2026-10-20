# TEST_RESULTS

Environment: Emergent workspace, Debian 12, Node 20.20.2, Yarn 1.22.22, PostgreSQL 15.19, Prisma 5.22.0, Next.js 14.2.35, NestJS 10.4.  
Commit: **not yet exported** (results apply to the workspace state that will be exported as the first SHA on `emergent/phase-1-center-foundation`).  
Date: 2026-10-20 (UTC)

## Summary

| # | Check | Status |
|---|---|---|
| 1 | API integration tests vs real PostgreSQL (10 cases) | TESTED: PASS |
| 2 | API typecheck (`tsc --noEmit`) | TESTED: PASS |
| 3 | `nest build` | TESTED: PASS |
| 4 | `next build` (includes type check) | TESTED: PASS |
| 5 | Prisma migration applied to dev and `_test` DBs | TESTED: PASS |
| 6 | Public preview URL: GET health, POST probe, GET probe (curl) | TESTED: PASS |
| 7 | Preview browser check: page loads, 4 stack rows "Responding", Write probe row → row read back, persists after reload; 390px no horizontal overflow | TESTED: PASS |
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
    ✓ routes exist only under the /api prefix
    ✓ CORS allows the configured origin and not others
Tests:       10 passed, 10 total
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

## Not run (explicit)

- Docker Compose, Dockerfiles, CI workflow, cold-clone drill: authored, **NOT RUN**.
- Viewports 320/768/1024/1440: **NOT RUN** for TB-EM-000 (responsive pass is TB-EM-006).
