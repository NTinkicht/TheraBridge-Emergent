// Dedicated CI-only synthetic demo on an isolated *_demo_test PostgreSQL database.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';

const dbUrl = new URL(process.env.DATABASE_URL ?? '');
if (process.env.DEPLOYMENT_ENV !== 'ci' || !['127.0.0.1', 'localhost'].includes(dbUrl.hostname) || !dbUrl.pathname.endsWith('_demo_test')) {
  throw new Error('Demo browser CI requires isolated loopback *_demo_test database');
}
const emails = [
  'platform.demo@childrens-home.therabridge.test',
  'admin@childrens-home.therabridge.test',
  'coordinator@childrens-home.therabridge.test',
  'speech@childrens-home.therabridge.test',
  'ot@childrens-home.therabridge.test',
  'supervisor@childrens-home.therabridge.test',
  'mariam.ahmed@childrens-home.therabridge.test',
];
const demoPasswords = Object.fromEntries(emails.map(e => [e, 'demo-' + randomBytes(24).toString('base64url')]));
const env = {
  ...process.env, DEMO_SEED_CONFIRM: 'CHILDRENS_HOME_SYNTHETIC_ONLY',
  DEMO_PASSWORDS_JSON: JSON.stringify(demoPasswords),
  AUTH_SECRET: randomBytes(32).toString('base64url'),
  HOST: '127.0.0.1', PORT: '8001', CORS_ORIGINS: 'http://127.0.0.1:3000',
  COOKIE_SECURE: 'false', TRUSTED_PROXY_CIDRS: '',
  FAMILY_PRACTICE_DEMO: 'true', HOME_PLAN_REQUESTS_DEMO: 'true', FAMILY_MESSAGING_DEMO: 'false',
  HANDOVER_DEMO: 'true',
  DEV_MAILBOX_ENABLED: 'false', DEV_OUTBOX_DIR: '',
};
const db = new PrismaClient();
const children = [];
function start(command, args) {
  const p = spawn(command, args, { env, stdio: ['ignore', 'inherit', 'inherit'] });
  children.push(p);
  return p;
}
function run(command, args) {
  return new Promise((resolve, reject) => {
    const p = start(command, args);
    p.once('error', reject);
    p.once('exit', code => code === 0 ? resolve() : reject(new Error(command + ' returned ' + code)));
  });
}
async function ready(url) {
  for (let n = 0; n < 80; n++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Service not ready: ' + url);
}
try {
  if (await db.user.count()) throw new Error('Demo CI DB must be empty');
  await run('yarn', ['workspace', '@therabridge/api', 'seed:demo']);
  await run('node', ['scripts/design/check-demo-data.mjs']);
  await run('yarn', ['workspace', '@therabridge/api', 'seed:demo']); // strict idempotency test
  await run('node', ['scripts/design/check-demo-data.mjs']);
  start('node', ['apps/api/dist/main.js']);
  start('node', ['node_modules/next/dist/bin/next', 'start', 'apps/web', '-H', '127.0.0.1', '-p', '3000']);
  await ready('http://127.0.0.1:8001/api/health');
  await ready('http://127.0.0.1:3000/login');
  await run('node', ['scripts/design/check-demo-journey.mjs']);
  await run('node', ['scripts/design/check-handover-sessions.mjs']);
} finally {
  for (const p of children) if (p.exitCode === null) p.kill('SIGTERM');
  await db.$disconnect();
  await rm('.workspace/local-credentials/childrens-home-demo.json', { force: true });
}
