// Private synthetic-only hosted interactive smoke checks.
// Never persist page text, API bodies, credentials, cookies, or browser traces.
import {readFile, mkdir, writeFile, chmod} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {chromium} from 'playwright';
import {BASE, ROLES, settleLoginPage, logout, validateTarget} from './hosted-readonly.mjs';
import {verifySyntheticUsers, publicHealth} from './prepare-hosted-run.mjs';

const ORIGIN = new URL(BASE).origin;
const CHECKS = ['PASS', 'FAIL', 'BLOCKED'];
const result = (role, step, status, reason) => ({role, step, status, reason});
const safePath = page => {
  try { return new URL(page.url()).pathname; } catch { return ''; }
};
const ROUTE_EVIDENCE = {
 '/app/applications':['applications-title','applications-loading','applications-error'],
 '/app/centers':['centers-title','centers-loading','centers-error'],
 '/app/setup':['setup-title','setup-loading','setup-error'],
 '/app/team':['team-title','staff-loading','staff-error'],
 '/app/children':['children-title','children-loading','children-error'],
 '/app/schedule':['schedule-title','schedule-loading','schedule-error'],
 '/app/clinical':['clinical-title','clinical-list-loading','clinical-list-error'],
 '/app/progress':['progress-title','progress-loading','progress-error'],
 '/app/activities':['activities-title','activities-loading','activities-error'],
 '/app/governance':['governance-title','governance-loading','governance-error'],
 '/app/practice':['practice-page','practice-loading','practice-error'],
 '/app/family-progress':['family-progress-demo','family-progress-loading','family-progress-error']
};
async function login(page, role, user) {
  await page.goto(BASE + '/login', {waitUntil:'domcontentloaded', timeout:30000});
  await settleLoginPage(page);
  await page.getByTestId('login-email-input').fill(user.email);
  await page.getByTestId('login-password-input').fill(user.password);
  const [response] = await Promise.all([
    page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/login' && r.request().method() === 'POST', {timeout:25000}),
    page.getByTestId('login-submit-button').click()
  ]);
  if (response.status() !== 200) return false;
  await page.waitForURL(u => u.pathname === '/select-context' || u.pathname.startsWith('/app'), {timeout:25000});
  if (safePath(page) === '/select-context') {
    const selected = await page.evaluate(async ([email, expected]) => {
      const r = await fetch('/api/auth/session', {credentials:'include'});
      if (!r.ok) return false;
      const session = await r.json();
      if (session.user?.email?.toLowerCase() !== email.toLowerCase()) return false;
      const matches = (session.contexts ?? []).filter(c => c.role === expected);
      if (matches.length !== 1) return false;
      const c = matches[0];
      const choice = c.type === 'platform' ? {platform:true} : {membershipId:c.membershipId,role:expected};
      const changed = await fetch('/api/auth/context', {
        method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},
        body:JSON.stringify(choice)
      });
      return changed.ok;
    }, [user.email,ROLES[role].role]);
    if (!selected) return false;
    await page.goto(BASE + '/app', {waitUntil:'domcontentloaded',timeout:30000});
  }
  await page.getByTestId('product-shell').waitFor({timeout:20000});
  return page.evaluate(async ([expectedEmail,expectedRole]) => {
    const r = await fetch('/api/auth/session', {credentials:'include'});
    if (!r.ok) return false;
    const s = await r.json();
    return s.user?.email?.toLowerCase() === expectedEmail.toLowerCase() &&
      s.activeContext?.role === expectedRole;
  },[user.email,ROLES[role].role]);
}
async function navigate(page, role, route, rows) {
  try {
    // Only actual visible navigation links count as an interactive navigation PASS.
    const link = page.locator('a[href="' + route + '"]:visible').first();
    if (await link.count() === 0) {
      rows.push(result(role,'link:'+route,'BLOCKED','visible_navigation_link_unavailable'));
      return false;
    }
    await link.click({timeout:10000});
    await page.waitForURL(u => u.pathname === route,{timeout:15000});
    await page.getByTestId('product-shell').waitFor({timeout:15000});
    await page.getByTestId('session-loading').waitFor({state:'hidden',timeout:15000});
    const evidence = role === 'guardian' && route === '/app/activities'
      ? ['family-activities','family-activities-loading','family-activities-error']
      : ROUTE_EVIDENCE[route]??[];
    const [success,loading,error]=evidence;
    if (!success) throw Error('route_contract_missing');
    await page.getByTestId(success).waitFor({state:'visible',timeout:15000});
    if (loading) await page.getByTestId(loading).waitFor({state:'hidden',timeout:15000});
    if (route === '/app/governance') {
      await page.locator('[data-testid="governance-list"]:visible, [data-testid="governance-empty"]:visible')
        .first().waitFor({state:'visible',timeout:15000});
    }
    if (await page.getByTestId('page-forbidden').isVisible().catch(()=>false) ||
        await page.getByTestId('applications-forbidden').isVisible().catch(()=>false) ||
        (error && await page.getByTestId(error).isVisible().catch(()=>false)))
      throw Error('route_error');
    rows.push(result(role,'link:'+route,'PASS','clicked_authorized_navigation'));
    return true;
  } catch {
    rows.push(result(role,'link:'+route,'FAIL','navigation_click_or_render_failed'));
    return false;
  }
}
async function openCancel(page, role, rows, config) {
  const {route,open,dialog,cancel,label} = config;
  try {
    if (safePath(page) !== route) {
      const response = await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:30000});
      if (response?.status() !== 200) {
        rows.push(result(role,label,'BLOCKED','route_unavailable'));
        return;
      }
    }
    await page.getByTestId('session-loading').waitFor({state:'hidden',timeout:15000});
    const button=page.getByTestId(open);
    await button.waitFor({state:'visible',timeout:15000}).catch(()=>{});
    if (await button.count() !== 1 || !await button.isVisible()) {
      rows.push(result(role,label,'BLOCKED','authorized_open_control_unavailable'));
      return;
    }
    await button.click();
    await page.getByTestId(dialog).waitFor({state:'visible',timeout:10000});
    const dismiss=page.getByTestId(cancel);
    if (!await dismiss.isVisible()) throw Error('cancel_unavailable');
    await dismiss.click();
    await page.getByTestId(dialog).waitFor({state:'hidden',timeout:10000});
    rows.push(result(role,label,'PASS','dialog_opened_and_cancelled_without_submit'));
  } catch {
    rows.push(result(role,label,'FAIL','dialog_open_cancel_failed'));
  }
}
async function inspectRole(browser,role,user) {
  const rows=[];
  const ctx=await browser.newContext({
    viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:false
  });
  const page=await ctx.newPage();
  let attempted=false;
  try {
    attempted=true;
    const valid=await login(page,role,user);
    if (!valid) {
      rows.push(result(role,'authentication','FAIL','role_or_identity_unverified'));
      return rows;
    }
    rows.push(result(role,'authentication','PASS','exact_role_identity_confirmed'));
    for (const route of ROLES[role].routes.filter(p => p !== '/app')) {
      await navigate(page,role,route,rows);
    }
    if (role === 'admin') {
      await openCancel(page,role,rows,{
        route:'/app/children',open:'register-child-button',
        dialog:'register-child-dialog',cancel:'register-child-cancel',
        label:'child_registration_open_cancel'
      });
    }
    if (role === 'admin' || role === 'coordinator') {
      await openCancel(page,role,rows,{
        route:'/app/schedule',open:'book-appointment-button',
        dialog:'book-dialog',cancel:'book-cancel',
        label:'appointment_booking_open_cancel'
      });
      try {
        await page.goto(BASE+'/app/schedule',{waitUntil:'domcontentloaded',timeout:30000});
        const week=page.getByTestId('view-week');
        const next=page.getByTestId('week-next');
        const prev=page.getByTestId('week-prev');
        await page.getByTestId('schedule-title').waitFor({state:'visible',timeout:15000});
        await page.getByTestId('schedule-loading').waitFor({state:'hidden',timeout:15000});
        const day=page.getByTestId('view-day');
        await week.waitFor({state:'visible',timeout:15000});
        await day.click();
        if (await day.getAttribute('aria-pressed') !== 'true') throw Error('day_not_selected');
        await week.click();
        if (await week.getAttribute('aria-pressed') !== 'true') throw Error('week_not_selected');
        const label=page.getByTestId('week-label');
        const initial=await label.innerText();
        await next.click();
        await page.waitForFunction(prevText=>document.querySelector('[data-testid="week-label"]')?.textContent !== prevText,initial,{timeout:15000});
        await prev.click();
        await page.waitForFunction(prevText=>document.querySelector('[data-testid="week-label"]')?.textContent === prevText,initial,{timeout:15000});
        rows.push(result(role,'schedule_view_controls','PASS','view_and_period_changes_asserted'));
      } catch {
        rows.push(result(role,'schedule_view_controls','FAIL','schedule_controls_failed'));
      }
    }
    if (role === 'guardian') {
      try {
        await page.goto(BASE+'/app/practice',{waitUntil:'domcontentloaded',timeout:30000});
        await page.getByTestId('practice-page').waitFor({state:'visible',timeout:15000});
        if (safePath(page) !== '/app/practice' ||
          await page.getByTestId('practice-error').isVisible().catch(()=>false) ||
          await page.getByTestId('page-forbidden').isVisible().catch(()=>false))
          throw Error('practice_unavailable');
        rows.push(result(role,'guardian_practice_open','PASS','practice_content_rendered_no_mutation'));
      } catch {
        rows.push(result(role,'guardian_practice_open','FAIL','practice_route_unavailable'));
      }
    }
    // Presenter rehearsal: visit a real assigned synthetic child and exercise
    // every clinical section without submitting, signing, or generating AI.
    if (role === 'speech' || role === 'ot' || role === 'supervisor') {
      try {
        await page.goto(BASE+'/app/clinical',{waitUntil:'domcontentloaded',timeout:30000});
        await page.getByTestId('clinical-list-loading').waitFor({state:'hidden',timeout:15000});
        if (await page.getByTestId('clinical-list-empty').isVisible().catch(()=>false)) {
          rows.push(result(role,'demo_clinical_child_walkthrough','BLOCKED','no_assigned_synthetic_child'));
        } else {
          const child=page.locator('[data-testid^="clinical-child-"]:visible').first();
          await child.waitFor({state:'visible',timeout:15000});
          await child.click();
          await page.getByTestId('clinical-workspace').waitFor({state:'visible',timeout:15000});
          await page.getByTestId('clinical-child-name').waitFor({state:'visible',timeout:15000});
          const banner=await page.getByTestId('clinical-synthetic-banner').innerText();
          if (!banner.includes('Synthetic data only') ||
              !banner.includes('AI processing are not available'))
            throw Error('clinical_gate_banner_missing');
          for (const name of ['overview','plan','assessments','sessions','progress','reports']) {
            const tab=page.getByTestId('clinical-tab-'+name);
            await tab.click({timeout:10000});
            if (await tab.getAttribute('aria-selected') !== 'true' ||
                !await page.locator('#clinical-tabpanel').isVisible())
              throw Error('clinical_tab_unavailable');
          }
          rows.push(result(role,'demo_clinical_child_walkthrough','PASS','six_tabs_and_disabled_ai_banner_verified'));
        }
      } catch {
        rows.push(result(role,'demo_clinical_child_walkthrough','FAIL','clinical_child_or_tab_rehearsal_failed'));
      }
    }
    if (role === 'guardian') {
      try {
        await page.goto(BASE+'/app/family-progress',{waitUntil:'domcontentloaded',timeout:30000});
        await page.getByTestId('family-progress-demo').waitFor({state:'visible',timeout:15000});
        await page.getByTestId('family-progress-sample-banner').waitFor({state:'visible',timeout:15000});
        rows.push(result(role,'demo_guardian_progress_sample','PASS','explicitly_labeled_fictional_progress_shown'));
      } catch {
        rows.push(result(role,'demo_guardian_progress_sample','FAIL','guardian_sample_rehearsal_failed'));
      }
    }
    // The following require separate controlled scenarios, and are NEVER
    // promoted merely because route navigation or modal rendering worked.
    rows.push(result(role,'form_submission_validation','BLOCKED','no_mutating_submission_authorized'));
    rows.push(result(role,'clinical_or_ai_draft_review','BLOCKED','clinical_gate_and_review_not_exercised'));
  } catch {
    rows.push(result(role,'role_execution','BLOCKED','browser_operation_incomplete'));
  } finally {
    let cleaned=false;
    if (attempted) {
      try { cleaned=await logout(ctx); } catch {/* keep cleanup failure */ }
    }
    rows.push(result(role,'session_cleanup',cleaned?'PASS':'FAIL',
      cleaned?'server_logout_confirmed':'logout_unconfirmed'));
    await ctx.close().catch(()=>{});
  }
  return rows;
}
export async function run({
  credentialsFile=process.env.QA_USERS_FILE,
  output=process.env.QA_PRIVATE_OUTPUT
}={}) {
  if (!validateTarget(BASE) || !credentialsFile || !output) throw Error('private_hosted_preconditions_missing');
  const users=verifySyntheticUsers(await readFile(credentialsFile,'utf8'));
  await publicHealth();
  const out=resolve(output);
  await mkdir(out,{recursive:true,mode:0o700});
  if (process.platform !== 'win32') await chmod(out,0o700);
  const browser=await chromium.launch();
  const rows=[];
  try {
    for (const role of Object.keys(ROLES))
      rows.push(...await inspectRole(browser,role,users[role]));
  } finally { await browser.close().catch(()=>{}); }
  const counts=Object.fromEntries(CHECKS.map(s=>[s,rows.filter(r=>r.status===s).length]));
  const report={
    schema:1,kind:'hosted_synthetic_interactive_readonly',target:ORIGIN,
    baseline104Unchanged:true,clinicalGatesUnchanged:true,
    generatedAt:new Date().toISOString(),counts,rows
  };
  await writeFile(join(out,'hosted-interactive-results.json'),
    JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log('INTERACTIVE_QA_SUMMARY '+JSON.stringify({counts}));
  return counts.FAIL ? 1 : counts.BLOCKED ? 2 : 0;
}
if (process.argv[1]?.endsWith('/hosted-interactive.mjs')) {
  run().then(code=>{process.exitCode=code;}).catch(()=>{
    console.error('Private interactive QA precondition unavailable');
    process.exitCode=2;
  });
}
