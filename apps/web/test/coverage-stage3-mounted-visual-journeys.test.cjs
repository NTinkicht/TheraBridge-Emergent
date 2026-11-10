// M4-08 Stage 3: real design-preview shell, screen routes and data-state
// switching are mounted and exercised. These are fictional UI fixtures,
// not evidence of actual scheduling, patient care or production release.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('next/navigation',()=>({usePathname:()=>'/design-preview/therapist'}));
jest.mock('@/components/brand/BrandMark',()=>({BrandMark:()=>h('span',null,'TheraBridge')}));
jest.mock('@/components/brand/SignatureBand',()=>({SignatureBand:()=>h('span',null,'Synthetic demo')}));
jest.mock('@/components/design/ScrollStrip',()=>({
 ScrollStrip:({children,testId,role,ariaLabel})=>h('div',{'data-testid':testId,
  role,'aria-label':ariaLabel},children)
}));
jest.mock('@/components/design/useNow',()=>({useNow:()=>new Date('2026-11-10T09:00:00Z')}));
jest.mock('@/components/design/states',()=>{
 const a=jest.requireActual('@/components/design/states');
 return {...a,Dialog:({open,children,footer,testId,title})=>open?
  h('section',{'data-testid':testId},h('h2',null,title),children,h('footer',null,footer)):null};
});
const {PreviewProvider}=require('../src/components/design/PreviewContext');
const {AppShell}=require('../src/components/design/AppShell');
const TherapistPreview=require('../src/app/design-preview/therapist/page').default;
const CenterPreview=require('../src/app/design-preview/center/page').default;
const DirectionPage=require('../src/app/design-preview/page').default;
let tree,oldWindow,oldDoc,oldLocalStorage;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const select=async(state)=>act(async()=>get('preview-data-state').props.onChange({
 target:{value:state}
}));
const mount=async(Component=TherapistPreview,provider=true)=>act(async()=>{tree=create(
 provider?h(PreviewProvider,null,h(Component)):h(Component)
);});
beforeAll(()=>{
 oldWindow=global.window;oldDoc=global.document;oldLocalStorage=global.localStorage;
 global.window={innerWidth:1440,addEventListener:jest.fn(),removeEventListener:jest.fn()};
 global.document={documentElement:{dataset:{familyTheme:'light'}},
 activeElement:null,addEventListener:jest.fn(),removeEventListener:jest.fn()};
 global.localStorage={setItem:jest.fn()};
});
afterAll(()=>{global.window=oldWindow;global.document=oldDoc;global.localStorage=oldLocalStorage;});
beforeEach(()=>jest.clearAllMocks());
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real preview visual journeys and honest data-state transitions',()=>{
 it('shows deterministic synthetic fixture banner and correct therapist workspace',async()=>{
  await mount();
  expect(get('preview-synthetic-label')).toBeTruthy();
  expect(get('shell-therapist')).toBeTruthy();
  expect(get('badge-today')).toBeTruthy();
  expect(get('agenda-card')).toBeTruthy();
  expect(get('appointment-detail')).toBeTruthy();
  expect(get('open-child-workspace').props.href).toMatch(/^\/design-preview\/child\?specialty=/);
 });
 it('switches specialty without silently mixing appointments from another discipline',async()=>{
  await mount();
  const first=JSON.stringify(tree.toJSON());
  expect(get('specialty-speech').props['aria-checked']).toBe(true);
  await click('specialty-ot');
  expect(get('specialty-ot').props['aria-checked']).toBe(true);
  expect(get('specialty-speech').props['aria-checked']).toBe(false);
  expect(get('appointment-detail')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).not.toBe(first);
 });
 it('changes real agenda layout while preserving selected child evidence',async()=>{
  await mount();await click('view-list');
  expect(get('view-list').props['aria-pressed']).toBe(true);
  expect(find('agenda-timeline')).toHaveLength(0);
  await click('view-timeline');
  expect(get('agenda-timeline')).toBeTruthy();
 });
 it('uses shared provider to show loading, empty and retry states independently of fixtures',async()=>{
  await mount();await select('loading');
  expect(get('agenda-loading')).toBeTruthy();
  expect(find('appointment-detail')).toHaveLength(1);
  await select('empty');
  expect(get('agenda-empty')).toBeTruthy();
  expect(find('agenda-timeline')).toHaveLength(0);
  await select('error');
  expect(get('agenda-error')).toBeTruthy();
  const retry=get('agenda-error').findAllByType('button')[0];
  await act(async()=>retry.props.onClick());
  expect(get('agenda-timeline')).toBeTruthy();
 });
 it('switches preview shell sidebar and exposes notifications as explicitly future work',async()=>{
  await mount();
  expect(get('sidebar')).toBeTruthy();
  await click('sidebar-toggle');
  expect(get('sidebar-toggle').props['aria-label']).toBe('Expand sidebar');
  await click('notifications-button');
  expect(get('notifications-panel')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('arrives in Phase 3');
 });
 it('shows center trial enforcement as preview-only, with honest role limits',async()=>{
  await mount(CenterPreview);
  expect(get('shell-center')).toBeTruthy();
  expect(get('trial-banner')).toBeTruthy();
  expect(get('usage-card')).toBeTruthy();
  expect(get('onboarding-card')).toBeTruthy();
  expect(get('staff-card')).toBeTruthy();
  expect(get('convert-locked')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('Limits are enforced on the server');
 });
 it('never claims invitation revoke succeeded from center visual-only fixtures',async()=>{
  await mount(CenterPreview);
  expect(get('invite-revoke')).toBeTruthy();
  await click('invite-revoke');
  expect(get('revoke-dialog')).toBeTruthy();
  await click('revoke-confirm');
  expect(find('revoke-dialog')).toHaveLength(0);
  expect(get('preview-notice')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('Preview only: nothing was revoked');
 });
 it('does not claim pending invitation was resent from a preview control',async()=>{
  await mount(CenterPreview);await click('invite-resend');
  expect(get('preview-notice')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('no invitation was resent');
 });
 it('renders error and empty state for trial-session preview rather than stale operational data',async()=>{
  await mount(CenterPreview);await select('empty');
  expect(get('staff-empty')).toBeTruthy();
  expect(get('sessions-empty')).toBeTruthy();
  await select('error');
  expect(get('staff-error')).toBeTruthy();
  expect(get('sessions-error')).toBeTruthy();
 });
 it('preserves explicit 320px mobile design and locked family release documentation',async()=>{
  await mount(DirectionPage,false);
  expect(get('page-title')).toBeTruthy();
  expect(get('tokens-card')).toBeTruthy();
  expect(get('type-card')).toBeTruthy();
  expect(get('responsive-card')).toBeTruthy();
  expect(get('screen-card-therapist-daily-view').props.href).toBe('/design-preview/therapist');
  expect(JSON.stringify(tree.toJSON())).toContain('Release to guardian');
 });
 it('renders the family preview shell with a local-only dark theme toggle',async()=>{
  await mount(()=>h(AppShell,{workspace:'family',active:'home',title:'Fictional family home'},
   h('p',null,'Synthetic family content')));
  expect(get('shell-family').props['data-theme']).toBe('light');
  expect(get('theme-toggle').props['aria-pressed']).toBe(false);
  await click('theme-toggle');
  expect(get('shell-family').props['data-theme']).toBe('dark');
  expect(get('theme-toggle').props['aria-pressed']).toBe(true);
  expect(global.document.documentElement.dataset.familyTheme).toBe('dark');
  expect(global.localStorage.setItem).toHaveBeenCalledWith('tb-family-theme','dark');
  await click('theme-toggle');
  expect(get('shell-family').props['data-theme']).toBe('light');
 });
 it('opens and closes synthetic account menu without issuing real logout',async()=>{
  await mount();
  await click('account-button');
  expect(get('account-panel')).toBeTruthy();
  expect(get('sign-out-locked')).toBeTruthy();
  await click('account-button');
  expect(find('account-panel')).toHaveLength(0);
 });
 it('only announces unavailable navigation in a preview rather than fabricating a route',async()=>{
  await mount(CenterPreview);
  await click('nav-team');
  expect(get('preview-notice')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('outside this design preview');
  expect(find('account-panel')).toHaveLength(0);
 });
 it('keeps mobile More navigation accessible and closes it without replacing page content',async()=>{
  global.window.innerWidth=390;
  await mount();
  expect(get('sidebar-toggle').props['aria-label']).toBe('Expand sidebar');
  await click('bottom-nav-more');
  expect(get('more-sheet')).toBeTruthy();
  expect(get('more-sheet').props['aria-modal']).toBe('true');
  await click('more-sheet-close');
  expect(find('more-sheet')).toHaveLength(0);
  expect(get('agenda-card')).toBeTruthy();
  global.window.innerWidth=1440;
 });
 it('opens and closes the real design direction confirmation UI',async()=>{
  await mount(DirectionPage,false);
  await click('demo-dialog-open');
  expect(get('demo-dialog')).toBeTruthy();
 });
});
