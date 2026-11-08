# M4 qualification — live synthetic deployment verification (8 November 2026)

**Evidence type:** read-only Render deployment metadata, startup logs, Neon catalog queries and merged GitHub CI. **NOT** full protected acceptance.
**Scope:** the hosted synthetic demo only. No real patient records, clinical activation, policy sign-off, signed release, STT or external AI.

## Immutable provenance
- Render workspace `NTinkicht`, service `srv-dbdbelfavr4c739ftdsg` (`therabridge-ahmed-synthetic-demo`).
- Current live deploy `dep-dboa541srm7s73bcr5fg`, deploy commit `7f19d552a2ab39e58053210b8c56c86afe2b78cd`. The deployment commit says it synchronized reviewed `main@4784b2414b57bb74938bdd168716a7ccbae4461b`; a GitHub compare of main-to-deploy reports **zero changed files** (the deployment branch has extra merge-history commits). This establishes code equivalence, not app-account acceptance.
- Render startup logs at 2026-11-08 16:29 UTC show datasource database `therabridge_demo_m3_preview` and migration `20261108100000_m4_audit_truncate_guard` applied successfully. The older `therabridge_demo_preview` database in the same Neon project is **not the Render runtime database**.

## Non-mutating live Neon checks
Project `aged-fog-03608251`, branch `br-cool-darkness-bars65wp`, **database `therabridge_demo_m3_preview`**:
- `app_user`: **10** synthetic identities; `center`: **1** valid center; `child`: **6**; `membership`: **9**; active `care_assignment`: **10**.
- `_prisma_migrations`: **25 completed**, including the newest M4 audit TRUNCATE guard.
- `audit_event` has two enabled triggers: `audit_event_no_mutation` (UPDATE/DELETE) and `audit_event_no_truncate` (statement-level).
- `public` has **50** application tables and **78** foreign keys.
- **Actual security qualification finding:** The project has exactly one non-Neon-admin login role, `therabridge_demo_preview_owner`, and it owns all **50** application tables. A separately provisioned **non-owner least-privileged runtime role is not present**. An owner role can disable/drop its own audit triggers; thus these triggers do **not** establish an owner-proof tamper boundary. Do not certify release-grade DB role separation until a separate runtime DB account and operational migration credentials are provisioned and validated.

## What is and is not accepted
- **PASS (structural):** exact main-to-deploy file equivalence, full M4 database migration application, 10 seeded synthetic accounts, expected audit triggers enabled, source-level proof/test harness merged, last PR #293 six exact-head CI green (run `42496485725`).
- **NOT RUN:** protected manual `hosted-interactive-private.yml` against this exact deployed commit and operator-approved secrets. 10 database records are *not* ten successful authenticated browser logins. No HA-01…HA-10 PASS can be claimed.
- **NOT POSSIBLE AGAINST CURRENT SINGLE CENTER:** two-valid-tenant positive/negative and live revocation tests require a separate ephemeral second valid tenant and controlled synthetic authentication. A nonexistent-center 404 cannot count as proof.
- **NOT VERIFIED:** actual application-wide API/Web measured 95% coverage; full workload/resource baseline, operational privileged DB role separation, comprehensive 75-issue dispositions, atomic 1,023-step runtime mapping, or owner clinical/policy signoff.
- **CONTROLLED WORKBOOK:** 1,023 source step IDs are present in `TheraBridge_V1_Exhaustive_Workflows_Step_Screen_Audit.xlsx` and the preserved private source. They are draft design/QA steps (108 design-mapped only, 880 no exact step-node mapping, 35 QA unexecuted). They are *not* 1,023 executed application tests.

## Scope of one final remediation PR
- Pin the seven-role hosted RBAC probes to real controller/permission contracts and require an existing center for platform denial tests (issue #269).
- Add a real-PostgreSQL synthetic transaction rollback regression after forbidden audit UPDATE (issue #294).
- Both must pass six exact-head CI jobs and independent review. Neither task by itself qualifies the open hosted/DB/policy/release requirements.

**Final decision at this checkpoint:** M4 engineering consolidation is merged, but the M4 #167 original exit conditions remain **NOT SATISFIED**. Never mark M4 formally closed by inferring missing execution evidence or waiving an unsigned clinical gate.
