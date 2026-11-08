import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

function simulate(statusCode, deployCode) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tb-migration-gate-'));
 const log=path.join(dir,'calls.log');
 const yarn=path.join(dir,'yarn');
 fs.writeFileSync(yarn,`#!/usr/bin/env bash
echo "$*" >> "$FAKE_YARN_LOG"
if [[ "$*" == "workspace @therabridge/api prisma migrate status" ]]; then exit "$FAKE_STATUS_CODE"; fi
if [[ "$*" == "workspace @therabridge/api prisma migrate deploy" ]]; then exit "$FAKE_DEPLOY_CODE"; fi
exit 99
`,{mode:0o755});
 try {
  const r=spawnSync('bash',['scripts/preview/migrate-if-needed.sh'],{
    cwd:process.cwd(),encoding:'utf8',
    env:{...process.env,PATH:dir+path.delimiter+process.env.PATH,
      FAKE_YARN_LOG:log,FAKE_STATUS_CODE:String(statusCode),
      FAKE_DEPLOY_CODE:String(deployCode)}
  });
  return {exit:r.status,commands:fs.existsSync(log)?fs.readFileSync(log,'utf8').trim().split('\n'):[],
    stdout:r.stdout,stderr:r.stderr};
 } finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
test('up-to-date Prisma history never takes the potentially stranded advisory lock',()=>{
 const r=simulate(0,99);
 assert.equal(r.exit,0);
 assert.deepEqual(r.commands,['workspace @therabridge/api prisma migrate status']);
 assert.match(r.stdout,/no deploy required/);
});
test('pending or divergent history still uses lock-protected Prisma deploy',()=>{
 const r=simulate(1,0);
 assert.equal(r.exit,0);
 assert.deepEqual(r.commands,['workspace @therabridge/api prisma migrate status',
  'workspace @therabridge/api prisma migrate deploy']);
});
test('no silent success on failed Prisma migrate deploy',()=>{
 const r=simulate(1,1);
 assert.notEqual(r.exit,0);
 assert.deepEqual(r.commands,['workspace @therabridge/api prisma migrate status',
  'workspace @therabridge/api prisma migrate deploy']);
});
test('the preview migration gate never disables Prisma advisory locking',()=>{
 const source=fs.readFileSync('scripts/preview/migrate-if-needed.sh','utf8');
 assert.doesNotMatch(source,/PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK\s*=/);
 assert.match(source,/prisma migrate status/);
 assert.match(source,/prisma migrate deploy/);
});
