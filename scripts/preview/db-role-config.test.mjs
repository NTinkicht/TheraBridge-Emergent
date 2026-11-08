import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {validateDbRoleConfiguration as check} from './db-role-config.mjs';

const migration='postgresql://ddl:admin-secret@ep-demo.region.aws.neon.tech/therabridge_demo_m3_preview?sslmode=require';
const runtime='postgresql://app:runtime-secret@ep-demo-pooler.region.aws.neon.tech/therabridge_demo_m3_preview?sslmode=require';
const enabled={TB_DB_ROLE_SEPARATION:'true',DATABASE_URL:runtime,MIGRATION_DATABASE_URL:migration};

test('legacy preview remains available until explicit credential cutover',()=>{
 assert.deepEqual(check({DATABASE_URL:migration}),{enforced:false});
 assert.deepEqual(check({...enabled,TB_DB_ROLE_SEPARATION:'false'}),{enforced:false});
});
test('explicit two-role cutover permits direct DDL and pooled application on same database',()=>{
 assert.deepEqual(check(enabled),{enforced:true});
});
test('reject absent migration role, weak opt-in and reused owner login',()=>{
 for(const broken of [
  {...enabled,MIGRATION_DATABASE_URL:''},
  {...enabled,MIGRATION_DATABASE_URL:runtime},
  {...enabled,TB_DB_ROLE_SEPARATION:'1'},
  {...enabled,DATABASE_URL:''},
 ]) assert.throws(()=>check(broken),/configuration is invalid/);
});
test('reject other database, host, schema, port or non-Postgres URL',()=>{
 const bad=[
  runtime.replace('therabridge_demo_m3_preview','other_database'),
  runtime.replace('ep-demo-pooler','ep-attacker-pooler'),
  runtime.replace('aws.neon.tech/','aws.neon.tech:5544/'),
  runtime.replace('?sslmode=require','?schema=private&sslmode=require'),
  runtime.replace('postgresql://','https://'),
  'postgresql://app:secret@ep-demo-pooler.region.aws.neon.tech/',
 ];
 for(const DATABASE_URL of bad)
   assert.throws(()=>check({...enabled,DATABASE_URL}),/configuration is invalid/);
});
test('never include credentials or URLs in validation errors',()=>{
 for(const env of [{...enabled,DATABASE_URL:'not a URL'}, {...enabled,MIGRATION_DATABASE_URL:runtime}]) {
  try {check(env); assert.fail('expected configuration rejection');}
  catch(e) {
   assert.equal(e.message,'Preview database credential separation configuration is invalid');
   assert(!e.message.includes('secret'));
   assert(!e.message.includes('postgresql://'));
  }
 }
});

test('preview entrypoint and Docker image preserve privileged migration-only scope',()=>{
 const boot=fs.readFileSync('scripts/preview/start.sh','utf8');
 const docker=fs.readFileSync('Dockerfile.preview','utf8');
 assert.match(boot,/node scripts\/preview\/db-role-config\.mjs/);
 assert.match(boot,/DATABASE_URL="\$MIGRATION_DATABASE_URL" bash scripts\/preview\/migrate-if-needed\.sh/);
 assert.match(boot,/DATABASE_URL="\$MIGRATION_DATABASE_URL" yarn workspace @therabridge\/api seed:demo/);
 assert.match(boot,/node scripts\/preview\/verify-runtime-db-role\.mjs/);
 assert.match(boot,/bash scripts\/preview\/exec-runtime\.sh node --max-old-space-size=192 apps\/api\/dist\/main\.js/);
 assert.doesNotMatch(boot,/export DATABASE_URL="\$MIGRATION_DATABASE_URL"/);
 assert.match(docker,/COPY scripts\/preview\/db-role-config\.mjs scripts\/preview\/verify-runtime-db-role\.mjs/);
 assert.match(docker,/COPY scripts\/preview\/exec-runtime\.sh/);
 assert.match(docker,/COPY scripts\/preview\/migrate-if-needed\.sh/);
 assert.match(boot,/unset MIGRATION_DATABASE_URL/);
 assert.match(boot,/bash scripts\/preview\/exec-runtime\.sh node --max-old-space-size=192 node_modules\/next/);
});

test('real spawned API/web Node children cannot inherit the migration credential',()=>{
 for(const tag of ['api','web']) {
  const check = 'if (process.env.MIGRATION_DATABASE_URL !== undefined) process.exit(17);' +
    'if (process.env.DATABASE_URL !== "runtime-placeholder") process.exit(18);' +
    'process.stdout.write(process.argv[1]);';
  const p=spawnSync('bash',['scripts/preview/exec-runtime.sh','node','-e',check,tag],{
    env:{...process.env,DATABASE_URL:'runtime-placeholder',MIGRATION_DATABASE_URL:'owner-secret-never-export'},encoding:'utf8'});
  assert.equal(p.status,0,tag + ': '+(p.stderr||'').replaceAll('owner-secret-never-export','<redacted>'));
  assert.equal(p.stdout,tag);
 }
});
