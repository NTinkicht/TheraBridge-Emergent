# Permissions matrix (TB-EM-001)

Source of truth: `apps/api/src/auth/policy.ts`. The test `authz.e2e-spec.ts` fails if this table and the code disagree.

**How permissions are granted**
- Deny by default: a role has a permission only if it is listed here.
- Permissions come only from an active role assignment, in an active membership, in an active center. Membership alone grants nothing.
- PLATFORM_ADMIN is a separate platform role. It grants no center access, and center roles grant no platform access.

| Permission | Roles |
|---|---|
| platform.summary.read | PLATFORM_ADMIN |
| center.summary.read | CENTER_ADMIN, COORDINATOR, THERAPIST |

**Clinical capabilities: DENY for every role, PLATFORM_ADMIN included**

`clinical.note.sign`, `clinical.note.cosign`, `clinical.plan.approve`, `clinical.report.release`, `safeguarding.lead`, `session.recording`.

These capabilities stay denied until an owner-approved clinical policy exists.

**Per-role summary**
- CLINICAL_SUPERVISOR and GUARDIAN have no permissions yet. Their screens arrive in later work units.

**Who can assign roles**

No HTTP route can create or change memberships, role assignments or platform roles. They are created only through:
- `seed:synthetic`, for synthetic accounts;
- `bootstrap:owner`, the operator CLI, which creates one bootstrap record.

The database also enforces:
- no self-granted platform role;
- a single bootstrap record;
- no PLATFORM_ADMIN inside a center role assignment.
