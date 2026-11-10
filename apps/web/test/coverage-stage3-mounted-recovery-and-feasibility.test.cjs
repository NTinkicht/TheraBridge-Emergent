// Stage 3: real credential recovery route and deployed feasibility diagnostics.
// All synthetic; diagnostics must be inaccessible absent explicit environment
// permission, and password reset secrets stay in the fragment, never query.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let router,oldWindow,oldFrame,envBefore;
jest.mock('next/navigation',()=>({useRouter:()=>router,notFound:()=>{throw Error('NEXT_NOT_FOUND');}}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/auth/AuthLayout',()=>({
 AuthLayout:({children,testId,title})=>h('main',{'data-testid':testId},h('h1',null,title),children)
}));
jest.mock('@/components/brand/BrandMark',()=>({BrandMark:()=>h('span',null,'Synthetic brand')}));
jest.mock('@/components/brand/SignatureBand',()=>({SignatureBand:()=>h('span',null,'Synthetic')}));
jest.mock('@/components/feasibility/WorkUnits',()=>({WorkUnits:()=>h('aside',null,'Synthetic work-unit ledger')}));
jest.mock('@/lib/auth',()=>{
 const a=jest.requireActual('@/lib/auth');
 return {...a,authApi:{...a.authApi,forgot:jest.fn(),reset:jest.fn()}};
});
jest.mock('@/lib/api',()=>{
 const a=jest.requireActual('@/lib/api');
 return {...a,apiFetch:jest.fn()};
});
const {authApi}=require('../src/lib/auth');
const {apiFetch}=require('../src/lib/api');
const ForgotPage=require('../src/app/forgot-password/page').default;
const ResetPage=require('../src/app/reset-password/page').default;
const FeasibilityPage=require('../src/app/dev/feasibility/page').default;
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const submit=async id=>act(async()=>{get(id).props.onSubmit({preventDefault:()=>{}});await Promise.resolve();});
const mount=async(Component)=>act(async()=>{tree=create(h(Component));});
beforeAll(()=>{
 oldWindow=global.window;oldFrame=global.requestAnimationFrame;
 envBefore={enabled:process.env.ENABLE_FEASIBILITY_DIAGNOSTICS,env:process.env.DEPLOYMENT_ENV};
 global.window={location:{hash:''}};
 global.requestAnimationFrame=cb=>{cb();return 1;};
});
afterAll(()=>{
 global.window=oldWindow;global.requestAnimationFrame=oldFrame;
 if(envBefore.enabled===undefined)delete process.env.ENABLE_FEASIBILITY_DIAGNOSTICS;
 else process.env.ENABLE_FEASIBILITY_DIAGNOSTICS=envBefore.enabled;
 if(envBefore.env===undefined)delete process.env.DEPLOYMENT_ENV;
 else process.env.DEPLOYMENT_ENV=envBefore.env;
});
beforeEach(()=>{
 jest.clearAllMocks();authApi.forgot.mockReset();authApi.reset.mockReset();apiFetch.mockReset();
 authApi.forgot.mockResolvedValue({message:'Synthetic check your inbox'});
 authApi.reset.mockResolvedValue({});
 apiFetch.mockResolvedValue({status:'ok',framework:'NestJS Fastify (synthetic)',
  database:{status:'up',version:'16',latencyMs:2},
  migrations:{applied:4,latest:'fictional-demo-v4'}});
 router={replace:jest.fn()};global.window.location.hash='';
 process.env.ENABLE_FEASIBILITY_DIAGNOSTICS='false';process.env.DEPLOYMENT_ENV='production';
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real reset and recovery workflow safety',()=>{
 it('does not disclose password-reset API request for invalid email',async()=>{
  await mount(ForgotPage);
  await change('forgot-email-input','invalid');
  await submit('forgot-form');
  expect(get('forgot-error')).toBeTruthy();
  expect(authApi.forgot).not.toHaveBeenCalled();
 });
 it('normalizes email and displays only server-acknowledged fictional reset receipt',async()=>{
  await mount(ForgotPage);
  await change('forgot-email-input','  sample@example.invalid  ');
  await submit('forgot-form');
  expect(authApi.forgot).toHaveBeenCalledWith('sample@example.invalid');
  expect(get('forgot-success')).toBeTruthy();
  expect(find('forgot-form')).toHaveLength(0);
  expect(JSON.stringify(tree.toJSON())).toContain('Email delivery is not connected');
 });
 it('preserves recoverable request after server rejection',async()=>{
  authApi.forgot.mockRejectedValue(new Error('Synthetic unavailable'));
  await mount(ForgotPage);
  await change('forgot-email-input','sample@example.invalid');
  await submit('forgot-form');
  expect(get('forgot-error')).toBeTruthy();
  expect(get('forgot-email-input').props.value).toBe('sample@example.invalid');
  expect(find('forgot-success')).toHaveLength(0);
 });
 it('hides reset password fields when fragment token is absent',async()=>{
  await mount(ResetPage);
  expect(get('reset-missing-token')).toBeTruthy();
  expect(find('reset-form')).toHaveLength(0);
  expect(authApi.reset).not.toHaveBeenCalled();
 });
 it('requires matching new passwords and never uses URL query credentials',async()=>{
  global.window.location.hash='#token=fictional-reset-token';
  await mount(ResetPage);
  await change('reset-password-input','synthetic-strong-1');
  await change('reset-confirm-input','synthetic-strong-2');
  await submit('reset-form');
  expect(get('reset-error')).toBeTruthy();
  expect(authApi.reset).not.toHaveBeenCalled();
 });
 it('submits exact fragment token and clears session through sign-in route on server success',async()=>{
  global.window.location.hash='#token=fictional-reset-token';
  await mount(ResetPage);
  await change('reset-password-input','synthetic-strong-password');
  await change('reset-confirm-input','synthetic-strong-password');
  await submit('reset-form');
  expect(authApi.reset).toHaveBeenCalledWith('fictional-reset-token','synthetic-strong-password');
  expect(router.replace).toHaveBeenCalledWith('/login?reset=1');
 });
 it('preserves reset data and denies success when token was rejected',async()=>{
  authApi.reset.mockRejectedValue(new Error('Synthetic expired reset token'));
  global.window.location.hash='#token=fictional-reset-token';
  await mount(ResetPage);
  await change('reset-password-input','synthetic-strong-password');
  await change('reset-confirm-input','synthetic-strong-password');
  await submit('reset-form');
  expect(get('reset-error')).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
  expect(get('reset-password-input').props.value).toBe('synthetic-strong-password');
 });
});
describe('real developer feasibility diagnostics are strictly synthetic and gated',()=>{
 it('returns 404 when diagnostics flag is disabled',()=>{
  expect(()=>FeasibilityPage()).toThrow('NEXT_NOT_FOUND');
  expect(apiFetch).not.toHaveBeenCalled();
 });
 it('returns 404 when production deployment tries to enable diagnostics',()=>{
  process.env.ENABLE_FEASIBILITY_DIAGNOSTICS='true';
  expect(()=>FeasibilityPage()).toThrow('NEXT_NOT_FOUND');
  expect(apiFetch).not.toHaveBeenCalled();
 });
 it('renders diagnostics only under explicit shared-synthetic enablement',async()=>{
  process.env.ENABLE_FEASIBILITY_DIAGNOSTICS='true';process.env.DEPLOYMENT_ENV='shared-synthetic';
  await mount(FeasibilityPage);
  expect(get('stack-check-card')).toBeTruthy();
  expect(get('synthetic-data-badge')).toBeTruthy();
  expect(get('page-footer')).toBeTruthy();
  expect(apiFetch).toHaveBeenCalledWith('/api/health');
  expect(JSON.stringify(tree.toJSON())).toContain('NO-GO');
 });
 it('rechecks only the approved public health endpoint on operator request',async()=>{
  process.env.ENABLE_FEASIBILITY_DIAGNOSTICS='true';process.env.DEPLOYMENT_ENV='ci';
  await mount(FeasibilityPage);
  await act(async()=>{get('stack-refresh-button').props.onClick();await Promise.resolve();});
  expect(apiFetch).toHaveBeenCalledTimes(2);
  expect(apiFetch.mock.calls.every(c=>c[0]==='/api/health')).toBe(true);
 });
 it('shows network failures without fabricating an operational-ready status',async()=>{
  process.env.ENABLE_FEASIBILITY_DIAGNOSTICS='true';process.env.DEPLOYMENT_ENV='preview';
  apiFetch.mockRejectedValue(new Error('Synthetic health endpoint unavailable'));
  await mount(FeasibilityPage);
  expect(get('stack-error')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('Synthetic health endpoint unavailable');
 });
});
