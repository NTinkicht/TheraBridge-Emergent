import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { chromium } from 'playwright';

const base = process.env.DEMO_WEB_ORIGIN ?? 'http://127.0.0.1:3000';
if (process.env.DEPLOYMENT_ENV !== 'ci' || new URL(base).hostname !== '127.0.0.1') throw new Error('Demo browser journey is CI-only on loopback');
const creds = process.env.DEMO_PASSWORDS_JSON
  ? Object.entries(JSON.parse(process.env.DEMO_PASSWORDS_JSON)).map(([email, password]) => ({ email, password }))
  : JSON.parse(readFileSync('.workspace/local-credentials/childrens-home-demo.json', 'utf8')).accounts;
const db = new PrismaClient();
const center = await db.center.findUniqueOrThrow({ where: { slug: 'childrens-home-demo' } });
const child = await db.child.findFirstOrThrow({ where: { centerId: center.id, firstName: 'Yusuf', lastName: 'Ahmed' } });
const browserInstance = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
async function role(email, expectedRole, verify) {
  const record = creds.find(a => a.email === email);
  assert(record, 'Missing synthetic credentials for ' + email);
  const ctx = await browserInstance.newContext();
  try {
    const page = await ctx.newPage();
    await page.goto(base + '/');
    await page.getByTestId('login-email-input').fill(record.email);
    await page.getByTestId('login-password-input').fill(record.password);
    await page.getByTestId('login-submit-button').click();
    await page.waitForURL(/\/app(?:\/|$)/, { timeout: 20000 });
    const session = await page.evaluate(async () => {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      return { status: response.status, data: await response.json() };
    });
    assert.equal(session.status, 200, 'API session must work through same-origin Next routing');
    assert.equal(session.data.activeContext?.role, expectedRole, 'Wrong active context for ' + email);
    await verify(page, session.data);
    const signedOut = await page.evaluate(async csrfToken => {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrfToken } });
      return response.status;
    }, session.data.csrfToken);
    assert.equal(signedOut, 204, 'Logout must revoke session');
  } finally {
    await ctx.close();
  }
}
const read = (page, path) => page.evaluate(async url => {
  const r = await fetch(url, { credentials: 'include' });
  return { status: r.status, body: await r.json().catch(() => null) };
}, path);

try {
  const centerBase = '/api/centers/' + center.id;
  const clinicalPath = centerBase + '/clinical/children/' + child.id;
  await role('platform.demo@childrens-home.therabridge.test', 'PLATFORM_ADMIN', async page => {
    const centers = await read(page, '/api/platform/centers');
    assert.equal(centers.status, 200);
    assert(JSON.stringify(centers.body).includes("Children's Home Centre"));
  });
  await role('admin@childrens-home.therabridge.test', 'CENTER_ADMIN', async page => {
    const kids = await read(page, centerBase + '/children');
    assert.equal(kids.status, 200);
    assert(JSON.stringify(kids.body).includes('Yusuf'));
    assert.notEqual((await read(page, clinicalPath)).status, 200, 'Centre admin must not receive clinician-only evidence');
  });
  await role('coordinator@childrens-home.therabridge.test', 'COORDINATOR', async page => {
    // Scheduling requires explicit dates in a window of at most 42 days.
    const from = new Date(Date.now() - 31 * 86400000).toISOString();
    const to = new Date(Date.now() + 10 * 86400000).toISOString();
    const appointments = await read(page, centerBase + '/appointments?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to));
    assert.equal(appointments.status, 200);
    assert(JSON.stringify(appointments.body).includes(child.id));
    assert.notEqual((await read(page, clinicalPath)).status, 200);
  });
  await role('speech@childrens-home.therabridge.test', 'THERAPIST', async page => {
    const evidence = await read(page, clinicalPath);
    assert.equal(evidence.status, 200);
    assert.equal(evidence.body.notes.length, 4);
    assert(evidence.body.notes.every(n => n.service === 'speech'));
    assert.equal(evidence.body.observations.length, 8);
    assert.equal(evidence.body.childWideReferent, null);
    assert.equal(evidence.body.careTeam.length, 1);
    assert.equal(evidence.body.careTeam[0].service, 'speech');
    assert.equal(evidence.body.careTeam[0].displayName, 'Layla Faris');
    assert.equal(evidence.body.careTeam[0].isSpecialtyLead, true);
    // End-to-end child360, version-exact progress and non-authorizing draft assistance.
    await page.goto(base + '/app/clinical/' + child.id);
    await page.getByTestId('child-360').waitFor();
    await page.getByTestId('child360-family-practice').waitFor();
    // Actual Playwright viewport changes (Work Cloud Browser cannot resize).
    // Check the same production design shell at five widths without modifying
    // patient data or depending on screenshots as proof of correctness.
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await page.evaluate(() => {
        const child = document.querySelector('[data-testid="child-360"]');
        const team = document.querySelector('[data-testid="child360-care-team"]');
        const a = child?.getBoundingClientRect();
        const b = team?.getBoundingClientRect();
        return {
          viewport: innerWidth, scroll: document.documentElement.scrollWidth,
          childLeft: a?.left, childRight: a?.right,
          teamLeft: b?.left, teamRight: b?.right,
          visible: !!child && !!team,
        };
      });
      assert(geometry.visible, 'Missing child overview or care team at ' + width + 'px');
      assert(geometry.scroll <= width + 8, 'Page overflow at ' + width + 'px: ' + JSON.stringify(geometry));
      assert(geometry.childLeft >= -4 && geometry.childRight <= width + 4, 'Child overview clipped at ' + width + 'px');
      assert(geometry.teamLeft >= -4 && geometry.teamRight <= width + 4, 'Care team clipped at ' + width + 'px');
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    const careTeamText = await page.getByTestId('child360-care-team').innerText();
    assert(careTeamText.includes('Layla Faris') && careTeamText.includes('Specialty lead'));
    assert(careTeamText.includes('Not designated'), 'No child-wide referent is stored');
    assert(!careTeamText.includes('Omar Nasser'), 'Speech scope must not reveal OT colleague');
    await page.getByTestId('clinical-tab-progress').click();
    await page.getByTestId('progress-granularity').selectOption('month');
    await page.getByTestId('progress-periods-turn-taking').waitFor();
    await page.getByTestId('clinical-tab-plan').click();
    await page.getByTestId('home-assist-toggle').click();
    await page.getByTestId('home-plan-evidence-assist').waitFor();
    const speechReport = await db.progressReport.findFirstOrThrow({ where: { centerId: center.id, childId: child.id, service: 'speech' } });
    await page.goto(base + '/app/reports/' + speechReport.id);
    await page.getByTestId('report-evidence-assist').waitFor();
    await page.getByTestId('report-assist-toggle').click();
    await page.getByTestId('report-suggestion-goals').waitFor();
    await page.getByTestId('report-assist-omit-goals').click();
    assert((await page.getByTestId('report-assist-decision-goals').innerText()).includes('Omitted'));
    await page.getByTestId('report-assist-restore-goals').click();
    await page.getByTestId('report-assist-edit-goals').fill('Clinician-reviewed factual goals note; no conclusion inferred.');
    await page.getByTestId('report-assist-apply-goals').click();
    const reportDraftText = await page.getByTestId('report-section-goals').inputValue();
    assert(reportDraftText.includes('Clinician-reviewed factual goals note'));
    assert(reportDraftText.includes('Evidence references (internal draft):'));
    assert(reportDraftText.includes('Observation '));
    await page.locator('[data-testid="report-save-state"][data-state="saved"]').waitFor({ timeout: 25000 });
    const persisted = await db.progressReport.findUniqueOrThrow({ where: { id: speechReport.id } });
    assert(persisted.sections.goals.includes('Evidence references (internal draft):'), 'Explicit clinician approval must persist via existing report autosave');
    assert.notEqual(persisted.status, 'IN_REVIEW', 'Evidence assistance must not submit a draft');
  });
  await role('ot@childrens-home.therabridge.test', 'THERAPIST', async page => {
    const evidence = await read(page, clinicalPath);
    assert.equal(evidence.status, 200);
    assert.equal(evidence.body.notes.length, 4);
    assert(evidence.body.notes.every(n => n.service === 'occupational'));
    assert.equal(evidence.body.observations.length, 8);
    assert.equal(evidence.body.childWideReferent, null);
    assert.equal(evidence.body.careTeam.length, 1);
    assert.equal(evidence.body.careTeam[0].service, 'occupational');
    assert.equal(evidence.body.careTeam[0].displayName, 'Omar Nasser');
    assert.equal(evidence.body.careTeam[0].isSpecialtyLead, false);
    await page.goto(base + '/app/clinical/' + child.id);
    await page.getByTestId('child360-care-team').waitFor();
    const otTeamText = await page.getByTestId('child360-care-team').innerText();
    assert(otTeamText.includes('Omar Nasser') && otTeamText.includes('Not designated'));
    assert(!otTeamText.includes('Layla Faris'), 'OT scope must not reveal Speech colleague');
  });
  await role('supervisor@childrens-home.therabridge.test', 'CLINICAL_SUPERVISOR', async page => {
    const messages = await read(page, centerBase + '/threads');
    assert.notEqual(messages.status, 200, 'Supervisors must not access family discussions');
    const clinician = await read(page, clinicalPath);
    assert.equal(clinician.status, 200);
    assert.equal(clinician.body.careTeam.length, 2);
    assert.equal(clinician.body.childWideReferent, null);
  });
  await role('mariam.ahmed@childrens-home.therabridge.test', 'GUARDIAN', async (page, session) => {
    const family = await read(page, centerBase + '/family');
    assert.equal(family.status, 200);
    assert(JSON.stringify(family.body).includes('Yusuf'));
    assert.notEqual((await read(page, clinicalPath)).status, 200, 'Parent must not see unreleased clinical evidence');
    const practice = await read(page, centerBase + '/family/practice');
    assert.equal(practice.status, 200);
    assert(practice.body.children.length === 1 && practice.body.children[0].activities.length > 0);
    assert.equal(practice.body.released, false);
    if (practice.body.gates.practiceDemo) {
      const slot = practice.body.children[0].activities.flatMap(a => a.slots.map(s => ({ ...s, templateId: a.id }))).find(s => s.recordable);
      assert(slot, 'Parent should have an enabled synthetic practice slot');
      const submission = await page.evaluate(async ({ url, token, kid, templateId, date }) => {
        const r = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token }, body: JSON.stringify({ childId: kid, templateId, practiceDate: date, choice: 'NEEDED_HELP', idempotencyKey: crypto.randomUUID() }) });
        return r.status;
      }, { url: centerBase + '/family/practice/outcomes', token: session.csrfToken, kid: child.id, templateId: slot.templateId, date: slot.date });
      assert([200, 201].includes(submission), 'Practice outcome must persist through authenticated guardian API');
    }
  });
  console.log('PASS: seven role logins + logout, centre and child read, scoped Speech/OT history, parent practice, blocked admin/parent/supervisor clinical/messaging access through real same-origin API');
} finally {
  await browserInstance.close();
  await db.$disconnect();
}
