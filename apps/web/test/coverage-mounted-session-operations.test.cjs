// M4-08 real mounted session note transitions: optimistic version, uncertainty,
// no inference of clinical signature, and explicit completion confirmation.
// All records and responses are synthetic.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/clinical/Dictation',()=>({
 Dictation:({disabled,onInsert})=>React.createElement('button',{
  type:'button','data-testid':'synthetic-dictation-callback',disabled,
  onClick:()=>onInsert('Synthetic reviewed transcript')},'Insert reviewed synthetic transcript')
}));
jest.mock('@/lib/clinical',()=>{
 const real=jest.requireActual('@/lib/clinical');
 return {...real,clinicalApi:{...real.clinicalApi,saveSession:jest.fn(),workspace:jest.fn()}};
});
const {clinicalApi}=require('../src/lib/clinical');
const {SessionEditor}=require('../src/components/clinical/SessionEditor');
const note=(changes={})=>({
 id:'synthetic-session',service:'speech',sessionDate:'2026-11-10',
 actualStart:'2026-11-10T08:00:00.000Z',actualEnd:null,
 attendance:'PRESENT',executionStatus:'IN_PROGRESS',
 activities:[],sections:{focus:'Fictional focus',response:'',activities:'',nextSteps:''},
 version:3,author:'Fictional Clinician',mine:true,appointmentId:null,
 updatedAt:'2026-11-10T08:00:00Z',...changes
});
const workspace=(changes={})=>({
 timezone:'Asia/Dubai',canEdit:true,synthetic:true,
 child:{id:'fictional-child',name:'Alex Fictional',services:['speech']},
 notes:[],plans:[],assessments:[],observations:[],appointments:[],templates:[],
 ...changes
});
let tree=null,windowBefore;
beforeAll(()=>{windowBefore=global.window;global.window={confirm:jest.fn(()=>true)};});
afterAll(()=>{global.window=windowBefore;});
beforeEach(()=>{jest.clearAllMocks();});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const get=id=>tree.root.findByProps({'data-testid':id});
const textOf=node=>typeof node==='string'?node:Array.isArray(node)?
 node.map(textOf).join(''):React.isValidElement(node)?textOf(node.props.children):'';
const button=name=>tree.root.findAllByType('button').find(b=>
 textOf(b.props.children).includes(name));
const click=async name=>act(async()=>{const b=button(name);if(!b)throw Error('Missing '+name);b.props.onClick();});
const mount=async(n=note(),ws=workspace())=>{
 const onPending=jest.fn();
 await act(async()=>{tree=create(h(SessionEditor,{centerId:'fictional-center',n,ws,onPending}));});
 return onPending;
};
const out=()=>JSON.stringify(tree.toJSON());
describe('M4-08 session persistence and completion remain unsigned',()=>{
 it('preserves exact note/version and saves draft, never signs or releases',async()=>{
  clinicalApi.saveSession.mockResolvedValue({version:4,updatedAt:'2026-11-10T10:00:00Z'});
  await mount();
  const focus=tree.root.findByProps({'aria-label':'Session focus'});
  await act(async()=>focus.props.onChange({target:{value:'Reviewed fictional session notes'}}));
  expect(out()).toContain('Unsaved changes');
  await click('Save draft');
  expect(clinicalApi.saveSession).toHaveBeenCalledTimes(1);
  const [center,id,body]=clinicalApi.saveSession.mock.calls[0];
  expect([center,id]).toEqual(['fictional-center','synthetic-session']);
  expect(body).toMatchObject({version:3,attendance:'PRESENT',
   executionStatus:'IN_PROGRESS',sections:{focus:'Reviewed fictional session notes'}});
  expect(typeof body.mutationKey).toBe('string');
  expect(out()).toContain('Saved on server');
  expect(out()).toContain('Sign note');
  expect(out()).not.toContain('Clinical signature completed');
 });
 it('retains the exact mutation on a transport-uncertain save and resolves it by retry',async()=>{
  clinicalApi.saveSession.mockRejectedValueOnce(new Error('Synthetic transport uncertainty'))
   .mockResolvedValueOnce({version:4,updatedAt:'2026-11-10T10:00:00Z'});
  await mount();
  await click('Save draft');
  expect(clinicalApi.saveSession).toHaveBeenCalledTimes(1);
  const first=clinicalApi.saveSession.mock.calls[0][2];
  expect(out()).toContain('Outcome unknown');
  expect(button('Resolve previous draft save')).toBeDefined();
  await click('Resolve previous draft save');
  expect(clinicalApi.saveSession).toHaveBeenCalledTimes(2);
  expect(clinicalApi.saveSession.mock.calls[1][2]).toEqual(first);
  expect(out()).not.toContain('Outcome unknown');
 });
 it('requires explicit confirmation for completing a previously unsigned note',async()=>{
  clinicalApi.saveSession.mockResolvedValue({version:4,updatedAt:'2026-11-10T10:00:00Z'});
  global.window.confirm.mockReturnValueOnce(false).mockReturnValueOnce(true);
  await mount();
  await click('Review and complete session');
  expect(clinicalApi.saveSession).not.toHaveBeenCalled();
  await click('Review and complete session');
  expect(clinicalApi.saveSession).toHaveBeenCalledWith('fictional-center','synthetic-session',
   expect.objectContaining({executionStatus:'COMPLETED'}));
  expect(out()).toContain('Completed · unsigned');
  expect(button('Save draft')).toBeUndefined();
 });
 it('displays already completed or read-only session without save or complete options',async()=>{
  await mount(note({executionStatus:'COMPLETED'}),workspace());
  expect(out()).toContain('Completed · unsigned');
  expect(button('Save draft')).toBeUndefined();
  expect(button('Review and complete session')).toBeUndefined();
 });
});
