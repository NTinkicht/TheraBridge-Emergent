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
