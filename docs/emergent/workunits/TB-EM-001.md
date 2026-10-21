# TB-EM-001 — Authentication, sessions and foundational role/permission model

Status: **APPROVED WITH CHANGES by the owner (2026-10-20)**. The mandatory corrections (R1–R5) are recorded below.
Execution authorization: checkpoint 0 ACCEPTED (CI run 39538891912). Checkpoints A, B and C were authorized on 2026-10-21 under the continuous-delivery policy and are **IMPLEMENTED** (see `qa/TEST_RESULTS.md`).

**Deviations recorded during implementation (2026-10-21)**
- The CSRF token is derived as `HMAC(AUTH_SECRET, session token)` instead of storing `csrf_secret_hash`. It is still session-bound and changes on every rotation, and no extra secret is stored.
- Fastify `trustProxy` is off; `resolveClientIp()` applies `TRUSTED_PROXY_CIDRS` itself.
- The `bootstrap:owner` and `seed:synthetic` CLIs landed in checkpoint B, because they need the tenancy tables.
- `schema_info` was dropped in the checkpoint A migration.
Owner decisions: ADR-0006 (first-party sign-in, OIDC-ready); an independent review stop after every checkpoint.
Design baseline: "Calm Precision, with warmth at home" (accepted).

## 1. Objective

Give TheraBridge a real, portable sign-in with server-side sessions and a deny-by-default role/permission model, so later work units can rely on four things:
- an authenticated identity;
- an active tenant context;
- explicit permission checks on the server;
- tamper-resistant request protection.

Linked workflows: Blueprint §4 (identity, tenants, authorization), §5A (login, recovery, context selection), Journey 8 (revocation takes effect immediately), Journey 9 (one source of truth).

## 2. Mandatory owner corrections (2026-10-20)

| # | Correction | Where it is applied |
|---|---|---|
| R1 | Real-owner bootstrap is separate from synthetic seeding. A real owner account is never created in a public preview or shared synthetic environment. | §3.A "Bootstrap and seed", §6, AC-15–17 |
| R2 | Credentials, passwords, tokens and recovery secrets are never written to Git-tracked files, `memory/test_credentials.md` included. Test credentials stay local and disposable. | §6, AC-18, CI secret scan |
| R3 | CSRF protection is session-bound and tamper-resistant, with Origin validation, secure cookie configuration and session rotation, all covered by integration tests. | §3.A "CSRF and cookies", AC-5–7 |
| R4 | Authorization is deny-by-default for every role and tenant. Membership alone grants nothing. Platform-admin assignment is protected against escalation. All clinical capabilities are DENY. | §3.B, AC-8–12 |
| R5 | Auth rate limiting and lockout are safe across multiple instances, with correctly configured trusted proxies and regression tests. | §3.A "Brute force", AC-2–3, AC-13–14 |

## 3. Scope by checkpoint

### Checkpoint 0: design polish and probe retirement (authorized)
- Design polish: **ACCEPTED** by independent review on 2026-10-20.
- Remove `POST /api/health/probe` and `GET /api/health/probe`, the probe guard, its DTO and the `PROBE_WRITES_ENABLED` variable.
- Drop the `feasibility_probe` table with the forward migration `20261020190000_tb_em_001_retire_feasibility_probe`.
- `GET /api/health` remains, without the `probeWrites` block. The TB-EM-000 page keeps the live stack check only.
- CI Compose smoke test: `/api/health` responds, the old probe route returns 404, and the web page renders.

### Checkpoint A: identity, sessions, CSRF, brute force (API). Not authorized yet.

**Passwords**
- Argon2id (`argon2` package, OWASP parameters m=19 MiB, t=2, p=1). Hashes are upgraded transparently on login when parameters change.
- Password policy (NIST SP 800-63B): 12–128 characters, no composition rules. A password is rejected if it is on a bundled common-password list or contains the email's local part.

**Sessions**
- The session token is 256 random bits. Only `SHA-256(token)` is stored, in `session.token_hash`.
- Limits: 30 min idle, 12 h absolute, both enforced on the server from the session row through an injectable clock.
- **Rotation (R3).** A brand-new session row and token, with the old row revoked, is issued on:
  - login, which discards any pre-login state and prevents session fixation;
  - context switch;
  - password change.
- A password reset revokes all of the user's sessions.
- Logout revokes the current session. "Sign out everywhere" revokes all of the user's sessions.

**CSRF and cookies (R3)**
- Session cookie `__Host-tb_session`: HttpOnly, Secure, SameSite=Lax, Path=/, no Domain.
  - `COOKIE_SECURE` is required, with no default. The API refuses to boot with `COOKIE_SECURE=false` unless `DEPLOYMENT_ENV` is `local` or `ci`. In those two cases the cookie name drops the `__Host-` prefix.
- **Session-bound synchronizer token.**
  - Each session row stores `csrf_secret_hash`.
  - The raw CSRF token is returned only in the JSON body of `GET /api/auth/session`, and it is never readable from a cookie.
  - Every authenticated POST/PUT/PATCH/DELETE must send `X-CSRF-Token`. It is compared in constant time against the current session's secret.
  - A token from another session, or from a session that has since been rotated, is rejected.
- **Pre-session (login CSRF).**
  - The login, forgot-password and reset-password endpoints require a pre-auth token from `GET /api/auth/csrf`.
  - The token is HMAC-SHA-256 signed (key: `AUTH_SECRET`, required, at least 32 bytes) and binds a random nonce to a short-lived `__Host-tb_pre` cookie (HttpOnly, 10 min).
  - Tampered, expired or mismatched tokens are rejected.
- **Origin validation.**
  - Every unsafe method needs an `Origin` that matches the `CORS_ORIGINS` allow-list.
  - If `Origin` is missing, `Referer` is checked against the same allow-list. If both are missing, the request is rejected.
  - `Sec-Fetch-Site: cross-site` is always rejected.
- Only JSON bodies are accepted (415 otherwise; already in place).
- Responses set `Cache-Control: no-store` on all `/api/auth/*` routes.

**Brute force (R5): safe across multiple instances**
- All counters live in PostgreSQL, never in process memory, so every API instance shares them. Updates are atomic: `INSERT … ON CONFLICT … DO UPDATE … RETURNING` inside a transaction.
- Two limits apply:
  - **Per account:** 5 failures in 15 min locks sign-in for that account for 15 min. The key is `HMAC(normalized email)`, so unknown emails behave identically.
  - **Per client IP:** 30 failed attempts in 15 min, then 429.
- Lockout returns the same generic message as a wrong password. A successful login clears only the per-account counter.
- Timing is equalized: unknown emails are verified against a dummy Argon2 hash.
- A `RateLimitStore` interface keeps a Redis backend possible later (blueprint §8) without changing callers.
- **Trusted proxies.**
  - `TRUSTED_PROXY_CIDRS` is required, with no default. An empty value means "trust none".
  - Fastify `trustProxy` is configured from it. The client IP is the first `X-Forwarded-For` hop that is not inside a trusted CIDR. `X-Forwarded-For` sent by an untrusted peer is ignored.
  - Inside Emergent, the workspace proxy (ADR-0005) must forward `X-Forwarded-For`. This is verified in checkpoint A.

**Recovery and audit**
- Password recovery uses a single-use token. Only its hash is stored, it expires after 30 min, and the request always returns 202.
- No email is sent in TB-EM-001. The dev mailbox exists only when **all** of these hold: `DEPLOYMENT_ENV=local`, `DEV_MAILBOX_ENABLED=true`, and a loopback peer address. It is never registered on the Emergent preview or in CI.
- Audit events (append-only) are written for: login success, login failure, lockout, logout, logout-all, reset requested, reset completed, password changed, context switched, session rotated, CSRF rejected and Origin rejected.
- No passwords, tokens or secrets are stored in audit events. IP addresses are truncated (/24 for IPv4, /48 for IPv6).

**Bootstrap and seed (R1, R2)**
- **Owner bootstrap** is an operator-only CLI: `yarn workspace @therabridge/api bootstrap:owner --email <email>`. There is no HTTP route.
  - The password is read from an interactive TTY prompt, entered twice. It is never accepted from arguments, environment variables or files.
  - It refuses to run unless `DEPLOYMENT_ENV` is `local`, `staging` or `production` and `BOOTSTRAP_OWNER_ALLOWED=true`.
  - It always refuses when `DEPLOYMENT_ENV` is `preview`, `shared-synthetic` or `ci`.
  - It refuses if any platform administrator already exists. A later admin needs an existing admin plus a future approved workflow.
  - It writes an audit event.
  - **It is never run in the Emergent preview.** The owner's real account is created only by the owner, in an environment the owner controls.
- **Synthetic seed** (`yarn workspace @therabridge/api seed:synthetic`) creates only `@therabridge.test` accounts.
  - It refuses when `DEPLOYMENT_ENV` is `production` or `staging`.
  - It generates a fresh random password per account on every run. The passwords go only to the gitignored file `.workspace/local-credentials/synthetic-accounts.json` (mode 0600) and nowhere else: not stdout, logs, Git or `memory/`.
  - Re-running the seed rotates all synthetic passwords and revokes their sessions, which makes the credentials disposable.

### Checkpoint B: tenancy, roles, permissions (API). Not authorized yet.

**Entities**
- `Center`: id, slug, name, status (`active` / `suspended`), timezone.
- `Membership`: user ↔ center, status `active` / `suspended` / `revoked`.
- `RoleAssignment`, attached to a membership.
- `PlatformRoleAssignment`: a separate table with `granted_by_user_id` and a reason.

**Deny-by-default (R4)**
- A global `AuthzGuard` rejects at boot any route that has neither `@Public()` nor `@RequirePermission(...)`. A route-walk test proves every route is classified.
- Permissions come only from an **active RoleAssignment**, on an **active Membership**, in an **active Center**, or from an active `PlatformRoleAssignment`. They are re-read from PostgreSQL on every request.
- **Membership alone grants nothing.** A membership with no role assignment has an empty permission set.
- No role implies another role. PLATFORM_ADMIN grants no center permissions, and CENTER_ADMIN grants no platform permissions.
- Tenant scope is taken from the route (`:centerId`), never from the request body. The resolved active context must match it, otherwise 404 is returned so other centers' existence isn't revealed.

**Privilege-escalation protection**
- TB-EM-001 exposes **no HTTP endpoint that creates or changes** `PlatformRoleAssignment`, `RoleAssignment` or `Membership`.
- DTOs use whitelist validation, so fields like `role`, `isPlatformAdmin` or `centerId` in a body are rejected with 400.
- A database CHECK prevents a `PlatformRoleAssignment` from being self-granted, except for the single audited bootstrap record (`granted_by_user_id IS NULL AND source='bootstrap'`). A partial unique index allows only one bootstrap record.

**Clinical capabilities**
- A typed `Capability` list (sign, co-sign, approve, release, safeguarding lead, recording) exists in code. `policy.can()` returns **DENY** for each of them for every role, PLATFORM_ADMIN included.
- No capability table exists until an owner-approved clinical policy exists, so nothing can be granted.

**Context and guard-proof endpoints**
- Context selection: users with several memberships pick a center and role, and the session rotates.
- Two guard-proof endpoints return no clinical data:
  - `GET /api/platform/summary`: needs PLATFORM_ADMIN; returns the center count only.
  - `GET /api/centers/:centerId/summary`: needs a CENTER_ADMIN, COORDINATOR or THERAPIST role in that center; returns the name and member count only.

### Checkpoint C: screens, design, handover (web). Not authorized yet.
- **Screens:** `/login` (split screen per Blueprint §5A), `/forgot-password`, `/reset-password`, `/select-context`, `/account/security`, `/access-denied`, and an expired-session state, all built with the accepted design kit.
- **Authenticated shell:** platform and center home pages call the real summary endpoints. Future modules are visible but disabled, each naming the work unit that will deliver it.
- **Next.js middleware** only redirects when no session cookie is present. All authorization happens in the API.
- **Evidence:** screenshots at 320/390/768/1024/1440, the permissions matrix, a traceability table and the handover pack.

### Out of scope
- External OIDC provider and MFA.
- Email delivery.
- Invitations and activation (TB-EM-004).
- Applications and provisioning (TB-EM-002/003).
- Trials (TB-EM-005).
- Children, guardian grants and specialties.
- Any clinical permission.
- Running the owner bootstrap anywhere Emergent-hosted.

## 4. Data model and migrations (Prisma)

| Migration | Checkpoint | Contents |
|---|---|---|
| `20261020190000_tb_em_001_retire_feasibility_probe` | 0 | `DROP TABLE feasibility_probe` |
| `<ts>_tb_em_001_identity_sessions` | A | `user`, `auth_identity`, `session` (token_hash, csrf_secret_hash, idle/absolute expiry, rotated_from_id, revoked_at), `rate_limit_counter` (key, window_start, count), `verification_token`, `audit_event` |
| `<ts>_tb_em_001_tenancy_roles` | B | `center`, `membership`, `role_assignment`, `platform_role_assignment`; enums `Role`, `MembershipStatus`, `CenterStatus` |

**Constraints**
- Unique: `user.email_normalized`, `auth_identity (provider, subject)` and `session.token_hash`.
- Unique: `membership (user_id, center_id)` and `role_assignment (membership_id, role)`.
- `platform_role_assignment` has a CHECK on `granted_by_user_id <> user_id` and the bootstrap partial unique index.
- Foreign keys use `ON DELETE RESTRICT`. Timestamps are `timestamptz`.

**Migration rules**
- Migrations are forward-only. Each is tested on an empty database and on the previous checkpoint's database.

## 5. API contract (under `/api`, JSON only)

| Method | Path | Checkpoint | Auth | Notes |
|---|---|---|---|---|
| GET | /health | 0 | public | API, database and migrations |
| GET | /auth/csrf | A | public | Pre-auth signed token + `__Host-tb_pre` cookie |
| POST | /auth/login | A | public + pre-auth CSRF + Origin | 200 and a new rotated session; 401 generic; 429 when the IP limit is hit |
| POST | /auth/logout | A | session + CSRF | |
| POST | /auth/logout-all | A | session + CSRF | |
| GET | /auth/session | A | session | User, memberships, active context, effective permissions, `csrfToken` |
| POST | /auth/password/forgot | A | public + pre-auth CSRF + Origin | Always 202 |
| POST | /auth/password/reset | A | public + pre-auth CSRF + Origin | 204; revokes all sessions |
| POST | /auth/password/change | A | session + CSRF | Rotates the session |
| POST | /auth/context | B | session + CSRF | Rotates the session |
| GET | /platform/summary | B | `platform.summary.read` | Guard proof |
| GET | /centers/:centerId/summary | B | `center.summary.read` in that center | 404 across tenants |
| GET | /dev/mailbox | A | local only | See §3.A |

## 6. Credentials and secrets policy (R1, R2)

**What is never committed**
- Nothing Git-tracked contains a password, token, reset link, session cookie, `AUTH_SECRET` or real-owner data. This covers `memory/`, `docs/`, test fixtures, CI files and `.env.example`.
- `memory/test_credentials.md` holds **pointers only**: account emails, roles and the path of the local credentials file. It never holds a password.

**Where values live**
- **Synthetic passwords:** random on each seed run, stored only in `.workspace/local-credentials/` (gitignored). Agents and testers read them there.
- **Test suites:** create their own users with random in-memory passwords and delete them afterwards.
- **CI:** generates `AUTH_SECRET` per run (`openssl rand`). Nothing is stored in the repository.

**Enforcement**
- **Implemented in checkpoint 0 correction (2026-10-20):** a `secret-scan` CI job.
  - It runs gitleaks **v8.30.1**, verified against the official release SHA-256 checksum.
  - It scans the **full Git history of all fetched refs** (`fetch-depth: 0`, `--log-opts=--all`) and **all tracked files** in the checkout.
  - It uses `--redact=100`, so values never appear in logs, and uploads no report artifact. Any finding fails CI with exit code 1.
- **Configuration:** `.gitleaks.toml` uses the gitleaks default rules plus the TheraBridge rule `therabridge-credential-assignment` (password, secret, token or API-key assignments with a literal value of 8+ characters, in any tracked file).
- **Allow-list:** the `CHANGE_ME*` placeholders, `ci_only_*` throwaway values, `${VAR}`/env references and kebab-case test IDs.
- **Reviewed false positives:** kept as fingerprints only, in `.gitleaksignore`.
- The real owner account (nassim.tinkicht@gmail.com) is **not** seeded anywhere and does not appear in seed code. It is created only by the owner, through `bootstrap:owner`, in an environment the owner controls.

## 7. Acceptance criteria (all must be TESTED: PASS; numbered for traceability)

**Sessions and cookies**
1. A valid login creates a new session row holding only hashes, and sets `__Host-tb_session` with HttpOnly, Secure, SameSite=Lax, Path=/ and no Domain. The raw token is never stored or logged.
2. A wrong password, an unknown email and a locked account all return the same 401 body. Unknown-email timing is within ±25% of the known-email median.
3. The 6th failure in 15 min locks the account. The lock clears after the window. 30 failures from one IP return 429.
4. Idle expiry (30 min) and absolute expiry (12 h) are enforced on the server through an injected clock.

**CSRF and Origin (R3)**
5. Every authenticated unsafe request returns 403 if any of these is true:
   - the CSRF header is missing or wrong;
   - the token belongs to another session;
   - the token predates a rotation;
   - the Origin or Referer is foreign or absent;
   - `Sec-Fetch-Site: cross-site` is sent.

   Pre-auth tokens that are tampered with (one changed byte), expired or cookie-mismatched return 403.
6. Session rotation happens on login, on context switch and on password change:
   - the old token returns 401;
   - the old CSRF token returns 403;
   - a cookie planted before login is never promoted to a session (fixation test).
7. Boot fails if `COOKIE_SECURE`, `AUTH_SECRET` (shorter than 32 bytes), `TRUSTED_PROXY_CIDRS` or `DEPLOYMENT_ENV` is missing or invalid. It also fails with `COOKIE_SECURE=false` outside local or CI.

**Authorization (R4)**
8. The route walk passes: every registered route is either `@Public()` or has `@RequirePermission`. A route without either fails boot. Every non-public route returns 401 without a session.
9. A membership with no role has no permissions and receives 403 or 404 on every center endpoint. A suspended or revoked membership, or a suspended center, is denied on the very next request.
10. Tenant isolation: a Harbor CENTER_ADMIN gets 404 on Cedar's summary, including when a body or query parameter names Cedar.
11. Privilege escalation:
    - no HTTP route can create or modify platform, role or membership assignments, and a mass-assignment attempt (`role`, `isPlatformAdmin`, `centerId` in a body) returns 400;
    - the database rejects a self-granted `platform_role_assignment` and a second bootstrap record;
    - CENTER_ADMIN gets 403 on `/platform/*`, and a PLATFORM_ADMIN without a membership gets 404 on center endpoints.
12. A table-driven matrix test (6 roles × every permission and capability) matches `PERMISSIONS_MATRIX.md`. Every clinical capability is DENY for every role, PLATFORM_ADMIN included.

**Multi-instance and proxies (R5)**
13. Two API instances booted against the same database share counters: 3 failures on instance 1 plus 3 on instance 2 lock the account, and concurrent failures are counted exactly (no lost updates).
14. Trusted proxies:
    - with `TRUSTED_PROXY_CIDRS` empty, a spoofed `X-Forwarded-For` does not change the rate-limit key;
    - from a trusted peer, the forwarded client IP is used;
    - a chain with an untrusted middle hop stops at that hop.

**Bootstrap, seed and secrets (R1, R2)**
15. `bootstrap:owner`:
    - refuses with `DEPLOYMENT_ENV` set to `preview`, `shared-synthetic` or `ci`;
    - refuses without `BOOTSTRAP_OWNER_ALLOWED=true`;
    - refuses without a TTY;
    - refuses when a platform admin already exists;
    - refuses a password given in arguments or environment variables.
16. `seed:synthetic` refuses in production or staging, creates only `@therabridge.test` accounts, and rotates passwords on re-run, so the old password returns 401 and old sessions are revoked.
17. No code path in the repository creates the owner's real account. A test checks this by grepping seed code for non-`.test` emails.
18. The CI secret scan passes, and `memory/test_credentials.md` contains no password field.

**Recovery, audit, mailbox**
19. A reset token is single-use, expires after 30 min, is stored only as a hash, and revokes all sessions.
20. Audit events exist for every event listed in §3.A and contain no secrets. The dev mailbox returns 404 unless all three of its conditions hold.

**Screens and portability (checkpoint C)**
21. Auth screens meet the design baseline: keyboard-only use, visible focus, labelled errors and 0px horizontal overflow at 320, 390, 768, 1024 and 1440.
22. The clean-clone pipeline and GitHub Actions (`test` + `compose`) are green on the exported SHA.

## 8. Test plan

| Layer | Tool | Covers |
|---|---|---|
| Unit | Jest | Policy `can()`, password policy, token hashing, HMAC pre-auth token, client-IP resolver, clock expiry |
| API integration | Jest + Supertest, real PostgreSQL (`*_test` database guard) | AC 1–20 (about 90–110 cases): CSRF and Origin matrix, rotation and fixation, two-instance lockout, concurrency (20 parallel failures), trusted-proxy matrix, route walk, role × permission matrix, mass assignment, DB constraint tests |
| CLI | Jest spawning the bootstrap and seed scripts | AC 15–17 |
| Static | `tsc`, `gitleaks` in CI | AC 18 |
| Web | Next build, Playwright screenshots at 5 widths, independent testing-agent run | AC 21 |
| Pipeline | GitHub Actions `test` + `compose` | AC 22 |

Results are recorded in `docs/emergent/qa/TEST_RESULTS.md` with IMPLEMENTED / TESTED: PASS / FAIL / PLANNED / NOT RUN.

## 9. Checkpoints (GitHub, never force-pushed)

| Checkpoint | Contents | Gate |
|---|---|---|
| 0 | Design polish (accepted) + probe retirement | Export → STOP for independent review |
| A | Identity, sessions, CSRF, brute force, bootstrap/seed CLIs | Needs acceptance of 0 + explicit authorization → export → STOP |
| B | Tenancy, roles, deny-by-default authorization | Needs acceptance of A + explicit authorization → export → STOP |
| C | Screens, docs, screenshots | Needs acceptance of B + explicit authorization → export → STOP |

Each checkpoint is exported to `phase-1-center-foundation` as a fast-forward. Its SHA and CI run are recorded in `CURRENT_STATE.md`.

## 10. Credit estimate (rough ESTIMATE, not a quote)

| Part | Share of the work unit |
|---|---|
| Checkpoint 0 | about 5% |
| Checkpoint A | about 35% (larger after R3/R5) |
| Checkpoint B | about 30% |
| Checkpoint C | about 30% |

The total is now roughly 2.5–3.5 times the size of TB-EM-000 including its correction round. The biggest risks are the extra CSRF, proxy and two-instance tests, and rework after review.

## 11. Risks
- Web and API share one origin, which SameSite=Lax relies on. A split-origin deployment needs a new ADR.
- Argon2 is a native module. CI and the Docker images must build it (`node:20-bookworm-slim`), which CI verifies.
- PostgreSQL-backed counters add one write per failed login. This is acceptable for V1; a Redis store remains pluggable.
- Lockout keyed by account can be abused to lock out a known user for 15 minutes. This is mitigated by the per-IP limit and documented as accepted risk.
- The workspace PostgreSQL is not managed by Emergent (ADR-0004).
