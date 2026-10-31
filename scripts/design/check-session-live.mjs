// Run after seed:synthetic against an isolated synthetic development database with an assigned child.
// Credentials are read privately from the existing seed output, never logged or committed.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.SESSION_UI_BASE_URL ?? 'http://127.0.0.1:3000';
const seed = JSON.parse(await readFile('.workspace/local-credentials/synthetic-accounts.json', 'utf8'));
const credentials = seed.accounts.find(a => a.email === 'leila.hassan@harbor.therabridge.test');
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
// Local test runs use the same proxy origin rather than the externally exposed preview hostname.
await context.addInitScript(() => { const original = window.fetch; window.fetch = (input, init) => typeof input === 'string' && input.includes('/api/') ? original(location.origin + new URL(input, location.origin).pathname + new URL(input, location.origin).search, init) : original(input, init); });
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
  // Two real browser tabs share one session and database, not HTTP write fixtures.
  const tab = await page.context().newPage();
  await tab.goto(page.url()); await tab.getByRole('tab', { name: 'Sessions', exact: true }).click();
  const remote = tab.getByTestId(`note-${id}`);
  const writes = []; page.on('request', r => { if (r.method() === 'PATCH' && r.url().endsWith(`/sessions/${id}`)) writes.push(r.postDataJSON()); });
  const responseText = n => n.getByLabel('Child response / reviewed dictation', { exact: true });
  const saveDraft = n => n.getByRole('button', { name: /^(Save draft|Retry save)$/ }).click();
  const saved = n => n.getByText(/Saved on server ·/).waitFor();
  await responseText(remote).fill('Remote note one'); await remote.getByLabel('Factual observation', { exact: true }).fill('Remote observation one');
  await saveDraft(remote); await saved(remote);
  await responseText(note).fill('Local unsaved note'); await note.getByLabel('Factual observation', { exact: true }).fill('Local unsaved observation');
  await saveDraft(note);
  const comparison = note.getByRole('region', { name: 'Session conflict comparison' });
  await comparison.getByText(/Remote note one/).waitFor();
  assert((await comparison.innerText()).includes('Remote note one')); assert((await comparison.innerText()).includes('Local unsaved note'));
  assert((await comparison.innerText()).includes('Remote observation one')); assert((await comparison.innerText()).includes('Local unsaved observation'));
  const stale = writes.at(-1); const count = writes.length;
  await page.waitForTimeout(1800); assert.equal(writes.length, count, 'Stale autosave blocked');
  assert(await note.getByRole('button', { name: 'Retry save', exact: true }).isDisabled());
  assert(await note.getByRole('button', { name: 'Review and complete session', exact: true }).isDisabled());
  for (const width of [320,390,768,1024,1440]) { await page.setViewportSize({ width, height: 1000 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Conflict comparison overflow at ${width}`); }
  await note.getByRole('button', { name: 'Reconcile local changes', exact: true }).click();
  await responseText(note).fill('Local and remote notes deliberately reconciled');
  await note.getByLabel('Factual observation', { exact: true }).fill('Local and remote observations reconciled');
  await page.waitForTimeout(1800); assert.equal(writes.length, count, 'Reconciliation edits cannot autosave');
  // Another update during review must refresh comparison, not adopt a writable version.
  await responseText(remote).fill('Remote note two'); await saveDraft(remote); await saved(remote);
  page.once('dialog', d => d.accept()); await note.getByRole('button', { name: 'Save reviewed reconciliation as draft', exact: true }).click();
  await comparison.getByText(/Remote note two/).waitFor(); assert.equal(writes.length, count);
  // Race after the recovery GET, before PATCH: real remote PATCH wins; optimistic lock must reject ours.
  await note.getByRole('button', { name: 'Reconcile local changes', exact: true }).click();
  await page.route('**/clinical/sessions/*', async route => {
    if (route.request().method() === 'PATCH') {
      await responseText(remote).fill('Remote raced after recovery'); await saveDraft(remote); await saved(remote);
      await page.unroute('**/clinical/sessions/*');
    }
    await route.continue();
  });
  page.once('dialog', d => d.accept()); await note.getByRole('button', { name: 'Save reviewed reconciliation as draft', exact: true }).click();
  await comparison.getByText(/Remote raced after recovery/).waitFor();
  assert.equal(await responseText(note).inputValue(), 'Local and remote notes deliberately reconciled');
  assert(await note.getByRole('button', { name: 'Retry save', exact: true }).isDisabled());
  await note.getByRole('button', { name: 'Reconcile local changes', exact: true }).click();
  page.once('dialog', d => d.accept()); await note.getByRole('button', { name: 'Save reviewed reconciliation as draft', exact: true }).click(); await saved(note);
  assert.notEqual(writes.at(-1).mutationKey, stale.mutationKey); assert(writes.at(-1).version > stale.version);
  await tab.reload(); await tab.getByRole('tab', { name: 'Sessions', exact: true }).click();
  assert.equal(await responseText(remote).inputValue(), 'Local and remote notes deliberately reconciled');
  // Server retention explicitly preserves a copy of local evidence.
  await responseText(remote).fill('Remote retained'); await saveDraft(remote); await saved(remote);
  await responseText(note).fill('Local backup retained'); await saveDraft(note); await comparison.getByText(/Remote retained/).waitFor();
  page.once('dialog', d => d.accept()); await note.getByRole('button', { name: 'Retain server version', exact: true }).click();
  await note.getByText('Server version retained. Previous local evidence is available below.', { exact: true }).waitFor();
  assert.equal(await responseText(note).inputValue(), 'Remote retained'); assert((await comparison.innerText()).includes('Local backup retained'));
  // Assignment revocation and failed recovery retain local evidence and block reconciliation.
  const { PrismaClient } = await import('@prisma/client'); const db = new PrismaClient();
  const assignment = await db.careAssignment.findFirstOrThrow({ where: { childId: (await db.sessionNote.findUniqueOrThrow({ where: { id } })).childId, service: 'speech', endedAt: null } });
  try {
    await responseText(remote).fill('Remote before revocation'); await saveDraft(remote); await saved(remote);
    await responseText(note).fill('Local protected on revocation'); await saveDraft(note); await comparison.getByText(/Remote before revocation/).waitFor();
    await note.getByRole('button', { name: 'Save reviewed reconciliation as draft', exact: true }).waitFor();
    const pendingTranscript = '  Revoked uninserted العربية 😀\nexact trailing spaces  ';
    // Transcript was never inserted into clinical notes.
    await tab.getByLabel('Editable transcript (not saved)', { exact: true }).fill(pendingTranscript);
    await db.careAssignment.update({ where: { id: assignment.id }, data: { endedAt: new Date() } });
    const beforeRevoked = writes.length;
    page.once('dialog', d => d.accept()); await note.getByRole('button', { name: 'Save reviewed reconciliation as draft', exact: true }).click();
    await note.getByText(/Recovery failed/).waitFor(); assert.equal(writes.length, beforeRevoked); assert.equal(await responseText(note).inputValue(), 'Local protected on revocation');
    await note.getByRole('button', { name: 'Retry server recovery', exact: true }).click(); await note.getByText(/Recovery failed/).waitFor();
    assert.equal(await note.getByRole('button', { name: 'Save reviewed reconciliation as draft', exact: true }).count(), 0);
    await saveDraft(remote); await remote.getByText(/Your text remains here/).waitFor();
    assert.equal(await remote.getByLabel('Editable transcript (not saved)', { exact: true }).inputValue(), pendingTranscript);
    tab.once('dialog', d => d.accept()); await remote.getByRole('button', { name: 'Discard transcript', exact: true }).click();
  } finally { await db.careAssignment.update({ where: { id: assignment.id }, data: { endedAt: null } }); await db.$disconnect(); }
  await note.getByRole('button', { name: 'Retry server recovery', exact: true }).click();
  await comparison.getByText(/Remote before revocation/).waitFor();
  page.once('dialog', d => d.accept()); await note.getByRole('button', { name: 'Retain server version', exact: true }).click();
  await note.getByText('Server version retained. Previous local evidence is available below.', { exact: true }).waitFor();
  // Tab B holds an uninserted transcript BEFORE tab A completes.
  const uninserted = '  Uninserted العربية café 😀\nsecond line  ';
  await remote.getByLabel('Editable transcript (not saved)', { exact: true }).fill(uninserted);
  // datetime-local is now explicitly interpreted in the CENTER timezone, not the browser's OS zone.
  // Read the authoritative center setting from the authenticated API rather than assuming CI runner TZ.
  const centerTz = await page.evaluate(async () => {
    const s = await (await fetch('/api/auth/session', { credentials: 'include' })).json();
    const centerId = s.activeContext?.centerId;
    if (!centerId) throw new Error('No active center for synthetic session test');
    const response = await fetch('/api/centers/' + centerId + '/summary', { credentials: 'include' });
    if (!response.ok) throw new Error('Center timezone unavailable in synthetic test');
    return (await response.json()).center.timezone;
  });
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: centerTz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(Date.now() - 5000)).map(p => [p.type, p.value]));
  const centerEnd = parts.year + '-' + parts.month + '-' + parts.day + 'T' + parts.hour + ':' + parts.minute + ':' + parts.second;
  await note.getByLabel('Actual end', { exact: true }).fill(centerEnd);
  page.once('dialog', d => d.accept());
  await note.getByRole('button', { name: 'Review and complete session', exact: true }).click();
  await note.getByText('Completed · unsigned', { exact: true }).waitFor().catch(async e => { console.error(await note.innerText()); throw e; });
  // Stale tab has exact uninserted Unicode/whitespace text when the other tab completes.
  await responseText(remote).fill('Local after remote completion');
  // Fail only the recovery GET; writes and completion use real PostgreSQL.
  await tab.route('**/clinical/children/*', route => route.abort('failed'));
  await saveDraft(remote); await remote.getByText(/Recovery failed/).waitFor();
  const retained = remote.getByLabel('Retained transcript (not saved; copy only)', { exact: true });
  assert.equal(await retained.inputValue(), uninserted);
  assert(await retained.isEnabled()); assert.equal(await retained.getAttribute('readonly'), '');
  await tab.unroute('**/clinical/children/*');
  await remote.getByRole('button', { name: 'Retry server recovery', exact: true }).click();
  await remote.getByText(/Server confirms this session is already completed/).waitFor();
  assert.equal(await responseText(remote).inputValue(), 'Local after remote completion');
  assert(await responseText(remote).isDisabled());
  assert.equal(await retained.inputValue(), uninserted);
  await retained.selectText();
  assert.equal(await retained.evaluate(e => e.value.slice(e.selectionStart, e.selectionEnd)), uninserted);
  assert(await remote.getByRole('button', { name: 'Insert reviewed text', exact: true }).isDisabled());
  assert.equal(await remote.getByRole('button', { name: 'Review and complete session', exact: true }).count(), 0);
  const { PrismaClient: VerifyClient } = await import('@prisma/client'); const verify = new VerifyClient();
  try { const stored = await verify.sessionNote.findUniqueOrThrow({ where: { id } }); assert.equal(stored.executionStatus, 'COMPLETED'); assert(!JSON.stringify(stored.sections).includes(uninserted)); } finally { await verify.$disconnect(); }
  assert((await remote.getByRole('region', { name: 'Session conflict comparison' }).innerText()).includes('Remote before revocation'));
  await tab.close();
  await page.reload(); await page.getByRole('tab', { name: 'Sessions', exact: true }).click();
  assert(await note.getByLabel('Overall session note', { exact: true }).isDisabled());
  assert.deepEqual(errors, []);
  console.log('PASS: real login → assigned child → ad-hoc start → library selection → separate result/assistance → synthetic transcript correction/insertion → autosave → reload/resume → complete → reload read-only; two-tab conflicts, blocked autosave, note/activity preservation, deliberate reconciliation, repeated updates, server retention, revoked/failed recovery and copyable exact uninserted transcript after remote completion; real Nest/Fastify and PostgreSQL, no mocked API responses.');
} finally { await browser.close(); }
