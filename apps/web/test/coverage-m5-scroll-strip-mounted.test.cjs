// M5 real ScrollStrip responsive content/reveal behavior with fake layout-only DOM.
// The component executes with real React hooks. No browser or patient data claims.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
const {ScrollStrip}=require('../src/components/design/ScrollStrip');
let tree,scrollEl,observers,oldRO,selected;
const mockEl=()=>({
 scrollLeft:0,clientWidth:200,scrollWidth:500,
 scrollBy:jest.fn(),addEventListener:jest.fn(),removeEventListener:jest.fn(),
 children:[],querySelector:jest.fn(()=>selected),
 getBoundingClientRect:()=>({left:0,right:200,width:200})
});
const mount=async(props={})=>act(async()=>{tree=create(h(ScrollStrip,{
 testId:'fictional-horizontal-nav',role:'tablist',ariaLabel:'Authorized sections',
 children:h('button',{type:'button','aria-current':'page'},'Fictional clinical area'),...props
}),{createNodeMock:element=>element.props?.role==='tablist'?scrollEl:null});});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
beforeEach(()=>{
 jest.clearAllMocks();tree=null;selected=null;scrollEl=mockEl();observers=[];
 oldRO=global.ResizeObserver;
 global.ResizeObserver=class{
  constructor(callback){this.callback=callback;this.observe=jest.fn();this.disconnect=jest.fn();observers.push(this);}
 };
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}global.ResizeObserver=oldRO;});
describe('real horizontal navigation overflow, controls and cleanup',()=>{
 it('shows forward affordance when content is wider than viewport',async()=>{
  await mount();
  expect(get('fictional-horizontal-nav').props['data-overflow-right']).toBe(true);
  expect(get('fictional-horizontal-nav').props['data-overflow-left']).toBe(false);
  expect(get('fictional-horizontal-nav-scroll-right')).toBeTruthy();
  expect(find('fictional-horizontal-nav-scroll-left')).toHaveLength(0);
  expect(observers[0].observe).toHaveBeenCalledWith(scrollEl);
 });
 it('moves by bounded viewport fraction using explicit forward chevron',async()=>{
  await mount();
  await act(async()=>get('fictional-horizontal-nav-scroll-right').props.onClick());
  expect(scrollEl.scrollBy).toHaveBeenCalledWith({left:140,behavior:'smooth'});
 });
 it('updates both edges after scroll and shows reverse affordance',async()=>{
  await mount();
  scrollEl.scrollLeft=100;
  const callback=scrollEl.addEventListener.mock.calls.find(x=>x[0]==='scroll')?.[1];
  await act(async()=>callback());
  expect(get('fictional-horizontal-nav').props['data-overflow-left']).toBe(true);
  expect(get('fictional-horizontal-nav').props['data-overflow-right']).toBe(true);
  await act(async()=>get('fictional-horizontal-nav-scroll-left').props.onClick());
  expect(scrollEl.scrollBy).toHaveBeenCalledWith({left:-140,behavior:'smooth'});
 });
 it('hides chevrons when all content fits without layout overflow',async()=>{
  scrollEl.clientWidth=600;scrollEl.scrollWidth=400;
  await mount();
  expect(find('fictional-horizontal-nav-scroll-right')).toHaveLength(0);
  expect(find('fictional-horizontal-nav-scroll-left')).toHaveLength(0);
 });
 it('reveals a selected offscreen item only inside its scroll strip',async()=>{
  selected={getBoundingClientRect:()=>({left:350,right:420,width:70})};
  await mount({activeItemKey:'fictional-current'});
  expect(scrollEl.querySelector).toHaveBeenCalledWith('[aria-current="page"]');
  expect(scrollEl.scrollLeft).toBeGreaterThan(0);
  expect(observers.length).toBeGreaterThanOrEqual(2);
 });
 it('does not move a visible active item without actual overflow',async()=>{
  selected={getBoundingClientRect:()=>({left:70,right:130,width:60})};
  scrollEl.clientWidth=600;scrollEl.scrollWidth=500;
  await mount({activeItemKey:'current'});
  expect(scrollEl.scrollLeft).toBe(0);
 });
 it('no active source item leaves existing scroll state unchanged',async()=>{
  scrollEl.scrollLeft=50;selected=null;
  await mount({activeItemKey:'not-on-current-route'});
  expect(scrollEl.scrollLeft).toBe(50);
  expect(scrollEl.querySelector).toHaveBeenCalledWith('[aria-current="page"]');
 });
 it('disposes scroll listeners and both observers on unmount',async()=>{
  selected={getBoundingClientRect:()=>({left:5,right:50,width:45})};
  await mount({activeItemKey:'current'});
  await act(async()=>tree.unmount());tree=null;
  expect(scrollEl.removeEventListener).toHaveBeenCalledWith('scroll',expect.any(Function));
  expect(observers.every(x=>x.disconnect.mock.calls.length>0)).toBe(true);
 });
});
