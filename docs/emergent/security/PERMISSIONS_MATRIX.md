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
| platform.centers.trial | PLATFORM_ADMIN |
| center.summary.read | CENTER_ADMIN, COORDINATOR, THERAPIST, CLINICAL_SUPERVISOR |
| center.settings.read | CENTER_ADMIN |
| center.settings.update | CENTER_ADMIN |
| center.setup.manage | CENTER_ADMIN |
| center.staff.read | CENTER_ADMIN, COORDINATOR |
| center.staff.invite | CENTER_ADMIN |
| center.staff.manage | CENTER_ADMIN |
| center.profile.self | CENTER_ADMIN, COORDINATOR, THERAPIST, CLINICAL_SUPERVISOR |
| center.children.read | CENTER_ADMIN, COORDINATOR, THERAPIST, CLINICAL_SUPERVISOR |
| center.children.manage | CENTER_ADMIN, COORDINATOR |
| center.families.manage | CENTER_ADMIN, COORDINATOR |
| center.assignments.manage | CENTER_ADMIN, COORDINATOR |
| center.schedule.read | CENTER_ADMIN, COORDINATOR, THERAPIST, CLINICAL_SUPERVISOR |
| center.schedule.manage | CENTER_ADMIN, COORDINATOR |
| center.appointments.status | CENTER_ADMIN, COORDINATOR, THERAPIST |
| family.portal.read | GUARDIAN |
| family.preferences.update | GUARDIAN |
| center.messages.use | CENTER_ADMIN, COORDINATOR, THERAPIST, GUARDIAN |
| center.messages.manage | CENTER_ADMIN, COORDINATOR |
| platform.reminders.run | PLATFORM_ADMIN |

**Clinical capabilities: DENY for every role, PLATFORM_ADMIN included**

`clinical.note.sign`, `clinical.note.cosign`, `clinical.plan.approve`, `clinical.report.release`, `safeguarding.lead`, `session.recording`.

These capabilities stay denied until an owner-approved clinical policy exists.

**Per-role summary**
- CENTER_ADMIN: center settings, setup checklist, staff directory, staff invitations, role/profile edits, suspension, reactivation and revocation.
- COORDINATOR: read-only staff directory and invitation list, own profile.
- THERAPIST and CLINICAL_SUPERVISOR: center summary and own profile. Clinical permissions remain denied.
- GUARDIAN: `family.portal.read` only. They see the children linked to their own account through an active guardian link, those children's care team names and upcoming appointments. They never see staff emails, other families or dates of birth.
- Scoping inside a center (TB-EM-006): a THERAPIST sees only children with an active care assignment to them, and only their own appointments. They can record attendance (completed / no-show) on their own appointments after the start time. Cancelling and rescheduling need `center.schedule.manage`. Guardian emails are shown only to center administrators and coordinators.
- Trial (TB-EM-005): writes are refused with 403 after `center.trial_ends_at`. Reads keep working. Only `platform.centers.trial` can extend a trial. Two exceptions stay allowed after expiry because they only reduce access, which is the safeguarding direction: removing a guardian and ending a therapist assignment.
- Messages (TB-EM-007): operational, non-clinical only. Row scope is re-checked on every request: a GUARDIAN sees threads about children currently linked to their own account (removing the link ends access at once); a THERAPIST sees threads about children actively assigned to them; CENTER_ADMIN and COORDINATOR see the center and can close or reopen threads. CLINICAL_SUPERVISOR has no message access. Messages are append-only in the database and their text is never copied into the audit history.
- Reminders (TB-EM-007): a GUARDIAN can switch appointment emails on or off only for their own guardian link. Reminders and change notices go to the restricted synthetic outbox only.
- Guardians are always connected by accepting an invitation, even when the same email already has a guardian account at the center. This stops a mistyped email from exposing a child to another family.
- CLINICAL_SUPERVISOR reads all children and the whole center schedule (oversight), without making changes.

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
