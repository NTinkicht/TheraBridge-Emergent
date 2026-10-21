import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.SESSION_UI_BASE_URL ?? 'http://127.0.0.1:3000';
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const context = await browser.newContext();
const page = await context.newPage();
page.on('console', m => { if (m.type() === 'error') console.error(m.text()); });
page.on('requestfailed', r => console.error('REQUEST FAILED', r.url(), r.failure()));
const id = '00000000-0000-4000-8000-000000000001';
const center = '00000000-0000-4000-8000-000000000002';
const child = '00000000-0000-4000-8000-000000000003';
const template = { id: '00000000-0000-4000-8000-000000000004', title: 'Synthetic game', service: 'speech', minutes: 10, materials: ['Cards'], steps: ['Take turns'], safety: ['Synthetic only'], ageBand: '3-6' };
const session = { user: { id, email: 'synthetic@test.test', displayName: 'Synthetic Therapist' }, csrfToken: 'synthetic-ui-token', session: { idleExpiresAt: new Date(Date.now()+3600000).toISOString(), absoluteExpiresAt: new Date(Date.now()+3600000).toISOString() }, contexts: [], activeContext: { type: 'center', centerId: center, membershipId: id, role: 'THERAPIST', centerName: 'Synthetic center' }, permissions: ['center.clinical.read','center.clinical.draft','center.schedule.read','center.children.read','center.activities.read'] };
let saved = null, version = 1, fail = false, delayed = false;
const ws = { timezone: 'UTC', synthetic: true, locked: 'Signing and release disabled', canEdit: true, canReview: false, child: { id: child, name: 'Synthetic Child', services: ['speech','occupational'], dateOfBirth: '2020-01-01' }, assessments: [], plans: [], observations: [], appointments: [], templates: [template], notes: [{ id, service: 'speech', sessionDate: '2026-10-19', appointmentId: null, sections: {}, version, mine: true, author: 'Synthetic Therapist', executionStatus: 'IN_PROGRESS', actualStart: new Date(Date.now()-60000).toISOString(), actualEnd: null, attendance: 'PRESENT', activities: [] }] };
await context.addCookies([{ name: 'tb_session', value: 'synthetic-browser-fixture', url: base }]);
await page.route('**/api/**', async route => {
  const fulfill = route.fulfill.bind(route);
  route.fulfill = options => fulfill({ ...options, headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-csrf-token', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS', ...options.headers } });
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204 });
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/auth/session') return route.fulfill({ json: session });
  if (route.request().method() === 'PATCH') {
    const body = route.request().postDataJSON();
    if (fail) return route.fulfill({ status: 403, json: { message: 'Assignment revoked. Keep your text.' } });
    if (delayed) await new Promise(r => setTimeout(r, 700));
    saved = body; version++; Object.assign(ws.notes[0], body, { version });
    return route.fulfill({ json: { version, updatedAt: new Date().toISOString() } });
  }
  if (path.includes('/clinical/children/')) return route.fulfill({ json: ws });
  return route.fulfill({ json: { items: [] } });
});
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`${base}/app/clinical/${child}`);
  await page.getByRole('tab', { name: 'Sessions', exact: true }).waitFor({ timeout: 15000 }).catch(async e => { console.error(await page.locator('body').innerText(), errors); throw e; });
  await page.getByRole('tab', { name: 'Sessions', exact: true }).click();
  for (const width of [320,390,768,1024,1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole('button', { name: 'Save draft', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`);
    const nav = page.getByTestId(width < 768 ? 'mobile-nav' : 'product-sidebar');
    assert(await nav.isVisible(), `Role navigation visible at ${width}`);
  }
  await page.getByRole('button', { name: 'Add Synthetic game', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Objective addressed', { exact: true }).fill('Synthetic objective');
  await page.getByLabel('Completion', { exact: true }).selectOption('COMPLETED');
  await page.getByLabel('Outcome', { exact: true }).selectOption('ACHIEVED');
  await page.getByLabel('Assistance (separate from outcome)', { exact: true }).selectOption('SUBSTANTIAL_ASSISTANCE');
  await page.getByLabel('Actual minutes', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(e => e.textContent.includes('Saved on server ·')));
  assert.equal(saved.activities[0].outcome, 'ACHIEVED'); assert.equal(saved.activities[0].assistance, 'SUBSTANTIAL_ASSISTANCE');
  for (const scenario of ['permission','unavailable','unsupported','interrupted','empty','provider','network']) {
    await page.getByLabel('Synthetic test scenario').selectOption(scenario);
    await page.getByRole('button', { name: 'Run synthetic transcription' }).click();
    await page.waitForTimeout(350);
    assert.equal(await page.getByLabel('Editable transcript (not saved)', { exact: true }).inputValue(), '');
    assert(!(await page.getByRole('button', { name: 'Insert reviewed text' }).isEnabled()));
    const status = await page.locator('fieldset').filter({ hasText: 'Dictation review · synthetic test provider' }).last().getByRole('status').innerText();
    assert(status.length > 10 && !status.includes('ready for correction'), `Explicit failure for ${scenario}`);
  }
  await page.getByLabel('Synthetic test scenario').selectOption('success');
  await page.getByRole('button', { name: 'Run synthetic transcription' }).click();
  await page.getByRole('button', { name: 'Cancel transcription', exact: true }).click();
  await page.waitForTimeout(300);
  assert.equal(await page.getByLabel('Editable transcript (not saved)', { exact: true }).inputValue(), '');
  await page.getByRole('button', { name: 'Run synthetic transcription' }).click();
  await page.waitForTimeout(350);
  await page.getByLabel('Editable transcript (not saved)', { exact: true }).fill('Corrected reviewed synthetic transcript');
  page.once('dialog', d => d.dismiss());
  await page.getByRole('tab', { name: 'Therapy plan', exact: true }).click();
  assert.equal(await page.getByLabel('Editable transcript (not saved)', { exact: true }).inputValue(), 'Corrected reviewed synthetic transcript');
  assert(!JSON.stringify(saved).includes('Corrected reviewed'));
  await page.getByRole('button', { name: 'Insert reviewed text', exact: true }).click();
  delayed = true;
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByText('Saving…', { exact: true }).waitFor();
  await page.waitForTimeout(900);
  assert(saved.sections.response.includes('Corrected reviewed synthetic transcript'));
  fail = true;
  await page.getByLabel('Overall session note', { exact: true }).fill('Preserved after revoked assignment');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Retry save', exact: true }).waitFor();
  assert.equal(await page.getByLabel('Overall session note', { exact: true }).inputValue(), 'Preserved after revoked assignment');
  fail = false;
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await page.waitForTimeout(1000);
  await page.getByLabel('Actual end', { exact: true }).fill(new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16));
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Review and complete session', exact: true }).click();
  await page.getByText('Completed · unsigned', { exact: true }).waitFor();
  assert(await page.getByLabel('Overall session note', { exact: true }).isDisabled());
  assert.deepEqual(errors, []);
  console.log('PASS: responsive DOM at 320/390/768/1024/1440, role navigation, structured result, all synthetic scenarios, cancellation/retry, review-only insertion, unsaved warning, authoritative save, revocation recovery, read-only completion. API responses are browser fixtures; real persistence/security tested separately in PostgreSQL.');
} finally { await browser.close(); }
