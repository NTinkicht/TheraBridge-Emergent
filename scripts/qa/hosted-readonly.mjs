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
async function assess(browser,role,user,directory){
 const c=ROLES[role],rows=[];
 const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:false,deviceScaleFactor:1});
 const page=await context.newPage();
 let loggedIn=false;
 try{
  let loginResponse;
  try{
   await page.goto(BASE+'/login',{waitUntil:'domcontentloaded',timeout:25000});
   await page.getByTestId('login-email-input').fill(user.email);
   await page.getByTestId('login-password-input').fill(user.password);
   // Await waiter and click together so either can reject without an unhandled promise.
   [loginResponse]=await Promise.all([
    page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/login'&&r.request().method()==='POST',{timeout:20000}),
    page.getByTestId('login-submit-button').click()
   ]);if(loginResponse.status()!==200)throw Error('login_denied');
   loggedIn=true;
   await page.waitForURL(u=>u.pathname==='/app'||u.pathname.startsWith('/app/'),{timeout:20000});
   await page.getByTestId('product-shell').waitFor({timeout:15000});
   const valid=await page.evaluate(async ([email,expected])=>{
     const r=await fetch('/api/auth/session',{credentials:'include'});if(!r.ok)return false;
     const s=await r.json();return s.activeContext?.role===expected&&s.user?.email?.toLowerCase()===email.toLowerCase();
   },[user.email,c.role]);
   if(!valid)throw Error('identity_mismatch');
  }catch{rows.push(...blocked(role,'authentication_or_identity_unverified'));return rows;}
  try{
   const h=inspectSetCookie(await loginResponse.headerValues('set-cookie'));
   const j=inspectCookieJar(await context.cookies(BASE));
   rows.push({id:caseId(c.cookie),role,status:h.ok&&j.ok?'PASS':'FAIL',
     reason:h.ok&&j.ok?'validated_header_and_browser_attributes':'session_cookie_attributes_mismatch',
     checks:{header:h.checks,browser:j.checks}});
  }catch{rows.push({id:caseId(c.cookie),role,status:'BLOCKED',reason:'cookie_api_unavailable'});}
  for(const [i,width] of WIDTHS.entries()){
   await page.setViewportSize({width,height:900});
   const pages=[];
   for(const route of c.routes){
    const issues=[];
    let g=null;
    try{
     const response=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:25000});
     await page.getByTestId('product-shell').waitFor({timeout:15000});
     await page.waitForTimeout(600);
     g=await metrics(page);
     issues.push(...inspectGeometry(g,width));
     if(response?.status()!==200)issues.push('http_error');
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
  if(loggedIn){
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
   }finally{await browser.close();}
  }
 }else for(const role of Object.keys(ROLES))rows.push(...blocked(role,'private_credentials_missing'));
 rows.sort((a,b)=>Number(a.id.slice(2))-Number(b.id.slice(2)));
 const counts=Object.fromEntries(['PASS','FAIL','BLOCKED'].map(k=>[k,rows.filter(x=>x.status===k).length]));
 const report={schema:1,target:BASE,scope:'N-052..N-093 only',baseline104Unchanged:true,
  generatedAt:new Date().toISOString(),claimedDeploymentSha:/^[a-f0-9]{40}$/.test(deploymentSha||'')?deploymentSha:null,
  deploymentIndependentlyVerified:false,counts,rows,
  caution:'No automatic updates to issue #61; sensitive screenshots remain private. Manual dialog/visual checks required.'};
 const path=join(out,'hosted-readonly-results.json');
 await writeFile(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({report:path,counts,total:rows.length}));
 return counts.FAIL===0&&counts.BLOCKED===0?0:1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 run().then(code=>process.exitCode=code).catch(()=>{console.error('QA precondition failed; no credentials printed');process.exitCode=2;});
}