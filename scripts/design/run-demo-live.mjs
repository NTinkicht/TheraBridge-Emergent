// Dedicated CI-only synthetic demo on an isolated *_demo_test PostgreSQL database.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { runBrowserAudit } from './m5-browser-observe.mjs';
import { runChild360BrowserAcceptance } from './m5-child360-browser.mjs';
import { runWU2BrowserQualification } from './m5-wu2-browser-qualification.mjs';
import { runSharedGuardianQualification } from './m5-shared-guardian-browser.mjs';
import { buildPendingSharedUxManualAcceptance } from './m5-shared-ux-manual-acceptance.mjs';
import { buildSyntheticMediaInventory } from '../qa/m5-media-inventory.mjs';
import { buildM5IntegratedBrowserReceipt } from './m5-integrated-browser-receipt.mjs';

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
// The runner must provide an independent, recoverable-in-process set for
// all three added therapists. No passwords enter logs, files or artifacts.
const extraEmails = [
  'dalia.mansour@childrens-home.therabridge.test',
  'nour.haddad@childrens-home.therabridge.test',
  'huda.rahim@childrens-home.therabridge.test',
];
const extraDemoPasswords = Object.fromEntries(extraEmails.map(e =>
  [e, 'demo-' + randomBytes(24).toString('base64url')]));
const env = {
  ...process.env, DEMO_SEED_CONFIRM: 'CHILDRENS_HOME_SYNTHETIC_ONLY',
  DEMO_PASSWORDS_JSON: JSON.stringify(demoPasswords),
  DEMO_EXTRA_PASSWORDS_JSON: JSON.stringify(extraDemoPasswords),
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
  // M5-17: read actual isolated synthetic PostgreSQL metadata under a
  // repeatable-read transaction. There is no published-image table; report
  // genuine counts and unknown published denominators rather than fabricate
  // an illustration approval or 100% published image coverage.
  const demoCenter = await db.center.findUniqueOrThrow({
    where: { slug: 'childrens-home-demo' }, select: { id: true },
  });
  const mediaInventory = await buildSyntheticMediaInventory(db, demoCenter.id);
  await writeFile('/tmp/therabridge-m5-media-inventory.json',
    JSON.stringify(mediaInventory, null, 2) + '\n', { mode: 0o600 });
  console.log('M5 real synthetic activity/media inventory (NOT accepted image coverage):',
    JSON.stringify({ ...mediaInventory.counts, status: mediaInventory.status }));
  start('node', ['apps/api/dist/main.js']);
  start('node', ['node_modules/next/dist/bin/next', 'start', 'apps/web', '-H', '127.0.0.1', '-p', '3000']);
  await ready('http://127.0.0.1:8001/api/health');
  await ready('http://127.0.0.1:3000/login');
  if (process.env.NEXT_PUBLIC_M5_CHILD_COMPACT === 'true') {
    // Dedicated browser acceptance job: build-time flag is ON only in this
    // synthetic CI process. The ordinary seven-role job stays unchanged.
    await runChild360BrowserAcceptance({ passwords: demoPasswords });
  } else {
    await run('node', ['scripts/design/check-demo-journey.mjs']);
    await run('node', ['scripts/design/check-handover-sessions.mjs']);
    const roleAudit = await runBrowserAudit({ passwords: demoPasswords,
      output: '/tmp/therabridge-m5-01-browser-observations.json' });
    const workspaceReceipt = await runWU2BrowserQualification({ passwords: demoPasswords,
      output: '/tmp/therabridge-m5-wu2-browser-qualification.json' });
    const guardianReceipt = await runSharedGuardianQualification({ passwords: demoPasswords,
      output: '/tmp/therabridge-m5-shared-guardian-ux.json' });
    const pendingSharedManual = buildPendingSharedUxManualAcceptance();
    await writeFile('/tmp/therabridge-m5-shared-ux-human-pending.json',
      JSON.stringify(pendingSharedManual, null, 2) + '\n', { mode: 0o600 });
    const integrated = buildM5IntegratedBrowserReceipt(roleAudit, workspaceReceipt);
    await writeFile('/tmp/therabridge-m5-integrated-technical-receipt.json',
      JSON.stringify(integrated, null, 2) + '\n', { mode: 0o600 });
    console.log('M5 integrated synthetic-only acceptance evidence:', JSON.stringify({
      baselineRouteObservations: integrated.automated.baselineRouteObservations,
      verifiedWorkspaceObservations: integrated.automated.verifiedWorkspaceObservations,
      guardianFiveWidthObservations: guardianReceipt.summary.observations,
      guardianScreenReaderManual: guardianReceipt.governance.screenReaderAcceptance,
      sharedUxManualStatus: pendingSharedManual.summary.status,
      pendingSharedUxHumanChecks: pendingSharedManual.summary.awaitingHumanChecks,
      pendingManualObservations: integrated.manual.observedPendingObservations,
      manualStatus: integrated.manual.status, clinicalGate: integrated.governance.clinicalGate,
    }));
  }
} finally {
  for (const p of children) if (p.exitCode === null) p.kill('SIGTERM');
  await db.$disconnect();
  await rm('.workspace/local-credentials/childrens-home-demo.json', { force: true });
}
