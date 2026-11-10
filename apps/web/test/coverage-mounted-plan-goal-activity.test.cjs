// M4-08 mounted real plan editor: goal editing, source-linked home activities,
// invalid-duration fail-closed and immutable draft save. Sidecar visualizations
// isolated, but editor hooks and persistence path remain real.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/centers/kit',()=>{
 const original=jest.requireActual('@/components/centers/kit');
 return {...original,SelectField:({value,onChange,options,testId})=>h('select',{
  'data-testid':testId,value,onChange:e=>onChange(e.target.value)},
  options.map(o=>h('option',{key:o.value,value:o.value},o.label)))};
});
jest.mock('@/components/clinical/PlanEvidenceTrail',()=>({
 PlanEvidenceTrail:()=>h('aside',null,'Version-scoped evidence sidecar')
}));
jest.mock('@/components/clinical/SavedHomePlanPreview',()=>({
 SavedHomePlanPreview:()=>h('aside',null,'Frozen saved preview sidecar')
}));
jest.mock('@/components/clinical/GoalCheckpointPanel',()=>({
 GoalCheckpointPanel:()=>h('aside',null,'Draft checkpoint sidecar')
}));
jest.mock('@/components/clinical/HomePracticeCalendar',()=>({
 HomePracticeCalendar:()=>h('aside',null,'Practice calendar sidecar')
}));
jest.mock('@/components/clinical/HomePlanSyntheticAssist',()=>({
 HomePlanSyntheticAssist:()=>h('aside',null,'Synthetic suggestions sidecar')
}));
jest.mock('@/lib/clinical',()=>{
 const real=jest.requireActual('@/lib/clinical');
 return {...real,clinicalApi:{...real.clinicalApi,saveVersion:jest.fn(),
  submit:jest.fn(),templates:jest.fn(),newVersion:jest.fn()}};
});
const {clinicalApi}=require('../src/lib/clinical');
const {VersionEditor}=require('../src/components/clinical/PlanEditor');
const template={id:'t1',service:'speech',title:'Fictional supervised turn-taking',
 minutes:12,materials:['paper'],steps:['Play together'],safety:['Adult supervision'],
 ageBand:'6-8'};
const version=(more={})=>({
 id:'v1',version:3,number:1,status:'DRAFT',mine:true,summary:'Fictional clinical goal',
 author:'Fictional Clinician',reviewNotes:[],goalCheckpoints:[],
 goals:[{key:'g1',title:'Turn-taking',measure:'count',baseline:1,target:4}],
 homeActivities:[],...more
});
const ws=(more={})=>({
 timezone:'Asia/Dubai',canEdit:true,canReview:false,synthetic:true,
 child:{id:'fictional-child',name:'Synthetic Alex',services:['speech']},
 plans:[],notes:[],observations:[],assessments:[],appointments:[],
 templates:[template],...more
});
let tree=null,run=null,pending=null;
beforeEach(()=>{jest.clearAllMocks();for(const key of ['templates','saveVersion','submit','newVersion']) clinicalApi[key].mockReset();run=jest.fn(async(fn)=>{await fn();return true;});
 pending=jest.fn();});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const mount=async(v=version(),workspace=ws())=>act(async()=>{
 tree=create(h(VersionEditor,{centerId:'c1',ws:workspace,planId:'plan-1',
  planTitle:'Synthetic speech therapy',service:'speech',v,run,
  onDirtyChange:pending,otherPlanDirty:false}));
});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const click=async id=>act(async()=>{get(id).props.onClick();await new Promise(resolve=>setImmediate(resolve));});
describe('M4-08 real clinician plan version draft controls',()=>{
 it('saves edited goal/title against exact optimistic version, never approves release',async()=>{
  clinicalApi.saveVersion.mockResolvedValue({version:4});
  await mount();
  await change('goal-title-0','Fictional revised turn-taking');
  await change('goal-target-0','6');
  await click('plan-save');
  expect(clinicalApi.saveVersion).toHaveBeenCalledWith('c1','v1',expect.objectContaining({
   version:3,goals:[expect.objectContaining({key:'g1',title:'Fictional revised turn-taking',target:6})]
  }));
  expect(pending).toHaveBeenCalledWith('v1',true);
  expect(JSON.stringify(tree.toJSON())).toContain('Approve and release');
  expect(find('family-preview')).toHaveLength(0);
 });
 it('blocks newly added unlinked family activity until clinician selects exact version goal',async()=>{
  clinicalApi.saveVersion.mockResolvedValue({version:4});
  await mount();
  await change('home-activity-add','t1');
  expect(get('home-activity-unlinked')).toBeTruthy();
  expect(get('plan-save').props.disabled).toBe(true);
  // Disabled DOM controls cannot dispatch user clicks; do not invoke onClick directly.
  expect(clinicalApi.saveVersion).not.toHaveBeenCalled();
  await change('home-activity-goal-0','g1');
  expect(find('home-activity-unlinked')).toHaveLength(0);
  expect(get('plan-save').props.disabled).toBe(false);
  await click('plan-save');
  expect(clinicalApi.saveVersion).toHaveBeenCalledWith('c1','v1',
   expect.objectContaining({homeActivities:[
    expect.objectContaining({templateId:'t1',goalKey:'g1'})
   ]}));
 });
 it('blocks invalid plan-specific duration and requires a valid correction before saving',async()=>{
  clinicalApi.saveVersion.mockResolvedValue({version:4});
  await mount();
  await change('home-activity-add','t1');
  await change('home-activity-goal-0','g1');
  await change('home-activity-duration-override-0','121');
  expect(get('home-activity-invalid-duration')).toBeTruthy();
  expect(get('plan-save').props.disabled).toBe(true);
  await change('home-activity-duration-override-0','25');
  expect(find('home-activity-invalid-duration')).toHaveLength(0);
  await click('plan-save');
  expect(clinicalApi.saveVersion).toHaveBeenCalledWith('c1','v1',
   expect.objectContaining({homeActivities:[
    expect.objectContaining({durationMinutes:25,goalKey:'g1'})
   ]}));
 });
 it('searches the correct service, trim-filter and paginates the full library',async()=>{
  clinicalApi.templates
   .mockResolvedValueOnce({items:[{...template,id:'t2',title:'Fictional speech sequence'}],nextOffset:50})
   .mockResolvedValueOnce({items:[{...template,id:'t3',title:'Fictional conversation exercise'}],nextOffset:null});
  await mount();
  await change('plan-template-search','  practice  ');
  await click('plan-template-find');
  expect(clinicalApi.templates).toHaveBeenCalledWith('c1',{
   service:'speech',search:'practice',offset:0,limit:50
  });
  expect(get('plan-template-more')).toBeTruthy();
  await click('plan-template-more');
  expect(clinicalApi.templates).toHaveBeenLastCalledWith('c1',{
   service:'speech',search:'practice',offset:50,limit:50
  });
  expect(find('plan-template-more')).toHaveLength(0);
  const options=get('home-activity-add').findAllByType('option')
    .map(option=>option.props.value);
  expect(options).toEqual(['','t2','t3']);
 });
 it('keeps existing evidence on failed search and allows a source-bound retry',async()=>{
  clinicalApi.templates.mockRejectedValueOnce(new Error('synthetic timeout'))
   .mockResolvedValueOnce({items:[{...template,id:'t2'}],nextOffset:null});
  await mount();
  await click('plan-template-find');
  expect(JSON.stringify(tree.toJSON())).toContain('Could not search the activity library');
  expect(get('plan-save').props.disabled).toBe(false);
  await click('plan-template-find');
  expect(clinicalApi.templates).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(tree.toJSON())).not.toContain('Could not search the activity library');
 });
 it('does not submit unsaved clinician edits for supervisor review',async()=>{
  await mount();
  expect(get('plan-submit').props.disabled).toBe(false);
  await change('plan-summary','Unsaved fictional change');
  expect(get('plan-submit').props.disabled).toBe(true);
  expect(clinicalApi.submit).not.toHaveBeenCalled();
 });
 it('blocks handoff when another version has unsaved work',async()=>{
  await act(async()=>tree=create(h(VersionEditor,{
   centerId:'c1',ws:ws(),planId:'plan-1',planTitle:'Synthetic plan',
   service:'speech',v:version(),run,onDirtyChange:pending,otherPlanDirty:true
  })));
  expect(get('plan-submit').props.disabled).toBe(true);
  expect(clinicalApi.submit).not.toHaveBeenCalled();
 });
 it('submits an unchanged saved draft with exact version and no approval',async()=>{
  clinicalApi.submit.mockResolvedValue({status:'IN_REVIEW'});
  await mount();
  await click('plan-submit');
  expect(clinicalApi.submit).toHaveBeenCalledWith('c1','v1',3);
  expect(clinicalApi.saveVersion).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain('Approve and release');
 });
 it('allows a returned-for-revision author to edit but not a withdrawn version',async()=>{
  await mount(version({status:'RETURNED_FOR_REVISION'}));
  expect(get('plan-summary').props.disabled).toBe(false);
  expect(get('plan-save')).toBeTruthy();
  await act(async()=>tree.update(h(VersionEditor,{
   centerId:'c1',ws:ws(),planId:'plan-1',planTitle:'Synthetic plan',
   service:'speech',v:version({status:'WITHDRAWN'}),run,onDirtyChange:pending,
   otherPlanDirty:false
  })));
  expect(get('plan-summary').props.disabled).toBe(true);
  expect(find('plan-save')).toHaveLength(0);
  expect(get('plan-new-version')).toBeTruthy();
 });
 it('creates a new draft from withdrawn provenance without mutating frozen evidence',async()=>{
  clinicalApi.newVersion.mockResolvedValue({id:'v2'});
  await mount(version({status:'WITHDRAWN'}));
  await click('plan-new-version');
  expect(clinicalApi.newVersion).toHaveBeenCalledWith('c1','plan-1');
  expect(clinicalApi.saveVersion).not.toHaveBeenCalled();
  expect(clinicalApi.submit).not.toHaveBeenCalled();
 });
 it('keeps returned/supervisor or withdrawn plan read-only without silently sending for review',async()=>{
  await mount(version({status:'IN_REVIEW',mine:false}),ws({canEdit:false,canReview:true}));
  expect(find('plan-save')).toHaveLength(0);
  expect(find('plan-submit')).toHaveLength(0);
  expect(get('plan-summary').props.disabled).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain('Approve and release');
  expect(clinicalApi.submit).not.toHaveBeenCalled();
 });
});
