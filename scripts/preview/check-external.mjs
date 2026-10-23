// Run this only against the explicitly authorized TheraBridge Render preview.
// Seven real browser logins + read-only role, tenant, evidence and health checks.
// Never print passwords, headers, browser storage, credentials or auth cookies.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const expectedOrigin = 'https://therabridge-ahmed-synthetic-demo.onrender.com';
const requested = process.env.DEMO_PREVIEW_URL;
const rawPasswords = process.env.DEMO_PASSWORDS_JSON;
if (!requested || !rawPasswords) throw Error('Set DEMO_PREVIEW_URL and private DEMO_PASSWORDS_JSON.');
const url = new URL(requested);
if (url.origin !== expectedOrigin || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
  throw Error('Demo browser tests require the explicitly approved Render preview origin; refusing to send credentials elsewhere.');
}
let passwords;
try { passwords = JSON.parse(rawPasswords); } catch { throw Error('Invalid synthetic demo password JSON.'); }
const email = {
  platform: 'platform.demo@childrens-home.therabridge.test',
  admin: 'admin@childrens-home.therabridge.test',
  coordinator: 'coordinator@childrens-home.therabridge.test',
  speech: 'speech@childrens-home.therabridge.test',
  ot: 'ot@childrens-home.therabridge.test',
  supervisor: 'supervisor@childrens-home.therabridge.test',
  parent: 'mariam.ahmed@childrens-home.therabridge.test',
};
if (Object.values(email).some(e => typeof passwords[e] !== 'string')) throw Error('Missing synthetic credentials.');
const id = key => {
  const h = createHash('sha256').update('therabridge-childrens-home-ahmed-synthetic-v1:' + key).digest('hex');
  return [h.slice(0,8),h.slice(8,12),'4'+h.slice(13,16),'8'+h.slice(17,20),h.slice(20,32)].join('-');
};
const center = '/api/centers/' + id('center');
const clinical = center + '/clinical/children/' + id('child:yusuf');
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const read = (page, path) => page.evaluate(async address => {
  const r = await fetch(address, { credentials: 'include' });
  return { status: r.status, body: await r.json().catch(() => null) };
}, path);
let checked = 0;
async function visit(account, role, fn) {
  const ctx = await browser.newContext({ baseURL:expectedOrigin });
  try {
    const page = await ctx.newPage();
    await page.goto('/');
    assert.equal(new URL(page.url()).origin,expectedOrigin,'Cross-host login redirect refused');
    await page.getByTestId('login-form').waitFor({timeout:30000});
    await page.getByTestId('login-email-input').fill(email[account]);
    await page.getByTestId('login-password-input').fill(passwords[email[account]]);
    await page.getByTestId('login-submit-button').click();
    await page.waitForURL(/\/app(?:\/|$)/,{timeout:30000});
    assert.equal(new URL(page.url()).origin,expectedOrigin);
    const session = await read(page,'/api/auth/session');
    assert.equal(session.status,200);
    assert.equal(session.body.activeContext?.role,role);
    const sessions = await ctx.cookies();
    const cookie = sessions.find(x => x.name==='__Host-tb_session');
    assert(cookie?.secure,'Hosted auth must issue a secure __Host- cookie');
    await fn(page);
    const logout = await page.evaluate(async token => {
      const r=await fetch('/api/auth/logout',{method:'POST',credentials:'include',headers:{'X-CSRF-Token':token}});
      return r.status;
    },session.body.csrfToken);
    assert.equal(logout,204);
    checked++;
  } finally { await ctx.close(); }
}
try {
  const ctx = await browser.newContext({baseURL:expectedOrigin});
  const page = await ctx.newPage();
  await page.goto('/');
  assert.equal(new URL(page.url()).origin,expectedOrigin);
  await page.getByTestId('login-form').waitFor({timeout:30000});
  const health = await read(page,'/api/health');
  assert.equal(health.status,200,'External /api/health unavailable');
  assert.equal(health.body.database?.status,'up');
  assert(health.body.migrations?.applied>=16,'Prisma migrations missing');
  const disabledDiagnostics = await page.goto('/dev/feasibility');
  assert.equal(disabledDiagnostics.status(),404);
  await ctx.close();

  await visit('platform','PLATFORM_ADMIN',async page => {
    const x=await read(page,'/api/platform/centers');
    assert.equal(x.status,200);
    assert(JSON.stringify(x.body).includes("Children's Home Centre"));
  });
  await visit('admin','CENTER_ADMIN',async page => {
    const x=await read(page,center+'/children');
    assert.equal(x.status,200);
    assert(JSON.stringify(x.body).includes('Yusuf'));
    assert.notEqual((await read(page,clinical)).status,200);
  });
  await visit('coordinator','COORDINATOR',async page => {
    const from=new Date(Date.now()-31*86400000).toISOString();
    const to=new Date(Date.now()+10*86400000).toISOString();
    const x=await read(page,center+'/appointments?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to));
    assert.equal(x.status,200);
    assert(JSON.stringify(x.body).includes(id('child:yusuf')));
    assert.notEqual((await read(page,clinical)).status,200);
  });
  for (const [account,service] of [['speech','speech'],['ot','occupational']]) {
    await visit(account,'THERAPIST',async page => {
      const x=await read(page,clinical);
      assert.equal(x.status,200);
      assert.equal(x.body.notes.length,4);
      assert.equal(x.body.observations.length,8);
      assert(x.body.notes.every(n=>n.service===service));
    });
  }
  await visit('supervisor','CLINICAL_SUPERVISOR',async page => {
    assert.notEqual((await read(page,center+'/threads')).status,200);
  });
  await visit('parent','GUARDIAN',async page => {
    const x=await read(page,center+'/family');
    assert.equal(x.status,200);
    assert(JSON.stringify(x.body).includes('Yusuf'));
    assert.notEqual((await read(page,clinical)).status,200);
    const practice=await read(page,center+'/family/practice');
    assert.equal(practice.status,200);
    assert.equal(practice.body.released,false);
    assert.equal(practice.body.children.length,1);
  });
  console.log(JSON.stringify({status:'PASS',origin:expectedOrigin,rolesChecked:checked,synthetic:true,clinicalSigning:'OFF',release:'OFF'}));
} finally { await browser.close(); }
