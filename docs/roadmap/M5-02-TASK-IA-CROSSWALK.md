# M5-02 — Canonical task-area and navigation architecture proposal

**Engineering status: SOURCE MODEL IN REVIEW, not a released navigation UX.** Tracks #185, based on canonical M4-01 inventories and current M5-01 merged audit. This tranche deliberately does not change the running UI, permissions, API or role/specialty boundaries.

## Proposed eight task areas

| Area | Purpose | Example current navigation destinations (permission conditioned) |
|---|---|---|
| Today & workspace | Day overview, tasks, responsive workspace basics | Home |
| Children & care | Child records, objectives, historical progress, reports/plans | Children, Progress |
| Sessions & activities | Clinical sessions, notes, activities and feedback | Clinical workspace, Activities (center), Practice feedback |
| Family & home | Guardian practice, family progress and child-specific home information | Home practice, Progress updates |
| Center operations | Staff, center setup, platform administration and identity of centers | Center setup, Team, Center details, Centers, Applications |
| Scheduling & messages | Visits, coordination, messages | Schedule, Messages |
| Safety & governance | Policy, access, consent and release governance | Documents & review, Access & consent |
| Account & access | Identity, security and personal settings | My profile, Account security |

Every one of the **66 feature IDs**, **91 workflow IDs** and **20 current navigation entries** is classified *without deleting it*. The generated JSON has its canonical identifier, original title, work unit, evidence status, proposed task area, and explicit NOT_TESTED discoverability. **Eight conceptual areas are not eight new production routes.** Current server-side session permission filtering remains the only authority for existing nav visibility, and every future role/specialty mapping requires independent runtime validation. The 7-role review matrix is an explicit `NOT_TESTED` backlog, not a grant list.

Two V2 exclusions are retained unchanged: feature **#39** school integration and workflow **WF-X6** child app and school integration. Synthetic/draft test behavior must never be promoted into real clinical approval, AI/STT/signing/consent/release authority, or unauthorized account access.

## Proposed core journeys for clickable design review

The following are **candidate task flows**, not proof of full task testing or approved wireframes:

| Persona / owner | Entry | Next task area | Required protection |
|---|---|---|---|
| Platform admin | Today > Center applications | Center operations > Applications / Centers | Platform context and `platform.*` permission; center detail scoped |
| Center admin | Today > Setup | Center operations > Setup / Team / Center details | Scoped center context, explicit staff/settings grants |
| Coordinator | Today > Schedule | Scheduling & messages > Schedule / Messages | Center scoped + child access; no implicit clinical rights |
| Speech or OT therapist | Today > Clinical | Sessions & activities > Clinical / practice feedback | Specialty/assigned-child boundary; unsigned drafts only |
| Clinical supervisor | Today > Review | Safety & governance > Documents & review / Progress | Supervisor oversight; G2/G2b cannot be bypassed |
| Guardian | Today > Home practice | Family & home > Practice / Progress / Activities | Guardian-child grant, withdrawal and consent checked on every request |

**Suggested next clickable wireframe behaviors:** task-area entry landing, collapsible secondary navigation, in-area breadcrumb/back, cross-area contextual search scoped to authorized destinations, explicit locked-state explanation, progressive disclosure of rare actions. A visible locked affordance must not expose ungranted route names or patient metadata. All actions must be permission-aware, especially guardian and clinician scope; do not render hidden controls merely by CSS.

## Quantified evidence and nonclaims

Source inventory: 66 features (31 PARTIAL / 34 PENDING_VERIFICATION / 1 V2_EXCLUDED) and 91 workflows (36 PARTIAL / 54 PENDING_VERIFICATION / 1 V2_EXCLUDED). These are historical reconciliation states, **not** M5 acceptance results. Current nav has 20 rows including **two** role-conditioned Activities entries at the same URL, one `center.activities.read` and one `family.activities.read`; do not deduplicate away either permission.

- **Completed in this source-only tranche:** reproducible crosswalk; fail-closed exact counts; grouped ownership; seven-role candidate journey map; CI negative tests and archival of structured JSON.
- **Not completed:** actual in-app navigation refactor, clickable wireframes, human mental-model workshop, role-based permission integration tests, each workflow's proven destination, breadcrumbs/search behavior, screenshots, usability signoff or full accessibility/screen-reader/mobile/low-bandwidth/dark-theme acceptance.
- **Independent unresolved source:** original 1,023 private controlled step-to-screen links. The authoritative private workbook and its policy signatures are outside this public source crosswalk. No step-level acceptance can be inferred from these 157 names.
- **Do not close #185** after this tranche. M5-01 #184 still open for human-approved UX baselines; M4-02 #176/#268 and M4-09 #183 remain independent.
- **Safety:** all clinical gates G2/G2b NO-GO, no real patient data, no production changes, no SaaS/enterprise rights approval.

## Reproduce

```bash
node --test scripts/design/m5-ia-crosswalk.test.mjs
node scripts/design/m5-ia-crosswalk.mjs /tmp/therabridge-m5-ia-proposal.json
```

CI archives only the structured public synthetic requirement names and references; no cookies, account credentials, clinical records, or private workbook contents.
