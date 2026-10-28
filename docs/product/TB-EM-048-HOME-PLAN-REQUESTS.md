# TB-EM-048 — Guardian request for home-plan consideration (synthetic only)

## Scope
A connected guardian can submit **one structured pending request per active guardian link and child specialty**, using a UUID idempotency key. A currently assigned and active therapist may mark the request `ACKNOWLEDGED` or `CLOSED_UNAVAILABLE`. **Neither status produces, signs, approves or releases a clinical plan**, reports, or home activities. There is no free-text field, file upload or direct message.

## Data / contracts
- Additive Prisma `HomePlanRequest` and migration `20261029080000_tb_em_048_home_plan_requests`, with center/child/guardian-link foreign keys, request-key uniqueness, and a PostgreSQL partial unique index for one `PENDING` request per guardian link and service.
- `GET /api/centers/:centerId/family/home-plan-requests` → owned, currently linked children and own request statuses only.
- `POST /api/centers/:centerId/family/home-plan-requests` → `{childId,service,requestKey}`; validates active guardian link, active child/service, assigned active therapist, and tenant/trial; idempotent replay.
- `GET /api/centers/:centerId/clinical/home-plan-requests` → active therapist-assignment and specialty-scoped status inbox (no guardian notes, clinical drafts or reports).
- `POST /api/centers/:centerId/clinical/home-plan-requests/:id/respond` → `{status: ACKNOWLEDGED|CLOSED_UNAVAILABLE}`; existing live therapist assignment and active membership required; CAS transition from pending.
- Every response marks `synthetic:true`, `released:false`, `clinicalAuthorization:false`. All request writes are audit-logged with opaque IDs and fixed structured metadata.

## Release and safety
`HOME_PLAN_REQUESTS_DEMO=true` is required; even with this variable, writes are prohibited for `DEPLOYMENT_ENV=staging|production`. The default is **OFF**, including hosted Render unless separately approved. This feature does not require or imply authorization for real guardian/clinical use. A new policy decision is still required before any real home-plan release or messaging.

UI: existing guardian `/app/practice` and assigned therapist `/app/practice-feedback`. Acknowledgement text explicitly says no plan has been shared. No draft care-plan content is read by these endpoints.

## Qualification
API PostgreSQL acceptance added in `apps/api/test/practice.e2e-spec.ts`: invalid/unknown/other-child requests, idempotency, duplicate pending, assignment/supervisor/guardian denial, forbidden free text and release fields, state transitions, guardian revocation, assignment removal, trial expiry and center event counts. CI and independent P0–P2 review are **NOT VERIFIED at authoring**; keep PR draft and do not merge. Hosted QA #81 and all clinical policy gates remain separate NO-GO.
