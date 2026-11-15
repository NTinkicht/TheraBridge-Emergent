import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildAudit, capturePlan, parseNav, routeFromFile, PERSONAS, VIEWPORTS } from './m5-route-audit.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'tb-m5-routes-'));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const appRoot = join(root, 'app');
  async function page(path, text = "'use client';\nexport default function Page(){ return <h1>Test</h1> }\n") {
    const target = join(appRoot, path, 'page.tsx');
    await mkdir(join(appRoot, path), { recursive: true });
    await writeFile(target, text);
  }
  const navPath = join(root, 'ProductShell.tsx');
  async function nav(entries) {
    await writeFile(navPath, 'const NAV: unknown[] = [\n' + entries.map(x =>
      "  { key: '" + x.key + "', href: '" + x.href + "', label: 'Test' },").join('\n') + '\n];\n');
  }
  await page('app');
  await page('login');
  await nav([{ key: 'home', href: '/app' }]);
  return { root, appRoot, navPath, page, nav };
}

test('canonical Next routes strip groups and preserve dynamic params', () => {
  assert.equal(routeFromFile('(marketing)/app/children/[id]/page.tsx'), '/app/children/:id');
  assert.equal(routeFromFile('app/activity/[...parts]/page.tsx'), '/app/activity/:parts+');
  assert.equal(routeFromFile('app/activity/[[...parts]]/page.tsx'), '/app/activity/:parts*');
  assert.equal(routeFromFile('app/@dialog/page.tsx'), null);
  assert.equal(routeFromFile('app/(.)preview/page.tsx'), null);
  assert.equal(routeFromFile('app/api/route.ts'), null);
});

test('persona/viewport plan is exactly 7 x 5 x 5 with zero fabricated observations', () => {
  const plan = capturePlan();
  assert.equal(PERSONAS.length, 7);
  assert.deepEqual(VIEWPORTS, [320, 390, 768, 1024, 1440]);
  assert.equal(plan.length, 175);
  assert(plan.every(p => p.screenshotStatus === 'NOT_RUN' && p.keyboardStatus === 'NOT_RUN'
    && p.taskCompletionStatus === 'NOT_RUN' && p.ownerSignoff === 'NOT_OBTAINED'));
  assert.equal(new Set(plan.map(p => p.persona)).size, 7);
  assert.throws(() => capturePlan([{ id: 'x', routes: [] }, { id: 'x', routes: [] }]), /Invalid/);
});

test('NAV parser preserves separate permission-gated entries', () => {
  const nav = parseNav("const NAV: unknown[] = [\n{ key: 'activities', href: '/app/activities', permission: 'center.activities.read', label: 'Activities' },\n{ key: 'activities', href: '/app/activities', permission: 'family.activities.read', label: 'Home' },\n];\n");
  assert.equal(nav.length, 2);
  assert.notEqual(nav[0].permission, nav[1].permission);
  assert.throws(() => parseNav('const OTHER = []'), /NAV definition/);
  assert.throws(() => parseNav("const NAV: unknown[] = [\n{ key: 'x', href: 'https://evil.example' },\n];\n"), /unsafe/);
});

test('source inventory refuses incomplete persona targets, not quietly records false PASS', async t => {
  const fx = await fixture(t);
  await assert.rejects(buildAudit({ appRoot: fx.appRoot, navPath: fx.navPath }), /Persona task entry routes missing/);
});

test('duplicate Next canonical route fails closed instead of overwriting route', async t => {
  const fx = await fixture(t);
  await fx.page('(shadow)/app');
  await assert.rejects(buildAudit({ appRoot: fx.appRoot, navPath: fx.navPath }), /Duplicate canonical route/);
});

test('orphan navigation fails closed even when source route inventory is nonempty', async t => {
  const fx = await fixture(t);
  await fx.nav([{ key: 'broken', href: '/app/not-a-page' }]);
  await assert.rejects(buildAudit({ appRoot: fx.appRoot, navPath: fx.navPath }), /navigation targets missing/);
});

test('symbolic links are not traversed as route sources', async t => {
  const fx = await fixture(t);
  await mkdir(join(fx.root, 'external'), { recursive: true });
  await writeFile(join(fx.root, 'external', 'page.tsx'), 'secret data');
  await symlink(join(fx.root, 'external'), join(fx.appRoot, 'linked'));
  await assert.rejects(buildAudit({ appRoot: fx.appRoot, navPath: fx.navPath }), /Persona task entry routes missing/);
});
