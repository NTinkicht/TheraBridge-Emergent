# TEST_RESULTS

Environment: Emergent workspace, Debian 12, Node 20.20.2, Yarn 1.22.22, PostgreSQL 15.19, Prisma 5.22.0, Next.js 14.2.35, NestJS 10.4.  
Branch: `phase-1-center-foundation`. First export `b86028eb1c64bb3941cc04064c68d29273de64af`. Corrections in local commit `d170878` plus a docs commit; corrected export SHA **PENDING**.  
Date: 2026-10-20 (UTC)

## Design direction TB-EM-D01 r2 (owner-approved direction, corrections for acceptance)

| # | Check | Status |
|---|---|---|
| D5 | Testing agent iteration_3: full regression at 320/390/768/1024/1440 covering contrast, keyboard, states and alignment | TESTED: FAIL on 5 UI defects + 2 integration defects (More-sheet focus, focus-ring contrast on dark, tab keyboard scroll, 320 alignment, tab counts, family SSR date) → all fixed |
| D6 | Testing agent iteration_4: re-verify | TESTED: PASS 8/9. One new 320 provider-row overlap and 2 pill overflows → fixed |
| D7 | Testing agent iteration_5: re-verify | TESTED: PASS 13/14. Server-clock greeting/date on center/therapist → fixed with `useNow` |
| D8 | Testing agent iteration_6: client clock mocked to other times and days; regression at 320/1440 on all 6 routes; dark theme from first paint | TESTED: PASS 100%, no open issues |
| D9 | Dark theme applied before hydration (JS chunks blocked, shell background rgb(13,18,38)) | TESTED: PASS |
| D10 | `scripts/design/capture-screenshots.mjs`: 21 captures, 0px overflow everywhere | TESTED: PASS |
| D11 | Web typecheck | TESTED: PASS |

## Design direction milestone TB-EM-D01 (design preview, fixtures only)

| # | Check | Status |
|---|---|---|
| D1 | `yarn workspace @therabridge/web typecheck` and `next build` (8 static routes incl. 6 `/design-preview/*`) | TESTED: PASS |
| D2 | Independent testing agent iteration_2 (Playwright, 320/390/768/1024/1440, all 6 routes, every interaction listed in the report) | TESTED: PASS for interactions. It found 6 defects: 320px overflow (HIGH), clipped notifications popover, activity steps not matching the title, weekend state, dark-theme status contrast, unclear toggle selection |
| D3 | Fixes for all 6 defects, re-checked: `scrollWidth` == viewport at 320 and 390 on all 6 routes; notifications panel within 16–374px at 390; dialog steps match the activity | TESTED: PASS |
| D4 | Re-run of the full testing agent after fixes | NOT RUN (targeted re-checks only) |

Not done in this milestone: platform metric counts don't follow the Data=Empty control; there are no scroll cues on horizontally scrolling tab strips; the family theme can briefly show light before dark is applied.

## Correction round 1 (after owner review of b86028e)

| # | Check | Status |
|---|---|---|
| C1 | GitHub Actions run 39445386310 on b86028e | **TESTED: FAIL** (owner-reported). `compose` job skipped. Cause inferred: missing `yarn.lock`. Logs not visible from Emergent |
| C2 | `yarn.lock`, `.env.example`, `apps/api/.env.example`, `apps/web/.env.example` tracked in git (`git ls-files`) | TESTED: PASS |
| C3 | Clean `git clone` of the local commit → files present → `yarn install --frozen-lockfile` → `prisma generate` → `prisma migrate deploy` (fresh `therabridge_ci_test` DB) → api typecheck → api tests 16/16 → `nest build` → `next build` | TESTED: PASS (`PIPELINE_EXIT=0`) |
| C4 | API tests 16/16 incl. disabled-flag 404, required flag, client label rejected, 200-row cap, 10/min rate limit | TESTED: PASS |
| C5 | `scripts/integration/import-emergent-export.sh` against a simulated origin (`main` with README.md, AGENTS.md, blueprint; export branch with unrelated history) | TESTED: PASS: `main` SHA unchanged, canonical README kept, no template/platform files copied, 79 allow-listed paths staged |
| C6 | Preview URL: health shows `probeWrites.enabled=true`; client `label` → 400; `{source}` → 201 with server label; browser write + read-back | TESTED: PASS |
| C7 | Docker Compose build/up | **NOT RUN** (no Docker in Emergent; runs in CI `compose` job) |
| C8 | GitHub Actions on corrected export | **NOT RUN** (needs re-export) |

The tables below are the original first-round results. The API suite has since grown from 13 to 16 cases.

## Summary

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

## TB-EM-D01 r3 polish (2026-10-20)

- `tsc --noEmit` (apps/web): TESTED: PASS.
- `SCREENSHOT_BASE_URL=http://localhost:3000 node scripts/design/capture-screenshots.mjs`: 21/21 captured, 0px horizontal overflow on every page: TESTED: PASS.
- Visual check of platform 1440, family light 1440/320 and family dark 1440: cards keep their natural height, and activity names wrap on mobile. Checked by the developer only; independent review is pending with the next export.

## TB-EM-001 checkpoint 0: probe retirement (2026-10-20)

Environment: Emergent workspace, PostgreSQL 15.19 (restarted with `scripts/workspace/ensure-postgres.sh` after a workspace restore).

| Command / check | Result |
|---|---|
| GitHub Actions on the pre-checkpoint SHA `66254a1` (run 39474586243), via the public GitHub API | `test` PASS, `compose` PASS |
| `prisma generate`; `prisma migrate deploy` on `therabridge` and `therabridge_test` | TESTED: PASS (2 migrations applied) |
| `tsc --noEmit` for api and web | TESTED: PASS |
| `jest --runInBand` against `therabridge_test` | TESTED: PASS, 8/8: health with retirement migration as latest and `schemaCheckpoint`; table dropped (`to_regclass` null); POST and GET `/api/health/probe` return 404; 415 for form and text bodies; `/api` prefix only; CORS allow/deny |
| Public preview `GET /api/health` | 200, latest `20261020190000_tb_em_001_retire_feasibility_probe` |
| Public preview POST and GET `/api/health/probe` | 404 / 404 |
| Preview page at 1920 and 390 | All 4 stack rows "Responding", no probe card, 0 overflow |
| CI on the checkpoint 0 SHA | **NOT RUN** until export |

## Not run (explicit)

- Docker Compose, Dockerfiles, CI workflow, cold-clone drill: authored, **NOT RUN**.
- Viewports 320/768/1024/1440: **NOT RUN** for TB-EM-000 (responsive pass is TB-EM-006).
