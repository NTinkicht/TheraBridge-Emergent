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
    await page.getByTestId('plan-evidence-trail').first().waitFor();
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
          i === 0 ? { ...a, snapshot: oldSnapshot } : a);
        const currentActivities = first.homeActivities.map((a, i) =>
          i === 0 ? { ...a, snapshot: { ...oldSnapshot,
            title: 'Updated saved activity', steps: ['new saved instructions'],
            safety: ['new saved safety'], version: 2 } } : a);
        return { ...p, versions: [
          { ...first, id: first.id + '-comparison-fixture', number: first.number + 1,
            summary: first.summary + ' Updated synthetic comparison.',
            goals: first.goals.map((g, i) => i === 0 ? { ...g, target: g.target + 1 } : g),
            homeActivities: currentActivities },
          { ...first, status: 'SUPERSEDED', homeActivities: priorActivities },
        ] };
      });
      await route.fulfill({ response, body: JSON.stringify(body) });
    });
    await page.reload();
    await page.getByTestId('clinical-tab-plan').click();
    const versionHistory = page.getByTestId('plan-version-history');
    await versionHistory.locator('summary').click();
    await page.getByTestId('plan-history-list').waitFor();
    await page.getByTestId('plan-history-inspection').waitFor();
    await page.getByTestId('plan-history-comparison').waitFor();
    assert((await page.getByTestId('plan-history-comparison').innerText()).includes('Goal definition changed.'));
    const savedActivityComparison = await page.getByTestId('plan-history-comparison').innerText();
    assert(savedActivityComparison.includes('Original saved activity'), 'Historical name must use saved snapshot');
    assert(savedActivityComparison.includes('original safety guidance'), 'Historical safety must use saved snapshot');
    assert(savedActivityComparison.includes('new saved safety'), 'Comparison must show changed saved safety');
    // TB-EM-031 uses the same disposable already-authorized workspace overlay.
    // Exercise the clinician's dated objective and scheduled activity fields
    // without saving or contaminating the seeded demonstration.
    await page.getByTestId('goal-horizon-0').selectOption('SHORT_TERM');
    await page.getByTestId('goal-target-date-0').fill('2027-03-15');
    await page.getByTestId('goal-review-date-0').fill('2026-12-15');
    assert.equal(await page.getByTestId('goal-horizon-0').inputValue(), 'SHORT_TERM');
    await page.getByTestId('activity-schedule-cadence-0').selectOption('WEEKLY');
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

    const speechReport = await db.progressReport.findFirstOrThrow({ where: { centerId: center.id, childId: child.id, service: 'speech' } });
    await page.goto(base + '/app/reports/' + speechReport.id);
    await page.getByTestId('report-evidence-assist').waitFor();
    await page.getByTestId('report-decisions-persistent').waitFor();
    // Synthetic seed has editable drafts but no saved immutable version.
    // Exercise the real clinician Save version operation as prerequisite.
    await page.getByTestId('report-to-plan-needs-version').waitFor();
    await page.getByTestId('report-save-version').click();
    await page.getByTestId('report-to-plan-toggle').waitFor();
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
  console.log('PASS: seven role logins + logout, centre and child read, scoped Speech/OT history, parent practice, blocked admin/parent/supervisor clinical/messaging access through real same-origin API');
} finally {
  await browserInstance.close();
  await db.$disconnect();
}
