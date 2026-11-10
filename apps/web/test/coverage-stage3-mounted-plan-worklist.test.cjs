// M4-08 Stage 3: real PlansPanel aggregates multiple version drafts; retains
// exact historical source anchors and does not silently combine clinical data.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let oldWindow,oldDocument;
jest.mock('@/components/centers/kit',()=>{
 const a=jest.requireActual('@/components/centers/kit');
 return {...a,SelectField:({value,onChange,options,testId})=>h('select',{
  value,'data-testid':testId,onChange:e=>onChange(e.target.value)
 },options.map(o=>h('option',{key:o.value,value:o.value},o.label)))};
});
jest.mock('@/components/clinical/GoalReviewWorklist',()=>({
 GoalReviewWorklist:({ws})=>h('section',{'data-testid':'synthetic-goal-worklist',
 'data-count':ws.plans.length})}));
jest.mock('@/components/clinical/PlanEvidenceTrail',()=>({PlanEvidenceTrail:()=>null}));
jest.mock('@/components/clinical/SavedHomePlanPreview',()=>({SavedHomePlanPreview:()=>null}));
jest.mock('@/components/clinical/GoalCheckpointPanel',()=>({GoalCheckpointPanel:()=>null}));
jest.mock('@/components/clinical/HomePracticeCalendar',()=>({HomePracticeCalendar:()=>null}));
jest.mock('@/components/clinical/HomePlanSyntheticAssist',()=>({HomePlanSyntheticAssist:()=>null}));
jest.mock('@/components/clinical/PlanVersionHistory',()=>({
 PlanVersionHistory:({plan,target})=>h('section',{'data-testid':'fake-version-history-'+plan.id,
  'data-target-version':target?.versionId||null,
  'data-target-goal':target?.goalKey||null})
}));
jest.mock('@/lib/clinical',()=>{
 const a=jest.requireActual('@/lib/clinical');
 return {...a,clinicalApi:{...a.clinicalApi,plan:jest.fn(),saveVersion:jest.fn(),templates:jest.fn()}};
});
const {clinicalApi}=require('../src/lib/clinical');
const {PlansPanel}=require('../src/components/clinical/PlanEditor');
const goal=(id='goal-a')=>({key:id,title:'Fictional speech goal',measure:'count',baseline:1,target:5});
const ver=(id='version-current',number=3)=>({id,number,version:number,
 status:'DRAFT',mine:true,goals:[goal()],homeActivities:[],summary:'Fictional plan',
 author:'Fictional Leila',reviewNotes:[],goalCheckpoints:[]});
const plan=(id='plan-a',more={})=>({
 id,title:'Fictional speech plan',service:'speech',
 versions:[ver()],...more
});
const workspace=(more={})=>({
 timezone:'Asia/Dubai',synthetic:true,canEdit:true,canReview:false,
 child:{id:'child-a',name:'Fictional Alex',services:['speech']},
 plans:[],templates:[],notes:[],observations:[],assessments:[],appointments:[],
 ...more
});
let tree,run,pagination;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const mount=async(ws=workspace(),p={})=>act(async()=>{tree=create(h(PlansPanel,{
 centerId:'center-a',ws,run,pagination:{hasMore:false,loading:false,error:'',
 load:jest.fn(async()=>{}),...p}
}));});
beforeAll(()=>{
 oldWindow=global.window;oldDocument=global.document;
 global.window={location:{hash:''},addEventListener:jest.fn(),removeEventListener:jest.fn()};
 global.document={getElementById:jest.fn(()=>null)};
});
afterAll(()=>{global.window=oldWindow;global.document=oldDocument;});
beforeEach(()=>{
 jest.clearAllMocks();global.window.location.hash='';
 clinicalApi.plan.mockReset();clinicalApi.saveVersion.mockReset();clinicalApi.templates.mockReset();
 clinicalApi.plan.mockResolvedValue({id:'plan-new'});
 run=jest.fn(async fn=>{await fn();return true;});
 pagination={load:jest.fn(async()=>{})};
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('mounted draft plan list, version scope and guarded source links',()=>{
 it('shows exact center child draft empty and keeps family release inactive',async()=>{
  await mount();
  expect(get('plans-empty')).toBeTruthy();
  expect(get('plan-create')).toBeTruthy();
  expect(get('synthetic-goal-worklist')).toBeTruthy();
  expect(find('plan-plan-a')).toHaveLength(0);
 });
 it('creates a plan within exact current center and child only after server acknowledgement',async()=>{
  await mount();await change('plan-title','Synthetic speech planning');
  await click('plan-create-button');
  expect(clinicalApi.plan).toHaveBeenCalledWith('center-a','child-a',{
   service:'speech',title:'Synthetic speech planning'
  });
  expect(run).toHaveBeenCalledWith(expect.any(Function),'Plan created with a first draft.');
  expect(get('plan-title').props.value).toBe('');
  expect(get('plans-panel').props['data-refresh-revision']).toBe(1);
 });
 it('does not clear entered draft after a refused create',async()=>{
  run.mockImplementation(async()=>false);
  await mount();await change('plan-title','Synthetic unsaved plan');
  await click('plan-create-button');
  expect(get('plan-title').props.value).toBe('Synthetic unsaved plan');
  expect(get('plans-panel').props['data-refresh-revision']).toBe(0);
 });
 it('keeps clinician draft visible but hides plan creation for supervisor read-only role',async()=>{
  await mount(workspace({canEdit:false,canReview:true,plans:[plan()]}));
  expect(get('plan-plan-a')).toBeTruthy();
  expect(find('plan-create')).toHaveLength(0);
  expect(get('plan-summary').props.disabled).toBe(true);
 });
 it('paginates older plan evidence rather than inventing next batch',async()=>{
  const load=jest.fn(async()=>{});
  await mount(workspace({plans:[plan()]}),{hasMore:true,load});
  expect(get('plans-load-more')).toBeTruthy();
  await click('plans-load-more');
  expect(load).toHaveBeenCalledTimes(1);
 });
 it('shows paginated history retry error without dropping current draft',async()=>{
  await mount(workspace({plans:[plan()]}),{
   hasMore:true,error:'Synthetic older plan page denied'
  });
  expect(get('plans-load-error')).toBeTruthy();
  expect(get('plan-plan-a')).toBeTruthy();
 });
 it('does not silently map a historical goal link onto current version',async()=>{
  global.window.location.hash='#plan?version=version-old&goal=goal-a';
  const p=plan('plan-a',{versions:[ver('version-current',3),ver('version-old',2)]});
  await mount(workspace({plans:[p]}));
  expect(get('report-goal-navigation-note')).toBeTruthy();
  expect(get('fake-version-history-plan-a').props['data-target-version']).toBe('version-old');
  expect(get('fake-version-history-plan-a').props['data-target-goal']).toBe('goal-a');
 });
 it('rejects a cross-child or unavailable version link without using current goal',async()=>{
  global.window.location.hash='#plan?version=foreign-version&goal=goal-a';
  await mount(workspace({plans:[plan()]}));
  expect(JSON.stringify(tree.toJSON())).toContain('not visible in this workspace');
  expect(get('fake-version-history-plan-a').props['data-target-version']).toBe(null);
 });
 it('shows current-version source goal navigation without reusing older evidence',async()=>{
  global.window.location.hash='#plan?version=version-current&goal=goal-a';
  const focus=jest.fn(),scrollIntoView=jest.fn();
  global.document.getElementById.mockReturnValue({scrollIntoView,focus});
  await mount(workspace({plans:[plan()]}));
  expect(scrollIntoView).toHaveBeenCalledWith({block:'center'});
  expect(JSON.stringify(tree.toJSON())).toContain('Evidence remains version-specific');
 });
});
