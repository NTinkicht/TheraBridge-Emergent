# Qualification round 2 — issue #47

Status: implementation verified locally; independent acceptance required. No TB-EM-011 work.

Issue: https://github.com/NTinkicht/TheraBridge-Emergent/issues/47

Base: `7d5e05113a0200f6b6cd0fb412550ef3c26f208c`. Branch: `freebuff-qualification-issue47-20261021`. Intended draft PR base: `freebuff-evaluation-20261021`. No changes to main, phase-1-center-foundation, evaluation branch or PR #48. Synthetic data only; no deployment or clinical capability activation.

## Before / after

**Reproduced before the fix against real PostgreSQL:**

1. Added a revoked-original-payload replay assertion to the existing integration test. Original service returned **200**, expected **404** (test failed).
2. Held the center write lock, started an HTTP submission, observed its PostgreSQL lock wait, committed removal through the real removal endpoint, then released the lock. Original service created an outcome with **201**, expected **404** (test failed). This demonstrates the pre-transaction authorization race, not merely a source-code inference.

**After:** active actor/center/child/link authorization occurs under a guardian row lock before any key lookup. Removed or archived child access returns a non-confirming 404. A new link for the same user cannot restore access to the removed link's outcomes. Existing therapist inbox data remains intact and marks removed guardian access.

Authorized identical replay returns the original result with `replayed:true` / HTTP 200; mismatched payload is 409; duplicate activity/day under another key is 409. First creation remains 201. Authorized recovery-by-key still returns the confirmed result. Another guardian cannot retrieve it; a colliding key produces the existing generic 409 without outcome fields. Tenant guards remain unchanged.

### Trial policy

Preserves existing implementation/policy: a confirmed retry is a read and remains available after trial expiry or the seven-day recording window, **only while the original guardian link and child remain active**. New outcomes require a writable trial and valid recording window. Feature gating still applies to POST, including replays; GET recovery remains read-only. Tests exercise expiry without advancing the session clock (so they test trial policy rather than an expired session).

## PostgreSQL concurrency strategy

Inspected `ChildrenService.removeGuardian`: transaction UPDATEs the guardian link, revokes pending invitations, inserts an append-only center event. It intentionally does not use the trial write guard, so removal remains possible after expiry.

Outcome transaction order:

1. `SELECT center ... FOR NO KEY UPDATE`: serializes against existing center writers (child archival/settings/trial operations), without blocking the `KEY SHARE` foreign-key lock needed by removal's center-event INSERT.
2. `SELECT guardian_link ... FOR UPDATE`, scoped by center, child, actor and `removed_at IS NULL`.
3. Revalidate the link and active child through the transaction client, then inspect the idempotency key. Require the original link ID as well as actor/tenant/payload identity.
4. Return a confirmed replay under those locks, or check trial state and sample schedule, insert a new outcome, append its event, and commit.

At PostgreSQL's existing READ COMMITTED default, if removal owns the link row first, the locking read waits and re-evaluates its predicate against the committed removed row; no outcome or replay is returned. If submission owns the row first, removal waits until its outcome transaction commits, then revokes it. Subsequent requests are denied. A concurrent response already authorized before revocation may reach the client after removal commits; revocation cannot retract bytes already produced by an earlier serialized operation.

The initial center lock is deliberately **NO KEY UPDATE**, not UPDATE. A stronger initial center lock blocked removal's foreign-key event insert in the meaningful concurrency tests. Only the creation path later invokes the existing trial guard (which upgrades the center lock), after it owns the guardian link; removal cannot reach its event INSERT until that link is released. No changes to revocation itself or schema are needed.

`createMany(skipDuplicates:true)` uses conflict-safe insertion instead of catching a unique violation outside the transaction. Any collision is resolved under the same authorization locks, avoiding an unlocked recovery fallback and PostgreSQL's aborted-transaction behavior. Existing database uniqueness and synthetic-only constraints remain unchanged. Trial clock is sampled after acquiring the authorization locks for a new write.

Recovery lookup now explicitly scopes the original guardian link by actor, tenant and active child in addition to removedAt. It remains one scoped read, not a write transaction. A lookup overlapping revocation follows normal PostgreSQL statement visibility: reads begun before the removal commit may finish; requests begun after committed revocation cannot retrieve the outcome.

## Modified files (exact)

- `apps/api/src/clinical/practice.service.ts` — transactional authorization, safe key handling and scoped recovery lookup.
- `apps/api/test/practice.e2e-spec.ts` — nine additional cases (ten total), extra replay assertion in the existing flow, and fixture helpers. Existing assertions retained. Invitation helper now reads the newest mailbox entry (`list()` returns newest first and a copy) and asserts HTTP 200; this prevents stale tokens when multiple cases reuse synthetic addresses.
- `docs/evaluations/freebuff-issue47-20261021/README.md` — this report.

No frontend files, contracts, dependencies, lockfiles, migrations, guards, clinical permission policies or branding changed.

## Regression coverage

| Requirement | Test coverage |
|---|---|
| First submission, identical replay, payload conflict, duplicate slot | Existing full family-practice flow; concurrent retries case |
| Revoked replay/new submission/key lookup | Existing flow plus removed/replacement-link case |
| Another guardian | Existing Ada/Bo flow: collision 409, key lookup 404, separate own outcome |
| Wrong child/tenant | Dedicated cross-child and cross-center case, including legitimate second tenant context for the same actor |
| Child archival | Dedicated replay/lookup 404 case |
| Same actor with new guardian link | Replacement-link case: no restoration of old outcome |
| Concurrent identical keys | Four concurrent HTTP POSTs: one 201, three 200, one row/event |
| Removal before waiting creation | Real center lock barrier + HTTP removal, observed `pg_stat_activity` lock wait, zero outcomes/events |
| Uncommitted removal before creation/replay | Real removal service transaction paused before commit; submission must wait on the guardian row, then 404 (two parameterized cases) |
| Creation before removal | Pause existing trial guard inside real write transaction; HTTP removal demonstrably waits on guardian row; 201 then removal 200, later replay 404 |
| Expired trial | Authorized replay/lookup succeeds; changed payload 409; new key 403; removal still succeeds then replay 404 |
| Care-team access preserved | Existing assigned-therapist/supervisor/unassigned-therapist assertions retained; removed outcomes still visible with access-removed marker |
| Clinical/synthetic safeguards | Entire authz/clinical/report suite, existing synthetic CHECK assertion, separate observation-count assertion |

The concurrency tests use real transactions and actual PostgreSQL lock-wait observation, not sleeps as proof of synchronization. A short bounded polling interval detects the lock state; timeout fails the test. Test-only spies pause existing calls but do not replace authorization, SQL, commits or revocation with mocks. One uncommitted-removal test calls the real service directly to attach the barrier to that transaction rather than incidental auth/session transactions; other removal cases use the HTTP endpoint.

## Exact verification commands / results

Existing dependencies inspected (`package.json`, committed Yarn lockfile); workspace-local Node 20.20.1 / Yarn 1.22.22 and installed project dependencies reused. Dedicated synthetic PostgreSQL 16.15 on loopback port 55432, all 12 existing migrations already applied. No system configuration or safeguards changed.

Run from repository root (each verification captured its real exit status before displaying log tails):

```bash
export PATH="$PWD/.workspace/tooling/node_modules/.bin:$PATH"
export DATABASE_URL='postgresql://therabridge@127.0.0.1:55432/therabridge_test?schema=public'
yarn workspace @therabridge/api typecheck > .workspace/issue47/typecheck.log 2>&1
yarn workspace @therabridge/api test --runTestsByPath test/practice.e2e-spec.ts > .workspace/issue47/targeted-final.log 2>&1
yarn workspace @therabridge/api test > .workspace/issue47/full-suite.log 2>&1
yarn workspace @therabridge/api build > .workspace/issue47/build.log 2>&1
```

Results:
- API typecheck: PASS.
- Final targeted practice tests: **10/10 PASS** (9.156 seconds).
- Complete API suite: **408/408 PASS**, **10/10 suites**, no skips (83.331 seconds); baseline 399 plus nine new cases.
- NestJS production build: PASS (5.36 seconds).
- Web typecheck/build: NOT RUN this round, not affected (no web/shared-contract changes).
- Existing MaxListenersExceededWarning still appears in API suite; no suppression added.

Additional concurrency repetition, three runs:

```bash
for i in 1 2 3; do
  yarn workspace @therabridge/api test --runTestsByPath test/practice.e2e-spec.ts \
    --testNamePattern='concurrent|waiting|uncommitted|holds guardian' \
    > ".workspace/issue47/concurrency-$i.log" 2>&1
  rc=$?
  tail -10 ".workspace/issue47/concurrency-$i.log"
  if [ "$rc" -ne 0 ]; then exit "$rc"; fi
 done
```

All three passed **5/5 selected concurrency cases** (5.586s, 5.788s, 6.161s). The five nonmatching tests are filtered out only in these supplemental runs; all ten ran in the full/targeted suites.

For independent before/after evidence, the original service was temporarily restored from the exact base commit while keeping the new race test, which failed with actual 201 vs expected 404. The fixed service was restored byte-for-byte (`cmp` verified) and the entire targeted suite rerun successfully afterward. The earlier passing full suite/typecheck/build tested those exact same final bytes; no subsequent functional edit was made.

`docker info` fails (exit 1): permission denied accessing `/var/run/docker.sock`. Compose was not run; no Docker or CI coverage is claimed. Test database guard still requires `_test`.

## Remaining risks / boundaries

- Center-level serialization is intentionally conservative and may reduce throughput; no performance speedup is claimed or required. Existing default transaction timeouts apply. Load/stress or multi-host failover testing was not performed.
- Tests cover the current removal implementation and both lock orderings, including replay. Arbitrary future database writers that bypass the locking conventions require their own review. No proof is claimed for all possible administrative mutation races (membership/role revocation is still guarded per request, outside this change's guardian-link transaction scope).
- The existing recovery-by-key read is not a mechanism to cancel a response already in flight before revocation commits.
- Independent review and acceptance are pending. No merge, auto-merge, deployment or TB-EM-011 is authorized.
