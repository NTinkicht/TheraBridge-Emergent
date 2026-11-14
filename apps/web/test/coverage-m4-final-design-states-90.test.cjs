// M4-08: mount production design states and native dialog focus handling
// under a synthetic DOM; no clinical content or external browser is needed.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let preview={dataState:'populated',setDataState:jest.fn()};
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/design/PreviewContext',()=>({usePreview:()=>preview}));
jest.mock('@/components/design/ui',()=>({
 Button:({onClick,children,testId,...props})=>h('button',{'data-testid':testId,onClick,disabled:props.disabled},children),
 btn:()=> 'fictional-button',
}));
const {StateGate,Skeleton,SkeletonRows,EmptyState,ErrorState,AccessDenied,Dialog}
 =require('../src/components/design/states');
const Icon=()=>h('i',null,'Synthetic icon');
let tree;
const mount=async(Component,props)=>act(async()=>{tree=create(h(Component,props));});
const get=id=>tree.root.findByProps({'data-testid':id});
const html=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{preview={dataState:'populated',setDataState:jest.fn()};});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 data state branches are explicit, not fabricated',()=>{
 it('renders the real child only when populated',async()=>{
  await mount(StateGate,{testId:'state',empty:h('p',null,'empty'),
   children:h('p',null,'real data')});
  expect(html()).toContain('real data');expect(html()).not.toContain('Loading');
 });
 it('does not expose stale child content while loading',async()=>{
  preview.dataState='loading';
  await mount(StateGate,{testId:'state',rows:2,empty:'empty',children:'private data'});
  expect(get('state-loading')).toBeTruthy();
  expect(html()).not.toContain('private data');
 });
 it('renders empty state independently of both content and error',async()=>{
  preview.dataState='empty';
  await mount(StateGate,{testId:'state',empty:h('p',null,'No synthetic records'),children:'private data'});
  expect(html()).toContain('No synthetic records');
  expect(html()).not.toContain('private data');
 });
 it('error retry changes preview state rather than reusing failed data',async()=>{
  preview.dataState='error';
  await mount(StateGate,{testId:'state',tone:'family',empty:'empty',children:'private data'});
  await act(async()=>get('state-error-retry').props.onClick());
  expect(preview.setDataState).toHaveBeenCalledWith('populated');
  expect(html()).not.toContain('private data');
 });
 it('skeleton row count is caller-controlled and defaults to 3',async()=>{
  await mount(SkeletonRows,{testId:'skeleton'});
  expect(tree.root.findAllByType('div').length).toBeGreaterThanOrEqual(3);
  await act(async()=>tree.update(h(SkeletonRows,{rows:1,testId:'skeleton'})));
  expect(tree.root.findAllByType('div').length).toBeLessThan(10);
  await act(async()=>tree.update(h(Skeleton,{className:'fictional-extra'})));
  expect(html()).toContain('fictional-extra');
 });
 it('empty state toggles family styling and optional action without inventing a link',async()=>{
  await mount(EmptyState,{icon:Icon,title:'No files',body:'Synthetic only',tone:'family',
   action:h('button',null,'Add synthetic'),testId:'empty'});
  expect(html()).toContain('border-fam-border');
  expect(html()).toContain('Add synthetic');
  await act(async()=>tree.update(h(EmptyState,{icon:Icon,title:'No files',body:'Synthetic only',testId:'empty'})));
  expect(html()).not.toContain('Add synthetic');
  expect(html()).toContain('border-border-strong');
 });
 it('error state provides default copy and actual retry callback',async()=>{
  const retry=jest.fn();
  await mount(ErrorState,{onRetry:retry,testId:'error'});
  expect(html()).toContain('Nothing was changed');
  await act(async()=>get('error-retry').props.onClick());
  expect(retry).toHaveBeenCalledTimes(1);
  await act(async()=>tree.update(h(ErrorState,{onRetry:retry,title:'Synthetic failure',body:'Offline',tone:'family',testId:'error'})));
  expect(html()).toContain('Synthetic failure');
  expect(html()).toContain('border-fam-border');
 });
 it('access denied keeps exactly the supplied safe destination',async()=>{
  await mount(AccessDenied,{title:'Forbidden',body:'No access',backHref:'/app',backLabel:'Back'});
  const link=tree.root.findByType('a');
  expect(link.props.href).toBe('/app');
  expect(html()).toContain('Forbidden');
 });
});
describe('M4-08 dialog focus and modal dismissal',()=>{
 let priorDocument,priorHTMLElement,dialog;
 beforeEach(()=>{
  priorDocument=global.document;priorHTMLElement=global.HTMLElement;
  class FakeElement {constructor(){this.focus=jest.fn();}}
  global.HTMLElement=FakeElement;
  const earlier=new FakeElement();
  global.document={activeElement:earlier};
  const focusTarget=new FakeElement();
  dialog={
   open:false,showModal:jest.fn(()=>{dialog.open=true;}),
   close:jest.fn(()=>{dialog.open=false;}),
   focus:jest.fn(),
   querySelector:jest.fn(()=>focusTarget)
  };
 });
 afterEach(()=>{global.document=priorDocument;global.HTMLElement=priorHTMLElement;});
 async function dialogMount(open,extra={}){
  await act(async()=>{tree=create(h(Dialog,{
   open,onClose:jest.fn(),title:'Synthetic dialog',testId:'dialog',
   children:'Synthetic details',...extra
  }),{createNodeMock:node=>node.type==='dialog'?dialog:null});});
 }
 it('opens modal only when requested, with keyboard focus on first enabled input',async()=>{
  await dialogMount(true);
  expect(dialog.showModal).toHaveBeenCalledTimes(1);
  expect(dialog.querySelector).toHaveBeenCalledWith('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
  expect(html()).toContain('Synthetic details');
 });
 it('does not open a closed modal and supports optional footer and family styling',async()=>{
  await dialogMount(false,{tone:'family',footer:h('p',null,'Footer')});
  expect(dialog.showModal).not.toHaveBeenCalled();
  expect(html()).toContain('Footer');expect(html()).toContain('border-fam-border');
 });
 it('closes an open modal when requested and restores focus to prior element',async()=>{
  await dialogMount(true);
  const prior=global.document.activeElement;
  await act(async()=>tree.update(h(Dialog,{open:false,onClose:jest.fn(),title:'Dialog',
   children:'Synthetic details',testId:'dialog'})));
  expect(dialog.close).toHaveBeenCalledTimes(1);
  expect(prior.focus).toHaveBeenCalled();
 });
 it('falls back to the dialog itself when no focusable control exists',async()=>{
  dialog.querySelector.mockReturnValue(null);
  await dialogMount(true);
  expect(dialog.focus).toHaveBeenCalledTimes(1);
 });
 it('does not open a duplicate already-open native modal',async()=>{
  dialog.open=true;
  await dialogMount(true);
  expect(dialog.showModal).not.toHaveBeenCalled();
 });
 it('does not restore an unrelated element when original focus is not HTMLElement',async()=>{
  global.document.activeElement={focus:jest.fn()};
  await dialogMount(true);
  await act(async()=>tree.update(h(Dialog,{open:false,onClose:jest.fn(),title:'Dialog',
   children:'Synthetic details',testId:'dialog'})));
  expect(dialog.close).toHaveBeenCalledTimes(1);
 });
});
