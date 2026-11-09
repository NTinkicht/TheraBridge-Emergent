import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const tool = fileURLToPath(new URL('./inventory-direct-deps.mjs', import.meta.url));

function fixture(workspaces = ['apps/*']) {
  const dir = mkdtempSync(join(tmpdir(), 'tb-com-inventory-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'root', workspaces, devDependencies: { alpha: '^1' } }));
  mkdirSync(join(dir, 'apps', 'api'), { recursive: true });
  mkdirSync(join(dir, 'apps', 'web'), { recursive: true });
  writeFileSync(join(dir, 'apps/api/package.json'), JSON.stringify({ name: 'api', dependencies: { zeta: '1.0.0' } }));
  writeFileSync(join(dir, 'apps/web/package.json'), JSON.stringify({ name: 'web', dependencies: { beta: '^2' } }));
  return dir;
}
function run(dir, args=[]) {
  return spawnSync(process.execPath, [tool, ...args], { cwd: dir, encoding: 'utf8', timeout: 5000 });
}
test('all detected workspaces are inventoried and license values remain unverified', t => {
  const dir=fixture();t.after(()=>rmSync(dir,{recursive:true,force:true}));
  mkdirSync(join(dir,'apps','new'));
  writeFileSync(join(dir,'apps/new/package.json'), JSON.stringify({name:'new',peerDependencies:{omega:'*'}}));
  const p=run(dir);assert.equal(p.status,0,p.stderr);
  const x=JSON.parse(p.stdout);
  assert.deepEqual(x.sourceManifests,['package.json','apps/api/package.json','apps/new/package.json','apps/web/package.json']);
  assert.equal(x.totalRecords,4);
  assert(x.records.every(y=>y.declaredLicense===null && y.licenseStatus==='NOT_VERIFIED'));
  assert.equal(run(dir).stdout,p.stdout,'deterministic output');
});
test('reject absolute, escaping, and symlink output paths', t => {
  const dir=fixture();t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const external=mkdtempSync(join(tmpdir(),'tb-com-outside-'));t.after(()=>rmSync(external,{recursive:true,force:true}));
  for(const path of ['../../escape.json',join(external,'abs.json')]) {
    const p=run(dir,['--output',path]);assert.equal(p.status,2,p.stderr);
  }
  symlinkSync(external,join(dir,'linked'),'dir');
  const p=run(dir,['--output','linked/out.json']);assert.equal(p.status,2,p.stderr);
  assert.equal(existsSync(join(external,'out.json')),false);
});
test('does not overwrite existing inventory and rejects invalid args', t=>{
  const dir=fixture();t.after(()=>rmSync(dir,{recursive:true,force:true}));
  assert.equal(run(dir,['--output','inventory.json']).status,0);
  const before=readFileSync(join(dir,'inventory.json'),'utf8');
  assert.notEqual(run(dir,['--output','inventory.json']).status,0);
  assert.equal(readFileSync(join(dir,'inventory.json'),'utf8'),before);
  assert.equal(run(dir,['--unexpected']).status,2);
});
test('fails clearly when listed workspace manifest is missing', t=>{
  const dir=fixture();t.after(()=>rmSync(dir,{recursive:true,force:true}));
  mkdirSync(join(dir,'apps','missing'));
  const p=run(dir);
  assert.equal(p.status,2);
  assert.match(p.stderr,/Missing manifest: apps\/missing\/package.json/);
});
test('unsupported workspace notation fails closed', t=>{
  const dir=fixture(['packages/**']);t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const p=run(dir);
  assert.equal(p.status,2);
  assert.match(p.stderr,/Unsupported workspace definition/);
});
