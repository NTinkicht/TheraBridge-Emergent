# TheraBridge — Independent Takeover Checklist

Use on the **last verified** `TheraBridge-Emergent` repository commit. A checked box means it was demonstrated, not just promised.

## Evidence
- [ ] Exported GitHub branch + exact commit SHA are recorded.
- [ ] No unexported critical work is required to reproduce this checkpoint.
- [ ] `CURRENT_STATE.md`, `WORK_LOG.md`, `NEXT_WORK.md`, `TEST_RESULTS.md` and architecture/permission docs are current.
- [ ] Workflow → UI → API → test traceability identifies completed, partial, mocked and blocked behavior.
- [ ] Outstanding owner decisions and security risks are listed explicitly.

## Reproducibility
- [ ] Fresh `git clone` succeeds in an environment with no Emergent access.
- [ ] All runtimes and dependency versions are recorded and pinned; install succeeds.
- [ ] `.env.example` has every required variable name but **no secrets**.
- [ ] Working database setup (schema/migrations/indexes) and deterministic synthetic seed succeed.
- [ ] An independent start script or documented command brings up UI and API.
- [ ] Auth integration can run with independently controlled configuration/test provider.
- [ ] File storage, AI and async jobs have documented portable adapters or clear blockers.
- [ ] Automated tests actually run on this SHA; results and failures recorded.
- [ ] Two-tenant unauthorized resource test is rejected by the server.
- [ ] Working end-to-end **nonclinical** flow persists correctly across reloads.
- [ ] Another engineer/agent can make a small change, test and open a PR without Emergent.

## Data and security
- [ ] No real patient/child/health data, production tokens or passwords were committed.
- [ ] Backups and restore steps are independently tested with synthetic data.
- [ ] Owner knows who controls GitHub, DNS, hosting, database, identity and object storage.
- [ ] Clinical authorization approvals remain unsigned/default-deny; production/pilot remain NO-GO.

**Result:** `TAKEOVER VERIFIED` only when all mandatory steps pass. Otherwise `TAKEOVER PARTIAL` plus an explicit blocker list. Passing the drill permits independent **development**, not clinical deployment.