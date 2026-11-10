// M4-08: real source-executing staff and center provisioning route contract tests.
// Synthetic-only source data. Server auth remains a separately tested boundary.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
let datum=null,failed=false,session={};
jest.mock('@/components/centers/kit',()=>{
 const actual=jest.requireActual('@/components/centers/kit');
 return {...actual,
  Workspace:({children,active,permission})=>h('main',{'data-testid':'scoped-workspace',
   'data-active':active,'data-required':permission},typeof children==='function'?children(session,()=>{}):children),
  useLoad:()=>({data:datum,failed,reload:jest.fn(),setData:jest.fn()})
 };
});
jest.mock('next/navigation',()=>({
 useParams:()=>({id:'record-1'}),
 useRouter:()=>({push:jest.fn(),replace:jest.fn(),refresh:jest.fn()}),
 usePathname:()=>'/app',useSearchParams:()=>new URLSearchParams()
}));
jest.mock('../src/components/operations/TrialCard',()=>({
 TrialCard:({centerId})=>h('aside',{'data-testid':'synthetic-trial-boundary'},'Trial '+centerId)
}));
const MemberPage=require('../src/app/app/team/[id]/page').default;
const NewCenterPage=require('../src/app/app/centers/new/page').default;
const CenterDetailPage=require('../src/app/app/centers/[id]/page').default;
const role=(kind='CENTER_ADMIN',permissions=[],membershipId='admin-1')=>{
 session={user:{id:'fake',displayName:'Fictional',email:'none@example.invalid'},csrfToken:'',
  contexts:[],permissions,activeContext:{type:'center',role:kind,centerId:'fictional-center',
   membershipId,centerName:'Fictional Center',timezone:'Asia/Dubai'}};
};
const render=(Page,data=null,isFailed=false)=>{datum=data;failed=isFailed;return renderToStaticMarkup(h(Page));};
const member=(changes={})=>({
 id:'member-1',userId:'user-1',displayName:'Fictional Staff Member',
 email:'nobody@example.invalid',status:'ACTIVE',roles:['THERAPIST'],
 title:'Speech therapist',phone:null,specialties:['speech'],
 responsibilities:['training'],statusReason:null,statusChangedAt:null,
 joinedAt:'2026-11-01T09:00:00Z',events:[],...changes
});
const center=(changes={})=>({
 id:'record-1',name:'Fictional Center',slug:'fictional-center',
 status:'ACTIVE',timezone:'Asia/Dubai',country:'AE',city:'Sharjah',
 specialties:['speech'],source:'APPLICATION',application:{id:'a1',reference:'APP-SYN'},
 createdAt:'2026-11-01T09:00:00Z',version:2,
 admins:[],adminInvitations:[],stats:{activeMembers:3,pendingStaffInvites:1},
 setup:[{key:'center_details',completedAt:'2026-11-01T09:00:00Z'},
        {key:'invite_team',completedAt:null}],events:[],...changes
});
beforeEach(()=>role('COORDINATOR',['center.staff.read']));
describe('M4-08 actual member access-lifecycle and self-management boundaries',()=>{
 it('shows exact member but no administrative mutations to coordinator without manage permission',()=>{
  const out=render(MemberPage,member());
  expect(out).toContain('data-testid="member-title"');
  expect(out).toContain('Fictional Staff Member');
  expect(out).toContain('data-testid="member-profile"');
  expect(out).not.toContain('data-testid="member-edit-card"');
  expect(out).not.toContain('data-testid="member-revoke-button"');
 });
 it('allows an administrator to see managed staff roles and revoke/suspend actions',()=>{
  role('CENTER_ADMIN',['center.staff.read','center.staff.manage']);
  const out=render(MemberPage,member());
  expect(out).toContain('data-testid="member-edit-card"');
  expect(out).toContain('data-testid="member-access-card"');
  expect(out).toContain('data-testid="member-suspend-button"');
  expect(out).toContain('data-testid="member-revoke-button"');
  expect(out).not.toContain('data-testid="member-self-note"');
 });
 it('blocks self-suspension/revocation even with manage permission',()=>{
  role('CENTER_ADMIN',['center.staff.read','center.staff.manage'],'member-1');
  const out=render(MemberPage,member({roles:['CENTER_ADMIN']}));
  expect(out).toContain('data-testid="member-self-note"');
  expect(out).not.toContain('data-testid="member-suspend-button"');
  expect(out).not.toContain('data-testid="member-revoke-button"');
  expect(out).toContain('That role is managed by TheraBridge');
 });
 it('distinguishes suspended from revoked; revoked cannot be edited',()=>{
  role('CENTER_ADMIN',['center.staff.read','center.staff.manage']);
  const suspended=render(MemberPage,member({status:'SUSPENDED',statusReason:'Synthetic suspension',
   statusChangedAt:'2026-11-09T10:00:00Z'}));
  expect(suspended).toContain('data-testid="member-reactivate-button"');
  expect(suspended).toContain('data-testid="member-status-reason-text"');
  expect(suspended).toContain('Synthetic suspension');
  const revoked=render(MemberPage,member({status:'REVOKED'}));
  expect(revoked).toContain('data-testid="member-access-card"');
  expect(revoked).not.toContain('data-testid="member-edit-card"');
  expect(revoked).not.toContain('data-testid="member-revoke-button"');
  expect(revoked).toContain('Access was revoked');
 });
 it('preserves loading and explicit failure states rather than fabricating access',()=>{
  expect(render(MemberPage,null)).toContain('data-testid="member-loading"');
  expect(render(MemberPage,null,true)).toContain('data-testid="member-error"');
 });
});
describe('M4-08 actual center platform provisioning and administrator-invitation visibility',()=>{
 it('renders real center creation form with separate administrator and center fields',()=>{
  role('PLATFORM_ADMIN',['platform.centers.create']);
  const out=render(NewCenterPage);
  expect(out).toContain('data-testid="new-center-form"');
  expect(out).toContain('data-testid="center-name-input"');
  expect(out).toContain('data-testid="admin-email-input"');
  expect(out).toContain('data-testid="create-center-submit"');
  expect(out).toContain('first administrator invitation');
  expect(out).not.toContain('data-testid="new-center-already-provisioned"');
 });
 it('shows application provenance and setup state without claiming a ready center',()=>{
  role('PLATFORM_ADMIN',['platform.centers.read']);
  const out=render(CenterDetailPage,center());
  expect(out).toContain('data-testid="center-title"');
  expect(out).toContain('data-testid="center-slug"');
  expect(out).toContain('data-testid="center-application-link"');
  expect(out).toContain('data-testid="center-setup-progress"');
  expect(out).toContain('data-testid="synthetic-trial-boundary"');
  expect(out).toContain('1 staff invitations pending');
 });
 it('displays an outstanding first admin invitation and options without assuming activation',()=>{
  role('PLATFORM_ADMIN',['platform.centers.read']);
  const pending={id:'inv-1',displayName:'Fictional Pending Admin',
   email:'nobody@example.invalid',roles:['CENTER_ADMIN'],specialties:[],
   responsibilities:[],title:null,kind:'FIRST_ADMIN',status:'PENDING',
   expiresAt:'2026-11-17T09:00:00Z',sendCount:1,
   lastSentAt:'2026-11-10T09:00:00Z',createdAt:'2026-11-10T09:00:00Z',
   acceptedAt:null,revokedAt:null};
  const out=render(CenterDetailPage,center({adminInvitations:[pending],admins:[]}));
  expect(out).toContain('data-testid="admin-invitation-inv-1"');
  expect(out).toContain('data-testid="admin-invitation-resend-inv-1"');
  expect(out).toContain('data-testid="admin-invitation-replace-inv-1"');
  expect(out).toContain('data-testid="admin-invitation-revoke-inv-1"');
  expect(out).not.toContain('data-testid="invite-admin-button"');
 });
 it('offers invite when no active invitation exists; no fake admin created',()=>{
  role('PLATFORM_ADMIN',['platform.centers.read']);
  const out=render(CenterDetailPage,center({source:'DIRECT',application:null}));
  expect(out).toContain('data-testid="invite-admin-button"');
  expect(out).toContain('Created directly');
  expect(out).not.toContain('data-testid="admin-invitation-inv-1"');
 });
 it('does not render a fabricated center on request error or loading',()=>{
  expect(render(CenterDetailPage,null)).toContain('data-testid="center-loading"');
  expect(render(CenterDetailPage,null,true)).toContain('data-testid="center-error"');
 });
});
