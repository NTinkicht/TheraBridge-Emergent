// M2-H07 #114: actual two-session browser-to-API-to-PostgreSQL handover
// readiness synchronization. CI-only, isolated synthetic database, no mocks.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { chromium } from 'playwright';

const base = process.env.DEMO_WEB_ORIGIN ?? 'http://127.0.0.1:3000';
const dbUrl = new URL(process.env.DATABASE_URL ?? '');
if (process.env.DEPLOYMENT_ENV !== 'ci' || process.env.HANDOVER_DEMO !== 'true' ||
    new URL(base).hostname !== '127.0.0.1' ||
    !['127.0.0.1', 'localhost'].includes(dbUrl.hostname) ||
    !dbUrl.pathname.endsWith('_demo_test')) throw new Error('Synthetic handover browser QA requires isolated loopback CI');
const creds = process.env.DEMO_PASSWORDS_JSON
  ? Object.entries(JSON.parse(process.env.DEMO_PASSWORDS_JSON)).map(([email,password])=>({email,password}))
  : JSON.parse(readFileSync('.workspace/local-credentials/childrens-home-demo.json','utf8')).accounts;
const db = new PrismaClient();
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const contexts = [];
async function login(email) {
  const account = creds.find(x=>x.email===email);
  assert(account, 'Synthetic role account missing');
  const context = await browser.newContext({ viewport: { width: 390, height: 850 } });
  contexts.push(context);
  const page = await context.newPage();
  await page.goto(base + '/login');
  await page.getByTestId('login-email-input').fill(account.email);
  await page.getByTestId('login-password-input').fill(account.password);
  await page.getByTestId('login-submit-button').click();
  await page.waitForURL(/\/app(?:\/|$)/);
  const session = await page.evaluate(async () => (await fetch('/api/auth/session')).json());
  return { page, session };
}
async function write(page, session, path, method, body) {
  return page.evaluate(async ({path,method,body,csrf}) => {
    const r = await fetch(path, { method, credentials:'include',
      headers: {'Content-Type':'application/json','X-CSRF-Token':csrf}, body:JSON.stringify(body) });
    return {status:r.status,data:await r.json().catch(()=>null)};
  }, {path,method,body,csrf:session.csrfToken});
}
try {
  const center = await db.center.findUniqueOrThrow({ where:{slug:'childrens-home-demo'} });
  const child = await db.child.findFirstOrThrow({where:{centerId:center.id,firstName:'Yusuf',lastName:'Ahmed'}});
  const staff = await db.membership.findMany({ where:{centerId:center.id,status:'ACTIVE',
    roles:{some:{role:'THERAPIST'}} },include:{user:true} });
  const source = staff.find(m=>m.user.email==='speech@childrens-home.therabridge.test');
  const target = staff.find(m=>m.user.email==='ot@childrens-home.therabridge.test');
  assert(source && target, 'Missing seeded speech and OT therapist');
  const originalSpecialties = target.specialties;
  // The synthetic OT therapist is temporarily eligible for speech. Restore
  // before exit; this does not create a clinical assignment.
  await db.membership.update({where:{id:target.id},
    data:{specialties:[...new Set([...originalSpecialties,'speech'])]}});
  try {
    const manager = await login('coordinator@childrens-home.therabridge.test');
    const incoming = await login('ot@childrens-home.therabridge.test');
    const otherManager = await login('admin@childrens-home.therabridge.test');
    const route = '/api/centers/'+center.id+'/governance/handover-proposals';
    const body = {childId:child.id,fromMembershipId:source.id,toMembershipId:target.id,
      service:'speech',reasonCode:'STAFF_CHANGE'};
    const sourceAssignment = await db.careAssignment.findFirstOrThrow({where:{
      centerId:center.id,childId:child.id,membershipId:source.id,service:'speech',endedAt:null}});
    assert(sourceAssignment);
    const first = await write(manager.page, manager.session, route, 'POST', body);
    assert.equal(first.status,201,JSON.stringify(first.data));
    await manager.page.goto(base+'/app/children/'+child.id);
    const panel=manager.page.getByTestId('handover-manager');
    await panel.waitFor();
    await panel.getByTestId('handover-row-'+first.data.id).waitFor();
    assert((await panel.innerText()).includes('No clinical information or assignment changed'));
    await incoming.page.goto(base+'/app/practice-feedback');
    const inbox=incoming.page.getByTestId('handover-inbox');
    await inbox.waitFor();
    await inbox.getByTestId('handover-acknowledge').first().click();
    await inbox.getByText(/acknowledged/i).first().waitFor();
    await panel.getByTestId('handover-row-'+first.data.id).getByRole('button',{name:'Check readiness'}).click();
    await panel.getByTestId('handover-readiness').waitFor();
    assert.equal(await panel.getByTestId('handover-row-'+first.data.id).getAttribute('data-status'),'ACKNOWLEDGED');
    assert((await panel.innerText()).includes('Transfer remains blocked'));
    const firstSnapshot = await db.caseloadTransferDraft.findUniqueOrThrow({where:{id:first.data.id}});
    assert.equal(firstSnapshot.status,'ACKNOWLEDGED');
    // Second scenario: independent manager cancels another proposal while the
    // original manager has a stale pending row.
    const second = await write(manager.page, manager.session, route,'POST',body);
    assert.equal(second.status,409,'An acknowledged open proposal must prevent duplicate');
    const cancelFirst=await write(otherManager.page,otherManager.session,route+'/'+first.data.id+'/cancel','POST',{});
    assert.equal(cancelFirst.status,201);
    const newProposal=await write(otherManager.page,otherManager.session,route,'POST',body);
    assert.equal(newProposal.status,201);
    await manager.page.reload();
    await panel.waitFor();
    const cancelSecond=await write(otherManager.page,otherManager.session,route+'/'+newProposal.data.id+'/cancel','POST',{});
    assert.equal(cancelSecond.status,201);
    const pendingRow=panel.getByTestId('handover-row-'+newProposal.data.id);
    await pendingRow.waitFor();
    // Current server status must replace stale action buttons with CANCELLED.
    await pendingRow.getByRole('button',{name:'Check readiness'}).click();
    await panel.getByTestId('handover-readiness').waitFor();
    assert.equal(await pendingRow.getAttribute('data-status'),'CANCELLED');
    assert.equal(await pendingRow.getByRole('button',{name:'Cancel proposal'}).count(),0);
    for(const width of [320,390]) {
      await manager.page.setViewportSize({width,height:850});
      assert.equal(await manager.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    assert.equal(await db.careAssignment.count({where:{centerId:center.id,childId:child.id,
      membershipId:target.id,service:'speech',endedAt:null}}),0,'Acknowledgement must not assign the incoming therapist');
    // #131 live DOM: unique control IDs and complete arrow/Home/End tab keyboard.
    const duplicates = await manager.page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]'), e => e.id);
      return ids.filter((id, i) => ids.indexOf(id) !== i);
    });
    assert.deepEqual(duplicates, [], 'Duplicate DOM control IDs');
    await manager.page.goto(base+'/app/team');
    const members=manager.page.getByTestId('team-tab-members');
    const invitations=manager.page.getByTestId('team-tab-invitations');
    await members.waitFor();
    await members.focus();
    await members.press('ArrowRight');
    assert.equal(await invitations.getAttribute('aria-selected'),'true');
    await invitations.press('Home');
    assert.equal(await members.getAttribute('aria-selected'),'true');
    await members.press('End');
    assert.equal(await invitations.getAttribute('aria-selected'),'true');
    const unauthorized = await incoming.page.evaluate(async url => {
      const response = await fetch(url); return {status:response.status,
        text:await response.text()};
    },route+'?childId='+child.id);
    assert.equal(unauthorized.status,403);
    assert(!unauthorized.text.includes(child.id));
    console.log('PASS: independent manager/therapist sessions synchronize acknowledgement and cancellation without access transfer');
  } finally {
    await db.membership.update({where:{id:target.id},data:{specialties:originalSpecialties}});
  }
} finally {
  for(const ctx of contexts) await ctx.close();
  await browser.close();
  await db.$disconnect();
}
