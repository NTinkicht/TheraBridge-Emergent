// M4-08 mounted application queue: auth gate, stale-fetch race, status
// filtering, query and paging. Source page/hooks execute; backend mocked.
const React=require('react');
const Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let state=null;
jest.mock('@/components/auth/useSession',()=>({
 useSession:()=>({state,handle:jest.fn(e=>{throw e;})})
}));
jest.mock('@/components/auth/ProductShell',()=>({
 ProductShell:({children})=>React.createElement('main',null,children)
}));
jest.mock('next/link',()=>({__esModule:true,
 default:({children,href,...props})=>React.createElement('a',{href,...props},children)}));
jest.mock('@/lib/auth',()=>{
 const real=jest.requireActual('@/lib/auth');
 return {...real,authApi:{...real.authApi,listApplications:jest.fn()}};
});
const {authApi}=require('../src/lib/auth');
const ApplicationsPage=require('../src/app/app/applications/page').default;
let tree=null,origWindow;
const user=permissions=>({user:{id:'p1',displayName:'Fictional Admin',email:'none@example.invalid'},
 csrfToken:'',permissions,contexts:[],activeContext:{type:'platform',role:'PLATFORM_ADMIN'}});
const app=(id,status='SUBMITTED')=>({id,organizationName:'Synthetic Center '+id,
 reference:'APP-'+id,contactName:'Fictional Contact',country:'AE',city:'Sharjah',
 submittedAt:'2026-11-10T10:00:00Z',status});
const payload=(items=[],total=items.length)=>({items,total,page:1,pageSize:1,
 counts:{SUBMITTED:1,UNDER_REVIEW:1,APPROVED:0,REJECTED:0}});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const click=async id=>act(async()=>get(id).props.onClick());
beforeAll(()=>{origWindow=global.window;global.window={location:{search:''}};});
afterAll(()=>{global.window=origWindow;});
beforeEach(()=>{jest.clearAllMocks();state={status:'ready',data:user(['platform.applications.read'])};
 authApi.listApplications.mockImplementation(async()=>payload([app('1')],1));});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const mount=async()=>act(async()=>{tree=create(h(ApplicationsPage));});
describe('M4-08 mounted application review queue never leaks platform-only information',()=>{
 it('gates entire queue for a caller missing platform read permission',async()=>{
  state={status:'ready',data:user([])};
  await mount();
  expect(get('applications-forbidden')).toBeTruthy();
  expect(find('applications-list')).toHaveLength(0);
  expect(authApi.listApplications).not.toHaveBeenCalled();
 });
 it('distinguishes a loading/expired session from access to applicant records',async()=>{
  state={status:'loading'};
  await mount();expect(get('session-loading')).toBeTruthy();
  state={status:'error',message:'Synthetic session expired'};
  await act(async()=>tree.update(h(ApplicationsPage)));
  expect(get('session-error')).toBeTruthy();
  expect(authApi.listApplications).not.toHaveBeenCalled();
 });
 it('loads only requested status and renders actual returned application metadata',async()=>{
  await mount();
  expect(authApi.listApplications).toHaveBeenCalledWith({
   status:'OPEN',q:undefined,page:1
  });
  expect(get('application-row-APP-1').props.href).toBe('/app/applications/1');
  expect(JSON.stringify(tree.toJSON())).toContain('Synthetic Center 1');
  expect(get('applications-tab-OPEN').props['aria-selected']).toBe(true);
 });
 it('switches between open/decided buckets without retaining stale row set',async()=>{
  authApi.listApplications.mockImplementation(async args=>payload(
   args.status==='APPROVED'?[app('approved','APPROVED')]:[app('open')],1));
  await mount();
  await click('applications-tab-APPROVED');
  expect(authApi.listApplications).toHaveBeenLastCalledWith({
   status:'APPROVED',q:undefined,page:1
  });
  expect(find('application-row-APP-open')).toHaveLength(0);
  expect(get('application-row-APP-approved')).toBeTruthy();
 });
 it('submits trimmed search and resets pagination before issuing a scoped request',async()=>{
  await mount();
  await change('applications-search-input','  synthetic  ');
  await act(async()=>get('applications-search-button').parent.props.onSubmit({
   preventDefault:()=>{}
  }));
  expect(authApi.listApplications).toHaveBeenLastCalledWith({
   status:'OPEN',q:'synthetic',page:1
  });
 });
 it('honors empty search response rather than fabricating approved centers',async()=>{
  authApi.listApplications.mockResolvedValue(payload([],0));
  await mount();
  expect(get('applications-empty')).toBeTruthy();
  expect(find('applications-list')).toHaveLength(0);
 });
 it('ignores an older request that resolves after the selected tab changes',async()=>{
  let resolveOld;
  authApi.listApplications.mockImplementation(args=>
   args.status==='OPEN'?new Promise(resolve=>{resolveOld=resolve;}):
    Promise.resolve(payload([app('new','APPROVED')],1)));
  await mount();
  await click('applications-tab-APPROVED');
  await act(async()=>resolveOld(payload([app('old')],1)));
  expect(get('application-row-APP-new')).toBeTruthy();
  expect(find('application-row-APP-old')).toHaveLength(0);
 });
});
