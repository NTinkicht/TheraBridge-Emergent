# ADR-0006: First-party email/password sign-in, designed for later OIDC

Status: **ACCEPTED by the owner (2026-10-20), with the mandatory corrections R1–R5** from the TB-EM-001 independent review. Implementation is planned for checkpoints A and B. Not yet IMPLEMENTED.

## Context
Blueprint §8 asks for standards-based OIDC authentication. An external OIDC provider (Keycloak or a hosted IdP) cannot run inside the Emergent workspace, which has no Docker. A hosted IdP would also add a dependency outside the repository.

## Decision
- **Identity**
  - The NestJS API authenticates users itself, with Argon2id passwords and opaque server-side sessions stored in PostgreSQL.
  - Identities live in `AuthIdentity(provider, subject)`. For now `provider = 'local'`. An OIDC issuer can be added later as `provider = 'oidc:<issuer>'` without migrating users, sessions, memberships or roles.
  - Authorization never depends on the identity provider.
- **Sessions and CSRF (R3)**
  - Cookie `__Host-tb_session`: HttpOnly, Secure, SameSite=Lax.
  - The CSRF token is a session-bound synchronizer token (its secret hash is stored on the session row). Before sign-in, an HMAC-signed token bound to a short-lived cookie is used instead.
  - Every unsafe method needs an Origin (or Referer) on the allow-list. `Sec-Fetch-Site: cross-site` is rejected.
  - The session rotates on login, on context switch and on password change.
  - Boot fails on insecure or missing cookie and secret configuration.
- **Authorization (R4)**
  - Deny by default: every route must be explicitly public or carry a permission requirement.
  - Membership alone grants nothing; permissions come only from active role assignments.
  - Platform-admin assignment has no HTTP path. It is created only by the operator bootstrap CLI and protected by database constraints.
  - Every clinical capability is DENY.
- **Brute force (R5)**
  - Lockout and rate-limit counters live in PostgreSQL and are updated atomically, so they are shared across API instances.
  - The client IP is resolved only through `TRUSTED_PROXY_CIDRS`, which is required and has no default.
- **Owner and seed (R1, R2)**
  - A real owner is created only through the operator CLI `bootstrap:owner` (TTY password prompt), and never in preview, CI or shared synthetic environments.
  - Synthetic seed accounts get random, disposable passwords, stored only in a gitignored local file.
  - No secret is ever written to a Git-tracked file.

## Consequences
- This is a recorded deviation from the blueprint, not a silent substitution.
- The application stores password hashes, so the hashing, lockout, reset, audit and secret-scan rules in `docs/emergent/workunits/TB-EM-001.md` apply.
- Adding OIDC later requires a callback route, PKCE, issuer configuration and account linking. The data model does not change.
- Web and API share one origin, which SameSite=Lax relies on. A split-origin deployment needs a new ADR.
- PostgreSQL-backed counters add one write per failed login. A Redis store can replace them behind the same interface.
