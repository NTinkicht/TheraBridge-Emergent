# TheraBridge V1 — controlled synthetic engineering candidate

**Status: independent technical qualification candidate; clinical use, pilot and production deployment are NO-GO.**

This is an isolated integration candidate assembled from the six-commit Freebuff / TB-EM-011 / security-review chain. It does not activate signing, plan approval, consent grants, recipient releases, safeguarding, recording or real clinical workflows. All account, child, guardian, therapist and therapy data must remain invented/synthetic.

## Current implementation

- Next.js 14 App Router; NestJS/Fastify API; PostgreSQL/Prisma; session-based authentication, tenant-scoped roles and CSRF/Origin protection.
- Center applications, center setup, clinician operations, scheduling, synthetic family portals and role-controlled clinical drafts.
- Synthetic clinical governance, review/return/explicit withdrawal, immutable internal snapshots/evidence and non-authorizing access review.
- Deny-by-default clinical approval, signing, consent grants and recipient release; family free-text messaging only with the non-production synthetic demo gate.
- Multi-specialty therapist workspace isolation based on active child/service assignments.

## Technical evidence

The exact **source branch** `review/tb-em-011-least-privilege-safeguards` at `cd5f721d9e4d68f756baa4109628c44f217c706a` passed 442/442 API tests, API/web builds, secret scanning, Docker build/start/smoke on both GitHub Actions runs [39652806343](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39652806343) and [39652813269](https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39652813269).

The **integration branch must receive its own complete CI verification before any merge**. This is not the source branch's CI and is not a clinical validation result.

- [Qualification and controlled-import checklist](docs/integration/TB-EM-011-QUALIFICATION.md)
- [TB-EM-011 development handoff](docs/emergent/workunits/TB-EM-011.md)
- [Evidence and screenshots](artifacts/tb-em-011/VALIDATION.md)
- [Run locally](docs/emergent/operations/RUN_LOCAL.md)

Private canonical specifications remain in `NTinkicht/TheraBridge/specs`, **not included in this public code repository**. Their D1, D4, D7, D-NEW-3, D-NEW-5, OR-15 and OR-16 decisions are unsigned. No clinical approval, recipient access or real-patient use may be inferred from this draft.

This file describes technical implementation status, not approved medical services.
