// Stage 2: real mounted therapist replacement preparation; synthetic-only.
// No actual clinical handover, assignment mutation or authorization is enabled.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,SelectField:({value,onChange,options,testId})=>h('select',{
  value,'data-testid':testId,onChange:e=>onChange(e.target.value)
 },options.map(o=>h('option',{value:o.value,key:o.value},o.label)))};
});
jest.mock('@/lib/operations',()=>{
 const actual=jest.requireActual('@/lib/operations');
 return {...actual,opsApi:{...actual.opsApi,handovers:jest.fn(),therapists:jest.fn(),
  proposeHandover:jest.fn(),cancelHandover:jest.fn(),handoverReadiness:jest.fn()}};
});
const {opsApi}=require('../src/lib/operations');
const {HandoverProposalPanel}=require('../src/components/operations/HandoverProposalPanel');
const assign=(more={})=>({id:'assign-a',membershipId:'source-1',therapist:'Fictional Leila',
 service:'speech',endedAt:null,...more});
const child=(more={})=>({id:'fictional-child',assignments:[assign()],...more});
const proposal=(more={})=>({id:'proposal-a',childId:'fictional-child',service:'speech',
 fromMembershipId:'source-1',toMembershipId:'incoming-1',reasonCode:'STAFF_CHANGE',
 status:'PENDING_ACK',synthetic:true,accessGranted:false,assignmentChanged:false,
 clinicalHandover:false,released:false,...more});
const inbox=(more={})=>({enabled:true,synthetic:true,items:[],nextCancelledOffset:null,...more});
const staff=(more={})=>({membershipId:'incoming-1',displayName:'Fictional colleague',
 specialties:['speech'],title:'Therapist',...more});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const json=()=>JSON.stringify(tree.toJSON());
const mount=async(c=child())=>act(async()=>{tree=create(h(HandoverProposalPanel,{
 centerId:'center-a',child:c
}));});
beforeEach(()=>{
 jest.clearAllMocks();
 for(const k of ['handovers','therapists','proposeHandover','cancelHandover','handoverReadiness'])opsApi[k].mockReset();
 opsApi.handovers.mockResolvedValue(inbox());
 opsApi.therapists.mockResolvedValue({items:[staff()],nextOffset:null});
 opsApi.proposeHandover.mockResolvedValue({});
 opsApi.cancelHandover.mockResolvedValue({});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real therapist handover UI enforces synthetic non-transfer boundaries',()=>{
 it('renders a disabled environment without exposing proposal actions',async()=>{
  opsApi.handovers.mockResolvedValue(inbox({enabled:false}));
  await mount();
  expect(get('handover-disabled')).toBeTruthy();
  expect(find('handover-propose')).toHaveLength(0);
  expect(opsApi.therapists).not.toHaveBeenCalled();
  expect(opsApi.proposeHandover).not.toHaveBeenCalled();
 });
 it('shows only eligible specialty and excludes source therapist',async()=>{
  opsApi.therapists.mockResolvedValue({items:[
   staff({membershipId:'source-1',displayName:'Current therapist'}),
   staff({membershipId:'wrong-service',specialties:['ot']}),
   staff({membershipId:'incoming-1'})
  ],nextOffset:null});
  await mount();await change('handover-current','assign-a');
  expect(opsApi.therapists).toHaveBeenCalledWith('center-a',expect.objectContaining({
   service:'speech',search:'',limit:100
  }));
  const names=get('handover-incoming').findAllByType('option').map(x=>x.props.value);
  expect(names).toContain('incoming-1');
  expect(names).not.toContain('source-1');
  expect(names).not.toContain('wrong-service');
 });
 it('submits exact scoped operational proposal without granting clinical access',async()=>{
  await mount();await change('handover-current','assign-a');
  await change('handover-incoming','incoming-1');
  await change('handover-reason','FAMILY_REQUEST');
  await click('handover-propose');
  expect(opsApi.proposeHandover).toHaveBeenCalledWith('center-a',{
   childId:'fictional-child',fromMembershipId:'source-1',
   toMembershipId:'incoming-1',service:'speech',reasonCode:'FAMILY_REQUEST'
  });
  expect(opsApi.handovers).toHaveBeenCalledTimes(2);
  expect(json()).toContain('No existing therapist assignment');
 });
 it('blocks a duplicate outstanding proposal for the same source assignment',async()=>{
  opsApi.handovers.mockResolvedValue(inbox({items:[proposal()]}));
  await mount();await change('handover-current','assign-a');
  await change('handover-incoming','incoming-1');
  expect(get('handover-open-source-notice')).toBeTruthy();
  expect(get('handover-propose').props.disabled).toBe(true);
  expect(opsApi.proposeHandover).not.toHaveBeenCalled();
 });
 it('does not count ended assignments as eligible source choices',async()=>{
  await mount(child({assignments:[assign({id:'ended',endedAt:'2026-01-01'}),assign({id:'active'})]}));
  const opts=get('handover-current').findAllByType('option').map(x=>x.props.value);
  expect(opts).not.toContain('ended');
  expect(opts).toContain('active');
 });
 it('keeps negative readiness snapshot explicitly non-authorizing',async()=>{
  opsApi.handovers.mockResolvedValue(inbox({items:[proposal()]}));
  opsApi.handoverReadiness.mockResolvedValue({
   proposalId:'proposal-a',childId:'fictional-child',service:'speech',
   status:'ACKNOWLEDGED',checkedAt:'2026-11-10T12:00:00Z',
   synthetic:true,readonly:true,readyForTransfer:false,assignmentChanged:false,
   accessGranted:false,clinicalHandover:false,released:false,
   checks:[{code:'STAFF',met:false,label:'Specialty assignment incomplete'}]
  });
  await mount();
  const button=tree.root.findAllByType('button').find(b=>
   b.props.children==='Check readiness');
  await act(async()=>{button.props.onClick();await Promise.resolve();});
  expect(opsApi.handoverReadiness).toHaveBeenCalledWith('center-a','proposal-a');
  expect(get('handover-readiness')).toBeTruthy();
  expect(json()).toContain('Transfer remains blocked');
  expect(get('handover-row-proposal-a').props['data-status']).toBe('ACKNOWLEDGED');
 });
 it('paginates cancelled history without duplicate current records',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({
   items:[proposal({id:'old-cancelled',status:'CANCELLED'})],nextCancelledOffset:20
  })).mockResolvedValueOnce(inbox({
   items:[proposal({id:'old-cancelled',status:'CANCELLED'}),
    proposal({id:'older-cancelled',status:'CANCELLED'})],nextCancelledOffset:null
  }));
  await mount();await click('handover-history-more');
  expect(opsApi.handovers).toHaveBeenLastCalledWith('center-a',{
   childId:'fictional-child',cancelledOffset:20
  });
  expect(find('handover-row-old-cancelled')).toHaveLength(1);
  expect(find('handover-row-older-cancelled')).toHaveLength(1);
  expect(find('handover-history-more')).toHaveLength(0);
 });
 it('preserves proposal history and shows an actionable error on failed cancellation',async()=>{
  opsApi.handovers.mockResolvedValue(inbox({items:[proposal()]}));
  opsApi.cancelHandover.mockRejectedValue(new Error('Synthetic request denied'));
  await mount();
  const cancel=tree.root.findAllByType('button').find(b=>
   b.props.children==='Cancel proposal');
  await act(async()=>{cancel.props.onClick();await Promise.resolve();});
  expect(json()).toContain('Could not cancel this proposal');
  expect(get('handover-row-proposal-a')).toBeTruthy();
  expect(opsApi.cancelHandover).toHaveBeenCalledWith('center-a','proposal-a');
 });
});
