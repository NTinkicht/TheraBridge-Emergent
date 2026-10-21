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
- P1 (not authorized): clinical milestone, covering therapy plans and approvals, session notes and progress reports. It needs an owner-approved clinical policy; clinical capabilities stay DENY until then. Also: parent messaging and notifications, recurring appointments, a calendar grid.
- P2: TB-EM-006 responsive/a11y pass + handover; Phase 2/3.

## Next tasks
- 2026-10-20 TB-EM-D01 design direction "Calm Precision, with warmth at home": `/design-preview` with 5 representative screens plus family dark, a shared design kit and token additions. Awaiting owner approval before it is applied across V1.
- 2026-10-20 TB-EM-D01 r2: owner approved the direction, with Jakarta headings and Plex body/data. Fixed platform metric states, added scroll cues, removed the dark flash, added focus and accessibility fixes and client-only dates. Testing agent iteration_6 passed 100%. 21 acceptance screenshots committed. Awaiting independent visual acceptance.

- 2026-10-20 Design baseline ACCEPTED by owner. r3 polish done locally (desktop platform/family spacing, wrapping mobile activity names, outdated doc lines removed). TB-EM-001 proposal written at docs/emergent/workunits/TB-EM-001.md; ADR-0006 (local sign-in, OIDC-ready) chosen; review after every checkpoint. TB-EM-001 NOT approved, NOT started. Owner account for seeding: nassim.tinkicht@gmail.com (password from env).

Wait for owner approval of TB-EM-001 and the next exported SHA.

- 2026-10-20 TB-EM-001 APPROVED WITH CHANGES (R1 owner bootstrap separate from seed and never in preview; R2 no secrets in Git, memory/test_credentials.md pointers only; R3 session-bound CSRF + Origin + rotation; R4 deny-by-default + escalation protection, clinical DENY; R5 multi-instance PG-backed rate limits + trusted proxies). Recorded in workunits/TB-EM-001.md and ADR-0006. CI run 39474586243 (66254a1) green, test + compose. Checkpoint 0 IMPLEMENTED: probe endpoints, guard and env flag removed, table dropped, schema_info placeholder added; 8/8 API tests. Owner account is NOT seeded; it is created only via a future bootstrap:owner CLI run by the owner outside the preview.

STOP: export checkpoint 0 and wait for independent review. Checkpoint A is not authorized.

- 2026-10-20 Review of the checkpoint 0 export 217c94ac87b2 (CI green) found the secret scan missing. Added the `secret-scan` CI job (gitleaks 8.30.1, checksum-pinned, full history + tracked files, redacted), `.gitleaks.toml` and `.gitleaksignore`. The initial historical scan of all public branches is clean. STOP for independent verification; checkpoint A is not authorized.

- 2026-10-21 Owner: checkpoint 0 ACCEPTED (CI 39538891912). New continuous policy: implement work units in order, export per checkpoint, record non-blocking issues instead of pausing, and stop only for genuine blockers. Issues #3 and #4 are left alone.
- 2026-10-21 TB-EM-001 checkpoints A, B and C IMPLEMENTED: sign-in, sessions, CSRF, lockout, tenancy, roles, deny-by-default authorization, CLIs, and the auth screens with the authenticated shell. 133/133 API tests; testing agent iteration 7 (fixes applied after it). Synthetic seed loaded on the preview. Export and CI pending. Non-blocking issues are in docs/emergent/qa/OPEN_ISSUES.md. Next: TB-EM-002.

- 2026-10-21 TB-EM-001 accepted by the owner (non-blockers are GitHub #5–#11; the Docker smoke fix is PR #12 on GitHub, not to be touched in Emergent). TB-EM-002 center applications IMPLEMENTED: public /apply, platform review and decision with rationale, an append-only history trigger, optimistic concurrency and permissions. Approval stays separate from provisioning (TB-EM-003). 167/167 API tests; testing agent iteration 8 with fixes applied. Export pending. Next: TB-EM-003 provisioning.

- 2026-10-21 TB-EM-003/004 merged into one milestone (GitHub #18) and IMPLEMENTED. Covers platform center creation, both from an approved application and directly: transactional, unique slug, duplicate prevention, history and audit. First-admin invitations support resend, expiry, revoke and replace. Acceptance works for new and existing users, and the session lands in the correct center and role. The setup checklist persists across 4 steps, and center details and own profile can be edited. Staff can be invited with multiple roles, specialties and responsibilities. The directory supports search and filters. Admins can edit roles, suspend, reactivate and revoke, with last-admin and self protection. Tenant isolation is enforced, and center history is append-only. Invitation tokens are stored hashed only and delivered to the local outbox only. 244/244 API tests; testing agents iteration 9 then iteration 10 PASS. Test data cleaned. Export pending. Docs: workunits/TB-EM-003-004.md.

- 2026-10-21 Owner ACCEPTED TB-EM-003/004 (CI 244/244 and secret scan verified; Docker smoke is PR #12; N12–N16 are GitHub #19–#23). TB-EM-005 trials (#24) and TB-EM-006 Center Operations are IMPLEMENTED.
  - Trials: 30 days, 3 therapist seats including pending invitations, 1 active child. After expiry the center is read-only; platform extension is recorded with a reason.
  - Center operations: child registration and profiles, archive and restore. Guardians with family-portal invitations, primary contact and removal. Therapist–child assignments per service. Appointments with double-booking prevention, moves, cancellations and attendance, all in the center's time zone. Role dashboards: admin/coordinator, supervisor, therapist "My day".
  - Parent home: warm theme with children, care team and upcoming visits.
  - Verification: 301/301 API tests; testing agents iteration 11, then iteration 12, then fixes. Test data cleaned; seed kept. Export pending. Docs: workunits/TB-EM-005-006.md.

- 2026-10-21 Owner ACCEPTED TB-EM-005/006 (CI 301/301; non-blockers are GitHub #25–#29). TB-EM-007 Parent Experience Round 2 + Scheduling IMPLEMENTED:
  - Scheduling: recurring series (weekly or every 2 weeks) with DST-safe center time, clash list and skip, exceptions, "this and following" edit and cancel. Day/week calendar grid with therapist and child filters. Booking choices filtered by assignments; assigning requires the matching specialty.
  - Reminders: 24-hour reminders and near-term change notices to the restricted outbox only (idempotent, guardian opt-out).
  - Family view: upcoming visits with status, attendance history and counts, appointment-email switch.
  - Messages: operational, non-clinical guardian↔care-team threads with per-role scope, close/reopen, unread tracking, append-only messages and immediate revocation.
  - Verification: 329/329 API tests; testing agent iteration 13 plus fixes. Docs: workunits/TB-EM-007.md. Export pending.

## Backlog (current)
- 2026-10-21 Owner ACCEPTED TB-EM-009 (CI 374/374; #41–#44). TB-EM-010 Family Home Practice and Outcomes IMPLEMENTED. It covers the family Today/Week/History sample activity views and fixed-choice outcomes with confirmation, idempotency keys and success/failure/unknown states. It adds a therapist Practice feedback inbox with filters and acknowledgement, and keeps outcomes in their own table, separate from observations. Recording is gated by FAMILY_PRACTICE_DEMO (off in prod/staging) and the table only accepts synthetic records. 399/399 API tests; testing agent iteration 16 plus fixes. Docs: workunits/TB-EM-010.md.
- 2026-10-21 Owner ACCEPTED TB-EM-008 (CI 367/367; #36–#40 recorded). TB-EM-009 Progress Tracking, Report Drafting and Family Progress Demo IMPLEMENTED. It covers goal charts, the dashboard with filters, factual report drafts with autosave, conflicts, immutable versions and compare, supervisor comments and return, an unreleased family-safe preview, and a guardian sample demo. Release records live in a separate locked table. 374/374 API tests; testing agent iteration 15 plus fixes. Docs: workunits/TB-EM-009.md.
- 2026-10-21 Owner ACCEPTED TB-EM-007 (CI 329/329; N20–N24 = #30–#34; messaging safeguarding #35). TB-EM-008 Therapist Clinical Workspace IMPLEMENTED (synthetic drafts only). It covers assessments, versioned plans and goals with supervisor review, session drafts, observations with history, activity templates with steps and safety guidance, home activities with a staff-only family preview, and family sample activity screens. Signing, approval and release stay DENY. Messaging is now recipient-specific and demo-gated. 367/367 API tests; testing agent iteration 14 plus validation fixes. Docs: workunits/TB-EM-008.md.
- P0: owner export of TB-EM-008 + CI; confirm N25 (new version withdraws the one in review).
- P1: owner-approved clinical policy before any signing, approval or release; approved email provider; D-NEW-5 safeguarding for messaging.
- P0: owner export of TB-EM-007 + CI; confirm household-thread and post-trial messaging policies.
- P1: clinical milestone (needs approved clinical policy); approved email provider; nav unread badge / push.
- P2: N20–N24 (series split, drag-to-move, configurable notice window).
