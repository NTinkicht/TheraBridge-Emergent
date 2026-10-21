# TB-EM-008 — Therapist Clinical Workspace and Therapy Plans (synthetic foundations)

Status: IMPLEMENTED (2026-10-21). Synthetic data only. Not for clinical use. TB-EM-007 accepted (CI 329/329; N20–N24 = GitHub #30–#34; messaging safeguarding is issue #35).

## Delivered

| Area | What works |
|---|---|
| Initial assessments | Draft assessments per service with a summary and area findings. Only the author can edit, with optimistic `version` |
| Therapy plans | One plan per service. Plan versions are `DRAFT` → `IN_REVIEW` → (`SUPERSEDED` when a new version starts). Goals are versioned with each plan version (key, title, measure, baseline, target). A partial unique index allows one open version per plan |
| Draft review | A therapist sends a draft for review. A clinical supervisor returns it with comments, which are kept on the version. **Approve and release** route exists but requires `clinical.plan.approve` (DENY for everyone) |
| Session workspace | Session drafts linked to the therapist's own appointment (one per appointment) or standalone, with four sections. **Sign** route requires `clinical.note.sign` (DENY) |
| Progress | Observations per plan goal, never future-dated, optionally linked to a session draft. History bars per goal |
| Home plans | Home activities chosen from the library with a frequency. Staff-only "Preview as family" shows how the activities would look; nothing is released |
| Activity templates | Platform synthetic library (4 seeded templates, `center_id NULL`) and center templates, each with steps, materials and safety guidance (at least one step and one safety note required) |
| Parent activity screens | Warm-themed `/app/activities` for guardians shows **sample** library activities for their linked children's services, clearly labelled. No plan content reaches families |
| Disabled | Signing, approval, release, media capture, AI processing and safeguarding actions. All UI shows a locked action with its reason |

## Access
`center.clinical.read` (THERAPIST, CLINICAL_SUPERVISOR); `center.clinical.draft` (THERAPIST, actively assigned for the service; own drafts only); `center.clinical.review` (CLINICAL_SUPERVISOR); `center.activities.read` (staff); `center.activities.manage` (THERAPIST, CLINICAL_SUPERVISOR); `family.activities.read` (GUARDIAN). CENTER_ADMIN and COORDINATOR have no clinical record access.

## Messaging policy changes (owner decisions)
- Threads are **recipient-specific**: each is addressed to one guardian link, and only that guardian sees it. Staff must choose a connected guardian as the recipient.
- Family messaging is a **synthetic demonstration only** behind `FAMILY_MESSAGING_DEMO=true`, always off in production and staging, with a banner (issue #35, D-NEW-5).
- After trial expiry, new messages are blocked. Previously scheduled reminders still go out to guardians who are still linked, still connected and have reminders on (covered by a test).

## Migration
`20261025090000_tb_em_008_clinical_workspace`

## Tests
`apps/api/test/clinical.e2e-spec.ts` (2 tests). Full API suite 367/367. Testing agent iteration 14: about 92%; all requested flows pass. The 2 MEDIUM validation gaps it found (empty observation value, empty assessment summary) were fixed afterwards and checked by the developer.

## Open (non-blocking)
- N25: starting a new version while one is in review withdraws it from review (`SUPERSEDED`). Owner to confirm.
- N26: no read-only view of superseded plan versions in the UI yet (the API returns them).
- N27: validation messages from the API are shown raw for nested fields.
