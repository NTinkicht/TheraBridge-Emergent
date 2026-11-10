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
