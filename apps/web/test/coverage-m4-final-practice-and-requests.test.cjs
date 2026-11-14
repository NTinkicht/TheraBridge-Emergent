// M4-08 final source-executing family activity and clinician request controls.
// Real React interactions, synthetic data, no clinical signing or release.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/design/ui',()=>({
 Button:({children,testId,disabled,onClick,...props})=>h('button',{'data-testid':testId,disabled,onClick,...props},children),
 Pill:({children,tone})=>h('span',{'data-tone':tone},children)
}));
jest.mock('@/components/operations/BookDialog',()=>({serviceLabel:s=>'Synthetic '+s}));
jest.mock('@/lib/practice',()=>{
 const real=jest.requireActual('@/lib/practice');
 return {...real,practiceApi:{...real.practiceApi,clinicianPlanRequests:jest.fn(),respondHomePlan:jest.fn()}};
});
const {practiceApi}=require('../src/lib/practice');
const {ActivityCard,SlotChip}=require('../src/components/practice/ActivityCard');
const {ClinicianPlanRequestsPanel}=require('../src/components/practice/ClinicianPlanRequestsPanel');
const slot=(extra={})=>({date:'2026-11-11',status:'PENDING',outcomeId:null,recordable:true,...extra});
const activity=(extra={})=>({
 id:'fictional-activity',title:'Synthetic matching cards',service:'speech',ageBand:'demo',
 minutes:10,materials:['Fictional picture cards'],steps:['Lay out cards','Match identical shapes'],
 safety:['Ask an assigned therapist before changing technique'],
 frequency:'Once weekly',slots:[],...extra
});
const req=(extra={})=>({
 id:'fictional-request',childId:'fictional-child',childName:'Fictional Alex',
 service:'speech',status:'PENDING',createdAt:'2026-11-11T09:00:00Z',
 respondedAt:null,synthetic:true,released:false,clinicalAuthorization:false,...extra
});
const inbox=(extra={})=>({synthetic:true,released:false,enabled:true,items:[req()],...extra});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const text=()=>JSON.stringify(tree.toJSON());
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const mount=async(component)=>act(async()=>{tree=create(component);});
beforeEach(()=>{
 jest.clearAllMocks();
 practiceApi.clinicianPlanRequests.mockReset().mockResolvedValue(inbox());
 practiceApi.respondHomePlan.mockReset().mockResolvedValue({status:'ACKNOWLEDGED'});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});

describe('actual guardian practice card states and safety instructions',()=>{
 it('does not expose record action for an unrecordable completed slot',async()=>{
  const onRecord=jest.fn();
  await mount(h(ActivityCard,{a:activity(),slots:[slot({status:'COMPLETED',recordable:false})],onRecord,testId:'activity'}));
  expect(get('activity-slot-2026-11-11').props['data-status']).toBe('COMPLETED');
  expect(find('activity-details')).toHaveLength(0);
  expect(onRecord).not.toHaveBeenCalled();
 });
 it('does not expose record action when callback is unavailable',async()=>{
  await mount(h(ActivityCard,{a:activity(),slots:[slot()],testId:'activity'}));
  expect(get('activity-slot-2026-11-11').props['data-status']).toBe('PENDING');
  expect(find('activity-details')).toHaveLength(0);
 });
 it('only records the exact eligible synthetic slot on user click',async()=>{
  const onRecord=jest.fn(),s=slot();
  await mount(h(ActivityCard,{a:activity(),slots:[s],onRecord,testId:'activity'}));
  await click('activity-slot-2026-11-11');
  expect(onRecord).toHaveBeenCalledTimes(1);
  expect(onRecord).toHaveBeenCalledWith(s);
 });
 it('shows an unplanned empty day without a fabricated practice outcome',async()=>{
  await mount(h(ActivityCard,{a:activity(),slots:[],testId:'activity'}));
  expect(text()).toContain('Not planned for this day');
  expect(text()).not.toContain('Completed');
 });
 it('keeps instructions collapsed by default, then shows materials/steps/safety on demand',async()=>{
  await mount(h(ActivityCard,{a:activity(),slots:[],testId:'activity'}));
  expect(find('activity-details')).toHaveLength(0);
  expect(get('activity-toggle').props['aria-expanded']).toBe(false);
  await click('activity-toggle');
  expect(get('activity-details')).toBeTruthy();
  expect(get('activity-toggle').props['aria-expanded']).toBe(true);
  expect(text()).toContain('Fictional picture cards');
  expect(text()).toContain('Match identical shapes');
  expect(text()).toContain('Ask an assigned therapist');
  await click('activity-toggle');
  expect(find('activity-details')).toHaveLength(0);
 });
 it('shows neutral no-special-equipment text rather than undefined materials',async()=>{
  await mount(h(ActivityCard,{a:activity({materials:[],steps:[],safety:[]}),slots:[],testId:'activity'}));
  await click('activity-toggle');
  expect(text()).toContain('Nothing special');
  expect(get('activity-details')).toBeTruthy();
 });
 it('conservatively labels every fixed-choice chip without implying clinical success',async()=>{
  for(const status of ['COMPLETED','NEEDED_HELP','NOT_COMPLETED','SKIPPED','PENDING','UPCOMING']){
    await mount(h(SlotChip,{slot:slot({status,recordable:false}),testId:'chip'}));
    expect(get('chip').props['data-status']).toBe(status);
    expect(text()).not.toContain('Released therapy plan');
    await act(async()=>tree.unmount());tree=null;
  }
 });
});

describe('real clinician home-plan request acknowledgement is not plan approval',()=>{
 it('loads assigned-center requests and keeps original no-release notice',async()=>{
  await mount(h(ClinicianPlanRequestsPanel,{centerId:'center-one'}));
  expect(practiceApi.clinicianPlanRequests).toHaveBeenCalledWith('center-one');
  expect(get('clinician-plan-request-fictional-request')).toBeTruthy();
  expect(text()).toContain('does not approve, sign, send or release a home plan');
  expect(get('plan-request-acknowledge')).toBeTruthy();
 });
 it('shows disabled synthetic feature without offering a mutation',async()=>{
  practiceApi.clinicianPlanRequests.mockResolvedValue(inbox({enabled:false}));
  await mount(h(ClinicianPlanRequestsPanel,{centerId:'center-one'}));
  expect(text()).toContain('Synthetic request workflow disabled');
  expect(find('plan-request-acknowledge')).toHaveLength(0);
 });
 it('shows no assigned requests without inventing child records',async()=>{
  practiceApi.clinicianPlanRequests.mockResolvedValue(inbox({items:[]}));
  await mount(h(ClinicianPlanRequestsPanel,{centerId:'center-one'}));
  expect(text()).toContain('No requests from currently connected families');
  expect(find('clinician-plan-request-fictional-request')).toHaveLength(0);
 });
 it('never offers a second mutation for a previously acknowledged request',async()=>{
  practiceApi.clinicianPlanRequests.mockResolvedValue(inbox({items:[req({status:'ACKNOWLEDGED'})]}));
  await mount(h(ClinicianPlanRequestsPanel,{centerId:'center-one'}));
  expect(get('clinician-plan-request-fictional-request')).toBeTruthy();
  expect(find('plan-request-acknowledge')).toHaveLength(0);
  expect(find('plan-request-close')).toHaveLength(0);
  expect(practiceApi.respondHomePlan).not.toHaveBeenCalled();
 });
 it('acknowledges exact id and reloads server truth after response',async()=>{
  practiceApi.clinicianPlanRequests.mockResolvedValueOnce(inbox())
    .mockResolvedValueOnce(inbox({items:[req({status:'ACKNOWLEDGED'})]}));
  await mount(h(ClinicianPlanRequestsPanel,{centerId:'center-one'}));
  await click('plan-request-acknowledge');
  expect(practiceApi.respondHomePlan).toHaveBeenCalledWith('center-one','fictional-request','ACKNOWLEDGED');
  expect(practiceApi.clinicianPlanRequests).toHaveBeenCalledTimes(2);
  expect(find('plan-request-acknowledge')).toHaveLength(0);
 });
 it('closes unavailable using exact status rather than faking a plan release',async()=>{
  practiceApi.clinicianPlanRequests.mockResolvedValueOnce(inbox())
    .mockResolvedValueOnce(inbox({items:[req({status:'CLOSED_UNAVAILABLE'})]}));
  await mount(h(ClinicianPlanRequestsPanel,{centerId:'center-one'}));
  await click('plan-request-close');
  expect(practiceApi.respondHomePlan).toHaveBeenCalledWith('center-one','fictional-request','CLOSED_UNAVAILABLE');
  expect(text()).toContain('Closed');
  expect(practiceApi.clinicianPlanRequests).toHaveBeenCalledTimes(2);
 });
 it('preserves pending status and shows retry guidance after denied mutation',async()=>{
  practiceApi.respondHomePlan.mockRejectedValueOnce(Error('Synthetic 403 denied'));
  await mount(h(ClinicianPlanRequestsPanel,{centerId:'center-one'}));
  await click('plan-request-acknowledge');
  expect(text()).toContain('could not be updated');
  expect(get('plan-request-acknowledge')).toBeTruthy();
  expect(practiceApi.clinicianPlanRequests).toHaveBeenCalledTimes(1);
 });
 it('handles failed reads without showing stale child records and restores on retry',async()=>{
  practiceApi.clinicianPlanRequests.mockRejectedValueOnce(Error('Synthetic offline'))
    .mockResolvedValueOnce(inbox());
  await mount(h(ClinicianPlanRequestsPanel,{centerId:'center-one'}));
  expect(text()).toContain('Could not load requests');
  expect(find('clinician-plan-request-fictional-request')).toHaveLength(0);
  const retry=tree.root.findAllByType('button').find(b=>b.props.children==='Retry');
  await act(async()=>{retry.props.onClick();await Promise.resolve();});
  expect(get('clinician-plan-request-fictional-request')).toBeTruthy();
 });
});
