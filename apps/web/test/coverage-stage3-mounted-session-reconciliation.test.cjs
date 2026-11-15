// M4-08 Stage 3: real clinician SessionEditor risk branches. Synthetic-only
// transport is controlled; revision, attendance, evidence and fail-closed
// reconciliation execute production component logic.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/clinical/Dictation',()=>({
 Dictation:({disabled,onInsert,onPending})=>h('div',{'data-testid':'fake-dictation'},
 h('button',{'data-testid':'fake-dictation-insert',disabled,onClick:()=>onInsert('Synthetic reviewed transcript')},'Insert'),
 h('button',{'data-testid':'fake-dictation-pending',onClick:()=>onPending(true)},'Pending'))
}));
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,SelectField:({value,onChange,testId,options})=>h('select',{
  value,'data-testid':testId,onChange:e=>onChange(e.target.value)
 },options.map(o=>h('option',{value:o.value,key:o.value},o.label)))};
});
jest.mock('@/lib/clinical',()=>{
 const a=jest.requireActual('@/lib/clinical');
 return {...a,clinicalApi:{...a.clinicalApi,saveSession:jest.fn(),workspace:jest.fn()}};
});
const {clinicalApi}=require('../src/lib/clinical');
const {ApiError}=require('../src/lib/api');
const {SessionEditor}=require('../src/components/clinical/SessionEditor');
const template={id:'t1',title:'Fictional activity',service:'speech',minutes:10,
 materials:['paper'],steps:['Practice together'],safety:['Adult supervision']};
const activity=(extra={})=>({
 id:'activity-a',templateId:'t1',minutes:10,objective:'Fictional goal',
 completion:'COMPLETED',outcome:'PARTIAL',assistance:'SOME_ASSISTANCE',
 observation:'Synthetic assistance noted',...extra
});
const note=(extra={})=>({
 id:'note-a',service:'speech',sessionDate:'2026-11-10',author:'Fictional clinician',
 actualStart:'2026-11-10T08:00:00Z',actualEnd:null,attendance:'PRESENT',
 sections:{focus:'Fictional initial focus',activities:'',response:'',nextSteps:''},
 activities:[activity()],executionStatus:'IN_PROGRESS',version:3,mine:true,
 updatedAt:'2026-11-10T10:00:00Z',...extra
});
const workspace=(extra={})=>({
 timezone:'Asia/Dubai',canEdit:true,child:{id:'child-a',name:'Fictional Alex'},
 notes:[note()],plans:[{id:'plan-a',title:'Synthetic plan',service:'speech',versions:[{
 id:'v1',number:1,goals:[{key:'goal-a',title:'Synthetic task',measure:'count'}]}]}],
 assessments:[],observations:[],appointments:[],templates:[template],...extra
});
let tree,pending,oldWindow;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const textOf=c=>typeof c==='string'?c:Array.isArray(c)?c.map(textOf).join(''):
 React.isValidElement(c)?textOf(c.props.children):'';
const button=label=>tree.root.findAllByType('button').find(b=>
 textOf(b.props.children).includes(label));
const click=async label=>act(async()=>{const b=button(label);
 if(!b)throw Error('Missing '+label);b.props.onClick();await Promise.resolve();});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const mount=async(n=note(),ws=workspace())=>act(async()=>{
 tree=create(h(SessionEditor,{centerId:'center-a',n,ws,onPending:pending}));
});
const output=()=>JSON.stringify(tree.toJSON());
beforeAll(()=>{oldWindow=global.window;global.window={confirm:jest.fn(()=>true)};});
afterAll(()=>{global.window=oldWindow;});
beforeEach(()=>{
 jest.clearAllMocks();clinicalApi.saveSession.mockReset();clinicalApi.workspace.mockReset();
 clinicalApi.saveSession.mockResolvedValue({version:4,updatedAt:'2026-11-10T12:00:00Z'});
 clinicalApi.workspace.mockResolvedValue(workspace({notes:[note({version:4})]}));
 pending=jest.fn();global.window.confirm.mockReturnValue(true);
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('mounted clinical session evidence revision and negative controls',()=>{
 it('records attendance and plan-version linked activity on exact optimistic mutation',async()=>{
  await mount();
  await change('session-attendance-note-a','NO_SHOW');
  await change('goal-activity-a','v1|goal-a');
  await change('minutes-activity-a','15');
  await click('Save draft');
  expect(clinicalApi.saveSession).toHaveBeenCalledWith('center-a','note-a',
   expect.objectContaining({version:3,attendance:'NO_SHOW',
    activities:[expect.objectContaining({id:'activity-a',minutes:15,
     planVersionId:'v1',goalKey:'goal-a'})]}));
  expect(pending).toHaveBeenCalledWith('note-a',expect.any(Boolean));
 });
 it('refuses to delete recorded outcome when clinician cancels confirmation',async()=>{
  global.window.confirm.mockReturnValueOnce(false);
  await mount();await change('completion-activity-a','SKIPPED');
  await click('Save draft');
  const payload=clinicalApi.saveSession.mock.calls[0][2];
  expect(payload.activities[0]).toEqual(expect.objectContaining({
   completion:'COMPLETED',outcome:'PARTIAL',assistance:'SOME_ASSISTANCE'
  }));
 });
 it('removes outcome and assistance only after explicit reclassification approval',async()=>{
  await mount();await change('completion-activity-a','SKIPPED');
  await click('Save draft');
  const a=clinicalApi.saveSession.mock.calls[0][2].activities[0];
  expect(a.completion).toBe('SKIPPED');
  expect(a.outcome).toBeUndefined();
  expect(a.assistance).toBeUndefined();
 });
 it('avoids synthetic transcript insertion after an unknown server outcome',async()=>{
  clinicalApi.saveSession.mockRejectedValue(new Error('Synthetic response lost'));
  await mount();await click('Save draft');
  expect(output()).toContain('Outcome unknown');
  const before=tree.root.findByProps({'aria-label':'Child response / reviewed dictation'}).props.value;
  await act(async()=>get('fake-dictation-insert').props.onClick());
  const after=tree.root.findByProps({'aria-label':'Child response / reviewed dictation'}).props.value;
  expect(after).toBe(before);
  expect(clinicalApi.saveSession).toHaveBeenCalledTimes(1);
 });
 it('does not turn an uncertain draft-save into a completed operation',async()=>{
  clinicalApi.saveSession.mockRejectedValueOnce(new Error('Synthetic network lost'));
  await mount();await click('Save draft');
  await click('Review and complete session');
  expect(clinicalApi.saveSession).toHaveBeenCalledTimes(1);
  expect(output()).toContain('unknown outcome');
 });
 it('preserves evidence and fresh retry key after a permission denial',async()=>{
  clinicalApi.saveSession.mockRejectedValueOnce(new ApiError(403,'Synthetic access revoked'))
   .mockResolvedValueOnce({version:4,updatedAt:'2026-11-10T12:00:00Z'});
  await mount();await click('Save draft');
  expect(output()).not.toContain('Outcome unknown');
  const first=clinicalApi.saveSession.mock.calls[0][2].mutationKey;
  await click('Retry save');
  expect(clinicalApi.saveSession.mock.calls[1][2].mutationKey).not.toBe(first);
 });
 it('accepts authoritative server revision only after clinician explicitly retains it',async()=>{
  clinicalApi.saveSession.mockRejectedValueOnce(new ApiError(409,'Synthetic version conflict'));
  clinicalApi.workspace.mockResolvedValue(workspace({notes:[note({
   version:4,sections:{focus:'New synthetic server evidence',activities:'',response:'',nextSteps:''}
  })]}));
  await mount();
  await act(async()=>tree.root.findByProps({'aria-label':'Session focus'}).props.onChange({
   target:{value:'Local retained evidence'}
  }));
  await click('Save draft');
  expect(output()).toContain('Resolve conflicting session evidence');
  await click('Retain server version');
  expect(output()).toContain('Previous local evidence');
  expect(output()).toContain('Local retained evidence');
  expect(tree.root.findByProps({'aria-label':'Session focus'}).props.value)
   .toBe('New synthetic server evidence');
  expect(clinicalApi.saveSession).toHaveBeenCalledTimes(1);
 });
 it('reconciles local edits only against freshly revalidated current server revision',async()=>{
  clinicalApi.saveSession.mockRejectedValueOnce(new ApiError(409,'Synthetic version conflict'))
   .mockResolvedValueOnce({version:5,updatedAt:'2026-11-10T12:00:00Z'});
  clinicalApi.workspace.mockResolvedValue(workspace({notes:[note({version:4})]}));
  await mount();
  await act(async()=>tree.root.findByProps({'aria-label':'Session focus'}).props.onChange({
   target:{value:'Synthetic deliberate reconciliation'}
  }));
  await click('Save draft');
  await click('Save reviewed reconciliation as draft');
  expect(clinicalApi.workspace).toHaveBeenCalledTimes(2);
  expect(clinicalApi.saveSession).toHaveBeenLastCalledWith('center-a','note-a',
   expect.objectContaining({version:4,
    sections:expect.objectContaining({focus:'Synthetic deliberate reconciliation'}),
    executionStatus:'IN_PROGRESS'}));
 });
 it('stays read-only when a conflict reveals completed server evidence',async()=>{
  clinicalApi.saveSession.mockRejectedValueOnce(new ApiError(409,'Synthetic completed elsewhere'));
  clinicalApi.workspace.mockResolvedValue(workspace({notes:[note({
   version:4,executionStatus:'COMPLETED'
  })]}));
  await mount();
  await act(async()=>tree.root.findByProps({'aria-label':'Session focus'}).props.onChange({
   target:{value:'Unsaved fictional note'}
  }));
  await click('Save draft');
  expect(output()).toContain('already completed and read-only');
  expect(button('Save reviewed reconciliation as draft')).toBeUndefined();
  expect(clinicalApi.saveSession).toHaveBeenCalledTimes(1);
 });
});


describe('M4-08 90% real session interaction and identity preservation',()=>{
 it('removing a clinical activity changes only the local reviewed draft',async()=>{
  await mount();
  await click('Remove activity');
  await click('Save draft');
  expect(clinicalApi.saveSession.mock.calls[0][2].activities).toEqual([]);
  expect(note().activities).toHaveLength(1);
 });
 it('adding a service-matched library activity stores unsent evidence without inventing a clinical outcome',async()=>{
  await mount(note({activities:[]}));
  await click('Add Fictional activity');
  await click('Save draft');
  const entries=clinicalApi.saveSession.mock.calls[0][2].activities;
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({templateId:'t1',completion:'NOT_STARTED',
   objective:'',minutes:0,observation:''});
  expect(entries[0].outcome).toBeUndefined();
 });
 it('query hides unrelated library suggestions and no synthetic activity is inserted',async()=>{
  await mount(note({activities:[]}));
  await change('session-search-note-a','not-in-catalogue');
  expect(button('Add Fictional activity')).toBeUndefined();
  await change('session-search-note-a','Fictional');
  expect(button('Add Fictional activity')).toBeDefined();
 });
 it('activity evidence reorder changes only persisted ordering, not source identities',async()=>{
  await mount(note({activities:[
   activity({id:'activity-first'}),activity({id:'activity-second',objective:'Fictional second'})
  ]}));
  const downs=tree.root.findAllByType('button').filter(b=>textOf(b.props.children).includes('Move down'));
  await act(async()=>downs[0].props.onClick());
  await click('Save draft');
  expect(clinicalApi.saveSession.mock.calls[0][2].activities.map((a)=>a.id))
   .toEqual(['activity-second','activity-first']);
 });
 it('activity detail edits persist actual minutes, objective and factual observations as unvalidated evidence',async()=>{
  await mount();
  await change('objective-activity-a','Fictional reviewed objective');
  await change('minutes-activity-a','18');
  const observation=tree.root.findByProps({'aria-label':'Factual observation'});
  await act(async()=>observation.props.onChange({target:{value:'Fictional measured response'}}));
  await click('Save draft');
  expect(clinicalApi.saveSession.mock.calls[0][2].activities[0]).toMatchObject({
   objective:'Fictional reviewed objective',minutes:18,observation:'Fictional measured response',
   completion:'COMPLETED'
  });
 });
 it('completion reclassification without existing outcome does not require destructive confirmation',async()=>{
  const n=note({activities:[activity({outcome:undefined,assistance:undefined})]});
  await mount(n);
  await change('completion-activity-a','NOT_STARTED');
  expect(global.window.confirm).not.toHaveBeenCalled();
  await click('Save draft');
  const a=clinicalApi.saveSession.mock.calls[0][2].activities[0];
  expect(a.completion).toBe('NOT_STARTED');
  expect(a.outcome).toBeUndefined();
  expect(a.assistance).toBeUndefined();
 });
 it('explicit outcome and separate assistance remain distinct in saved activity payload',async()=>{
  await mount();
  await change('outcome-activity-a','ACHIEVED');
  await change('assistance-activity-a','INDEPENDENT');
  await click('Save draft');
  const a=clinicalApi.saveSession.mock.calls[0][2].activities[0];
  expect(a.outcome).toBe('ACHIEVED');
  expect(a.assistance).toBe('INDEPENDENT');
 });
 it('unlinking a goal clears both plan version and goal key to prevent false evidence attribution',async()=>{
  await mount(note({activities:[activity({planVersionId:'v1',goalKey:'goal-a'})]}));
  await change('goal-activity-a','');
  await click('Save draft');
  const a=clinicalApi.saveSession.mock.calls[0][2].activities[0];
  expect(a.planVersionId).toBeUndefined();
  expect(a.goalKey).toBeUndefined();
 });
 it('an unsigned legacy note without actual start fails before network persistence',async()=>{
  await mount(note({actualStart:null}));
  await click('Save draft');
  expect(output()).toContain('Actual start is required');
  expect(clinicalApi.saveSession).not.toHaveBeenCalled();
 });
 it('draft with no historical source end persists explicit typed actual end without completing',async()=>{
  await mount(note({actualEnd:null}));
  await change('session-end-time-note-a','2026-11-10T13:00:00');
  await click('Save draft');
  expect(clinicalApi.saveSession.mock.calls[0][2]).toMatchObject({
   actualEnd:expect.any(String),executionStatus:'IN_PROGRESS'
  });
  expect(output()).toContain('Sign note');
 });
 it('previously saved session cannot silently erase unsaved local note after incoming revision',async()=>{
  const n=note();
  await mount(n);
  const focus=tree.root.findByProps({'aria-label':'Session focus'});
  await act(async()=>focus.props.onChange({target:{value:'Fictional unsaved local evidence'}}));
  await act(async()=>tree.update(h(SessionEditor,{
   centerId:'center-a',n:{...n,version:99,sections:{...n.sections,focus:'Foreign refreshed evidence'}},
   ws:workspace(),onPending:pending
  })));
  expect(tree.root.findByProps({'aria-label':'Session focus'}).props.value)
   .toBe('Fictional unsaved local evidence');
  expect(clinicalApi.saveSession).not.toHaveBeenCalled();
 });
 it('clean session receives authoritative server revision when no local evidence is dirty',async()=>{
  const n=note();
  await mount(n);
  await act(async()=>tree.update(h(SessionEditor,{
   centerId:'center-a',n:{...n,version:4,sections:{...n.sections,focus:'Fictional updated server evidence'}},
   ws:workspace(),onPending:pending
  })));
  expect(tree.root.findByProps({'aria-label':'Session focus'}).props.value)
   .toBe('Fictional updated server evidence');
 });
 it('transcript pending flag prevents completion until explicit reviewed evidence is settled',async()=>{
  await mount();
  await act(async()=>get('fake-dictation-pending').props.onClick());
  expect(button('Review and complete session').props.disabled).toBe(true);
  expect(clinicalApi.saveSession).not.toHaveBeenCalled();
 });
 it('approved locally reviewed short transcript is appended to existing evidence rather than replacing it',async()=>{
  await mount(note({sections:{focus:'Fictional',activities:'',response:'Original fictional note',nextSteps:''}}));
  await act(async()=>get('fake-dictation-insert').props.onClick());
  expect(tree.root.findByProps({'aria-label':'Child response / reviewed dictation'}).props.value)
   .toContain('Original fictional note\nSynthetic reviewed transcript');
  await click('Save draft');
  expect(clinicalApi.saveSession.mock.calls[0][2].sections.response)
   .toContain('Synthetic reviewed transcript');
 });
 it('oversized reviewed transcript refuses insertion without changing clinician text',async()=>{
  const huge='A'.repeat(3999);
  await mount(note({sections:{focus:'Fictional',activities:'',response:huge,nextSteps:''}}));
  await act(async()=>get('fake-dictation-insert').props.onClick());
  expect(tree.root.findByProps({'aria-label':'Child response / reviewed dictation'}).props.value)
   .toBe(huge);
  expect(clinicalApi.saveSession).not.toHaveBeenCalled();
 });
 it('clinician cancellation prevents selecting newer server source over retained local evidence',async()=>{
  clinicalApi.saveSession.mockRejectedValueOnce(new ApiError(409,'Synthetic version conflict'));
  await mount();await click('Save draft');
  global.window.confirm.mockReturnValueOnce(false);
  await click('Retain server version');
  expect(output()).toContain('Resolve conflicting session evidence');
  expect(clinicalApi.saveSession).toHaveBeenCalledTimes(1);
 });
 it('reconciliation revalidates source and refuses stale changes rather than overwriting new evidence',async()=>{
  clinicalApi.saveSession.mockRejectedValueOnce(new ApiError(409,'Synthetic version conflict'));
  clinicalApi.workspace
   .mockResolvedValueOnce(workspace({notes:[note({version:4})]}))
   .mockResolvedValueOnce(workspace({notes:[note({version:5})]}))
   .mockResolvedValueOnce(workspace({notes:[note({version:5})]}));
  await mount();await click('Save draft');
  await click('Save reviewed reconciliation as draft');
  expect(clinicalApi.saveSession).toHaveBeenCalledTimes(1);
  expect(output()).toContain('Resolve conflicting session evidence');
 });
 it('read-only session has no editable dictation or save controls',async()=>{
  await mount(note({mine:false}),workspace({canEdit:false}));
  expect(button('Save draft')).toBeUndefined();
  expect(button('Review and complete session')).toBeUndefined();
  expect(find('fake-dictation')).toHaveLength(0);
  expect(output()).toContain('Sign note');
 });
});
