import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMigrationHistory } from './check-migration-history.mjs';

const root = 'apps/api/prisma/migrations/';
const old = root + '20261001000000_tb_em_001/migration.sql';
const later = root + '20261201000000_tb_em_052/migration.sql';
const earlier = root + '20260901000000_tb_em_000/migration.sql';
const before = () => new Map([[old, 'blob-sha-1']]);
const after = () => new Map([[old, 'blob-sha-1']]);

test('identical published migrations pass', () => {
  assert.deepEqual(validateMigrationHistory(before(), after()), []);
});
test('new later migration is allowed', () => {
  const next = after(); next.set(later, 'new-blob');
  assert.deepEqual(validateMigrationHistory(before(), next, new Date('2026-12-02T00:00:00Z')), []);
});
test('modifying previously published SQL is rejected', () => {
  const next = after(); next.set(old, 'changed-blob');
  assert.match(validateMigrationHistory(before(), next).join(' '), /modified/);
});
test('deleting or renaming published SQL is rejected', () => {
  const next = new Map([[later, 'new-blob']]);
  assert.match(validateMigrationHistory(before(), next).join(' '), /deleted\/renamed/);
});
test('new backdated migration is rejected', () => {
  const next = after(); next.set(earlier, 'new-blob');
  assert.match(validateMigrationHistory(before(), next).join(' '), /must follow/);
});
test('adding scripts to an existing published migration is rejected', () => {
  const next = after(); next.set(root + '20261001000000_tb_em_001/extra.sql', 'new-blob');
  assert.match(validateMigrationHistory(before(), next).join(' '), /Cannot add/);
});
test('migration folder without migration.sql is rejected', () => {
  const next = after(); next.set(root + '20261201000000_tb_em_052/README.md', 'new-blob');
  assert.match(validateMigrationHistory(before(), next).join(' '), /lacks migration.sql/);
});

test('far-future migration timestamp is rejected even if lexically appended', () => {
  const next = after(); next.set(root + '20991231235959_future/migration.sql', 'blob-new');
  assert.match(validateMigrationHistory(before(), next, new Date('2026-10-30T00:00:00Z')).join(' '), /too far in the future/);
});
test('published migration_lock.toml cannot be modified', () => {
  const prior = before(); prior.set(root + 'migration_lock.toml', 'lock-old');
  const next = after(); next.set(root + 'migration_lock.toml', 'lock-new');
  assert.match(validateMigrationHistory(prior, next).join(' '), /Published migration file modified/);
});
test('renaming a published migration is blocked even if the SQL blob is identical', () => {
  const next = new Map([[root + '20261201000000_tb_em_052/migration.sql', 'blob-sha-1']]);
  assert.match(validateMigrationHistory(before(), next, new Date('2026-12-02T00:00:00Z')).join(' '), /deleted\\/renamed/);
});
