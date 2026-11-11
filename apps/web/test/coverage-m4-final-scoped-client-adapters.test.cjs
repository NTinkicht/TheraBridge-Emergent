// M4-08 final consolidated qualification: real production client adapters.
// Each contract tests the actual exported adapter's method, tenant/path isolation,
// omission/encoding, and denial propagation. Only the shared REST boundary is mocked;
// these are not a substitute for authenticated real-PostgreSQL E2E assertions.
const restMock={
  get:jest.fn(),send:jest.fn(),publicPost:jest.fn(),remember:jest.fn()
};
jest.mock('@/lib/auth',()=>({rest:restMock}));
const {centersApi}=require('../src/lib/centers');
const {clinicalApi,LOCKED_REASON}=require('../src/lib/clinical');
const {reportsApi,SECTIONS}=require('../src/lib/reports');
const {governanceApi}=require('../src/lib/governance');
const {practiceApi,HOME_REQUEST_STATUS,CHOICE_LABEL}=require('../src/lib/practice');
const centre='synthetic-centre-a',child='synthetic-child-a',id='synthetic-id';
const c=p=>`/api/centers/${centre}/${p}`;
const p=x=>`/api/platform/centers/${x}`;
beforeEach(()=>{
 jest.clearAllMocks();
 restMock.get.mockResolvedValue({items:[],synthetic:true});
 restMock.send.mockResolvedValue({status:'synthetic-only'});
 restMock.publicPost.mockResolvedValue({status:'PENDING'});
 restMock.remember.mockImplementation(s=>s);
});
const expectRead=async(fn,path)=>{
 await fn();expect(restMock.get).toHaveBeenCalledWith(path);
 expect(restMock.send).not.toHaveBeenCalled();
};
const expectWrite=async(fn,method,path,body)=>{
 await fn();expect(restMock.send).toHaveBeenCalledWith(method,path,...(body===undefined?[]:[body]));
 expect(restMock.get).not.toHaveBeenCalled();
};

describe('M4-08 platform and center access adapters',()=>{
 const listCases=[
  ['no filter',{},'/api/platform/centers?'],
  ['status and pagination',{status:'ACTIVE',page:0},'/api/platform/centers?status=ACTIVE&page=0'],
  ['only meaningful query',{q:' family & speech ',status:'',page:2},'/api/platform/centers?q=+family+%26+speech+&page=2'],
 ];
 test.each(listCases)('scoped center listing — %s',async(_,params,expected)=>{
  await expectRead(()=>centersApi.list(params),expected);
 });
 test('rejects failed center listing without promoting it to authorized data',async()=>{
  restMock.get.mockRejectedValueOnce({status:403,code:'CROSS_TENANT'});
  await expect(centersApi.list({status:'ACTIVE'})).rejects.toMatchObject({status:403});
 });
 const readCases=[
  ['platform center detail',()=>centersApi.detail(id),p(id)],
  ['center settings',()=>centersApi.settings(centre),c('settings')],
  ['setup state',()=>centersApi.setup(centre),c('setup')],
  ['staff directory blank filters',()=>centersApi.staff(centre,{}),c('staff?')],
  ['staff exact member',()=>centersApi.member(centre,id),c('staff/'+id)],
  ['pending invitations',()=>centersApi.invitations(centre),c('invitations')],
  ['current member',()=>centersApi.me(centre),c('me')],
 ];
 test.each(readCases)('read %s from exactly permitted scope',async(_,fn,path)=>expectRead(fn,path));
 test('staff search includes nonempty query, status and zero page, omits blank specialty',async()=>{
  await expectRead(()=>centersApi.staff(centre,{q:'Alex & Jordan',role:'THERAPIST',status:'ACTIVE',specialty:'',page:0}),
   c('staff?q=Alex+%26+Jordan&role=THERAPIST&status=ACTIVE&page=0'));
 });
 const person={email:'fictional@example.invalid',displayName:'Fictional Guardian'};
 const writes=[
  ['create center',()=>centersApi.create({name:'Fictional',country:'AE',city:'Sharjah',timezone:'Asia/Dubai',specialties:[],firstAdmin:person}),'POST','/api/platform/centers'],
  ['invite first admin',()=>centersApi.inviteAdmin(id,person),'POST',p(id)+'/admin-invitations'],
  ['resend admin invite',()=>centersApi.adminInvitation(id,'invite-1','resend'),'POST',p(id)+'/admin-invitations/invite-1/resend'],
  ['revoke admin invite',()=>centersApi.adminInvitation(id,'invite-1','revoke'),'POST',p(id)+'/admin-invitations/invite-1/revoke'],
  ['replace admin invite',()=>centersApi.replaceAdmin(id,'invite-1',person),'POST',p(id)+'/admin-invitations/invite-1/replace'],
  ['change center settings CAS',()=>centersApi.updateSettings(centre,{version:2,timezone:'Asia/Dubai'}),'PATCH',c('settings')],
  ['complete one setup step',()=>centersApi.completeStep(centre,'review_permissions'),'POST',c('setup/review_permissions/complete')],
  ['change exact member',()=>centersApi.updateMember(centre,id,{title:'Synthetic therapist'}),'PATCH',c('staff/'+id)],
  ['suspend staff with reason',()=>centersApi.memberStatus(centre,id,'suspend','Synthetic policy reason'),'POST',c('staff/'+id+'/suspend')],
  ['reactivate staff',()=>centersApi.memberStatus(centre,id,'reactivate'),'POST',c('staff/'+id+'/reactivate')],
  ['revoke staff',()=>centersApi.memberStatus(centre,id,'revoke','Synthetic removal'),'POST',c('staff/'+id+'/revoke')],
  ['invite staff',()=>centersApi.inviteStaff(centre,{...person,roles:['THERAPIST'],specialties:['speech']}),'POST',c('invitations')],
  ['resend invitation',()=>centersApi.staffInvitation(centre,id,'resend'),'POST',c('invitations/'+id+'/resend')],
  ['revoke invitation',()=>centersApi.staffInvitation(centre,id,'revoke'),'POST',c('invitations/'+id+'/revoke')],
  ['update own profile',()=>centersApi.updateMe(centre,{displayName:'Fictional Nurse'}),'PATCH',c('me')],
 ];
 test.each(writes)('authorized API mutation requires explicit %s path',async(_,fn,method,path)=>{
  await fn();
  const [actualMethod,actualPath]=restMock.send.mock.calls[0];
  expect([actualMethod,actualPath]).toEqual([method,path]);
  expect(actualPath).not.toContain('/centers/another-centre/');
  expect(restMock.get).not.toHaveBeenCalled();
 });
 test('suspension reason is present; activation without reason carries empty JSON object',async()=>{
  await centersApi.memberStatus(centre,id,'suspend','Synthetic expiry');
  await centersApi.memberStatus(centre,id,'reactivate');
  expect(restMock.send.mock.calls[0][2]).toEqual({reason:'Synthetic expiry'});
  expect(restMock.send.mock.calls[1][2]).toEqual({});
 });
 test('invitation inspect uses pre-CSRF public POST, not an arbitrary GET',async()=>{
  await centersApi.inspectInvite('fictional-invite');
  expect(restMock.publicPost).toHaveBeenCalledWith('/api/invitations/inspect',{token:'fictional-invite'});
  expect(restMock.get).not.toHaveBeenCalled();
 });
 test('new invitation acceptance persists server-authoritative session and separates public flow',async()=>{
  const session={user:{id:'fictional-user'},csrfToken:'new-credential'};
  restMock.publicPost.mockResolvedValueOnce(session);
  await expect(centersApi.acceptNew('fictional-invite','Fictional Staff','not-a-real-password')).resolves.toEqual(session);
  expect(restMock.publicPost).toHaveBeenCalledWith('/api/invitations/accept-new',{
   token:'fictional-invite',displayName:'Fictional Staff',password:'not-a-real-password'});
  expect(restMock.remember).toHaveBeenCalledWith(session);
  expect(restMock.send).not.toHaveBeenCalled();
 });
 test('existing member invitation acceptance uses authenticated write',async()=>{
  const session={user:{id:'fictional-user'},csrfToken:'new-token'};
  restMock.send.mockResolvedValueOnce(session);
  await centersApi.acceptExisting('fictional-invite');
  expect(restMock.send).toHaveBeenCalledWith('POST','/api/invitations/accept',{token:'fictional-invite'});
  expect(restMock.remember).toHaveBeenCalledWith(session);
 });
 test('failed invitation acceptance never records a new session',async()=>{
  restMock.publicPost.mockRejectedValueOnce({status:410});
  await expect(centersApi.acceptNew('expired','Synthetic','fictional-pass')).rejects.toMatchObject({status:410});
  expect(restMock.remember).not.toHaveBeenCalled();
 });
});

describe('M4-08 clinical API preserves assignment and fail-closed release scope',()=>{
 test('workspace pagination uses explicit zero and nonzero offsets with exact child scope',async()=>{
  await expectRead(()=>clinicalApi.workspace(centre,child),c('clinical/children/'+child+'?planOffset=0&assessmentOffset=0'));
  jest.clearAllMocks();
  await expectRead(()=>clinicalApi.workspace(centre,child,50,100),c('clinical/children/'+child+'?planOffset=50&assessmentOffset=100'));
 });
 const reads=[
  ['template list empty',()=>clinicalApi.templates(centre),c('activities')],
  ['template list with filters',()=>clinicalApi.templates(centre,{offset:0,limit:20,search:'shape & sort',service:'speech',ownership:'center'}),c('activities?offset=0&limit=20&search=shape+%26+sort&service=speech&ownership=center')],
  ['family activities',()=>clinicalApi.family(centre),c('family/activities')],
  ['guardian preview',()=>clinicalApi.familyPreview(centre,id),c('clinical/plan-versions/'+id+'/family-preview')],
  ['guardian feedback encoded',()=>clinicalApi.practiceFeedback(centre,'synthetic child & 2'),c('clinical/practice-feedback?childId=synthetic%20child%20%26%202')],
 ];
 test.each(reads)('read %s without issuing unauthorized mutation',async(_,fn,path)=>expectRead(fn,path));
 const cases=[
  ['assessment',()=>clinicalApi.assess(centre,child,{service:'speech',assessedOn:'2026-11-11',summary:'fictional',areas:[]}),c('clinical/children/'+child+'/assessments'),'POST'],
  ['therapy plan draft',()=>clinicalApi.plan(centre,child,{service:'speech',title:'Synthetic Plan'}),c('clinical/children/'+child+'/plans'),'POST'],
  ['plan CAS write',()=>clinicalApi.saveVersion(centre,id,{summary:'Synthetic',goals:[],homeActivities:[],version:2}),c('clinical/plan-versions/'+id),'PATCH'],
  ['unsigned goal checkpoint',()=>clinicalApi.goalCheckpoint(centre,id,{goalKey:'g1',reviewedOn:'2026-11-11',summary:'Synthetic',observationIds:[],version:2}),c('clinical/plan-versions/'+id+'/goal-checkpoints'),'POST'],
  ['submit draft to internal review',()=>clinicalApi.submit(centre,id,3),c('clinical/plan-versions/'+id+'/submit'),'POST'],
  ['return internal review',()=>clinicalApi.giveBack(centre,id,'Synthetic revision required',3),c('clinical/plan-versions/'+id+'/return'),'POST'],
  ['create internal revision',()=>clinicalApi.newVersion(centre,id),c('clinical/plans/'+id+'/versions'),'POST'],
  ['create session note',()=>clinicalApi.note(centre,child,{service:'speech',sessionDate:'2026-11-11'}),c('clinical/children/'+child+'/notes'),'POST'],
  ['start draft session',()=>clinicalApi.startSession(centre,child,{service:'speech',sessionDate:'2026-11-11',actualStart:'2026-11-11T09:00Z',startKey:'fictional-key'}),c('clinical/children/'+child+'/sessions'),'POST'],
  ['session CAS mutation',()=>clinicalApi.saveSession(centre,id,{version:2,mutationKey:'fictional-key',sections:{},activities:[],actualStart:'2026-11-11T09:00Z',attendance:'PRESENT',executionStatus:'IN_PROGRESS'}),c('clinical/sessions/'+id),'PATCH'],
  ['note CAS mutation',()=>clinicalApi.saveNote(centre,id,{S:'text'},2),c('clinical/notes/'+id),'PATCH'],
  ['observation draft',()=>clinicalApi.observe(centre,child,{planVersionId:'pv1',goalKey:'g1',value:2,observedOn:'2026-11-11'}),c('clinical/children/'+child+'/observations'),'POST'],
  ['new synthetic activity',()=>clinicalApi.createTemplate(centre,{title:'Fictional',service:'speech',ageBand:'3-5',minutes:5,materials:[],steps:[],safety:[]}),c('activities'),'POST'],
  ['duplicate synthetic activity',()=>clinicalApi.duplicateTemplate(centre,id,'Fictional Copy'),c('activities/'+id+'/duplicate'),'POST'],
  ['edit versioned synthetic activity',()=>clinicalApi.editTemplate(centre,id,{version:2,title:'Fictional',ageBand:'3-5',minutes:10,materials:[],steps:[],safety:[]}),c('activities/'+id),'PATCH'],
 ];
 test.each(cases)('clinical %s sends only scoped write',async(_,fn,path,method)=>{
  await fn();expect(restMock.send.mock.calls[0].slice(0,2)).toEqual([method,path]);
  expect(restMock.get).not.toHaveBeenCalled();
 });
 test('returned goal checkpoint is never relabeled signed or released',async()=>{
  restMock.send.mockResolvedValueOnce({persisted:true,version:2,released:false,clinicalAuthorization:false});
  const result=await clinicalApi.goalCheckpoint(centre,id,{goalKey:'g1',reviewedOn:'2026-11-11',summary:'Fictional',observationIds:[],version:2});
  expect(result).toMatchObject({released:false,clinicalAuthorization:false});
  expect(LOCKED_REASON).toMatch(/Signing, approval and release stay off/);
 });
 test('response 403 is propagated without a synthesized clinical success',async()=>{
  restMock.send.mockRejectedValueOnce({status:403,message:'Synthetic forbidden'});
  await expect(clinicalApi.saveVersion(centre,id,{summary:'Test',goals:[],homeActivities:[],version:1})).rejects.toMatchObject({status:403});
 });
 test('no optional query parameter is emitted for blank filter while zero limit stays legitimate',async()=>{
  await clinicalApi.templates(centre,{offset:0,limit:0,search:'',service:''});
  expect(restMock.get).toHaveBeenCalledWith(c('activities?offset=0&limit=0'));
 });
});

describe('M4-08 report revision / evidence adapters remain internal drafts',()=>{
 const reads=[
  ['decision ledger',()=>reportsApi.decisions(centre,id),c('clinical/reports/'+id+'/suggestion-decisions')],
  ['progress dashboard all filters',()=>reportsApi.dashboard(centre,{childId:child,service:'speech',from:'2026-11-01',to:'2026-11-11'}),c('clinical/progress?childId='+child+'&service=speech&from=2026-11-01&to=2026-11-11')],
  ['report review queue default page',()=>reportsApi.reviewQueue(centre),c('clinical/reports/review-queue?page=1')],
  ['report review queue paginated',()=>reportsApi.reviewQueue(centre,{childId:child,search:'therapy & progress',page:0}),c('clinical/reports/review-queue?childId='+child+'&search=therapy+%26+progress&page=0')],
  ['report history initial',()=>reportsApi.list(centre,child),c('clinical/children/'+child+'/reports?offset=0')],
  ['report history next',()=>reportsApi.list(centre,child,100),c('clinical/children/'+child+'/reports?offset=100')],
  ['report detail',()=>reportsApi.detail(centre,id),c('clinical/reports/'+id)],
  ['immutable report version',()=>reportsApi.version(centre,id),c('clinical/report-versions/'+id)],
  ['family preview, not release',()=>reportsApi.familyPreview(centre,id),c('clinical/reports/'+id+'/family-preview')],
  ['family synthetic demonstration',()=>reportsApi.familyDemo(centre),c('family/progress-demo')],
 ];
 test.each(reads)('report read: %s',async(_,fn,path)=>expectRead(fn,path));
 const request={section:'goals',action:'APPLIED',version:3,proposalFingerprint:'fictional-hash',idempotencyKey:'fictional-key'};
 const writes=[
  ['source evidence decision',()=>reportsApi.recordDecision(centre,id,request),c('clinical/reports/'+id+'/suggestion-decisions'),'POST'],
  ['create report draft',()=>reportsApi.create(centre,child,{service:'speech',title:'Synthetic',periodStart:'2026-11-01',periodEnd:'2026-11-11'}),c('clinical/children/'+child+'/reports'),'POST'],
  ['report to plan draft, not release',()=>reportsApi.createPlanDraft(centre,id,{requestId:'fictional',sourceReportVersionId:'v1',reportRevision:2,title:'Fictional',selectedGoals:[]}),c('clinical/reports/'+id+'/plan-drafts'),'POST'],
  ['report autosave CAS',()=>reportsApi.autosave(centre,id,{summary:'Fictional'},2),c('clinical/reports/'+id),'PATCH'],
  ['create immutable report version',()=>reportsApi.saveVersion(centre,id,2),c('clinical/reports/'+id+'/versions'),'POST'],
  ['submit report to internal review',()=>reportsApi.submit(centre,id,2),c('clinical/reports/'+id+'/submit'),'POST'],
  ['review comment',()=>reportsApi.comment(centre,id,'Fictional review note',2),c('clinical/reports/'+id+'/comments'),'POST'],
  ['return report internally',()=>reportsApi.giveBack(centre,id,'Fictional request for revision',2),c('clinical/reports/'+id+'/return'),'POST'],
 ];
 test.each(writes)('%s sends a versioned, child-scoped mutation',async(_,fn,path,method)=>{
  await fn();expect(restMock.send.mock.calls[0].slice(0,2)).toEqual([method,path]);
 });
 test('autosave includes CAS version and unmodified submitted sections',async()=>{
  await reportsApi.autosave(centre,id,{summary:'Synthetic',goals:'None'},12);
  expect(restMock.send.mock.calls[0][2]).toEqual({sections:{summary:'Synthetic',goals:'None'},version:12});
 });
 test('failed report-to-plan draft does not imply a delivered family document',async()=>{
  restMock.send.mockRejectedValueOnce({status:409,code:'STALE_VERSION'});
  await expect(reportsApi.createPlanDraft(centre,id,{requestId:'fake',sourceReportVersionId:'v1',reportRevision:1,title:'Fictional',selectedGoals:[]})).rejects.toMatchObject({status:409});
 });
 test('report kinds and editable sections never promise approved clinical release',()=>{
  expect(SECTIONS.map(x=>x[0])).toContain('familySummary');
  expect(SECTIONS.find(x=>x[0]==='familySummary')[2]).toMatch(/Not shared/);
 });
 test('report dashboard omits blank options and encodes search values',async()=>{
  await reportsApi.dashboard(centre,{childId:'',service:'speech & ot',from:undefined,to:''});
  expect(restMock.get).toHaveBeenCalledWith(c('clinical/progress?service=speech+%26+ot'));
 });
});

describe('M4-08 governance history and access are non-authorizing data paths',()=>{
 const document={kind:'PLAN',id,version:3};
 const reads=[
  ['document list',()=>governanceApi.documents(centre),c('governance/documents')],
  ['plan history',()=>governanceApi.history(centre,document),c('governance/documents/PLAN/'+id+'/history')],
  ['report history',()=>governanceApi.history(centre,{...document,kind:'REPORT'}),c('governance/documents/REPORT/'+id+'/history')],
  ['immutable synthetic preview',()=>governanceApi.preview(centre,id),c('governance/previews/'+id)],
  ['guardian access review',()=>governanceApi.access(centre),c('governance/access')],
 ];
 test.each(reads)('governance %s is a scoped read',async(_,fn,path)=>expectRead(fn,path));
 test('transition carries original document version and reason, not an approval flag',async()=>{
  await governanceApi.transition(centre,document,'RETURN_TO_DRAFT','Fictional missing context');
  expect(restMock.send).toHaveBeenCalledWith('POST',c('governance/documents/PLAN/'+id+'/transitions'),
   {version:3,action:'RETURN_TO_DRAFT',reason:'Fictional missing context'});
 });
 test('transfer simulation cannot add clinical permissions by itself',async()=>{
  const body={childId:child,fromMembershipId:'member-a',toMembershipId:'member-b',service:'speech',reason:'Fictional replacement'};
  await governanceApi.transfer(centre,body);
  expect(restMock.send).toHaveBeenCalledWith('POST',c('governance/transfer-simulations'),body);
 });
 test('governance reads preserve missing authorization as denial',async()=>{
  restMock.get.mockRejectedValueOnce({status:403,code:'NO_ACCESS'});
  await expect(governanceApi.access(centre)).rejects.toMatchObject({status:403});
 });
});

describe('M4-08 guardian practice / progress APIs keep fixed-choice data separate from clinical decisions',()=>{
 const reads=[
  ['guardian request queue',()=>practiceApi.guardianPlanRequests(centre),c('family/home-plan-requests')],
  ['clinical assigned request queue',()=>practiceApi.clinicianPlanRequests(centre),c('clinical/home-plan-requests')],
  ['current practice week',()=>practiceApi.week(centre),c('family/practice')],
  ['specified practice week',()=>practiceApi.week(centre,'2026-11-09'),c('family/practice?week=2026-11-09')],
  ['all guardian practice history',()=>practiceApi.history(centre),c('family/practice/history')],
  ['child-specific guardian history',()=>practiceApi.history(centre,child),c('family/practice/history?childId='+child)],
  ['fixed-outcome idempotency lookup',()=>practiceApi.byKey(centre,'fictional-key'),c('family/practice/outcomes/fictional-key')],
  ['clinician inbox empty filters',()=>practiceApi.inbox(centre,{}),c('clinical/practice-feedback?')],
  ['clinician inbox nonempty filters',()=>practiceApi.inbox(centre,{childId:child,choice:'NEEDED_HELP',status:'new',from:'2026-11-01'}),c('clinical/practice-feedback?childId='+child+'&choice=NEEDED_HELP&status=new&from=2026-11-01')],
 ];
 test.each(reads)('practice %s is a scoped read',async(_,fn,path)=>expectRead(fn,path));
 const record={childId:child,templateId:'fictional-template',practiceDate:'2026-11-11',choice:'NEEDED_HELP',idempotencyKey:'fictional-key'};
 const writes=[
  ['request only, not released',()=>practiceApi.requestHomePlan(centre,{childId:child,service:'speech',requestKey:'fictional-key'}),c('family/home-plan-requests')],
  ['clinician acknowledges receipt, not approval',()=>practiceApi.respondHomePlan(centre,id,'ACKNOWLEDGED'),c('clinical/home-plan-requests/'+id+'/respond')],
  ['clinician closes unavailable, not released',()=>practiceApi.respondHomePlan(centre,id,'CLOSED_UNAVAILABLE'),c('clinical/home-plan-requests/'+id+'/respond')],
  ['guardian fixed choice with idempotency key',()=>practiceApi.record(centre,record),c('family/practice/outcomes')],
  ['clinician acknowledges read only',()=>practiceApi.acknowledge(centre,id),c('clinical/practice-feedback/'+id+'/acknowledge')],
 ];
 test.each(writes)('practice %s goes to expected POST path',async(_,fn,path)=>{
  await fn();expect(restMock.send.mock.calls[0].slice(0,2)).toEqual(['POST',path]);
 });
 test('practice answer preserves exact child, date, fixed choice and request key',async()=>{
  await practiceApi.record(centre,record);
  expect(restMock.send).toHaveBeenCalledWith('POST',c('family/practice/outcomes'),record);
 });
 test('inbox query drops empty filters, not valid status values',async()=>{
  await practiceApi.inbox(centre,{childId:'',service:undefined,choice:'SKIPPED',status:'unread',from:'',to:'2026-11-11'});
  expect(restMock.get).toHaveBeenCalledWith(c('clinical/practice-feedback?choice=SKIPPED&status=unread&to=2026-11-11'));
 });
 test('denied guardian record never returns a fabricated success',async()=>{
  restMock.send.mockRejectedValueOnce({status:403,code:'GUARDIAN_LINK_REVOKED'});
  await expect(practiceApi.record(centre,record)).rejects.toMatchObject({status:403});
 });
 test('no home-plan request status or choice maps to clinical authorization',()=>{
  expect(HOME_REQUEST_STATUS.ACKNOWLEDGED).toMatch(/no plan shared/);
  expect(CHOICE_LABEL.NEEDED_HELP).toBe('Needed help');
  expect(CHOICE_LABEL.NOT_COMPLETED).toBe('Not completed');
 });
});
