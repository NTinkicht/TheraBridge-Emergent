# M4-07 — Real database contention and 512 MiB sustained synthetic qualification

Parent [#181](https://github.com/NTinkicht/TheraBridge-Emergent/issues/181). Prior merged implementation: #274 (linear notice selection), #288/#292 (CI/provenance), #305 (40 serial + 80 concurrency-8 genuine disposable Fastify/PostgreSQL requests, bounded appointment EXPLAIN, modeled worker fault/retry).

## Scope of this consolidated follow-up

1. **Actual PostgreSQL reservation race:** `apps/api/test/operations.e2e-spec.ts` uses existing real HTTP/RBAC synthetic setup to create a therapist, child, linked guardian and scheduled appointment; eight concurrent sweeps from two `NoticesService` instances sharing a *real PostgreSQL-backed Prisma pool* must reserve exactly one partial-index-protected `appointment_notice`, produce exactly one synthetic outbound message, and send zero on three repeated sweeps. This exercises database-backed conflict handling, not a mock model. The existing real-DB failed-send/retry test remains.
2. **Ten-minute isolated stress sample:** `scripts/qa/m4-local-sustained-http.mjs` exercises local Fastify `GET /api/health`, exactly 200 seconds per concurrency 1, 4 and 8 (600 seconds in total) against a preview that uses real disposable PostgreSQL, with bounded batch pacing and a 5-second timeout per request. All requests must return HTTP 200 and indicate healthy DB/migrations. Record p50/p95/p99 and throughput per phase, request count, and error count.
3. **Real unified container resource cap:** Existing `preview-container` CI job starts the *combined Next.js + NestJS* image non-root UID 1000 with a 512 MiB hard memory/swap cap, verifies cgroup v2 `memory.peak` and `memory.events` OOM kills after workload and records strictly numeric metrics. No shared hosted/Neon environment is stressed or mutated.
4. **Fail-closed receipt and safety tests:** strict, exact schema validation before artifact upload (no raw responses, passwords, usernames, IP addresses, request content or traces). Negative tests reject shortened runs, error counts, forged concurrency, UID/root, lifted memory cap, OOM kills or extra nested/private fields.
5. All six required CI jobs and Smart CI gate plus final-HEAD Codex review must be successful before merge. No performance result is claimed before those checks finish.

## Measured vs still pending

| Acceptance | Position before CI run |
| --- | --- |
| Published notice O(n) batching, bounded 1,000-reminder sweep, real-DB retry from prior implementations | Already merged and tested |
| Real database simultaneous outbox reservation and replay | Implemented in this PR; **execution pending** |
| 10-minute three-concurrency loopback API+Postgres health workload | Implemented; **execution pending** |
| 512 MiB nonroot unified preview under that load and zero OOM kills | Implemented; **execution pending** |
| Arbitrary business route p95/p99/error budget, per-route SQL query ceilings and comparative before/after workloads | **OWNER BUDGETS NOT SIGNED; NOT QUALIFIED** |
| Whole-app mixed authenticated/tenant workload, actual SQL wire query trace, rate counter cleanup under sustained volume | **NOT QUALIFIED by health-only load** |
| Durable outbox crash recovery / retry deadline / dead-letter with real service restart | **NOT QUALIFIED**; two-instance repeatability + in-process failure retry are not durable restart/dead-letter |
| Production traffic, live Render load, clinical activation | **NOT RUN** |

This PR deliberately does **not** add a database migration, new production endpoints, change clinical policy, authorize shared Render stress or invent commercial SLA thresholds. Existing G2/G2b, D-NEW-5, consent, signing/release and real AI/STT gates remain NO-GO.

**Closeout criterion:** If this PR's tests/CI and Codex pass, mark the bounded *synthetic engineering* evidence complete. Keep #181 open for the explicit unsigned/production-workload acceptance criteria, or close only if their residual dependencies are separately tracked and owner-approved. Never claim release capacity from a health-only synthetic benchmark.
