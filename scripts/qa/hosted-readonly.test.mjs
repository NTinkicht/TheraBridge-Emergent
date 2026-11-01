import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE,WIDTHS,ROLES,caseId,validateTarget,inspectCookieJar,inspectSetCookie,
 inspectGeometry,statusForPages,blocked,authFailureCode,settleLoginPage,run} from './hosted-readonly.mjs';
const jar={name:'__Host-tb_session',value:'SECRET_NEVER_EXPORT',secure:true,httpOnly:true,
 sameSite:'Lax',path:'/',domain:'therabridge-ahmed-synthetic-demo.onrender.com'};
const header='__Host-tb_session=SECRET_NEVER_EXPORT; Path=/; HttpOnly; SameSite=Lax; Secure';
test('auth diagnostics classify stages without exposing identity or credentials',()=>{
 const cases=[
  ['submit',401,'login_http_401'],['submit',429,'login_http_429'],
  ['submit',500,'login_http_other'],['submit',null,'login_response_unverified'],
  ['form',null,'login_form_unavailable'],['redirect',200,'login_redirect_unverified'],
  ['context',200,'authorized_context_unverified'],
  ['shell',200,'authenticated_shell_unavailable'],
  ['identity',200,'session_identity_unverified']
 ];
 for(const [stage,status,expected] of cases){
  const code=authFailureCode(stage,status);
  assert.equal(code,expected);
  assert.equal(/[@ ]/.test(code),false);
 }
});
test('secret-free request stage diagnostics distinguish pre-login and login failures',()=>{
 const cases=[
  [{csrfHttpStatus:503},'csrf_http_error'],
  [{csrfRequestFailed:true},'csrf_network_error'],
  [{loginRequestFailed:true},'login_network_error'],
  [{loginRequestSeen:true},'login_response_timeout'],
  [{clientPageError:true},'client_runtime_error'],
  [{csrfHttpStatus:200},'login_not_dispatched_after_csrf'],
  [{loginRequestSeen:false},'login_request_not_dispatched']
 ];
 for(const [signals,code] of cases){
  assert.equal(authFailureCode('submit',null,signals),code);
  assert.equal(/[@ ]/.test(code),false);
 }
 assert.equal(authFailureCode('submit',401,{csrfHttpStatus:200}),'login_http_401');
});
test('login readiness requires React submit handler observation, not a fixed sleep',async()=>{
 let checked=false;
 await settleLoginPage({waitForFunction:async (predicate,arg,options)=>{
  assert.equal(typeof predicate,'function');assert.equal(arg,undefined);
  assert.deepEqual(options,{timeout:20000});checked=true;
 }});
 assert.equal(checked,true);
 await assert.rejects(settleLoginPage({waitForFunction:async()=>{throw Error('fixture_timeout');}}));
 await assert.rejects(settleLoginPage({waitForLoadState:async()=>{}}));
 await settleLoginPage({}); // legacy offline page fixture, no browser wait API
});
test('collector reports real browser-event signals without leaking error payloads',async()=>{
 const {mkdtemp,rm,writeFile,readFile}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const scenarios=[
  ['csrf_failure','csrf_http_error'],['csrf_network','csrf_network_error'],
  ['login_network','login_network_error'],['login_timeout','login_response_timeout'],
  ['client_error','client_runtime_error'],['no_request','login_request_not_dispatched']
 ];
 for(const [scenario,expected] of scenarios){
  const dir=await mkdtemp(join(tmpdir(),'tb-qa-events-'));
  try{
   const file=join(dir,'users.json');
   await writeFile(file,JSON.stringify({platform:{email:'fixture@example.invalid',password:'ci_only_mock'}}),{mode:0o600});
   const handlers={};
   const request=(path,method='GET')=>({url:()=>BASE+path,method:()=>method});
   const page={
    on:(name,cb)=>{handlers[name]=cb;},
    goto:async()=>({status:()=>200}),
    waitForFunction:async()=>true,
    getByTestId:()=>({fill:async()=>{},click:async()=>{
     if(scenario==='csrf_failure')handlers.response?.({...request('/api/auth/csrf'),status:()=>503});
     if(scenario==='csrf_network')handlers.requestfailed?.(request('/api/auth/csrf'));
     if(scenario==='login_network')handlers.requestfailed?.(request('/api/auth/login','POST'));
     if(scenario==='login_timeout')handlers.request?.(request('/api/auth/login','POST'));
     if(scenario==='client_error')handlers.pageerror?.(Error('NEVER_EXPORT_CLIENT_ERROR'));
    }}),
    waitForResponse:async()=>{throw Error('NEVER_EXPORT_RESPONSE_ERROR');}
   };
   const context={newPage:async()=>page,close:async()=>{},
    request:{get:async()=>({ok:()=>false}),post:async()=>({status:()=>204})}};
   await run({credentialsFile:file,output:join(dir,'out'),
    launchBrowser:async()=>({newContext:async()=>context,close:async()=>{}})});
   const report=JSON.parse(await readFile(join(dir,'out','hosted-readonly-results.json'),'utf8'));
   assert.equal(report.rows.find(row=>row.id==='N-052').diagnostic,expected);
   assert.equal(JSON.stringify(report).includes('NEVER_EXPORT'),false);
  }finally{await rm(dir,{recursive:true,force:true});}
 }
});
test('42 unique IDs N-052..N-093',()=>{
 const ids=Object.keys(ROLES).flatMap(r=>[...WIDTHS.map((_,i)=>caseId(ROLES[r].start+i)),caseId(ROLES[r].cookie)]);
 assert.equal(ids.length,42);assert.deepEqual(new Set(ids),new Set(Array.from({length:42},(_,i)=>caseId(i+52))));
});
test('strict approved HTTPS target',()=>{
 assert.equal(validateTarget(BASE),true);
 assert.equal(validateTarget(BASE+'/app'),false);
 assert.equal(validateTarget('http://therabridge-ahmed-synthetic-demo.onrender.com'),false);
 assert.equal(validateTarget('https://example.com'),false);
});
test('cookie attributes; no secret exported',()=>{
 const a=inspectCookieJar([jar]);assert.equal(a.ok,true);assert.equal(JSON.stringify(a).includes('SECRET'),false);
 assert.equal(inspectCookieJar([{...jar,secure:false}]).ok,false);
 assert.equal(inspectCookieJar([{...jar,domain:'.therabridge-ahmed-synthetic-demo.onrender.com'}]).ok,false);
 const b=inspectSetCookie([header]);assert.equal(b.ok,true);assert.equal(JSON.stringify(b).includes('SECRET'),false);
 assert.equal(inspectSetCookie([header+'; Domain=example.com']).ok,false);
 assert.equal(inspectSetCookie([header.replace('HttpOnly','')]).ok,false);
});
test('viewport regression detector',()=>{
 const d={viewport:320,documentWidth:320,mainVisible:true,mainLeft:0,mainRight:320,
 headerVisible:true,navigationVisible:true};
 assert.deepEqual(inspectGeometry(d,320),[]);
 assert.deepEqual(inspectGeometry({...d,documentWidth:500},320),['document_overflow']);
 assert.deepEqual(inspectGeometry({...d,navigationVisible:false},320),['navigation_missing']);
});
test('geometry alone cannot establish complete dialog/visual acceptance',()=>{
 assert.equal(statusForPages([{outcome:'PASS'}],false),'BLOCKED');
 assert.equal(statusForPages([{outcome:'FAIL'}],false),'FAIL');
 assert.equal(statusForPages([{outcome:'FAIL'},{outcome:'BLOCKED'}],false),'FAIL');
 assert.equal(statusForPages([{outcome:'BLOCKED'}],false),'BLOCKED');
});
test('no credentials -> strictly blocked case IDs',()=>{
 const r=blocked('guardian','missing');assert.equal(r.length,6);assert.equal(r[5].id,'N-093');
 assert.ok(r.every(c=>c.status==='BLOCKED'));
});
test('offline execution emits complete blocked ledger, no fake PASS',async()=>{
 const {mkdtemp,rm,readFile}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'tb-em-025-'));
 try{
  assert.equal(await run({credentialsFile:null,output:dir}),1);
  const j=JSON.parse(await readFile(join(dir,'hosted-readonly-results.json'),'utf8'));
  assert.deepEqual(j.counts,{PASS:0,FAIL:0,BLOCKED:42});assert.equal(j.rows.length,42);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('unavailable Playwright/Chromium emits blocked evidence, never exits without a ledger',async()=>{
 const {mkdtemp,rm,readFile,writeFile,chmod}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'tb-em-025-launch-'));
 try{
  const users=join(dir,'users.json');
  await writeFile(users,JSON.stringify({platform:{email:'fictional@example.invalid',password:'ci_only_password_fixture'}}),{mode:0o600});
  await chmod(users,0o600);
  // The offline-contracts job intentionally does not install Playwright.
  // Any runtime without a working Chromium must report 42 BLOCKED.
  const r=await run({credentialsFile:users,output:join(dir,'evidence'),
   launchBrowser:async()=>{throw new Error('OFFLINE_BROWSER_UNAVAILABLE_FIXTURE');}});
  assert.equal(r,1);
  const d=JSON.parse(await readFile(join(dir,'evidence','hosted-readonly-results.json'),'utf8'));
  assert.deepEqual(d.counts,{PASS:0,FAIL:0,BLOCKED:42});
  assert.equal(d.rows.length,42);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('session logout uses approved-origin context requests even without a usable page',async()=>{
 const seen=[];
 const context={request:{
  get:async url=>{seen.push({method:'GET',url});return {ok:()=>true,json:async()=>({csrfToken:'ci_only_csrf_fixture'})};},
  post:async (url,opts)=>{seen.push({method:'POST',url,origin:opts.headers.Origin,
    tokenPresent:opts.headers['X-CSRF-Token']==='ci_only_csrf_fixture'});return {status:()=>204};}
 }};
 const {logout}=await import('./hosted-readonly.mjs');
 assert.equal(await logout(context),true);
 assert.deepEqual(seen.map(s=>s.url),[BASE+'/api/auth/session',BASE+'/api/auth/logout']);
 assert.equal(seen[1].origin,BASE);
 assert.equal(seen[1].tokenPresent,true);
});
test('partial cookie FAIL survives later viewport crash and keeps confirmed cleanup',async()=>{
 const {mkdtemp,rm,writeFile,readFile,chmod}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const path=await mkdtemp(join(tmpdir(),'tb-qa-crash-'));
 try{
  const file=join(path,'users.json');
  await writeFile(file,JSON.stringify({platform:{email:'fixture@example.invalid',password:'ci_only_fixture'}}),{mode:0o600});
  await chmod(file,0o600);
  const context={
   request:{get:async()=>({ok:()=>true,json:async()=>({csrfToken:'ci_only_fixture'})}),
     post:async()=>({status:()=>204})},
   cookies:async()=>[{name:'__Host-tb_session',secure:false,httpOnly:true,sameSite:'Lax',path:'/',
      domain:'therabridge-ahmed-synthetic-demo.onrender.com'}],
   newPage:async()=>({
     goto:async()=>({status:()=>200}),
     getByTestId:()=>({fill:async()=>{},click:async()=>{},waitFor:async()=>{}}),
     waitForResponse:async()=>({status:()=>200,headerValues:async()=>[
       '__Host-tb_session=ci_only_fixture; Path=/; HttpOnly; SameSite=Lax; Secure']}),
     waitForURL:async()=>{},
     evaluate:async()=>true,
     setViewportSize:async()=>{throw Error('SIMULATED_VIEWPORT_CRASH');}
   }),
   close:async()=>{}
  };
  // Simulate transport teardown rejection after a real per-role failure.
  const mockBrowser={newContext:async()=>context,close:async()=>{throw Error('SIMULATED_CLOSE_FAILURE');}};
  const result=await run({credentialsFile:file,output:join(path,'out'),launchBrowser:async()=>mockBrowser});
  assert.equal(result,1);
  const ledger=JSON.parse(await readFile(join(path,'out','hosted-readonly-results.json'),'utf8'));
  assert.equal(ledger.rows.length,42);
  assert.equal(ledger.rows.find(x=>x.id==='N-087').status,'FAIL');
  assert.equal(ledger.rows.find(x=>x.id==='N-087').sessionCleanup,'CONFIRMED');
  assert.equal(ledger.rows.find(x=>x.id==='N-052').status,'BLOCKED');
  assert.equal(ledger.counts.FAIL,1);
 }finally{await rm(path,{recursive:true,force:true});}
});
test('unfinished N-cases are filled without erasing previous findings',async()=>{
 const {missingBlockedRows}=await import('./hosted-readonly.mjs');
 const previous=[{id:'N-087',role:'platform',status:'FAIL',sessionCleanup:'UNCONFIRMED'}];
 const missing=missingBlockedRows('platform',previous,'synthetic_crash');
 assert.equal(missing.length,5);
 assert.ok(missing.every(r=>r.status==='BLOCKED'));
 assert.equal(previous[0].status,'FAIL');
});

test('screenshot failure preserves earlier confirmed overflow (no real network)',async()=>{
 const {mkdtemp,rm,writeFile,chmod,readFile}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const path=await mkdtemp(join(tmpdir(),'tb-qa-screenshot-'));
 try{
  const file=join(path,'users.json');
  await writeFile(file,JSON.stringify({platform:{email:'fixture@example.invalid',password:'ci_only_mock'}}),{mode:0o600});
  await chmod(file,0o600);
  let width=1440;
  let activeUrl=BASE+'/login';
  const page={
   goto:async url=>{activeUrl=url;return {status:()=>200};},
   url:()=>activeUrl,
   getByTestId:()=>({fill:async()=>{},click:async()=>{},waitFor:async()=>{}}),
   waitForResponse:async()=>({status:()=>200,headerValues:async()=>[
    '__Host-tb_session=ci_only_fixture; Path=/; HttpOnly; SameSite=Lax; Secure']}),
   waitForURL:async()=>{},
   evaluate:async (fn,arg)=>{
    if(Array.isArray(arg))return true;
    if(fn.toString().includes('document.documentElement.scrollWidth'))return {
      viewport:width,documentWidth:width===320?500:width,mainVisible:true,mainLeft:0,
      mainRight:width,headerVisible:true,navigationVisible:true};
    return true;
   },
   setViewportSize:async v=>{width=v.width;},
   waitForTimeout:async()=>{},
   keyboard:{press:async()=>{}},
   screenshot:async()=>{throw Error('MOCK_SCREENSHOT_FAILURE');}
  };
  const context={
   request:{get:async()=>({ok:()=>true,json:async()=>({csrfToken:'ci_only_fixture'})}),
     post:async()=>({status:()=>204})},
   cookies:async()=>[{name:'__Host-tb_session',secure:true,httpOnly:true,sameSite:'Lax',
     path:'/',domain:'therabridge-ahmed-synthetic-demo.onrender.com'}],
   newPage:async()=>page,close:async()=>{}
  };
  const mock={newContext:async()=>context,close:async()=>{}};
  await run({credentialsFile:file,output:join(path,'out'),launchBrowser:async()=>mock});
  const report=JSON.parse(await readFile(join(path,'out','hosted-readonly-results.json'),'utf8'));
  const row=report.rows.find(x=>x.id==='N-052');
  assert.equal(row.status,'FAIL');
  assert.ok(row.pages[0].issues.includes('document_overflow'));
  assert.ok(row.pages[0].issues.includes('screenshot_capture_unavailable'));
  assert.equal(row.sessionCleanup,'CONFIRMED');
 }finally{await rm(path,{recursive:true,force:true});}
});

test('response waiter fails before click settles without unhandled rejection or external IO',async()=>{
 const {mkdtemp,rm,readFile,writeFile,chmod}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'tb-qa-login-race-'));
 try{
  const users=join(dir,'users.json');
  await writeFile(users,JSON.stringify({platform:{email:'offline@example.invalid',password:'ci_only_mock'}}),{mode:0o600});
  await chmod(users,0o600);
  let clickFinished=false;
  const page={
   goto:async()=>({status:()=>200}),
   getByTestId:name=>({fill:async()=>{},waitFor:async()=>{},
     click:async()=>{await new Promise(r=>setTimeout(r,30));clickFinished=true;}}),
   waitForResponse:async()=>{await new Promise(r=>setTimeout(r,5));throw Error('MOCK_LOGIN_RESPONSE_TIMEOUT');},
  };
  const ctx={
   newPage:async()=>page,cookies:async()=>[],close:async()=>{},
   request:{get:async()=>({ok:()=>false})}
  };
  const browser={newContext:async()=>ctx,close:async()=>{}};
  const outcome=await run({credentialsFile:users,output:join(dir,'out'),launchBrowser:async()=>browser});
  assert.equal(outcome,1);
  await new Promise(r=>setTimeout(r,40));
  assert.equal(clickFinished,true);
  const ledger=JSON.parse(await readFile(join(dir,'out','hosted-readonly-results.json'),'utf8'));
  assert.deepEqual(ledger.counts,{PASS:0,FAIL:0,BLOCKED:42});
 }finally{await rm(dir,{recursive:true,force:true});}
});


test('HTTP 500 without ProductShell remains FAIL rather than BLOCKED',async()=>{
 const {mkdtemp,rm,readFile,writeFile,chmod}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'tb-qa-http500-'));
 try{
  const file=join(dir,'users.json');
  await writeFile(file,JSON.stringify({platform:{email:'fixture@example.invalid',password:'ci_only_mock'}}),{mode:0o600});
  await chmod(file,0o600);
  let url=BASE+'/login';
  const page={
   goto:async next=>{url=next;return {status:()=>next.endsWith('/app')?500:200};},
   url:()=>url,
   getByTestId:name=>({
    fill:async()=>{},click:async()=>{},
    waitFor:async()=>{if(name==='product-shell'&&url.endsWith('/app'))throw Error('MOCK_MISSING_SHELL');}
   }),
   waitForResponse:async()=>({status:()=>200,headerValues:async()=>[
    '__Host-tb_session=ci_only_fixture; Path=/; HttpOnly; SameSite=Lax; Secure']}),
   waitForURL:async()=>{},
   evaluate:async (_fn,arg)=>Array.isArray(arg)?true:{
    viewport:320,documentWidth:320,mainVisible:true,mainLeft:0,mainRight:320,
    headerVisible:true,navigationVisible:true
   },
   setViewportSize:async()=>{},
   waitForTimeout:async()=>{},keyboard:{press:async()=>{}},
   screenshot:async()=>Buffer.from('synthetic screenshot')
  };
  const context={
   newPage:async()=>page,close:async()=>{},
   cookies:async()=>[{name:'__Host-tb_session',secure:true,httpOnly:true,sameSite:'Lax',
    path:'/',domain:'therabridge-ahmed-synthetic-demo.onrender.com'}],
   request:{
    get:async()=>({ok:()=>true,json:async()=>({csrfToken:'ci_only_mock'})}),
    post:async()=>({status:()=>204})
   }
  };
  const code=await run({credentialsFile:file,output:join(dir,'out'),
   launchBrowser:async()=>({newContext:async()=>context,close:async()=>{}})});
  assert.equal(code,1);
  const report=JSON.parse(await readFile(join(dir,'out','hosted-readonly-results.json'),'utf8'));
  const row=report.rows.find(r=>r.id==='N-052');
  assert.equal(row.status,'FAIL');
  assert.equal(row.sessionCleanup,'CONFIRMED');
  assert.equal(row.pages.find(p=>p.route==='/app')?.outcome,'FAIL');
  assert.ok(row.pages.find(p=>p.route==='/app')?.issues.includes('http_error'));
  assert.equal(report.rows.length,42);
 }finally{await rm(dir,{recursive:true,force:true});}
});


test('invalid login Set-Cookie remains FAIL when Chromium rejects authenticated navigation',async()=>{
 const {mkdtemp,rm,writeFile,readFile,chmod}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'tb-qa-bad-cookie-'));
 try{
  const file=join(dir,'users.json');
  await writeFile(file,JSON.stringify({platform:{email:'fixture@example.invalid',password:'ci_only_mock'}}),{mode:0o600});
  await chmod(file,0o600);
  let revoked=0;
  const page={
   goto:async()=>({status:()=>200}),
   getByTestId:()=>({fill:async()=>{},click:async()=>{},waitFor:async()=>{}}),
   waitForResponse:async()=>({status:()=>200,headerValues:async()=>[
    '__Host-tb_session=ci_only_fixture; Path=/; HttpOnly; SameSite=Lax']}),
   waitForURL:async()=>{throw Error('MOCK_COOKIE_REJECTED');}
  };
  const context={
   newPage:async()=>page,close:async()=>{},
   cookies:async()=>[],
   request:{get:async()=>({ok:()=>false}),
     post:async()=>{revoked++;return {status:()=>204};}}
  };
  await run({credentialsFile:file,output:join(dir,'out'),
   launchBrowser:async()=>({newContext:async()=>context,close:async()=>{}})});
  const report=JSON.parse(await readFile(join(dir,'out','hosted-readonly-results.json'),'utf8'));
  assert.equal(report.rows.length,42);
  assert.equal(report.rows.find(r=>r.id==='N-087').status,'FAIL');
  assert.equal(report.rows.find(r=>r.id==='N-087').checks.header.secure,false);
  assert.equal(report.rows.find(r=>r.id==='N-052').status,'BLOCKED');
  assert.equal(report.rows.find(r=>r.id==='N-087').sessionCleanup,'UNCONFIRMED');
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('successful login response followed by rejected click still attempts context logout',async()=>{
 const {mkdtemp,rm,writeFile,readFile,chmod}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'tb-qa-reject-click-'));
 try{
  const file=join(dir,'users.json');
  await writeFile(file,JSON.stringify({platform:{email:'fixture@example.invalid',password:'ci_only_mock'}}),{mode:0o600});
  await chmod(file,0o600);
  let sessions=0,revocations=0;
  const page={
   goto:async()=>({status:()=>200}),
   getByTestId:name=>({fill:async()=>{},waitFor:async()=>{},
    click:async()=>{if(name==='login-submit-button')throw Error('MOCK_CLICK_CRASH');}}),
   waitForResponse:async()=>({status:()=>200,headerValues:async()=>[
    '__Host-tb_session=ci_only_fixture; Path=/; HttpOnly; SameSite=Lax; Secure']})
  };
  const context={
   newPage:async()=>page,close:async()=>{},
   request:{
    get:async()=>{sessions++;return {ok:()=>true,json:async()=>({csrfToken:'ci_only_mock'})};},
    post:async()=>{revocations++;return {status:()=>204};}
   }
  };
  await run({credentialsFile:file,output:join(dir,'out'),
   launchBrowser:async()=>({newContext:async()=>context,close:async()=>{}})});
  const report=JSON.parse(await readFile(join(dir,'out','hosted-readonly-results.json'),'utf8'));
  assert.equal(report.rows.length,42);
  assert.equal(report.rows.find(r=>r.id==='N-087').sessionCleanup,'CONFIRMED');
  assert.equal(report.rows.find(r=>r.id==='N-087').status,'BLOCKED');
  assert.equal(sessions,1);
  assert.equal(revocations,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
