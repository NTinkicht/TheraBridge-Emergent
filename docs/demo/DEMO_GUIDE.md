# Children's Home Centre — Ahmed family synthetic demo

**Fictional demonstration only. Not for clinical use.**

## Seeded records

| Category | Data |
|---|---|
| Centre | Children's Home Centre, Sharjah, United Arab Emirates; slug: childrens-home-demo |
| Family | Ahmed |
| Child | Yusuf Ahmed (DOB 2020-05-14), entirely fictional |
| Guardian | Mariam Ahmed, connected primary guardian |
| Staff | Salma Rahman (admin), Dina Saeed (coordinator), Layla Faris (speech), Omar Nasser (OT), Dr. Hana Saleh (supervisor) |
| Platform | Platform Demo Operator (no clinical access) |
| Care and scheduling | 2 active specialty assignments; 10 appointments (8 historical, 2 upcoming) |
| Draft clinical data | 2 assessments, 2 draft plans, 4 goals, 8 completed but unsigned session executions, 16 fictional observations, 2 unsigned draft reports |
| Activity library | 4 centre activities; 2 globally visible synthetic-only sample activities for family practice |
| Clinical approvals | None; no signing, release, consent grants, approval or production pilot |

The guardian has access to family appointments and synthetic sample practice, not unreleased draft clinical notes, progress or plans. Home plan release is deliberately locked.

## Seed the authorized preview database

1. Ensure the owner-authorized preview can reach a DISPOSABLE synthetic PostgreSQL database. A GitHub PR does not populate a hosted database by itself.
2. Configure DEPLOYMENT_ENV=preview (or local/ci), DATABASE_URL with a database name containing demo, preview, synthetic or _test; and DEMO_SEED_CONFIRM=CHILDRENS_HOME_SYNTHETIC_ONLY.
3. Deploy the existing Prisma migrations and run: yarn workspace @therabridge/api seed:demo
4. Read the credentials securely on the trusted server at .workspace/local-credentials/childrens-home-demo.json. The file is gitignored, permission-restricted and must never be placed in a served public directory. Transfer passwords only via an authorized secure channel. Never include them in GitHub commits, review comments, images or CI logs.
5. Rerunning the seed is idempotent and **never rotates passwords**. It will refuse to run if demo users exist but the local private credentials file is lost. Use an authorized account recovery process or a completely fresh disposable database; do not weaken this guard.
6. The new centre starts with a genuine 30-day trial (1 child / up to 3 therapists). Extend it only via the normal platform-admin interface as needed, not by secretly updating the seed on rerun.

The actual preview's hosting-level HTTP 403 is an access restriction. The owner or platform admin must grant authorized preview access; this seed does not bypass hosting security.

## Recommended owner walkthrough

| Step | Sign in as | Visit |
|---|---|---|
| 1 | platform.demo@childrens-home.therabridge.test | /app/centers — locate Children's Home Centre |
| 2 | admin@childrens-home.therabridge.test | /app/team, /app/children — staff, Yusuf, primary guardian |
| 3 | coordinator@childrens-home.therabridge.test | /app/schedule — visit history and upcoming slots |
| 4 | speech@childrens-home.therabridge.test | /app/clinical → Yusuf: assessments, drafts, sessions, progress |
| 5 | ot@childrens-home.therabridge.test | Same child, but OT-only clinical history |
| 6 | supervisor@childrens-home.therabridge.test | Permitted internal review; no parent messages |
| 7 | mariam.ahmed@childrens-home.therabridge.test | /app and /app/practice — visits and SAMPLE activities only |

The optional family sample outcome recording needs FAMILY_PRACTICE_DEMO=true in a verified synthetic-only environment (never production/staging). The dedicated CI job enables that gate for a real guardian submission. FAMILY_MESSAGING_DEMO stays OFF, and signed/released clinical content stays locked.

## Verification

CI demo-journey uses its own empty therabridge_demo_test PostgreSQL database: migrate, seed twice, assert exact counts/relationships/zero authorizations, start actual Next and Nest servers, test seven role logins and logouts, Speech/OT isolation, parent/admin denial, supervisor discussion denial and parent synthetic practice submission. Credentials are deleted at the end of CI.

External style.dev preview access remains unverified until authorized by the owner. Chromium covered; Firefox/Safari and live clinical validation are not covered. Do not interpret historical sample evidence as actual clinical records.
