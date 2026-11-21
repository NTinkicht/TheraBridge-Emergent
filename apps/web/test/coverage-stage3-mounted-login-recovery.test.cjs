// Stage 3: real login source—credential validation, session expiry, tenant
// selection and error handling—without exposing or storing real credentials.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let router,previousWindow;
jest.mock('next/navigation',()=>({useRouter:()=>router}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/auth/AuthLayout',()=>({
 AuthLayout:({children,title,testId})=>h('main',{'data-testid':testId},h('h1',null,title),children)
}));
jest.mock('@/lib/auth',()=>{
 const r=jest.requireActual('@/lib/auth');
 return {...r,authApi:{...r.authApi,login:jest.fn()}};
});
const {authApi}=require('../src/lib/auth');
const {ApiError}=require('../src/lib/api');
const LoginPage=require('../src/app/login/page').default;
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const submit=async()=>act(async()=>{get('login-form').props.onSubmit({
 preventDefault:()=>{}
 });await Promise.resolve();});
const mount=async()=>act(async()=>{tree=create(h(LoginPage));});
const login=async()=>{
 await change('login-email-input','  fictional@example.invalid  ');
 await change('login-password-input','not-a-real-password');
 await submit();
};
beforeAll(()=>{previousWindow=global.window;global.window={location:{search:''}};});
afterAll(()=>{global.window=previousWindow;});
beforeEach(()=>{
 jest.clearAllMocks();authApi.login.mockReset();
 router={replace:jest.fn()};global.window.location.search='';
 authApi.login.mockResolvedValue({
  contexts:[{type:'center',centerId:'center-a'}],
  activeContext:{type:'center',centerId:'center-a'}
 });
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real sign-in route and safe context routing',()=>{
 it('rejects malformed email without sending credentials',async()=>{
  await mount();
  await change('login-email-input','invalid');
  await change('login-password-input','fictional-secret');
  await submit();
  expect(get('login-error')).toBeTruthy();
  expect(authApi.login).not.toHaveBeenCalled();
 });
 it('refuses empty password before authentication',async()=>{
  await mount();await change('login-email-input','fictional@example.invalid');
  await submit();
  expect(authApi.login).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain('Enter your password');
 });
 it('trims email, sends the exact password, and navigates only after server session success',async()=>{
  await mount();await login();
  expect(authApi.login).toHaveBeenCalledWith('fictional@example.invalid','not-a-real-password');
  expect(router.replace).toHaveBeenCalledWith('/app');
 });
 it('selects context when signed in without active center and multiple allowed centers',async()=>{
  authApi.login.mockResolvedValue({activeContext:null,contexts:[
   {centerId:'center-a',type:'center'},{centerId:'center-b',type:'center'}]});
  await mount();await login();
  expect(router.replace).toHaveBeenCalledWith('/select-context');
 });
 it('honors only the explicit invitation path, without arbitrary user-supplied redirects',async()=>{
  global.window.location.search='?next=invite';
  await mount();await login();
  expect(router.replace).toHaveBeenCalledWith('/invite');
  expect(router.replace).not.toHaveBeenCalledWith('/app');
 });
 it('presents signed out, expired or reset notices but does not imply authentication',async()=>{
  global.window.location.search='?expired=1';
  await mount();
  expect(get('login-notice')).toBeTruthy();
  expect(authApi.login).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
 });
 it('never navigates after a denied 401 authentication request',async()=>{
  authApi.login.mockRejectedValue(new ApiError(401,'Synthetic incorrect credentials'));
  await mount();await login();
  expect(get('login-error')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('Email or password is incorrect');
  expect(router.replace).not.toHaveBeenCalled();
  expect(get('login-password-input').props.value).toBe('not-a-real-password');
 });
 it('preserves server-provided retry/rate-limit guidance on 429',async()=>{
  authApi.login.mockRejectedValue(new ApiError(429,'Synthetic try again later'));
  await mount();await login();
  expect(JSON.stringify(tree.toJSON())).toContain('Synthetic try again later');
  expect(router.replace).not.toHaveBeenCalled();
 });
 it('shows a safe validation failure on 400, without claiming account creation',async()=>{
  authApi.login.mockRejectedValue(new ApiError(400,'Synthetic invalid form'));
  await mount();await login();
  expect(JSON.stringify(tree.toJSON())).toContain('Enter a valid email address and password');
  expect(find('login-notice')).toHaveLength(0);
 });
});
