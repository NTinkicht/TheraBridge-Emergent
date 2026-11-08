#!/usr/bin/env node
// Read-only privilege preflight before starting the Nest API with nonowner DB credentials.
// Never print any connection URL, database errors, passwords, or clinical rows.
import {createRequire} from 'node:module';
const require = createRequire(new URL('../../apps/api/package.json', import.meta.url));
const {PrismaClient} = require('@prisma/client');

export function safeRuntimePrivileges(row) {
  return Boolean(row &&
    row.app_table_count > 0 &&
    row.owns_app_tables === false &&
    row.privileged_login === false &&
    row.can_create_in_schema === false &&
    row.can_truncate_audit === false &&
    row.can_insert_audit === true);
}

async function main() {
 const client=new PrismaClient();
 try {
  const rows=await client.$queryRawUnsafe(`
   SELECT
     (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind IN ('r','p')) AS app_table_count,
     EXISTS (
       SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind IN ('r','p') AND
         (c.relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)
          OR pg_has_role(current_user,c.relowner,'MEMBER'))
     ) AS owns_app_tables,
     (SELECT rolsuper OR rolcreatedb OR rolcreaterole
       FROM pg_roles WHERE rolname=current_user) AS privileged_login,
     has_schema_privilege(current_user,'public','CREATE') AS can_create_in_schema,
     has_table_privilege(current_user,'public.audit_event','TRUNCATE') AS can_truncate_audit,
     has_table_privilege(current_user,'public.audit_event','INSERT') AS can_insert_audit`);
  if(rows.length!==1 || !safeRuntimePrivileges(rows[0])) throw new Error('unsafe');
  console.log('Non-owner application database privilege preflight passed');
 } finally {await client.$disconnect();}
}
if(process.argv[1]?.endsWith('/verify-runtime-db-role.mjs')){
 main().catch(()=>{console.error('Non-owner database runtime privilege preflight failed');process.exitCode=1;});
}
