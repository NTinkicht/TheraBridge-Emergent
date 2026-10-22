// Test-only harness; no hosting/preview configuration or external credentials.
import { spawn } from 'node:child_process';
import { createServer, request } from 'node:http';
import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
const url = new URL(process.env.DATABASE_URL ?? '');
if (process.env.DEPLOYMENT_ENV !== 'ci' || !['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_live_test')) throw new Error('Requires ci and an isolated loopback *_live_test database');
const env = { ...process.env, AUTH_SECRET: randomBytes(32).toString('base64url'), HOST: '127.0.0.1', PORT: '8001', COOKIE_SECURE: 'false', CORS_ORIGINS: 'http://127.0.0.1:3000', TRUSTED_PROXY_CIDRS: '', DEV_MAILBOX_ENABLED: 'false', DEV_OUTBOX_DIR: '' };
const children = [];
function start(command, args) { const child = spawn(command, args, { env, stdio: ['ignore', 'inherit', 'inherit'] }); children.push(child); return child; }
function run(command, args) { return new Promise((resolve, reject) => { const child = start(command, args); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} failed: ${code}`))); }); }
const db = new PrismaClient();
const proxy = createServer((req, res) => {
  const upstream = request({ hostname: '127.0.0.1', port: req.url.startsWith('/api/') ? 8001 : 3001, path: req.url, method: req.method, headers: req.headers }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  upstream.on('error', () => { res.writeHead(502); res.end('Test upstream unavailable'); }); req.pipe(upstream);
});
async function ready(url) { for (let i = 0; i < 60; i++) { try { const r = await fetch(url); if (r.ok) return; } catch {} await new Promise(r => setTimeout(r, 500)); } throw new Error(`Not ready: ${url}`); }
try {
  if (await db.user.count()) throw new Error('Live test requires an empty disposable database');
  await run('yarn', ['workspace', '@therabridge/api', 'seed:synthetic']);
  const center = await db.center.findUniqueOrThrow({ where: { slug: 'harbor' } });
  const user = await db.user.findUniqueOrThrow({ where: { emailNormalized: 'leila.hassan@harbor.therabridge.test' } });
  const membership = await db.membership.findUniqueOrThrow({ where: { userId_centerId: { userId: user.id, centerId: center.id } } });
  await db.center.update({ where: { id: center.id }, data: { specialties: ['speech'] } });
  await db.membership.update({ where: { id: membership.id }, data: { specialties: ['speech'] } });
  const child = await db.child.create({ data: { centerId: center.id, firstName: 'Synthetic', lastName: 'Concurrency', dateOfBirth: new Date('2020-01-01'), services: ['speech'], createdById: user.id, createdAt: new Date() } });
  await db.careAssignment.create({ data: { centerId: center.id, childId: child.id, membershipId: membership.id, service: 'speech', startedAt: new Date() } });
  await db.activityTemplate.create({ data: { centerId: center.id, title: 'Synthetic turn taking', service: 'speech', ageBand: '3-6', minutes: 5, materials: ['Synthetic cards'], steps: ['Take turns'], safety: ['Synthetic only'], createdAt: new Date() } });
  start('node', ['apps/api/dist/main.js']);
  start('node', ['node_modules/next/dist/bin/next', 'start', 'apps/web', '-H', '127.0.0.1', '-p', '3001']);
  await new Promise((resolve, reject) => { proxy.once('error', reject); proxy.listen(3000, '127.0.0.1', resolve); });
  await ready('http://127.0.0.1:8001/api/health'); await ready('http://127.0.0.1:3000/login');
  await run('node', ['scripts/design/check-session-live.mjs']);
} finally {
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  proxy.closeAllConnections(); proxy.close(); await db.$disconnect();
  await rm('.workspace/local-credentials/synthetic-accounts.json', { force: true });
}
