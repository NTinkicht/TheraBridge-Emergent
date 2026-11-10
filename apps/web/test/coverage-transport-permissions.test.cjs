// M4-08 Stage 1: executable Web transport contracts for protected workflows.
// Stubs ONLY the HTTP boundary; assertions exercise real API command builders.
// No network and no clinical permission is inferred from frontend routing.
jest.mock('../src/lib/auth',()=>({
 rest:{get:jest.fn(),send:jest.fn(),publicPost:jest.fn(),remember:jest.fn()}
}));
const {rest}=require('../src/lib/auth');
const {centersApi}=require('../src/lib/centers');
const {clinicalApi}=require('../src/lib/clinical');
const {reportsApi}=require('../src/lib/reports');

beforeEach(()=>{
 jest.clearAllMocks();
 rest.get.mockImplementation(async path=>({path}));
 rest.send.mockImplementation(async(method,path,body)=>({method,path,body}));
 rest.publicPost.mockImplementation(async(path,body)=>({path,body}));
 rest.remember.mockImplementation(info=>info);
});
const command=async run=>(await run);
const pathOf=()=>rest.get.mock.calls.at(-1)?.[0];

describe('M4-08 protected center administration transport',()=>{
 it('filters search query without adding absent fields',async()=>{
  await centersApi.list({q:'synthetic search',status:'ACTIVE',page:2});
  expect(pathOf()).toBe('/api/platform/centers?q=synthetic+search&status=ACTIVE&page=2');
  await centersApi.staff('center-1',{role:'THERAPIST',status:'ACTIVE',page:1});
  expect(pathOf()).toBe('/api/centers/center-1/staff?role=THERAPIST&status=ACTIVE&page=1');
 });
 it('separates platform center creation from center-scoped settings',async()=>{
  const newCenter={name:'Synthetic center',timezone:'Asia/Dubai',
   country:'AE',city:'Sharjah',specialties:['speech'],
   firstAdmin:{email:'none@example.invalid',displayName:'Fictional Admin'}};
  await centersApi.create(newCenter);
  expect(rest.send).toHaveBeenLastCalledWith('POST','/api/platform/centers',newCenter);
  await centersApi.updateSettings('c1',{version:4,name:'New center label'});
  expect(rest.send).toHaveBeenLastCalledWith('PATCH','/api/centers/c1/settings',
   {version:4,name:'New center label'});
 });
 it('does not turn a first-admin invitation into an automatic staff membership',async()=>{
  await centersApi.inviteAdmin('c1',{email:'first@example.invalid',displayName:'First'});
  expect(rest.send.mock.calls.at(-1)[1]).toBe('/api/platform/centers/c1/admin-invitations');
  await centersApi.replaceAdmin('c1','invite1',{email:'replace@example.invalid',displayName:'Replacement'});
  expect(rest.send.mock.calls.at(-1)[1]).toBe('/api/platform/centers/c1/admin-invitations/invite1/replace');
  await centersApi.staffInvitation('c1','i1','revoke');
  expect(rest.send).toHaveBeenLastCalledWith('POST',
   '/api/centers/c1/invitations/i1/revoke');
 });
 it('preserves member revocation reason and supports explicitly empty reason',async()=>{
  await centersApi.memberStatus('c1','m1','revoke','Fictional reason');
  expect(rest.send).toHaveBeenLastCalledWith('POST','/api/centers/c1/staff/m1/revoke',
   {reason:'Fictional reason'});
  await centersApi.memberStatus('c1','m1','reactivate');
  expect(rest.send).toHaveBeenLastCalledWith('POST','/api/centers/c1/staff/m1/reactivate',{});
 });
 it('accepts invitation only through the intended public vs protected route',async()=>{
  rest.publicPost.mockResolvedValueOnce({csrfToken:'fake-only'});
  await centersApi.acceptNew('fake-token','Synthetic Person','');
  expect(rest.publicPost).toHaveBeenCalledWith('/api/invitations/accept-new',
   {token:'fake-token',displayName:'Synthetic Person',password:''});
  expect(rest.remember).toHaveBeenCalledTimes(1);
  await centersApi.acceptExisting('fake-token');
  expect(rest.send).toHaveBeenCalledWith('POST','/api/invitations/accept',
   {token:'fake-token'});
  expect(rest.remember).toHaveBeenCalledTimes(2);
 });
});

describe('M4-08 strict child-scoped clinical Web command routing',()=>{
 it('retains plan and assessment cursors on exact child workspace path',async()=>{
  await clinicalApi.workspace('centerA','childA',7,11);
  expect(pathOf()).toBe('/api/centers/centerA/clinical/children/childA?planOffset=7&assessmentOffset=11');
  await clinicalApi.workspace('centerB','childB');
  expect(pathOf()).toContain('/centers/centerB/clinical/children/childB?');
  expect(pathOf()).not.toContain('childA');
 });
 it('submits an actual versioned plan change without manufacturing release rights',async()=>{
  const body={summary:'Fictional only',goals:[],homeActivities:[],version:9};
  await clinicalApi.saveVersion('c1','v1',body);
  expect(rest.send).toHaveBeenLastCalledWith('PATCH',
   '/api/centers/c1/clinical/plan-versions/v1',body);
  await clinicalApi.submit('c1','v1',9);
  expect(rest.send).toHaveBeenLastCalledWith('POST',
   '/api/centers/c1/clinical/plan-versions/v1/submit',{version:9});
 });
 it('passes exact checkpoint source identity and version to the backend',async()=>{
  const body={goalKey:'g1',reviewedOn:'2026-11-10',
   summary:'Synthetic recorded observations',observationIds:['o1','o2'],version:3};
  await clinicalApi.goalCheckpoint('c1','v1',body);
  expect(rest.send).toHaveBeenLastCalledWith('POST',
   '/api/centers/c1/clinical/plan-versions/v1/goal-checkpoints',body);
 });
 it('keeps session start, updates and observation submissions separate',async()=>{
  const start={service:'speech',sessionDate:'2026-11-10',
   actualStart:'2026-11-10T09:00:00Z',startKey:'synthetic-key'};
  await clinicalApi.startSession('c1','child1',start);
  expect(rest.send.mock.calls.at(-1)[1]).toBe('/api/centers/c1/clinical/children/child1/sessions');
  const update={version:1,mutationKey:'fake-replay',sections:{},activities:[],
   actualStart:'2026-11-10T09:00:00Z',attendance:'PRESENT',executionStatus:'IN_PROGRESS'};
  await clinicalApi.saveSession('c1','s1',update);
  expect(rest.send).toHaveBeenLastCalledWith('PATCH',
   '/api/centers/c1/clinical/sessions/s1',update);
  await clinicalApi.observe('c1','child1',{planVersionId:'v1',goalKey:'g1',
   value:2,observedOn:'2026-11-10'});
  expect(rest.send.mock.calls.at(-1)[1]).toBe('/api/centers/c1/clinical/children/child1/observations');
 });
 it('escapes child identity in practice feedback query and filters activity list',async()=>{
  await clinicalApi.practiceFeedback('center','child with &');
  expect(pathOf()).toBe('/api/centers/center/clinical/practice-feedback?childId=child%20with%20%26');
  await clinicalApi.templates('center',{offset:0,search:'speech & play',service:'speech'});
  expect(pathOf()).toBe('/api/centers/center/activities?offset=0&search=speech+%26+play&service=speech');
  await clinicalApi.templates('center');
  expect(pathOf()).toBe('/api/centers/center/activities');
 });
 it('does not expose a family release endpoint through read-only previews',async()=>{
  await clinicalApi.familyPreview('center','v1');
  expect(pathOf()).toBe('/api/centers/center/clinical/plan-versions/v1/family-preview');
  await clinicalApi.family('center');
  expect(pathOf()).toBe('/api/centers/center/family/activities');
  expect(rest.send).not.toHaveBeenCalled();
 });
});

describe('M4-08 report review and evidence-decision transport isolation',()=>{
 it('uses exact report and center scope for evidence decisions',async()=>{
  await reportsApi.decisions('c1','r1');
  expect(pathOf()).toBe('/api/centers/c1/clinical/reports/r1/suggestion-decisions');
  const body={section:'goals',action:'OMITTED',version:1,proposalFingerprint:'f',
   idempotencyKey:'synthetic',reason:'Insufficient evidence'};
  await reportsApi.recordDecision('c1','r1',body);
  expect(rest.send).toHaveBeenLastCalledWith('POST',
   '/api/centers/c1/clinical/reports/r1/suggestion-decisions',body);
 });
 it('transmits review queue page and limited filters, without adding child leakage',async()=>{
  await reportsApi.reviewQueue('c1',{childId:'child1',search:'draft',page:3});
  expect(pathOf()).toBe('/api/centers/c1/clinical/reports/review-queue?childId=child1&search=draft&page=3');
  await reportsApi.reviewQueue('c2');
  expect(pathOf()).toBe('/api/centers/c2/clinical/reports/review-queue?page=1');
 });
 it('preserves report CAS revision and separate review transitions',async()=>{
  await reportsApi.autosave('c1','r1',{summary:'Synthetic'},5);
  expect(rest.send).toHaveBeenLastCalledWith('PATCH',
   '/api/centers/c1/clinical/reports/r1',{sections:{summary:'Synthetic'},version:5});
  await reportsApi.giveBack('c1','r1','Needs evidence',5);
  expect(rest.send).toHaveBeenLastCalledWith('POST',
   '/api/centers/c1/clinical/reports/r1/return',{comment:'Needs evidence',version:5});
  await reportsApi.submit('c1','r1',5);
  expect(rest.send).toHaveBeenLastCalledWith('POST',
   '/api/centers/c1/clinical/reports/r1/submit',{version:5});
 });
 it('keeps clinician preview endpoint separate from guardian synthetic demonstration',async()=>{
  await reportsApi.familyPreview('c1','r1');
  expect(pathOf()).toBe('/api/centers/c1/clinical/reports/r1/family-preview');
  await reportsApi.familyDemo('c1');
  expect(pathOf()).toBe('/api/centers/c1/family/progress-demo');
  expect(rest.send).not.toHaveBeenCalled();
 });
});
