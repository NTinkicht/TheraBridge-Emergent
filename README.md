# TheraBridge — synthetic application repository

This repository contains the functional Next.js + NestJS/Fastify + PostgreSQL/Prisma TheraBridge application, not merely the older TB-EM-000 feasibility bootstrap. The former home feasibility page has been replaced with a real login entrypoint. Application main includes the integrated therapist session work, clinical governance safeguards and the Children's Home Centre/Ahmed family synthetic demo seed.

**Safety boundary:** fictional/synthetic data only. Real patient data, clinical signing/co-signing, consent grants and report release, real microphone/STT, external AI processing and pilot/production are all **NO-GO** until formal policies and authorizations. The separate private NTinkicht/TheraBridge repository remains the source of controlled product and clinical specifications.

## Local development

Use .env.example and docker-compose.yml for the full local web/API/PostgreSQL stack. The demo seed requires an explicit synthetic environment, a database with a demo-identifying name and secure local credential storage.

## Hosted demo activation (P0)

See docs/demo/P0_HOSTED_ACTIVATION.md for the dedicated Neon database, reviewable Render Free single-service configuration, server-stored fictional account secrets and real external seven-role test. The actual external hostname and login have NOT been confirmed merely because GitHub CI passes. Issue #61 tracks activation and verification.

See docs/demo/DEMO_GUIDE.md for the fictional Ahmed family story and role walkthrough.

## Historical references

AGENTS.md, docs/product/MASTER_BLUEPRINT.md, docs/handover/CONTINUITY_PROTOCOL.md and docs/handover/TAKEOVER_CHECKLIST.md contain historical controlled references. Any old bootstrap documents claiming the repository contains no application code are out of date and are not the source of current operational status.
