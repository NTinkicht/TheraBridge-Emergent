import test from 'node:test';
import assert from 'node:assert/strict';
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
