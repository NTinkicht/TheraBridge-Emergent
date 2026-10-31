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
    // Read-only staff must not be offered the clinician-author filter.
    await page.goto(base + '/app/activities');
    await page.getByTestId('activities-discovery').waitFor();
    assert.equal(await page.getByTestId('activities-ownership-filter').locator('option[value="mine"]').count(), 0,
      'Read-only staff must not see Created by me');

  });
  await role('coordinator@childrens-home.therabridge.test', 'COORDINATOR', async page => {
    // Scheduling requires explicit dates in a window of at most 42 days.
    const from = new Date(Date.now() - 31 * 86400000).toISOString();
    const to = new Date(Date.now() + 10 * 86400000).toISOString();
    const appointments = await read(page, centerBase + '/appointments?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to));
    assert.equal(appointments.status, 200);
    assert(JSON.stringify(appointments.body).includes(child.id));
    assert.notEqual((await read(page, clinicalPath)).status, 200);
    // Read-only staff must not be offered the clinician-author filter.
    await page.goto(base + '/app/activities');
    await page.getByTestId('activities-discovery').waitFor();
    assert.equal(await page.getByTestId('activities-ownership-filter').locator('option[value="mine"]').count(), 0,
      'Read-only staff must not see Created by me');

  });
  await role('speech@childrens-home.therabridge.test', 'THERAPIST', async page => {
    // TB-EM-024: test the actual staff library, not the guardian sample page.
    const library = await read(page, centerBase + '/activities');
    assert.equal(library.status, 200);
    const items = library.body.items;
    assert(items.length > 0, 'Synthetic staff library must not be empty');
    await page.goto(base + '/app/activities');
    await page.getByTestId('activities-discovery').waitFor();
    const search = page.getByTestId('activities-search');
    const ownership = page.getByTestId('activities-ownership-filter');
    const specialty = page.getByTestId('activities-specialty-filter');
    const list = page.getByTestId('activities-list');
    const count = async expected => assert.equal(
      await page.getByTestId('activities-result-count').innerText(),
      'Showing ' + expected + ' of ' + items.length + ' activities'
    );
    const cardCount = () => list.locator(':scope > div').count();
    await count(items.length);
    const speechTemplates = items.filter(t => t.service === 'speech');
    assert(speechTemplates.length > 0, 'Seed requires Speech activity examples');
    await search.fill('  LANGUAGE  ');
    await count(speechTemplates.length);
    assert.equal(await cardCount(), speechTemplates.length, 'Displayed specialty label must be searchable');
    await search.fill('unlikely-synthetic-library-result-4c7fbb');
    await count(0);
    await page.getByTestId('activities-no-results').waitFor();
    assert.equal(await list.count(), 0, 'No matching cards must render');
    await page.getByTestId('activities-clear-filters').click();
    await count(items.length);
    await search.fill('   ');
    assert.equal(await page.getByTestId('activities-clear-filters').count(), 0, 'Whitespace alone does not activate filters');
    await search.fill('');
    await ownership.selectOption('samples');
    await count(items.filter(t => t.library === 'synthetic').length);
    await ownership.selectOption('center');
    await count(items.filter(t => t.library === 'center').length);
    const own = items.filter(t => t.mine === true);
    await ownership.selectOption('mine');
    await count(own.length);
    await ownership.selectOption('all');
    await specialty.selectOption('speech');
    await count(speechTemplates.length);
    await search.fill('language');
    await count(speechTemplates.length);
    await page.getByTestId('activities-clear-filters').click();
    await count(items.length);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await search.evaluate(el => ({
        inputWidth: el.getBoundingClientRect().width,
        right: el.getBoundingClientRect().right,
        pageWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }));
      assert(geometry.inputWidth >= 145, 'Activity search field too narrow at ' + width + 'px: ' + JSON.stringify(geometry));
      assert(geometry.right <= width + 4 && geometry.pageWidth <= width + 8,
        'Activity discovery clipped/overflow at ' + width + 'px: ' + JSON.stringify(geometry));
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    // Guardian theme must never leak into the therapist shell.
    await page.getByTestId('product-shell').waitFor();
    const staffShell = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="product-shell"]');
      const cs = getComputedStyle(shell);
      return { familyTheme: shell.classList.contains('theme-family-auto'), canvas: cs.backgroundColor };
    });
    assert.equal(staffShell.familyTheme, false, 'Therapist shell must not inherit guardian family theme');
    assert.equal(staffShell.canvas, 'rgb(246, 247, 249)', 'Therapist shell retains clinical canvas');
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
    // TB-EM-045: the four intended clinician care stages are navigable from
    // this authorized child, without inventing reports or changing any data.
    const journey = page.getByTestId('clinician-care-journey');
    await journey.waitFor();
    assert((await journey.innerText()).includes('Report status loaded only when the authorized Reports tab opens'));
    for (const [step,destination] of [
      ['goals','plan'],['evidence','progress'],['reports','reports'],['home','plan'],
    ]) {
      await page.getByTestId('clinician-journey-'+step).click();
      assert.equal(await page.getByTestId('clinical-tab-'+destination).getAttribute('aria-selected'),'true',
        'Care-journey '+step+' must open its authorized section');
      assert(page.url().includes('/app/clinical/' + child.id),
        'Care journey must preserve the authorized child identity');
      await page.getByTestId('clinical-tab-overview').click();
      await page.getByTestId('clinician-care-journey').waitFor();
    }

    // TB-EM-046: final internal clinician navigation acceptance at each
    // standard responsive width. No screenshots or real patient payloads.
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const navGeometry = await page.getByTestId('clinician-care-journey').evaluate(panel => ({
        panelRight: panel.getBoundingClientRect().right,
        panelOverflow: panel.scrollWidth - panel.clientWidth,
        links: [...panel.querySelectorAll('button[data-testid^="clinician-journey-"]')]
          .map(button => ({ right: button.getBoundingClientRect().right,
            width: button.getBoundingClientRect().width,
            focusable: button.getAttribute('disabled') === null })),
      }));
      assert.equal(navGeometry.links.length,4,'All four clinician journey stages must exist at '+width+'px');
      assert(navGeometry.panelRight <= width + 6 && navGeometry.panelOverflow <= 2,
        'Care journey clipped at '+width+'px: '+JSON.stringify(navGeometry));
      assert(navGeometry.links.every(link => link.right <= width + 6 &&
        link.width >= 120 && link.focusable),
        'Care journey controls must be visible at '+width+'px');
      // Size/focusability alone do not prove operability: exercise real
      // keyboard navigation and Enter activation for EACH stage at EACH width.
      for (const [step, destination] of [
        ['goals','plan'],['evidence','progress'],['reports','reports'],['home','plan'],
      ]) {
        const stage = page.getByTestId('clinician-journey-'+step);
        await stage.focus();
        assert(await stage.evaluate(el => {
          const cs = getComputedStyle(el);
          return document.activeElement === el && cs.visibility === 'visible' &&
            cs.display !== 'none' && Number(cs.opacity) > 0 &&
            cs.pointerEvents !== 'none' && el.getClientRects().length > 0;
        }), 'Stage '+step+' must receive keyboard focus visibly at '+width+'px');
        await stage.press('Enter');
        assert.equal(await page.getByTestId('clinical-tab-'+destination).getAttribute('aria-selected'),'true',
          'Keyboard Enter must open '+destination+' for stage '+step+' at '+width+'px');
        assert(page.url().includes('/app/clinical/' + child.id),
          'Responsive stage '+step+' must preserve authorized child identity at '+width+'px');
        await page.getByTestId('clinical-tab-overview').click();
        await page.getByTestId('clinician-care-journey').waitFor();
      }
    }
    await page.setViewportSize({width:1280,height:900});
    // A transient request failure must never appear as a genuine empty result.
    const practiceRoute = '**/clinical/practice-feedback?childId=*';
    await page.route(practiceRoute, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Synthetic transient error"}' }));
    await page.reload();
    await page.getByTestId('child360-family-practice-error').waitFor();
    assert(!(await page.getByTestId('child360-family-practice').innerText()).includes('No permitted family practice outcomes are recorded.'));
    await page.unroute(practiceRoute);
    await page.getByTestId('child360-family-practice-retry').click();
    await page.getByTestId('child360-family-practice-error').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => {
      const panel = document.querySelector('[data-testid="child360-family-practice"]');
      return !!panel && (panel.querySelector('[data-testid="child360-family-practice-empty"]') !== null ||
        panel.querySelector('[data-testid="child360-family-practice-outcomes"]') !== null);
    });
    // TB-EM-042: one authorized clinical workspace drives the timeline;
    // filters never fetch additional patient records or infer outcomes.
    const timelinePanel = page.getByTestId('child360-clinical-timeline');
    await timelinePanel.waitFor();
    assert((await timelinePanel.innerText()).includes('Family practice feedback and appointments are not treated as clinical evidence.'));
    assert((await timelinePanel.getByTestId('child360-timeline-count').innerText()).includes('matching recorded event'));
    await timelinePanel.getByTestId('child360-timeline-kind').selectOption('SESSION');
    const filteredSessions = timelinePanel.getByTestId('child360-timeline-event');
    for (let index = 0; index < await filteredSessions.count(); index++) {
      assert((await filteredSessions.nth(index).innerText()).includes('Session note'),
        'SESSION filter must not mix plan, assessment or observation events');
    }
    await timelinePanel.getByTestId('child360-timeline-kind').selectOption('ALL');
    await timelinePanel.getByTestId('child360-timeline-service').selectOption('speech');
    const scopedEvents = timelinePanel.getByTestId('child360-timeline-event');
    for (let index = 0; index < await scopedEvents.count(); index++) {
      assert((await scopedEvents.nth(index).innerText()).includes('Speech'),
        'Service filter must show only events with the requested authorized specialty');
    }
    await timelinePanel.getByTestId('child360-timeline-service').selectOption('ALL');
    assert((await timelinePanel.getByTestId('child360-timeline-kind').inputValue()) === 'ALL');
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
    // TB-EM-043: longitudinal goal context is a read-only authorized
    // plan-version inspection, not a second evidence aggregation API.
    const goalContextPanel = page.getByTestId('progress-goal-version-context');
    await goalContextPanel.waitFor();
    assert((await goalContextPanel.innerText()).includes('Matching goal keys or titles do not establish continuity'));
    assert((await goalContextPanel.getByTestId('progress-context-count').innerText())
      .includes('saved goal definition(s)'));
    await goalContextPanel.getByTestId('progress-context-service').selectOption('speech');
    assert((await goalContextPanel.getByTestId('progress-context-plan').first().innerText())
      .includes('Speech'), 'Service filter must show only the already authorized speech plan');
    const firstGoalContext = goalContextPanel.getByTestId('progress-context-goal').first();
    await firstGoalContext.locator(':scope > summary').click();
    assert((await firstGoalContext.getByTestId('progress-context-details').innerText())
      .includes('Baseline'), 'Goal history must disclose saved baseline and target');
    assert((await firstGoalContext.getByTestId('progress-context-open-goal').getAttribute('href'))
      .includes('#plan?version='), 'Historical goal inspection must preserve exact plan version identity');
    await goalContextPanel.getByTestId('progress-context-service').selectOption('ALL');
    // A correct href is insufficient: the in-page link must actually switch
    // the mounted tab and inspect the exact saved version in PlanEditor.
    await firstGoalContext.getByTestId('progress-context-open-goal').click();
    await page.getByTestId('plans-panel').waitFor();
    assert.equal(await page.getByTestId('clinical-tab-plan').getAttribute('aria-selected'),'true',
      'Goal deep link must activate the Plan tab from an already mounted Progress tab');
    const planFocusMessage = await page.getByTestId('report-goal-navigation-note').innerText();
    assert(planFocusMessage.includes('version') || planFocusMessage.includes('matching'),
      'Goal deep link must identify the exact saved goal or explain unavailable permissioned source');
    // Restore the original browser route before continuing unrelated history
    // tests: preserving this fragment would automatically open historical
    // <details>, so a later toggle would CLOSE rather than open them.
    await page.evaluate(() => window.history.replaceState(null, '',
      window.location.pathname + window.location.search));
    await page.getByTestId('clinical-tab-progress').click();


    await page.getByTestId('clinical-tab-plan').click();
    await page.getByTestId('goal-checkpoint-panel').first().waitFor();
    await page.getByTestId('goal-checkpoint-empty').first().waitFor();
    // TB-EM-037: response-overlay test is ONLY a fictional read-model UI
    // check, not proof that source IDs were clinically validated. All seven
    // real role/permission checks still run against the original API.
    const reviewCompareRoute = '**/api/centers/*/clinical/children/*';
    let comparePlanId;
    await page.route(reviewCompareRoute, async route => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch();
      if (response.status() !== 200) return route.fulfill({ response });
      const data = await response.json();
      const plan = data.plans.find(p => p.versions?.length && p.versions[0].goals?.length);
      assert(plan, 'A visible authorized synthetic goal is required for checkpoint comparison');
      comparePlanId = plan.id;
      const version = plan.versions[0], goalKey = version.goals[0].key;
      const referenceA = '00000000-0000-4000-8000-000000000371';
      const referenceB = '00000000-0000-4000-8000-000000000372';
      const referenceC = '00000000-0000-4000-8000-000000000373';
      const synthetic = [
        { kind: 'GOAL_CHECKPOINT', goalKey, at: '2026-10-10T08:00:00Z',
          reviewedOn: '2026-10-10', summary: 'Fictional earlier review for browser layout',
          observationIds: [referenceA, referenceB], authorId: 'fictional-user',
          clinicalAuthorization: false, released: false },
        { kind: 'GOAL_CHECKPOINT', goalKey, at: '2026-10-12T09:00:00Z',
          reviewedOn: '2026-10-11', summary: 'Fictional later review for browser layout',
          observationIds: [referenceB, referenceC], authorId: 'fictional-user',
          clinicalAuthorization: false, released: false },
      ];
      await route.fulfill({ response, json: { ...data, plans: data.plans.map(p =>
        p.id === plan.id ? { ...p, versions: p.versions.map(v =>
          v.id === version.id ? { ...v, goalCheckpoints: synthetic } : v) } : p) } });
    });
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    const checkpointCompare = page.getByTestId('plan-' + comparePlanId)
      .getByTestId('checkpoint-compare').first();
    await checkpointCompare.getByTestId('checkpoint-compare-notes').waitFor();
    assert.equal(await checkpointCompare.getByTestId('checkpoint-compare-notes').locator('article').count(), 2);
    const referenceText = await checkpointCompare.getByTestId('checkpoint-compare-sources').innerText();
    assert(referenceText.includes('Referenced in both reviews · 1') &&
      referenceText.includes('Only in earlier review · 1') &&
      referenceText.includes('Only in later review · 1'),
      'Fictional source set differences must render without outcome inference');
    assert(!referenceText.includes('improved') && !referenceText.includes('achieved'));
    await checkpointCompare.getByTestId('checkpoint-compare-earlier').selectOption('1');
    await checkpointCompare.getByTestId('checkpoint-compare-later').selectOption('0');
    await checkpointCompare.getByTestId('checkpoint-compare-selection-warning').waitFor();
    await checkpointCompare.getByTestId('checkpoint-compare-earlier').selectOption('0');
    await checkpointCompare.getByTestId('checkpoint-compare-later').selectOption('1');
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const rect = await checkpointCompare.evaluate(el => ({
        right: el.getBoundingClientRect().right, scroll: document.documentElement.scrollWidth,
      }));
      assert(rect.right <= width + 6 && rect.scroll <= width + 8,
        'Goal checkpoint comparison must not overflow ' + width + 'px: ' + JSON.stringify(rect));
    }
    await page.unroute(reviewCompareRoute);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    await page.getByTestId('goal-checkpoint-empty').first().waitFor();
    await page.getByTestId('goal-checkpoint-goal').first().selectOption({ index: 1 });
    await page.getByTestId('goal-checkpoint-summary').first().fill('Reviewed available synthetic records; monitor further observations.');
    assert(await page.getByTestId('goal-checkpoint-save').first().isEnabled(),
      'Therapist can prepare a draft checkpoint without posting it');
    // Codex P2: never discard dirty goal/plan text after a checkpoint POST
    // reload. The same form must be blocked until the clinician saves first.
    const sourceSummary = await page.getByTestId('plan-summary').first().inputValue();
    await page.getByTestId('plan-summary').first().fill(sourceSummary + ' UNSAVED CHECKPOINT GUARD');
    assert(await page.getByTestId('goal-checkpoint-save').first().isDisabled(),
      'Unsaved plan edits must block checkpoint write');
    await page.getByTestId('goal-checkpoint-unsaved-lock').first().waitFor();
    await page.getByTestId('plan-summary').first().fill(sourceSummary);
    assert(await page.getByTestId('goal-checkpoint-save').first().isEnabled(),
      'Restoring saved plan content should permit the checkpoint');
    // Codex follow-up P2: checkpoint in plan B must never reload away dirty
    // edits in plan A. Add a SECOND synthetic workspace plan via read-only
    // response interception so this test cannot mutate the seeded database.
    const twoPlanRoute = '**/api/centers/*/clinical/children/*';
    const shadowPlanId = '00000000-0000-4000-8000-000000000092';
    await page.route(twoPlanRoute, async route => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch();
      const data = await response.json();
      const original = data.plans.find(p => p.versions?.length && p.versions[0].goals?.length);
      assert(original, 'An authorized seed plan is needed for the two-plan regression');
      const shadow = { ...original, id: shadowPlanId, title: 'Synthetic second plan for reload guard',
        versions: original.versions.map((v, i) => ({
          ...v, id: '00000000-0000-4000-8000-' + String(9200 + i).padStart(12, '0'),
          mine: true,
        })) };
      await route.fulfill({ response, json: { ...data, plans: [...data.plans, shadow] } });
    });
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    const shadowPanel = page.getByTestId('plan-' + shadowPlanId);
    await shadowPanel.getByTestId('goal-checkpoint-goal').selectOption({ index: 1 });
    await shadowPanel.getByTestId('goal-checkpoint-summary').fill('Reviewed the available synthetic sources in the second plan.');
    await shadowPanel.getByTestId('goal-checkpoint-save').waitFor();
    assert(await shadowPanel.getByTestId('goal-checkpoint-save').isEnabled(),
      'Second plan permits a checkpoint while all plans are clean');
    const firstSummary = page.getByTestId('plan-summary').first();
    const originalText = await firstSummary.inputValue();
    await firstSummary.fill(originalText + ' DIRTY PLAN A');
    await page.waitForFunction(id => {
      const button = document.querySelector('[data-testid="plan-' + id + '"] [data-testid="goal-checkpoint-save"]');
      return button?.hasAttribute('disabled') === true;
    }, shadowPlanId);
    await shadowPanel.getByTestId('goal-checkpoint-unsaved-lock').waitFor();
    // TB-EM-039 extends the same all-plan dirty guard to supervisor handoff:
    // a clean plan B must not let a clinician send a snapshot while plan A
    // still contains browser-only, unsaved edits.
    assert(await shadowPanel.getByTestId('plan-submit').isDisabled(),
      'Draft B supervisor submit must be locked while draft A has unsaved edits');
    await shadowPanel.getByTestId('home-plan-handoff-blocked').waitFor();
    await firstSummary.fill(originalText);
    await page.waitForFunction(id => {
      const button = document.querySelector('[data-testid="plan-' + id + '"] [data-testid="goal-checkpoint-save"]');
      return button?.hasAttribute('disabled') === false;
    }, shadowPlanId);
    assert(await shadowPanel.getByTestId('plan-submit').isEnabled(),
      'Clean draft B regains supervisor submit eligibility after draft A is restored');
    await page.unroute(twoPlanRoute);
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    // M2-H04 P2: simulate creating plan #201 while the first 200-item page
    // remains mounted. The real API's 205-plan pagination test covers server
    // boundaries; here a read-only overlay verifies that the UI updates its
    // hasMorePlans flag after an action-triggered same-child reload.
    const boundaryPlanRoute = '**/api/centers/*/clinical/children/*';
    const boundaryCreateRoute = '**/api/centers/*/clinical/children/*/plans';
    let boundaryCrossed = false;
    await page.route(boundaryPlanRoute, async route => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch();
      const data = await response.json();
      return route.fulfill({ response, json: { ...data, hasMorePlans: boundaryCrossed } });
    });
    await page.route(boundaryCreateRoute, route => {
      if (route.request().method() !== 'POST') return route.continue();
      boundaryCrossed = true;
      return route.fulfill({ status: 201, contentType: 'application/json',
        body: '{"id":"00000000-0000-4000-8000-000000000098","versionId":"00000000-0000-4000-8000-000000000099"}' });
    });
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    assert.equal(await page.getByTestId('plans-load-more').count(), 0,
      'An exactly-full first page should not claim older pages without server metadata');
    await page.getByTestId('plan-title').fill('Synthetic boundary plan');
    await page.getByTestId('plan-create-button').click();
    await page.getByTestId('plans-load-more').waitFor();
    assert(boundaryCrossed, 'A synthetic plan creation must update pagination metadata');
    await page.unroute(boundaryCreateRoute);
    await page.unroute(boundaryPlanRoute);
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    // M2-H04 Codex P2: after loading an older plan, the family-preview action
    // refreshes the same-child workspace. It must not unmount the older plan
    // and lose the local preview. Exercise that exact sequence through the UI
    // using a read-only, scoped workspace response overlay.
    const pagedPlanRoute = '**/api/centers/*/clinical/children/*';
    const pagedShadowId = '00000000-0000-4000-8000-000000000097';
    let originalPlan, originalWorkspace;
    await page.route(pagedPlanRoute, async route => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch();
      const data = await response.json();
      if (!originalWorkspace) {
        originalWorkspace = data;
        originalPlan = data.plans.find(p => p.versions?.length);
        assert(originalPlan, 'The synthetic clinic must contain an authorized saved plan');
      }
      const offset = Number(new URL(route.request().url()).searchParams.get('planOffset') || '0');
      if (offset > 0) return route.fulfill({ response, json: { ...originalWorkspace, plans: [originalPlan], hasMorePlans: false } });
      const shadow = { ...originalPlan, id: pagedShadowId, title: 'Recent plan — pagination fixture',
        versions: originalPlan.versions.map((v, i) => ({ ...v,
          id: '00000000-0000-4000-8000-' + String(9700 + i).padStart(12, '0'),
        })) };
      return route.fulfill({ response, json: { ...data, plans: [shadow], hasMorePlans: true } });
    });
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    await page.getByTestId('plans-load-more').click();
    const olderPanel = page.getByTestId('plan-' + originalPlan.id);
    // Wait for the older page to be re-fetched AFTER the shared workspace
    // reload, not merely for a preview rendered before the reload completed.
    const refreshedOlderPage = page.waitForResponse(response => response.request().method() === 'GET' &&
      response.url().includes('/clinical/children/') && new URL(response.url()).searchParams.get('planOffset') === '1');
    const beforeRefresh = Number(await page.getByTestId('plans-panel').getAttribute('data-refresh-revision'));
    await olderPanel.getByTestId('plan-family-preview').click();
    await refreshedOlderPage;
    await page.waitForFunction(before => Number(document.querySelector('[data-testid="plans-panel"]')?.getAttribute('data-refresh-revision')) > before, beforeRefresh);
    await olderPanel.getByTestId('family-preview').waitFor();
    assert(await olderPanel.getByTestId('family-preview').isVisible(),
      'An older plan preview must remain mounted after its same-child workspace refresh');
    await page.unroute(pagedPlanRoute);
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    // Reload clears the checkpoint form's local goal/narrative selection.
    // Re-enter it before asserting that unsaved-plan gating is reversible.
    await page.getByTestId('goal-checkpoint-goal').first().selectOption({ index: 1 });
    await page.getByTestId('goal-checkpoint-summary').first().fill(
      'Re-entered synthetic review after the browser workspace remounted.');

    const summaryBox = page.getByTestId('plan-summary').first();
    const beforeCheckpointEdit = await summaryBox.inputValue();
    await summaryBox.fill(beforeCheckpointEdit + ' Unsaved synthetic change.');
    await page.getByTestId('goal-checkpoint-unsaved-lock').first().waitFor();
    assert(await page.getByTestId('goal-checkpoint-save').first().isDisabled(),
      'Checkpoint must not discard unsaved plan goals, summary or home activities');
    await summaryBox.fill(beforeCheckpointEdit);
    assert(await page.getByTestId('goal-checkpoint-save').first().isEnabled(),
      'Checkpoint becomes available again after reverting unsaved changes');

    // No POST in this read-only browser journey: the API suite verifies
    // persisted writes, replay conflicts and source isolation.
    await page.getByTestId('plan-evidence-trail').first().waitFor();
    // TB-EM-033 worklist is scoped to current authorized plan versions.
    await page.getByTestId('goal-review-worklist').waitFor();
    await page.getByTestId('goal-review-summary').waitFor();
    assert((await page.getByTestId('goal-review-worklist').innerText()).includes('No review date'),
      'Undated synthetic goals must not invent review deadlines');
    await page.locator('[data-testid^="goal-review-open-"]').first().click();
    assert(await page.evaluate(() => document.activeElement?.id.startsWith('goal-review-')),
      'Review worklist must focus the actual authorized goal editor');
    // An invalid historic centre timezone must show a recoverable warning
    // while leaving every existing plan/editor accessible.
    const invalidTimezoneOverlay = '**/api/centers/*/clinical/children/*';
    await page.route(invalidTimezoneOverlay, async route => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch();
      const workspace = await response.json();
      await route.fulfill({ response, json: { ...workspace, timezone: 'Asia/Not_A_Zone' } });
    });
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    await page.getByTestId('goal-review-timezone-invalid').waitFor();
    assert(await page.getByTestId('plan-summary').first().isVisible(), 'Plan editor survives unsupported centre timezone');
    await page.unroute(invalidTimezoneOverlay);
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    await page.getByTestId('goal-review-worklist').waitFor();
    assert(!(await page.getByTestId('goal-review-timezone-invalid').count()), 'Valid centre timezone recovers');

    await page.getByTestId('plan-evidence-goals').first().waitFor();
    await page.getByTestId('plan-source-none').first().waitFor();
    assert((await page.getByTestId('plan-evidence-trail').first().innerText()).includes('recorded observation'),
      'Authorized synthetic plan evidence must be visible without implying progress');
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const right = await page.getByTestId('plan-evidence-trail').first().evaluate(el => el.getBoundingClientRect().right);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(right <= width + 6 && scroll <= width + 8,
        'Plan evidence trace must remain within ' + width + 'px');
      const reviewRight = await page.getByTestId('goal-review-worklist').evaluate(el => el.getBoundingClientRect().right);
      assert(reviewRight <= width + 6, 'Goal review worklist must fit at ' + width + 'px');
      const checkpointRight = await page.getByTestId('goal-checkpoint-panel').first().evaluate(el => el.getBoundingClientRect().right);
      assert(checkpointRight <= width + 6, 'Goal checkpoint form must fit at ' + width + 'px');
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByTestId('home-assist-toggle').click();
    await page.getByTestId('home-plan-evidence-assist').waitFor();
    // TB-EM-029: browser-only, same-authorized-plan history fixture. No
    // database record or permissions are changed by this response overlay.
    const workspaceOverlay = '**/api/centers/*/clinical/children/*';
    await page.route(workspaceOverlay, async route => {
      if (route.request().method() !== 'GET') return route.continue();
      const response = await route.fetch();
      const body = await response.json();
      body.plans = body.plans.map(p => {
        if (p.service !== 'speech' || !p.versions?.length) return p;
        const first = p.versions[0];
        const oldSnapshot = { id: 'saved-example', title: 'Original saved activity',
          service: 'speech', ageBand: '6-8', minutes: 10,
          materials: ['original cards'], steps: ['original instructions'],
          safety: ['original safety guidance'], version: 1, capturedAt: '2026-10-01T09:00:00Z' };
        const priorActivities = first.homeActivities.map((a, i) =>
          i === 0 ? { ...a, snapshot: oldSnapshot, note: 'Historic synthetic therapist instructions' } : a);
        const currentActivities = first.homeActivities.map((a, i) =>
          i === 0 ? { ...a, snapshot: { ...oldSnapshot,
            title: 'Updated saved activity', steps: ['new saved instructions'],
            safety: ['new saved safety'], version: 2 } } : a);
        return { ...p, versions: [
          { ...first, id: first.id + '-comparison-fixture', number: first.number + 2,
            summary: first.summary + ' Updated synthetic comparison.',
            goals: first.goals.map((g, i) => i === 0 ? { ...g, target: g.target + 1 } : g),
            homeActivities: currentActivities },
          { ...first, id: first.id + '-intermediate-fixture', number: first.number + 1,
            summary: first.summary + ' Intermediate saved definition.', homeActivities: priorActivities },
          { ...first, status: 'SUPERSEDED', homeActivities: priorActivities },
        ] };
      });
      await route.fulfill({ response, body: JSON.stringify(body) });
    });
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    const versionHistory = page.getByTestId('plan-version-history');
    // Target only the parent <details> toggle: a nested saved-plan preview
    // also renders a <summary> and must not make this selector ambiguous.
    await versionHistory.locator(':scope > summary').click();
    await page.getByTestId('plan-history-list').waitFor();
    await page.getByTestId('plan-history-inspection').waitFor();
    // TB-EM-041: history preview uses exactly the selected stored version.
    const historicPreview = page.getByTestId('plan-history-inspection')
      .getByTestId('saved-home-plan-preview');
    await historicPreview.locator('summary').click();
    const historicPreviewBody = await historicPreview.getByTestId('saved-plan-preview-body').innerText();
    assert(historicPreviewBody.includes('Original saved activity'),
      'Selected historical preview must keep its own snapshot definition');
    assert(!historicPreviewBody.includes('Updated saved activity'),
      'Historical preview must not borrow the later snapshot');
    await page.getByTestId('plan-history-comparison').waitFor();
    assert((await page.getByTestId('plan-history-comparison').innerText()).includes('Goal definition changed.'));
    const savedActivityComparison = await page.getByTestId('plan-history-comparison').innerText();
    assert(savedActivityComparison.includes('Original saved activity'), 'Historical name must use saved snapshot');
    assert(savedActivityComparison.includes('original safety guidance'), 'Historical safety must use saved snapshot');
    assert(savedActivityComparison.includes('new saved safety'), 'Comparison must show changed saved safety');
    assert((await page.getByTestId('plan-history-inspection').innerText())
      .includes('Therapist instructions: Historic synthetic therapist instructions'),
      'Historical selected version must display the clinician note distinctly');
    // Codex P2: evidence about original version 1 must open version 1,
    // not the default middle version of a THREE-version plan history.
    const oldestPlan = await db.planVersion.findFirstOrThrow({
      where: { centerId: center.id, plan: { childId: child.id, service: 'speech' } },
      orderBy: { number: 'asc' },
    });
    const savedGoalKey = oldestPlan.goals[0].key;
    // Follow the link from a different page, as a real report would.
    // Fragment-only goto on the already-mounted child page does not remount
    // the plan workspace and tests a different navigation path.
    await page.goto(base + '/app/clinical');
    await page.goto(base + '/app/clinical/' + child.id +
      '#plan?version=' + encodeURIComponent(oldestPlan.id) + '&goal=' + encodeURIComponent(savedGoalKey));
    await page.waitForFunction(() =>
      document.querySelector('[data-testid="plan-history-select-1"]')?.getAttribute('aria-pressed') === 'true');
    await page.getByTestId('plan-history-goal-' + savedGoalKey).waitFor();
    await page.waitForFunction(() => document.activeElement?.id?.includes('plan-history-goal-'));
    assert.equal(await page.getByTestId('plan-history-select-1').getAttribute('aria-pressed'), 'true',
      'Historical evidence must select the exact original snapshot, not default version 2');
    assert(await page.evaluate(() => document.activeElement?.id?.includes('plan-history-goal-')),
      'Historical evidence must focus its precise saved goal definition');
    assert((await page.getByTestId('report-goal-navigation-note').innerText()).includes('Historical source goal selected'));

    // TB-EM-041: the active preview must show only the persisted version,
    // not the browser's subsequently edited working copy.
    const activeSavedPreview = page.getByTestId('saved-home-plan-preview').first();
    await activeSavedPreview.locator('summary').click();
    const originalSavedSummary = await activeSavedPreview.getByTestId('saved-plan-preview-summary').innerText();
    assert(originalSavedSummary.trim().length > 0);
    assert((await activeSavedPreview.getByTestId('saved-plan-preview-disclaimer').innerText())
      .includes('No signing, consent, family distribution or clinical release'));
    // TB-EM-031 uses the same disposable already-authorized workspace overlay.
    // Exercise the clinician's dated objective and scheduled activity fields
    // without saving or contaminating the seeded demonstration.
    await page.getByTestId('goal-horizon-0').selectOption('SHORT_TERM');
    await page.getByTestId('goal-target-date-0').fill('2027-03-15');
    await page.getByTestId('goal-review-date-0').fill('2026-12-15');
    assert.equal(await page.getByTestId('goal-horizon-0').inputValue(), 'SHORT_TERM');
    // TB-EM-040: show definition/safety/duration and edit plan-specific
    // instructions only; a note edit cannot silently submit an older snapshot.
    const activityDetail = page.getByTestId('home-activity-details-0').first();
    await activityDetail.waitFor();
    assert((await activityDetail.innerText()).includes('The saved template duration stays unchanged'),
      'Plan duration override must not alter the server-owned template snapshot');
    const planDuration = activityDetail.getByTestId('home-activity-duration-override-0');
    await planDuration.fill('7');
    assert(await page.getByTestId('plan-save').first().isEnabled(), 'Valid 7-minute override permits draft save');
    await planDuration.fill('121');
    await page.getByTestId('home-activity-invalid-duration').waitFor();
    assert(await page.getByTestId('plan-save').first().isDisabled(), 'Out-of-range override must block draft save');
    await planDuration.fill('10.5');
    assert(await page.getByTestId('plan-save').first().isDisabled(), 'Fractional duration must block draft save');
    await planDuration.fill('7');
    assert(await page.getByTestId('plan-save').first().isEnabled());
    assert(!(await activeSavedPreview.getByTestId('saved-plan-preview-body').innerText()).includes('Plan-specific duration: 7'),
      'Unsaved duration override must never leak into saved-plan preview');
    await activityDetail.getByTestId('home-activity-safety-0').waitFor();
    const therapistNote = activityDetail.getByTestId('home-activity-instructions-0');
    await therapistNote.fill('Synthetic clinician adaptation: use picture cards with adult guidance.');
    assert.equal(await therapistNote.inputValue(),
      'Synthetic clinician adaptation: use picture cards with adult guidance.');
    assert(await page.getByTestId('plan-submit').first().isDisabled(),
      'Therapist instruction edits must lock stale saved-version submission');
    await activeSavedPreview.getByTestId('saved-plan-preview-unsaved').waitFor();
    assert.equal((await activeSavedPreview.getByTestId('saved-plan-preview-summary').innerText()),originalSavedSummary,
      'Saved preview must ignore unsaved form changes');
    assert(!(await activeSavedPreview.getByTestId('saved-plan-preview-body').innerText())
      .includes('Synthetic clinician adaptation: use picture cards'),
      'Saved preview MUST NOT show pending unsaved therapist instructions');
    assert(await page.getByTestId('plan-save').first().isEnabled(),
      'Valid therapist instructions remain compatible with draft save');
    await page.getByTestId('activity-schedule-cadence-0').selectOption('WEEKLY');
    // TB-EM-039: no stale supervisor handoff while the browser holds
    // clinician edits that have not been saved to the actual version.
    await page.getByTestId('home-plan-handoff-blocked').waitFor();
    assert(await page.getByTestId('plan-submit').isDisabled(),
      'Unsaved home-plan changes must block submission of the older stored version');
    assert((await page.getByTestId('home-plan-handoff-blocked').innerText()).includes('Save or discard'));
    assert(await page.getByTestId('plan-save').isDisabled(), 'An incomplete dated schedule must not save');
    await page.getByTestId('activity-schedule-start-0').fill('2026-10-19');
    await page.getByTestId('activity-schedule-end-0').fill('2026-12-16');
    await page.getByTestId('activity-schedule-weekdays-0').getByLabel('Mon').check();
    await page.getByTestId('activity-schedule-weekdays-0').getByLabel('Wed').check();
    assert((await page.getByTestId('activity-schedule-preview-0').innerText()).includes('2026-10-21'));
    assert(!(await page.getByTestId('plan-save').isDisabled()), 'Valid dated schedule should permit internal draft save');
    await page.getByTestId('activity-schedule-cadence-0').selectOption('MONTHLY');
    await page.getByTestId('activity-schedule-start-0').fill('2026-10-01');
    await page.getByTestId('activity-schedule-end-0').fill('2027-03-31');
    await page.getByTestId('activity-schedule-monthday-0').fill('31');
    const calendar = await page.getByTestId('activity-schedule-preview-0').innerText();
    assert(calendar.includes('2026-10-31') && calendar.includes('2026-12-31') &&
      calendar.includes('2027-01-31') && calendar.includes('2027-03-31'), 'Only existing month days are shown');
    assert(!calendar.includes('2027-02-31'), 'Monthly recurrence cannot invent invalid dates');
    // TB-EM-038: view the UNSAVED dated schedule only in the clinician's
    // existing authorized version; never post, release, or mark practice complete.
    const practiceCalendar = page.getByTestId('home-practice-calendar').first();
    await practiceCalendar.getByTestId('home-calendar-month').fill('2026-10');
    await practiceCalendar.getByTestId('home-calendar-day-2026-10-31').click();
    assert((await practiceCalendar.getByTestId('home-calendar-day-details').innerText())
      .includes('Planned for 2026-10-31'), 'Plan calendar must render chosen October date');
    assert((await practiceCalendar.getByTestId('home-calendar-item').count()) >= 1,
      'October 31 monthly practice must appear');
    assert((await practiceCalendar.getByTestId('home-calendar-therapist-instructions').first().innerText())
      .includes('Synthetic clinician adaptation: use picture cards'),
      'Calendar preview must display unsaved clinician note from the exact plan activity');
    assert((await practiceCalendar.innerText()).includes('Unsaved plan edits'),
      'Calendar must clearly mark unsaved edits as a local preview');
    await practiceCalendar.getByTestId('home-calendar-month').fill('2027-02');
    assert.equal(await practiceCalendar.locator('[data-testid="home-calendar-day-2027-02-31"]').count(), 0,
      'No February 31st date can be fabricated');
    await practiceCalendar.getByTestId('home-calendar-month').fill('2029-05');
    assert.equal(await practiceCalendar.getByTestId('home-calendar-item').count(), 0,
      'Dates outside all bounded schedules must not appear');
    await practiceCalendar.getByTestId('home-calendar-month').fill('2026-10');
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const actualWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(actualWidth <= width + 8, 'Plan scheduling must not overflow at ' + width);
      assert(await page.getByTestId('activity-schedule-preview-0').isVisible());
    }
    await page.setViewportSize({ width: 1280, height: 900 });

    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await versionHistory.isVisible(), 'Version history must remain visible at ' + width);
      const actualWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(actualWidth <= width + 8, 'Plan history must not overflow at ' + width);
    }
    await page.getByTestId('plan-history-select-1').click();
    assert((await page.getByTestId('plan-history-inspection').innerText()).includes('Superseded'));
    await page.getByTestId('plan-compare-after').selectOption(
      await page.getByTestId('plan-compare-before').inputValue());
    await page.getByText('Choose two different versions to compare their saved definitions.').waitFor();
    await page.unroute(workspaceOverlay);
    await page.setViewportSize({ width: 1280, height: 900 });
    // Do not send a request; a reload should restore the exact unchanged
    // saved version, including its eligibility for a review request.
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    await page.getByTestId('home-plan-handoff-saved').first().waitFor();
    assert(await page.getByTestId('plan-submit').first().isEnabled(),
      'A clean saved draft remains eligible for the existing server-validated review path');

    const speechReport = await db.progressReport.findFirstOrThrow({ where: { centerId: center.id, childId: child.id, service: 'speech' } });
    await page.goto(base + '/app/reports/' + speechReport.id);
    await page.getByTestId('report-evidence-assist').waitFor();
    await page.getByTestId('report-decisions-persistent').waitFor();
    // An evidence entry links to its exact source version and goal. The new
    // tab goes through the ordinary authorized child workspace route.
    await page.locator('[data-testid^="evidence-sources-"] summary').first().click();
    const linkToGoal = page.locator('[data-testid^="report-evidence-open-goal-"]').first();
    const goalHref = await linkToGoal.getAttribute('href');
    assert(goalHref?.includes('#plan?version=') && goalHref.includes('&goal='));
    const linkedTab = await page.context().newPage();
    await linkedTab.goto(base + goalHref);
    await linkedTab.getByTestId('report-goal-navigation-note').waitFor();
    assert((await linkedTab.getByTestId('report-goal-navigation-note').innerText()).includes('matching current plan goal'),
      'Source goal link must resolve to the authorized exact current plan goal');
    await linkedTab.close();
    // Synthetic seed has editable drafts but no saved immutable version.
    // Exercise the real clinician Save version operation as prerequisite.
    await page.getByTestId('report-to-plan-needs-version').waitFor();
    await page.getByTestId('report-save-version').click();
    await page.getByTestId('report-to-plan-toggle').waitFor();
    // TB-EM-035: legacy or unlinked saved report versions still render a
    // truthful read-only trace. Nothing is guessed from their prose.
    await page.locator('[data-testid^="history-compare-"]').first().click();
    await page.getByTestId('saved-statement-trace').waitFor();
    await page.getByTestId('statement-trace-empty').waitFor();
    // TB-EM-044: saved report source inspector is explicit, read-only and
    // labels differing periods/sources without claiming clinical validity.
    const evidenceDifference = page.getByTestId('report-evidence-diff').first();
    await evidenceDifference.waitFor();
    await evidenceDifference.locator(':scope > summary').click();
    assert((await evidenceDifference.innerText()).includes('NOT clinical validation'),
      'Snapshot comparison must not claim clinical verification or approval');
    await evidenceDifference.getByTestId('report-evidence-assessment-count').waitFor();
    await evidenceDifference.getByTestId('report-evidence-session-count').waitFor();
    await evidenceDifference.getByTestId('report-evidence-goal-diffs').waitFor();

    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const right = await page.getByTestId('saved-statement-trace').evaluate(el => el.getBoundingClientRect().right);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(right <= width + 6 && scroll <= width + 8,
        'Saved statement trace must not overflow ' + width + 'px');
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByTestId('compare-close').click();
    // TB-EM-036: presentation-only overlay of a fictional claim-to-source
    // payload. Real API fingerprint/authorization tests remain separate.
    const savedVersionRoute = '**/clinical/report-versions/*';
    await page.route(savedVersionRoute, async route => {
      const response = await route.fetch();
      if (response.status() !== 200) return route.fulfill({ response });
      const saved = await response.json();
      const goal = saved.evidence?.goals?.find(g => g.planVersionId);
      assert(goal, 'Synthetic saved version needs an existing scoped goal');
      const source = { ref: 'planVersion:' + goal.planVersionId + ':goal:' + goal.key,
        label: 'Fictional goal reference for browser presentation test' };
      await route.fulfill({ response, json: {
        ...saved,
        statementTrace: [
          { section: 'goals', status: 'LINKED_TO_SAVED_TEXT', decisionId: 'synthetic-overlay',
            passage: 'Fictional first statement\\n\\nFictional second statement',
            claims: [
              { index: 1, text: 'Fictional first statement', sources: [source] },
              { index: 2, text: 'Fictional second statement', sources: [source] },
            ], claimValidation: 'REFERENCED_NOT_VERIFIED' },
          { section: 'sessions', status: 'SOURCE_MISMATCH', decisionId: 'synthetic-warning',
            passage: null, claims: [], claimValidation: 'REFERENCED_NOT_VERIFIED' },
        ],
      } });
    });
    await page.locator('[data-testid^="history-compare-"]').first().click();
    await page.getByTestId('statement-trace-inspector').waitFor();
    assert((await page.getByTestId('statement-trace-result-count').innerText()).includes('Showing 2 of 2'),
      'The inspector must count both source-linked statements');
    assert(await page.getByTestId('statement-trace-status-sessions').isVisible(),
      'A mismatched source must remain visibly non-attributable');
    await page.getByTestId('statement-trace-section-filter').selectOption('goals');
    await page.getByTestId('statement-trace-search').fill('second');
    assert.equal(await page.locator('[data-testid="statement-trace-claims-goals"] > li').count(), 1,
      'Search must select exactly the clinician statement, not the whole section');
    await page.getByTestId('statement-trace-search').fill('missing fictional reference');
    await page.getByTestId('statement-trace-no-matches').waitFor();
    await page.getByTestId('statement-trace-section-filter').selectOption('all');
    assert(await page.getByTestId('statement-trace-status-sessions').isVisible(),
      'Source mismatch warning must survive searches, not imply safe attribution');
    await page.getByTestId('statement-trace-search').fill('');
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const bounds = await page.getByTestId('statement-trace-inspector').evaluate(el => ({
        right: el.getBoundingClientRect().right, scroll: document.documentElement.scrollWidth,
      }));
      assert(bounds.right <= width + 6 && bounds.scroll <= width + 8,
        'Claim inspector must not overflow ' + width + 'px: ' + JSON.stringify(bounds));
    }
    await page.unroute(savedVersionRoute);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByTestId('compare-close').click();
    // Report-to-plan handoff is read-only until explicit goal selection.
    await page.getByTestId('report-to-plan-toggle').click();
    const handoff = page.getByTestId('report-to-plan-form');
    await handoff.waitFor();
    await page.getByTestId('report-to-plan-goals').waitFor();
    const firstSavedGoal = page.getByTestId('report-to-plan-goal-0');
    assert(await firstSavedGoal.count() > 0, 'Synthetic report snapshot must contain at least one goal');
    assert(await page.getByTestId('report-to-plan-create').isDisabled(),
      'A new plan must never be created without clinician-selected goals');
    await firstSavedGoal.check();
    assert(await page.getByTestId('report-to-plan-create').isEnabled());
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const bounds = await page.evaluate(() => ({
        viewport: innerWidth, page: document.documentElement.scrollWidth,
        panel: document.querySelector('[data-testid="report-to-plan"]')?.getBoundingClientRect().toJSON(),
      }));
      assert(bounds.panel?.width > 0 && bounds.panel.right <= width + 6 && bounds.page <= width + 8,
        'Report-to-plan handoff must not clip at ' + width + 'px: ' + JSON.stringify(bounds));
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    // Codex P2: the reverse ordering matters. A report submission already
    // in flight must reserve its lock BEFORE awaiting its save/POST, so
    // starting handoff cannot create a draft while the report transitions.
    const submitRaceRoute = '**/clinical/reports/' + speechReport.id + '/submit';
    const earlyHandoffRoute = '**/clinical/reports/*/plan-drafts';
    let releaseHeldSubmission;
    let announceHeldSubmission;
    const heldSubmission = new Promise(resolve => { releaseHeldSubmission = resolve; });
    const submissionStarted = new Promise(resolve => { announceHeldSubmission = resolve; });
    let prematurePlanPosts = 0;
    await page.route(earlyHandoffRoute, async route => {
      prematurePlanPosts += 1;
      await route.fulfill({ status: 503, contentType: 'application/json',
        body: '{"message":"Handoff must not have reached this endpoint"}' });
    });
    await page.route(submitRaceRoute, async route => {
      announceHeldSubmission();
      await heldSubmission;
      // This is a synthetic failure: no report submission is committed.
      await route.fulfill({ status: 503, contentType: 'application/json',
        body: '{"message":"Synthetic interrupted report transition"}' });
    });
    await page.getByTestId('report-submit').click();
    await submissionStarted;
    await page.getByTestId('report-transition-edit-lock').waitFor();
    assert(await page.getByTestId('report-section-summary').isDisabled(),
      'Report fields must lock throughout in-flight submission');
    assert(await page.getByTestId('report-save-version').isDisabled(),
      'Save version is blocked during report submission');
    assert(await page.getByTestId('report-submit').isDisabled(),
      'Repeated report submission is blocked');
    await page.getByTestId('report-to-plan-create').click();
    await page.getByTestId('report-to-plan-error').waitFor();
    assert.equal(prematurePlanPosts, 0,
      'A handoff attempted during an already-running report transition must not POST');
    releaseHeldSubmission();
    await page.getByTestId('report-transition-edit-lock').waitFor({ state: 'hidden' });
    assert(!(await page.getByTestId('report-section-summary').isDisabled()),
      'Failed report transition must restore editing and handoff eligibility');
    await page.unroute(submitRaceRoute);
    await page.unroute(earlyHandoffRoute);

    // New handoff POST is intercepted, while genuine report PATCH autosave
    // continues. Unknown result must retain exact payload and report lock.
    const handoffRequests = [];
    let secondRequestSeen;
    const secondHandoffRequest = new Promise(resolve => { secondRequestSeen = resolve; });
    const handoffRoute = '**/clinical/reports/*/plan-drafts';
    await page.route(handoffRoute, async route => {
      handoffRequests.push(JSON.parse(route.request().postData()));
      if (handoffRequests.length === 2) secondRequestSeen();
      await route.fulfill({ status: 503, contentType: 'application/json',
        body: '{"message":"Simulated unknown result"}' });
    });
    const reportSummary = page.getByTestId('report-section-summary');
    await reportSummary.fill((await reportSummary.inputValue()) + '\\nSynthetic pre-handoff text must persist.');
    await page.getByTestId('report-to-plan-create').click();
    await page.getByTestId('report-to-plan-abandon').waitFor();
    assert(await reportSummary.isDisabled(), 'Pending handoff must lock report text');
    assert(await page.getByTestId('report-submit').isDisabled(), 'Unresolved handoff must block supervisor submission');
    assert(await page.getByTestId('report-save-version').isDisabled(), 'Unresolved handoff must block save-version transition');
    assert(await page.getByTestId('report-to-plan-title').isDisabled(), 'Unknown POST must freeze submitted payload');
    assert(await page.getByTestId('report-to-plan-toggle').isDisabled(), 'Unknown POST must not reset request UUID');
    const handoffSaved = await db.progressReport.findUniqueOrThrow({ where: { id: speechReport.id } });
    assert(handoffSaved.sections.summary.includes('Synthetic pre-handoff text must persist.'),
      'Handoff must wait for actual report autosave');
    assert.equal(handoffRequests[0].reportRevision, handoffSaved.version,
      'Handoff must use latest saved revision, not stale parent detail revision');
    await page.getByTestId('report-to-plan-create').click();
    await secondHandoffRequest;
    assert.equal(handoffRequests.length, 2);
    assert.deepEqual(handoffRequests[1], handoffRequests[0], 'Retry must preserve exact submitted request UUID and content');
    page.once('dialog', async dialog => { await dialog.accept(); });
    await page.getByTestId('report-to-plan-abandon').click();
    assert(!(await reportSummary.isDisabled()), 'Explicit abandon must unlock report editor');
    await page.unroute(handoffRoute);
    await page.getByTestId('report-to-plan-toggle').click();

    const sourceDetail = await read(page, centerBase + '/clinical/reports/' + speechReport.id);
    assert.equal(sourceDetail.status, 200);
    const g = sourceDetail.body.evidence.goals[0];
    assert(g && g.planVersionId, 'Seeded goal must have a plan-version-scoped identity');
    const goalRef = 'planVersion:' + g.planVersionId + ':goal:' + g.key;
    await page.getByTestId('report-suggestion-goals').waitFor();
    // P2 regression: autosave A pending; autosave B queued; decision flush C
    // must wait until B commits before it can issue the POST. The old partial
    // in-flight guard returned success as soon as B cleared dirty on startup.
    const raceSection = page.getByTestId('report-section-goals');
    const raceOriginal = await raceSection.inputValue();
    const markerA = 'Queued autosave race A — synthetic draft.';
    const markerB = 'Queued autosave race B — preserve this later typing.';
    let releaseSaveA;
    let releaseSaveB;
    let notifySaveA;
    let notifySaveB;
    const saveAHeld = new Promise(resolve => { releaseSaveA = resolve; });
    const saveBHeld = new Promise(resolve => { releaseSaveB = resolve; });
    const saveAStarted = new Promise(resolve => { notifySaveA = resolve; });
    const saveBStarted = new Promise(resolve => { notifySaveB = resolve; });
    let interceptedPatches = 0;
    let prematureDecisionPosts = 0;
    const saveRoute = '**/clinical/reports/' + speechReport.id;
    const pendingDecisionRoute = '**/clinical/reports/' + speechReport.id + '/suggestion-decisions';
    await page.route(saveRoute, async route => {
      if (route.request().method() === 'PATCH') {
        interceptedPatches += 1;
        if (interceptedPatches === 1) {
          notifySaveA();
          await saveAHeld;
        } else if (interceptedPatches === 2) {
          notifySaveB();
          await saveBHeld;
        }
      }
      await route.continue();
    });
    await page.route(pendingDecisionRoute, async route => {
      if (route.request().method() === 'POST') prematureDecisionPosts += 1;
      await route.continue();
    });
    await raceSection.fill(raceOriginal + '\n' + markerA);
    await saveAStarted;
    await raceSection.fill(raceOriginal + '\n' + markerA + '\n' + markerB);
    // B's debounce must fire while A is blocked; B cannot reach the server
    // until A finishes, but it must remain ahead of the decision flush.
    await page.waitForTimeout(1500);
    await page.getByTestId('report-assist-omit-goals').click();
    await page.getByTestId('report-decision-edit-lock').waitFor();
    assert.equal(prematureDecisionPosts, 0);
    releaseSaveA();
    await saveBStarted;
    assert.equal(prematureDecisionPosts, 0,
      'Decision must not issue POST before queued autosave B commits');
    releaseSaveB();
    await page.getByTestId('report-assist-restore-goals').waitFor({ timeout: 25000 });
    await page.unroute(saveRoute);
    await page.unroute(pendingDecisionRoute);
    const raceAfter = await page.getByTestId('report-section-goals').inputValue();
    assert(raceAfter.includes(markerA) && raceAfter.includes(markerB),
      'Both pre-decision edits must survive after queued autosaves and remount');
    const raceDb = await db.progressReport.findUniqueOrThrow({ where: { id: speechReport.id } });
    assert(raceDb.sections.goals.includes(markerB),
      'Second queued autosave must commit before a decision can increment report revision');
    // The next test needs to start on a new report decision, not a previously
    // omitted one. Reconsider is itself a durable audited step.
    await page.getByTestId('report-assist-restore-goals').click();
    await page.getByTestId('report-assist-source-goals').waitFor();
    // P2 data-loss regression: pause the real POST after the first flush.
    // Before fix, the textareas were still editable and typing here was
    // silently dropped when the successful decision remounted ReportEditor.
    const reportSections = page.getByTestId('report-section-goals');
    const typedBeforeDecision = 'Pre-submission clinical draft text remains saved.';
    await reportSections.fill((await reportSections.inputValue()) + '\n' + typedBeforeDecision);
    const decisionEndpoint = '**/clinical/reports/*/suggestion-decisions';
    let unlockPost;
    const heldPost = new Promise(resolve => { unlockPost = resolve; });
    let announcePost;
    const postStarted = new Promise(resolve => { announcePost = resolve; });
    await page.route(decisionEndpoint, async route => {
      if (route.request().method() === 'POST') {
        announcePost();
        await heldPost;
      }
      await route.continue();
    });
    await page.getByTestId('report-assist-omit-goals').click();
    await postStarted;
    assert(await reportSections.isDisabled(), 'Report sections must lock during in-flight decisions');
    assert(await page.getByTestId('report-decision-edit-lock').isVisible(),
      'An explicit status must explain why editor inputs are locked');
    assert(await page.getByTestId('report-save-version').isDisabled());
    assert(await page.getByTestId('report-submit').isDisabled());
    assert(await page.getByTestId('report-preview-toggle').isDisabled());
    // The report's pending-save content stays visible, not truncated.
    assert((await reportSections.inputValue()).includes(typedBeforeDecision));
    unlockPost();
    await page.getByTestId('report-assist-restore-goals').waitFor({ timeout: 25000 });
    await page.unroute(decisionEndpoint);
    assert((await page.getByTestId('report-section-goals').inputValue()).includes(typedBeforeDecision),
      'Remount must preserve the pre-decision autosaved section');

    assert((await page.getByTestId('report-assist-decision-goals').innerText()).includes('Omitted'));
    // A stale OMITTED event must remain recoverable, not trap the clinician
    // behind an inert "reload" message that cannot clear the history hash.
    const priorGoalText = await page.getByTestId('report-section-goals').inputValue();
    await page.getByTestId('report-section-goals').fill(priorGoalText + '\nSynthetic note reviewed after omission.');
    await page.locator('[data-testid="report-save-state"][data-state="saved"]').waitFor({ timeout: 25000 });
    await page.reload();
    await page.getByTestId('report-decisions-persistent').waitFor();
    assert((await page.getByTestId('report-assist-decision-goals').innerText()).includes('review required'));
    await page.getByTestId('report-assist-restore-goals').click();
    await page.getByTestId('report-assist-source-goals').waitFor({ timeout: 25000 });
    await page.getByTestId('report-assist-source-goals').selectOption(goalRef);
    const claim = 'Recorded baseline ' + g.baseline + ' and target ' + g.target + ' ' + g.measure + '; no clinical conclusion inferred.';
    await page.getByTestId('report-assist-edit-goals').fill(claim);
    await page.getByTestId('report-assist-apply-goals').click();
    await page.getByTestId('report-section-goals').waitFor();
    await page.getByTestId('report-assist-decision-goals').getByText('Added to draft (source-referenced only)').waitFor({ timeout: 25000 });
    const reportDraftText = await page.getByTestId('report-section-goals').inputValue();
    assert(reportDraftText.includes(claim));
    assert(reportDraftText.includes('Evidence references (internal draft; goals):'));
    assert(reportDraftText.includes(goalRef));
    const persisted = await db.progressReport.findUniqueOrThrow({ where: { id: speechReport.id } });
    assert(persisted.sections.goals.includes(claim), 'Explicit clinician decision must be atomically persisted');
    const decisions = await db.reportSuggestionDecision.findMany({ where: { reportId: speechReport.id }, orderBy: { reportRevision: 'asc' } });
    assert.deepEqual(decisions.map(d => d.action), ['OMITTED', 'RECONSIDERED', 'OMITTED', 'RECONSIDERED', 'APPLIED']);
    assert.equal(decisions.at(-1).label, 'NON_CLINICAL_DRAFT');
    await page.getByTestId('report-section-goals').fill(reportDraftText.replace('Recorded baseline', 'Reviewed baseline'));
    await page.locator('[data-testid="report-save-state"][data-state="saved"]').waitFor({ timeout: 25000 });
    await page.reload();
    await page.getByTestId('report-decisions-persistent').waitFor();
    assert((await page.getByTestId('report-assist-decision-goals').innerText()).includes('review required'));
    assert.equal(await page.getByTestId('report-assist-apply-goals').count(), 0, 'Previously applied decision must not be silently duplicated');
    const afterReload = await page.getByTestId('report-section-goals').inputValue();
    assert.equal(afterReload.split('Evidence references (internal draft; goals):').length - 1, 1);
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
  // CI/loopback-only disposable synthetic fixture: use an OT report so Speech's
  // earlier autosave/decision journey is unaffected. No protected hosted data.
  const queuedDraft = await db.progressReport.findFirstOrThrow({
    where: { centerId: center.id, childId: child.id, service: 'occupational', status: 'DRAFT' },
  });
  await db.progressReport.update({
    where: { id: queuedDraft.id }, data: { status: 'IN_REVIEW' },
  });
  await role('supervisor@childrens-home.therabridge.test', 'CLINICAL_SUPERVISOR', async page => {
    const messages = await read(page, centerBase + '/threads');
    assert.notEqual(messages.status, 200, 'Supervisors must not access family discussions');
    const clinician = await read(page, clinicalPath);
    assert.equal(clinician.status, 200);
    assert.equal(clinician.body.careTeam.length, 2);
    assert.equal(clinician.body.childWideReferent, null);
    const inbox = await read(page, centerBase + '/clinical/reports/review-queue');
    assert.equal(inbox.status, 200, 'Supervisor must have an authorized review inbox');
    assert(inbox.body.synthetic && inbox.body.released === false && Array.isArray(inbox.body.items));
    assert.equal(inbox.body.total, 1, 'CI synthetic report must be pending review');
    assert.equal(inbox.body.items[0].id, queuedDraft.id);
    assert.equal(inbox.body.items[0].status, 'IN_REVIEW');
    await page.goto(base + '/app/progress');
    await page.getByTestId('supervisor-review-queue').waitFor();
    const reviewRow = page.getByTestId('review-queue-row-' + queuedDraft.id);
    await reviewRow.waitFor();
    assert((await reviewRow.innerText()).includes(queuedDraft.title));
    // Real-browser keyboard and five-width responsive regression for #77.
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await reviewRow.waitFor();
      const widths = await page.evaluate(() => ({
        viewport: innerWidth, document: document.documentElement.scrollWidth,
        queue: document.querySelector('[data-testid="supervisor-review-queue"]')?.getBoundingClientRect().toJSON(),
      }));
      assert.equal(widths.viewport, width);
      assert(widths.document <= width + 3, 'Queue must not cause horizontal page overflow at ' + width);
      assert(widths.queue && widths.queue.width > 0 && widths.queue.right <= width + 3,
        'Supervisor queue must remain visible inside ' + width + 'px');
    }
    await page.getByTestId('review-queue-search').focus();
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => ({
      testId: document.activeElement?.getAttribute('data-testid'),
      visible: document.activeElement?.matches(':focus-visible'),
    }));
    assert.equal(focused.testId, 'review-queue-open-' + queuedDraft.id);
    assert.equal(focused.visible, true, 'Keyboard users must see focus on the review link');
    const openDraft = page.getByTestId('review-queue-open-' + queuedDraft.id);
    assert.equal(await openDraft.getAttribute('href'), '/app/reports/' + queuedDraft.id);
    assert((await openDraft.getAttribute('aria-label')).includes(queuedDraft.title));
    assert((await page.getByTestId('supervisor-review-queue').innerText()).includes('awaiting review across centre'));
    await page.getByTestId('filter-period').selectOption('custom');
    await page.getByTestId('filter-from').fill('2026-11-10');
    await page.getByTestId('filter-to').fill('2026-10-01');
    await page.getByTestId('progress-period-error').waitFor();
    await reviewRow.waitFor(); // chart error must not remove report review queue
    const order = await page.evaluate(() => {
      const filters = document.querySelector('[data-testid="progress-filters"]');
      const error = document.querySelector('[data-testid="progress-period-error"]');
      const queue = document.querySelector('[data-testid="supervisor-review-queue"]');
      return !!filters && !!error && !!queue
        && !!(filters.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING)
        && !!(error.compareDocumentPosition(queue) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    assert.equal(order, true, 'Date error must directly follow filters and precede the visible queue');
    await page.getByTestId('filter-period').selectOption('90');
    // Exercise actual child and specialty selectors with distinct pending rows.
    // The additional child exists only in the disposable CI loopback database.
    const secondChild = await db.child.create({ data: {
      centerId: center.id, firstName: 'Zoe', lastName: 'Queuefixture',
      dateOfBirth: new Date('2019-01-02T00:00:00Z'),
      services: ['speech'], createdById: child.createdById,
      createdAt: new Date('2026-10-01T09:00:00Z'),
    } });
    const secondReport = await db.progressReport.create({ data: {
      centerId: center.id, childId: secondChild.id, membershipId: queuedDraft.membershipId,
      service: 'speech', title: 'Separate Speech Review', status: 'IN_REVIEW',
      periodStart: new Date('2026-09-01T00:00:00Z'),
      periodEnd: new Date('2026-10-19T00:00:00Z'),
      createdAt: new Date('2026-10-01T09:00:00Z'),
      updatedAt: new Date('2026-10-01T09:00:00Z'),
    } });
    await page.reload();
    const secondRow = page.getByTestId('review-queue-row-' + secondReport.id);
    await secondRow.waitFor();
    await reviewRow.waitFor();
    assert((await page.getByTestId('review-queue-count').innerText()).includes('2 matching'));
    await page.getByTestId('filter-child').selectOption(secondChild.id);
    await secondRow.waitFor();
    await page.getByTestId('review-queue-count').getByText('1 matching', { exact: false }).waitFor();
    assert.equal(await reviewRow.count(), 0, 'Child filter must exclude other child reports');
    await page.getByTestId('filter-child').selectOption('');
    await reviewRow.waitFor();
    await secondRow.waitFor();
    await page.getByTestId('filter-service').selectOption('speech');
    await secondRow.waitFor();
    await reviewRow.waitFor({ state: 'detached' }); // after the server response
    await page.getByTestId('filter-service').selectOption('occupational');
    await reviewRow.waitFor();
    await secondRow.waitFor({ state: 'detached' }); // server-filtered result
    await page.getByTestId('filter-service').selectOption('');
    await secondRow.waitFor();
    await reviewRow.waitFor();
    await page.getByTestId('review-queue-search').fill('no-matching-synthetic-review');
    await page.getByTestId('review-queue-empty').waitFor();
    assert.equal(await reviewRow.count(), 0);
    await page.getByTestId('review-queue-search').fill(queuedDraft.title);
    await reviewRow.waitFor();
    await page.getByTestId('review-queue-search').fill('');
    await reviewRow.waitFor();
    assert.equal((await db.progressReport.findUniqueOrThrow({ where: { id: queuedDraft.id } })).status, 'IN_REVIEW',
      'Visiting and filtering queue must never approve, return or release reports');
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
    // Hosted-QA follow-up: the family view switches are ordinary buttons,
    // not broken composite ARIA tabs. Validate five actual Chromium widths.
    await page.goto(base + '/app/practice');
    await page.getByTestId('practice-page').waitFor();
    assert.equal(await page.locator('[data-testid="practice-page"] [role="tablist"]').count(), 0);
    // TB-EM-048: show only fixed request statuses; no care-plan drafts.
    const guardianRequests = page.getByTestId('guardian-home-plan-requests');
    await guardianRequests.waitFor();
    const requestsBefore = await read(page, centerBase + '/family/home-plan-requests');
    assert.equal(requestsBefore.status, 200);
    assert.equal(requestsBefore.body.enabled, true);
    assert.equal(requestsBefore.body.released, false);
    await guardianRequests.getByTestId('guardian-home-plan-request-speech').click();
    await guardianRequests.getByTestId('guardian-home-plan-history').getByText('Awaiting care-team acknowledgement').waitFor();
    assert((await guardianRequests.innerText()).includes('No clinical plan or report delivered'));
    const requestsAfter = await read(page, centerBase + '/family/home-plan-requests');
    assert.equal(requestsAfter.body.items.filter(x => x.service === 'speech' && x.status === 'PENDING').length, 1);
    assert.equal((await read(page, centerBase + '/clinical/home-plan-requests')).status, 403);
    await page.getByTestId('practice-view-week').click();
    assert.equal(await page.getByTestId('practice-view-week').getAttribute('aria-pressed'), 'true');
    await page.getByTestId('practice-view-history').click();
    assert.equal(await page.getByTestId('practice-view-history').getAttribute('aria-pressed'), 'true');
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await page.evaluate(() => ({
        viewport: innerWidth, width: document.documentElement.scrollWidth,
        visible: !!document.querySelector('[data-testid="practice-page"]'),
      }));
      assert(geometry.visible && geometry.width <= width + 8,
        'Family practice overflow at ' + width + 'px: ' + JSON.stringify(geometry));
    }
    await page.goto(base + '/app/activities');
    await page.getByTestId('family-activities').waitFor();
    // The original defect had correct Tailwind class names but undefined
    // --fam-* variables. Assert rendered Chromium colors, not class strings.
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const colors = await page.evaluate(() => {
        const shell = document.querySelector('[data-testid="product-shell"]');
        const desktop = document.querySelector('[data-testid="nav-activities"]');
        const mobile = document.querySelector('[data-testid="mobile-nav-select"]');
        const isMobile = innerWidth < 768;
        const active = isMobile ? mobile : desktop;
        const indicator = isMobile ? mobile : active?.querySelector('[aria-hidden="true"]');
        const computed = active && getComputedStyle(active);
        return {
          bodyWidth: document.documentElement.scrollWidth,
          themed: !!shell?.classList.contains('theme-family-auto'),
          current: isMobile ? (mobile?.value === '/app/activities' ? 'page' : null) : active?.getAttribute('aria-current'),
          accent: shell && getComputedStyle(shell).getPropertyValue('--fam-accent').trim(),
          tint: shell && getComputedStyle(shell).getPropertyValue('--fam-accentTint').trim(),
          background: computed?.backgroundColor,
          foreground: computed?.color,
          indicator: isMobile ? computed?.color : (indicator && getComputedStyle(indicator).backgroundColor),
        };
      });
      assert(colors.bodyWidth <= width + 8, 'Family activities overflow at ' + width + 'px: ' + JSON.stringify(colors));
      assert(colors.themed && colors.current === 'page', 'Guardian shell and selected link must be themed at ' + width + 'px');
      assert.equal(colors.accent.toUpperCase(), '#0A7385', 'Guardian light accent variable at ' + width + 'px');
      assert.equal(colors.tint.toUpperCase(), '#E3F3F5', 'Guardian light tint variable at ' + width + 'px');
      assert.equal(colors.background, 'rgb(227, 243, 245)', 'Rendered guardian active tint at ' + width + 'px');
      assert.equal(colors.foreground, 'rgb(10, 115, 133)', 'Rendered guardian active text at ' + width + 'px');
      assert.equal(colors.indicator, 'rgb(10, 115, 133)', 'Rendered guardian active indicator at ' + width + 'px');
    }
    await page.goto(base + '/app/messages');
    await page.getByTestId('messages-demo-disabled').waitFor();
    assert((await page.getByTestId('messages-demo-disabled').innerText()).includes('switched off'));
    await page.setViewportSize({ width: 1280, height: 900 });
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
  // TB-EM-048: the same synthetic request is visible only to assigned
  // therapist(s) and acknowledged without creating or releasing a plan.
  await role('speech@childrens-home.therabridge.test', 'THERAPIST', async page => {
    const r = await read(page, centerBase + '/clinical/home-plan-requests');
    assert.equal(r.status, 200);
    assert.equal(r.body.enabled, true);
    assert(r.body.items.some(x => x.service === 'speech' && x.status === 'PENDING'));
    await page.goto(base + '/app/practice-feedback');
    const inbox = page.getByTestId('clinician-home-plan-requests');
    await inbox.waitFor();
    const pending = inbox.getByTestId('plan-request-acknowledge').first();
    await pending.waitFor();
    await pending.click();
    await inbox.getByText('Received by care team (no plan shared)').first().waitFor();
    const latest = await read(page, centerBase + '/clinical/home-plan-requests');
    assert(latest.body.items.some(x => x.service === 'speech' && x.status === 'ACKNOWLEDGED'));
    assert(latest.body.items.every(x => x.released === false && x.clinicalAuthorization === false));
  });
  console.log('PASS: seven role identities + synthetic guardian home-plan request and therapist acknowledgement, without clinical release');
} finally {
  await browserInstance.close();
  await db.$disconnect();
}
