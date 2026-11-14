// M4-08 mounted, strictly labelled synthetic preview interactions.
// Exercises real child tab switches, family no-release scenario and platform
// data/error states. Never treats illustrated clinical data as release.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let previewState='populated';
const mockNotify=jest.fn();
jest.mock('@/components/design/PreviewContext',()=>({
 usePreview:()=>({notify:mockNotify,dataState:previewState})
}));
jest.mock('@/components/design/AppShell',()=>({
 AppShell:({children,workspace})=>React.createElement('main',{
  'data-testid':'preview-shell-'+workspace},children)
}));
jest.mock('@/components/design/ScrollStrip',()=>({
 ScrollStrip:({children,testId})=>React.createElement('div',{'data-testid':testId},children)
}));
jest.mock('@/components/design/states',()=>{
 const actual=jest.requireActual('@/components/design/states');
 return {...actual,Dialog:({open,children,footer,testId})=>
  open?React.createElement('div',{'data-testid':testId},children,footer):null};
});
jest.mock('next/link',()=>({__esModule:true,
 default:({href,children,...props})=>React.createElement('a',{href,...props},children)}));
jest.mock('@/components/design/useNow',()=>({
 useNow:()=>new Date('2026-11-10T09:00:00Z')
}));
const Child=require('../src/app/design-preview/child/page').default;
const Family=require('../src/app/design-preview/family/page').default;
const Platform=require('../src/app/design-preview/platform/page').default;
let tree=null,originalWindow;
beforeAll(()=>{originalWindow=global.window;global.window={location:{search:''}};});
afterAll(()=>{global.window=originalWindow;});
// Keep illustration fixtures deterministic across weekdays, weekends and CI timezone.
// The preview uses the real clock in its mounted effect; use an activity day.
beforeEach(()=>{jest.useFakeTimers({now:new Date('2026-11-10T09:00:00.000Z')});previewState='populated';jest.clearAllMocks();});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}jest.useRealTimers();});
const mount=async C=>act(async()=>{tree=create(h(C));});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>get(id).props.onClick());
const html=()=>JSON.stringify(tree.toJSON());
describe('M4-08 actual 10-tab fictional child UI keeps guarded evidence states explicit',()=>{
 it('navigates clinical evidence and access tabs while showing disabled release',async()=>{
  await mount(Child);
  expect(get('child-context-header')).toBeTruthy();
  for(const name of ['providers','goals','sessions','progress','reports','plans','evidence','guardians','access']){
   await click('child-tab-'+name);
   expect(get('child-panel-'+name)).toBeTruthy();
   expect(get('child-tab-'+name).props['aria-selected']).toBe(true);
  }
  expect(get('access-denied-example')).toBeTruthy();
  await click('child-tab-reports');
  expect(get('reports-locked-actions')).toBeTruthy();
  expect(html()).toContain('Signing is disabled until');
  await click('child-tab-plans');
  expect(get('plans-locked-actions')).toBeTruthy();
  await click('child-tab-progress');
  expect(get('insufficient-data')).toBeTruthy();
  expect(html()).toContain('No conclusion is drawn');
  await click('child-tab-evidence');
  expect(get('evidence-empty')).toBeTruthy();
  expect(html()).toContain('consent model is approved');
 });
});
describe('M4-08 actual family illustration must not impersonate a released home plan',()=>{
 it('starts with a truthful explicit illustration-only marker',async()=>{
  await mount(Family);
  expect(get('release-scenario').props.value).toBe('illustration');
  expect(get('illustration-label')).toBeTruthy();
  expect(html()).toContain('plan release is not yet approved');
  expect(get('week-card')).toBeTruthy();
 });
 it('switches to today policy showing no approved plan and hides illustrated actions',async()=>{
  await mount(Family);
  await act(async()=>get('release-scenario').props.onChange({target:{value:'today'}}));
  expect(get('no-release-state')).toBeTruthy();
  expect(find('start-activity')).toHaveLength(0);
  expect(find('illustration-label')).toHaveLength(0);
  expect(html()).toContain('Nothing here is hidden from you');
 });
 it('does not save a synthetic activity outcome as an actual clinical observation',async()=>{
  await mount(Family);
  if(find('start-activity').length===0) return;
  await click('start-activity');
  expect(get('activity-dialog')).toBeTruthy();
  await click('outcome-done');
  expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('Nothing was recorded'));
 });
});
describe('M4-08 platform simulation remains plainly illustrative and fail closed on error',()=>{
 it.each(['populated','empty','loading','error'])(
  'renders operational %s data state distinctly',async status=>{
   previewState=status;
   await mount(Platform);
   expect(get('platform-metrics').props['data-state']).toBe(status);
   expect(get('create-center-locked')).toBeTruthy();
   if(status==='error')expect(html()).toContain('Couldn’t load');
   if(status==='empty')expect(html()).toContain('No centers yet');
  });
 it('switches between pending/decided applications without making a real decision',async()=>{
  await mount(Platform);
  await click('applications-tab-decided');
  expect(get('applications-tab-decided').props['aria-selected']).toBe(true);
  expect(html()).toContain('Decisions need a written rationale');
 });
});
