# TheraBridge × Emergent — Continuous Handover and Exit Protocol

**Status:** Proposed engineering governance, 20 October 2026  
**Applies to:** Synthetic-data-only Emergent implementation of TheraBridge V1  
**Goal:** Any authorized engineer or coding agent can understand, run, test, and continue the latest **exported checkpoint** without depending on Emergent chat history or Emergent hosting.

## 1. Authority and repository boundaries

- **Canonical private specifications:** `NTinkicht/TheraBridge`. These remain the source of product and workflow decisions. Do not overwrite or reinterpret them by an Emergent implementation.
- **Proposed private application repository:** `NTinkicht/TheraBridge-Emergent` (create only with owner authorization). Contains the generated application, its own test suite, runbooks, traceability, and checkpoint history. Avoid a direct push to the original repository's `main`.
- **Emergent:** Temporary **writer/development environment**. It is not the sole store of requirements, decisions, credentials, datasets, infrastructure, or acceptance evidence.
- **Human owner:** Approves architecture deviations, clinical/security policies, production access, secrets, release gates, and integration of work into the canonical product.
- **Reviewers:** May audit code and tests independently. Reviews are not retroactively presumed to be complete or passed.

### Critical platform realities

As documented by Emergent's Help Center in October 2026:

1. **Save → Save to GitHub** is a snapshot/push, not a live two-way synchronization. Importing a GitHub repository is supported when starting a **new** Emergent job, but **no mid-job pull or in-platform merge** is available.
2. Code export **does not include** the database, environment variables, secrets, or installed dependencies (`node_modules`). Those require independent ownership and documented restoration.
3. Emergent's defaults may differ from the preferred TheraBridge stack. Do not accept a backend/database switch silently. A working Emergent prototype is not evidence of production architecture compatibility.
4. Export is **not** equivalent to a functioning independent installation. Takeover requires a successful reproducibility test outside Emergent.

References: https://help.emergent.sh/a-tour-of-the-workspace ; https://help.emergent.sh/your-data-ownership ; https://help.emergent.sh/faqs

## 2. Definition of a work unit

A work unit is a narrowly scoped, testable task such as `TB-EM-001-center-registration`. It contains:

1. **Before:** identifier, objective, user role, linked workflow ID, affected routes, data model, permissions, test acceptance criteria, scope exclusions and architecture implications.
2. **Implementation:** tracked code changes, tests, docs, schema and migration files, design tokens; no private-only manual setup.
3. **After:** changed file list, what really works, what remains mocked/disabled, design decisions and trade-offs, schema/data effects, executed commands, actual pass/fail results, screenshots or redacted evidence links, known bugs, next action.
4. **Checkpoint:** save the complete workspace to the designated GitHub branch; record repository name, branch, SHA, export time, and whether the SHA was verified in GitHub. Never call a checkpoint complete before verifying it exists.

**Rule:** Do not start the next work unit until the current one has a checkpoint or has been explicitly marked `UNEXPORTED / AT RISK`.

## 3. Required continuously maintained files

Proposed paths inside the Emergent application repository:

| File | Required purpose | Update cadence |
|---|---|---|
| `README.md` | What the app does, actual stack and honest current functional scope | Every significant milestone |
| `docs/handover/CURRENT_STATE.md` | Last verified commit, completed/in-progress/blocked tasks, current working URLs, known defects | After every work unit |
| `docs/handover/WORK_LOG.md` | Chronological work unit ledger: what changed and why, test evidence | After every work unit |
| `docs/handover/NEXT_WORK.md` | Exact next actionable task, acceptance criteria, risks and dependencies | After every work unit |
| `docs/architecture/ARCHITECTURE.md` | Services, authentication, authorization, tenancy, database, flows, integrations | Whenever architecture changes |
| `docs/architecture/decisions/ADR-XXXX.md` | Context, options, decision, reason, consequences; proposed vs approved | Every architectural decision |
| `docs/security/PERMISSIONS.md` | Role × resource × action × scope; unresolved clinical permissions **DENY** | Whenever permissions change |
| `docs/traceability/WORKFLOW_COVERAGE.csv` | Workflow step → route → UI component → API → test → state (real/mock/blocked) | Every feature |
| `docs/api/openapi.yaml` (or generated committed equivalent) | API operations and request/response/denial contracts | Every API change |
| `docs/data/DATA_MODEL.md` | Entities, relations, indexes, constraints, versioning, migrations | Every schema change |
| `docs/operations/RUN_LOCAL.md` | Exact clean-machine steps to run without Emergent | Test on every milestone |
| `docs/operations/EXIT_FROM_EMERGENT.md` | Provider-by-provider takeover/cutover and restore instructions | Each integration change |
| `.env.example` | **Variable names and nonsecret example values only**, where each value comes from | Each configuration change |
| `scripts/seed-synthetic.*` | Deterministic, fake test accounts/centers/children only | Schema/fixture change |
| `docs/qa/TEST_RESULTS.md` | Actual commands, environment, commit, pass/fail/blocked and defects | Every checkpoint |

If Emergent cannot maintain a required file, record the limitation in `CURRENT_STATE.md` and do not claim the handover is complete.

## 4. Portability constraints from day one

- Preferred application stack is Next.js App Router, TypeScript, NestJS/Fastify, PostgreSQL/Prisma, OIDC, Redis/BullMQ and S3-compatible storage. **Request capability assessment first.** Alternate stack permitted **only for a clearly labeled synthetic POC after owner approval**, never as an unannounced change to approved architecture.
- Keep core business logic, child/tenant authorization, signed/released version checks, and storage rules in explicit, testable modules rather than Emergent-specific hidden services or prompt-based behaviors.
- Use adapters for identity, payments, email, file storage and AI providers. Document each adapter's implementation, configuration, failure modes and externally managed replacements.
- Prefer independently owned accounts for infrastructure and data **when feasible**. Do not assume Emergent-managed database credentials provide direct outside access. If not independently controllable, maintain an executable, tested synthetic data export/import procedure.
- Lock dependency versions; commit migration files and schema; include Dockerfiles and a dev Compose configuration where appropriate to the approved stack; avoid undocumented manual console setup.
- Logs must redact personal, clinical, authentication and secret information. Development uses **fictional synthetic data only**; no actual children/patients.
- Store code and documentation in private GitHub. Store secrets in an owner-controlled vault. Document secrets by name/location, **never values**.

## 5. Export and review protocol

**At project start**
- Authorize a private GitHub repo. Save an initial empty/scaffold checkpoint to verify Emergent can export and we can clone it.
- Ensure the right GitHub repository/branch is selected. Protect the canonical repository's `main`. Avoid force pushes.
- Perform the first **cold-clone test** before building significant features; otherwise the risk of lock-in is unmeasured.

**For every work unit**
1. Emergent writes a short plan and declares affected files; obtain approval for material architecture/permission changes.
2. Emergent implements the feature, documents actual changes, and executes relevant tests.
3. Inspect Git diff and updated `CURRENT_STATE.md`, `WORK_LOG.md`, `TEST_RESULTS.md` and traceability.
4. Use Emergent's **Save to GitHub**. Record and verify the resulting commit SHA.
5. External CI/reviewer tests the pushed SHA independently. Treat failing/no CI as a blocker, not a pass.
6. The owner or authorized agent accepts the checkpoint or requests corrections; the next work unit begins only after checkpoint discipline is met.

**At end of every working session**
- Record the exact source branch and SHA, what's still unexported, commands actually executed, known failures, and the first next action.
- Avoid leaving half-completed work outside GitHub as the only source of a critical feature.

**Caution:** An Emergent workspace may contain unsaved work beyond the latest GitHub export. Takeover is guaranteed only to the **last verified exported SHA**. More frequent exports reduce the recovery gap; GitHub cannot recover unexported changes.

## 6. Acceptance gates for a completed work unit

All must be **PASS**, or the checkpoint is marked **INCOMPLETE**:

- Source and document changes present at verified GitHub SHA.
- App installs/builds on a clean environment using documented commands; no private hardcoded filesystem paths.
- Automated tests for happy paths, wrong-tenant/wrong-child access, expired grants and other relevant negative paths are actually executed.
- Any schema migration and deterministic synthetic seed are repeatable; fresh startup tested.
- New routes/screens are linked to acceptance criteria; no false UI confirmations or fake clinical approvals.
- Architecture decision and owner-approval boundaries are recorded.
- Third-party services are listed with portable replacements, env names, and cost/dependency risks.
- Security and clinical gates: unresolved signing/release/safeguarding/recording authorizations remain default-deny; clinical pilot and production remain **NO-GO**.

## 7. Emergency takeover drill (run after milestone 1 and periodically)

**Without opening Emergent:**

1. Clone the **last verified SHA** of the private application repository into a fresh computer or independent CI runner.
2. Follow `RUN_LOCAL.md` exactly: install supported runtimes, restore **test-only** environment config, start services, apply migrations/indexes, and load fictional demo fixtures.
3. Run unit, integration, permission/tenant-isolation and browser smoke tests. Record results by SHA.
4. Login as test platform admin, center admin, therapist and guardian; perform a safe end-to-end **nonclinical** workflow with persistence.
5. Use `EXIT_FROM_EMERGENT.md` to identify any vendor-managed service that prevents startup or functional operation. Mark those as **TAKEOVER BLOCKERS**.
6. Make one trivial documented code change, run tests and open a PR in GitHub **without touching Emergent**.
7. Verify an independent host or local environment can run the app. A page displaying without a working API/database is not a passed drill.

**Stop/go decision:** If steps 1–7 pass, independent **development** takeover is demonstrated. This is not security certification, clinical authorization or production readiness.

## 8. Dashboard fields to maintain outside Emergent

Each row represents a work unit or GitHub checkpoint:

`work_unit_id | user_role | workflow_id | branch | commit_sha | last_saved_utc | working_routes | implemented_real | explicitly_disabled | tests_passed | tests_failed | tests_not_run | clean_clone_pass | open_defects | next_action | owner_decision`

Interpret `tests_not_run` literally. Never turn a code-generated test, a Figma hotspot, or a planned test into an executed PASS.

## 9. Recommended operating model

**Emergent writes; GitHub records; independent agents verify; owner authorizes.** Use a new Emergent job when importing a GitHub revision; do not assume an open job can absorb changes pushed by other agents. If the experiment is adopted, integrate reviewed functionality into `NTinkicht/TheraBridge` under its existing rules, rather than rewriting the canonical documents around the POC.