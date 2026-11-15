// M4-08: actual root navigation, non-indexable synthetic landing, preview
// theme init, and original feasibility/QA status badges. These are real Next
// route/component imports (only runtime host primitives are mocked).
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let jarHas;
const redirect=jest.fn();
jest.mock('next/headers',()=>({cookies:()=>({has:cookie=>jarHas.includes(cookie)})}));
jest.mock('next/navigation',()=>({redirect:route=>redirect(route)}));
jest.mock('@/components/design/PreviewContext',()=>({
 PreviewProvider:({children})=>h('section',{'data-testid':'preview-provider'},children)
}));
jest.mock('@fontsource/ibm-plex-sans/400.css',()=>{}, {virtual:true});
jest.mock('@fontsource/ibm-plex-sans/500.css',()=>{}, {virtual:true});
jest.mock('@fontsource/ibm-plex-sans/600.css',()=>{}, {virtual:true});
jest.mock('@fontsource/ibm-plex-sans/700.css',()=>{}, {virtual:true});
jest.mock('@fontsource/plus-jakarta-sans/600.css',()=>{}, {virtual:true});
jest.mock('@fontsource/plus-jakarta-sans/700.css',()=>{}, {virtual:true});
jest.mock('../src/app/globals.css',()=>{}, {virtual:true});
const Home=require('../src/app/page').default;
const root=require('../src/app/layout');
const preview=require('../src/app/design-preview/layout');
const {WorkUnits}=require('../src/components/feasibility/WorkUnits');
const {StatusPill}=require('../src/components/ui/StatusPill');
let tree;
const mount=async n=>act(async()=>{tree=create(n);});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const get=id=>tree.root.findByProps({'data-testid':id});
const json=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{jest.clearAllMocks();jarHas=[];});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 root navigation is only a convenience, never auth authority',()=>{
 test('without authenticated session cookie redirects into login',()=>{
  Home();
  expect(redirect).toHaveBeenCalledTimes(1);
  expect(redirect).toHaveBeenCalledWith('/login');
 });
 test.each(['__Host-tb_session','tb_session'])('session cookie %s redirects to app for authoritative server validation',cookie=>{
  jarHas=[cookie];
  Home();
  expect(redirect).toHaveBeenCalledWith('/app');
 });
 test('unrelated cookie cannot be mistaken for an authenticated TheraBridge session',()=>{
  jarHas=['arbitrary-cookie'];
  Home();
  expect(redirect).toHaveBeenCalledWith('/login');
 });
 test('root metadata prevents indexing of synthetic clinical demonstration',()=>{
  expect(root.metadata.robots).toEqual({index:false,follow:false});
  expect(root.metadata.description).toContain('Not for clinical use');
  expect(root.metadata.icons.icon).toEqual(expect.arrayContaining([expect.objectContaining({url:'/brand/favicon.ico'})]));
 });
 test('root layout preserves exactly one English HTML/body container for children',async()=>{
  await mount(h(root.default,null,h('p',{'data-testid':'synthetic-child'},'Fictional output')));
  expect(tree.root.findByType('html').props.lang).toBe('en');
  expect(tree.root.findByType('body').props.className).toContain('min-h-screen');
  expect(get('synthetic-child')).toBeTruthy();
  expect(json()).toContain('Fictional output');
 });
});
describe('design preview never promotes demo theme to clinical authorization',()=>{
 test('preview metadata stays nonindexed and states no connection to API',()=>{
  expect(preview.metadata.robots).toEqual({index:false,follow:false});
  expect(preview.metadata.description).toContain('Not connected to the API');
  expect(preview.metadata.description).toContain('Not for clinical use');
 });
 test('theme initialization runs only as a contained pre-paint script with default light fallback',async()=>{
  await mount(h(preview.default,null,h('p',{'data-testid':'preview-child'},'Synthetic preview')));
  expect(get('preview-provider')).toBeTruthy();
  expect(get('preview-child')).toBeTruthy();
  const scripts=tree.root.findAllByType('script');
  expect(scripts).toHaveLength(1);
  const code=scripts[0].props.dangerouslySetInnerHTML.__html;
  expect(code).toContain("q==='dark'||q==='light'");
  expect(code).toContain("t==='dark'?'dark':'light'");
  expect(code).not.toContain('accessGranted');
  expect(code).not.toContain('clinicalAuthorization');
 });
});
describe('source-rendered work-unit labels are explicit status, not clinical acceptance',()=>{
 test.each([
  ['IMPLEMENTED','Hammer'],
  ['TESTED: PASS','CheckCircle'],
  ['TESTED: FAIL','XCircle'],
  ['PLANNED','CircleDashed'],
  ['NOT RUN','CircleSlash']
 ])('renders original declared work status %s without relabeling it',(status)=>{
  // Icons are represented by the real Lucide components in the render tree.
  return mount(h(StatusPill,{status,testId:'status'})).then(()=>{
   expect(get('status').props.children[1]).toBe(status);
   expect(json()).toContain(status);
  });
 });
 test('work unit card displays every original record as individually identifiable status evidence',async()=>{
  await mount(h(WorkUnits));
  expect(get('work-units-card')).toBeTruthy();
  for(const id of ['TB-EM-000','TB-EM-000-api-tests','TB-EM-000-compose',
   'TB-EM-000-ci','TB-EM-001-cp0','TB-EM-001','TB-EM-002',
   'TB-EM-003/004','TB-EM-005','TB-EM-006']){
    expect(find('work-unit-'+id)).toHaveLength(1);
    expect(find('work-unit-'+id+'-status')).toHaveLength(1);
  }
  expect(json()).toContain('Clinical workflows and the parent portal come next');
 });
 test('pending work is rendered as PLANNED rather than completed or approved',async()=>{
  await mount(h(WorkUnits));
  expect(get('work-unit-TB-EM-005-status').props.children[1]).toBe('PLANNED');
  expect(get('work-unit-TB-EM-006-status').props.children[1]).toBe('PLANNED');
 });
});
