// M4-08 full-source Jest: exercise auth transport, session/CSRF invalidation and center wall-time safeguards.
// Synthetic responses only; global fetch is mocked. Never contact a server or process patient data.
const {ApiError}=require('../src/lib/api');
const json=(status,body)=>({status,ok:status>=200&&status<300,json:async()=>body});
let originalFetch;
beforeAll(()=>{originalFetch=global.fetch;});
afterAll(()=>{global.fetch=originalFetch;});
beforeEach(()=>{jest.resetModules();global.fetch=jest.fn();});
const session=(token='synthetic-csrf')=>({csrfToken:token,user:{id:'synthetic',email:'nobody@example.invalid',displayName:'Fictional'},contexts:[],activeContext:null,permissions:[]});

describe('M4-08 authentication transport and fail-closed session renewal',()=>{
 it('uses one pre-auth CSRF request for concurrent public writes and refuses cookie-less paths',async()=>{
  const {authApi}=require('../src/lib/auth');
  global.fetch.mockImplementation(async path=>{
   if(path==='/api/auth/csrf')return json(200,{csrfToken:'synthetic-pre-token'});
   return json(200,{message:'Synthetic response'});
  });
  await Promise.all([authApi.forgot('fake@example.invalid'),authApi.reset('fake-token','not-a-real-password')]);
  expect(global.fetch.mock.calls.filter(([path])=>path==='/api/auth/csrf')).toHaveLength(1);
  const postCalls=global.fetch.mock.calls.filter(([path])=>path!=='/api/auth/csrf');
  expect(postCalls).toHaveLength(2);
  for(const [,opts] of postCalls){
   expect(opts.credentials).toBe('include');
   expect(opts.cache).toBe('no-store');
   expect(opts.headers['X-CSRF-Token']).toBe('synthetic-pre-token');
  }
 });
 it('sets and clears CSRF on session changes, and preserves 204 response semantics',async()=>{
  const {authApi,rest}=require('../src/lib/auth');
  global.fetch.mockImplementation(async path=>{
   if(path==='/api/auth/session')return json(200,session('token-1'));
   if(path==='/api/auth/logout')return json(204,null);
   return json(200,{ok:true});
  });
  await authApi.session();
  await rest.send('POST','/api/centers/synthetic/draft',{sample:true});
  const send=global.fetch.mock.calls.find(([path])=>path.includes('/draft'));
  expect(send[1].headers['X-CSRF-Token']).toBe('token-1');
  expect(JSON.parse(send[1].body)).toEqual({sample:true});
  await expect(authApi.logout()).resolves.toBe(undefined);
  await rest.send('POST','/api/centers/synthetic/draft',{sample:true});
  const last=global.fetch.mock.calls.at(-1);
  expect(last[1].headers['X-CSRF-Token']).toBeUndefined();
 });
 it('clears stale CSRF on 401 and calls only the active unauthorized listener',async()=>{
  const {rest,onUnauthorized}=require('../src/lib/auth');
  let hits=0;
  const unsubscribe=onUnauthorized(()=>hits++);
  rest.remember(session('synthetic-stale'));
  global.fetch.mockResolvedValue(json(401,{message:'Unauthorized'}));
  await expect(rest.get('/api/centers/synthetic/secret')).rejects.toMatchObject({status:401});
  expect(hits).toBe(1);
  await expect(rest.send('PATCH','/api/centers/synthetic/draft',{x:1})).rejects.toMatchObject({status:401});
  expect(global.fetch.mock.calls.at(-1)[1].headers['X-CSRF-Token']).toBeUndefined();
  unsubscribe();
  await expect(rest.get('/api/centers/synthetic/secret')).rejects.toMatchObject({status:401});
  expect(hits).toBe(2);
 });
 it('normalizes network and structured server errors without exposing opaque bodies',async()=>{
  const {rest}=require('../src/lib/auth');
  global.fetch.mockRejectedValueOnce(new Error('private network error'));
  await expect(rest.get('/api/test')).rejects.toThrow(/could not reach TheraBridge/);
  global.fetch.mockResolvedValueOnce(json(400,{message:['Invalid version','Synthetic draft']}));
  await expect(rest.send('PATCH','/api/test',{id:'synthetic'})).rejects.toThrow('Invalid version Synthetic draft');
  global.fetch.mockResolvedValueOnce(json(500,null));
  await expect(rest.get('/api/test')).rejects.toThrow('Request failed (500)');
 });
 it('labels platform and center context without inferring permissions',()=>{
  const {contextLabel,ROLE_LABELS}=require('../src/lib/auth');
  expect(contextLabel({type:'platform',role:'PLATFORM_ADMIN'})).toBe('TheraBridge platform');
  expect(contextLabel({type:'center',centerName:'Synthetic center'})).toBe('Synthetic center');
  expect(ROLE_LABELS.GUARDIAN).toContain('guardian');
 });
});

describe('M4-08 center-local appointment date and DST safeguards',()=>{
 const ops=()=>require('../src/lib/operations');
 afterEach(()=>ops().setCenterTz(undefined));
 it('refuses conversion without a center time zone and avoids browser-local fallback',()=>{
  const {setCenterTz,zonedToUtc,getCenterTz}=ops();
  setCenterTz(undefined);
  expect(getCenterTz()).toBeUndefined();
  expect(()=>zonedToUtc('2026-11-09','10:00')).toThrow(/Center timezone is unavailable/);
  setCenterTz('Asia/Dubai');
  expect(zonedToUtc('2026-11-09','10:00').toISOString()).toBe('2026-11-09T06:00:00.000Z');
 });
 it('rejects missing/invalid wall time and preserves seconds accurately',()=>{
  const {zonedDateTimeInputToIso,formatZonedDateTimeInput}=ops();
  expect(()=>zonedDateTimeInputToIso('invalid','Asia/Dubai')).toThrow(/valid date and time/);
  expect(()=>zonedDateTimeInputToIso('2026-11-09T10:00:60','Asia/Dubai')).toThrow(/seconds below 60/);
  expect(zonedDateTimeInputToIso('2026-11-09T10:30:45','Asia/Dubai')).toBe('2026-11-09T06:30:45.000Z');
  expect(formatZonedDateTimeInput(null,'Asia/Dubai')).toBe('');
  expect(formatZonedDateTimeInput('2026-11-09T06:30:45.000Z','Asia/Dubai',true)).toBe('2026-11-09T10:30:45');
 });
 it('rejects skipped spring DST wall clock and preserves repeated fall time',()=>{
  const {zonedDateTimeInputToIso,preservedZonedInstant,formatZonedDateTimeInput}=ops();
  expect(()=>zonedDateTimeInputToIso('2026-03-08T02:30','America/New_York')).toThrow(/does not exist/);
  const original='2026-11-01T05:30:00.000Z';
  expect(formatZonedDateTimeInput(original,'America/New_York',true)).toBe('2026-11-01T01:30:00');
  expect(preservedZonedInstant('2026-11-01T01:30:00',original,'America/New_York')).toBe(original);
  expect(preservedZonedInstant('',original,'America/New_York')).toBeUndefined();
 });
 it('formats dates and days using selected center zone',()=>{
  const {setCenterTz,addDays,isoWeekday,minutesOfDay,zonedParts,dayKey}=ops();
  expect(addDays('2026-11-30',1)).toBe('2026-12-01');
  expect(isoWeekday('2026-11-09')).toBe(1);
  setCenterTz('Asia/Dubai');
  expect(zonedParts('2026-11-09T22:30:00.000Z').time).toBe('02:30');
  expect(minutesOfDay('2026-11-09T22:30:00.000Z')).toBe(150);
  expect(dayKey('2026-11-09T22:30:00.000Z')).toContain('11');
 });
});
