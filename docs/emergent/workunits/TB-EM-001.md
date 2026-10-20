# TB-EM-001 — Authentication, sessions and foundational role/permission model

Status: **PLANNED — awaiting owner approval. Nothing below is IMPLEMENTED** except the design polish in checkpoint 0, which the owner authorized separately.

Owner decisions (2026-10-20): ADR-0006 option accepted (local sign-in, OIDC-ready); independent review after every checkpoint; design polish done now. Probe retirement waits for approval of this work unit.
Prepared: 2026-10-20. Baseline: design direction "Calm Precision, with warmth at home" (accepted).

## 1. Objective

Give TheraBridge a real, portable sign-in with server-side sessions and a deny-by-default role/permission model, so every later work unit (TB-EM-002 onwards) can rely on an authenticated identity, an active tenant context and explicit permission checks on the server.

Linked workflows: Blueprint §4 (identity, tenants, authorization), §5A (login, recovery, context selection), Journey 8 (revocation takes effect immediately), Journey 9 (one source of truth).

## 2. Scope

### In scope

**Checkpoint 0 — design polish and probe retirement (small, first)**
- Reduce unnecessary empty space on the desktop platform and family preview screens.
- Stop truncating meaningful activity names on narrow mobile screens (wrap to two lines; no ellipsis on names).
- Remove outdated statements in design documents that describe already-fixed problems.
- Remove `POST /api/health/probe`. Drop the `feasibility_probe` table in a migration. `GET /api/health` remains.

**Checkpoint A — identity and sessions (API)**
- Local email/password sign-in: Argon2id hashing (`argon2` package, OWASP parameters: m=19 MiB, t=2, p=1).
- Password policy (NIST SP 800-63B style): 12–128 characters, no composition rules, rejected if it is on a bundled common-password list or matches the email.
- Opaque 256-bit session token in cookie `tb_session` (HttpOnly, Secure, SameSite=Lax, Path=/). Only the SHA-256 hash is stored in PostgreSQL.
- Session limits: 30 min idle, 12 h absolute. A new session is issued on login, on password change and on context switch.
- Logout, logout from all devices, and server-side revocation.
- CSRF protection: double-submit cookie `tb_csrf` plus `X-CSRF-Token` header, plus an Origin allow-list for every POST/PUT/PATCH/DELETE.
- Brute-force protection: 5 failures in 15 min locks the account for 15 min, plus a per-IP rate limit. Error messages are generic and response timing is the same for unknown emails (a dummy hash is checked).
- Password recovery: single-use hashed token, 30 min expiry. A successful reset revokes all sessions. No real email is sent in TB-EM-001: in local development the link goes to a dev mailbox, which is never registered on the Emergent preview or in production.
- Change password while signed in.
- Audit events for login success/failure, lockout, logout, logout-all, password reset requested/completed, password changed and context switched. Events never contain passwords, tokens or full IP addresses (IPs are truncated).

**Checkpoint B — tenancy, roles and permissions (API)**
- Minimal `Center` tenant record (id, slug, name, status, timezone). Applications, trials and provisioning stay in TB-EM-002/003/005.
- `Membership` (user ↔ center, status active/suspended/revoked) with `RoleAssignment` per membership.
- Platform role (`PLATFORM_ADMIN`) held through a separate `PlatformRoleAssignment`, never through a center membership.
- Six roles modelled: PLATFORM_ADMIN, CENTER_ADMIN, COORDINATOR, THERAPIST, CLINICAL_SUPERVISOR, GUARDIAN.
- `CapabilityAssignment` table created for scoped powers (signing clinician, safeguarding lead, scheduler). None can be granted in TB-EM-001, and every clinical capability evaluates to DENY.
- A permission matrix in code (`apps/api/src/authz/policy.ts`) with a typed `Permission` list and `role → permissions` map, deny by default. Exported as `docs/emergent/security/PERMISSIONS_MATRIX.md`.
- NestJS guards: a global `SessionGuard` (routes are protected unless marked `@Public()`), plus `TenantGuard` and `PermissionGuard` (`@RequirePermission(...)`). Membership and role are re-read from the database on every request, so suspension or revocation takes effect on the next request.
- Context selection: users with several memberships pick a center and role. The active membership is stored on the session row.
- Two minimal protected endpoints whose only purpose is to prove the guards work: `GET /api/platform/summary` (platform admin: center count only) and `GET /api/centers/:centerId/summary` (active member of that center: name and member count only). No clinical data.

**Checkpoint C — screens, seed and handover (web)**
- `/login` split screen per Blueprint §5A (about a 625 px brand panel and a 550 px form at 1440 px; stacks with a compact brand strip on mobile).
- `/forgot-password`, `/reset-password`, `/select-context`, `/account/security` (change password, sign out everywhere), `/access-denied`, and an expired-session state.
- Authenticated app shell using the approved design kit. The platform and center home pages show the real summary endpoints; every future module is visible but disabled, with the work unit that will deliver it.
- Next.js middleware only redirects when the cookie is missing. All real authorization happens in the API.
- Idempotent seed script (`yarn seed`) with synthetic data (§5).
- Updated handover pack, ADR-0006, permissions matrix, traceability table and screenshots at 320/390/768/1024/1440.

### Out of scope (not built in TB-EM-001)
- External OIDC provider, MFA, social login, email delivery (Resend or similar), invitations and account activation (TB-EM-004), center applications/provisioning (TB-EM-002/003), trials and limits (TB-EM-005), children, guardian grants, specialties, and any clinical permission. No clinical access path exists.

## 3. Decision requiring approval — OIDC (Blueprint §8)

The blueprint asks for "standards-based OIDC authentication". An external OIDC provider (for example Keycloak) cannot run inside the Emergent workspace, which has no Docker.
**Proposal (ADR-0006):** TheraBridge acts as its own first-party identity provider for V1 development. `AuthIdentity(provider, subject)` is designed so an OIDC provider can be added later without data migration (`provider='local'` now, `provider='oidc:<issuer>'` later). This is a recorded deviation, not a silent substitution.

## 4. Data model and migrations (Prisma)

| Migration | Contents |
|---|---|
| `<ts>_tb_em_001_retire_feasibility_probe` | Drop `feasibility_probe` |
| `<ts>_tb_em_001_identity_sessions` | `user`, `auth_identity`, `session`, `login_attempt`, `verification_token`, `audit_event` |
| `<ts>_tb_em_001_tenancy_roles` | `center`, `membership`, `role_assignment`, `platform_role_assignment`, `capability_assignment`; enums `Role`, `MembershipStatus`, `CenterStatus`, `Capability` |

Key constraints:
- `user.email_normalized` is unique.
- `auth_identity` is unique on (provider, subject).
- `session.token_hash` is unique and indexed together with (user_id, revoked_at).
- `membership` is unique on (user_id, center_id); `role_assignment` is unique on (membership_id, role).
- Foreign keys use `ON DELETE RESTRICT`.
- `audit_event` is append-only (enforced in the service; a database trigger is planned for Phase 5).

All migrations are forward-only and reversible by a follow-up migration. Each one is tested on an empty database and on the TB-EM-000 database.

## 5. Synthetic seed data

| Account | Role / scope |
|---|---|
| nassim.tinkicht@gmail.com (owner) | PLATFORM_ADMIN. The password comes from `SEED_OWNER_PASSWORD` in the environment and is never committed. |
| `platform.ops@therabridge.test` | PLATFORM_ADMIN (synthetic) |
| `admin@harbor.therabridge.test` | CENTER_ADMIN — Harbor Child Development Center |
| `admin@cedar.therabridge.test` | CENTER_ADMIN — Cedar Grove Therapy Collective (second tenant, for isolation tests) |
| `coordinator@harbor.therabridge.test` | COORDINATOR — Harbor |
| `leila.hassan@harbor.therabridge.test` | THERAPIST — Harbor (dual specialty modelled later, in Phase 2) |
| `multi@therabridge.test` | THERAPIST at Harbor + CENTER_ADMIN at Cedar (context-selection tests) |
| `sara.morgan@family.therabridge.test` | GUARDIAN — Harbor (no child link yet) |
| `suspended@harbor.therabridge.test` | Suspended membership (revocation tests) |

Synthetic passwords come from `SEED_DEMO_PASSWORD` in the environment and are recorded only in `/app/memory/test_credentials.md` (never shown on a page).

## 6. API contract (all under `/api`, JSON only)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /auth/csrf | public | Sets `tb_csrf` |
| POST | /auth/login | public + CSRF | 200 + `tb_session`; 401 generic; 429 when locked |
| POST | /auth/logout | session | Revokes the current session |
| POST | /auth/logout-all | session | Revokes all sessions of the user |
| GET | /auth/session | session | User, memberships, active context, effective permissions |
| POST | /auth/context | session | `{membershipId, role}` or `{platform:true}`; rotates the session |
| POST | /auth/password/forgot | public + CSRF | Always 202 |
| POST | /auth/password/reset | public + CSRF | 204; revokes all sessions |
| POST | /auth/password/change | session | Current password required; rotates the session |
| GET | /platform/summary | PLATFORM_ADMIN | Guard proof only |
| GET | /centers/:centerId/summary | active member | Guard proof only; 404 (not 403) for other tenants |
| GET | /dev/mailbox | local dev only | Not registered unless NODE_ENV≠production, DEV_MAILBOX_ENABLED=true and the request comes from localhost |

## 7. Acceptance criteria (all must be TESTED: PASS)

1. A valid login creates a session row (hash only) and an HttpOnly/Secure/SameSite=Lax cookie. The raw token is never stored or logged.
2. A wrong password and an unknown email return the same 401 body and similar timing. The 6th failure in 15 min returns 429, and the account unlocks after the window.
3. Idle expiry (30 min) and absolute expiry (12 h) are enforced on the server, tested with an injected clock. The UI shows the expired-session state, never stale data.
4. Logout and logout-all invalidate the cookie on the next request. Other devices stay valid after logout but not after logout-all.
5. A state-changing request without a valid CSRF token or with a foreign Origin returns 403.
6. A reset token works once, expires after 30 min, is stored only as a hash, and revokes existing sessions.
7. Every protected route without `@Public()` returns 401 without a session. This is checked by an automated test that walks all registered routes.
8. Tenant isolation: a Harbor member gets 404 on Cedar's summary. A suspended or revoked membership is denied on the very next request, without logging out.
9. A platform admin without a center membership cannot use center endpoints. Center roles cannot use platform endpoints. Every clinical permission evaluates to DENY for every role, including PLATFORM_ADMIN.
10. A multi-membership user must pick a context. Switching context rotates the session and changes the effective permissions.
11. Audit events are written for every auth event listed in §2, with no secrets in them.
12. The dev mailbox returns 404 on the Emergent preview and when disabled.
13. The login and auth screens meet the design baseline: Plus Jakarta/Plex, keyboard-only use, visible focus, labelled errors, no horizontal overflow at the 5 widths.
14. The clean-clone pipeline passes: install, migrate, seed, test, typecheck and build.

## 8. Tests

- **API (Jest + Supertest against real PostgreSQL):** about 60–80 cases covering criteria 1–12, including the route-walk test and a table-driven permission-matrix test (role × permission → expected allow/deny).
- **Unit:** policy evaluation, password policy, token hashing, clock-based expiry.
- **Web:** typecheck, production build, Playwright screenshots at 5 widths, and an independent testing-agent run per checkpoint for the browser flows (login, lockout message, context selection, expired session, logout, access denied).
- **Results** are recorded in `docs/emergent/qa/TEST_RESULTS.md` using IMPLEMENTED / TESTED: PASS / FAIL / PLANNED / NOT RUN.

## 9. Checkpoints (GitHub, never force-pushed)

| Checkpoint | Contents | Stop for independent review? |
|---|---|---|
| 0 | Design polish (done) + probe retirement (after approval) | yes |
| A | Identity + sessions API + tests | yes |
| B | Tenancy + roles + permission guards + tests | yes |
| C | Screens + seed + docs + screenshots | yes (end of work unit) |

Each checkpoint is committed, exported to `phase-1-center-foundation` as a fast-forward, and its SHA and CI result are recorded in `CURRENT_STATE.md`.

## 10. Credit estimate (rough ESTIMATE, not a quote)

| Part | Estimate |
|---|---|
| Checkpoint 0 | small: about 5–10% of the work unit |
| Checkpoint A | about 30% |
| Checkpoint B | about 30% |
| Checkpoint C | about 30% |

Overall, this work unit should be roughly 2–3 times the size of TB-EM-000 including its correction round, because it has three times the API surface and four independent test runs. The biggest cost risks are rework after independent review, Docker/CI items that cannot be checked inside Emergent, and extra rounds of independent testing. Stopping for review after every checkpoint adds a small fixed cost per stop but lowers rework risk.

## 11. Risks

- The Emergent preview serves web and API on one origin, which SameSite=Lax relies on. A split-origin deployment would need `SameSite=None` plus a stricter Origin check (documented in ADR-0006).
- Argon2 is a native module. CI and Dockerfiles must build it (`node:20-bookworm-slim` with prebuilt binaries); this is verified in CI.
- The workspace PostgreSQL is not managed by Emergent (ADR-0004).
