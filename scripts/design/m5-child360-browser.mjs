// M5-05: browser evidence for the build-time gated Child 360 experience.
// Isolated synthetic CI database only. Never log identities, tokens or clinical text.
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3000';
const widths = [320, 390, 768, 1024, 1440];
const tabs = ['overview', 'care', 'sessions', 'progress', 'documents'];
const personas = [
  ['speech@childrens-home.therabridge.test', 'THERAPIST'],
  ['ot@childrens-home.therabridge.test', 'THERAPIST'],
  ['supervisor@childrens-home.therabridge.test', 'CLINICAL_SUPERVISOR'],
];
export function validateChild360Receipt(receipt) {
  if (receipt?.schemaVersion !== 1 || receipt?.environment !== 'ISOLATED_SYNTHETIC_CI' ||
      receipt?.featureFlag !== 'ENABLED_CI_ONLY' || receipt?.clinicalGate !== 'NO_GO_G2_G2b' ||
      receipt?.humanUsabilityApproval !== 'NOT_OBTAINED' ||
      receipt?.accessibilityApproval !== 'NOT_OBTAINED' ||
      receipt?.observations !== 15 || receipt?.personas !== 3 ||
      receipt?.deniedRoles !== 1 || receipt?.navigationFailures !== 0 ||
      receipt?.slowLoads !== 15 || receipt?.failuresRecovered !== 15 ||
      receipt?.taskFlowObservations !== 45 ||
      Object.keys(receipt).some(k => /password|cookie|token|email|childId|content|text|html/i.test(k)))
    throw new Error('M5-05 evidence missing, sensitive, or falsely approved');
  return true;
}
export async function runChild360BrowserAcceptance({ passwords }) {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (process.env.DEPLOYMENT_ENV !== 'ci' ||
      process.env.NEXT_PUBLIC_M5_CHILD_COMPACT !== 'true' ||
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      !url.pathname.endsWith('_demo_test') ||
      !personas.every(([email]) => typeof passwords?.[email] === 'string') ||
      typeof passwords['coordinator@childrens-home.therabridge.test'] !== 'string') {
    throw new Error('M5-05 browser acceptance requires explicit flagged, isolated synthetic CI');
  }
  const prisma = new PrismaClient();
  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  let observations = 0, taskFlowObservations = 0;
  try {
    const center = await prisma.center.findUniqueOrThrow({ where: { slug: 'childrens-home-demo' } });
    const child = await prisma.child.findFirstOrThrow({ where: { centerId: center.id, firstName: 'Yusuf', lastName: 'Ahmed' } });
    const clinical = base + '/app/clinical/' + encodeURIComponent(child.id);
    async function login(page, email) {
      await page.goto(base + '/login', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('login-email-input').fill(email);
      await page.getByTestId('login-password-input').fill(passwords[email]);
      await page.getByTestId('login-submit-button').click();
      await page.waitForURL(/\/app(?:\/|$)/, { timeout: 20000 });
    }
    for (const [email, role] of personas) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 850 }, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        await login(page, email);
        const sessionRole = await page.evaluate(async () => {
          const response = await fetch('/api/auth/session', { credentials: 'include' });
          const value = await response.json();
          return value.activeContext?.role;
        });
        assert.equal(sessionRole, role, 'Synthetic persona role mismatch');
        for (const width of widths) {
          await page.setViewportSize({width,height:850});
          const response = await page.goto(clinical, {waitUntil:'domcontentloaded'});
          assert(response?.ok(), 'Authorized synthetic child page must load');
          await page.getByTestId('clinical-tab-overview').waitFor({state:'visible'});
          const topTabs = page.getByRole('tablist', {name:'Child 360 sections'}).getByRole('tab');
          assert.equal(await topTabs.count(),5,'Exactly five primary tabs required');
          const tabsInDom = await topTabs.evaluateAll(nodes => nodes.map(n=>n.getAttribute('data-testid')));
          assert.deepEqual(tabsInDom,tabs.map(x=>'clinical-tab-'+x),'Tab order and stable IDs');
          assert.equal(await page.locator('[data-testid="clinical-synthetic-banner"]').count(),1,'Clinical synthetic warning must persist');
          // M5-05: task-first Overview. Historic evidence is collapsed rather than
          // deleted; the native disclosure remains keyboard operable and scoped.
          const disclosures=['team','activity','history',...(role==='THERAPIST'?['practice']:[])];
          for(const section of disclosures){
            const region=page.getByTestId('child360-disclosure-'+section);
            const details=region.locator('details');
            assert.equal(await details.count(),1,'Missing native '+section+' disclosure');
            assert.equal(await details.getAttribute('open'),null,'Long-form '+section+' details start collapsed');
            const summary=details.locator('summary');
            await summary.focus();
            await page.keyboard.press('Enter');
            assert.equal(await details.getAttribute('open'),'','Keyboard must expand '+section+' details');
            if(section==='team'){
              await page.getByTestId('child360-care-team').waitFor({state:'visible'});
              assert(await page.getByTestId('child360-care-team-list').locator('li').count()>0,
                'Team details must retain authorized assigned therapists');
            }
            if(section==='history'){
              await page.getByTestId('child360-clinical-timeline').waitFor({state:'visible'});
              assert(await page.getByTestId('child360-timeline-count').isVisible(),
                'Clinical history must remain available without new permissions');
            }
            await summary.focus();
            await page.keyboard.press('Enter');
            assert.equal(await details.getAttribute('open'),null,'Keyboard must collapse '+section+' details');
          }
          for (const tab of tabs) {
            const button=page.getByTestId('clinical-tab-'+tab);
            await button.click();
            assert.equal(await button.getAttribute('aria-selected'),'true','Selected primary tab state');
            const panels=page.getByRole('tablist',{name:'Child 360 sections'}).locator('..').locator(':scope > [role="tabpanel"]');
            assert.equal(await panels.count(),1,'Only one active clinical tabpanel may mount');
            assert.equal(await panels.getAttribute('aria-labelledby'),await button.getAttribute('id'),'Panel must name selected tab');
            assert.equal(await page.locator('[data-testid^="clinical-tab-"][aria-selected="true"]').count(),1);
            if(tab==='care'){
              await page.getByTestId('clinical-secondary-plan').waitFor({state:'visible'});
              await page.getByTestId('clinical-secondary-assessments').click();
              assert.equal(await page.getByTestId('clinical-secondary-assessments').getAttribute('aria-current'),'page');
              await page.getByTestId('clinical-tab-care').click();
              assert.equal(await page.getByTestId('clinical-secondary-assessments').getAttribute('aria-current'),'page',
                'Clicking active Care cannot lose assessment selection');
              await page.getByTestId('clinical-secondary-plan').click();
              assert.equal(await page.getByTestId('clinical-secondary-plan').getAttribute('aria-current'),'page');
            }
          }
          // Representative M5-05 task decisions: from Overview, access
          // assessment evidence in two decisions, and sessions/documents in one.
          // This checks actual working tabs, not a static diagram or mock link.
          for (const [destination, actions] of [
            ['assessments', ['care', 'assessments']],
            ['sessions', ['sessions']],
            ['documents', ['documents']],
          ]) {
            await page.getByTestId('clinical-tab-overview').click();
            assert(actions.length <= 3, 'Representative task exceeds three navigation decisions');
            for (const action of actions) {
              await page.getByTestId(action === 'assessments'
                ? 'clinical-secondary-assessments' : 'clinical-tab-' + action).click();
            }
            if (destination === 'assessments') {
              assert.equal(await page.getByTestId('clinical-secondary-assessments').getAttribute('aria-current'),'page');
              assert.equal(await page.getByTestId('clinical-tab-care').getAttribute('aria-selected'),'true');
              await page.getByTestId('assessments-panel').waitFor({state:'visible'});
              // Workspace data was already authorized and loaded; an explicit
              // empty assessment state is usable, never count a missing panel.
              assert.equal(await page.getByTestId('assessments-load-error').count(),0,
                'Assessment history must not have a pagination error');
            } else {
              assert.equal(await page.getByTestId('clinical-tab-' + destination).getAttribute('aria-selected'),'true');
              if (destination === 'sessions') {
                await page.getByTestId('sessions-panel').waitFor({state:'visible'});
              } else {
                // Reports are fetched independently by ScopedReportsPanel.
                // Selecting Documents alone must not count as task success.
                await page.getByTestId('reports-panel').waitFor({state:'visible'});
                await page.getByTestId('reports-panel').locator(
                  '[data-testid="reports-empty"], [data-testid^="report-row-"]'
                ).first().waitFor({state:'visible',timeout:20000});
                assert.equal(await page.getByTestId('reports-error').count(),0,
                  'Documents data must load successfully before counting a task');
                assert.equal(await page.getByTestId('reports-loading').count(),0,
                  'Document task cannot succeed while reports still loading');
              }
            }
            taskFlowObservations++;
          }
          // Explicit keyboard and roving-tabindex check with non-destructive navigation.
          const overview=page.getByTestId('clinical-tab-overview');
          await overview.click();
          await overview.focus();
          await page.keyboard.press('ArrowRight');
          await page.getByTestId('clinical-tab-care').waitFor({state:'visible'});
          assert.equal(await page.getByTestId('clinical-tab-care').getAttribute('aria-selected'),'true');
          assert(await page.getByTestId('clinical-tab-care').evaluate(n=>document.activeElement===n),
            'ArrowRight must move keyboard focus');
          await page.keyboard.press('End');
          assert.equal(await page.getByTestId('clinical-tab-documents').getAttribute('aria-selected'),'true');
          await page.keyboard.press('Home');
          assert.equal(await page.getByTestId('clinical-tab-overview').getAttribute('aria-selected'),'true');
          const geom=await page.getByRole('tablist',{name:'Child 360 sections'}).evaluate(node=>({
            right:node.getBoundingClientRect().right,
            width:node.getBoundingClientRect().width,
            scroll:node.scrollWidth,
            client:node.clientWidth,
            viewport:innerWidth,
          }));
          assert(geom.right<=width+6 && geom.width>0 && geom.client>0,
            'Primary navigation must fit its viewport at '+width+'px');
          assert(geom.scroll>=geom.client, 'Tabs may scroll internally without clipping');
          observations++;
        }
      } finally {await context.close();}
    }
    // M5-05 R2: isolate slow loading and failure/recovery in the same
    // in-memory synthetic server. Browser interception changes GET responses
    // only; no clinical write is attempted, and no payload enters evidence.
    const workspaceRequest = request => {
      const url = new URL(request.url());
      return request.method() === 'GET' &&
        url.pathname.split('/').length === 7 &&
        url.pathname.split('/')[1] === 'api' &&
        url.pathname.split('/')[2] === 'centers' &&
        url.pathname.split('/')[3].length > 0 &&
        url.pathname.split('/')[4] === 'clinical' &&
        url.pathname.split('/')[5] === 'children' &&
        url.pathname.split('/')[6].length > 0 &&
        url.searchParams.get('planOffset') === '0' &&
        url.searchParams.get('assessmentOffset') === '0';
    };
    let slowLoads = 0, failuresRecovered = 0;
    for (const [email, role] of personas) {
      const context = await browser.newContext({viewport:{width:390,height:850},reducedMotion:'reduce'});
      try {
        const page = await context.newPage();
        await login(page,email);
        // A new route invocation is needed for each width. Running the
        // sequence for every clinical persona exercises responsive skeleton,
        // blocked error and explicit retry without relying on setTimeout(200).
        for (const width of widths) {
          await page.setViewportSize({width,height:850});
          let intercepted = 0;
          // Synchronize with the actual network interception rather than a
          // wall-clock timeout; slow CI runners cannot race this pending GET.
          let notifyIntercept;
          let releaseResponse;
          const requestCaptured = new Promise(resolve => { notifyIntercept = resolve; });
          const responseGate = new Promise(resolve => { releaseResponse = resolve; });
          await page.route('**/api/centers/**', async route => {
            if (!workspaceRequest(route.request())) return route.continue();
            intercepted++;
            if (intercepted === 1) {
              notifyIntercept();
              await responseGate;
              return route.continue();
            }
            if (intercepted === 2) {
              return route.fulfill({status:503, contentType:'application/json',
                body:JSON.stringify({message:'Synthetic temporary outage'})});
            }
            return route.continue();
          });
          // First load is deliberately held to prove loading remains visible
          // and clinical content does not appear before authorization arrives.
          try {
            await page.goto(clinical,{waitUntil:'domcontentloaded'});
            await requestCaptured;
            await page.getByTestId('clinical-loading').waitFor({state:'visible'});
            assert.equal(await page.getByRole('tablist',{name:'Child 360 sections'}).count(),0,
              'No sensitive tab panel while scoped workspace GET is pending');
          } finally {
            releaseResponse();
          }
          await page.getByTestId('clinical-tab-overview').waitFor({state:'visible'});
          slowLoads++;
          // A fresh route mount forces the next scoped workspace request to
          // return 503, ensuring an actual failed-fetch ErrorState is rendered.
          await page.reload({waitUntil:'domcontentloaded'});
          await page.getByTestId('clinical-error').waitFor({state:'visible'});
          assert.equal(await page.getByRole('tablist',{name:'Child 360 sections'}).count(),0,
            'Failed workspace must not reveal stale clinical panels');
          const retry = page.getByTestId('clinical-error-retry');
          await retry.click();
          await page.getByTestId('clinical-tab-overview').waitFor({state:'visible'});
          assert.equal(await page.getByTestId('clinical-error').count(),0,
            'Successful retry must clear the error state');
          assert.equal(await page.getByTestId('clinical-synthetic-banner').count(),1);
          assert.equal(await page.getByRole('tablist',{name:'Child 360 sections'}).getByRole('tab').count(),5);
          assert.equal(intercepted,3,'Slow, failed, and retried requests must all occur');
          failuresRecovered++;
          await page.unroute('**/api/centers/**');
        }
      } finally { await context.close(); }
    }
    // Nonclinical coordinator must not see a clinical workspace or any five-tab shell.
    const denyContext=await browser.newContext();
    try {
      const page=await denyContext.newPage();
      await login(page,'coordinator@childrens-home.therabridge.test');
      await page.goto(clinical,{waitUntil:'domcontentloaded'});
      await page.getByTestId('page-forbidden').waitFor({state:'visible'});
      assert.equal(await page.getByRole('tablist',{name:'Child 360 sections'}).count(),0,
        'Unauthorized role must not see clinician tab content');
    } finally {await denyContext.close();}
    const receipt=Object.freeze({
      schemaVersion:1,environment:'ISOLATED_SYNTHETIC_CI',
      featureFlag:'ENABLED_CI_ONLY',clinicalGate:'NO_GO_G2_G2b',
      humanUsabilityApproval:'NOT_OBTAINED',accessibilityApproval:'NOT_OBTAINED',
      personas:personas.length,observations,deniedRoles:1,navigationFailures:0,
      slowLoads,failuresRecovered,taskFlowObservations,
    });
    validateChild360Receipt(receipt);
    console.log('M5-05 flagged synthetic-browser receipt:', JSON.stringify(receipt));
    return receipt;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}
