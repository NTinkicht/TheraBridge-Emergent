// M4-08: actual family operational read model and assigned-child clinical 360.
// Read-only SSR data comes from synthetic already-authorized fixtures.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
const draw=(Component,props)=>renderToStaticMarkup(h(Component,props));
let response=null,failed=false;
jest.mock('@/components/centers/kit',()=>{
 const actual=jest.requireActual('@/components/centers/kit');
 return {...actual,useLoad:()=>({data:response,failed,reload:jest.fn()})};
});
const {setCenterTz}=require('../src/lib/operations');
const {FamilyHome}=require('../src/components/operations/FamilyHome');
const {Child360}=require('../src/components/clinical/Child360');
beforeAll(()=>setCenterTz('Asia/Dubai'));
afterAll(()=>setCenterTz(undefined));
beforeEach(()=>{response=null;failed=false;});
const visit=(id,status,more={})=>({
 id,status,startsAt:'2026-11-10T07:00:00Z',endsAt:'2026-11-10T07:30:00Z',
 service:'speech',room:null,therapist:'Fictional Therapist',changed:false,
 recurring:false,...more
});
const family=(children=[])=>({center:{name:'Fictional Center',timezone:'Asia/Dubai'},children});
const kid=(more={})=>({
 id:'fictional-child',name:'Alex',fullName:'Alex Fictional',relationship:'parent',
 remindersEnabled:false,team:[],upcoming:[],history:[],
 attendance:{attended:1,noShow:0,cancelled:0,days:30},...more
});
const goal=(key='g1')=>({key,title:'Fictional goal',measure:'count',baseline:1,target:5});
const planVersion=()=>({id:'v1',number:1,status:'DRAFT',goals:[goal()],
 homeActivities:[],goalCheckpoints:[]});
const clinical=(extra={})=>({
 timezone:'Asia/Dubai',synthetic:true,locked:'No release',canEdit:false,
 canReview:false,child:{id:'fictional-child',name:'Alex Fictional',services:['speech'],
 dateOfBirth:'2020-01-01'},
 careTeam:[],childWideReferent:null,childWideReferentStatus:'NOT_DESIGNATED',
 plans:[{id:'p1',service:'speech',title:'Fictional plan',versions:[planVersion()]}],
 notes:[],observations:[],assessments:[],appointments:[],templates:[],...extra
});
describe('M4-08 family home never infers outcomes from missing attendance or visits',()=>{
 const props={centerId:'synthetic-center',onError:()=>{}};
 it('does not fabricate a child when none are linked to this account',()=>{
  response=family();
  const out=draw(FamilyHome,props);
  expect(out).toContain('data-testid="family-empty"');
  expect(out).not.toContain('data-testid="family-child-fictional-child"');
 });
 it('renders exact scheduled, changed, and cancelled operational visit states',()=>{
  response=family([kid({remindersEnabled:true,
   upcoming:[visit('v1','SCHEDULED',{changed:true,recurring:true,room:'Room 2'}),
    visit('v2','CANCELLED')],
   history:[visit('v3','COMPLETED')],
   team:[{name:'Fictional Therapist',service:'speech',title:'SLT',isLead:true}],
   attendance:{attended:3,noShow:1,cancelled:2,days:30}})]);
  const out=draw(FamilyHome,props);
  expect(out).toContain('data-testid="family-home"');
  expect(out).toContain('data-testid="family-child-fictional-child"');
  expect(out).toContain('data-testid="family-visit-v1"');
  expect(out).toContain('data-testid="family-visit-changed-v1"');
  expect(out).toContain('data-testid="family-visit-v2"');
  expect(out).toContain('The center cancelled this visit');
  expect(out).toContain('data-testid="family-visit-v3"');
  expect(out).toContain('data-testid="family-reminders-toggle-fictional-child"');
  expect(out).toContain('Fictional Therapist');
 });
 it('presents empty upcoming/history and no care team without inventing appointments',()=>{
  response=family([kid()]);
  const out=draw(FamilyHome,props);
  expect(out).toContain('data-testid="family-upcoming-empty-fictional-child"');
  expect(out).toContain('data-testid="family-history-empty-fictional-child"');
  expect(out).toContain('Your care team will appear here once assigned');
 });
 it('keeps loading and failed authorized response distinct',()=>{
  expect(draw(FamilyHome,props)).toContain('data-testid="family-loading"');
  failed=true;
  expect(draw(FamilyHome,props)).toContain('data-testid="family-error"');
 });
});
describe('M4-08 clinician 360° scopes observations and family feedback',()=>{
 const props=ws=>({ws,centerId:'fictional-center',onNavigate:()=>{}});
 it('renders exact plan current goal, not invented observations',()=>{
  const out=draw(Child360,props(clinical()));
  expect(out).toContain('data-testid="child-360"');
  expect(out).toContain('data-testid="child360-care-team-empty"');
  expect(out).toContain('No measurements recorded');
  expect(out).toContain('never a family release');
  expect(out).toContain('Child-wide referent:');
 });
 it('displays only supplied authorized care team and exact goal-version evidence',()=>{
  const w=clinical({canEdit:true,
   careTeam:[{assignmentId:'a1',displayName:'Fictional Clinician',
    service:'speech',isSpecialtyLead:true}],
   childWideReferent:{displayName:'Fictional Referent'},
   observations:[{id:'ob1',planVersionId:'v1',goalKey:'g1',
    value:2,observedOn:'2026-11-10',note:'Fictional',author:'Synthetic'}]});
  const out=draw(Child360,props(w));
  expect(out).toContain('data-testid="child360-care-team-list"');
  expect(out).toContain('Fictional Clinician');
  expect(out).toContain('Fictional Referent');
  expect(out).toContain('Fictional goal');
  expect(out).toContain('1 recorded measurements');
  expect(out).toContain('Loading permitted practice feedback');
  expect(out).toContain('Specialty leads are assigned per therapy service');
 });
});
