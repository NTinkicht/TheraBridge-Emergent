# TB-EM-049 — Therapist replacement / operational handover preparation

## Scope and safety boundary
Focused first slice of the broader therapist replacement and clinical handover roadmap item. **This is not a completed therapist replacement**: it creates a synthetic-only operational proposal, allows the named incoming therapist to acknowledge receipt, and allows a center manager to cancel it. There is no automatic care assignment, clinical chart, report, plan, progress history, message, home plan, or consent transfer. A separate work unit must decide and qualify the assignment switch, recipient authorization, and clinical handover governance before it can occur.

The existing `caseload_transfer_draft` model is reused with a **distinct** status namespace (PENDING_ACK, ACKNOWLEDGED, CANCELLED), separate from legacy SIMULATION_ONLY records. Additive database migration 20261029100000_tb_em_049_handover_proposals extends the CHECK constraint only for fixed non-authorizing statuses and reason codes, preserves SIMULATION_ONLY and the different-member requirement, and adds a partial unique open-proposal index and scoped list indexes. Legacy access() remains scoped to SIMULATION_ONLY. Only fixed operational reasons STAFF_CHANGE, AVAILABILITY and FAMILY_REQUEST are allowed. Free-text clinical narrative is rejected by DTO whitelist.

### Routes
- `GET /api/centers/:id/governance/handover-proposals`: role-scoped list. Administrators/coordinators see center records and opaque child/assignment IDs; incoming therapists see only their own proposals **without child identity or clinical data**.
- `POST /api/centers/:id/governance/handover-proposals`: manager proposes a handover after checking an active assigned source, active child/service, different and qualified active incoming therapist and no existing open proposal. Center row locking and a PostgreSQL partial unique index serialize same-source duplicate proposals.
- `POST /api/centers/:id/governance/handover-proposals/:id/acknowledge`: recipient therapist only; locks the target membership and source assignment rows, rechecks live role, specialty and assignment, then logs operational acknowledgement. Does not change assignment.
- `POST /api/centers/:id/governance/handover-proposals/:id/cancel`: manager cancels an open proposal via tenant- and status-scoped compare-and-set, with audit history and no access change.

All routes are authorization-checked and use `HANDOVER_DEMO=true` opt-in, while staging/production are denied regardless of variable. Default OFF. No need to enable the flag on hosted Render. Guard and service scope both enforce roles. All replies explicitly say `synthetic:true, accessGranted:false, assignmentChanged:false, clinicalHandover:false, released:false`.

### UI
Center manager child Care Team card -> Therapist replacement preparation panel. Incoming therapist -> Practice feedback screen -> Operational handover requests inbox. No child details appear in therapist pre-assignment inbox; no medical documents are displayed anywhere in this flow.

### Qualification
`apps/api/test/handover.e2e-spec.ts` covers lifecycle, roles, tenant scope via actor context, duplicate proposals, inactive/unqualified recipients, changed specialties, forbidden clinical text, feature flag OFF and overlapping proposals. Existing authz inventory and permission-matrix snapshots extended. Initial CI at 0d170d3 FAILED due to CHECK constraint 23514 and related test failures. The migration, scoped service changes and concurrency tests are committed. Corrected-head six-job CI and independent review **NOT VERIFIED** at this checkpoint; never merge without qualification. Hosted #81 remains INCOMPLETE and clinical/production signing/release NO-GO.


## M2-H07 #112 — bounded child-scoped cancelled history (synthetic-only)

The existing `GET /api/centers/:centerId/governance/handover-proposals` additionally accepts manager-only optional `childId=<UUID>` and `cancelledOffset=<nonnegative integer>`. The manager receives all actionable `PENDING_ACK/ACKNOWLEDGED` proposals in the selected scope plus at most 100 recent `CANCELLED` records; `nextCancelledOffset` indicates older records (or `null` when exhausted). The UI requests only its selected child's scope and offers Load older cancelled proposals. Paging uses a deterministic createdAt/id descending order. Offset pagination is bounded and navigable for the synthetic POC; pagination under simultaneous cancellation can shift, so a stable cursor is a future improvement if live workflows require snapshot isolation.

Incoming therapists may **not** supply `childId` or `cancelledOffset`; the API returns a non-disclosing denial before querying records. Their default inbox remains recipient-scoped with no child identity. Cross-center scope and active manager role are enforced server-side. No assignment/clinical records/consent/signing/release capability is created. Real PostgreSQL regression checks 101 unrelated cancellations, older child history and denial cases. Production/clinical use stays NO-GO.
