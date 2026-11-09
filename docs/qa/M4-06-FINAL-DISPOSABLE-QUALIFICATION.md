# M4-06 Final Disposable Qualification — 2026-11-09

Parent: [#180](https://github.com/NTinkicht/TheraBridge-Emergent/issues/180). This report deliberately distinguishes **real synthetic CI qualification** from **operational approval**. No migrations or live shared database are modified by this PR.

## Prior, already-merged evidence (do not implement again)

| Claim | Grounded evidence | Qualification |
|---|---|---|
| Foreign keys, hot-path indexes and immutable audit UPDATE/DELETE | #273, #291, real PostgreSQL tests | Scoped implemented |
| Audit TRUNCATE guard | #281, #277 CLOSED | Scoped implemented |
| Audit rollback on forbidden mutation | #295, `apps/api/test/m4-db-integrity.e2e-spec.ts` | Real PostgreSQL verified |
| Non-owner runtime and owner-only migration credentials | #299/#300 and M4-06 #180 Nov 8 live Render+Neon receipt | Deployed on synthetic Render at `3cdd7226236a6aa7b3f82e04f1d26b9b5bce0b93`; 50/50 non-owned tables, no TRUNCATE |
| Fresh upgrade, published-prefix replay, advisory-lock contention and logical restore | #304 merged `489428bae9ed636c3d9fe1cd6a6c910dd51448a7`; CI `42564392161` | Disposable PostgreSQL only, PASS |

## This PR's independently checked synthetic scenarios

1. **Historical backup captured before upgrade:** The existing disposable harness applies a genuine published historical migration prefix and inserts a synthetic preservation marker; `pg_dump -Fc` is performed **before** it applies the remaining published migrations. The archive is restored to a second disposable database and the migration ledger/marker verified at the old baseline.
2. **Upgrade the restored historic DB independently:** Run `prisma migrate deploy` against the independent restored database using only a temporary loopback connection. Check full ledger and marker preservation afterward. Main disposable database is independently upgraded and replayed twice as previously tested.
3. **Cross-session CAS/row locking:** One PostgreSQL session updates a synthetic center version while keeping the transaction open; a second SQL process attempts the same row with a bounded `lock_timeout` and must fail; after commit, a stale version compare-and-swap must update zero rows and a valid fresh-version CAS must update exactly one.
4. Preserve previous tests: failed transaction atomic rollback, synchronized advisory-lock denial/release on key 72707369, owner-table trigger and privilege checks, a separate post-upgrade backup/restore. Temporary databases, archives, volume and credentials are removed.
5. Tests run in the existing required `test` job. All six original jobs, Smart CI gate, and final-head Codex review are release prerequisites; never mark a queued run PASS.

## Qualification limits and owner-required decisions

| Area | Disposition | Reason |
|---|---|---|
| Genuine pre-upgrade **CI-captured** logical archive and forward upgrade | **PENDING RUN** until real full CI completes | Not an independently archived production snapshot |
| Real PostgreSQL cross-session row CAS | **PENDING RUN** until CI completes | SQL-level only; not a complete endpoint race or tenant-level acceptance |
| Actual Neon PgBouncer/direct migration two-process race | **BLOCKED — external managed DB replay not performed** | The deployed synthetic role split is already verified, but no managed-service two-process migration/recovery drill is included in this strictly disposable scope |
| Historical externally archived DB recovery / restore-time SLA | **BLOCKED — independent archive and owner RTO/RPO approval needed** | No independently preserved old release snapshot or signed DR objectives |
| Business-specific N+1/CAS/latency performance budgets | **OPEN; shared with M4-07 #181** | Existing M4-07 baseline measurements are not production acceptance |
| Audit retention privileges and privileged operational retention | **POLICY SIGN-OFF REQUIRED** | Do not defeat immutable audit protection |
| M4-02 ten-account and two-valid-tenant hosted QA | **OUTSIDE M4-06** | Remains governed by #176, not evidence for this issue |

**Closure proposal:** Upon green exact-head CI + independent review, mark the *disposable engineering qualification* complete. Do NOT close #180 until the owner explicitly accepts carrying the remaining external Neon, independent archived snapshot, and retention-policy requirements to operational qualification with an owner sign-off. Do not represent them as executed or waived.

**Safety:** synthetic-only and no real patient content. All G2/G2b, D-NEW-5, clinical signing, consent, report release, real AI/STT and production activation stay NO-GO.
