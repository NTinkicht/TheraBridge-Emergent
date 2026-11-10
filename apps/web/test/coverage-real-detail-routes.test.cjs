// M4-08: real source-executing child/clinical detail routes across synthetic
// role, guardian, archive, and no-data boundaries. No browser navigation claims.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
let mockData=null;
let mockFailed=false;
let mockSession={};
jest.mock('@/components/centers/kit',()=>{
 const kit=jest.requireActual('@/components/centers/kit');
 const React=require('react');
 return {...kit,
  Workspace:({children,active,permission})=>React.createElement('main',
   {'data-testid':'route-scoped-workspace','data-active':active,
    'data-permission':permission},typeof children==='function'?children(mockSession,()=>{}):children),
  useLoad:()=>({data:mockData,failed:mockFailed,reload:jest.fn()})
 };
});
jest.mock('next/navigation',()=>({
 useParams:()=>({id:'fictional-child'}),
 useRouter:()=>({push:jest.fn(),replace:jest.fn(),refresh:jest.fn()}),
 usePathname:()=>'/app/children/fictional-child',
 useSearchParams:()=>new URLSearchParams(),
}));
jest.mock('../src/components/operations/HandoverProposalPanel',()=>({
 HandoverProposalPanel:()=>React.createElement('p',{'data-testid':'handover-guarded-boundary'},'Synthetic only: no assignment changed')
}));
jest.mock('../src/components/clinical/Child360',()=>({
 Child360:({ws})=>React.createElement('div',{'data-testid':'child360-boundary'},'Authorized child '+ws.child.id)
}));
const {setCenterTz}=require('../src/lib/operations');
const ChildDetailPage=require('../src/app/app/children/[id]/page').default;
const ClinicalDetailPage=require('../src/app/app/clinical/[id]/page').default;
const render=(Page,data,failed=false)=>{mockData=data;mockFailed=failed;return renderToStaticMarkup(h(Page));};
const baseChild=(extra={})=>({
 id:'fictional-child',firstName:'Alex',lastName:'Fictional',preferredName:'Alex',
 dateOfBirth:'2020-01-01',services:['speech'],status:'ACTIVE',version:3,
 referent:null,referentRevision:0,referentStatus:'NOT_DESIGNATED',
 guardians:[],assignments:[],appointments:[],events:[],...extra
});
const workspace=(extra={})=>({
 timezone:'Asia/Dubai',synthetic:true,locked:'Clinical release disabled',
 canEdit:false,canReview:false,careTeam:[],childWideReferent:null,
 child:{id:'fictional-child',name:'Alex Fictional',dateOfBirth:'2020-01-01',
 services:['speech']},
 assessments:[],hasMoreAssessments:false,hasMorePlans:false,
 plans:[],notes:[],observations:[],appointments:[],templates:[],...extra
});
const role=(role,permissions=[])=>{
 mockSession={csrfToken:'',user:{id:'fake',displayName:'Fictional Actor',email:'none@example.invalid'},
 contexts:[],permissions,activeContext:{type:'center',centerId:'fictional-center',
 membershipId:'fictional-member',role,centerName:'Fictional Center',timezone:'Asia/Dubai'}};
};
beforeAll(()=>setCenterTz('Asia/Dubai'));
afterAll(()=>setCenterTz(undefined));
beforeEach(()=>role('COORDINATOR',['center.children.read']));

describe('M4-08 child detail route role and safe operational status',()=>{
 it('renders genuine read-only child details without management or booking affordances',()=>{
  const out=render(ChildDetailPage,baseChild());
  expect(out).toContain('data-testid="child-title"');
  expect(out).toContain('data-testid="child-profile"');
  expect(out).toContain('data-testid="guardians-empty"');
  expect(out).toContain('No appointments yet');
  expect(out).not.toContain('data-testid="add-guardian-button"');
  expect(out).not.toContain('data-testid="child-archive-button"');
  expect(out).not.toContain('data-testid="child-book-button"');
 });
 it('shows exact guardian invitation status and assigned team without granting portal release',()=>{
  const d=baseChild({guardians:[{id:'g1',displayName:'Fictional Guardian',
   relationship:'mother',isPrimary:true,portalStatus:'PENDING',
   email:'none@example.invalid'}],
   assignments:[{id:'a1',membershipId:'m1',therapist:'Fictional Clinician',
   title:'SLT',service:'speech',isLead:true,startedAt:'2026-11-01T10:00:00Z',endedAt:null}],
   referent:{membershipId:'m1',displayName:'Fictional Clinician'},referentStatus:'ACTIVE'});
  const out=render(ChildDetailPage,d);
  expect(out).toContain('data-testid="guardian-g1"');
  expect(out).toContain('Fictional Guardian');
  expect(out).toContain('Invited');
  expect(out).toContain('Fictional Clinician');
  expect(out).not.toContain('data-testid="guardian-invite-g1"');
  expect(out).not.toContain('data-testid="guardian-remove-g1"');
 });
 it('allows administrator to manage active child while handover remains non-authorizing',()=>{
  role('CENTER_ADMIN',['center.children.read','center.children.manage','center.schedule.manage']);
  const out=render(ChildDetailPage,baseChild());
  expect(out).toContain('data-testid="child-archive-button"');
  expect(out).toContain('data-testid="add-guardian-button"');
  expect(out).toContain('data-testid="child-book-button"');
  expect(out).toContain('data-testid="handover-guarded-boundary"');
  expect(out).toContain('no assignment changed');
 });
 it('renders archived record as recoverable but prevents new appointments and family invitations',()=>{
  role('CENTER_ADMIN',['center.children.read','center.children.manage','center.schedule.manage']);
  const out=render(ChildDetailPage,baseChild({status:'ARCHIVED'}));
  expect(out).toContain('data-testid="child-restore-button"');
  expect(out).not.toContain('data-testid="child-book-button"');
  expect(out).not.toContain('data-testid="add-guardian-button"');
  expect(out).not.toContain('data-testid="handover-guarded-boundary"');
 });
 it('distinguishes actual request failures from still-loading child records',()=>{
  expect(render(ChildDetailPage,null)).toContain('data-testid="child-loading"');
  expect(render(ChildDetailPage,null,true)).toContain('data-testid="child-error"');
 });
});

describe('M4-08 clinical child detail route and clinical draft-only authorization cues',()=>{
 beforeEach(()=>role('THERAPIST',['center.clinical.read']));
 it('renders exact authorized child and clinical tab structure without release permission',()=>{
  const out=render(ClinicalDetailPage,workspace());
  expect(out).toContain('data-testid="clinical-workspace"');
  expect(out).toContain('data-testid="clinical-child-name"');
  expect(out).toContain('data-testid="clinical-tab-plan"');
  expect(out).toContain('data-testid="clinical-tab-assessments"');
  expect(out).toContain('data-testid="clinical-tab-sessions"');
  expect(out).toContain('data-testid="clinical-tab-reports"');
  expect(out).toContain('data-testid="child360-boundary"');
  expect(out).toContain('Authorized child fictional-child');
  expect(out).toContain('everything here is a draft');
 });
 it('shows a supervisor-specific read-only role without implying clinical approval',()=>{
  role('CLINICAL_SUPERVISOR',['center.clinical.read']);
  const out=render(ClinicalDetailPage,workspace({canReview:true,canEdit:false}));
  expect(out).toContain('Clinical supervisor review');
  expect(out).toContain('everything here is a draft');
  expect(out).not.toContain('fake-clinical-authorization');
 });
 it('keeps loading and unavailable workspace states distinct',()=>{
  expect(render(ClinicalDetailPage,null)).toContain('data-testid="clinical-loading"');
  expect(render(ClinicalDetailPage,null,true)).toContain('data-testid="clinical-error"');
 });
});
