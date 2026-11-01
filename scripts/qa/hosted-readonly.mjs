import {readFile,stat,mkdir,chmod,writeFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
// TB-EM-025: authenticated, read-only synthetic hosted evidence (N-052..N-093).
// Login/logout only; no changes to therapy records, appointments or policy gates.
export const BASE='https://therabridge-ahmed-synthetic-demo.onrender.com';
export const WIDTHS=[320,390,768,1024,1440];
export const ROLES={
 platform:{role:'PLATFORM_ADMIN',start:52,cookie:87,routes:['/app','/app/applications','/app/centers']},
 admin:{role:'CENTER_ADMIN',start:57,cookie:88,routes:['/app','/app/setup','/app/team','/app/children','/app/schedule']},
 coordinator:{role:'COORDINATOR',start:62,cookie:89,routes:['/app','/app/team','/app/children','/app/schedule']},
 speech:{role:'THERAPIST',start:67,cookie:90,routes:['/app','/app/clinical','/app/progress','/app/activities','/app/governance']},
 ot:{role:'THERAPIST',start:72,cookie:91,routes:['/app','/app/clinical','/app/progress','/app/activities','/app/governance']},
 supervisor:{role:'CLINICAL_SUPERVISOR',start:77,cookie:92,routes:['/app','/app/clinical','/app/progress','/app/governance']},
 guardian:{role:'GUARDIAN',start:82,cookie:93,routes:['/app','/app/activities','/app/practice','/app/family-progress']}
};
export const caseId=i=>'N-'+String(i).padStart(3,'0');
export const validateTarget=u=>{try{return new URL(u).href===new URL(BASE).href&&new URL(u).protocol==='https:';}catch{return false;}};
export function inspectCookieJar(cookies){
 const a=cookies.filter(c=>c.name==='__Host-tb_session');
 const c=a[0];
 const checks={singleSession:a.length===1,secure:c?.secure===true,httpOnly:c?.httpOnly===true,
  sameSiteLax:c?.sameSite==='Lax',pathRoot:c?.path==='/',hostScoped:c?.domain===new URL(BASE).hostname};
 return {ok:Object.values(checks).every(Boolean),checks};
}
export function inspectSetCookie(headers){
 // Parse attributes strictly inside process memory. Never serialize cookie values.
 const matches=headers.filter(h=>/^__Host-tb_session=/i.test(h.trim()));
 const a=matches.length===1?matches[0].split(';').slice(1).map(s=>s.trim().toLowerCase()):[];
 const checks={singleSession:matches.length===1,secure:a.includes('secure'),httpOnly:a.includes('httponly'),
   sameSiteLax:a.includes('samesite=lax'),pathRoot:a.includes('path=/'),noDomain:a.every(x=>!x.startsWith('domain='))};
 return {ok:Object.values(checks).every(Boolean),checks};
}
export function inspectGeometry(d,w){
 const failures=[];
 if(d.viewport!==w)failures.push('viewport_mismatch');
 if(d.documentWidth>w+3)failures.push('document_overflow');
 if(!d.mainVisible||d.mainLeft< -3||d.mainRight>w+3)failures.push('main_clipped');
 if(!d.headerVisible)failures.push('header_missing');
 if(!d.navigationVisible)failures.push('navigation_missing');
 return failures;
}
export function statusForPages(pages,visualAndDialogReview){
 if(pages.some(p=>p.outcome==='FAIL'))return 'FAIL';
 if(pages.some(p=>p.outcome==='BLOCKED'))return 'BLOCKED';
 return visualAndDialogReview&&pages.length?'PASS':'BLOCKED';
}
export function blocked(role,reason){
 const c=ROLES[role];
 return [...WIDTHS.map((width,i)=>({id:caseId(c.start+i),role,width,status:'BLOCKED',reason})),
  {id:caseId(c.cookie),role,status:'BLOCKED',reason}];
}
// Stable, secret-free authentication diagnostics. Never serialize responses,
// cookies, email addresses, URLs, tokens or error messages from the page.
export function authFailureCode(stage,loginStatus,signals={}){
 if(stage==='submit'&&loginStatus===401)return 'login_http_401';
 if(stage==='submit'&&loginStatus===429)return 'login_http_429';
 if(stage==='submit'&&typeof loginStatus==='number')return 'login_http_other';
 if(stage==='submit'&&signals.csrfHttpStatus>=400)return 'csrf_http_error';
 if(stage==='submit'&&signals.csrfRequestFailed)return 'csrf_network_error';
 if(stage==='submit'&&signals.loginRequestFailed)return 'login_network_error';
 if(stage==='submit'&&signals.loginRequestSeen)return 'login_response_timeout';
 if(stage==='submit'&&signals.clientPageError)return 'client_runtime_error';
 if(stage==='submit'&&signals.csrfHttpStatus===200)return 'login_not_dispatched_after_csrf';
 if(stage==='submit'&&signals.loginRequestSeen===false)return 'login_request_not_dispatched';
 return ({form:'login_form_unavailable',hydration:'login_hydration_unverified',submit:'login_response_unverified',
  redirect:'login_redirect_unverified',context:'authorized_context_unverified',
  shell:'authenticated_shell_unavailable',identity:'session_identity_unverified'})[stage]??'authentication_unverified';
}
export function missingBlockedRows(role,completed,reason){
 const seen=new Set(completed.map(r=>r.id));
 return blocked(role,reason).filter(r=>!seen.has(r.id));
}
async function metrics(page){
 return page.evaluate(()=>{
  const visible=q=>{const e=document.querySelector(q);if(!e)return false;const s=getComputedStyle(e),r=e.getBoundingClientRect();
    return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;};
  const m=document.querySelector('#main')?.getBoundingClientRect();
  return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,mainVisible:visible('#main'),
    mainLeft:m?.left??-999,mainRight:m?.right??99999,headerVisible:visible('[data-testid="product-top-bar"]'),
    navigationVisible:innerWidth<768?visible('[data-testid="mobile-nav"]'):visible('[data-testid="product-sidebar"]')};
 });
}
export async function logout(context){
 // BrowserContext.request has the same cookie jar, but is independent of a crashed
 // tab or navigation to a browser error page. Token never enters logged evidence.
 const request=context.request;
 const r=await request.get(BASE+'/api/auth/session');
 if(!r.ok())return false;
 const d=await r.json();
 const x=await request.post(BASE+'/api/auth/logout',
  {headers:{Origin:BASE,'X-CSRF-Token':d.csrfToken}});
 return x.status()===204;
}
export async function settleLoginPage(page){
 // Next.js server HTML may precede React hydration. Confirm the actual
 // React onSubmit prop before filling any sensitive inputs; fail closed.
 if(typeof page.waitForFunction!=='function'){
  if(typeof page.waitForLoadState==='function')throw Error('hydration_probe_unavailable');
  return; // Legacy offline fixtures without browser APIs.
 }
 await page.waitForFunction(()=>{
  const form=document.querySelector('[data-testid="login-form"]');
  if(!form)return false;
  return Object.keys(form).some(key=>key.startsWith('__reactProps'+String.fromCharCode(36))&&
   typeof form[key]?.onSubmit==='function');
 },undefined,{timeout:20000});
}
async function assess(browser,role,user,directory){
 const c=ROLES[role],rows=[];
 const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:false,deviceScaleFactor:1});
 const page=await context.newPage();
 let loggedIn=false,loginAttempted=false;
 let authStage='form',loginHttpStatus=null;
 // Fixed numeric statuses and booleans only; no raw URLs, bodies or errors.
 const signals={csrfHttpStatus:null,csrfRequestFailed:false,loginRequestSeen:false,
  loginRequestFailed:false,clientPageError:false};
 const routeOf=r=>{try{return new URL(r.url()).pathname;}catch{return '';}};
 page.on?.('request',r=>{if(r.method()==='POST'&&routeOf(r)==='/api/auth/login')signals.loginRequestSeen=true;});
 page.on?.('requestfailed',r=>{
  if(routeOf(r)==='/api/auth/csrf')signals.csrfRequestFailed=true;
  if(r.method()==='POST'&&routeOf(r)==='/api/auth/login')signals.loginRequestFailed=true;
 });
 page.on?.('response',r=>{if(routeOf(r)==='/api/auth/csrf')signals.csrfHttpStatus=r.status();});
 page.on?.('pageerror',()=>{signals.clientPageError=true;});
 try{
  let loginResponse,headerInspection=null;
  try{
   await page.goto(BASE+'/login',{waitUntil:'domcontentloaded',timeout:25000});
   authStage='hydration';
   await settleLoginPage(page);
   authStage='form';
   await page.getByTestId('login-email-input').fill(user.email);
   await page.getByTestId('login-password-input').fill(user.password);
   // Attach handlers to both operations immediately; preserve a successful
   // login response even if the button click later rejects.
   loginAttempted=true;
   authStage='submit';
   const [reply,clicked]=await Promise.allSettled([
    page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/login'&&r.request().method()==='POST',{timeout:20000}),
    page.getByTestId('login-submit-button').click()
   ]);
   if(reply.status==='fulfilled'){
    loginResponse=reply.value;
    loginHttpStatus=loginResponse.status();
    if(loginResponse.status()===200){
     loggedIn=true;
     // A bad __Host- cookie may be rejected by Chromium, so inspect its
     // response attributes BEFORE requiring a functioning authenticated page.
     try{headerInspection=inspectSetCookie(await loginResponse.headerValues('set-cookie'));}
     catch{/* attributes unavailable: keep the cookie assertion BLOCKED */}
     if(headerInspection&&!headerInspection.ok)rows.push({id:caseId(c.cookie),role,status:'FAIL',
      reason:'session_cookie_header_attributes_mismatch',
      checks:{header:headerInspection.checks}});
    }
   }
   if(clicked.status==='rejected'||reply.status==='rejected'||!loggedIn)
    throw Error('login_not_confirmed');
   // Wait for client-side Next.js redirect before deciding whether context selection is needed.
   authStage='redirect';
   await page.waitForURL(u=>u.pathname==='/select-context'||u.pathname==='/app'||u.pathname.startsWith('/app/'),{timeout:20000});
   // Accounts with multiple authorized contexts legitimately land on /select-context.
   // Select only an unambiguous, already-authorized role; never bypass permissions.
   if(page.url?.().includes('/select-context')){
    authStage='context';
    const selected=await page.evaluate(async ([email,expected])=>{
     const response=await fetch('/api/auth/session',{credentials:'include'});
     if(!response.ok)return false;
     const session=await response.json();
     if(session.user?.email?.toLowerCase()!==email.toLowerCase())return false;
     const matches=(session.contexts??[]).filter(ctx=>ctx.role===expected);
     if(matches.length!==1)return false;
     const context=matches[0];
     const choice=context.type==='platform'?{platform:true}:{membershipId:context.membershipId,role:expected};
     const change=await fetch('/api/auth/context',{method:'POST',credentials:'include',
      headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken},
      body:JSON.stringify(choice)});
     return change.ok;
    },[user.email,c.role]);
    if(!selected)throw Error('authorized_context_not_unique_or_unavailable');
    await page.goto(BASE+'/app',{waitUntil:'domcontentloaded',timeout:25000});
   }
   await page.waitForURL(u=>u.pathname==='/app'||u.pathname.startsWith('/app/'),{timeout:20000});
   authStage='shell';
   await page.getByTestId('product-shell').waitFor({timeout:15000});
   authStage='identity';
   const valid=await page.evaluate(async ([email,expected])=>{
     const r=await fetch('/api/auth/session',{credentials:'include'});if(!r.ok)return false;
     const s=await r.json();return s.activeContext?.role===expected&&s.user?.email?.toLowerCase()===email.toLowerCase();
   },[user.email,c.role]);
   if(!valid)throw Error('identity_mismatch');
  }catch{
   // Cookie FAIL survives invalid browser session and navigation failure.
   const code=authFailureCode(authStage,loginHttpStatus,signals);
   rows.push(...missingBlockedRows(role,rows,'authentication_or_identity_unverified')
    .map(row=>({...row,diagnostic:code})));
   return rows;
  }
  if(!rows.some(r=>r.id===caseId(c.cookie))){
   try{
    const h=headerInspection??inspectSetCookie(await loginResponse.headerValues('set-cookie'));
    const j=inspectCookieJar(await context.cookies(BASE));
    rows.push({id:caseId(c.cookie),role,status:h.ok&&j.ok?'PASS':'FAIL',
      reason:h.ok&&j.ok?'validated_header_and_browser_attributes':'session_cookie_attributes_mismatch',
      checks:{header:h.checks,browser:j.checks}});
   }catch{rows.push({id:caseId(c.cookie),role,status:'BLOCKED',reason:'cookie_api_unavailable'});}
  }
  for(const [i,width] of WIDTHS.entries()){
   await page.setViewportSize({width,height:900});
   const pages=[];
   for(const route of c.routes){
    const issues=[];
    let g=null;
    try{
     const response=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:25000});
     // Record transport failures BEFORE waiting for a shell that cannot exist on a 500/404.
     // Keep the confirmed failure even when DOM checks and screenshots are unavailable.
     if(response?.status()!==200)issues.push('http_error');
     await page.getByTestId('product-shell').waitFor({timeout:15000});
     await page.waitForTimeout(600);
     g=await metrics(page);
     issues.push(...inspectGeometry(g,width));
     if(new URL(page.url()).pathname!==route)issues.push('unexpected_redirect');
     await page.keyboard.press('Tab');
     const focused=await page.evaluate(()=>document.activeElement!==document.body&&
       !!document.activeElement?.matches(':focus-visible'));
     if(!focused)issues.push('keyboard_focus_probe_failed');
     const filename=caseId(c.start+i)+'-'+role+'-'+width+'-'+route.replaceAll('/','_')+'.png';
     let pixels;
     try{pixels=await page.screenshot({path:join(directory,filename),fullPage:true,timeout:20000});}
     catch{
      // Missing screenshot is BLOCKED only if no defect was independently detected.
      pages.push({route,outcome:issues.length?'FAIL':'BLOCKED',
       issues:[...issues,'screenshot_capture_unavailable'],geometry:g});
      continue;
     }
     pages.push({route,outcome:issues.length?'FAIL':'PASS',issues,geometry:g,
       screenshotPrivate:filename,screenshotHash:createHash('sha256').update(pixels).digest('hex')});
    }catch{
     pages.push({route,outcome:issues.length?'FAIL':'BLOCKED',
       issues:issues.length?[...issues,'browser_operation_incomplete']:['browser_navigation_unavailable'],geometry:g});
    }
   }
   const status=statusForPages(pages,false); // never claim full visual/dialog coverage automatically
   rows.push({id:caseId(c.start+i),role,width,status,
     reason:status==='BLOCKED'&&pages.every(p=>p.outcome==='PASS')?
       'geometry_ok_dialog_and_visual_review_pending':
       status==='BLOCKED'?'browser_navigation_incomplete':'confirmed_ui_or_navigation_problem',pages});
  }
 }catch{
  // Never replace an earlier FAIL (e.g. bad cookie attributes) with BLOCKED.
  rows.push(...missingBlockedRows(role,rows,'role_browser_execution_incomplete'));
 }finally{
  // Preserve an explicit cleanup receipt even when the final page crashed.
  let cleanup='NOT_AUTHENTICATED';
  // A click/response timing failure does not prove the server failed to
  // create a session. Attempt revocation for every submitted login.
  if(loggedIn||loginAttempted){
   try{cleanup=await logout(context)?'CONFIRMED':'UNCONFIRMED';}
   catch{cleanup='UNCONFIRMED';}
   if(cleanup==='UNCONFIRMED')console.error('WARNING: session cleanup unavailable for '+role);
  }
  for(const row of rows)row.sessionCleanup=cleanup;
  try{await context.close();}catch{/* keep completed evidence */}
 }
 return rows;
}
export async function run({credentialsFile=process.env.QA_USERS_FILE,output=process.env.QA_PRIVATE_OUTPUT,
 deploymentSha=process.env.QA_DEPLOY_SHA,launchBrowser}={}){
 if(!validateTarget(BASE))throw Error('unsafe_target');
 const out=resolve(output||join(homedir(),'.local','share','therabridge-private-qa'));
 await mkdir(out,{recursive:true,mode:0o700});
 if(process.platform!=='win32')await chmod(out,0o700);
 let users={};
 if(credentialsFile){
  const f=await stat(credentialsFile);
  if(!f.isFile()||(process.platform!=='win32'&&(f.mode&0o077)!==0))throw Error('unsafe_credential_permissions');
  users=JSON.parse(await readFile(credentialsFile,'utf8'));
 }
 const rows=[];
 const ready=Object.keys(ROLES).filter(r=>users?.[r]?.email&&users?.[r]?.password);
 if(ready.length){
  let browser;
  try{
   if(launchBrowser)browser=await launchBrowser();
   else{const {chromium}=await import('playwright');browser=await chromium.launch();}
  }catch{ /* unavailable executable or module: record blocked, never fabricate PASS */ }
  if(!browser){
   for(const role of Object.keys(ROLES))rows.push(...blocked(role,
     ready.includes(role)?'chromium_unavailable':'private_credentials_missing'));
  }else{
   try{
    for(const role of Object.keys(ROLES)){
     if(!ready.includes(role))rows.push(...blocked(role,'private_credentials_missing'));
     else try{rows.push(...await assess(browser,role,users[role],out));}
     catch{rows.push(...blocked(role,'role_browser_execution_incomplete'));}
    }
   }finally{
    // Browser teardown may reject after a crash. Do not discard completed rows.
    try{await browser.close();}catch{/* persist already collected evidence */}
   }
  }
 }else for(const role of Object.keys(ROLES))rows.push(...blocked(role,'private_credentials_missing'));
 rows.sort((a,b)=>Number(a.id.slice(2))-Number(b.id.slice(2)));
 const counts=Object.fromEntries(['PASS','FAIL','BLOCKED'].map(k=>[k,rows.filter(x=>x.status===k).length]));
 const report={schema:1,target:BASE,scope:'N-052..N-093 only',baseline104Unchanged:true,
  generatedAt:new Date().toISOString(),claimedDeploymentSha:/^[a-f0-9]{40}$/.test(deploymentSha||'')?deploymentSha:null,
  deploymentIndependentlyVerified:false,counts,rows,
  caution:'No automatic updates to issue #61. Only fictional hosted data is allowed. Manual dialog/visual checks required.'};
 const path=join(out,'hosted-readonly-results.json');
 await writeFile(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 // Non-sensitive one-line summary. Only the restricted synthetic report artifact contains screenshots.
 console.log('QA_PUBLIC_SUMMARY '+JSON.stringify({counts,
  roleDiagnostics:Object.fromEntries(Object.keys(ROLES).map(role=>[role,
   [...new Set(rows.filter(r=>r.role===role&&r.diagnostic).map(r=>r.diagnostic))]])),
  blockedReasons:Object.fromEntries(
  [...new Set(rows.filter(r=>r.status==='BLOCKED').map(r=>r.reason))].map(reason=>
   [reason,rows.filter(r=>r.status==='BLOCKED'&&r.reason===reason).length]))}));

 console.log(JSON.stringify({report:path,counts,total:rows.length}));
 return counts.FAIL===0&&counts.BLOCKED===0?0:1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 run().then(code=>process.exitCode=code).catch(()=>{console.error('QA precondition failed; no credentials printed');process.exitCode=2;});
}
