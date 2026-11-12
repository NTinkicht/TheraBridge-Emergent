// M4-08 90% measured Web floor: mounted real Child360 role, source/version
// provenance and synthetic practice feedback. No clinical release enabled.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/clinical/Child360ClinicalTimeline',()=>({
 Child360ClinicalTimeline:()=>h('aside',{'data-testid':'fake-timeline'})}));
jest.mock('@/components/clinical/ClinicianJourneyPanel',()=>({
 ClinicianJourneyPanel:()=>h('aside',{'data-testid':'fake-journey'})}));
jest.mock('@/lib/clinical',()=>{
 const actual=jest.requireActual('@/lib/clinical');
 return {...actual,clinicalApi:{...actual.clinicalApi,practiceFeedback:jest.fn()}};
});
const {clinicalApi}=require('../src/lib/clinical');
const {Child360}=require('../src/components/clinical/Child360');
const note=(more={})=>({id:'note-a',service:'speech',sessionDate:'2026-11-11',
 executionStatus:'IN_PROGRESS',...more});
const appointment=(more={})=>({id:'appt-a',service:'speech',status:'SCHEDULED',
 startsAt:'2099-01-01T10:00:00Z',endsAt:'2099-01-01T11:00:00Z',...more});
const goal=(more={})=>({key:'g1',title:'Fictional language goal',measure:'count',baseline:1,target:5,...more});
const version=(more={})=>({id:'v1',number:2,status:'DRAFT',goals:[goal()],homeActivities:[],...more});
const plan=(more={})=>({id:'plan-a',title:'Fictional plan',service:'speech',
 versions:[version()],...more});
const obs=(more={})=>({id:'obs-a',planVersionId:'v1',goalKey:'g1',observedOn:'2026-11-10',value:3,...more});
const feedback=(more={})=>({id:'feedback-a',childId:'child-a',service:'speech',
 choice:'COMPLETED',practiceDate:'2026-11-10',...more});
const workspace=(more={})=>({
 timezone:'Asia/Dubai',synthetic:true,canEdit:true,canReview:false,
 child:{id:'child-a',name:'Fictional Child',services:['speech']},
 plans:[],notes:[],observations:[],appointments:[],assessments:[],templates:[],
 ...more
});
let tree=null,onNavigate;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const html=()=>JSON.stringify(tree.toJSON());
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const mount=async(ws=workspace(),centerId='fictional-center')=>act(async()=>{
 tree=create(h(Child360,{ws,centerId,onNavigate}));await Promise.resolve();
 await Promise.resolve();
});
beforeEach(()=>{jest.clearAllMocks();onNavigate=jest.fn();
 clinicalApi.practiceFeedback.mockResolvedValue({
  synthetic:true,notClinical:true,items:[]});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 Child360 real authorized clinical read projections',()=>{
 it('empty authorized workspace has explicit absence, no fabricated team or goals',async()=>{
  await mount(workspace({canEdit:false}));
  expect(get('child360-care-team-empty')).toBeTruthy();
  expect(html()).toContain('No current draft goals');
  expect(html()).toContain('No session notes recorded');
  expect(html()).toContain('No assigned appointments');
  expect(find('child360-family-practice')).toHaveLength(0);
  expect(clinicalApi.practiceFeedback).not.toHaveBeenCalled();
 });
 it('empty service list remains explicit, not a guessed default specialty',async()=>{
  await mount(workspace({canEdit:false,child:{id:'child-a',name:'Fictional',services:[]}}));
  expect(html()).toContain('No service recorded');
 });
 it('child-wide referent unavailable is not treated as unassigned or publicly visible',async()=>{
  await mount(workspace({canEdit:false,childWideReferentStatus:'UNAVAILABLE'}));
  expect(html()).toContain('Referent details unavailable in this view');
  expect(html()).not.toContain('Not designated');
 });
 it('exact named referent is displayed only when already authorized in workspace',async()=>{
  await mount(workspace({canEdit:false,childWideReferent:{displayName:'Fictional referent'}}));
  expect(html()).toContain('Fictional referent');
 });
 it('assigned care team includes only provided live service entries, not family link',async()=>{
  await mount(workspace({canEdit:false,careTeam:[{
   assignmentId:'a1',displayName:'Fictional therapist',service:'speech',isSpecialtyLead:true
  },{
   assignmentId:'a2',displayName:'Another therapist',service:'speech',isSpecialtyLead:false
  }]}));
  expect(get('child360-care-team-list').findAllByType('li')).toHaveLength(2);
  expect(html()).toContain('Specialty lead');
  expect(html()).not.toContain('Guardian recipient');
 });
 it('current goal displays exact plan version ID and only its measurement',async()=>{
  await mount(workspace({canEdit:false,plans:[plan()],observations:[
   obs({id:'current',value:4}),
   obs({id:'historic',planVersionId:'v-old',value:999}),
   obs({id:'unrelated',goalKey:'another-goal',value:888})
  ]}));
  expect(html()).toContain('1 recorded measurements');
  expect(html()).toContain('latest 4 on 2026-11-10');
  expect(html()).not.toContain('latest 999');
 });
 it('goal with no matching measurement does not infer child progress',async()=>{
  await mount(workspace({canEdit:false,plans:[plan()]}));
  expect(html()).toContain('No measurements recorded for this exact plan version');
 });
 it('withdrawn source plan never appears as a current goal',async()=>{
  await mount(workspace({canEdit:false,plans:[
   plan({versions:[version({status:'WITHDRAWN'})]})
  ]}));
  expect(html()).toContain('No current draft goals are available');
  expect(html()).not.toContain('Fictional language goal');
 });
 it('future booked visit shown; past and cancelled visits omitted from upcoming',async()=>{
  await mount(workspace({canEdit:false,appointments:[
   appointment({id:'future'}),
   appointment({id:'cancelled',status:'CANCELLED'}),
   appointment({id:'past',startsAt:'2020-01-01T10:00:00Z',endsAt:'2020-01-01T11:00:00Z'})
  ]}));
  expect(html()).toContain('2099-01-01');
  expect(html()).not.toContain('2020-01-01');
 });
 it('completed unsigned notes stay distinct from drafts in the recent history',async()=>{
  await mount(workspace({canEdit:false,notes:[
   note({id:'old',sessionDate:'2026-10-01',executionStatus:'IN_PROGRESS'}),
   note({id:'current',sessionDate:'2026-11-11',executionStatus:'COMPLETED'})
  ]}));
  expect(html()).toContain('Completed unsigned session');
  expect(html()).toContain('In-progress draft');
 });
 it('navigation from aggregated counters remains scoped to existing clinical tabs',async()=>{
  await mount(workspace({canEdit:false}));
  const btn=tree.root.findByProps({
   'data-testid':'child360-progress-Current-draft-goals'});
  await act(async()=>btn.props.onClick());
  expect(onNavigate).toHaveBeenCalledWith('progress');
 });
 it('therapist practice feedback rejects malformed response without displaying activity outcomes',async()=>{
  clinicalApi.practiceFeedback.mockResolvedValueOnce({synthetic:false,notClinical:false,
   items:[feedback()]});
  await mount();
  expect(get('child360-family-practice-error')).toBeTruthy();
  expect(find('child360-family-practice-outcomes')).toHaveLength(0);
 });
 it('network denial explicitly retains error and offers retry; no inferred progress',async()=>{
  clinicalApi.practiceFeedback.mockRejectedValueOnce(new Error('Fictional consent revoked'))
   .mockResolvedValueOnce({synthetic:true,notClinical:true,items:[]});
  await mount();
  expect(get('child360-family-practice-error')).toBeTruthy();
  await click('child360-family-practice-retry');
  expect(clinicalApi.practiceFeedback).toHaveBeenCalledTimes(2);
  expect(get('child360-family-practice-empty')).toBeTruthy();
 });
 it('only exact child and assigned specialty feedback survives API result',async()=>{
  clinicalApi.practiceFeedback.mockResolvedValueOnce({
   synthetic:true,notClinical:true,items:[
    feedback({id:'allow',choice:'NEEDED_HELP'}),
    feedback({id:'foreign-child',childId:'another-child'}),
    feedback({id:'foreign-service',service:'occupational'})
   ]});
  await mount();
  expect(get('child360-family-practice-outcomes').findAllByType('li')).toHaveLength(1);
  expect(html()).toContain('Needed help');
  expect(html()).not.toContain('foreign-child');
  expect(html()).not.toContain('foreign-service');
 });
 it.each(['COMPLETED','NEEDED_HELP','NOT_COMPLETED','SKIPPED'])('renders %s only as family practice outcome',async choice=>{
  clinicalApi.practiceFeedback.mockResolvedValueOnce({synthetic:true,notClinical:true,
   items:[feedback({choice})]});
  await mount();
  expect(get('child360-family-practice-outcomes')).toBeTruthy();
  expect(html()).toContain('Responses do not establish progress toward clinical goals');
 });
 it('missing center ID prevents querying unrelated practice tenant',async()=>{
  await mount(workspace(), '');
  expect(clinicalApi.practiceFeedback).not.toHaveBeenCalled();
  expect(get('child360-family-practice')).toBeTruthy();
 });
});
