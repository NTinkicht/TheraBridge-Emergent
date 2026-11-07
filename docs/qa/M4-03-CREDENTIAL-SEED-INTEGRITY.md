# M4-03 — Demo credential preservation, secure export, and transactional seed integrity

**Status:** IMPLEMENTATION NOT STARTED — draft work-unit checkpoint only.
**Tracking issue:** [#177](https://github.com/NTinkicht/TheraBridge-Emergent/issues/177) · **Milestone:** [M4 #167](https://github.com/NTinkicht/TheraBridge-Emergent/issues/167).
**Predecessor:** [M4-02 PR #267](https://github.com/NTinkicht/TheraBridge-Emergent/pull/267), merged as `8174a87ed27e2424500f64256742ab134f15fa3d`.

## Confirmed source baseline
- `apps/api/src/cli/seed-demo.ts` owns credential generation, hosted password parsing, 7+3 user provision, and a single Prisma transaction.
- The seven original accounts use `DEMO_PASSWORDS_JSON` or a protected local file `DEMO_CREDS`; extra therapists use `DEMO_EXTRA_PASSWORDS_JSON`.
- On a **fresh local seed**, one exclusively created `credentialFile` contains all ten passwords; repeated seeds must not rotate them.
- On an **existing seven-account local database**, the current code rejects missing extra therapist password inputs and does not independently emit a recoverable extra-only credential file.
- The current `preexistingUsers` check focuses on seven original accounts; the three additional account state and potential interrupted upgrades require explicit verification.

## Implementation tasks

### M4-03-A — Protected seven-to-ten upgrade
- Confirm exact seven legacy credentials stay unchanged after 7→10 migration (password hashes and sign-in behavior).
- Give newly added three therapists independently recoverable credentials without exposing secrets in logs, PRs, GitHub artifacts, or preview deployments.
- Either require three explicit operator-supplied secrets or create an **extra-only** secure local credential file using exclusive creation, mode 0600, parent mode 0700 and durable write, with a known recovery path. Never overwrite or rotate the original seven-file.
- Reject an existing three-account identity if its password cannot be recovered or verified; do not leave an unexported random hash.

### M4-03-B — Hosted preview policies
- Require both sets of 7+3 operator-managed passwords for hosted preview; verify correct email-to-password keys, policy strength, uniqueness across all ten, and no silent generation.
- Validate existing identity hashes match the operator-supplied secret and prevent silent rotation on reruns.
- Fail closed on missing/corrupt password source, mismatched hashes, cross-database local-file reuse, and stale partial seed states.

### M4-03-C — Filesystem + database atomicity
- Keep all user/role/assignment changes inside the existing Prisma transaction.
- Handle credential-file EEXIST/EACCES/ENOSPC/fsync failures before database mutation.
- On database abort, clean up newly created files **only when rollback is verified**; retain files on ambiguous transaction outcomes with an explicit, secure manual recovery procedure.
- Make repeated, partially interrupted attempts safe and idempotent (fresh 10, old 7 → 10, repeated 10, and attempted double seeding).

### M4-03-D — Tests and evidence
- Reuse existing seed/auth regression fixtures; add new targeted tests for seven-to-ten, extra password export, credential preservation, preview requirements, interrupted transaction and retries.
- Ensure no actual password or token appears in stdout, CI, commits or sanitized artifacts; maintain full-history secret scan.
- Verify the six exact-head CI jobs, independent reviewer dispositions and documented synthetic-only clinical NO-GO.

## Initial acceptance matrix (NOT RUN)

| Scenario | Expected outcome | State |
|---|---|---|
| Fresh local 10-account seed | Ten recoverable identities, restrictive file permissions | NOT RUN |
| Seven existing local identities → ten | Seven unchanged, three safely recoverable | NOT RUN |
| Rerun ten-account seed | Stable hashes, no rotation, no new unexported secret | NOT RUN |
| Hosted preview without both secret sets | Explicit failure before mutation | NOT RUN |
| Hosted preview mismatched existing password | Explicit failure, unchanged DB state | NOT RUN |
| Interrupted/corrupt credential file | Fail closed and preserve recovery path | NOT RUN |
| DB transaction rollback after credential export | No stranded accounts, safe file cleanup/recovery | NOT RUN |
| Two simultaneous seed processes | One consistent resulting roster, no orphan file | NOT RUN |
| No real child/clinical data or activation | Safety invariant preserved | NOT RUN |

**Review expectation:** This work unit needs code implementation and actual CI + reviewer evidence before becoming ready to merge. This initial PR is a **draft checkpoint**, not a claim of completion.
