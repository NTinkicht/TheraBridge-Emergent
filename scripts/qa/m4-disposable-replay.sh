#!/usr/bin/env bash
# M4-06: disposable PostgreSQL replay. NO remote database URLs, no shared state.
set -Eeuo pipefail
umask 077
export DOCKER_CLI_HINTS=false
if [[ "${TB_M4_DISPOSABLE_CONFIRM:-}" != "I_AUTHORIZE_DISPOSABLE_LOCAL_DOCKER" ]]; then
  echo "BLOCKED: explicit disposable-local confirmation required" >&2; exit 2
fi
for command in docker node mktemp; do command -v "$command" >/dev/null || { echo "BLOCKED: missing local dependency $command" >&2; exit 2; }; done
[[ -f apps/api/prisma/schema.prisma && -d apps/api/prisma/migrations && -x node_modules/.bin/prisma ]] ||
  { echo "BLOCKED: run from a prepared repository root with installed dependencies" >&2; exit 2; }
# Never accept an externally supplied database or migration URL.
unset DATABASE_URL MIGRATION_DATABASE_URL DIRECT_URL PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK
root="$(mktemp -d)"
container="tb-m4-replay-$(node -e 'process.stdout.write(require("crypto").randomBytes(6).toString("hex"))')"
cleanup() {
  docker rm -fv "$container" >/dev/null 2>&1 || true
  rm -rf "$root"
}
trap cleanup EXIT
docker run -d --name "$container" -p 127.0.0.1::5432 -e POSTGRES_DB=therabridge_m4 -e POSTGRES_USER=tb_m4_owner \
  -e POSTGRES_PASSWORD=synthetic_disposable_only postgres:16-bookworm >/dev/null
for _ in {1..40}; do
  if docker exec "$container" pg_isready -U tb_m4_owner -d therabridge_m4 >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$container" pg_isready -U tb_m4_owner -d therabridge_m4 >/dev/null
port="$(docker port "$container" 5432/tcp | head -1 | sed -E 's/.*:([0-9]+)$/\1/')"
[[ "$port" =~ ^[0-9]+$ ]] || { echo "FAIL: ephemeral database port missing" >&2; exit 1; }
export DATABASE_URL="postgresql://tb_m4_owner:synthetic_disposable_only@127.0.0.1:${port}/therabridge_m4?schema=public"
export MIGRATION_DATABASE_URL="$DATABASE_URL"
sql() { docker exec "$container" psql -X -qAt -v ON_ERROR_STOP=1 -U tb_m4_owner -d therabridge_m4 -c "$1"; }
prisma() { node_modules/.bin/prisma "$@" >/dev/null 2>"$root/prisma-stderr" || { echo "FAIL: prisma command did not succeed (diagnostics withheld)" >&2; return 1; }; }
count_migrations() { sql 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL'; }
expected="$(find apps/api/prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
[[ "$expected" -ge 20 ]] || { echo "FAIL: unexpected migration chain length" >&2; exit 1; }
mkdir -p "$root/historical"
cp apps/api/prisma/schema.prisma "$root/historical/schema.prisma"
cp -a apps/api/prisma/migrations "$root/historical/migrations"
# Replay a genuine published prefix, not a hand-edited or fabricated migration.
for name in 20261103100000_m2_h04_integrity_indexes 20261103110000_tb_em_053_family_release_foundation \
  20261103113000_tb_em_053_synthetic_release 20261103120000_tb_em_053_consent_revision \
  20261108100000_m4_audit_truncate_guard; do
  [[ -f "$root/historical/migrations/$name/migration.sql" ]] || { echo "FAIL: historical boundary absent" >&2; exit 1; }
  rm -rf "$root/historical/migrations/$name"
done
old_expected=$(( expected - 5 ))
prisma migrate deploy --schema "$root/historical/schema.prisma"
[[ "$(count_migrations)" == "$old_expected" ]] || { echo "FAIL: historical replay count" >&2; exit 1; }
echo "PASS: actual published historical prefix applied"
# A synthetic marker must survive the forward upgrade.
sql "CREATE TABLE m4_replay_marker (id integer PRIMARY KEY, marker text NOT NULL); INSERT INTO m4_replay_marker VALUES (1, 'synthetic-only')" >/dev/null
# Historical restore drill: capture a real pre-upgrade logical archive on the
# older migration chain, then restore and upgrade a DISTINCT disposable database.
# This is not an external archived snapshot or an operational RTO/RPO guarantee.
docker exec "$container" pg_dump -Fc -U tb_m4_owner -d therabridge_m4 > "$root/historical-before-upgrade.dump"
[[ -s "$root/historical-before-upgrade.dump" ]] || { echo "FAIL: historical archive missing" >&2; exit 1; }
docker exec "$container" createdb -U tb_m4_owner therabridge_m4_historical_restore
docker exec -i "$container" pg_restore -e -U tb_m4_owner -d therabridge_m4_historical_restore \
  < "$root/historical-before-upgrade.dump" > /dev/null
historical_sql() {
  docker exec "$container" psql -X -qAt -v ON_ERROR_STOP=1 -U tb_m4_owner \
    -d therabridge_m4_historical_restore -c "$1"
}
[[ "$(historical_sql 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')" == "$old_expected" ]] ||
  { echo "FAIL: historical restored ledger mismatch" >&2; exit 1; }
[[ "$(historical_sql 'SELECT marker FROM m4_replay_marker WHERE id=1')" == synthetic-only ]] ||
  { echo "FAIL: historical restored marker mismatch" >&2; exit 1; }
# Never use shared or externally supplied credentials, even for this second
# Prisma process: the only permitted target is our disposable loopback DB.
historical_restore_url="postgresql://tb_m4_owner:synthetic_disposable_only@127.0.0.1:${port}/therabridge_m4_historical_restore?schema=public"
(
  export DATABASE_URL="$historical_restore_url" MIGRATION_DATABASE_URL="$historical_restore_url"
  prisma migrate deploy --schema apps/api/prisma/schema.prisma
)
[[ "$(historical_sql 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')" == "$expected" ]] ||
  { echo "FAIL: historical restore forward-upgrade mismatch" >&2; exit 1; }
[[ "$(historical_sql 'SELECT marker FROM m4_replay_marker WHERE id=1')" == synthetic-only ]] ||
  { echo "FAIL: historical restore marker lost during upgrade" >&2; exit 1; }
echo "PASS: pre-upgrade logical archive restored independently and migrated forward"
prisma migrate deploy --schema apps/api/prisma/schema.prisma
[[ "$(count_migrations)" == "$expected" ]] || { echo "FAIL: forward upgrade count" >&2; exit 1; }
[[ "$(sql 'SELECT count(*) FROM m4_replay_marker WHERE id=1')" == 1 ]] || { echo "FAIL: synthetic marker lost" >&2; exit 1; }
prisma migrate deploy --schema apps/api/prisma/schema.prisma
[[ "$(count_migrations)" == "$expected" ]] || { echo "FAIL: repeat deploy changed migration count" >&2; exit 1; }
echo "PASS: forward upgrade preserved synthetic data; repeat deploy idempotent"
# PostgreSQL transaction rollback, not a claim that Prisma DDL migrations are reversible.
if docker exec "$container" psql -X -q -v ON_ERROR_STOP=1 -U tb_m4_owner -d therabridge_m4 \
  -c "BEGIN; INSERT INTO m4_replay_marker VALUES (2, 'must-rollback'); INSERT INTO m4_replay_marker VALUES (1, 'duplicate-key'); COMMIT;" >/dev/null 2>&1; then
  echo "FAIL: intentionally invalid transaction unexpectedly succeeded" >&2; exit 1
fi
[[ "$(sql 'SELECT count(*) FROM m4_replay_marker')" == 1 ]] || { echo "FAIL: rollback left partial synthetic data" >&2; exit 1; }
echo "PASS: failed synthetic transaction rolls back atomically"
# Keep the lock holder session alive via a Bash coprocess: no timing guesses.
# The holder emits a marker only AFTER pg_advisory_lock succeeds; a query in
# a separate session must then fail to acquire the same lock.
coproc M4_LOCK_HOLDER {
  docker exec -i "$container" psql -X -qAt -v ON_ERROR_STOP=1 \
    -U tb_m4_owner -d therabridge_m4 2>"$root/lock-stderr"
}
printf "SELECT 'LOCK_HELD' FROM pg_advisory_lock(72707369);\n" >&"${M4_LOCK_HOLDER[1]}"
lock_marker=""
if ! IFS= read -r -t 20 lock_marker <&"${M4_LOCK_HOLDER[0]}" || [[ "$lock_marker" != LOCK_HELD ]]; then
  echo "FAIL: lock holder did not confirm acquisition" >&2; exit 1
fi
[[ "$(sql 'SELECT pg_try_advisory_lock(72707369)')" == f ]] ||
  { echo "FAIL: competing advisory lock unexpectedly acquired" >&2; exit 1; }
printf "SELECT pg_advisory_unlock(72707369);\n\\q\n" >&"${M4_LOCK_HOLDER[1]}"
# Closing the writer ensures termination even if the meta-command is ignored.
lock_writer_fd="${M4_LOCK_HOLDER[1]}"
exec {lock_writer_fd}>&-
wait "$M4_LOCK_HOLDER_PID" || { echo "FAIL: advisory-lock holder errored" >&2; exit 1; }
[[ "$(sql 'SELECT pg_try_advisory_lock(72707369)')" == t ]] ||
  { echo "FAIL: advisory lock did not release" >&2; exit 1; }
echo "PASS: advisory-lock contention denies competing acquisition and later releases"
# Verify backup/restore into a NEW separate disposable DB without altering source.
docker exec "$container" pg_dump -Fc -U tb_m4_owner -d therabridge_m4 > "$root/replay.dump"
docker exec "$container" createdb -U tb_m4_owner therabridge_m4_restore
docker exec -i "$container" pg_restore -e -U tb_m4_owner -d therabridge_m4_restore < "$root/replay.dump" >/dev/null
restored="$(docker exec "$container" psql -X -qAt -U tb_m4_owner -d therabridge_m4_restore -c 'SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')"
[[ "$restored" == "$expected" ]] || { echo "FAIL: restore migration ledger mismatch" >&2; exit 1; }
[[ "$(docker exec "$container" psql -X -qAt -U tb_m4_owner -d therabridge_m4_restore -c 'SELECT count(*) FROM m4_replay_marker')" == 1 ]] ||
 { echo "FAIL: restored synthetic marker mismatch" >&2; exit 1; }
echo "PASS: independent disposable database restore; migration ledger and marker preserved"
echo "RESULT: M4-06 disposable replay PASS (published migrations=$expected; historical prefix=$old_expected)"
