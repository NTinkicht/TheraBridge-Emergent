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
    await page.getByTestId('home-assist-toggle').click();
    await page.getByTestId('home-plan-evidence-assist').waitFor();
    const speechReport = await db.progressReport.findFirstOrThrow({ where: { centerId: center.id, childId: child.id, service: 'speech' } });
    await page.goto(base + '/app/reports/' + speechReport.id);
    await page.getByTestId('report-evidence-assist').waitFor();
    await page.getByTestId('report-decisions-persistent').waitFor();
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
        const mobile = document.querySelector('[data-testid="mobile-nav-activities"]');
        const active = innerWidth < 768 ? mobile : desktop;
        const indicator = active?.querySelector('[aria-hidden="true"]');
        const computed = active && getComputedStyle(active);
        return {
          bodyWidth: document.documentElement.scrollWidth,
          themed: !!shell?.classList.contains('theme-family-auto'),
          current: active?.getAttribute('aria-current'),
          accent: shell && getComputedStyle(shell).getPropertyValue('--fam-accent').trim(),
          tint: shell && getComputedStyle(shell).getPropertyValue('--fam-accentTint').trim(),
          background: computed?.backgroundColor,
          foreground: computed?.color,
          indicator: indicator && getComputedStyle(indicator).backgroundColor,
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
