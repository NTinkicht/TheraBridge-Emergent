// M4-08 Stage 2 mounted real workspace switcher. Exact membership and role
// binding; no automatic selection or cross-tenant context fallback.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
const mockRouter={replace:jest.fn(),push:jest.fn()};
let mockState, mockHandle;
jest.mock('next/navigation',()=>({useRouter:()=>mockRouter}));
jest.mock('@/components/auth/useSession',()=>({
 useSession:()=>({state:mockState,handle:mockHandle})
}));
jest.mock('@/lib/auth',()=>{
 const actual=jest.requireActual('@/lib/auth');
 return {...actual,authApi:{...actual.authApi,selectContext:jest.fn()}};
});
const {authApi}=require('../src/lib/auth');
const Page=require('../src/app/select-context/page').default;
const platform={type:'platform',role:'PLATFORM_ADMIN'};
const role=(membershipId,role,centerId)=>({type:'center',membershipId,role,centerId,
 centerName:'Fictional Center '+centerId,timezone:'Asia/Dubai'});
const staff=role('member-1','THERAPIST','center-one');
const coordinator=role('member-2','COORDINATOR','center-two');
const ready=(contexts=[platform,staff,coordinator])=>({
 status:'ready',data:{user:{id:'fake',email:'none@example.invalid'},
 csrfToken:'',contexts,permissions:[],activeContext:null}
});
let tree=null;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>get(id).props.onClick());
const html=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();mockState=ready();
 mockHandle=jest.fn(e=>{throw e;});
 authApi.selectContext.mockResolvedValue({});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const mount=async()=>act(async()=>{tree=create(h(Page));});
describe('Stage 2 workspace context selection fail-closed transitions',()=>{
 it('renders no selectable tenant options during loading or session failure',async()=>{
  mockState={status:'loading'};
  await mount();
  expect(get('context-list').findAllByType('button')).toHaveLength(0);
  await act(async()=>{mockState={status:'error',message:'Synthetic session denied'};
   tree.update(h(Page));});
  expect(get('select-context-load-error')).toBeTruthy();
  expect(authApi.selectContext).not.toHaveBeenCalled();
 });
 it('shows explicit no-role state instead of assigning a default center',async()=>{
  mockState=ready([]);
  await mount();
  expect(get('select-context-empty')).toBeTruthy();
  expect(authApi.selectContext).not.toHaveBeenCalled();
 });
 it('requests exactly the chosen membership AND role, never another center or elevated role',async()=>{
  await mount();
  expect(get('context-option-member-1-THERAPIST')).toBeTruthy();
  expect(get('context-option-member-2-COORDINATOR')).toBeTruthy();
  await click('context-option-member-2-COORDINATOR');
  expect(authApi.selectContext).toHaveBeenCalledWith({
   membershipId:'member-2',role:'COORDINATOR'});
  expect(authApi.selectContext).not.toHaveBeenCalledWith({
   membershipId:'member-1',role:'CENTER_ADMIN'});
  expect(mockRouter.replace).toHaveBeenCalledWith('/app');
 });
 it('does not send a center membership when selecting platform context',async()=>{
  await mount();
  await click('context-option-platform');
  expect(authApi.selectContext).toHaveBeenCalledWith({platform:true});
  expect(mockRouter.replace).toHaveBeenCalledWith('/app');
 });
 it('keeps failed context selection on current page and displays the server refusal',async()=>{
  authApi.selectContext.mockRejectedValue(new Error('Synthetic membership revoked'));
  await mount();
  await click('context-option-member-1-THERAPIST');
  expect(get('select-context-error')).toBeTruthy();
  expect(html()).toContain('Synthetic membership revoked');
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(get('context-option-member-1-THERAPIST').props.disabled).toBe(false);
 });
 it('does not let duplicate context clicks submit a second transition while pending',async()=>{
  let resolve;
  authApi.selectContext.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
  await mount();
  // Trigger without waiting for the unresolved network operation.
  await act(async()=>{get('context-option-member-1-THERAPIST').props.onClick();});
  expect(get('context-option-member-1-THERAPIST').props.disabled).toBe(true);
  expect(get('context-option-member-2-COORDINATOR').props.disabled).toBe(true);
  expect(authApi.selectContext).toHaveBeenCalledTimes(1);
  await act(async()=>{resolve({});await Promise.resolve();});
  expect(mockRouter.replace).toHaveBeenCalledWith('/app');
 });
});