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
| center.handover.read | CENTER_ADMIN, COORDINATOR, THERAPIST |
| center.handover.propose | CENTER_ADMIN, COORDINATOR |
| center.handover.acknowledge | THERAPIST |
| center.handover.cancel | CENTER_ADMIN, COORDINATOR |
| center.handover.syntheticApprove | CLINICAL_SUPERVISOR |
| center.handover.syntheticCommit | CENTER_ADMIN, COORDINATOR |
| center.schedule.read | CENTER_ADMIN, COORDINATOR, THERAPIST, CLINICAL_SUPERVISOR |
| center.schedule.manage | CENTER_ADMIN, COORDINATOR |
| center.appointments.status | CENTER_ADMIN, COORDINATOR, THERAPIST |
| family.portal.read | GUARDIAN |
| family.preferences.update | GUARDIAN |
| center.messages.use | CENTER_ADMIN, COORDINATOR, THERAPIST, GUARDIAN |
| center.messages.manage | CENTER_ADMIN, COORDINATOR, THERAPIST |
| platform.reminders.run | PLATFORM_ADMIN |
| center.clinical.read | THERAPIST, CLINICAL_SUPERVISOR |
| center.clinical.draft | THERAPIST |
| center.clinical.review | CLINICAL_SUPERVISOR |
| center.activities.read | CENTER_ADMIN, COORDINATOR, THERAPIST, CLINICAL_SUPERVISOR |
| center.activities.manage | THERAPIST, CLINICAL_SUPERVISOR |
| family.activities.read | GUARDIAN |
| family.progress.demo | GUARDIAN |
| family.home_plan_request.read | GUARDIAN |
| family.home_plan_request.create | GUARDIAN |
| center.home_plan_request.read | THERAPIST |
| center.home_plan_request.respond | THERAPIST |
| center.practice.read | THERAPIST, CLINICAL_SUPERVISOR |
| center.practice.acknowledge | THERAPIST |
| family.practice.read | GUARDIAN |
| family.practice.record | GUARDIAN |

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
- Clinical drafts (TB-EM-008, synthetic only): a THERAPIST reads and drafts only for children actively assigned to them for that service, and edits only their own assessments and session drafts. A CLINICAL_SUPERVISOR reads the whole center and can return a plan draft with comments. CENTER_ADMIN, COORDINATOR and GUARDIAN have no clinical access. The approve and sign routes exist but require `clinical.plan.approve` / `clinical.note.sign`, which are DENY. Guardians see only synthetic sample activities; no plan content is released.
- **D-NEW-5 / issue #35 (fail closed):** `center.messages.use` and `center.messages.manage` are *conditionally available only to isolated Jest/CI fixtures*, never to any deployment, local development or hosted synthetic preview. Route guards, session permission claims and service methods all deny when any required test-only predicate is absent (`NODE_ENV=test`, `DEPLOYMENT_ENV=ci`, a Jest worker, `FAMILY_MESSAGING_DEMO=true`). The permission-role mapping above is a test-fixture mapping, **not a deployed grant**. The feature flag alone is never authorization. The sender-recipient design is synthetic and unapproved for clinical or real-family use; a named safeguarding lead, off-platform emergency path, monitoring/triage SLA, D7 consent and D4 custody visibility require separate owner signatures.
- Messages (TB-EM-013 owner decision, 2026-10-22): operational, non-clinical, synthetic only. **Parents communicate exclusively with therapists who have an active assignment to their child**. A GUARDIAN sees only threads addressed to their exact active guardian link; an assigned THERAPIST can read/reply to and close/reopen that child's GUARDIAN threads. CENTER_ADMIN and COORDINATOR cannot view, create, reply to, or close/reopen GUARDIAN threads; they can use and manage internal CARE_TEAM and SPECIALTY discussions only. CLINICAL_SUPERVISOR has **no discussion access at all**. Every list, read, create, reply and status operation enforces scope server-side. Messages remain append-only, and body text is never copied into audit history.
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

| Permission | Roles |
|---|---|
| center.governance.read | CENTER_ADMIN, COORDINATOR |
