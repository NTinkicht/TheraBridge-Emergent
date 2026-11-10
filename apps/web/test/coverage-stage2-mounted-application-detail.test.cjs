// Stage 2: render the real platform application detail route (previously
// unexecuted) with controlled session and source-bound synthetic server records.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let mockSession,mockHandle;
jest.mock('next/navigation',()=>({useParams:()=>({id:'application-fictional'})}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('@/components/auth/ProductShell',()=>({ProductShell:({children})=>
 h('main',null,children)}));
jest.mock('@/components/auth/useSession',()=>({useSession:()=>({
 state:mockSession,handle:mockHandle
})}));
jest.mock('@/components/applications/DecisionPanel',()=>({
 DecisionPanel:({canDecide,app,onChanged})=>h('section',{
  'data-testid':'synthetic-decision-panel','data-can-decide':canDecide,
  'data-app-id':app.id
 },h('button',{'data-testid':'synthetic-review-update',
  onClick:()=>onChanged({...app,status:'IN_REVIEW'})},'Simulate server review response'))
}));
jest.mock('@/lib/auth',()=>{
 const real=jest.requireActual('@/lib/auth');
 return {...real,authApi:{...real.authApi,application:jest.fn()}};
});
const {authApi}=require('../src/lib/auth');
const ApplicationDetailPage=require('../src/app/app/applications/[id]/page').default;
const app=(changes={})=>({
 id:'application-fictional',reference:'TB-FAKE-0001',
 organizationName:'Synthetic Center Alpha',city:'Sharjah',country:'UAE',
 timezone:'Asia/Dubai',contactName:'Fictional Contact',contactEmail:'example@example.invalid',
 contactPhone:null,specialties:['speech'],therapistEstimate:3,childEstimate:20,
 submittedAt:'2026-11-09T10:00:00Z',status:'SUBMITTED',message:'',
 events:[{id:'e1',type:'submitted',createdAt:'2026-11-09T10:00:00Z',
 actor:null,fromStatus:null,toStatus:'SUBMITTED',note:null}],...changes
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const json=()=>JSON.stringify(tree.toJSON());
const mount=async()=>act(async()=>{tree=create(h(ApplicationDetailPage));});
beforeEach(()=>{
 jest.clearAllMocks();authApi.application.mockReset();
 authApi.application.mockResolvedValue(app());
 mockHandle=jest.fn(e=>{throw e;});
 mockSession={status:'ready',data:{permissions:['platform.applications.read'],
  activeContext:{type:'platform',role:'PLATFORM_ADMIN'}}};
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('application detail real route and permission-scoped decision source',()=>{
 it('preserves loading access gate and never fetches prematurely',async()=>{
  mockSession={status:'loading'};
  await mount();
  expect(get('session-loading')).toBeTruthy();
  expect(authApi.application).not.toHaveBeenCalled();
 });
 it('preserves session error boundary without requesting private application',async()=>{
  mockSession={status:'error',message:'Synthetic sign-in expired'};
  await mount();
  expect(get('session-error')).toBeTruthy();
  expect(json()).toContain('Synthetic sign-in expired');
  expect(authApi.application).not.toHaveBeenCalled();
 });
 it('fetches only route parameter record and displays exact server fields/history',async()=>{
  await mount();
  expect(authApi.application).toHaveBeenCalledWith('application-fictional');
  expect(get('application-title').props.children).toBe('Synthetic Center Alpha');
  expect(get('application-reference').props.children).toBe('TB-FAKE-0001');
  expect(get('history-submitted')).toBeTruthy();
  expect(json()).toContain('example@example.invalid');
  expect(json()).toContain('No');
  expect(get('synthetic-decision-panel').props['data-can-decide']).toBe(false);
 });
 it('does not grant decision controls merely because detail is readable',async()=>{
  await mount();
  expect(get('synthetic-decision-panel').props['data-can-decide']).toBe(false);
  expect(get('synthetic-decision-panel').props['data-app-id']).toBe('application-fictional');
 });
 it('only enables decision capability with the explicit platform permission',async()=>{
  mockSession.data.permissions.push('platform.applications.decide');
  await mount();
  expect(get('synthetic-decision-panel').props['data-can-decide']).toBe(true);
 });
 it('shows retry after a server failure without inventing application content',async()=>{
  authApi.application.mockRejectedValueOnce(new Error('Synthetic server failure'))
   .mockResolvedValueOnce(app());
  await mount();
  expect(get('application-error')).toBeTruthy();
  expect(find('application-title')).toHaveLength(0);
  const retry=get('application-error').findAllByType('button')[0];
  await act(async()=>{retry.props.onClick();await Promise.resolve();});
  expect(get('application-title')).toBeTruthy();
  expect(authApi.application).toHaveBeenCalledTimes(2);
 });
 it('renders arbitrary event type verbatim but never infers an approval',async()=>{
  authApi.application.mockResolvedValue(app({events:[
   {id:'e2',type:'pending_external_review',createdAt:'2026-11-09T12:00:00Z',
    actor:null,fromStatus:null,toStatus:'SUBMITTED',note:'Synthetic auditor note'}
  ]}));
  await mount();
  expect(get('history-pending_external_review')).toBeTruthy();
  expect(json()).toContain('Synthetic auditor note');
  expect(json()).not.toContain('Center provisioned');
 });
});
