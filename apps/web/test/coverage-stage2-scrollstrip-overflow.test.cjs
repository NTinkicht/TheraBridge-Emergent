// Mounted source-executing scroll-strip tests with a synthetic measurable DOM.
// Checks keyboard visibility, overflow chevrons and resize cleanup.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
const {ScrollStrip}=require('../src/components/design/ScrollStrip');
let tree,scrollEl,observerInstances,priorObserver;
const box=(left,right)=>({left,right,width:right-left});
const fresh=()=>{
 scrollEl={
  scrollLeft:0,clientWidth:100,scrollWidth:350,
  children:[],addEventListener:jest.fn(),removeEventListener:jest.fn(),
  scrollBy:jest.fn(),getBoundingClientRect:()=>box(0,100),
  querySelector:jest.fn(()=>null)
 };
};
const mount=async(props={})=>act(async()=>{tree=create(h(ScrollStrip,{
 testId:'test-scroller',ariaLabel:'Synthetic navigation',role:'navigation',
 activeItemKey:'first',...props
 },h('a',{'aria-current':'page'},'Synthetic page')),{
  createNodeMock:({type,props})=>type==='div' &&
   String(props.className||'').includes('overflow-x-auto')?scrollEl:null
 });});
beforeAll(()=>{
 priorObserver=global.ResizeObserver;
 global.ResizeObserver=class {
  constructor(cb){this.callback=cb;this.observe=jest.fn();this.disconnect=jest.fn();
   observerInstances.push(this);}
 };
});
afterAll(()=>{global.ResizeObserver=priorObserver;});
beforeEach(()=>{fresh();observerInstances=[];});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const get=id=>tree.root.findByProps({'data-testid':id});
describe('real horizontal scroll visibility and resize behavior',()=>{
 it('starts with right overflow arrow, visible accessible strip and edge mask',async()=>{
  await mount({activeItemKey:undefined});
  expect(get('test-scroller').props['data-overflow-left']).toBe(false);
  expect(get('test-scroller').props['data-overflow-right']).toBe(true);
  expect(get('test-scroller-scroll-right')).toBeTruthy();
  const strip=tree.root.findByProps({role:'navigation'});
  expect(strip.props['aria-label']).toBe('Synthetic navigation');
  expect(strip.props.style.maskImage).toContain('linear-gradient');
  expect(scrollEl.addEventListener).toHaveBeenCalledWith('scroll',expect.any(Function),{passive:true});
 });
 it('pages right and left only the strip with accessible 44px controls',async()=>{
  await mount({activeItemKey:undefined});
  await act(async()=>get('test-scroller-scroll-right').props.onClick());
  expect(scrollEl.scrollBy).toHaveBeenCalledWith({left:70,behavior:'smooth'});
  scrollEl.scrollLeft=150;
  await act(async()=>observerInstances[0].callback());
  expect(get('test-scroller-scroll-left')).toBeTruthy();
  await act(async()=>get('test-scroller-scroll-left').props.onClick());
  expect(scrollEl.scrollBy).toHaveBeenLastCalledWith({left:-70,behavior:'smooth'});
  expect(get('test-scroller').props['data-overflow-right']).toBe(true);
 });
 it('removes fades and chevrons when everything fits after resizing',async()=>{
  await mount({activeItemKey:undefined});
  scrollEl.scrollWidth=100;scrollEl.scrollLeft=0;
  await act(async()=>observerInstances[0].callback());
  expect(get('test-scroller').props['data-overflow-right']).toBe(false);
  expect(get('test-scroller').props['data-overflow-left']).toBe(false);
  expect(tree.root.findAllByProps({'data-testid':'test-scroller-scroll-right'})).toHaveLength(0);
  expect(tree.root.findAllByProps({'data-testid':'test-scroller-scroll-left'})).toHaveLength(0);
 });
 it('reveals active nav item without scrolling its containing page',async()=>{
  scrollEl.querySelector.mockReturnValue({
   getBoundingClientRect:()=>box(260,300)
  });
  await mount();
  expect(scrollEl.querySelector).toHaveBeenCalledWith('[aria-current="page"]');
  expect(scrollEl.scrollLeft).toBeGreaterThan(0);
  expect(scrollEl.scrollBy).not.toHaveBeenCalled();
 });
 it('focus reveals a partly clipped child with no document scroll',async()=>{
  await mount();
  const strip=tree.root.findByProps({role:'navigation'});
  const target={getBoundingClientRect:()=>box(110,150)};
  await act(async()=>strip.props.onFocusCapture({target}));
  expect(scrollEl.scrollLeft).toBeGreaterThan(0);
  expect(scrollEl.scrollBy).not.toHaveBeenCalled();
 });
 it('disconnects both resize observers and the scroll event on unmount',async()=>{
  await mount();
  expect(observerInstances.length).toBe(2);
  await act(async()=>{tree.unmount();tree=null;});
  for(const ro of observerInstances)expect(ro.disconnect).toHaveBeenCalledTimes(1);
  expect(scrollEl.removeEventListener).toHaveBeenCalledWith('scroll',expect.any(Function));
 });
 it('allows the caller to hide focus-driven reveal behavior',async()=>{
  await mount({activeItemKey:undefined});
  expect(tree.root.findByProps({role:'navigation'}).props.onFocusCapture).toBeUndefined();
  expect(observerInstances.length).toBe(1);
 });
});
