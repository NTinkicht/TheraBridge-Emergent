// M4-08: exercise real signed-in home role dispatch, permission-scoped
// dashboards and setup progress. Synthetic-only responses; no network.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let hook;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/auth/useSession',()=>({useSession:()=>hook}));
jest.mock('@/components/auth/ProductShell',()=>({ProductShell:({session,active,children,planned})=>
 h('main',{'data-testid':'home-shell','data-active':active,'data-role':session.activeContext?.role},
  children,planned.length&&h('p',{'data-testid':'planned-units'},'Still restricted'))}));
jest.mock('@/components/operations/Dashboards',()=>({CenterDashboard:({centerId,isTherapist})=>
 h('section',{'data-testid':'synthetic-center-dashboard','data-center':centerId,'data-therapist':isTherapist})}));
jest.mock('@/components/operations/FamilyHome',()=>({FamilyHome:({centerId})=>
 h('section',{'data-testid':'synthetic-family-home','data-center':centerId})}));
jest.mock('@/components/auth/Field',()=>({FormAlert:({children,testId,tone})=>
 h('p',{'data-testid':testId,'data-tone':tone},children)}));
jest.mock('@/components/design/states',()=>({SkeletonRows:({rows,testId})=>
 h('p',{'data-testid':testId},'Loading '+rows)}));
jest.mock('@/components/design/ui',()=>({
 Card:({children,testId})=>h('section',{'data-testid':testId},children),
 Meter:({label,value,max,testId})=>h('div',{'data-testid':testId},label+':'+value+'/'+max),
 Metric:({label,value,testId})=>h('div',{'data-testid':testId},label+':'+value)
}));
jest.mock('@/lib/centers',()=>{
 const a=jest.requireActual('@/lib/centers');
 return {...a,centersApi:{...a.centersApi,setup:jest.fn()}};
});
jest.mock('@/lib/auth',()=>{
 const a=jest.requireActual('@/lib/auth');
 return {...a,authApi:{...a.authApi,platformSummary:jest.fn(),centerSummary:jest.fn()}};
});
const {authApi}=require('../src/lib/auth');
const {centersApi}=require('../src/lib/centers');
const Home=require('../src/app/app/page').default;
const ctx=(role='CENTER_ADMIN')=>({type:'center',centerId:'centre-a',centerName:'Fictional Centre',role});
const session=(extra={})=>({
 user:{displayName:'Fictional Operator',id:'user-a',email:'operator@example.invalid'},
 permissions:[],contexts:[],activeContext:null,...extra
});
let tree;
const mount=async()=>act(async()=>{tree=create(h(Home));});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const text=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();
 hook={state:{status:'ready',data:session()},handle:jest.fn()};
 authApi.platformSummary.mockReset().mockResolvedValue({centers:4,activeCenters:3,pendingApplications:2});
 authApi.centerSummary.mockReset().mockResolvedValue({center:{name:'Fictional Centre',timezone:'Asia/Dubai'},activeMembers:5});
 centersApi.setup.mockReset().mockResolvedValue({done:2,total:4});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real home page respects session and exact role boundaries',()=>{
 it('loading session shows only a safe skeleton',async()=>{
  hook.state={status:'loading'};
  await mount();
  expect(get('session-loading')).toBeTruthy();
  expect(find('home-shell')).toHaveLength(0);
 });
 it('session error shows only its error boundary without a stale dashboard',async()=>{
  hook.state={status:'error',message:'Fictional session expired'};
  await mount();
  expect(get('session-error')).toBeTruthy();
  expect(find('home-shell')).toHaveLength(0);
 });
 it('one context missing shows role guidance instead of private center content',async()=>{
  hook.state.data=session();
  await mount();
  expect(get('home-no-context')).toBeTruthy();
  expect(find('synthetic-center-dashboard')).toHaveLength(0);
  expect(find('home-summary')).toHaveLength(0);
  expect(text()).toContain('ask your center administrator');
 });
 it('multiple available contexts require explicit workspace selection',async()=>{
  hook.state.data=session({contexts:[ctx('THERAPIST'),ctx('COORDINATOR')]});
  await mount();
  expect(get('home-no-context')).toBeTruthy();
  expect(text()).toContain('/select-context');
 });
 it('center therapist with summary permission sees only assigned-children dashboard',async()=>{
  hook.state.data=session({activeContext:ctx('THERAPIST'),
   permissions:['center.summary.read']});
  await mount();
  expect(get('synthetic-center-dashboard').props).toMatchObject({
   'data-center':'centre-a','data-therapist':true
  });
  expect(find('synthetic-family-home')).toHaveLength(0);
  expect(authApi.centerSummary).toHaveBeenCalledWith('centre-a');
  expect(authApi.platformSummary).not.toHaveBeenCalled();
 });
 it('center administrator with summary permission sees nontherapist operational dashboard',async()=>{
  hook.state.data=session({activeContext:ctx(),permissions:['center.summary.read']});
  await mount();
  expect(get('synthetic-center-dashboard').props['data-therapist']).toBe(false);
 });
 it('guardian with family portal permission is routed only to authorized family view',async()=>{
  hook.state.data=session({activeContext:ctx('GUARDIAN'),permissions:['family.portal.read']});
  await mount();
  expect(get('synthetic-family-home').props['data-center']).toBe('centre-a');
  expect(find('synthetic-center-dashboard')).toHaveLength(0);
  expect(authApi.centerSummary).not.toHaveBeenCalled();
 });
 it('unknown active role without feature permission receives no fabricated dashboard',async()=>{
  hook.state.data=session({activeContext:ctx('COORDINATOR')});
  await mount();
  expect(get('home-role-pending')).toBeTruthy();
  expect(find('synthetic-family-home')).toHaveLength(0);
  expect(find('synthetic-center-dashboard')).toHaveLength(0);
 });
 it('platform summary shows only platform-wide metrics from authorized response',async()=>{
  hook.state.data=session({activeContext:{type:'platform',role:'PLATFORM_ADMIN'},
   permissions:['platform.summary.read']});
  await mount();
  expect(authApi.platformSummary).toHaveBeenCalledTimes(1);
  expect(get('home-summary')).toBeTruthy();
  expect(get('metric-pending-applications')).toBeTruthy();
  expect(get('metric-centers')).toBeTruthy();
  expect(get('metric-active-centers')).toBeTruthy();
  expect(get('metric-pending-link').props.href).toBe('/app/applications?status=OPEN');
 });
 it('platform role without summary permission sees restricted notice, not totals',async()=>{
  hook.state.data=session({activeContext:{type:'platform',role:'PLATFORM_ADMIN'},permissions:[]});
  await mount();
  expect(find('home-summary')).toHaveLength(0);
  expect(get('home-role-pending')).toBeTruthy();
  expect(authApi.platformSummary).not.toHaveBeenCalled();
 });
 it('platform summary fetch failure is handled through session error handler',async()=>{
  const err=Error('Synthetic network denial');
  authApi.platformSummary.mockRejectedValueOnce(err);
  hook.state.data=session({activeContext:{type:'platform',role:'PLATFORM_ADMIN'},
   permissions:['platform.summary.read']});
  await mount();
  expect(hook.handle).toHaveBeenCalledWith(err);
  expect(find('home-summary')).toHaveLength(0);
  expect(get('home-summary-loading')).toBeTruthy();
 });
 it('center setup banner appears only with explicit setup permission and incomplete work',async()=>{
  hook.state.data=session({activeContext:ctx(),permissions:['center.setup.manage']});
  await mount();
  expect(centersApi.setup).toHaveBeenCalledWith('centre-a');
  expect(get('home-setup-banner')).toBeTruthy();
  expect(get('home-setup-meter')).toBeTruthy();
  expect(get('home-setup-link').props.href).toBe('/app/setup');
 });
 it('fully completed setup does not show a redundant action banner',async()=>{
  centersApi.setup.mockResolvedValueOnce({done:4,total:4});
  hook.state.data=session({activeContext:ctx(),permissions:['center.setup.manage']});
  await mount();
  expect(find('home-setup-banner')).toHaveLength(0);
 });
 it('failed setup preflight never pretends center onboarding is complete',async()=>{
  centersApi.setup.mockRejectedValueOnce(Error('Synthetic timeout'));
  hook.state.data=session({activeContext:ctx(),permissions:['center.setup.manage']});
  await mount();
  expect(find('home-setup-banner')).toHaveLength(0);
 });
 it('role without setup.manage never fetches private setup steps',async()=>{
  hook.state.data=session({activeContext:ctx('THERAPIST'),permissions:['center.summary.read']});
  await mount();
  expect(centersApi.setup).not.toHaveBeenCalled();
  expect(find('home-setup-banner')).toHaveLength(0);
 });
 it('restricted clinical signing is shown as future work, never as enabled',async()=>{
  hook.state.data=session({activeContext:ctx(),permissions:['center.summary.read']});
  await mount();
  expect(get('planned-clinical-signing-approval-and-release')).toBeTruthy();
  expect(text()).toContain('not built yet');
 });
});
