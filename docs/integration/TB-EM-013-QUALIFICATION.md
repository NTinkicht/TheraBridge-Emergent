# TB-EM-013 — controlled synthetic-only import qualification

**Status:** DRAFT / NOT AUTHORIZED TO MERGE OR DEPLOY. This is a technical import candidate, not clinical approval.

## Provenance

- Clean `main` parent: `b951f1c6d04ed465f1c990a997b5dbcbe51dfe0c`.
- Historical controlled import candidate: PR #54, `7d6bc0c088ae6af7ca78850541e350c6f76dc447`; remains draft and unchanged.
- Latest source branch: PR #56, `7bf1a3ccb2328e25faed1560aab8ff75b0e7fbca`. Parent chain: PR #53 `cd5f721` -> PR #55 `10d266d` -> PR #56.
- Imported paths refreshed from the exact source: `apps/`, `docs/emergent/`, and `.github/workflows/ci.yml`. All other paths retain the previously qualified PR #54 import tree, including integration-only import helper corrections.
- The commit's **single parent is main**, not the unrelated export history. The import is a file-tree snapshot only; no history merge, cherry-pick of unrelated commit, or force push.

## Specific engineering corrections

- Assessment updates use the persisted service for authorization and reject conflicting DTO service without mutation.
- Synthetic messaging uses explicit GUARDIAN / CARE_TEAM / SPECIALTY audiences and per-request live access checks.
- Therapist assignment revocation and guardian-link removal serialize against replies within write transactions. Guardian reply center locks use `FOR NO KEY UPDATE` to avoid conflict with guardian removal's center-event foreign-key lock.
- Previously applied TB-EM-012 migration is byte-identical to its original source. Additive TB-EM-013 migration strengthens the guardian-recipient constraint.
- CI first applies the prior TB-EM-012 chain to a database, then applies the additive migration to the same database and runs the PostgreSQL suite.
- Synthetic negative tests include specialty/guardian revocation, cross-tenant separation, staging/production demo flag denial, and concurrency.

## Acceptance evidence and remaining gates

Exact-source GitHub Actions runs:
- https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39677724480
- https://github.com/NTinkicht/TheraBridge-Emergent/actions/runs/39677731153

The source has passed 449/449 PostgreSQL tests, 11 suites, migration upgrade check, API checks, web build, and secret scan. Confirm final `compose` status for both runs, and require **fresh full CI on this imported candidate's exact head**, before any owner merge decision.

Obtain new independent Mistral read-only review of the latest source and import fidelity. Do not reuse verdicts from earlier SHAs without re-verification.

**Owner privacy decision still open:** supervisors currently have center-wide read/reply access to guardian-addressed operational messages. The owner must explicitly acknowledge or narrow this policy before an integration merge.

Keep safeguarding issue #35 and specialty visibility issue #51 open; private canonical specifications remain private. Clinical signing, approval, consent grants, recipient release, safeguarding escalation, real-data use, pilot/production and deployment all remain NO-GO. Do not close issues or merge this draft without explicit owner authorization.
