// Stage 2 source-executing family synthetic requests and practice recording.
// No private clinical information, media or automated approval.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/design/states',()=>{
 const actual=jest.requireActual('@/components/design/states');
 return {...actual,Dialog:({open,title,children,footer,testId})=>open?
 h('section',{'data-testid':testId},h('h2',null,title),children,h('footer',null,footer)):null};
});
jest.mock('@/lib/practice',()=>{
 const real=jest.requireActual('@/lib/practice');
 return {...real,practiceApi:{...real.practiceApi,
  guardianPlanRequests:jest.fn(),requestHomePlan:jest.fn(),
  record:jest.fn(),byKey:jest.fn()}};
});
const {practiceApi}=require('../src/lib/practice');
const {GuardianPlanRequestPanel}=require('../src/components/practice/GuardianPlanRequestPanel');
const {RecordDialog}=require('../src/components/practice/RecordDialog');
const response=(more={})=>({enabled:true,synthetic:true,
 children:[{id:'child-a',name:'Fictional Alex',services:['speech','ot']}],
 items:[],...more});
const request=(extra={})=>({id:'request-a',childId:'child-a',service:'speech',
 status:'PENDING',createdAt:'2026-11-10T10:00:00Z',...extra});
const activity={id:'activity-a',title:'Synthetic home practice',minutes:10,
 materials:[],steps:[],safety:[]};
let tree,recorded,closed;
const find=id=>tree.root.findAllByProps({'data-testid':id});
const get=id=>tree.root.findByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const choose=async id=>act(async()=>get(id).props.onChange());
const html=()=>JSON.stringify(tree.toJSON());
const mountRequest=async(c='child-a')=>act(async()=>{tree=create(h(GuardianPlanRequestPanel,{
 centerId:'center-a',childId:c
}));});
const mountRecord=async()=>act(async()=>{tree=create(h(RecordDialog,{
 centerId:'center-a',childId:'child-a',childName:'Fictional Alex',
 activity,date:'2026-11-10',onClose:closed,onRecorded:recorded
}));});
beforeEach(()=>{
 jest.clearAllMocks();
 for(const k of ['guardianPlanRequests','requestHomePlan','record','byKey'])practiceApi[k].mockReset();
 practiceApi.guardianPlanRequests.mockResolvedValue(response());
 practiceApi.requestHomePlan.mockResolvedValue({});
 recorded=jest.fn();closed=jest.fn();
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('mounted guardian fixed-choice home plan requests remain non-clinical',()=>{
 it('renders no controls when environment is disabled',async()=>{
  practiceApi.guardianPlanRequests.mockResolvedValue(response({enabled:false}));
  await mountRequest();
  expect(get('guardian-home-plan-disabled')).toBeTruthy();
  expect(find('guardian-home-plan-request-speech')).toHaveLength(0);
 });
 it('cannot view or request another child without a matching guardian child entry',async()=>{
  await mountRequest('not-assigned');
  expect(find('guardian-home-plan-services')).toHaveLength(0);
  expect(html()).not.toContain('Request speech');
  expect(practiceApi.requestHomePlan).not.toHaveBeenCalled();
 });
 it('blocks a repeated pending request but allows another specialty',async()=>{
  practiceApi.guardianPlanRequests.mockResolvedValue(response({
   items:[request(),request({id:'unrelated',childId:'other-child',status:'PENDING'})]
  }));
  await mountRequest();
  expect(get('guardian-home-plan-request-speech').props.disabled).toBe(true);
  expect(get('guardian-home-plan-request-ot').props.disabled).toBe(false);
  expect(html()).not.toContain('unrelated');
  await click('guardian-home-plan-request-ot');
  expect(practiceApi.requestHomePlan).toHaveBeenCalledWith('center-a',
   expect.objectContaining({childId:'child-a',service:'ot',requestKey:expect.any(String)}));
 });
 it('reloads saved server state, not a fabricated success message',async()=>{
  practiceApi.guardianPlanRequests.mockResolvedValueOnce(response())
   .mockResolvedValueOnce(response({items:[request({status:'PENDING'})]}));
  await mountRequest();await click('guardian-home-plan-request-speech');
  expect(practiceApi.guardianPlanRequests).toHaveBeenCalledTimes(2);
  expect(get('guardian-home-plan-request-speech').props.disabled).toBe(true);
  expect(html()).toContain('No clinical plan or report delivered');
 });
 it('shows retry after failed listing and recovers on fresh server fetch',async()=>{
  practiceApi.guardianPlanRequests.mockRejectedValueOnce(new Error('network'))
   .mockResolvedValueOnce(response());
  await mountRequest();
  expect(get('guardian-home-plan-error')).toBeTruthy();
  const retry=get('guardian-home-plan-error').findByType('button');
  await act(async()=>{retry.props.onClick();await Promise.resolve();});
  expect(find('guardian-home-plan-services')).toHaveLength(1);
 });
 it('does not claim a saved plan if request creation is rejected',async()=>{
  practiceApi.requestHomePlan.mockRejectedValue(new Error('synthetic denied'));
  await mountRequest();await click('guardian-home-plan-request-speech');
  expect(get('guardian-home-plan-error')).toBeTruthy();
  expect(practiceApi.guardianPlanRequests).toHaveBeenCalledTimes(1);
  expect(html()).not.toContain('Your home plan is ready');
 });
});
describe('mounted fixed-choice practice evidence idempotency and unknown-outcome safety',()=>{
 it('requires one chosen response and confirmation before any record write',async()=>{
  await mountRecord();
  expect(get('record-next').props.disabled).toBe(true);
  expect(practiceApi.record).not.toHaveBeenCalled();
  await choose('record-choice-NEEDED_HELP');await click('record-next');
  expect(get('record-confirm')).toBeTruthy();
  expect(practiceApi.record).not.toHaveBeenCalled();
  await click('record-back');
  expect(get('record-choices')).toBeTruthy();
 });
 it('saves exact child, activity, date and choice with one idempotency key',async()=>{
  practiceApi.record.mockResolvedValue({
   choice:'COMPLETED',practiceDate:'2026-11-10',recordedAt:'2026-11-10T12:00:00Z'
  });
  await mountRecord();await choose('record-choice-COMPLETED');
  await click('record-next');await click('record-submit');
  expect(practiceApi.record).toHaveBeenCalledWith('center-a',{
   childId:'child-a',templateId:'activity-a',practiceDate:'2026-11-10',
   choice:'COMPLETED',idempotencyKey:expect.any(String)
  });
  expect(get('record-success')).toBeTruthy();
  expect(recorded).toHaveBeenCalledTimes(1);
 });
 it('keeps a transport-uncertain result unresolved until server confirms by key',async()=>{
  practiceApi.record.mockRejectedValue(new Error('Synthetic dropped connection'));
  practiceApi.byKey.mockResolvedValue({
   choice:'SKIPPED',practiceDate:'2026-11-10',recordedAt:'2026-11-10T12:00:00Z'
  });
  await mountRecord();await choose('record-choice-SKIPPED');
  await click('record-next');await click('record-submit');
  expect(get('record-unknown')).toBeTruthy();
  expect(recorded).not.toHaveBeenCalled();
  const sentKey=practiceApi.record.mock.calls[0][1].idempotencyKey;
  await click('record-check');
  expect(practiceApi.byKey).toHaveBeenCalledWith('center-a',sentKey);
  expect(get('record-success')).toBeTruthy();
  expect(recorded).toHaveBeenCalledTimes(1);
  expect(practiceApi.record).toHaveBeenCalledTimes(1);
 });
 it('permits exact-key retry only after server confirms missing record',async()=>{
  practiceApi.record.mockRejectedValueOnce(new Error('Synthetic timeout'))
   .mockResolvedValueOnce({choice:'COMPLETED',practiceDate:'2026-11-10',
    recordedAt:'2026-11-10T13:00:00Z'});
  practiceApi.byKey.mockRejectedValue({status:404});
  await mountRecord();await choose('record-choice-COMPLETED');
  await click('record-next');await click('record-submit');await click('record-check');
  expect(get('record-not-saved')).toBeTruthy();
  await click('record-submit');
  expect(practiceApi.record).toHaveBeenCalledTimes(2);
  expect(practiceApi.record.mock.calls[1][1].idempotencyKey)
   .toEqual(practiceApi.record.mock.calls[0][1].idempotencyKey);
  expect(recorded).toHaveBeenCalledTimes(1);
 });
 it('treats rejected input as failure rather than a saved outcome',async()=>{
  practiceApi.record.mockRejectedValue({status:422,message:'Synthetic invalid choice'});
  await mountRecord();await choose('record-choice-NOT_COMPLETED');
  await click('record-next');await click('record-submit');
  expect(get('record-failure')).toBeTruthy();
  expect(recorded).not.toHaveBeenCalled();
  await click('record-retry-choose');
  expect(get('record-choices')).toBeTruthy();
 });
});
