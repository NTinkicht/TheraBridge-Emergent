// M4-08 Stage 1: real source-executing operational success states for center
// onboarding/governance and family/staff activity separation. No live data.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
let data;
let session={};
jest.mock('@/components/centers/kit',()=>{
 const kit=jest.requireActual('@/components/centers/kit');
 const React=require('react');
 return {...kit,
  Workspace:({children,active,permission})=>React.createElement('main',
   {'data-testid':'operational-success','data-active':active,
    'data-permission':permission},typeof children==='function'?children(session,()=>{}):children),
  useLoad:()=>({data,failed:false,reload:jest.fn(),setData:jest.fn()})
 };
});
jest.mock('next/navigation',()=>({
 useRouter:()=>({push:jest.fn(),replace:jest.fn(),refresh:jest.fn()}),
 useSearchParams:()=>new URLSearchParams(),usePathname:()=>'/app'
}));
const CentersPage=require('../src/app/app/centers/page').default;
const SetupPage=require('../src/app/app/setup/page').default;
const ProfilePage=require('../src/app/app/profile/page').default;
const CenterSettingsPage=require('../src/app/app/center/page').default;
const AccessReviewPage=require('../src/app/app/access-review/page').default;
const ActivitiesPage=require('../src/app/app/activities/page').default;
const render=(Page,fixture)=>{data=fixture;return renderToStaticMarkup(h(Page));};
function role(r,permissions=[]){
 session={user:{id:'fake',displayName:'Synthetic User',email:'none@example.invalid'},
 csrfToken:'',contexts:[],permissions,
 activeContext:{type:'center',centerId:'synthetic-center',membershipId:'m1',
 centerName:'Synthetic center',role:r,timezone:'Asia/Dubai'}};
}
beforeEach(()=>role('CENTER_ADMIN'));

describe('M4-08 real center list and provisioning read models',()=>{
 it('shows exact tenant and administrator invitation status, never unscoped clinical records',()=>{
  role('PLATFORM_ADMIN',['platform.centers.read']);
  const out=render(CentersPage,{items:[{
   id:'c1',name:'Fictional Center',slug:'fictional-center',city:'Sharjah',country:'AE',
   status:'ACTIVE',source:'APPLICATION',createdAt:'2026-11-09T09:00:00Z',
   activeMembers:3,setup:{done:2,total:4},adminStatus:'INVITED'
  }],total:1,page:1,pageSize:20});
  expect(out).toContain('data-testid="center-row-fictional-center"');
  expect(out).toContain('Administrator invited');
  expect(out).toContain('setup 2/4');
  expect(out).toContain('from application');
  expect(out).not.toContain('fake-patient-not-authorized');
 });
 it('offers center provisioning but displays a genuine empty platform read model',()=>{
  role('PLATFORM_ADMIN',['platform.centers.read']);
  const out=render(CentersPage,{items:[],total:0});
  expect(out).toContain('data-testid="centers-empty"');
  expect(out).toContain('data-testid="new-center-button"');
  expect(out).not.toContain('center-row-fictional-center');
 });
});

describe('M4-08 actual center setup and immutable clinical denial language',()=>{
 const steps=[
  {key:'center_details',manual:false,completedAt:'2026-11-09T10:00:00Z',completedBy:'Synthetic Admin'},
  {key:'your_profile',manual:false,completedAt:null,completedBy:null},
  {key:'invite_team',manual:false,completedAt:null,completedBy:null},
  {key:'review_permissions',manual:true,completedAt:null,completedBy:null},
 ];
 it('preserves partially completed setup progress and locked role semantics',()=>{
  const out=render(SetupPage,{steps,done:1,total:4,activeMembers:1,invitationsSent:0});
  expect(out).toContain('data-testid="setup-progress"');
  expect(out).toContain('data-testid="setup-step-center_details-done"');
  expect(out).toContain('data-testid="setup-step-your_profile-link"');
  expect(out).toContain('data-testid="setup-step-review_permissions-complete"');
  expect(out).toContain('data-testid="role-summary"');
  expect(out).toContain('approval and report release are locked');
 });
 it('reports completed setup without inventing approval to sign or release',()=>{
  const finished=steps.map(x=>({...x,completedAt:'2026-11-10T09:00:00Z'}));
  const out=render(SetupPage,{steps:finished,done:4,total:4,activeMembers:3,invitationsSent:2});
  expect(out).toContain('All done. Your center is ready for its team');
  expect(out).toContain('Clinical sign-off');
  expect(out).not.toContain('data-testid="setup-step-review_permissions-complete"');
 });
});

describe('M4-08 actual personal profile and center settings forms',()=>{
 it('exposes immutable email and editable explicit staff profile fields',()=>{
  const user={id:'m1',displayName:'Fictional Clinician',email:'none@example.invalid',
   status:'ACTIVE',roles:['THERAPIST'],title:'Speech therapist',phone:null,
   specialties:['speech'],responsibilities:['training']};
  const out=render(ProfilePage,user);
  expect(out).toContain('data-testid="profile-form"');
  expect(out).toContain('data-testid="profile-email-input"');
  expect(out).toContain('disabled=""');
  expect(out).toContain('data-testid="profile-save-button"');
  expect(out).toContain('Fictional Clinician');
 });
 it('retains immutable center address and hides save from read-only permissions',()=>{
  const center={id:'c1',name:'Fictional Center',slug:'never-edit-slug',
   timezone:'Asia/Dubai',country:'AE',city:'Sharjah',
   specialties:['speech'],status:'ACTIVE',version:4};
  role('COORDINATOR',['center.settings.read']);
  const readonly=render(CenterSettingsPage,center);
  expect(readonly).toContain('data-testid="center-settings-form"');
  expect(readonly).toContain('never-edit-slug');
  expect(readonly).not.toContain('settings-save-button');
  role('CENTER_ADMIN',['center.settings.read','center.settings.update']);
  const editable=render(CenterSettingsPage,center);
  expect(editable).toContain('data-testid="settings-save-button"');
 });
});

describe('M4-08 actual guardian/consent readiness display stays non-authorizing',()=>{
 const empty=()=>({children:[],invitations:[],policies:[],records:[],assignments:[],
 staff:[],transfers:[],events:[]});
 it('does not assume family consent or clinical permission from zero records',()=>{
  const out=render(AccessReviewPage,empty());
  expect(out).toContain('Clinical activation is locked');
  expect(out).toContain('No consent grants');
  expect(out).toContain('No policy proposals');
  expect(out).toContain('No operational events');
  expect(out).toContain('Save simulation only');
 });
 it('renders a revoked guardian separately from read-only policy proposals',()=>{
  const state=empty();
  state.children=[{id:'child1',firstName:'Alex',lastName:'Fictional',
   guardians:[{id:'g1',displayName:'Synthetic Guardian',relationship:'PARENT',
    removedAt:'2026-11-09T10:00:00Z',userId:'fake-user',capabilities:[],
    restrictions:'No current sharing rights'}]}];
  state.policies=[{id:'p1',purpose:'FAMILY_SUMMARY',number:1,
   status:'DRAFT',restrictions:{canRelease:false}}];
  state.records=[{id:'r1',guardianLinkId:'g1',policyId:'p1',status:'PROPOSED',
   effectiveAt:null,expiresAt:null,revokedAt:null,previousId:null,
   restrictions:{canRelease:false}}];
  const out=render(AccessReviewPage,state);
  expect(out).toContain('Synthetic Guardian');
  expect(out).toContain('Revoked');
  expect(out).toContain('Authorizes nothing');
  expect(out).toContain('Disabled');
  expect(out).not.toContain('Clinical sharing enabled');
 });
});

describe('M4-08 actual staff vs family activities exposure',()=>{
 it('staff library shows matching template but hides create action from read-only role',()=>{
  role('THERAPIST',['center.activities.read']);
  const out=render(ActivitiesPage,{queryKey:JSON.stringify(['synthetic-center','','all','all']),
   items:[{id:'t1',title:'Synthetic paper practice',service:'speech',
    ageBand:'6–8',minutes:10,materials:['paper'],steps:['practice'],
    safety:['supervise'],library:'center'}],hasMore:false,nextOffset:null});
  expect(out).toContain('data-testid="activities-list"');
  expect(out).toContain('Synthetic paper practice');
  expect(out).not.toContain('data-testid="template-form-toggle"');
 });
 it('guardian sees only sample library warning, never center template management',()=>{
  role('GUARDIAN',['family.activities.read']);
  const out=render(ActivitiesPage,{sample:true,released:false,children:[
   {id:'child1',name:'Alex',activities:[]}]});
  expect(out).toContain('data-testid="family-activities"');
  expect(out).toContain('data-testid="family-activities-sample-note"');
  expect(out).toContain('data-testid="family-activities-child-child1"');
  expect(out).toContain('sharing plans is switched off');
  expect(out).not.toContain('data-testid="template-form-toggle"');
 });
});
