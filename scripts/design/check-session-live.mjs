// Run after seed:synthetic against an isolated synthetic development database with an assigned child.
// Credentials are read privately from the existing seed output, never logged or committed.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.SESSION_UI_BASE_URL ?? 'http://127.0.0.1:3000';
const seed = JSON.parse(await readFile('.workspace/local-credentials/synthetic-accounts.json', 'utf8'));
const credentials = seed.accounts.find(a => a.email === 'leila.hassan@harbor.therabridge.test');
const browser = await chromium.launch();
const page = await browser.newPage();
// Local test runs use the same proxy origin rather than the externally exposed preview hostname.
await page.addInitScript(() => { const original = window.fetch; window.fetch = (input, init) => typeof input === 'string' && input.includes('/api/') ? original(location.origin + new URL(input, location.origin).pathname + new URL(input, location.origin).search, init) : original(input, init); });
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`${base}/login`);
  await page.getByLabel('Email', { exact: true }).fill(credentials.email);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/app');
  await page.goto(`${base}/app/clinical`);
  await page.getByTestId('clinical-list').getByRole('link').first().click();
  await page.getByRole('tab', { name: 'Sessions', exact: true }).click();
  const created = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/sessions'));
  await page.getByRole('button', { name: 'Start ad-hoc session', exact: true }).click();
  const response = await created; assert.equal(response.status(), 201);
  const { id } = await response.json();
  const note = page.getByTestId(`note-${id}`);
  await note.waitFor();
  await note.getByRole('button', { name: /Add / }).first().click();
  await note.getByLabel('Objective addressed', { exact: true }).fill('Synthetic live turn-taking objective');
  await note.getByLabel('Completion', { exact: true }).selectOption('COMPLETED');
  await note.getByLabel('Outcome', { exact: true }).selectOption('ACHIEVED');
  await note.getByLabel('Assistance (separate from outcome)', { exact: true }).selectOption('SUBSTANTIAL_ASSISTANCE');
  await note.getByLabel('Actual minutes', { exact: true }).fill('5');
  await note.getByRole('button', { name: 'Run synthetic transcription', exact: true }).click();
  await note.getByRole('button', { name: 'Insert reviewed text', exact: true }).waitFor({ state: 'visible' });
  await page.waitForTimeout(350);
  await note.getByLabel('Editable transcript (not saved)', { exact: true }).fill('Therapist-corrected synthetic evidence only.');
  await note.getByRole('button', { name: 'Insert reviewed text', exact: true }).click();
  // Wait for autosave, without clicking Save.
  await note.getByText(/Saved on server ·/).waitFor();
  await page.reload();
  await page.getByRole('tab', { name: 'Sessions', exact: true }).click();
  assert.equal(await note.getByLabel('Child response / reviewed dictation', { exact: true }).inputValue(), 'Therapist-corrected synthetic evidence only.');
  assert.equal(await note.getByLabel('Assistance (separate from outcome)', { exact: true }).inputValue(), 'SUBSTANTIAL_ASSISTANCE');
  await note.getByLabel('Actual end', { exact: true }).fill(new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16));
  page.once('dialog', d => d.accept());
  await note.getByRole('button', { name: 'Review and complete session', exact: true }).click();
  await note.getByText('Completed · unsigned', { exact: true }).waitFor();
  await page.reload(); await page.getByRole('tab', { name: 'Sessions', exact: true }).click();
  assert(await note.getByLabel('Overall session note', { exact: true }).isDisabled());
  assert.deepEqual(errors, []);
  console.log('PASS: real login → assigned child → ad-hoc start → library selection → separate result/assistance → synthetic transcript correction/insertion → autosave → reload/resume → complete → reload read-only; real Nest/Fastify and PostgreSQL, no mocked API responses.');
} finally { await browser.close(); }
