// Local synthetic acceptance only. Credentials are read from the gitignored seed output, never logged.
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.GOVERNANCE_BROWSER_ORIGIN??'https://localhost:3443';
assert.equal(process.env.DEPLOYMENT_ENV,'local');
assert(['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname));
const accounts=JSON.parse(await readFile('.workspace/local-credentials/synthetic-accounts.json','utf8')).accounts;
const prisma=new PrismaClient();
const browser=await chromium.launch({args:['--no-sandbox']});
const results=[];const errors=[];
const out='artifacts/tb-em-011';await mkdir(out,{recursive:true});
async function session(email){const context=await browser.newContext({ignoreHTTPSErrors:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));const a=accounts.find(a=>a.email===email);assert(a,'Seed account missing');await page.goto(base+'/login');await page.getByTestId('login-email-input').fill(a.email);await page.getByTestId('login-password-input').fill(a.password);await page.getByTestId('login-submit-button').click();await page.waitForURL('**/app');await page.getByTestId('product-shell').waitFor();const s=await (await context.request.get(base+'/api/auth/session')).json();return {context,page,s};}
async function send(s,path,data){const r=await s.context.request.post(base+path,{headers:{Origin:base,'X-CSRF-Token':s.s.csrfToken},data});assert(r.ok(),`${path}: ${r.status()} ${await r.text()}`);return r.json();}
async function capture(page,name){for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.equal(overflow,0,`${name} overflow at ${width}`);await page.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true});results.push({name,width,overflow});}}
try{
 const admin=await session('admin@harbor.therabridge.test');const c=admin.s.activeContext.centerId;const root=`/api/centers/${c}`;
 const therapistMember=await prisma.membership.findFirstOrThrow({where:{centerId:c,user:{emailNormalized:'leila.hassan@harbor.therabridge.test'}}});
 if(!therapistMember.specialties.includes('speech')) { const r=await admin.context.request.patch(base+root+'/staff/'+therapistMember.id,{headers:{Origin:base,'X-CSRF-Token':admin.s.csrfToken},data:{specialties:['speech']}});assert(r.ok(),await r.text()); }
 let child=await prisma.child.findFirst({where:{centerId:c,status:'ACTIVE'}});
 if(!child){const r=await send(admin,root+'/children',{firstName:'Alex',lastName:'Synthetic',dateOfBirth:'2020-01-01',services:['speech']});child=await prisma.child.findUniqueOrThrow({where:{id:r.id}});}
 if(!await prisma.careAssignment.count({where:{centerId:c,childId:child.id,membershipId:therapistMember.id,endedAt:null}}))await send(admin,`${root}/children/${child.id}/assignments`,{membershipId:therapistMember.id,service:'speech',isLead:true});
 // Local fixture: connect an already-seeded synthetic guardian; never a product enrollment path.
 const guardianUser=await prisma.user.findUniqueOrThrow({where:{emailNormalized:'sara.morgan@family.therabridge.test'}});
 if(!await prisma.guardianLink.count({where:{centerId:c,childId:child.id,userId:guardianUser.id,removedAt:null}}))await prisma.guardianLink.create({data:{centerId:c,childId:child.id,userId:guardianUser.id,displayName:'Sara Morgan (synthetic)',email:guardianUser.email,emailNorm:guardianUser.emailNormalized,relationship:'guardian',createdAt:new Date()}});
 const {seedGovernance}=await import('../../apps/api/dist/cli/seed-governance-synthetic.js');await seedGovernance(prisma);
 await admin.page.goto(base+'/app/access-review');await admin.page.getByTestId('access-governance').waitFor();await admin.page.getByText('Synthetic readiness example',{exact:false}).first().waitFor();await capture(admin.page,'access-review');
 const therapist=await session('leila.hassan@harbor.therabridge.test');
 let plan=await prisma.planVersion.findFirstOrThrow({where:{centerId:c,plan:{title:'Governance synthetic review example'}},orderBy:{number:'desc'}});
 if(['WITHDRAWN','FROZEN_INTERNAL'].includes(plan.status)){const r=await send(therapist,`${root}/clinical/plans/${plan.planId}/versions`,{});plan=await prisma.planVersion.findUniqueOrThrow({where:{id:r.id}});}
 await therapist.page.goto(base+'/app/governance');await therapist.page.getByRole('button',{name:/Governance synthetic review example/}).first().click();
 // Exercise author submission, reviewer comment/return, explicit withdrawal and frozen preview through the real UI.
 if(plan.status==='DRAFT'||plan.status==='RETURNED_FOR_REVISION'){
  await therapist.page.getByTestId('governance-reason').fill('Synthetic review requested for browser acceptance');await therapist.page.getByTestId('transition-submit').click();await therapist.page.getByTestId('transition-withdraw').waitFor();
 }
 const supervisor=await session('supervisor@harbor.therabridge.test');await supervisor.page.goto(base+'/app/governance');await supervisor.page.getByRole('button',{name:/Supervisor review queue/}).click();await supervisor.page.getByRole('button',{name:/Governance synthetic review example/}).first().click();await supervisor.page.getByTestId('governance-reason').fill('Synthetic reviewer comment: no clinical approval');await supervisor.page.getByTestId('transition-comment').click();await supervisor.page.locator('p').filter({hasText:/^Synthetic reviewer comment: no clinical approval$/}).first().waitFor();await capture(supervisor.page,'supervisor-review');
 await supervisor.page.getByTestId('governance-reason').fill('Synthetic return for revision');await supervisor.page.getByTestId('transition-return').click();await supervisor.page.getByText('No documents in this view',{exact:true}).waitFor();await supervisor.page.getByRole('button',{name:'All documents',exact:true}).click();await supervisor.page.getByRole('button',{name:/Governance synthetic review example/}).first().click();await supervisor.page.getByText('RETURNED FOR REVISION',{exact:true}).waitFor();
 await therapist.page.reload();await therapist.page.getByRole('button',{name:/Governance synthetic review example/}).first().click();await therapist.page.getByTestId('governance-reason').fill('Resubmitted synthetic review');await therapist.page.getByTestId('transition-submit').click();await therapist.page.getByTestId('transition-withdraw').waitFor();await therapist.page.getByTestId('governance-reason').fill('Explicit synthetic withdrawal preserves review version');await therapist.page.getByTestId('transition-withdraw').click();await therapist.page.getByText('WITHDRAWN',{exact:true}).waitFor();await therapist.page.getByTestId('view-frozen-preview').first().click();await therapist.page.getByTestId('preview-fingerprint').waitFor();await capture(therapist.page,'immutable-preview');
 const guardian=await session('sara.morgan@family.therabridge.test');for(const route of ['/app/governance','/app/access-review']){await guardian.page.goto(base+route);await guardian.page.getByTestId('page-forbidden').waitFor();assert.equal(await guardian.page.getByTestId('immutable-preview').count(),0);}
 for(const route of ['practice','family-progress']){await guardian.page.goto(base+'/app/'+route);await guardian.page.getByTestId('product-shell').waitFor();await capture(guardian.page,'family-'+route);}
 // New governance error/loading/empty states: controlled transport fixtures, separately labelled.
 const empty=await browser.newContext({ignoreHTTPSErrors:true,storageState:await supervisor.context.storageState()});const ep=await empty.newPage();
 let unblock;const pending=new Promise(resolve=>unblock=resolve);let mode='loading';
 await ep.route('**/governance/documents',async r=>{if(mode==='loading')await pending;if(mode==='error')await r.fulfill({status:500,json:{message:'Synthetic acceptance error'}});else await r.fulfill({json:{items:[]}});});
 await ep.goto(base+'/app/governance');await ep.locator('[aria-label="Loading"]').waitFor();results.push({name:'loading-state',passed:true});mode='error';unblock();await ep.getByText('We couldn’t load this',{exact:true}).waitFor();results.push({name:'error-state',passed:true});mode='empty';await ep.getByRole('button',{name:'Retry',exact:true}).click();await ep.getByText('No documents in this view',{exact:true}).waitFor();results.push({name:'empty-state-and-retry',passed:true});await empty.close();
 assert.deepEqual(errors,[]);await writeFile(`${out}/browser-results.json`,JSON.stringify({results,pageErrors:errors,workflow:'submit → comment → return → resubmit → explicit withdrawal → immutable preview; guardian route locks',transportFixtures:['loading, server error, retry and empty state only']},null,2));console.log(`PASS: ${results.length} browser checks; no page errors.`);
}catch(e){console.error(e.message);process.exitCode=1;}finally{await browser.close();await prisma.$disconnect();}
