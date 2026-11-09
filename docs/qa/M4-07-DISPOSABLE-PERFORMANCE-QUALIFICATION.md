# M4-07 — Synthetic performance, worker reliability and resource qualification

**Status: planning checkpoint; implementation NOT STARTED, performance benchmark NOT EXECUTED, acceptance NOT PASSED.**

Parent: [M4-07 #181](https://github.com/NTinkicht/TheraBridge-Emergent/issues/181). Epic: [M4 #167](https://github.com/NTinkicht/TheraBridge-Emergent/issues/167).
Predecessor: [M4-06 PR #304](https://github.com/NTinkicht/TheraBridge-Emergent/pull/304), merge `489428bae9ed636c3d9fe1cd6a6c910dd51448a7`.

## Reuse existing evidence; no duplicated changes
- PR #274 implemented O(n) notice lookup with a 5,000-row synthetic regression. Do not replace it without new measured evidence.
- Existing CI confirms Docker non-root execution. Previous heap/container work must be checked rather than reproduced.
- Render metric samples establish **idle** memory ~153 MiB peak within the observed current-instance window and ~512 MiB limit; idle memory is NOT loaded memory nor p95 latency.
- M4-06 migration replay PR #304 is merged; full production-style restore, Neon pooled lock races, and remaining CAS/query benchmarking are still separate open evidence gaps.

## Implementation scope
1. Create a **strictly disposable synthetic-only** load/measurement harness against a local or separately authorized ephemeral API+PostgreSQL deployment. Reject the shared Render URL or any arbitrary externally supplied service/database by default. Do not collect account passwords, cookies, clinical content or raw bodies.
2. Measure bounded endpoints and known hot paths under a reproducible fixed workload. Capture request totals, successes/failures, p50/p95/p99 latency, throughput, actual SQL query counts, query-plan/index evidence where useful, CPU/RSS peaks and test duration. Distinguish cold start, warm steady state and contention. Record exact commit, runtime and DB versions, concurrency, row counts and resource limits.
3. Assert pagination and tenant-scoped row limits, identify concrete N+1 or unbounded query behavior, and only implement focused fixes after a measured regression demonstrates an issue. Record before/after using identical workloads.
4. Exercise scheduler idempotence, duplicate dispatch/P2002 conflict handling, retry and dead-letter behavior, cleanup jobs and failure recovery. Prove no duplicate synthetic notifications, no lost work and bounded retries with positive/negative/repeat runs.
5. Measure an isolated 512 MiB-class container with non-root UID and documented Node heap settings. Verify no OOM under qualified workload; do not assert production capacity based on one synthetic run.
6. Add deterministic regression tests, sanitized machine-readable evidence and clearly labeled PASS/FAIL/BLOCKED. Keep optional resource-intensive benchmarks separated from required lightweight CI where appropriate; CI must not hide actual failures.

## Acceptance / merge gates
- [ ] Real reproducible disposable workload receipts, latency percentiles, query count and resource peaks
- [ ] Query and pagination invariants with negative/positive/tenant paths
- [ ] Scheduler retries, P2002 contention, deduplication, idempotence and error paths verified
- [ ] Scope-aligned fixes have before/after evidence and regression coverage
- [ ] Six required CI jobs green on exact final HEAD, complete review/disposition ledger and independent review
- [ ] No real patient use, shared deployment changes, clinical signing/consent/release, STT/AI or safeguarding gate changes

**Safety:** synthetic fixtures only. Existing clinical G2/G2b and D-NEW-5 NO-GO remain in force. Never represent idle metrics or unexecuted tests as load acceptance. Parent #181 remains OPEN pending actual receipts.
