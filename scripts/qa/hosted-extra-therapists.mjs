// M4-02 protected hosted QA: three additional synthetic clinicians.
// Never log credentials, cookies, response bodies, page content or child IDs.
import {chromium} from 'playwright';
import {writeFile,mkdir,chmod} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {BASE,settleLoginPage,logout,inspectCookieJar,validateTarget} from './hosted-readonly.mjs';
import {EXTRA_IDENTITIES,DENIED_PAIRS,validateExtraUsers,inspectTherapistContext,
 inspectAssignedChildren,inspectClinicalScope,denied,safeResult,totals} from './hosted-extra-contracts.mjs';
import {captureSessionCookie,verifyRevokedSession} from './hosted-session-guards.mjs';

const SCOPE='therabridge-childrens-home-ahmed-synthetic-v1';
const ORIGIN=new URL(BASE).origin;
const wrongCenter='00000000-0000-4000-8000-000000000001';
const syntheticChildId=(key)=>{
  const s=createHash('sha256').update(SCOPE+':child:'+key).digest('hex');
  return [s.slice(0,8),s.slice(8,12),'4'+s.slice(13,16),'8'+s.slice(17,20),s.slice(20,32)].join('-');
};
const forbiddenChildren={aba2:syntheticChildId('leen'),ot2:syntheticChildId('amina'),
 speech2:syntheticChildId('zayd')};
const signal=(rows,key,step,pass,okCode,badCode)=>rows.push(
  safeResult(key,step,pass?'PASS':'FAIL',pass?okCode:badCode));

async function exercise(browser,key,user,rows){
 const ctx=await browser.newContext({acceptDownloads:false});
 let started=false,preLogoutCookie=null;
 try {
  const page=await ctx.newPage();
  await page.goto(BASE+'/login',{waitUntil:'domcontentloaded',timeout:25000});
  await settleLoginPage(page);
  await page.getByTestId('login-email-input').fill(user.email);
  await page.getByTestId('login-password-input').fill(user.password);
  started=true;
  const [response]=await Promise.all([
    page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/login' &&
      r.request().method()==='POST',{timeout:20000}),
    page.getByTestId('login-submit-button').click(),
  ]);
  const loginOk=response.status()===200;
  signal(rows,key,'authentication',loginOk,'login_http_ok','login_http_not_ok');
  if(!loginOk)return;
  const identity=await ctx.request.get(BASE+'/api/auth/session');
  const session=identity.ok()?await identity.json():null;
  const verified=inspectTherapistContext(session,key);
  signal(rows,key,'role_context',verified,'therapist_context_ok','wrong_or_multiple_contexts');
  if(!verified)return;
  const current=session.activeContext??session.contexts[0];
  if(!session.activeContext){
    const selected=await ctx.request.post(BASE+'/api/auth/context',{
      headers:{Origin:ORIGIN,'X-CSRF-Token':session.csrfToken},
      data:{membershipId:current.membershipId,role:'THERAPIST'}
    });
    if(!selected.ok()){
      signal(rows,key,'context_selection',false,'context_selected','context_switch_failed');
      return;
    }
  }
  const selectedResponse=await ctx.request.get(BASE+'/api/auth/session');
  const selected=selectedResponse.ok()?await selectedResponse.json():null;
  const selectedOk=inspectTherapistContext(selected,key)&&
    selected.activeContext?.role==='THERAPIST';
  signal(rows,key,'context_selection',selectedOk,'context_selected','context_switch_failed');
  if(!selectedOk)return;
  const center=selected.activeContext.centerId;
  const cookies=await ctx.cookies(BASE);
  const cookie=inspectCookieJar(cookies);
  preLogoutCookie=captureSessionCookie(cookies);
  signal(rows,key,'session_cookie',cookie.ok,'secure_cookie_ok','session_cookie_contract_failed');
  const children=await ctx.request.get(BASE+'/api/centers/'+center+'/children');
  const childList=children.ok()?await children.json():null;
  const scopeOk=children.ok()&&inspectAssignedChildren(childList,key);
  signal(rows,key,'assigned_children',scopeOk,'assigned_scope_exact','assigned_scope_mismatch');
  if(!scopeOk)return;
  // Check EACH seeded child; the child-list team's specialties are not
  // evidence of the signed-in therapist's service. ClinicalService filters
  // child.services by the active membership's authorized assignment.
  let scopeOkAll=true;
  for(const item of childList.items){
    const own=await ctx.request.get(BASE+'/api/centers/'+center+'/clinical/children/'+item.id);
    if(own.status()!==200){scopeOkAll=false;break;}
    const workspace=await own.json();
    if(!inspectClinicalScope(workspace,key,item.id)){scopeOkAll=false;break;}
  }
  signal(rows,key,'own_clinical_read',scopeOkAll,
    'authorized_actor_specialty','actor_specialty_or_child_scope_failed');
  // DENIED_PAIRS names are source-derived fixture references and are deliberately
  // never emitted into QA evidence. Their UUIDs come from seed-demo.ts.
  if(!DENIED_PAIRS[key]||childList.items.some(x=>x.id===forbiddenChildren[key])){
    signal(rows,key,'cross_assignment_denial',false,'denied_unassigned_child','invalid_negative_fixture');
    return;
  }
  const other=await ctx.request.get(BASE+'/api/centers/'+center+
    '/clinical/children/'+forbiddenChildren[key]);
  signal(rows,key,'cross_assignment_denial',scopeOkAll&&denied(other.status()),
    'denied_unassigned_child','unauthorized_child_disclosed');
  // A one-centre seeded database can verify deny-by-default on a nonexistent
  // centre ID, but cannot claim a full two-tenant isolation evaluation.
  if(center===wrongCenter){
    signal(rows,key,'wrong_center_denial',false,'denied_unknown_center','invalid_center_fixture');
  }else{
    const wrong=await ctx.request.get(BASE+'/api/centers/'+wrongCenter+'/children');
    signal(rows,key,'wrong_center_denial',scopeOkAll&&denied(wrong.status()),
      'denied_unknown_center','wrong_center_route_accessible');
  }
  const sessionCheck=await ctx.request.get(BASE+'/api/auth/session');
  signal(rows,key,'session_still_valid',sessionCheck.ok(),
    'session_valid_before_logout','session_invalid_before_logout');
 }catch{
  rows.push(safeResult(key,'qa_execution','FAIL','browser_or_api_exception'));
 }finally{
  let clean=false;
  if(started){
    try{
      const done=await logout(ctx);
      // Replay the *pre-logout* cookie from an independent empty context.
      // The original context's cookie jar has been cleared by Set-Cookie.
      const staleDenied=await verifyRevokedSession(browser,preLogoutCookie);
      clean=done&&staleDenied;
    }catch{/* log only allowlisted failure */}
  }
  signal(rows,key,'session_cleanup',clean,'server_logout_and_stale_denied','logout_or_revocation_unconfirmed');
  await ctx.close().catch(()=>{});
 }
}
export async function runExtra({
 raw=process.env.TB_QA_EXTRA_USERS_JSON,
 output=process.env.TB_QA_EXTRA_OUTPUT,
 launchBrowser=()=>chromium.launch({headless:true}),
}={}){
 const rows=[];
 let resultCode=2, browser;
 try{
  if(!validateTarget(BASE)||!output)throw Error('qa_configuration_unavailable');
  const accounts=validateExtraUsers(raw??'');
  browser=await launchBrowser();
  for(const key of Object.keys(EXTRA_IDENTITIES)){
    await exercise(browser,key,accounts[key],rows);
  }
  // If an early role failure happened, never count missing checks as PASS.
  resultCode=rows.some(r=>r.status==='FAIL')?1:rows.some(r=>r.status==='BLOCKED')?2:0;
 }catch{
  rows.push({role:'all_extra',step:'preflight',status:'BLOCKED',reason:'private_preflight_unavailable'});
  resultCode=2;
 }finally{await browser?.close().catch(()=>{});}
 const report={schema:1,kind:'hosted_extra_therapists_private_readonly',
  target:ORIGIN,syntheticOnly:true,clinicalGatesUnchanged:true,
  deployedSha:process.env.TB_QA_DEPLOY_SHA??null,
  protectedRunId:process.env.GITHUB_RUN_ID??null,
  checksExpected:3,counts:totals(rows),rows};
 if(output){
  try{
   const dest=resolve(output);
   await mkdir(dest,{recursive:true,mode:0o700});
   if(process.platform!=='win32')await chmod(dest,0o700);
   await writeFile(join(dest,'hosted-extra-results.json'),JSON.stringify(report,null,2)+'\n',
     {flag:'wx',mode:0o600});
  }catch{resultCode=2;}
 }
 console.log('EXTRA_THERAPIST_QA '+JSON.stringify({counts:report.counts}));
 return resultCode;
}
if(process.argv[1]?.endsWith('/hosted-extra-therapists.mjs')){
 runExtra().then(code=>{process.exitCode=code;}).catch(()=>{
   console.error('FAIL: private extra synthetic therapist verification');process.exitCode=2;
 });
}
