#!/usr/bin/env node
// M2-H01: immutable published Prisma migrations (Git blob-by-blob).
// Never rename an already-published migration: deployed _prisma_migrations
// records its folder name and checksum.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = 'apps/api/prisma/migrations/';
const folder = path => path.startsWith(ROOT) ? path.slice(ROOT.length).split('/')[0] : null;
const isMigration = name => /^\d{14}_[A-Za-z0-9_-]+$/.test(name || '');

export function validateMigrationHistory(before, after, now = new Date()) {
  const errors = [];
  const oldFolders = new Set([...before.keys()].map(folder).filter(isMigration));
  const newFolders = new Set([...after.keys()].map(folder).filter(isMigration));
  const highestExisting = [...oldFolders].sort().at(-1) ?? '';
  // Some migrations already published on main have timestamps beyond the
  // rolling two-day guard. Do not rewrite/backdate them: allow only the first
  // hour after the published head as a bounded escape hatch. Far-future new
  // migrations remain forbidden; published blobs remain byte-identical.
  const stamp = highestExisting.slice(0, 14);
  const highestDate = stamp ? Date.UTC(Number(stamp.slice(0, 4)), Number(stamp.slice(4, 6)) - 1, Number(stamp.slice(6, 8)), Number(stamp.slice(8, 10)), Number(stamp.slice(10, 12)), Number(stamp.slice(12, 14))) : 0;
  const latestAllowed = new Date(Math.max(now.getTime() + 2 * 86_400_000, highestDate + 3_600_000)).toISOString().replace(/\D/g, '').slice(0, 14);

  // All published SQL and migration metadata must remain byte-identical.
  for (const [path, sha] of before) {
    if (!after.has(path)) errors.push('Published migration file deleted/renamed: ' + path);
    else if (after.get(path) !== sha) errors.push('Published migration file modified: ' + path);
  }
  for (const path of after.keys()) {
    if (before.has(path)) continue;
    const name = folder(path);
    if (!isMigration(name)) {
      errors.push('New file outside a versioned migration folder: ' + path);
    } else if (oldFolders.has(name)) {
      errors.push('Cannot add files to an existing published migration: ' + path);
    }
  }
  for (const name of newFolders) {
    if (oldFolders.has(name)) continue;
    if (highestExisting && name <= highestExisting) {
      errors.push('New migration must follow published history (' + highestExisting + '): ' + name);
    }
    if (name.slice(0, 14) > latestAllowed) {
      errors.push('New migration timestamp is too far in the future: ' + name);
    }
    if (!after.has(ROOT + name + '/migration.sql')) {
      errors.push('New migration lacks migration.sql: ' + name);
    }
  }
  return errors;
}

function trackedMigrations(ref) {
  const out = execFileSync('git', ['ls-tree', '-r', '-z', ref, '--', ROOT], { encoding: 'utf8' });
  const files = new Map();
  for (const entry of out.split('\0').filter(Boolean)) {
    const tab = entry.indexOf('\t');
    const meta = entry.slice(0, tab).split(' ');
    const path = entry.slice(tab + 1);
    if (tab < 0 || meta[1] !== 'blob' || !path.startsWith(ROOT)) {
      throw new Error('Unexpected Git tree entry for migrations');
    }
    files.set(path, meta[2]);
  }
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const base = process.env.BASE_SHA?.trim();
    if (!base || !/^[a-f0-9]{40}$/.test(base)) throw new Error('BASE_SHA must be the exact PR base commit SHA');
    const before = trackedMigrations(base);
    const after = trackedMigrations('HEAD');
    if (!before.size || !after.size) throw new Error('Migration tree not found; fail closed');
    const errors = validateMigrationHistory(before, after);
    if (errors.length) { for (const error of errors) console.error('::error::' + error); process.exitCode = 1; }
    else console.log('PASS: all baseline migration blobs immutable; new migration folders are strictly appended');
  } catch (error) { console.error('::error::Migration history check failed:', error.message); process.exitCode = 1; }
}
