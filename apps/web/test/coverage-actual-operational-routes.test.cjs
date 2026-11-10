// M4-08 genuine source-rendered operational routes for platform, center,
// and clinician roles. Synthetic state is supplied at fetch boundaries.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement,draw=Page=>renderToStaticMarkup(h(Page));
let loaded=null,failed=false,state=null,session=null;
jest.mock('@/components/centers/kit',()=>{
 const kit=jest.requireActual('@/components/centers/kit');
 return {...kit,Workspace:({active,permission,children})=>h('main',{
  'data-testid':'permissioned-workspace','data-active':active,
  'data-permission':permission},typeof children==='function'?children(session,()=>{}):children),
  useLoad:()=>({data:loaded,failed,reload:jest.fn(),setData:jest.fn()})};
});
jest.mock('@/components/auth/useSession',()=>({
 useSession:()=>({state,handle:jest.fn()})
}));
jest.mock('@/components/auth/ProductShell',()=>({
 ProductShell:({children})=>h('main',{'data-testid':'authenticated-shell'},children)
}));
jest.mock('next/navigation',()=>({
 useParams:()=>({id:'synthetic-report'}),
 useRouter:()=>({push:jest.fn(),replace:jest.fn(),refresh:jest.fn()}),
 usePathname:()=>'/app',useSearchParams:()=>new URLSearchParams()
}));
const CentersPage=require('../src/app/app/centers/page').default;
const ReportPage=require('../src/app/app/reports/[id]/page').default;
const AppHomePage=require('../src/app/app/page').default;
const roles=(role,permissions=[],type='center')=>({
 csrfToken:'',permissions,contexts:[],
 user:{id:'synthetic-user',displayName:'Fictional Admin',email:'none@example.invalid'},
 activeContext:type==='none'?null:type==='platform'?
  {type:'platform',role}:
  {type:'center',role,centerId:'fake-center',centerName:'Synthetic Center',
   timezone:'Asia/Dubai',membershipId:'fake-membership'}
});
const ready=(role,permissions=[],type='center')=>{session=roles(role,permissions,type);
 state={status:'ready',data:session};};
const center=(status,adminStatus,source='DIRECT',slug='synthetic')=>({
 id:slug,name:'Synthetic '+slug,slug,city:'Sharjah',country:'AE',
 status,adminStatus,source,createdAt:'2026-11-10T09:00:00Z',
 activeMembers:2,setup:{done:1,total:3}
});
const report=(extra={})=>({
 locked:'G2/G2b release blocked.',synthetic:true,released:false,canEdit:false,canReview:false,
 evidence:{period:{from:'2026-11-01',to:'2026-11-30'},assessments:[],
  plan:null,sessions:{drafts:1,completedVisits:0},goals:[]},
 versions:[],
 report:{id:'synthetic-report',childId:'fake-child',childName:'Synthetic Alex',
 title:'Fictional report',service:'speech',periodStart:'2026-11-01',
 periodEnd:'2026-11-30',status:'IN_REVIEW',version:2,
 author:'Fictional Clinician',mine:false,sections:{summary:'Internal draft'},
 reviewNotes:[],updatedAt:'2026-11-10T09:00:00Z'},...extra
});
beforeEach(()=>{loaded=null;failed=false;ready('PLATFORM_ADMIN',['platform.centers.read'],'platform');});
describe('M4-08 real platform center directory honors exact administrative states',()=>{
 it('does not fabricate center rows while loading or when request fails',()=>{
  expect(draw(CentersPage)).toContain('data-testid="centers-loading"');
  failed=true;
  const out=draw(CentersPage);
  expect(out).toContain('data-testid="centers-error"');
  expect(out).not.toContain('data-testid="centers-list"');
 });
 it('renders empty tenant directory without implied platform provisioning',()=>{
  loaded={items:[],total:0};
  const out=draw(CentersPage);
  expect(out).toContain('data-testid="centers-empty"');
  expect(out).toContain('Create the first center');
  expect(out).toContain('data-testid="new-center-button"');
 });
 it('distinguishes invited, expired and missing center administrator state',()=>{
  loaded={items:[
   center('ACTIVE','INVITED','APPLICATION','one'),
   center('SUSPENDED','EXPIRED','DIRECT','two'),
   center('ACTIVE','NONE','DIRECT','three'),
   center('ACTIVE','ACTIVE','DIRECT','four')
  ],total:4};
  const out=draw(CentersPage);
  for(const slug of ['one','two','three','four'])
   expect(out).toContain('data-testid="center-row-'+slug+'"');
  for(const text of ['Administrator invited','Invitation expired',
   'No administrator','Administrator active']) expect(out).toContain(text);
  expect(out).toContain('from application');
  expect(out).toContain('1/3');
 });
});
describe('M4-08 genuine report route retains internal-only clinical scope',()=>{
 beforeEach(()=>ready('THERAPIST',['center.clinical.read']));
 it('distinguishes missing authorized report from a failed fetch',()=>{
  expect(draw(ReportPage)).toContain('data-testid="report-loading"');
  failed=true;
  expect(draw(ReportPage)).toContain('data-testid="report-error"');
 });
 it('shows exact unreleased report but does not expose editable actions to viewer',()=>{
  loaded=report();
  const out=draw(ReportPage);
  expect(out).toContain('data-testid="report-page"');
  expect(out).toContain('Fictional report');
  expect(out).toContain('Unreleased');
  expect(out).toContain('Synthetic data only, not for clinical use');
  expect(out).toContain('G2/G2b release blocked');
  expect(out).toContain('data-testid="report-readonly"');
  expect(out).not.toContain('data-testid="report-to-plan-toggle"');
  expect(out).not.toContain('data-testid="report-save-version"');
  expect(out).not.toContain('data-testid="report-family-preview"');
 });
 it('shows editable draft and guarded linked plan handoff without granting release',()=>{
  loaded=report({canEdit:true,report:{...report().report,status:'DRAFT',mine:true}});
  const out=draw(ReportPage);
  expect(out).toContain('data-testid="report-save-version"');
  expect(out).toContain('data-testid="report-to-plan-needs-version"');
  expect(out).toContain('Release to family');
  expect(out).not.toContain('data-testid="report-family-preview"');
 });
});
describe('M4-08 authenticated home is role and context scoped',()=>{
 it('prevents dashboard data exposure to invalid or loading sessions',()=>{
  state={status:'loading'};
  expect(draw(AppHomePage)).toContain('data-testid="session-loading"');
  state={status:'error',message:'Synthetic expired session'};
  const out=draw(AppHomePage);
  expect(out).toContain('data-testid="session-error"');
  expect(out).not.toContain('data-testid="home-title"');
 });
 it('never silently picks a center when authenticated context is absent',()=>{
  ready('THERAPIST',[],'none');
  const out=draw(AppHomePage);
  expect(out).toContain('data-testid="home-no-context"');
  expect(out).not.toContain('data-testid="home-title"');
 });
 it('shows center staff access only within explicit role and availability',()=>{
  ready('CENTER_ADMIN',['center.summary.read']);
  const out=draw(AppHomePage);
  expect(out).toContain('data-testid="home-title"');
  expect(out).toContain('Fictional');
  expect(out).toContain('data-testid="home-summary-loading"');
  expect(out).toContain('Clinical signing, approval and release');
 });
 it('presents platform administrator without impersonating a center tenant',()=>{
  ready('PLATFORM_ADMIN',['platform.summary.read'],'platform');
  const out=draw(AppHomePage);
  expect(out).toContain('data-testid="home-title"');
  expect(out).not.toContain('Clinical signing, approval and release');
 });
});
