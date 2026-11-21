// Genuine source-executing route/component coverage, using React SSR on the actual Next pages.
// These checks exercise rendered markup and role filtering; they are not a substitute
// for browser interaction or the full 95% acceptance target.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
const render=(Component,props={})=>renderToStaticMarkup(h(Component,props));

jest.mock('next/navigation',()=>({
  useRouter:()=>({push:jest.fn(),replace:jest.fn(),refresh:jest.fn()}),
  usePathname:()=>'/app',
  useSearchParams:()=>new URLSearchParams(),
  redirect:jest.fn(()=>{throw new Error('redirect called')}),
}));
const {Lock}=require('lucide-react');
const {ProductShell}=require('../src/components/auth/ProductShell');
const {AuthLayout}=require('../src/components/auth/AuthLayout');
const {Field,FormAlert,SubmitButton}=require('../src/components/auth/Field');
const {BrandMark}=require('../src/components/brand/BrandMark');
const {SignatureBand}=require('../src/components/brand/SignatureBand');
const LoginPage=require('../src/app/login/page').default;
const ForgotPasswordPage=require('../src/app/forgot-password/page').default;
const ResetPasswordPage=require('../src/app/reset-password/page').default;
const AccessDeniedPage=require('../src/app/access-denied/page').default;
const NotFoundPage=require('../src/app/not-found').default;
const ErrorBoundary=require('../src/app/error').default;
const GlobalError=require('../src/app/global-error').default;
const fakeCtx=(role,overrides={})=>({type:'center',role,centerId:'synthetic-center',
 centerName:'Synthetic Center',centerSlug:'synthetic',membershipId:'fake-member',...overrides});
const fakeSession=(role,permissions=[],multiple=false)=>({
 user:{id:'synthetic-user',displayName:'Alex Morgan',email:'synthetic@example.invalid'},
 csrfToken:'not-real',contexts:multiple?[fakeCtx(role),fakeCtx('THERAPIST')]:[fakeCtx(role)],
 activeContext:fakeCtx(role),permissions,session:{idleExpiresAt:'',absoluteExpiresAt:''}
});
const shell=(s,active='home',planned=[])=>render(ProductShell,{session:s,active,planned,
 children:h('p',null,'Synthetic workspace')});

describe('M4-08 actual authentication and recovery route rendering',()=>{
 it('renders the login form with guarded password input, links and no fake session message',()=>{
  const out=render(LoginPage);
  expect(out).toContain('data-testid="login-page"');
  expect(out).toContain('data-testid="login-form"');
  expect(out).toContain('type="password"');
  expect(out).toContain('data-testid="login-password-input-reveal"');
  expect(out).toContain('href="/forgot-password"');
  expect(out).toContain('Synthetic data only');
  expect(out).not.toContain('login-notice');
 });
 it('renders the forgot-password anti-enumeration workflow but not a fake sent confirmation',()=>{
  const out=render(ForgotPasswordPage);
  expect(out).toContain('data-testid="forgot-form"');
  expect(out).toContain('Send reset link');
  expect(out).toContain('30 minutes');
  expect(out).toContain('href="/login"');
  expect(out).not.toContain('forgot-success');
 });
 it('renders an inert reset form until the client reads the URL fragment',()=>{
  const out=render(ResetPasswordPage);
  expect(out).toContain('data-testid="reset-form"');
  expect(out).toContain('data-testid="reset-password-input"');
  expect(out).toContain('data-testid="reset-confirm-input"');
  expect(out).toContain('new-password');
  expect(out).not.toContain('reset-missing-token');
 });
 it('provides clear no-access and not-found routes without protected content',()=>{
  const denied=render(AccessDeniedPage);
  expect(denied).toContain('data-testid="access-denied-page"');
  expect(denied).toContain('Nothing was shown or changed.');
  expect(denied).toContain('href="/select-context"');
  const missing=render(NotFoundPage);
  expect(missing).toContain('404');
  expect(missing).toContain('Page not found');
  expect(missing).toContain('href="/app"');
 });
 it('shows safe error fallbacks without leaking supplied error internals',()=>{
  const privateMessage='PRIVATE_PATIENT_REPORT_Example';
  const out=render(ErrorBoundary,{error:new Error(privateMessage),reset:()=>{}});
  expect(out).toContain('Something went wrong');
  expect(out).toContain('Your work may not have been saved');
  expect(out).not.toContain(privateMessage);
  const global=render(GlobalError,{error:new Error(privateMessage),reset:()=>{}});
  expect(global).toContain('TheraBridge is temporarily unavailable');
  expect(global).toContain('<html');
  expect(global).not.toContain(privateMessage);
 });
});

describe('M4-08 actual presentation components: accessible and synthetic-only',()=>{
 it('binds labels and error hints to the real input with aria-invalid',()=>{
  const out=render(Field,{label:'Synthetic email',type:'email',hint:'Synthetic only',
    error:'Invalid input',testId:'field',value:'',readOnly:true});
  expect(out).toContain('aria-invalid="true"');
  expect(out).toContain('Synthetic only');
  expect(out).toContain('Invalid input');
  expect(out).toContain('data-testid="field-error"');
  const pass=render(Field,{label:'Secret',type:'password',testId:'pass'});
  expect(pass).toContain('aria-label="Show password"');
  expect(pass).toContain('type="password"');
 });
 it('distinguishes disabled submit, errors, status and synthetic brand identity',()=>{
  expect(render(SubmitButton,{busy:true,children:'Save draft',testId:'save'}))
    .toContain('disabled=""');
  expect(render(SubmitButton,{busy:false,children:'Save draft',testId:'save'}))
    .not.toContain('disabled=""');
  expect(render(FormAlert,{tone:'danger',testId:'alert',children:'Synthetic failure'}))
    .toContain('role="alert"');
  expect(render(FormAlert,{tone:'info',testId:'notice',children:'Synthetic notice'}))
    .toContain('role="status"');
  expect(render(AuthLayout,{title:'Synthetic screen',testId:'brand',children:'No clinical data'}))
    .toContain('Not for clinical use');
  expect(render(BrandMark,{variant:'wordmark',height:25})).toContain('alt="TheraBridge"');
  expect(render(SignatureBand)).toContain('data-testid="signature-band"');
 });
});

describe('M4-08 actual cross-role application navigation, permission and fail-closed UX',()=>{
 it('never exposes clinical, center staff or platform links to the guardian',()=>{
  const out=shell(fakeSession('GUARDIAN',['family.activities.read','family.practice.read','family.progress.demo']),'practice');
  expect(out).toContain('theme-family-auto');
  expect(out).toContain('data-testid="nav-practice"');
  expect(out).toContain('data-testid="nav-family-progress"');
  expect(out).toContain('aria-current="page"');
  expect(out).not.toContain('href="/app/clinical"');
  expect(out).not.toContain('href="/app/team"');
  expect(out).not.toContain('href="/app/applications"');
  expect(out).toContain('Synthetic workspace');
 });
 it('never leaks clinical or platform links to a coordinator without corresponding permissions',()=>{
  const out=shell(fakeSession('COORDINATOR',['center.children.read','center.schedule.read']),'schedule');
  expect(out).toContain('data-testid="nav-schedule"');
  expect(out).toContain('data-testid="nav-children"');
  expect(out).not.toContain('href="/app/clinical"');
  expect(out).not.toContain('href="/app/applications"');
  expect(out).not.toContain('href="/app/activities"');
 });
 it('shows clinically scoped links only to explicitly permissioned therapist',()=>{
  const out=shell(fakeSession('THERAPIST',['center.clinical.read','center.activities.read']),'clinical');
  expect(out).toContain('data-testid="nav-clinical"');
  expect(out).toContain('href="/app/progress"');
  expect(out).toContain('data-testid="nav-activities"');
  expect(out).not.toContain('href="/app/applications"');
  expect(out).not.toContain('href="/app/centers"');
 });
 it('limits platform navigation to granted abilities while exposing workspace switcher for multiple contexts',()=>{
  const s=fakeSession('PLATFORM_ADMIN',['platform.applications.read','platform.centers.read'],true);
  const out=shell(s,'applications',[{label:'Unreleased module',unit:'Milestone 5',icon:Lock}]);
  expect(out).toContain('data-testid="nav-applications"');
  expect(out).toContain('data-testid="nav-centers"');
  expect(out).toContain('data-testid="workspace-switcher"');
  expect(out).toContain('data-testid="nav-planned-unreleased-module"');
  expect(out).toContain('aria-disabled="true"');
  expect(out).not.toContain('href="/app/clinical"');
 });
 it('preserves roleless workspace state and sign-out affordance without automatic disclosure',()=>{
  const s={...fakeSession('COORDINATOR',[]),activeContext:null,contexts:[]};
  const out=shell(s);
  expect(out).toContain('No workspace selected');
  expect(out).toContain('data-testid="sign-out-button"');
  expect(out).not.toContain('href="/app/clinical"');
 });
});
