# WORK_LOG

## TB-EM-000 feasibility and portability gate (2026-10-20)

**Objective:** prove Next.js + NestJS/Fastify + PostgreSQL/Prisma runs end to end in Emergent and is portable outside it. No fallback to FastAPI/MongoDB.

**What changed and why**
- Yarn 1 workspace monorepo: `apps/api` (NestJS 10.4 + Fastify, Prisma 5.22), `apps/web` (Next.js 14.2.35, Tailwind 3.4, IBM Plex via @fontsource, Lucide).
- Prisma model `FeasibilityProbe` (`feasibility_probe`) and migration `20261020143505_tb_em_000_feasibility_probe`.
- `/api/health`, `/api/health/probe` (POST/GET). Strict DTO validation (whitelist + forbid unknown fields), CORS allow-list from env, env vars required without defaults.
- Direction B tokens in `apps/web/src/styles/tokens.ts` (single source for Tailwind and `--tb-*` CSS variables), 3px signature band, `BrandMark`, `StatusPill` using the owner status vocabulary.
- Logo: original stored byte-for-byte (sha256 `542f4281fd52778010a653f65ec36bec5aa5b0a77c77137774fe00eb6e4f8219`); derivatives created by `scripts/brand/derive-logo.py` (crop + white-to-alpha).
- Portability: `docker-compose.yml` (postgres, api, web), two Dockerfiles, `.env.example` files, `.nvmrc`, `yarn.lock`, CI workflow.
- Emergent-only shims: `backend/server.py` (proxy, ADR-0005), `frontend/package.json` `start` script now runs `apps/web`, `scripts/workspace/*` (Postgres, ADR-0004).

**Decisions:** ADR-0001 (stack), ADR-0004 (Postgres in workspace), ADR-0005 (workspace process shim, deviation from "NestJS binds 8001" inside Emergent only).

- After independent testing: API rejects non-JSON request bodies with 415 (cross-site form-post hardening); stack-check text wraps on mobile.

**Test evidence:** `docs/emergent/qa/TEST_RESULTS.md`.

**Mocked/disabled:** nothing mocked. No auth, no tenants, no mailbox endpoint (TB-EM-001, PLANNED).

## TB-EM-001 checkpoint 0: corrections recorded, probe retired (2026-10-20)

**Owner decision:**
- The design polish was ACCEPTED.
- TB-EM-001 was APPROVED WITH CHANGES R1–R5:
  - R1: owner bootstrap kept separate from seeding;
  - R2: no secrets in Git;
  - R3: session-bound CSRF, Origin checks and rotation;
  - R4: deny-by-default, with escalation protection;
  - R5: multi-instance rate limits and trusted proxies.
- Only checkpoint 0 is authorized.

**Recorded:**
- Rewrote `workunits/TB-EM-001.md`: corrections, 22 acceptance criteria, test plan.
- Updated ADR-0006.
- `memory/test_credentials.md` now holds pointers only.

**CI confirmed:** run 39474586243 on `66254a1`, with `test` and `compose` both green (the first real Compose run).

**Changed:**
- Removed the probe controller routes, guard, DTO, `PROBE_WRITES_ENABLED` (env templates, Compose, CI) and the web probe panel.
- Migration `20261020190000_tb_em_001_retire_feasibility_probe` drops `feasibility_probe` and adds the placeholder `schema_info`, because Prisma refuses to generate a client for a schema with zero models.
- The CI compose smoke test now asserts the probe returns 404.

**Tests:** 8/8 API tests pass; checks against the public preview pass.

**Stop:** export, then wait for independent review. Checkpoint A is not authorized.


## Design baseline accepted + TB-EM-D01 r3 polish + TB-EM-001 proposal (2026-10-20)

**Owner decision:** "Calm Precision, with warmth at home" is the official V1 design baseline.
**Changed (polish, authorized):**
- Desktop platform: events moved under applications, so cards no longer stretch.
- Desktop family: week moved under today's activity.
- Mobile activity names wrap instead of truncating.
- Outdated statements removed from the design docs (the dark-flash limitation, the r1 type comparison, "awaiting acceptance").

**Proposed (not approved):** `docs/emergent/workunits/TB-EM-001.md`. ADR-0006 recorded as the owner's chosen sign-in approach.
**Not done:** probe write retirement (part of TB-EM-001, waits for approval).


## Design direction TB-EM-D01 r2 (2026-10-20): approved direction, acceptance corrections

**Owner decision:** the direction is approved. Headings use Plus Jakarta Sans; body, data and numbers use IBM Plex Sans.
**Changes:**
- Typography tokens.
- Platform metrics follow the data state.
- `ScrollStrip` scroll cues.
- No-flash family theme through an inline script and `.theme-family-auto`.
- Theme-aware focus ring and More-sheet focus trap.
- Client-only dates through `useNow`.
- Alignment fixes at 320px.
- Playwright (root devDependency) and `scripts/design/capture-screenshots.mjs`, with 21 screenshots committed.
**Evidence:** TEST_RESULTS D5–D11.
**Next:** independent visual acceptance. Broad implementation is not to start until then.

## Design direction milestone TB-EM-D01 (2026-10-20), PROPOSED and awaiting owner approval

**Objective:** propose a visual direction and show it on 5 representative screens before any broad UI work.
**Changes:**
- Routes `/design-preview` (direction, tokens, type, components, states) plus `platform`, `center`, `therapist`, `child` and `family` (light and dark).
- Shared kit in `apps/web/src/components/design/`.
- Fixtures in `apps/web/src/lib/design/`.
- Token additions in `apps/web/src/styles/tokens.ts`: info and success surfaces, specialty tags, and family light/dark semantic slots with dark success/caution colors.
- Plus Jakarta Sans (headings) offered as an alternative font.
**Not changed:** API, database, auth, and the feasibility page at `/`. The preview pages make no API calls.
**Evidence:** TEST_RESULTS D1–D4. Full rationale in `docs/emergent/design/DESIGN_DIRECTION.md`.

## TB-EM-000 correction round 1 (2026-10-20)

**Trigger:** owner review of export `b86028e` on `phase-1-center-foundation`. CI run 39445386310 failed, the root `yarn.lock` and all `.env.example` files were missing, and the branch has no common ancestor with `main`.
**Root cause:** Emergent appended `.env`, `.env.*` and `*.env` to `.gitignore`, and its auto-commit never staged `yarn.lock`.
**Changes:**
- Added `.gitignore` negations for `.env.example` files.
- Committed `yarn.lock` and the env templates explicitly (`d170878`).
- Added a CI guard step for these required files.
- Probe writes now require `PROBE_WRITES_ENABLED` (no default, `false` in templates; 404 when false). Labels are generated by the server, at most 200 rows are kept, and writes are limited to 10 per minute per IP.
- Docker Compose passes the flag through; the CI compose smoke test enables it explicitly.
- Added `scripts/integration/import-emergent-export.sh` (allow-list import onto a branch from `main`).
**Evidence:** TEST_RESULTS C1–C8.

**Next action (original entry):** owner exports to `emergent/phase-1-center-foundation` and reports SHA; CI result on that SHA decides the Compose/CI rows.
