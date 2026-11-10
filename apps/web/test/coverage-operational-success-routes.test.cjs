// M4-08 Stage 1: source-executing real operational Web routes in successful,
 // not merely loading/error, states. Synthetic fixtures at the HTTP/data boundary.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
let response={data:null,failed:false};
let session={};
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 const React=require('react');
 return {...real,
  Workspace:({children,active,permission})=>React.createElement('main',
   {'data-testid':'operational-workspace','data-active':active,
    'data-required':permission},typeof children==='function'?children(session,()=>{}):children),
  useLoad:()=>({...response,reload:jest.fn(),setData:jest.fn()})
 };
});
jest.mock('next/navigation',()=>({
 useRouter:()=>({push:jest.fn(),replace:jest.fn(),refresh:jest.fn()}),
 useSearchParams:()=>new URLSearchParams(),
 usePathname:()=>'/app'
}));
const {setCenterTz}=require('../src/lib/operations');
const ChildrenPage=require('../src/app/app/children/page').default;
const ClinicalPage=require('../src/app/app/clinical/page').default;
const TeamPage=require('../src/app/app/team/page').default;
const ProgressPage=require('../src/app/app/progress/page').default;
const sampleChild={
 id:'fictional-child',firstName:'Sample',lastName:'Learner',
 preferredName:'Alex',dateOfBirth:'2020-01-01',services:['speech'],
 team:[{name:'Fictional Clinician',service:'speech'}],guardians:0,
 nextAppointment:null,status:'ACTIVE'
};
function setRole(role,permissions=[]){
 session={user:{id:'fake-actor',displayName:'Fictional Staff',email:'none@example.invalid'},
 csrfToken:'',contexts:[],permissions,
 activeContext:{type:'center',centerId:'fictional-center',membershipId:'fake',
 centerName:'Fictional Center',role,timezone:'Asia/Dubai'}};
}
function draw(Page,data){response={data,failed:false};return renderToStaticMarkup(h(Page));}
beforeAll(()=>setCenterTz('Asia/Dubai'));
afterAll(()=>setCenterTz(undefined));
beforeEach(()=>setRole('THERAPIST'));

describe('M4-08: real center children list, safe registered/assigned states',()=>{
 it('renders a genuinely returned child row with correct team scope and safe navigation',()=>{
  const out=draw(ChildrenPage,{items:[sampleChild],total:1});
  expect(out).toContain('data-testid="children-list"');
  expect(out).toContain('data-testid="child-row-fictional-child"');
  expect(out).toContain('Alex Learner');
  expect(out).toContain('Fictional Clinician');
  expect(out).toContain('No upcoming visit');
  expect(out).not.toContain('data-testid="register-child-button"');
 });
 it('only offers child registration when explicitly permitted, including empty center',()=>{
  setRole('CENTER_ADMIN',['center.children.manage']);
  const out=draw(ChildrenPage,{items:[],total:0});
  expect(out).toContain('data-testid="register-child-button"');
  expect(out).toContain('data-testid="children-empty"');
  expect(out).not.toContain('data-testid="child-row-fictional-child"');
  setRole('THERAPIST',['center.children.read']);
  const without=draw(ChildrenPage,{items:[],total:0});
  expect(without).not.toContain('register-child-button');
  expect(without).toContain('Children assigned to you will appear here');
 });
});

describe('M4-08: real clinical child-list success states with enforced caveats',()=>{
 it('lists an assigned synthetic child but never claims enabled signing or release',()=>{
  const out=draw(ClinicalPage,{items:[sampleChild]});
  expect(out).toContain('data-testid="clinical-list"');
  expect(out).toContain('data-testid="clinical-child-fictional-child"');
  expect(out).toContain('Assessments, therapy plans, session drafts and progress');
  expect(out).toContain('nothing can be signed or released');
  expect(out).not.toContain('fake-patient-not-authorized');
 });
 it('keeps unassigned state separate from display of other center children',()=>{
  const out=draw(ClinicalPage,{items:[]});
  expect(out).toContain('data-testid="clinical-list-empty"');
  expect(out).not.toContain('clinical-child-fictional-child');
 });
});

describe('M4-08: real team directory success and least-privilege affordances',()=>{
 const member={
  id:'m1',userId:'fake-u1',displayName:'Fictional Therapist',
  email:'none@example.invalid',status:'ACTIVE',roles:['THERAPIST'],
  title:'Speech therapist',phone:null,specialties:['speech'],
  responsibilities:[],statusReason:null,statusChangedAt:null,joinedAt:'2026-11-01'
 };
 it('renders received staff list, role pills and status without invitation powers',()=>{
  setRole('COORDINATOR',['center.staff.read']);
  const out=draw(TeamPage,{items:[member],total:1,page:1,pageSize:20,counts:{ACTIVE:1}});
  expect(out).toContain('data-testid="staff-list"');
  expect(out).toContain('data-testid="staff-row-m1"');
  expect(out).toContain('Fictional Therapist');
  expect(out).toContain('1 person');
  expect(out).not.toContain('data-testid="invite-staff-button"');
 });
 it('displays only the explicit invitation affordance to an approved center admin',()=>{
  setRole('CENTER_ADMIN',['center.staff.read','center.staff.invite']);
  const out=draw(TeamPage,{items:[],total:0,page:1,pageSize:20,counts:{}});
  expect(out).toContain('data-testid="invite-staff-button"');
  expect(out).toContain('data-testid="staff-empty"');
  expect(out).toContain('aria-selected="true"');
 });
});

describe('M4-08: real read-only progress with explicit recorded vs absent source distinction',()=>{
 const period={from:'2026-11-01',to:'2026-11-30'};
 const goal=(status,key,points)=>({
  childId:'fictional-child',childName:'Alex Learner',service:'speech',
  planTitle:'Fictional Plan',key,title:'Recorded synthetic count',
  measure:'count',baseline:1,target:5,prior:null,points,status
 });
 it('renders recorded values only, with explicit synthetic-not-clinical banner',()=>{
  const data={synthetic:true,period,
   children:[{id:'fictional-child',name:'Alex Learner',services:['speech']}],
   goals:[goal('recorded','g1',[
    {date:'2026-11-01',value:1,observationId:'o1'},
    {date:'2026-11-10',value:2,observationId:'o2'}])],
   summary:{goals:1,recorded:1,insufficient:0,none:0}};
  const out=draw(ProgressPage,data);
  expect(out).toContain('data-testid="progress-summary"');
  expect(out).toContain('data-testid="dash-goal-fictional-child-g1"');
  expect(out).toContain('data-testid="progress-synthetic-banner"');
  expect(out).toContain('Home activity completion is never counted as progress');
  expect(out).not.toContain('data-testid="progress-empty"');
 });
 it('renders no-data goal without converting missing evidence into positive progress',()=>{
  const data={synthetic:true,period,
   children:[{id:'fictional-child',name:'Alex Learner',services:['speech']}],
   goals:[goal('none','g1',[])],
   summary:{goals:1,recorded:0,insufficient:0,none:1}};
  const out=draw(ProgressPage,data);
  expect(out).toContain('data-testid="dash-goal-fictional-child-g1"');
  expect(out).toContain('No data in period');
  expect(out).toContain('None recorded');
  expect(out).not.toContain('fake-patient-not-authorized');
 });
});
