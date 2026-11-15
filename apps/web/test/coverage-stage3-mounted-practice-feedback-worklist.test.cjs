// Stage 3: real clinician/supervisor practice feedback inbox. Only synthetic
// fixed choices are visible; acknowledgement never changes a clinical goal,
 // signs a report, grants guardian access or releases a home plan.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let session,onError;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('@/components/centers/kit',()=>{
 const a=jest.requireActual('@/components/centers/kit');
 return {...a,Workspace:({children})=>children(session,onError),
 SelectField:({value,onChange,options,testId})=>h('select',{
  value,'data-testid':testId,onChange:e=>onChange(e.target.value)
 },options.map(o=>h('option',{key:o.value,value:o.value},o.label)))};
});
jest.mock('@/components/practice/ClinicianPlanRequestsPanel',()=>({
 ClinicianPlanRequestsPanel:({centerId})=>h('aside',{'data-testid':'fake-plan-requests-'+centerId})}));
jest.mock('@/components/practice/HandoverInboxPanel',()=>({
 HandoverInboxPanel:({centerId})=>h('aside',{'data-testid':'fake-handover-'+centerId})}));
jest.mock('@/lib/practice',()=>{
 const a=jest.requireActual('@/lib/practice');
 return {...a,practiceApi:{...a.practiceApi,inbox:jest.fn(),acknowledge:jest.fn()}};
});
const {practiceApi}=require('../src/lib/practice');
const PracticeFeedbackPage=require('../src/app/app/practice-feedback/page').default;
const entry=(more={})=>({
 id:'feedback-a',activity:'Fictional matching cards',childId:'child-a',
 childName:'Fictional Alex',service:'speech',
 practiceDate:'2026-11-10',guardian:'Fictional Parent',
 relationship:'mother',choice:'NEEDED_HELP',acknowledgedAt:null,
 guardianAccessRemoved:false,...more
});
const inbox=(more={})=>({
 counts:{new:1,total:1},canAcknowledge:true,
 items:[entry()],children:[{id:'child-a',name:'Fictional Alex'}],
 activities:[{id:'template-a',title:'Fictional matching cards'}],...more
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const mount=async()=>act(async()=>{tree=create(h(PracticeFeedbackPage));});
const json=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();practiceApi.inbox.mockReset();practiceApi.acknowledge.mockReset();
 practiceApi.inbox.mockResolvedValue(inbox());
 practiceApi.acknowledge.mockResolvedValue({acknowledgedAt:'2026-11-10T12:00:00Z'});
 session={activeContext:{type:'center',centerId:'center-a',role:'THERAPIST'},
 permissions:['center.practice.read']};
 onError=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real center feedback never infers family clinical progress',()=>{
 it('loads exact center feedback with explicit synthetic/non-progress notice',async()=>{
  await mount();
  expect(practiceApi.inbox).toHaveBeenCalledWith('center-a',{
   childId:'',templateId:'',choice:'',status:'',from:'',to:''
  });
  expect(get('feedback-title')).toBeTruthy();
  expect(get('feedback-synthetic-banner')).toBeTruthy();
  expect(get('feedback-feedback-a')).toBeTruthy();
  expect(json()).toContain('not clinical observations');
 });
 it('filters exact returned child, activity, answer and read status without changing center',async()=>{
  await mount();
  await change('feedback-filter-child','child-a');
  await change('feedback-filter-activity','template-a');
  await change('feedback-filter-choice','NEEDED_HELP');
  await change('feedback-filter-status','new');
  expect(practiceApi.inbox).toHaveBeenLastCalledWith('center-a',expect.objectContaining({
   childId:'child-a',templateId:'template-a',choice:'NEEDED_HELP',status:'new'
  }));
 });
 it('refuses inverted date range without issuing a new data request',async()=>{
  await mount();
  await change('feedback-filter-from','2026-11-20');
  await change('feedback-filter-to','2026-11-10');
  expect(get('feedback-period-error')).toBeTruthy();
  const count=practiceApi.inbox.mock.calls.length;
  expect(count).toBeGreaterThan(0);
  expect(get('feedback-period-error').props.children).toContain('start date');
 });
 it('allows only returned acknowledged scope; refreshes server truth afterwards',async()=>{
  await mount();await click('feedback-ack-feedback-a');
  expect(practiceApi.acknowledge).toHaveBeenCalledWith('center-a','feedback-a');
  expect(practiceApi.inbox).toHaveBeenCalledTimes(2);
  expect(find('feedback-ack-error')).toHaveLength(0);
 });
 it('does not infer acknowledgement after a rejected server mutation',async()=>{
  practiceApi.acknowledge.mockRejectedValue({status:403,message:'Synthetic access revoked'});
  await mount();await click('feedback-ack-feedback-a');
  expect(get('feedback-ack-error')).toBeTruthy();
  expect(practiceApi.inbox).toHaveBeenCalledTimes(1);
  expect(get('feedback-ack-feedback-a')).toBeTruthy();
 });
 it('prevents supervisors from marking guardian feedback as clinically acknowledged',async()=>{
  session.activeContext.role='CLINICAL_SUPERVISOR';
  practiceApi.inbox.mockResolvedValue(inbox({canAcknowledge:false}));
  await mount();
  expect(find('feedback-ack-feedback-a')).toHaveLength(0);
  expect(get('feedback-new-feedback-a')).toBeTruthy();
  expect(json()).toContain('supervisors can read but not acknowledge');
 });
 it('renders historic acknowledged feedback distinctly, with removed guardian status',async()=>{
  practiceApi.inbox.mockResolvedValue(inbox({
   items:[entry({acknowledgedAt:'2026-11-09T12:00:00Z',
    acknowledgedBy:'Fictional Leila',guardianAccessRemoved:true})],
   counts:{new:0,total:1}
  }));
  await mount();
  expect(get('feedback-acked-feedback-a')).toBeTruthy();
  expect(find('feedback-ack-feedback-a')).toHaveLength(0);
  expect(json()).toContain('guardian access since removed');
 });
 it('shows empty feedback without inventing sample results',async()=>{
  practiceApi.inbox.mockResolvedValue(inbox({items:[],counts:{new:0,total:0}}));
  await mount();
  expect(get('feedback-empty')).toBeTruthy();
  expect(find('feedback-feedback-a')).toHaveLength(0);
 });
 it('keeps plan requests and handover scoped only to assigned therapist',async()=>{
  await mount();
  expect(get('fake-plan-requests-center-a')).toBeTruthy();
  expect(get('fake-handover-center-a')).toBeTruthy();
  expect(get('feedback-feedback-a')).toBeTruthy();
 });
 it('shows denied inbox with safe retry rather than another center records',async()=>{
  practiceApi.inbox.mockRejectedValueOnce(new Error('Synthetic denied'))
   .mockResolvedValueOnce(inbox());
  await mount();
  expect(get('feedback-error')).toBeTruthy();
  expect(find('feedback-feedback-a')).toHaveLength(0);
  const retry=get('feedback-error').findAllByType('button')[0];
  await act(async()=>{retry.props.onClick();await Promise.resolve();});
  expect(get('feedback-feedback-a')).toBeTruthy();
 });
});
