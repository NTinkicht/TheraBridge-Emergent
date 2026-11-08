#!/usr/bin/env node
// Explicit two-credential preview cutover contract. No credentials are printed.
const truthy = new Set(['true', 'false']);

function fail() { throw new Error('Preview database credential separation configuration is invalid'); }

function dbTarget(raw) {
  if (!raw) fail();
  let url;
  try { url = new URL(raw); } catch { fail(); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.username || !url.password || !url.hostname ||
      !url.pathname || url.pathname === '/' || url.hash) fail();
  const schema = url.searchParams.get('schema') ?? 'public';
  const host = url.hostname.replace(/-pooler(?=\.)/, '');
  return {host,port:url.port || '5432',database:decodeURIComponent(url.pathname.slice(1)),
    schema,user:decodeURIComponent(url.username)};
}

export function validateDbRoleConfiguration(env) {
  const flag = env.TB_DB_ROLE_SEPARATION ?? 'false';
  if (!truthy.has(flag)) fail();
  if (flag === 'false') {
    if (!env.DATABASE_URL) fail();
    return {enforced:false};
  }
  const app = dbTarget(env.DATABASE_URL);
  const migration = dbTarget(env.MIGRATION_DATABASE_URL);
  if (app.host !== migration.host ||
      app.port !== migration.port ||
      app.database !== migration.database ||
      app.schema !== migration.schema ||
      app.user === migration.user) fail();
  return {enforced:true};
}

if (process.argv[1]?.endsWith('/db-role-config.mjs')) {
  try { validateDbRoleConfiguration(process.env); }
  catch { console.error('Preview database credential separation configuration is invalid'); process.exitCode=1; }
}
