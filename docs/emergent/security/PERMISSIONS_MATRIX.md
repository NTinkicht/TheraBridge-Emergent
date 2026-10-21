# Permissions matrix (TB-EM-001 → TB-EM-003/004)

Source of truth: `apps/api/src/auth/policy.ts`. The test `authz.e2e-spec.ts` fails if this table and the code disagree.

**How permissions are granted**
- Deny by default: a role has a permission only if it is listed here.
- Permissions come only from an active role assignment, in an active membership, in an active center. Membership alone grants nothing.
- PLATFORM_ADMIN is a separate platform role. It grants no center access, and center roles grant no platform access.
- Every `center.*` route is scoped by `:centerId`; it must equal the session's active membership's center, otherwise 404 (tenant isolation).

| Permission | Roles |
|---|---|
| platform.summary.read | PLATFORM_ADMIN |
| platform.applications.read | PLATFORM_ADMIN |
| platform.applications.decide | PLATFORM_ADMIN |
| platform.centers.read | PLATFORM_ADMIN |
| platform.centers.create | PLATFORM_ADMIN |
| platform.centers.invite_admin | PLATFORM_ADMIN |
| center.summary.read | CENTER_ADMIN, COORDINATOR, THERAPIST, CLINICAL_SUPERVISOR |
| center.settings.read | CENTER_ADMIN |
| center.settings.update | CENTER_ADMIN |
| center.setup.manage | CENTER_ADMIN |
| center.staff.read | CENTER_ADMIN, COORDINATOR |
| center.staff.invite | CENTER_ADMIN |
| center.staff.manage | CENTER_ADMIN |
| center.profile.self | CENTER_ADMIN, COORDINATOR, THERAPIST, CLINICAL_SUPERVISOR |

**Clinical capabilities: DENY for every role, PLATFORM_ADMIN included**

`clinical.note.sign`, `clinical.note.cosign`, `clinical.plan.approve`, `clinical.report.release`, `safeguarding.lead`, `session.recording`.

These capabilities stay denied until an owner-approved clinical policy exists.

**Per-role summary**
- CENTER_ADMIN: center settings, setup checklist, staff directory, staff invitations, role/profile edits, suspension, reactivation and revocation.
- COORDINATOR: read-only staff directory and invitation list, own profile.
- THERAPIST and CLINICAL_SUPERVISOR: center summary and own profile. Clinical permissions remain denied.
- GUARDIAN: no permissions yet (parent portal is the next functional priority).

**Who can assign roles (TB-EM-003/004)**
- CENTER_ADMIN is granted only by a platform-issued administrator invitation (`platform.centers.invite_admin`).
- A center administrator can invite and edit only COORDINATOR, THERAPIST and CLINICAL_SUPERVISOR. They cannot grant or remove CENTER_ADMIN, and cannot invite GUARDIAN.
- A center administrator cannot suspend or revoke their own access. The last active CENTER_ADMIN cannot be suspended or revoked; changes are serialised per center.
- Platform roles are still never written by an HTTP route. They come only from `bootstrap:owner` or `seed:synthetic`.

The database also enforces:
- no self-granted platform role, a single bootstrap record, no PLATFORM_ADMIN inside a center role assignment;
- invitation roles never include PLATFORM_ADMIN or GUARDIAN, and only FIRST_ADMIN invitations carry CENTER_ADMIN;
- one pending invitation per email per center, and one pending first-administrator invitation per center;
- append-only `center_event` and `application_event` history.
