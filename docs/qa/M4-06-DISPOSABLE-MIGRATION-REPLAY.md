# M4-06 — Disposable migration replay and rollback qualification

Status: **IMPLEMENTED IN PR #304 — CI EXECUTION IN PROGRESS; NOT YET ACCEPTED**.

Parent issue: [#180](https://github.com/NTinkicht/TheraBridge-Emergent/issues/180). M4 tracking: [#167](https://github.com/NTinkicht/TheraBridge-Emergent/issues/167).
Predecessor: Smart CI [#303](https://github.com/NTinkicht/TheraBridge-Emergent/pull/303), merged at `09ce898b768bd0bb8caf1da5dd81688eae7e25ef`.

## Already qualified; do not duplicate
- Real PostgreSQL foreign-key, index and tamper-proof audit protections (#273, #281, #291).
- Synthetic deployed separation of a non-owner runtime DB role from an owner migration role (PRs #299/#300); 25 migrations observed applied in the existing Render/Neon demo.
- Six original CI jobs and Smart CI shadow-mode gate on current main.
These findings **do not** prove a fresh installation, old-to-new migration replay, rollback or concurrent deploy safety.

## Scope of this PR
1. Implement a deterministic, strictly **disposable synthetic PostgreSQL** replay harness that can run on a *fresh database* and an *old schema snapshot* without touching Render, the shared Neon demo branch, or its accounts.
2. Keep all published Prisma migration folders and hashes byte-identical; apply migrations forward only. Establish the actual older baseline from a real tagged/commit schema, never fabricate a successful upgrade.
3. Check migration status before/after, replay idempotence, partial-failure recovery, advisory-lock/concurrent deploy behavior, and pooled-vs-direct migration URL isolation. On a stale lock: fail closed and report evidence; no forced unlock, session termination or global disablement.
4. Test a failed synthetic transaction rolls back without partial data. Document backup/restore as a **verified disposable-database restore drill**, not a claimed rollback of an applied published migration.
5. Capture sanitized exact commit, migration counts/checksums, database role capabilities, commands, observed PASS/FAIL/BLOCKED, PostgreSQL version, elapsed times, and run links. Never log connection URIs, credentials, patient data or raw fixture contents.
6. Execute locally or in an appropriately approved isolated CI environment, add negative/positive/repeat-run assertions, then request independent exact-head review.

## Acceptance and safety
- [ ] Fresh disposable PostgreSQL database: all migrations apply and re-run without pending changes.
- [ ] Old-schema disposable database: forward upgrade succeeds and preserves synthetic fixture invariants.
- [ ] Intentional failure: no partial schema/data mutation; recovery and repeatability evidenced.
- [ ] Concurrent deploy/advisory-lock and migration-role isolation demonstrated, with meaningful negative tests.
- [ ] Disposable backup/restore drill evidenced; rollback limitations clearly stated.
- [ ] Explicit receipts in M4 tracking, six required final-head CI jobs PASS, all review findings dispositioned.
- [ ] All clinical G2/G2b, safeguarding, signing, consent, release, actual patient use and real AI/STT remain NO-GO.

No production or shared demo mutation is authorized by this checkpoint. Do not mark #180 or M4 completed solely because this PR opens.

## Implementation evidence (PR #304)
- `scripts/qa/m4-disposable-replay.sh` launches its own PostgreSQL 16 Docker container, with a dynamically assigned local port; refuses to run without `TB_M4_DISPOSABLE_CONFIRM=I_AUTHORIZE_DISPOSABLE_LOCAL_DOCKER`, discards inherited database URLs, and always tears down the container and temporary dump.
- A genuine prefix of the repository's published migration folders is applied to an isolated database, followed by the unchanged full chain. Applies again and verifies ledger count and persisted synthetic marker.
- Verifies PostgreSQL transactional atomicity with an intentionally duplicate-key failure (not a claim of rolling back Prisma DDL migrations), advisory-lock acquisition denial/release, then a `pg_dump`/`pg_restore` drill to a second new disposable database. Verifies migration ledger and marker.
- `scripts/qa/m4-disposable-replay.test.mjs` pins safety, guard and static negative-path contracts. The six-job CI `test` job executes both the contract and the live Docker drill.
- Execution receipts are only PASS after an actual passing CI run. A failing or pending run is not qualification; no production/shared Render/Neon test is implied.

## Outstanding beyond this PR
- A restore from an *independently captured historical* snapshot, not just migration-prefix reconstruction; external pooled Neon advisory-lock behavior and cross-process actual migration race; owner-approved disaster recovery standards.
- Further M4-06 measured CAS contention/N+1/index benchmarking remains shared with M4-07.
- M4-02 multi-tenant hosted qualification and the separate M4-08 full API/Web coverage targets are unaffected.

