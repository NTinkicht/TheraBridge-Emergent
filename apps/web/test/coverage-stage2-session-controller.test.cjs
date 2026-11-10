// M4-08 Stage 2: mount the production session controller and exercise
// revocation, tenant timezone isolation, race suppression and fail-closed
// authorization redirects. No patient records or real credentials.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
const mockRouter={replace:jest.fn(),push:jest.fn(),refresh:jest.fn()};
let unauthorizedHandler=null;
jest.mock('next/navigation',()=>({useRouter:()=>mockRouter}));
jest.mock('@/lib/auth',()=>{
 const real=jest.requireActual('@/lib/auth');
 return {...real,authApi:{...real.authApi,session:jest.fn(),centerSummary:jest.fn()},
  onUnauthorized:jest.fn(fn=>{unauthorizedHandler=fn;return ()=>{unauthorizedHandler=null;};})};
});
jest.mock('@/lib/operations',()=>{
 const real=jest.requireActual('@/lib/operations');
 return {...real,setCenterTz:jest.fn()};
});
const {authApi,onUnauthorized}=require('../src/lib/auth');
const {setCenterTz}=require('../src/lib/operations');
const {ApiError}=require('../src/lib/api');
const {useSessionController}=require('../src/lib/session-context');
const center=(id='center-one',perms=['center.summary.read'])=>({
 csrfToken:'',user:{id:'fake',email:'none@example.invalid',displayName:'Synthetic'},
 contexts:[],permissions:perms,
 activeContext:{type:'center',centerId:id,role:'THERAPIST',membershipId:'m1',
  centerName:'Fictional Center'}
});
const platform=()=>({...center(),activeContext:{type:'platform',role:'PLATFORM_ADMIN'},
 permissions:['platform.centers.read']});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
let tree,controller;
const Probe=({enabled=true})=>{controller=useSessionController(enabled);return h('p',{'data-testid':'session-probe'},controller.state.status);};
async function mount(enabled=true){await act(async()=>{tree=create(h(Probe,{enabled}));});}
beforeEach(()=>{
 jest.clearAllMocks();unauthorizedHandler=null;controller=null;tree=null;
 authApi.session.mockResolvedValue(platform());
 authApi.centerSummary.mockResolvedValue({center:{timezone:'Asia/Dubai'}});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 Stage 2 mounted session controller security behavior',()=>{
 it('never loads a session or registers revocation hooks when disabled',async()=>{
  await mount(false);
  expect(controller.state.status).toBe('loading');
  expect(authApi.session).not.toHaveBeenCalled();
  expect(onUnauthorized).not.toHaveBeenCalled();
  expect(setCenterTz).not.toHaveBeenCalled();
 });
 it('loads a platform session without pretending it has center timezone privileges',async()=>{
  await mount();
  expect(controller.state).toMatchObject({status:'ready',
   data:{activeContext:{type:'platform'}}});
  expect(authApi.centerSummary).not.toHaveBeenCalled();
  expect(setCenterTz).toHaveBeenCalledWith(undefined);
 });
 it('uses only authorized center summary to set the active center timezone',async()=>{
  authApi.session.mockResolvedValue(center('c1'));
  await mount();
  expect(authApi.centerSummary).toHaveBeenCalledWith('c1');
  expect(setCenterTz).toHaveBeenCalledWith('Asia/Dubai');
  expect(controller.state.status).toBe('ready');
 });
 it('does not fetch center summary if current center role lacks summary.read',async()=>{
  authApi.session.mockResolvedValue(center('c1',[]));
  await mount();
  expect(authApi.centerSummary).not.toHaveBeenCalled();
  expect(controller.state.status).toBe('ready');
  expect(setCenterTz).toHaveBeenCalledWith(undefined);
 });
 it('redirects on expired 401 without exposing stale ready session state',async()=>{
  authApi.session.mockRejectedValue(new ApiError(401,'expired'));
  await mount();
  expect(mockRouter.replace).toHaveBeenCalledWith('/login?expired=1');
  expect(controller.state.status).toBe('loading');
  expect(setCenterTz).toHaveBeenCalledWith(undefined);
 });
 it('reports non-auth transient failures rather than granting a prior context',async()=>{
  authApi.session.mockRejectedValue(new Error('Synthetic transport unavailable'));
  await mount();
  expect(controller.state).toEqual({status:'error',message:'Synthetic transport unavailable'});
  expect(mockRouter.replace).not.toHaveBeenCalled();
 });
 it('handles a broadcast unauthorized event by clearing center timezone and revoking UI state',async()=>{
  authApi.session.mockResolvedValue(center('c1'));
  await mount();
  expect(controller.state.status).toBe('ready');
  expect(typeof unauthorizedHandler).toBe('function');
  await act(async()=>unauthorizedHandler());
  expect(controller.state.status).toBe('loading');
  expect(setCenterTz).toHaveBeenLastCalledWith(undefined);
  expect(mockRouter.replace).toHaveBeenCalledWith('/login?expired=1');
 });
 it('keeps 403/404 separate from 401, and rethrows unexpected runtime failures',async()=>{
  await mount();
  await act(async()=>controller.handle(new ApiError(403,'unauthorized')));
  expect(mockRouter.replace).toHaveBeenCalledWith('/access-denied');
  await act(async()=>controller.handle(new ApiError(404,'not assigned')));
  expect(mockRouter.replace).toHaveBeenCalledWith('/access-denied');
  await act(async()=>controller.handle(new ApiError(401,'expired')));
  expect(mockRouter.replace).toHaveBeenCalledWith('/login?expired=1');
  expect(setCenterTz).toHaveBeenCalledWith(undefined);
  expect(()=>controller.handle(new Error('Synthetic unhandled'))).toThrow('Synthetic unhandled');
 });
 it('discards slow prior-center responses when a later reload selects a new tenant',async()=>{
  const first=deferred(),second=deferred();
  authApi.session.mockImplementationOnce(()=>first.promise).mockImplementationOnce(()=>second.promise);
  await mount();
  const reload=controller.reload;
  let newer;
  await act(async()=>{newer=reload();});
  await act(async()=>{second.resolve(center('new-center',[]));await newer;});
  expect(controller.state).toMatchObject({status:'ready',data:{activeContext:{centerId:'new-center'}}});
  await act(async()=>{first.resolve(center('old-center'));await first.promise;});
  expect(controller.state.data.activeContext.centerId).toBe('new-center');
  expect(authApi.centerSummary).not.toHaveBeenCalledWith('old-center');
 });
});