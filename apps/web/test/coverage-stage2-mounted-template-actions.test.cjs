// Stage 2 mounted center-owned template operations: copying never edits
// another author's saved activity, source snapshots stay immutable.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/lib/clinical',()=>{
 const actual=jest.requireActual('@/lib/clinical');
 return {...actual,clinicalApi:{...actual.clinicalApi,
  duplicateTemplate:jest.fn(),editTemplate:jest.fn()}};
});
const {clinicalApi}=require('../src/lib/clinical');
const {TemplateActions}=require('../src/components/clinical/TemplateActions');
const template=(extra={})=>({
 id:'synthetic-template',title:'Fictional turn-taking',service:'speech',
 version:3,mine:true,library:'center',ageBand:'6-8',minutes:10,
 materials:['paper','cards'],steps:['Try guided task'],safety:['Adult supervises'],
 ...extra
});
let tree=null,onChanged,onError;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>get(id).props.onClick());
const text=()=>JSON.stringify(tree.toJSON());
const setInput=async(index,value)=>act(async()=>tree.root.findAllByType('input')[index].props.onChange({target:{value}}));
const setArea=async(index,value)=>act(async()=>tree.root.findAllByType('textarea')[index].props.onChange({target:{value}}));
beforeEach(()=>{
 jest.clearAllMocks();onChanged=jest.fn();onError=jest.fn();
 clinicalApi.duplicateTemplate.mockResolvedValue({id:'copy'});
 clinicalApi.editTemplate.mockResolvedValue({version:4});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const mount=async(t=template())=>act(async()=>{tree=create(h(TemplateActions,{
 centerId:'center-1',template:t,onChanged,onError}));});
describe('Stage 2 activity template author and immutable version boundaries',()=>{
 it('hides edit mutations for templates owned by another clinician',async()=>{
  await mount(template({mine:false}));
  expect(get('activity-duplicate-synthetic-template')).toBeTruthy();
  expect(find('activity-edit-synthetic-template')).toHaveLength(0);
  expect(text()).toContain('Duplicate to customize another author');
  expect(clinicalApi.editTemplate).not.toHaveBeenCalled();
 });
 it('creates an independent center copy without editing another team member source',async()=>{
  await mount(template({mine:false}));
  await click('activity-duplicate-synthetic-template');
  expect(get('activity-copy-form-synthetic-template')).toBeTruthy();
  await setInput(0,'  Fictional cloned task  ');
  await click('activity-action-save-synthetic-template');
  expect(clinicalApi.duplicateTemplate).toHaveBeenCalledWith(
   'center-1','synthetic-template','Fictional cloned task');
  expect(clinicalApi.editTemplate).not.toHaveBeenCalled();
  expect(onChanged).toHaveBeenCalledWith(expect.stringContaining('independent centre-owned copy'));
 });
 it('rejects a blank copy name without sending a duplicate command',async()=>{
  await mount();
  await click('activity-duplicate-synthetic-template');
  await setInput(0,'x');
  await click('activity-action-save-synthetic-template');
  expect(get('activity-action-error')).toBeTruthy();
  expect(clinicalApi.duplicateTemplate).not.toHaveBeenCalled();
 });
 it('blocks edit if original saved version is missing, never silently overwriting',async()=>{
  await mount(template({version:undefined}));
  await click('activity-edit-synthetic-template');
  await click('activity-action-save-synthetic-template');
  expect(get('activity-action-error')).toBeTruthy();
  expect(clinicalApi.editTemplate).not.toHaveBeenCalled();
 });
 it('requires at least one safety instruction and task step for clinician-owned changes',async()=>{
  await mount();
  await click('activity-edit-synthetic-template');
  await setArea(2,' ');
  await click('activity-action-save-synthetic-template');
  expect(text()).toContain('Include at least one step and one safety instruction');
  expect(clinicalApi.editTemplate).not.toHaveBeenCalled();
 });
 it('sends exact versioned changes with trimmed multiline arrays and preserves prior snapshots',async()=>{
  await mount();
  await click('activity-edit-synthetic-template');
  await setInput(0,' Updated fictional therapy task ');
  await setInput(2,'25');
  await setArea(0,' paper \n cards \n ');
  await setArea(1,' Step one\n\n Step two ');
  await setArea(2,' Adult nearby \n Check safety ');
  await click('activity-action-save-synthetic-template');
  expect(clinicalApi.editTemplate).toHaveBeenCalledWith('center-1','synthetic-template',
   {version:3,title:'Updated fictional therapy task',ageBand:'6-8',
    minutes:25,materials:['paper','cards'],steps:['Step one','Step two'],
    safety:['Adult nearby','Check safety']});
  expect(onChanged).toHaveBeenCalledWith(expect.stringContaining('snapshots are unchanged'));
 });
 it('retains local draft after rejected optimistic concurrency edit',async()=>{
  clinicalApi.editTemplate.mockRejectedValue(new Error('Synthetic version conflict'));
  await mount();await click('activity-edit-synthetic-template');
  await setInput(0,'Fictional edited task');
  await click('activity-action-save-synthetic-template');
  expect(get('activity-action-error')).toBeTruthy();
  expect(get('activity-edit-form-synthetic-template')).toBeTruthy();
  expect(onChanged).not.toHaveBeenCalled();
 });
});