import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const script = 'scripts/qa/m4-disposable-replay.sh';
const source = readFileSync(script, 'utf8');

test('shell syntax is valid', () => {
  const check = spawnSync('bash', ['-n', script], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
});
test('explicit synthetic-only guard rejects run without confirmation', () => {
  const run = spawnSync('bash', [script], {
    env: { PATH: process.env.PATH }, encoding: 'utf8', timeout: 3000
  });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /disposable-local confirmation required/);
});
test('no caller connection URI is honored and cleanup is guaranteed', () => {
  assert.match(source, /unset DATABASE_URL MIGRATION_DATABASE_URL DIRECT_URL/);
  assert.match(source, /trap cleanup EXIT/);
  assert.match(source, /docker rm -fv/);
  assert.ok(source.includes('-p 127.0.0.1::5432'));
  assert.ok(!source.includes(' -P -e POSTGRES_DB='));
  assert.match(source, /coproc M4_LOCK_HOLDER/);
  assert.match(source, /LOCK_HELD/);
  assert.match(source, /postgres:16-bookworm/);
  assert.ok(!source.includes('pg_terminate_backend'));
  assert.ok(!source.includes('DISABLE_ADVISORY_LOCK=1'));
});
test('replay performs actual upgrade, rollback, contention and restore', () => {
  for (const proof of ['migrate deploy', 'count_migrations', 'BEGIN;', 'pg_try_advisory_lock', 'pg_dump', 'pg_restore', 'therabridge_m4_restore']) {
    assert.ok(source.includes(proof), 'Missing replay stage: ' + proof);
  }
});

test('historical logical backup is taken before main forward upgrade and independently restored', () => {
  const backup = source.indexOf('historical-before-upgrade.dump');
  const upgrade = source.indexOf('prisma migrate deploy --schema apps/api/prisma/schema.prisma');
  assert.ok(backup > 0 && upgrade > backup, 'Archive must precede main upgrade');
  for (const proof of ['therabridge_m4_historical_restore', 'historical_sql', 'pre-upgrade logical archive restored independently', 'historical_restore_url']) {
    assert.ok(source.includes(proof), 'Missing independent historical restore proof: ' + proof);
  }
  assert.match(source, /pg_restore -e/);
});
test('real PostgreSQL CAS race fails closed on lock timeout and stale version', () => {
  for(const proof of ['coproc M4_CAS_HOLDER','CAS_HELD','lock_timeout=200ms','AND version=1','AND version=2','SELECT version FROM center']) {
    assert.ok(source.includes(proof), 'Missing database CAS qualification: ' + proof);
  }
  assert.match(source, /wait "\$M4_CAS_HOLDER_PID"/);
  assert.match(source, /stale CAS unexpectedly overwrote/);
});
