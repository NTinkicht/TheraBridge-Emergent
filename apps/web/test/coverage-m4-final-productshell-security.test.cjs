// M4-08: mounted production ProductShell behavior with synthetic roles.
// These checks exercise real permission filtering, navigation and sign-out paths.
// Client navigation never substitutes for server authorization.
const React = require('react');
const Renderer = require('react-test-renderer');
const {act,create} = Renderer;
const h=React.createElement;
const router={replace:jest.fn(),push:jest.fn()};
jest.mock('next/navigation',()=>({useRouter:()=>router}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/brand/BrandMark',()=>({BrandMark:()=>h('span',null,'Brand')}));
jest.mock('@/components/brand/SignatureBand',()=>({SignatureBand:()=>h('span',null,'Signature')}));
jest.mock('@/components/design/ui',()=>({Avatar:({name})=>h('span',null,name)}));
jest.mock('@/lib/auth',()=>{
 const real=jest.requireActual('@/lib/auth');
 return {...real,authApi:{...real.authApi,logout:jest.fn()}};
});
const {authApi}=require('../src/lib/auth');
const {ApiError}=require('../src/lib/api');
const {ProductShell}=require('../src/components/auth/ProductShell');
const center={type:'center',role:'THERAPIST',membershipId:'m-1',centerId:'synthetic-center',centerName:'Synthetic Center'};
const guardian={...center,role:'GUARDIAN'};
const platform={type:'platform',role:'PLATFORM_ADMIN'};
const session=(opts={})=>({
 csrfToken:'',user:{id:'synthetic-user',email:'none@example.invalid',displayName:'Synthetic User'},
 contexts:[center],activeContext:center,permissions:['center.children.read','center.schedule.read'],
 ...opts,
});
let tree;
const mount=async(s=session(),active='home',planned=[])=>act(async()=>{tree=create(h(ProductShell,{
 session:s,active,planned,children:h('p',null,'Synthetic content')
}));});
const get=id=>tree.root.findByProps({'data-testid':id});
const all=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
beforeEach(()=>{jest.clearAllMocks();authApi.logout.mockReset().mockResolvedValue(undefined);});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 production shell only shows permitted navigation',()=>{
 it('does not expose inaccessible platform or clinical destinations to a minimal role',async()=>{
  await mount(session({permissions:[]}));
  expect(all('nav-applications')).toHaveLength(0);
  expect(all('nav-children')).toHaveLength(0);
  expect(all('nav-clinical')).toHaveLength(0);
  expect(get('nav-home')).toBeTruthy();
  expect(get('nav-security')).toBeTruthy();
 });
 it('shows only specifically granted center destinations and correct active navigation',async()=>{
  await mount(session(), 'children');
  expect(get('nav-children').props['aria-current']).toBe('page');
  expect(get('nav-schedule')).toBeTruthy();
  expect(all('nav-applications')).toHaveLength(0);
  expect(all('nav-clinical')).toHaveLength(0);
  expect(get('active-context-label').props.children).toContain('Synthetic Center');
 });
 it('guardian and platform contexts retain distinct themes and permission scopes',async()=>{
  await mount(session({activeContext:guardian,permissions:['family.practice.read']}));
  expect(get('product-shell').props.className).toContain('theme-family-auto');
  expect(get('nav-practice')).toBeTruthy();
  expect(all('nav-clinical')).toHaveLength(0);
  await act(async()=>{tree.update(h(ProductShell,{session:session({activeContext:platform,permissions:['platform.applications.read']}),active:'applications',planned:[],children:'Platform'}));});
  expect(get('product-shell').props.className).not.toContain('theme-family-auto');
  expect(get('nav-applications')).toBeTruthy();
  expect(all('nav-practice')).toHaveLength(0);
 });
 it('does not fabricate a selected workspace and offers explicit context switch only for multiple memberships',async()=>{
  await mount(session({activeContext:null,contexts:[center,guardian]}));
  expect(get('active-context-label').props.children).toBe('No workspace selected');
  expect(all('workspace-switcher')).toHaveLength(1);
  await act(async()=>tree.update(h(ProductShell,{session:session({contexts:[center]}),active:'home',planned:[],children:'Only one'})));
  expect(all('workspace-switcher')).toHaveLength(0);
 });
 it('mobile destination changes invoke client routing but do not grant new permissions',async()=>{
  await mount(session({permissions:['center.children.read']}));
  await act(async()=>get('mobile-nav-select').props.onChange({target:{value:'/app/children'}}));
  expect(router.push).toHaveBeenCalledWith('/app/children');
  const values=get('mobile-nav-select').findAllByType('option').map(x=>x.props.value);
  expect(values).not.toContain('/app/clinical');
  expect(values).not.toContain('/app/applications');
 });
});
describe('M4-08 production shell sign-out is server-confirmed',()=>{
 it('redirects to login only after successful remote revocation',async()=>{
  await mount();
  await click('sign-out-button');
  expect(authApi.logout).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith('/login?signedout=1');
  expect(all('sign-out-error')).toHaveLength(0);
 });
 it('treats an already-expired 401 as signed out without reporting successful token reuse',async()=>{
  authApi.logout.mockRejectedValue(new ApiError(401,'synthetic expired'));
  await mount();
  await click('sign-out-button');
  expect(router.replace).toHaveBeenCalledWith('/login?signedout=1');
  expect(all('sign-out-error')).toHaveLength(0);
 });
 it('keeps the user in place and allows retry after non-401 failure',async()=>{
  authApi.logout.mockRejectedValueOnce(new Error('synthetic network unavailable')).mockResolvedValueOnce(undefined);
  await mount();
  await click('sign-out-button');
  expect(router.replace).not.toHaveBeenCalled();
  expect(get('sign-out-error').props.role).toBe('alert');
  expect(get('sign-out-button').props.disabled).toBe(false);
  await click('sign-out-button');
  expect(authApi.logout).toHaveBeenCalledTimes(2);
  expect(router.replace).toHaveBeenCalledWith('/login?signedout=1');
 });
 it('locks repeated clicks while a revocation attempt remains pending',async()=>{
  let settle;
  authApi.logout.mockImplementation(()=>new Promise(resolve=>{settle=resolve;}));
  await mount();
  await act(async()=>get('sign-out-button').props.onClick());
  expect(get('sign-out-button').props.disabled).toBe(true);
  expect(authApi.logout).toHaveBeenCalledTimes(1);
  await act(async()=>{settle();await Promise.resolve();});
  expect(router.replace).toHaveBeenCalledTimes(1);
 });
});
