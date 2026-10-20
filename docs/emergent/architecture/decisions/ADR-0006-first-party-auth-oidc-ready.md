# ADR-0006: First-party email/password sign-in, designed for later OIDC

Status: **ACCEPTED by owner (2026-10-20)** as the TB-EM-001 approach. TB-EM-001 itself is not yet approved, so nothing here is IMPLEMENTED.

## Context
Blueprint §8 asks for standards-based OIDC authentication. An external OIDC provider (Keycloak or a hosted IdP) cannot run inside the Emergent workspace, which has no Docker, and a hosted IdP would add a dependency outside the repository.

## Decision
- The NestJS API authenticates users itself, with Argon2id passwords and opaque server-side sessions stored in PostgreSQL.
- Identities live in `AuthIdentity(provider, subject)`. For now `provider = 'local'`. An OIDC issuer can be added later as `provider = 'oidc:<issuer>'` without migrating users, sessions, memberships or roles.
- Authorization (memberships, roles, permissions) never depends on the identity provider.

## Consequences
- This is a recorded deviation from the blueprint, not a silent substitution.
- The application holds password hashes, so the hashing, lockout, reset and audit rules in `docs/emergent/workunits/TB-EM-001.md` apply.
- Adding OIDC later needs a callback route, PKCE, issuer configuration and account linking. The data model does not change.
- Cookies use SameSite=Lax because web and API share one origin. A split-origin deployment needs a new decision.
