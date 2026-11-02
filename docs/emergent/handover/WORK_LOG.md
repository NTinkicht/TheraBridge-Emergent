## 2026-10-31 — M2-H08 implementation checkpoint

PR #146 implements non-root API/web/preview Docker runtimes with healthchecks; preview dual-process 192 MiB V8 old-space bounds; CI cancellation and job limits; shared canonical governance and order-sensitive report fingerprint primitives with golden regressions; removes clinical-to-operations Viewer type dependency; adds web upstream-origin unit tests and a Jest-measured API fingerprint core coverage gate. Exact-head integration, review and merge not yet qualified at writing. Synthetic only.

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

## TB-EM-002 center applications (2026-10-21)

**Owner:** TB-EM-001 accepted. Non-blockers filed as #5–#11. The Docker smoke fix is PR #12 (handled on GitHub).

**API**
- `POST /api/center-applications`: public, pre-auth CSRF, strict validation, 5 per network per hour, one open application per email.
- Platform list, search and detail.
- `start-review` and `decision`, with optimistic concurrency (`version`), a required rationale, an append-only `application_event` and audit events.
- Permissions `platform.applications.read` and `platform.applications.decide` (PLATFORM_ADMIN only).
- Approval creates no center; it is marked AWAITING_PROVISIONING for TB-EM-003.

**Web**
- `/apply`.
- `/app/applications`: tabs with counts, search, pagination, loading, empty and error states.
- `/app/applications/[id]`: details, decision panel, history, disabled "Provision center".
- Pending-applications metric on the platform home.

**Tests:** 167/167 API tests; testing agent iteration 8; fixes applied afterwards.

**Open items:** N8–N11.


## TB-EM-001 checkpoints A, B, C (2026-10-21)

**Owner decision:** checkpoint 0 ACCEPTED (run 39538891912). A, B and C authorized under the continuous-delivery policy.

**A: sign-in and sessions** (`fe61fe1`)
- Argon2id passwords and hashed server sessions with 30 min idle / 12 h absolute limits and rotation.
- Session-bound CSRF, an HMAC pre-auth token, and Origin/Referer/Sec-Fetch-Site checks.
- PostgreSQL-backed lockout and IP limits, shared across instances, with trusted-proxy IP resolution.
- Password reset and change, and a dev mailbox for local use only.
- Audit events, and a boot-time check that every route declares its access.

**B: tenancy and roles** (`43a6921`)
- Centers, memberships, role assignments and platform roles, with database constraints against escalation.
- Deny-by-default policy in which clinical capabilities are always denied, plus context selection with rotation.
- Two summary endpoints that prove the guards work.
- `bootstrap:owner` (TTY only, refuses preview and ci) and `seed:synthetic` (disposable passwords in a gitignored file).

**C: screens** (`1a2af51` plus fixes)
- Login, forgot and reset password, workspace selection, home with live summaries, account security and access denied.
- Expired-session handling and the middleware redirect.

**Security tooling**
- Secret-scan rules tightened: quoted literals, plus env-style files only.
- Test passwords are generated at runtime.
- 2 historical synthetic fixtures recorded in `.gitleaksignore`.
- `.emergent/cron/` gitignored.

**Tests**
- API: 133/133.
- Testing agent: backend 18/18; frontend 14/15. The failing reset flow and three minor findings are fixed.
- Clean clone and secret scan pass.

**Open items:** non-blocking issues are listed in `qa/OPEN_ISSUES.md`. Export and CI are pending.


## TB-EM-001 checkpoint 0 correction: secret scan (2026-10-20)

**Review finding:** the spec claimed a CI secret scan, but `ci.yml` had none (export `217c94ac87b2`, whose CI test and compose jobs were green).

**Changed:**
- Added a `secret-scan` job using gitleaks 8.30.1, version- and SHA-256-pinned. It covers the full history and the tracked files, redacts values and fails on any finding.
- Added `.gitleaks.toml` (default rules plus a TheraBridge credential-assignment rule) and `.gitleaksignore` (1 reviewed fingerprint).
- Documentation updated.

**Initial historical scan:** all 4 public branches, 0 findings after review. Each of the 6 raw hits was a false positive.

**Stop:** export, then wait for independent verification. Checkpoint A is not authorized.


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

### TB-EM-011 — 2026-10-21

Implemented the owner-authorized synthetic governance foundation on an isolated branch from `90e474f`. Preserved accepted #45 navigation and #47 transactional revocation fixes. Addressed intersecting N25/#39/#40/#43/#44 behavior, added immutable snapshot/history and non-authorizing consent/release/transfer structures and role-restricted governance screens. Canonical private-spec access remains unavailable; all named clinical policy decisions remain blocked. See `../workunits/TB-EM-011.md` and `artifacts/tb-em-011/VALIDATION.md` for actual tests and export handoff. No merge/deployment/clinical activation.
