// M4-08 source-executed manager handover UI: scoped incoming therapist search,
// advisory readiness, source CAS/acknowledgment, cancellations and paginated history.
// Backend calls are mocked; no clinical data is released or permissions granted.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/design/ui',()=>({
 Card:({children,testId})=>h('section',{'data-testid':testId},children),
 Button:({children,testId,disabled,onClick})=>h('button',{'data-testid':testId,disabled,onClick},children)
}));
jest.mock('@/components/centers/kit',()=>({SelectField:({label,value,onChange,testId,options})=>
 h('select',{'aria-label':label,'data-testid':testId,value,onChange:e=>onChange(e.target.value)},
 options.map(o=>h('option',{key:o.value,value:o.value},o.label)))}));
jest.mock('@/components/operations/BookDialog',()=>({serviceLabel:s=>'Fictional '+s}));
jest.mock('@/lib/operations',()=>{
 const a=jest.requireActual('@/lib/operations');
 return {...a,opsApi:{...a.opsApi,
  handovers:jest.fn(),therapists:jest.fn(),
  proposeHandover:jest.fn(),cancelHandover:jest.fn(),handoverReadiness:jest.fn()
 }};
});
const {opsApi}=require('../src/lib/operations');
const {HandoverProposalPanel}=require('../src/components/operations/HandoverProposalPanel');
const assignment=(extra={})=>({
 id:'assignment-a',membershipId:'therapist-a',therapist:'Fictional Leila',
 service:'speech',endedAt:null,...extra
});
const child=(extra={})=>({id:'child-a',assignments:[assignment()],services:['speech','occupational'],...extra});
const request=(extra={})=>({
 id:'request-a',childId:'child-a',fromMembershipId:'therapist-a',
 toMembershipId:'therapist-b',service:'speech',status:'PENDING_ACK',version:1,
 synthetic:true,accessGranted:false,assignmentChanged:false,clinicalHandover:false,
 released:false,...extra
});
const inbox=(extra={})=>({enabled:true,synthetic:true,items:[],nextCancelledOffset:null,...extra});
const staff=(extra={})=>({membershipId:'therapist-b',displayName:'Fictional Noor',specialties:['speech'],...extra});
const readiness=(extra={})=>({
 proposalId:'request-a',status:'PENDING_ACK',checkedAt:'2026-11-11T09:00:00Z',
 synthetic:true,readonly:true,readyForTransfer:false,accessGranted:false,
 assignmentChanged:false,clinicalHandover:false,released:false,
 checks:[
  {code:'PROPOSAL_OPEN',met:true,label:'Operational proposal remains open'},
  {code:'SIGNED_CLINICAL_AUTHORIZATION',met:false,label:'Clinical authorization not available'}
 ],...extra
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const text=()=>JSON.stringify(tree.toJSON());
const mount=async(c=child())=>act(async()=>{tree=create(h(HandoverProposalPanel,{centerId:'center-a',child:c}));});
const change=async(id,v)=>act(async()=>{get(id).props.onChange({target:{value:v}});await Promise.resolve();});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const rowButtons=id=>get('handover-row-'+id).findAllByType('button');
const pressRow=async(id,i)=>act(async()=>{rowButtons(id)[i].props.onClick();await Promise.resolve();});
beforeEach(()=>{
 jest.clearAllMocks();
 opsApi.handovers.mockReset().mockResolvedValue(inbox());
 opsApi.therapists.mockReset().mockResolvedValue({items:[staff()],nextOffset:null});
 opsApi.proposeHandover.mockReset().mockResolvedValue({id:'request-a',status:'PENDING_ACK'});
 opsApi.cancelHandover.mockReset().mockResolvedValue({id:'request-a',status:'CANCELLED'});
 opsApi.handoverReadiness.mockReset().mockResolvedValue(readiness());
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});

describe('real handover manager UI requires active scoped specialty and qualified recipient',()=>{
 it('does not show proposal actions when synthetic handover flag is disabled',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({enabled:false}));
  await mount();
  expect(get('handover-disabled')).toBeTruthy();
  expect(find('handover-propose')).toHaveLength(0);
  expect(opsApi.therapists).not.toHaveBeenCalled();
 });
 it('shows only active child assignments and does not query therapists until chosen',async()=>{
  await mount(child({assignments:[assignment(),assignment({id:'ended',endedAt:'2026-11-11T09:00Z'})]}));
  const options=get('handover-current').findAllByType('option').map(o=>o.props.value);
  expect(options).toContain('assignment-a');
  expect(options).not.toContain('ended');
  expect(opsApi.therapists).not.toHaveBeenCalled();
  expect(get('handover-propose').props.disabled).toBe(true);
 });
 it('selecting an active assignment fetches matching specialty and shows eligible outgoing options only',async()=>{
  opsApi.therapists.mockResolvedValueOnce({items:[
   staff(),staff({membershipId:'therapist-a',displayName:'Existing clinician'}),
   staff({membershipId:'other-specialty',specialties:['occupational']})
  ],nextOffset:null});
  await mount();await change('handover-current','assignment-a');
  expect(opsApi.therapists).toHaveBeenCalledWith('center-a',{service:'speech',search:'',limit:100});
  const options=get('handover-incoming').findAllByType('option').map(o=>o.props.value);
  expect(options).toContain('therapist-b');
  expect(options).not.toContain('therapist-a');
  expect(options).not.toContain('other-specialty');
 });
 it('cannot submit while no incoming therapist is selected',async()=>{
  await mount();await change('handover-current','assignment-a');
  expect(get('handover-propose').props.disabled).toBe(true);
  await click('handover-propose');
  expect(opsApi.proposeHandover).not.toHaveBeenCalled();
 });
 it('creates exact child + current assignment proposal without assigning new clinician',async()=>{
  await mount();await change('handover-current','assignment-a');
  await change('handover-incoming','therapist-b');
  await change('handover-reason','FAMILY_REQUEST');
  expect(get('handover-propose').props.disabled).toBe(false);
  await click('handover-propose');
  expect(opsApi.proposeHandover).toHaveBeenCalledWith('center-a',{
   childId:'child-a',fromMembershipId:'therapist-a',
   toMembershipId:'therapist-b',service:'speech',reasonCode:'FAMILY_REQUEST'
  });
  expect(get('handover-current').props.value).toBe('');
  expect(get('handover-incoming').props.value).toBe('');
  expect(opsApi.handovers).toHaveBeenCalledTimes(2);
 });
 it('does not allow second proposal for same source until existing open proposal is canceled',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[request()]}));
  await mount();await change('handover-current','assignment-a');await change('handover-incoming','therapist-b');
  expect(get('handover-open-source-notice')).toBeTruthy();
  expect(get('handover-propose').props.disabled).toBe(true);
  await click('handover-propose');
  expect(opsApi.proposeHandover).not.toHaveBeenCalled();
 });
 it('canceled proposal no longer blocks a new operational suggestion',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[request({status:'CANCELLED'})]}));
  await mount();await change('handover-current','assignment-a');await change('handover-incoming','therapist-b');
  expect(find('handover-open-source-notice')).toHaveLength(0);
  expect(get('handover-propose').props.disabled).toBe(false);
 });
 it('proposed request rejection is visible and preserves opportunity to retry',async()=>{
  opsApi.proposeHandover.mockRejectedValueOnce({status:409,message:'Duplicate synthetic proposal'});
  await mount();await change('handover-current','assignment-a');await change('handover-incoming','therapist-b');
  await click('handover-propose');
  expect(text()).toContain('The handover proposal was not saved');
  expect(get('handover-propose').props.disabled).toBe(false);
  expect(opsApi.handovers).toHaveBeenCalledTimes(1);
 });
 it('initial denied proposal listing shows safe error without another child draft',async()=>{
  opsApi.handovers.mockRejectedValueOnce({status:403,message:'Forbidden'});
  await mount();
  expect(text()).toContain('Could not load synthetic handover proposals');
  expect(find('handover-propose')).toHaveLength(0);
 });
 it('manager history excludes other child even if a nonconforming backend fixture includes it',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[request(),request({id:'other',childId:'child-b'})]}));
  await mount();
  expect(get('handover-row-request-a')).toBeTruthy();
  expect(find('handover-row-other')).toHaveLength(0);
 });
 it('changing a service resets selected incoming therapist from prior specialty',async()=>{
  const original=child({assignments:[assignment(),assignment({id:'assignment-ot',service:'occupational'})]});
  opsApi.therapists.mockResolvedValue({items:[staff(),staff({membershipId:'therapist-c',specialties:['occupational']})],nextOffset:null});
  await mount(original);await change('handover-current','assignment-a');await change('handover-incoming','therapist-b');
  await change('handover-current','assignment-ot');
  expect(get('handover-incoming').props.value).toBe('');
  expect(opsApi.therapists).toHaveBeenLastCalledWith('center-a',expect.objectContaining({service:'occupational'}));
 });
 it('trimmed search never changes assigned source or grants target clinical access',async()=>{
  await mount();await change('handover-current','assignment-a');
  await change('handover-staff-search','  Fictional Noor  ');
  expect(opsApi.therapists).toHaveBeenLastCalledWith('center-a',expect.objectContaining({search:'Fictional Noor'}));
  expect(get('handover-propose').props.disabled).toBe(true);
 });
 it('loads paged eligible therapist results with exact offset and current service',async()=>{
  opsApi.therapists.mockResolvedValueOnce({items:[staff()],nextOffset:100}).mockResolvedValueOnce({
   items:[staff({membershipId:'therapist-c',displayName:'Fictional Samira'})],nextOffset:null
  });
  await mount();await change('handover-current','assignment-a');
  expect(get('handover-staff-more')).toBeTruthy();
  await click('handover-staff-more');
  expect(opsApi.therapists).toHaveBeenLastCalledWith('center-a',{
   service:'speech',search:'',offset:100,limit:100
  });
  const options=get('handover-incoming').findAllByType('option').map(o=>o.props.value);
  expect(options).toContain('therapist-c');
  expect(find('handover-staff-more')).toHaveLength(0);
 });
 it('staff lookup denial shows safe error and does not fabricate eligible results',async()=>{
  opsApi.therapists.mockRejectedValueOnce({status:403,message:'Synthetic scope revoked'});
  await mount();await change('handover-current','assignment-a');
  expect(text()).toContain('Could not search eligible incoming therapists');
  expect(get('handover-propose').props.disabled).toBe(true);
 });
});

describe('real readiness and cancellation never authorize clinical handover',()=>{
 it('only pending and acknowledged rows expose cancellation, but canceled rows remain inspectable',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[request(),request({id:'cancel-a',status:'CANCELLED'})]}));
  await mount();
  expect(rowButtons('request-a')).toHaveLength(2);
  expect(rowButtons('cancel-a')).toHaveLength(1);
 });
 it('readiness gets exact proposal ID and renders explicit clinical authorization blocks',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[request()]}));
  await mount();await pressRow('request-a',0);
  expect(opsApi.handoverReadiness).toHaveBeenCalledWith('center-a','request-a');
  expect(get('handover-readiness')).toBeTruthy();
  expect(text()).toContain('Transfer remains blocked');
  expect(text()).toContain('Clinical authorization not available');
  expect(text()).toContain('no authorization or access granted');
 });
 it('latest readiness changes stale row status without inventing a grant',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[request()]}));
  opsApi.handoverReadiness.mockResolvedValueOnce(readiness({status:'CANCELLED'}));
  await mount();await pressRow('request-a',0);
  expect(get('handover-row-request-a').props['data-status']).toBe('CANCELLED');
  expect(rowButtons('request-a')).toHaveLength(1);
  expect(opsApi.cancelHandover).not.toHaveBeenCalled();
 });
 it('readiness error keeps previous operational history without fabricating acceptance',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[request()]}));
  opsApi.handoverReadiness.mockRejectedValueOnce({status:409,message:'Synthetic stale'});
  await mount();await pressRow('request-a',0);
  expect(text()).toContain('Could not verify this operational readiness snapshot');
  expect(find('handover-readiness')).toHaveLength(0);
  expect(get('handover-row-request-a')).toBeTruthy();
 });
 it('canceling an open proposal uses exact ID and refreshes current records',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[request()]}))
   .mockResolvedValueOnce(inbox({items:[request({status:'CANCELLED'})]}));
  await mount();await pressRow('request-a',1);
  expect(opsApi.cancelHandover).toHaveBeenCalledWith('center-a','request-a');
  expect(opsApi.handovers).toHaveBeenCalledTimes(2);
  expect(get('handover-row-request-a').props['data-status']).toBe('CANCELLED');
 });
 it('refused cancellation leaves proposal intact with a visible retry explanation',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[request()]}));
  opsApi.cancelHandover.mockRejectedValueOnce({status:409,message:'Not cancellable'});
  await mount();await pressRow('request-a',1);
  expect(text()).toContain('Could not cancel this proposal');
  expect(get('handover-row-request-a').props['data-status']).toBe('PENDING_ACK');
 });
 it('history pagination only appends cancelled rows not already rendered',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[request(),request({id:'cancel-one',status:'CANCELLED'})],nextCancelledOffset:100}))
   .mockResolvedValueOnce(inbox({items:[request({id:'cancel-one',status:'CANCELLED'}),
    request({id:'cancel-two',status:'CANCELLED'})],nextCancelledOffset:null}));
  await mount();expect(get('handover-history-more')).toBeTruthy();
  await click('handover-history-more');
  expect(opsApi.handovers).toHaveBeenLastCalledWith('center-a',{childId:'child-a',cancelledOffset:100});
  expect(get('handover-row-cancel-one')).toBeTruthy();
  expect(get('handover-row-cancel-two')).toBeTruthy();
  expect(get('handover-manager-history').findAllByType('li')).toHaveLength(3);
  expect(find('handover-history-more')).toHaveLength(0);
 });
 it('denied history pagination preserves existing visible proposals',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[request()],nextCancelledOffset:100}))
   .mockRejectedValueOnce({status:403,message:'Synthetic denied'});
  await mount();await click('handover-history-more');
  expect(text()).toContain('Could not load more cancelled handover history');
  expect(get('handover-row-request-a')).toBeTruthy();
 });
 it('history control is absent without a cursor, so no unbounded hidden lookup occurs',async()=>{
  await mount();
  expect(find('handover-history-more')).toHaveLength(0);
  expect(opsApi.handovers).toHaveBeenCalledTimes(1);
 });
});
