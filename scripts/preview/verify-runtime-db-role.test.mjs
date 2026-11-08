import test from 'node:test';
import assert from 'node:assert/strict';
import {safeRuntimePrivileges} from './verify-runtime-db-role.mjs';

const safe={app_table_count:50,owns_app_tables:false,privileged_login:false,
 can_create_in_schema:false,can_truncate_audit:false,can_insert_audit:true};

test('non-owner app role must insert audit events but cannot own tables or manage schema',()=>{
 assert.equal(safeRuntimePrivileges(safe),true);
});
test('fail closed for owner and inheritor roles, DDL, TRUNCATE or missing permissions',()=>{
 for(const key of ['owns_app_tables','privileged_login','can_create_in_schema','can_truncate_audit'])
  assert.equal(safeRuntimePrivileges({...safe,[key]:true}),false,key);
 assert.equal(safeRuntimePrivileges({...safe,can_insert_audit:false}),false);
 assert.equal(safeRuntimePrivileges({...safe,app_table_count:0}),false);
 assert.equal(safeRuntimePrivileges({...safe,owns_app_tables:null}),false);
 assert.equal(safeRuntimePrivileges(null),false);
});
