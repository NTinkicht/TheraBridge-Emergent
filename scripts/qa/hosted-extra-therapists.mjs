// Private synthetic therapist login checks. No credentials, cookies or page data are logged.
import { chromium } from 'playwright';
import { BASE, settleLoginPage, logout } from './hosted-readonly.mjs';
const expected = {
  aba2: 'dalia.mansour@childrens-home.therabridge.test',
  ot2: 'nour.haddad@childrens-home.therabridge.test',
  speech2: 'huda.rahim@childrens-home.therabridge.test',
};
const fail = () => { throw Error('private_extra_therapist_identity_check_failed'); };
async function main() {
  let accounts;
  try { accounts = JSON.parse(process.env.TB_QA_EXTRA_USERS_JSON ?? ''); } catch { fail(); }
  if (!accounts || Array.isArray(accounts) || JSON.stringify(Object.keys(accounts).sort()) !== JSON.stringify(Object.keys(expected).sort())) fail();
  const all = new Set();
  for (const [key,email] of Object.entries(expected)) {
    const a = accounts[key];
    if (a?.email !== email || typeof a.password !== 'string' || a.password.length < 24 || a.password.length > 128 || all.has(a.password)) fail();
    all.add(a.password);
  }
  const browser = await chromium.launch({headless:true});
  try {
    for (const [key,email] of Object.entries(expected)) {
      const context = await browser.newContext({acceptDownloads:false});
      try {
        const page = await context.newPage();
        await page.goto(BASE+'/login',{waitUntil:'domcontentloaded',timeout:25000});
        await settleLoginPage(page);
        await page.getByTestId('login-email-input').fill(email);
        await page.getByTestId('login-password-input').fill(accounts[key].password);
        const [response] = await Promise.all([
          page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/login' && r.request().method()==='POST',{timeout:20000}),
          page.getByTestId('login-submit-button').click(),
        ]);
        if (response.status()!==200) fail();
        await page.waitForURL(u=>u.pathname==='/app'||u.pathname==='/select-context'||u.pathname.startsWith('/app/'),{timeout:20000});
        const identity = await context.request.get(BASE+'/api/auth/session');
        if (!identity.ok()) fail();
        const session = await identity.json();
        if (session.user?.email?.toLowerCase()!==email) fail();
        const contexts=(session.contexts??[]).filter(x=>x.role==='THERAPIST');
        if (contexts.length!==1 || (session.contexts??[]).some(x=>x.role!=='THERAPIST')) fail();
        if (session.activeContext?.role!=='THERAPIST') {
          const switchContext = await context.request.post(BASE+'/api/auth/context',{
            headers:{Origin:BASE,'X-CSRF-Token':session.csrfToken},
            data:{membershipId:contexts[0].membershipId,role:'THERAPIST'},
          });
          if (!switchContext.ok()) fail();
        }
        const selected=await context.request.get(BASE+'/api/auth/session');
        if (!selected.ok() || (await selected.json()).activeContext?.role!=='THERAPIST') fail();
        if (!await logout(context)) fail();
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log('PASS: 3 distinct synthetic therapist logins, therapist-only context and logout; no clinical mutation');
}
main().catch(()=>{console.error('FAIL: private extra synthetic therapist verification');process.exitCode=1;});
