# TB-EM-049 — Therapist replacement / operational handover preparation

## Scope and safety boundary
Focused first slice of the broader therapist replacement and clinical handover roadmap item. **This is not a completed therapist replacement**: it creates a synthetic-only operational proposal, allows the named incoming therapist to acknowledge receipt, and allows a center manager to cancel it. There is no automatic care assignment, clinical chart, report, plan, progress history, message, home plan, or consent transfer. A separate work unit must decide and qualify the assignment switch, recipient authorization, and clinical handover governance before it can occur.

The existing `caseload_transfer_draft` model is reused with a **distinct** status namespace (PENDING_ACK, ACKNOWLEDGED, CANCELLED), separate from legacy SIMULATION_ONLY records. No new migration. Only fixed operational reasons STAFF_CHANGE, AVAILABILITY and FAMILY_REQUEST are allowed. Free-text clinical narrative is rejected by DTO whitelist.

### Routes
- `GET /api/centers/:id/governance/handover-proposals`: role-scoped list. Administrators/coordinators see center records and opaque child/assignment IDs; incoming therapists see only their own proposals **without child identity or clinical data**.
- `POST /api/centers/:id/governance/handover-proposals`: manager proposes a handover after checking an active assigned source, active child/service, different and qualified active incoming therapist and no existing open proposal. Center row locking serializes same-source duplicate proposals.
- `POST /api/centers/:id/governance/handover-proposals/:id/acknowledge`: recipient therapist only; checks live membership, role, specialty and still-active source assignment, then logs operational acknowledgement. Does not change assignment.
- `POST /api/centers/:id/governance/handover-proposals/:id/cancel`: manager cancels an open proposal, with audit history and no access change.

All routes are authorization-checked and use `HANDOVER_DEMO=true` opt-in, while staging/production are denied regardless of variable. Default OFF. No need to enable the flag on hosted Render. Guard and service scope both enforce roles. All replies explicitly say `synthetic:true, accessGranted:false, assignmentChanged:false, clinicalHandover:false, released:false`.

### UI
Center manager child Care Team card -> Therapist replacement preparation panel. Incoming therapist -> Practice feedback screen -> Operational handover requests inbox. No child details appear in therapist pre-assignment inbox; no medical documents are displayed anywhere in this flow.

### Qualification
`apps/api/test/handover.e2e-spec.ts` covers lifecycle, roles, tenant scope via actor context, duplicate proposals, inactive/unqualified recipients, changed specialties, forbidden clinical text, feature flag OFF and overlapping proposals. Existing authz inventory and permission-matrix snapshots extended. Full six-job exact-head CI and independent review **NOT VERIFIED** at authoring; never merge without qualification. Hosted #81 remains INCOMPLETE and clinical/production signing/release NO-GO.
