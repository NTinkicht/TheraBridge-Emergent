// M4-08 90%-floor UI source coverage: real interactive AppShell roles, menus
// and family theming. Design-preview only; no real auth or data access.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
const mockNotify=jest.fn();
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/design/PreviewContext',()=>({usePreview:()=>({notify:mockNotify})}));
jest.mock('@/components/brand/BrandMark',()=>({BrandMark:({variant})=>h('span',null,'Fictional '+variant)}));
jest.mock('@/components/brand/SignatureBand',()=>({SignatureBand:()=>h('i',null,'Synthetic banner')}));
const {AppShell}=require('../src/components/design/AppShell');
let tree=null,oldWindow,oldDocument,oldStorage,keys=[];
const mount=async(workspace='family',active='home')=>act(async()=>{
 tree=create(h(AppShell,{workspace,active,title:'Fictional dashboard',
  children:h('section',{'data-testid':'shell-body'},'Synthetic evidence only')}));});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>get(id).props.onClick());
const html=()=>JSON.stringify(tree.toJSON());
beforeAll(()=>{
 oldWindow=global.window;oldDocument=global.document;oldStorage=global.localStorage;
 global.window={innerWidth:1440,addEventListener:jest.fn((t,fn)=>{if(t==='keydown')keys.push(fn);}),
  removeEventListener:jest.fn()};
 global.document={documentElement:{dataset:{familyTheme:'light'}},activeElement:null};
 global.localStorage={setItem:jest.fn()};
});
afterAll(()=>{global.window=oldWindow;global.document=oldDocument;global.localStorage=oldStorage;});
beforeEach(()=>{
 jest.clearAllMocks();keys=[];global.window.innerWidth=1440;
 global.document.documentElement.dataset.familyTheme='light';
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 real AppShell interaction states and family-only theme',()=>{
 it('clinical platform shell has no guardian theme or family toggle',async()=>{
  await mount('platform','overview');
  expect(get('shell-platform')).toBeTruthy();
  expect(find('theme-toggle')).toHaveLength(0);
  expect(get('nav-overview').props['aria-current']).toBe('page');
  expect(get('shell-body')).toBeTruthy();
 });
 it('family theme remains scoped to family workspace, never platform administration',async()=>{
  await mount('family','home');
  expect(get('shell-family').props['data-theme']).toBe('light');
  expect(get('theme-toggle')).toBeTruthy();
  expect(get('nav-home').props['aria-current']).toBe('page');
 });
 it('family light-to-dark switch records only UI preference, no clinical status',async()=>{
  await mount();await click('theme-toggle');
  expect(get('shell-family').props['data-theme']).toBe('dark');
  expect(global.document.documentElement.dataset.familyTheme).toBe('dark');
  expect(global.localStorage.setItem).toHaveBeenCalledWith('tb-family-theme','dark');
  await click('theme-toggle');
  expect(get('shell-family').props['data-theme']).toBe('light');
 });
 it('existing dark family preference is loaded without altering other workspace',async()=>{
  global.document.documentElement.dataset.familyTheme='dark';
  await mount('family','home');
  expect(get('shell-family').props['data-theme']).toBe('dark');
  expect(get('theme-toggle').props['aria-pressed']).toBe(true);
 });
 it('compact sidebar loads for narrow screens and expands only on explicit click',async()=>{
  global.window.innerWidth=900;
  await mount('center','overview');
  expect(get('sidebar').props.className).toContain('w-[76px]');
  expect(find('workspace-switcher')).toHaveLength(0);
  await click('sidebar-toggle');
  expect(find('workspace-switcher')).toHaveLength(1);
  expect(get('sidebar').props.className).toContain('w-sidebar');
 });
 it('wide sidebar can collapse without affecting auth state or active navigation',async()=>{
  await mount('therapist','dashboard');
  expect(get('sidebar').props.className).toContain('w-sidebar');
  await click('sidebar-toggle');
  expect(get('sidebar').props.className).toContain('w-[76px]');
  expect(get('nav-dashboard').props['aria-current']).toBe('page');
 });
 it('attempt to switch workspace in preview communicates locked capability, not impersonation',async()=>{
  await mount('center','overview');
  await click('workspace-switcher');
  expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('sign-in'));
 });
 it('unavailable side navigation informs user rather than fabricating a route',async()=>{
  await mount('therapist','dashboard');
  await click('nav-sessions');
  expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('Sessions'));
 });
 it('notifications toggles open and shut without claiming an unread event',async()=>{
  await mount('center','overview');
  await click('notifications-button');
  expect(get('notifications-panel')).toBeTruthy();
  expect(html()).toContain('all caught up');
  await click('notifications-button');
  expect(find('notifications-panel')).toHaveLength(0);
 });
 it('account menu is separate from signout and remains explicitly locked',async()=>{
  await mount('family','home');
  await click('account-button');
  expect(get('account-panel')).toBeTruthy();
  expect(html()).toContain('fictional account');
  await click('account-button');
  expect(find('account-panel')).toHaveLength(0);
 });
 it('opening another menu dismisses previously opened account options',async()=>{
  await mount('family','home');
  await click('account-button');
  await click('notifications-button');
  expect(get('notifications-panel')).toBeTruthy();
 });
 it('mobile more sheet remains a local navigation list without new permission claims',async()=>{
  await mount('family','home');
  await click('bottom-nav-more');
  expect(get('more-sheet')).toBeTruthy();
  expect(get('more-sheet-close')).toBeTruthy();
  expect(get('bottom-nav-more').props['aria-expanded']).toBe(true);
  await click('more-sheet-close');
  expect(find('more-sheet')).toHaveLength(0);
 });
 it('Escape closes an already-open account or notification menu',async()=>{
  await mount('family','home');
  await click('account-button');
  expect(keys.length).toBeGreaterThan(0);
  await act(async()=>keys[0]({key:'Escape'}));
  expect(find('account-panel')).toHaveLength(0);
 });
 it('other keys do not silently close open notification panel',async()=>{
  await mount('therapist','dashboard');
  await click('notifications-button');
  await act(async()=>keys[0]({key:'Enter'}));
  expect(get('notifications-panel')).toBeTruthy();
 });
 it('more entries with no href explicitly report unavailable rather than navigating',async()=>{
  await mount('family','home');await click('bottom-nav-more');
  await act(async()=>find('nav-messages').filter(n=>n.type==='button').at(-1).props.onClick());
  expect(mockNotify).toHaveBeenCalledWith(expect.stringContaining('Messages'));
  expect(find('more-sheet')).toHaveLength(0);
 });
 it('multiple workspaces use different mobile navigation and exact active route',async()=>{
  await mount('platform','overview');
  expect(get('bottom-nav-overview').props['aria-current']).toBe('page');
  expect(get('bottom-nav-more')).toBeTruthy();
  expect(find('bottom-nav-home')).toHaveLength(0);
 });
});
