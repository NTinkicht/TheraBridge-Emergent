// M4-08: real React hook/side-effect coverage for guardian reminders
// and clinician-scoped non-clinical practice feedback. Synthetic only.
const React=require('react');
const Renderer=require('react-test-renderer');
const {act,create}=Renderer;
const h=React.createElement;
jest.mock('next/link',()=>({
 __esModule:true,default:({href,children,...props})=>React.createElement('a',{...props,href},children)
}));
let familyResponse=null,failed=false;
jest.mock('@/components/centers/kit',()=>{
 const actual=jest.requireActual('@/components/centers/kit');
 return {...actual,useLoad:()=>({
  data:familyResponse,failed,reload:jest.fn()
 })};
});
jest.mock('@/lib/messages',()=>{
 const actual=jest.requireActual('@/lib/messages');
 return {...actual,messagesApi:{...actual.messagesApi,list:jest.fn(async()=>({
  unread:0,items:[]}))}};
});
jest.mock('@/lib/operations',()=>{
 const actual=jest.requireActual('@/lib/operations');
 return {...actual,opsApi:{...actual.opsApi,setReminders:jest.fn()}};
});
jest.mock('@/lib/clinical',()=>{
 const actual=jest.requireActual('@/lib/clinical');
 return {...actual,clinicalApi:{...actual.clinicalApi,practiceFeedback:jest.fn()}};
});
const {opsApi,setCenterTz}=require('../src/lib/operations');
const {clinicalApi}=require('../src/lib/clinical');
const {FamilyHome}=require('../src/components/operations/FamilyHome');
const {Child360}=require('../src/components/clinical/Child360');
let tree=null;
const get=(id)=>tree.root.findByProps({'data-testid':id});
const click=async(id)=>act(async()=>{get(id).props.onClick();});
beforeAll(()=>setCenterTz('Asia/Dubai'));
afterAll(()=>setCenterTz(undefined));
beforeEach(()=>{familyResponse=null;failed=false;jest.clearAllMocks();});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const child=()=>({id:'fake-child',name:'Alex',fullName:'Alex Fictional',
 remindersEnabled:false,team:[],upcoming:[],history:[],
 attendance:{attended:0,noShow:0,cancelled:0,days:30}});
const ws=()=>({
 timezone:'Asia/Dubai',synthetic:true,locked:'Clinical release disabled',
 canEdit:true,canReview:false,child:{id:'fake-child',name:'Alex',
 services:['speech'],dateOfBirth:'2020-01-01'},
 careTeam:[],childWideReferent:null,childWideReferentStatus:'NOT_DESIGNATED',
 plans:[],notes:[],assessments:[],observations:[],appointments:[],templates:[]
});
describe('M4-08 mounted guardian reminder update and rollback',()=>{
 const mount=async()=>{familyResponse={center:{name:'Synthetic Center'},children:[child()]};
  await act(async()=>{tree=create(h(FamilyHome,{centerId:'c1',onError:()=>{}}));});};
 it('sends center/child-scoped reminder toggle and updates its checked state only on success',async()=>{
  opsApi.setReminders.mockResolvedValue({remindersEnabled:true});
  await mount();
  expect(get('family-reminders-toggle-fake-child').props['aria-checked']).toBe(false);
  await click('family-reminders-toggle-fake-child');
  expect(opsApi.setReminders).toHaveBeenCalledWith('c1','fake-child',true);
  expect(get('family-reminders-toggle-fake-child').props['aria-checked']).toBe(true);
 });
 it('keeps previously saved state and shows failure when server denies reminder changes',async()=>{
  opsApi.setReminders.mockRejectedValue(new Error('Synthetic denied'));
  await mount();
  await click('family-reminders-toggle-fake-child');
  expect(get('family-reminders-toggle-fake-child').props['aria-checked']).toBe(false);
  expect(JSON.stringify(tree.toJSON())).toContain('That didn’t save. Try again.');
 });
});
describe('M4-08 mounted clinician practice-feedback read boundaries',()=>{
 it('refuses to display cross-child or cross-specialty feedback from server response',async()=>{
  clinicalApi.practiceFeedback.mockResolvedValue({synthetic:true,notClinical:true,items:[
   {id:'valid',childId:'fake-child',service:'speech',choice:'COMPLETED',practiceDate:'2026-11-10'},
   {id:'foreign',childId:'other-child',service:'speech',choice:'COMPLETED',practiceDate:'2026-11-10'},
   {id:'other-service',childId:'fake-child',service:'ot',choice:'NEEDED_HELP',practiceDate:'2026-11-10'}
  ]});
  await act(async()=>{tree=create(h(Child360,{ws:ws(),centerId:'c1',onNavigate:()=>{}}));});
  expect(clinicalApi.practiceFeedback).toHaveBeenCalledWith('c1','fake-child');
  expect(get('child360-family-practice-outcomes')).toBeTruthy();
  const out=JSON.stringify(tree.toJSON());
  expect(out).toContain('Recent outcomes: 1');
  expect(out).not.toContain('Recent outcomes: 3');
  expect(out).toContain('do not establish progress toward clinical goals');
 });
 it('fails closed on an invalid non-clinical reply and permits an explicit retry',async()=>{
  clinicalApi.practiceFeedback
   .mockResolvedValueOnce({synthetic:true,notClinical:false,items:[]})
   .mockResolvedValueOnce({synthetic:true,notClinical:true,items:[]});
  await act(async()=>{tree=create(h(Child360,{ws:ws(),centerId:'c1',onNavigate:()=>{}}));});
  expect(get('child360-family-practice-error')).toBeTruthy();
  await click('child360-family-practice-retry');
  expect(clinicalApi.practiceFeedback).toHaveBeenCalledTimes(2);
  expect(get('child360-family-practice-empty')).toBeTruthy();
 });
 it('never calls family-feedback endpoint for supervisor-only child view',async()=>{
  const w={...ws(),canEdit:false};
  await act(async()=>{tree=create(h(Child360,{ws:w,centerId:'c1',onNavigate:()=>{}}));});
  expect(clinicalApi.practiceFeedback).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).not.toContain('child360-family-practice-outcomes');
 });
});
