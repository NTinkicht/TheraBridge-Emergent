// M4-08 final qualification: execute actual auth and family-release transport.
// Test-only synthetic values. No network, user secrets, or clinical activation.
const response=(status,body)=>({status,ok:status>=200&&status<300,json:jest.fn().mockResolvedValue(body)});
const sample=(csrfToken='fictional-csrf')=>({
  user:{id:'synthetic-operator',email:'operator@example.invalid',displayName:'Synthetic operator'},
  csrfToken,session:{idleExpiresAt:'2026-11-12T00:00:00Z',absoluteExpiresAt:'2026-11-12T12:00:00Z'},
  contexts:[],activeContext:null,permissions:[]
});
let originalFetch;
beforeAll(()=>{originalFetch=global.fetch;});
afterAll(()=>{global.fetch=originalFetch;});
beforeEach(()=>{jest.resetModules();global.fetch=jest.fn();});
const load=()=>require('../src/lib/auth');
const denied=(status=403)=>response(status,{message:'Synthetic denial'});
const calls=(path)=>global.fetch.mock.calls.filter(([p])=>p===path);
const assertSecure=(c,method)=> {
  expect(c[1]).toMatchObject({method,credentials:'include',cache:'no-store'});
};

describe('final M4-08 authentication, CSRF and failure-path execution',()=>{
  test('session refresh stores new token and never reuses token from earlier context',async()=>{
    const {authApi,rest}=load();
    global.fetch.mockImplementation(async p=>p==='/api/auth/session'?response(200,sample('new-token')):response(200,{}));
    rest.remember(sample('old-token'));
    await authApi.session();
    await rest.send('PATCH','/api/centers/center-one/synthetic',{version:2});
    const write=calls('/api/centers/center-one/synthetic')[0];
    assertSecure(write,'PATCH');
    expect(write[1].headers['X-CSRF-Token']).toBe('new-token');
  });
  test('listener is not fired by a failed login 401, but cached CSRF is discarded',async()=>{
    const {authApi,rest,onUnauthorized}=load();
    const listener=jest.fn();onUnauthorized(listener);
    rest.remember(sample('old-token'));
    global.fetch.mockResolvedValueOnce(response(200,{csrfToken:'fresh-preauth'}))
      .mockResolvedValueOnce(denied(401))
      .mockResolvedValueOnce(response(200,{}));
    await expect(authApi.login('fake@example.invalid','fictional')).rejects.toMatchObject({status:401});
    expect(calls('/api/auth/login')).toHaveLength(1);
    expect(calls('/api/auth/login')[0][1].headers['X-CSRF-Token']).toBe('fresh-preauth');
    expect(listener).not.toHaveBeenCalled();
    await expect(rest.send('POST','/api/synthetic/write',{x:1})).resolves.toEqual({});
    expect(calls('/api/synthetic/write')[0][1].headers['X-CSRF-Token']).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
  });
  test('failed pre-auth CSRF 401 does not trigger authenticated session revocation',async()=>{
    const {authApi,onUnauthorized}=load();
    const listener=jest.fn();onUnauthorized(listener);
    global.fetch.mockResolvedValue(denied(401));
    await expect(authApi.forgot('fake@example.invalid')).rejects.toMatchObject({status:401});
    expect(listener).not.toHaveBeenCalled();
    expect(calls('/api/auth/password/forgot')).toHaveLength(0);
  });
  test('concurrent preflight failure is shared, prevents both writes and can recover',async()=>{
    const {authApi}=load();
    let reject;
    global.fetch.mockImplementation(p=>p==='/api/auth/csrf'?new Promise((_,r)=>{reject=r;}):Promise.resolve(response(200,{})));
    const pair=[authApi.forgot('fake@example.invalid'),authApi.reset('fictional-reset','fictional-password')];
    expect(calls('/api/auth/csrf')).toHaveLength(1);
    reject(new Error('Synthetic network outage'));
    const settled=await Promise.allSettled(pair);
    expect(settled.map(x=>x.status)).toEqual(['rejected','rejected']);
    expect(calls('/api/auth/password/forgot')).toHaveLength(0);
    expect(calls('/api/auth/password/reset')).toHaveLength(0);
    global.fetch.mockResolvedValueOnce(response(200,{csrfToken:'fresh'}))
      .mockResolvedValueOnce(response(200,{message:'Synthetic generic receipt'}));
    await expect(authApi.forgot('fake@example.invalid')).resolves.toMatchObject({message:'Synthetic generic receipt'});
    expect(calls('/api/auth/csrf')).toHaveLength(2);
  });
  test('preflight retry after a non-200 response does not cache rejected tokens',async()=>{
    const {authApi}=load();
    global.fetch.mockResolvedValueOnce(denied(503))
      .mockResolvedValueOnce(response(200,{csrfToken:'fresh'}))
      .mockResolvedValueOnce(response(204,null));
    await expect(authApi.reset('fictional-token','fictional-value')).rejects.toMatchObject({status:503});
    await expect(authApi.reset('fictional-token','fictional-value')).resolves.toBeUndefined();
    expect(calls('/api/auth/csrf')).toHaveLength(2);
    expect(calls('/api/auth/password/reset')).toHaveLength(1);
  });
  test('context switch includes the current token, refreshes it and excludes stale CSRF',async()=>{
    const {authApi,rest}=load();
    rest.remember(sample('before'));
    global.fetch.mockResolvedValueOnce(response(200,sample('after')))
      .mockResolvedValueOnce(response(200,{}));
    await authApi.selectContext({membershipId:'synthetic-membership',role:'THERAPIST'});
    const choice=calls('/api/auth/context')[0];
    assertSecure(choice,'POST');
    expect(choice[1].headers['X-CSRF-Token']).toBe('before');
    expect(JSON.parse(choice[1].body)).toEqual({membershipId:'synthetic-membership',role:'THERAPIST'});
    await rest.send('POST','/api/synthetic/context-dependent',{});
    expect(calls('/api/synthetic/context-dependent')[0][1].headers['X-CSRF-Token']).toBe('after');
  });
  test('failed context switch never installs an unconfirmed new token',async()=>{
    const {authApi,rest}=load();rest.remember(sample('old'));
    global.fetch.mockResolvedValueOnce(denied(409)).mockResolvedValueOnce(response(200,{}));
    await expect(authApi.selectContext({membershipId:'synthetic-old',role:'THERAPIST'})).rejects.toMatchObject({status:409});
    await rest.send('PATCH','/api/synthetic/write',{});
    expect(calls('/api/synthetic/write')[0][1].headers['X-CSRF-Token']).toBe('old');
  });
  test('logoutAll uses authenticated CSRF and does not falsely retain token',async()=>{
    const {authApi,rest}=load();rest.remember(sample('only-before-logout'));
    global.fetch.mockResolvedValueOnce(response(204,null)).mockResolvedValueOnce(response(200,{}));
    await authApi.logoutAll();
    const logout=calls('/api/auth/logout-all')[0];
    assertSecure(logout,'POST');
    expect(logout[1].headers['X-CSRF-Token']).toBe('only-before-logout');
    await rest.send('POST','/api/synthetic/write',{});
    expect(calls('/api/synthetic/write')[0][1].headers['X-CSRF-Token']).toBeUndefined();
  });
  test('change-password uses an existing CSRF and stores the renewed one',async()=>{
    const {authApi,rest}=load();rest.remember(sample('pre-change'));
    global.fetch.mockResolvedValueOnce(response(200,sample('post-change'))).mockResolvedValueOnce(response(200,{}));
    await authApi.changePassword('fictional-old','fictional-new');
    const c=calls('/api/auth/password/change')[0];
    assertSecure(c,'POST');
    expect(c[1].headers['X-CSRF-Token']).toBe('pre-change');
    expect(JSON.parse(c[1].body)).toEqual({currentPassword:'fictional-old',newPassword:'fictional-new'});
    await rest.send('PATCH','/api/synthetic/write',{});
    expect(calls('/api/synthetic/write')[0][1].headers['X-CSRF-Token']).toBe('post-change');
  });
  test('ordinary 403 does not impersonate session expiry or call logout listener',async()=>{
    const {rest,onUnauthorized}=load();const handler=jest.fn();onUnauthorized(handler);
    rest.remember(sample('known'));global.fetch.mockResolvedValueOnce(denied(403)).mockResolvedValueOnce(response(200,{}));
    await expect(rest.get('/api/synthetic/not-allowed')).rejects.toMatchObject({status:403});
    await rest.send('PATCH','/api/synthetic/authorized',{});
    expect(handler).not.toHaveBeenCalled();
    expect(calls('/api/synthetic/authorized')[0][1].headers['X-CSRF-Token']).toBe('known');
  });
  test('listener cleanup does not remove a newer subscriber',async()=>{
    const {rest,onUnauthorized}=load();
    const a=jest.fn(),b=jest.fn();
    const old=onUnauthorized(a);const next=onUnauthorized(b);old();
    global.fetch.mockResolvedValue(denied(401));
    await expect(rest.get('/api/synthetic/secure')).rejects.toMatchObject({status:401});
    expect(a).not.toHaveBeenCalled();expect(b).toHaveBeenCalledTimes(1);
    next();
    await expect(rest.get('/api/synthetic/secure')).rejects.toMatchObject({status:401});
    expect(b).toHaveBeenCalledTimes(1);
  });
  test('204 bypasses JSON parsing and returns undefined',async()=>{
    const {rest}=load();const r=response(204,null);
    r.json.mockImplementation(()=>{throw Error('must not parse');});
    global.fetch.mockResolvedValue(r);
    await expect(rest.get('/api/synthetic/no-content')).resolves.toBeUndefined();
    expect(r.json).not.toHaveBeenCalled();
  });
  test('malformed error JSON still produces bounded generic failure',async()=>{
    const {rest}=load();global.fetch.mockResolvedValue({status:502,ok:false,json:jest.fn().mockRejectedValue(Error('not JSON'))});
    await expect(rest.get('/api/synthetic/failure')).rejects.toMatchObject({status:502,message:'Request failed (502)'});
  });
  test('array-valued validation message is normalized without trusting body as a success',async()=>{
    const {rest}=load();global.fetch.mockResolvedValue(denied(422));
    await expect(rest.send('POST','/api/synthetic/invalid',{})).rejects.toMatchObject({status:422});
    global.fetch.mockResolvedValue(response(422,{message:['invalid child','invalid version']}));
    await expect(rest.send('PATCH','/api/synthetic/invalid',{})).rejects.toThrow('invalid child invalid version');
  });
  test('application query excludes absent filters and encodes user keyword',async()=>{
    const {authApi}=load();global.fetch.mockResolvedValue(response(200,{items:[]}));
    await authApi.listApplications({status:'',q:'speech & language',page:2});
    const [path,opts]=global.fetch.mock.calls[0];
    expect(path).toContain('q=speech+%26+language');
    expect(path).toContain('page=2');
    expect(path).not.toContain('status=');
    assertSecure([path,opts],'GET');
  });
  test('public application write gets isolated pre-CSRF and JSON body',async()=>{
    const {authApi}=load();
    global.fetch.mockResolvedValueOnce(response(200,{csrfToken:'pre-app'}))
      .mockResolvedValueOnce(response(200,{reference:'SYNTHETIC',status:'SUBMITTED'}));
    await authApi.submitApplication({organizationName:'Fictional',syntheticDataAcknowledged:true});
    const c=calls('/api/center-applications')[0];
    assertSecure(c,'POST');
    expect(c[1].headers['X-CSRF-Token']).toBe('pre-app');
    expect(JSON.parse(c[1].body)).toMatchObject({syntheticDataAcknowledged:true});
  });
});

describe('family-release API uses real transport boundaries; no clinical signing',()=>{
  const setup=()=>{
    const {rest}=load();rest.remember(sample('guardian-csrf'));
    return require('../src/lib/family-releases').familyReleaseApi;
  };
  test('guardian list/read requests are GET, no-store and credential-bound',async()=>{
    const api=setup();global.fetch.mockResolvedValue(response(200,{synthetic:true,items:[]}));
    await api.mine('center-one');await api.read('center-one','fictional-release');
    expect(calls('/api/centers/center-one/family-releases/mine')).toHaveLength(1);
    expect(calls('/api/centers/center-one/family-releases/mine/fictional-release')).toHaveLength(1);
    for(const c of global.fetch.mock.calls){assertSecure(c,'GET');expect(c[1].headers['X-CSRF-Token']).toBeUndefined();}
  });
  test('consent and withdrawal have separate, authenticated POST destinations',async()=>{
    const api=setup();global.fetch.mockResolvedValue(response(200,{}));
    await api.consent('center-one','fictional-child','FAMILY_PLAN');
    await api.consent('center-one','fictional-child','FAMILY_REPORT',true);
    const base='/api/centers/center-one/family-releases/consents';
    expect(calls(base)).toHaveLength(1);expect(calls(base+'/withdraw')).toHaveLength(1);
    for(const c of global.fetch.mock.calls){assertSecure(c,'POST');expect(c[1].headers['X-CSRF-Token']).toBe('guardian-csrf');}
    expect(JSON.parse(calls(base+'/withdraw')[0][1].body)).toEqual({childId:'fictional-child',purpose:'FAMILY_REPORT'});
  });
  test('synthetic approvals retain unsigned API semantics, with server as authority',async()=>{
    const api=setup();global.fetch.mockResolvedValue(response(200,{id:'fictional-approval',synthetic:true,signed:false}));
    await expect(api.approve('center-one','fictional-snapshot')).resolves.toMatchObject({synthetic:true,signed:false});
    const c=calls('/api/centers/center-one/family-releases/approvals')[0];
    expect(JSON.parse(c[1].body)).toEqual({snapshotId:'fictional-snapshot'});
    assertSecure(c,'POST');
  });
  test('recipient and grant recovery queries do not mutate release state',async()=>{
    const api=setup();global.fetch.mockResolvedValue(response(200,{items:[]}));
    await api.recipients('center-one','fictional-approval');
    await api.recoverGrants('center-one');
    await api.grantsForApproval('center-one','fictional-approval');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    for(const c of global.fetch.mock.calls){assertSecure(c,'GET');expect(c[1].body).toBeUndefined();}
  });
  test('grant recipient scope and change reason are transmitted explicitly',async()=>{
    const api=setup();global.fetch.mockResolvedValue(response(200,{}));
    await api.grant('center-one','fictional-approval','fictional-guardian-link');
    await api.change('center-one','fictional-grant','REVOKED','Synthetic custody change');
    const grant=calls('/api/centers/center-one/family-releases/grants')[0];
    const change=calls('/api/centers/center-one/family-releases/grants/fictional-grant/change')[0];
    expect(JSON.parse(grant[1].body)).toEqual({approvalId:'fictional-approval',guardianLinkId:'fictional-guardian-link'});
    expect(JSON.parse(change[1].body)).toEqual({status:'REVOKED',reason:'Synthetic custody change'});
    for(const c of [grant,change]){assertSecure(c,'POST');expect(c[1].headers['X-CSRF-Token']).toBe('guardian-csrf');}
  });
  test('denied change never becomes success and invalidates CSRF on 401',async()=>{
    const api=setup();global.fetch.mockResolvedValueOnce(denied(401)).mockResolvedValueOnce(response(200,{}));
    await expect(api.change('center-one','fictional-grant','WITHDRAWN','Synthetic')).rejects.toMatchObject({status:401});
    await api.grant('center-one','fictional-approval','fictional-guardian-link');
    const c=calls('/api/centers/center-one/family-releases/grants')[0];
    expect(c[1].headers['X-CSRF-Token']).toBeUndefined();
  });
});
