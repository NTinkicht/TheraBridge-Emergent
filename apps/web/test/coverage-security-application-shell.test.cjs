// M4-08: source-executing account security, application intake and
// role-distinct design navigation. Synthetic only; rendered behavior is not
// equivalent to mounted interaction or server authorization.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
const draw=(Component,props={})=>renderToStaticMarkup(h(Component,props));
const session={csrfToken:'',user:{id:'fake',displayName:'Fictional Account',
 email:'none@example.invalid'},contexts:[],permissions:[],
 activeContext:{type:'center',centerId:'synthetic-center',role:'THERAPIST',
 centerName:'Fictional Center',membershipId:'fake-membership'}};
let state={status:'ready',data:session};
jest.mock('@/components/auth/useSession',()=>({
 useSession:()=>({state,reload:jest.fn(),handle:jest.fn()})
}));
jest.mock('@/components/design/PreviewContext',()=>({
 usePreview:()=>({notify:jest.fn(),dataState:'loaded'})
}));
jest.mock('next/navigation',()=>({
 useRouter:()=>({push:jest.fn(),replace:jest.fn(),refresh:jest.fn()}),
 usePathname:()=>'/app',useSearchParams:()=>new URLSearchParams()
}));
const {AppShell}=require('../src/components/design/AppShell');
const ApplyPage=require('../src/app/apply/page').default;
const InvitePage=require('../src/app/invite/page').default;
const SecurityPage=require('../src/app/account/security/page').default;
const {ProductShell}=require('../src/components/auth/ProductShell');

describe('M4-08 public intake respects synthetic-data declaration and identity separation',()=>{
 it('renders complete center application prerequisites without auto-acceptance',()=>{
  const out=draw(ApplyPage);
  expect(out).toContain('data-testid="apply-ack-checkbox"');
  expect(out).toContain('must not contain real patient information');
  expect(out).toContain('data-testid="apply-submit-button"');
  expect(out).toContain('data-testid="apply-message-input"');
  expect(out).toContain('data-testid="apply-login-link"');
  expect(out).not.toContain('data-testid="apply-success"');
 });
 it('holds the invitation behind token inspection rather than inventing recipient rights',()=>{
  const out=draw(InvitePage);
  expect(out).toContain('data-testid="invite-loading"');
  expect(out).not.toContain('data-testid="invite-new-account-form"');
  expect(out).not.toContain('data-testid="invite-accept-button"');
  expect(out).not.toContain('synthetic-guardian-authorized');
 });
});

describe('M4-08 account security displays safeguards scoped to authenticated state',()=>{
 afterEach(()=>{state={status:'ready',data:session}});
 it('keeps password and global session termination actions separate',()=>{
  const out=draw(SecurityPage);
  expect(out).toContain('data-testid="security-title"');
  expect(out).toContain('data-testid="change-password-form"');
  expect(out).toContain('data-testid="current-password-input"');
  expect(out).toContain('data-testid="new-password-input"');
  expect(out).toContain('data-testid="confirm-password-input"');
  expect(out).toContain('data-testid="sign-out-everywhere-button"');
  expect(out).toContain('Sessions end after 30 minutes');
  expect(out).toContain('none@example.invalid');
 });
 it('does not expose account-management forms during session loading or failure',()=>{
  state={status:'loading'};
  const loading=draw(SecurityPage);
  expect(loading).toContain('data-testid="session-loading"');
  expect(loading).not.toContain('data-testid="change-password-form"');
  state={status:'error',message:'Synthetic unavailability'};
  const error=draw(SecurityPage);
  expect(error).toContain('data-testid="session-error"');
  expect(error).not.toContain('data-testid="sign-out-everywhere-button"');
 });
 it('indicates missing workspace explicitly and does not silently select one',()=>{
  state={status:'ready',data:{...session,activeContext:null}};
  const out=draw(SecurityPage);
  expect(out).toContain('No workspace is selected');
 });
});

describe('M4-08 visual preview shell separates roles and mock unavailable navigation',()=>{
 it.each(['family','platform','center'])('%s shell uses actual nav for its own workspace',(workspace)=>{
  const out=draw(AppShell,{workspace,active:'home',title:'Fictional Home',
   children:h('p',null,'Synthetic content')});
  expect(out).toContain('data-testid="shell-'+workspace+'"');
  expect(out).toContain('data-testid="sidebar"');
  expect(out).toContain('data-testid="top-bar"');
  expect(out).toContain('Synthetic content');
  expect(out).toContain('data-testid="notifications-button"');
 });
 it('keeps visual family theme control separate from clinical shell',()=>{
  const family=draw(AppShell,{workspace:'family',active:'home',title:'Home',children:'Family'});
  const clinical=draw(AppShell,{workspace:'center',active:'home',title:'Home',children:'Clinical'});
  expect(family).toContain('data-testid="theme-toggle"');
  expect(family).toContain('data-theme="light"');
  expect(clinical).not.toContain('data-testid="theme-toggle"');
  expect(clinical).not.toContain('theme-family-auto');
 });
});
