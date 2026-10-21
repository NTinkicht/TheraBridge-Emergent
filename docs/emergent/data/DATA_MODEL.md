# DATA_MODEL (through TB-EM-003/004)

Source of truth: `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/`.

## Migrations

| Migration | Effect |
|---|---|
| `20261020143505_tb_em_000_feasibility_probe` | Feasibility probe (retired) |
| `20261020190000_tb_em_001_retire_feasibility_probe` | Drops the probe |
| `20261021090000_tb_em_001_identity_sessions` | Users, identities, sessions, rate limits, lockouts, verification tokens, audit events |
| `20261021120000_tb_em_001_tenancy_roles` | Centers, memberships, role assignments, platform roles |
| `20261021150000_tb_em_002_center_applications` | Center applications and append-only application events |
| `20261022090000_tb_em_003_004_provisioning_onboarding` | Center configuration and provenance, invitations, center events, setup steps, membership profiles |

## TB-EM-003/004 entities

| Table | Purpose | Key constraints |
|---|---|---|
| `center` (extended) | country, city, specialties, `source` (APPLICATION/DIRECT), `application_id`, `created_by_id`, `version`, `updated_at` | unique slug with format check; unique `application_id`; source ⇔ application consistency |
| `invitation` | FIRST_ADMIN or STAFF invitations: email, display name, roles, specialties, responsibilities, title, `token_hash`, status (PENDING/ACCEPTED/REVOKED/REPLACED; EXPIRED is derived), expiry, send count, actor ids | unique token hash; one PENDING per (center, email); one PENDING FIRST_ADMIN per center; roles exclude PLATFORM_ADMIN/GUARDIAN; CENTER_ADMIN only on FIRST_ADMIN; status completeness check |
| `center_event` | Tenant-scoped history (actor, subject, membership, invitation, meta) | UPDATE/DELETE blocked by trigger |
| `center_setup_step` | First administrator checklist: `center_details`, `your_profile`, `invite_team`, `review_permissions` | PK (center, key) |
| `membership` (extended) | title, phone, specialties, responsibilities, status reason/changed-at, `updated_at` | status reason only with a status change |

No clinical, child or guardian data exists yet. All data in Emergent is synthetic.

## TB-EM-011 additive governance extension

Migration `20261028090000_tb_em_011_governance`: immutable `governance_snapshot`/`governance_history`, separate immutable `consent_policy_draft`/`consent_record_draft`, locked `clinical_authorization_decision`/`recipient_release`/`recipient_release_history`, and `caseload_transfer_draft` simulations. Plan/report status checks retain deny-by-default semantics while adding explicit non-authorizing states. Original release refusal remains intact. New source/principal/provenance scope checks and immutable content/history triggers are documented in `../workunits/TB-EM-011.md`.
