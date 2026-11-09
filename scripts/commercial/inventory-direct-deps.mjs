#!/usr/bin/env node
// COM-02: deterministic direct dependency inventory, NOT a legal/license determination.
// Node >=20. No network access; does not modify package files.
import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const root = realpathSync(process.cwd());
const rootManifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const globs = rootManifest.workspaces ?? [];
if (!Array.isArray(globs) || globs.some(x => typeof x !== 'string' || !/^[a-zA-Z0-9_-]+\/\*$/.test(x))) {
  process.stderr.write('Unsupported workspace definition; update inventory tool\n');
  process.exit(2);
}
const manifestPaths = ['package.json'];
for (const glob of globs) {
  const dir = glob.slice(0, -2);
  if (!existsSync(join(root, dir))) {
    process.stderr.write('Missing workspace directory: ' + dir + '\n');
    process.exit(2);
  }
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
    if (!entry.isDirectory()) continue;
    const path = dir + '/' + entry.name + '/package.json';
    if (!existsSync(join(root, path))) {
      process.stderr.write('Missing manifest: ' + path + '\n');
      process.exit(2);
    }
    manifestPaths.push(path);
  }
}
const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const records = [];
for (const path of manifestPaths) {
  const abs = resolve(root, path);
  if (!existsSync(abs)) {
    process.stderr.write('Missing manifest: ' + path + '\n');
    process.exit(2);
  }
  const manifest = JSON.parse(readFileSync(abs, 'utf8'));
  for (const section of sections) {
    for (const [name, requestedRange] of Object.entries(manifest[section] ?? {})) {
      records.push({
        workspace: manifest.name ?? path,
        manifest: path,
        scope: section,
        package: name,
        requestedRange,
        resolvedVersion: null,
        declaredLicense: null,
        licenseStatus: 'NOT_VERIFIED',
        evidence: 'Requires lockfile/registry/package LICENSE cross-check'
      });
    }
  }
}
records.sort((a,b) => a.manifest.localeCompare(b.manifest, 'en') ||
  a.scope.localeCompare(b.scope, 'en') || a.package.localeCompare(b.package, 'en'));
const inventory = {
  schema: 'therabridge-direct-dependency-inventory-v1',
  qualification: 'DIRECT ONLY; NO VERIFIED LICENSE DATA; NOT AN SBOM',
  sourceManifests: manifestPaths,
  totalRecords: records.length,
  records
};
const output = JSON.stringify(inventory, null, 2) + '\n';
const args = process.argv.slice(2);
if (args.length === 0) {
  process.stdout.write(output);
} else if (args.length === 2 && args[0] === '--output') {
  const raw = args[1];
  const abs = resolve(root, raw);
  const rel = relative(root, abs);
  if (isAbsolute(raw) || !rel || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
    process.stderr.write('Output must be a relative file path inside the repository\n');
    process.exit(2);
  }
  const parent = dirname(abs);
  if (!existsSync(parent) || realpathSync(parent) !== resolve(root, dirname(rel))) {
    process.stderr.write('Output parent must be an existing, non-symlink directory inside the repository\n');
    process.exit(2);
  }
  writeFileSync(abs, output, { flag: 'wx' });
} else {
  process.stderr.write('Usage: node scripts/commercial/inventory-direct-deps.mjs [--output new-relative.json]\n');
  process.exit(2);
}
