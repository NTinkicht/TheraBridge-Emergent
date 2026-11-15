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
 HomePlanSyntheticAssist:({onInsert})=>h('button',{'data-testid':'synthetic-insert-duplicate',onClick:()=>onInsert({templateId:'t1',goalKey:'g1',frequency:'Weekly'})},'Insert duplicate synthetic suggestion')
}));
jest.mock('@/lib/clinical',()=>{
 const real=jest.requireActual('@/lib/clinical');
 return {...real,clinicalApi:{...real.clinicalApi,saveVersion:jest.fn(),
  submit:jest.fn(),templates:jest.fn(),newVersion:jest.fn(),giveBack:jest.fn(),familyPreview:jest.fn()}};
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
beforeEach(()=>{jest.clearAllMocks();for(const key of ['templates','saveVersion','submit','newVersion','giveBack','familyPreview']) clinicalApi[key].mockReset();run=jest.fn(async(fn)=>{await fn();return true;});
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
 it('persists goal planning horizon and dates on exact optimistic version',async()=>{
  clinicalApi.saveVersion.mockResolvedValue({version:4});
  await mount();
  await change('goal-horizon-0','LONG_TERM');
  await change('goal-target-date-0','2030-03-15');
  await change('goal-review-date-0','2030-02-15');
  await change('goal-measure-0','percent');
  await change('goal-baseline-0','30');
  await click('plan-save');
  expect(clinicalApi.saveVersion).toHaveBeenCalledWith('c1','v1',
   expect.objectContaining({version:3,goals:[expect.objectContaining({
    horizon:'LONG_TERM',targetOn:'2030-03-15',reviewOn:'2030-02-15',
    measure:'percent',baseline:30
   })]}));
 });
 it('ignores an empty freshly-added goal rather than submitting invalid definitions',async()=>{
  clinicalApi.saveVersion.mockResolvedValue({version:4});
  await mount();
  await click('goal-add');
  expect(get('goal-1')).toBeTruthy();
  expect(get('goal-title-1').props.value).toBe('');
  await click('plan-save');
  const saved=clinicalApi.saveVersion.mock.calls[0][2];
  expect(saved.goals).toHaveLength(1);
  expect(saved.goals[0].key).toBe('g1');
  expect(saved.goals[0].title).toBe('Turn-taking');
 });
 it('removes an existing goal without carrying it into the saved draft',async()=>{
  clinicalApi.saveVersion.mockResolvedValue({version:4});
  await mount();
  await click('goal-remove-0');
  expect(get('goals-empty')).toBeTruthy();
  await click('plan-save');
  expect(clinicalApi.saveVersion).toHaveBeenCalledWith('c1','v1',
   expect.objectContaining({version:3,goals:[]}));
 });
 it('gets an immutable internal family preview but never triggers approval or release',async()=>{
  clinicalApi.familyPreview.mockResolvedValue({notice:'Synthetic internal-only preview',
   activities:[],snapshotId:'snapshot-a',fingerprint:'fictional-sha256'});
  await mount();
  await click('plan-family-preview');
  expect(clinicalApi.familyPreview).toHaveBeenCalledWith('c1','v1');
  expect(get('family-preview')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('Synthetic internal-only preview');
  await click('plan-family-preview');
  expect(find('family-preview')).toHaveLength(0);
  expect(clinicalApi.submit).not.toHaveBeenCalled();
 });
 it('returns only a supervisor-review draft with exact comment and version',async()=>{
  clinicalApi.giveBack.mockResolvedValue({version:4});
  await mount(version({status:'IN_REVIEW',mine:false}),
   ws({canEdit:false,canReview:true}));
  await change('review-comment','  Additional synthetic documentation required  ');
  await click('review-return');
  expect(clinicalApi.giveBack).toHaveBeenCalledWith('c1','v1',
   'Additional synthetic documentation required',3);
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

 it('new activities are excluded from specialty list once already attached',async()=>{
  await mount();
  await change('home-activity-add','t1');
  const values=get('home-activity-add').findAllByType('option').map(o=>o.props.value);
  expect(values).not.toContain('t1');
  expect(find('home-activity-0')).toHaveLength(1);
  expect(get('home-activity-unlinked')).toBeTruthy();
 });
 it('legacy already-saved unlinked activity remains editable without inventing an association',async()=>{
  clinicalApi.saveVersion.mockResolvedValue({version:4});
  await mount(version({homeActivities:[{templateId:'t1',frequency:'Weekly',note:'Fictional routine'}]}));
  expect(find('home-activity-unlinked')).toHaveLength(0);
  expect(get('plan-save').props.disabled).toBe(false);
  await change('plan-summary','Fictional clinician edit');
  await click('plan-save');
  expect(clinicalApi.saveVersion).toHaveBeenCalledWith('c1','v1',expect.objectContaining({
   homeActivities:[expect.objectContaining({templateId:'t1'})]
  }));
 });
 it('duplicate synthetic suggestion cannot silently add a second copy of an activity',async()=>{
  await mount(version({homeActivities:[{templateId:'t1',goalKey:'g1',frequency:'Weekly'}]}));
  expect(get('synthetic-insert-duplicate')).toBeTruthy();
  await click('synthetic-insert-duplicate');
  await click('synthetic-insert-duplicate');
  expect(find('home-activity-0')).toHaveLength(1);
  expect(find('home-activity-1')).toHaveLength(0);
  await click('plan-save');
  expect(clinicalApi.saveVersion).toHaveBeenCalledWith('c1','v1',
   expect.objectContaining({homeActivities:[expect.objectContaining({templateId:'t1',goalKey:'g1'})]}));
  expect(clinicalApi.saveVersion.mock.calls[0][2].homeActivities).toHaveLength(1);
 });
 it('read-only version retains saved goal values but removes every mutation action',async()=>{
  await mount(version({status:'IN_REVIEW',mine:false}),ws({canEdit:false,canReview:false}));
  expect(get('plan-summary').props.disabled).toBe(true);
  expect(get('goal-title-0').props.disabled).toBe(true);
  expect(get('goal-horizon-0').props.disabled).toBe(true);
  expect(find('goal-add')).toHaveLength(0);
  expect(find('goal-remove-0')).toHaveLength(0);
  expect(find('plan-save')).toHaveLength(0);
  expect(find('plan-submit')).toHaveLength(0);
  expect(find('review-return')).toHaveLength(0);
 });
 it('existing home activity allows removing it without altering immutable persisted source',async()=>{
  clinicalApi.saveVersion.mockResolvedValue({version:4});
  const original=version({homeActivities:[{templateId:'t1',goalKey:'g1',frequency:'Weekly'}]});
  await mount(original);
  const row=get('home-activity-0');
  const remove=row.findAllByType('button').find(x=>x.props['aria-label']==='Remove activity');
  await act(async()=>remove.props.onClick());
  expect(find('home-activity-0')).toHaveLength(0);
  await click('plan-save');
  expect(clinicalApi.saveVersion.mock.calls[0][2].homeActivities).toEqual([]);
  expect(original.homeActivities).toHaveLength(1);
 });
 it('frozen internal plan can start a new version without resubmitting or approving it',async()=>{
  clinicalApi.newVersion.mockResolvedValueOnce({id:'v2',status:'DRAFT'});
  await mount(version({status:'FROZEN_INTERNAL'}));
  expect(find('plan-save')).toHaveLength(0);
  expect(get('plan-new-version')).toBeTruthy();
  await click('plan-new-version');
  expect(clinicalApi.newVersion).toHaveBeenCalledWith('c1','plan-1');
  expect(clinicalApi.submit).not.toHaveBeenCalled();
 });
 it('pending reviewer return does not clear comment if the server rejects the action',async()=>{
  run=jest.fn(async(fn)=>{await fn();return false;});
  clinicalApi.giveBack.mockResolvedValueOnce({status:'IN_REVIEW'});
  await mount(version({status:'IN_REVIEW',mine:false}),ws({canEdit:false,canReview:true}));
  await change('review-comment','Fictional missing attachment');
  await click('review-return');
  expect(get('review-comment').props.value).toBe('Fictional missing attachment');
  expect(clinicalApi.giveBack).toHaveBeenCalledWith('c1','v1','Fictional missing attachment',3);
 });
 it('successful reviewer return clears only the unsent comment, never signs the clinical plan',async()=>{
  clinicalApi.giveBack.mockResolvedValueOnce({status:'RETURNED_FOR_REVISION'});
  await mount(version({status:'IN_REVIEW',mine:false}),ws({canEdit:false,canReview:true}));
  await change('review-comment','  Fictional reviewer feedback  ');
  await click('review-return');
  expect(get('review-comment').props.value).toBe('');
  expect(JSON.stringify(tree.toJSON())).toContain('Approve and release');
  expect(clinicalApi.saveVersion).not.toHaveBeenCalled();
 });
 it('a failed immutable preview request does not display fabricated family data',async()=>{
  run=jest.fn(async(fn)=>{try {await fn();} catch {} return false;});
  clinicalApi.familyPreview.mockRejectedValueOnce({status:403,message:'Fictional denied'});
  await mount();
  await click('plan-family-preview');
  expect(clinicalApi.familyPreview).toHaveBeenCalledWith('c1','v1');
  expect(find('family-preview')).toHaveLength(0);
  expect(get('plan-family-preview')).toBeTruthy();
 });
 it('internal preview may render exact returned activity but never becomes a family release',async()=>{
  clinicalApi.familyPreview.mockResolvedValueOnce({notice:'Synthetic internal-only preview',
   activities:[{template:{...template},frequency:'Weekly'}],
   snapshotId:'fictional-snapshot',fingerprint:'fictional-hash'});
  await mount();
  await click('plan-family-preview');
  expect(get('family-preview')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('Synthetic internal-only preview');
  expect(JSON.stringify(tree.toJSON())).toContain('fictional-snapshot');
  expect(clinicalApi.submit).not.toHaveBeenCalled();
 });

});
