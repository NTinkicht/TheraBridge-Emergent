// M4-08 source-executing account security route. Password and global session
// rotation must be confirmed by the server, never inferred by the client.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let mockSession,refresh,router;
jest.mock('next/navigation',()=>({useRouter:()=>router}));
jest.mock('@/components/auth/ProductShell',()=>({
 ProductShell:({children})=>h('main',null,children)}));
jest.mock('@/components/auth/useSession',()=>({useSession:()=>({
 state:mockSession,reload:refresh
})}));
jest.mock('@/lib/auth',()=>{
 const actual=jest.requireActual('@/lib/auth');
 return {...actual,authApi:{...actual.authApi,
  changePassword:jest.fn(),logoutAll:jest.fn()}};
});
const {authApi}=require('../src/lib/auth');
const {ApiError}=require('../src/lib/api');
const SecurityPage=require('../src/app/account/security/page').default;
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const submit=async()=>act(async()=>{get('change-password-form').props.onSubmit({
 preventDefault:()=>{}
 });await Promise.resolve();});
const mount=async()=>act(async()=>{tree=create(h(SecurityPage));});
beforeEach(()=>{
 jest.clearAllMocks();authApi.changePassword.mockReset();authApi.logoutAll.mockReset();
 authApi.changePassword.mockResolvedValue({});authApi.logoutAll.mockResolvedValue({});
 router={replace:jest.fn()};refresh=jest.fn();
 mockSession={status:'ready',data:{
  user:{email:'fictional@example.invalid'},
  activeContext:{type:'center',centerId:'fictional-center'},
  permissions:['center.schedule.read']
 }};
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('mounted account security and session revocation',()=>{
 it('hides protected account page while session identity is loading',async()=>{
  mockSession={status:'loading'};await mount();
  expect(get('session-loading')).toBeTruthy();
  expect(find('security-title')).toHaveLength(0);
  expect(authApi.changePassword).not.toHaveBeenCalled();
 });
 it('shows expired-session error without rendering account controls',async()=>{
  mockSession={status:'error',message:'Synthetic sign-in expired'};await mount();
  expect(get('session-error')).toBeTruthy();
  expect(find('change-password-form')).toHaveLength(0);
 });
 it('shows authorized email, session timeout policy and separate rotation controls',async()=>{
  await mount();
  expect(get('security-email').props.children).toBe('fictional@example.invalid');
  expect(get('change-password-form')).toBeTruthy();
  expect(get('sign-out-everywhere-button')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('30 minutes without activity');
 });
 it('rejects mismatched passwords locally without network mutation',async()=>{
  await mount();
  await change('current-password-input','synthetic-old');
  await change('new-password-input','synthetic-long-password-1');
  await change('confirm-password-input','synthetic-long-password-2');
  await submit();
  expect(get('change-password-danger')).toBeTruthy();
  expect(authApi.changePassword).not.toHaveBeenCalled();
  expect(refresh).not.toHaveBeenCalled();
 });
 it('sends exact current and new passwords, clears form and refreshes session only on server success',async()=>{
  await mount();
  await change('current-password-input','synthetic-old');
  await change('new-password-input','synthetic-new');
  await change('confirm-password-input','synthetic-new');
  await submit();
  expect(authApi.changePassword).toHaveBeenCalledWith('synthetic-old','synthetic-new');
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(get('current-password-input').props.value).toBe('');
  expect(get('new-password-input').props.value).toBe('');
  expect(get('change-password-success')).toBeTruthy();
 });
 it('retains password inputs and avoids false rotation claims after policy rejection',async()=>{
  authApi.changePassword.mockRejectedValue(new ApiError(422,'Synthetic password rejected'));
  await mount();
  await change('current-password-input','synthetic-old');
  await change('new-password-input','synthetic-new');
  await change('confirm-password-input','synthetic-new');
  await submit();
  expect(get('change-password-danger')).toBeTruthy();
  expect(get('new-password-input').props.value).toBe('synthetic-new');
  expect(refresh).not.toHaveBeenCalled();
 });
 it('distinguishes expired session from generic password failure',async()=>{
  authApi.changePassword.mockRejectedValue(new ApiError(401,'Synthetic expired'));
  await mount();
  await change('new-password-input','synthetic-new');
  await change('confirm-password-input','synthetic-new');
  await submit();
  expect(JSON.stringify(tree.toJSON())).toContain('Your session ended');
  expect(refresh).not.toHaveBeenCalled();
 });
 it('signs out all devices and redirects only after server success',async()=>{
  await mount();await click('sign-out-everywhere-button');
  expect(authApi.logoutAll).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith('/login?signedout=1');
 });
 it('redirects to reauthentication when logout reports already-expired access',async()=>{
  authApi.logoutAll.mockRejectedValue(new ApiError(401,'expired'));
  await mount();await click('sign-out-everywhere-button');
  expect(router.replace).toHaveBeenCalledWith('/login?expired=1');
  expect(find('sign-out-everywhere-error')).toHaveLength(0);
 });
 it('never claims global signout when server failed and exposes recoverable notice',async()=>{
  authApi.logoutAll.mockRejectedValue(new Error('Synthetic network outage'));
  await mount();await click('sign-out-everywhere-button');
  expect(router.replace).not.toHaveBeenCalled();
  expect(get('sign-out-everywhere-error')).toBeTruthy();
  expect(get('sign-out-everywhere-button').props.disabled).toBe(false);
 });
});
