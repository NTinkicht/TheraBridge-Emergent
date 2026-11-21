// M4-08 mounted handover preparation. Clinical rights and staff assignments
// must remain unchanged; operational readiness is not transfer authorization.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,SelectField:({value,onChange,options,testId})=>h('select',{
  value,'data-testid':testId,onChange:e=>onChange(e.target.value)},
  options.map(o=>h('option',{key:o.value,value:o.value},o.label)))};
});
jest.mock('@/lib/operations',()=>{
 const original=jest.requireActual('@/lib/operations');
 return {...original,opsApi:{...original.opsApi,
  handovers:jest.fn(),therapists:jest.fn(),proposeHandover:jest.fn(),
  cancelHandover:jest.fn(),handoverReadiness:jest.fn()}};
});
const {opsApi}=require('../src/lib/operations');
const {HandoverProposalPanel}=require('../src/components/operations/HandoverProposalPanel');
const child=()=>({id:'fictional-child',assignments:[
 {id:'assignment-1',membershipId:'old',therapist:'Fictional Original',
  service:'speech',endedAt:null},
 {id:'assignment-old',membershipId:'former',therapist:'Former Therapist',
  service:'ot',endedAt:'2026-10-10T09:00:00Z'}]});
const therapist=(membershipId,specialties=['speech'])=>({
 membershipId,displayName:'Fictional '+membershipId,specialties});
const openProposal=()=>({id:'handover-1',childId:'fictional-child',
 fromMembershipId:'old',toMembershipId:'new',service:'speech',status:'PENDING_ACK',
 reasonCode:'STAFF_CHANGE'});
let tree=null,items=[];
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const optionValues=id=>get(id).findAllByType('option').map(o=>o.props.value);
const choose=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const click=async(id)=>act(async()=>get(id).props.onClick());
beforeEach(()=>{
 jest.clearAllMocks();items=[];
 opsApi.handovers.mockImplementation(async()=>({enabled:true,items:[...items],
  nextCancelledOffset:null}));
 opsApi.therapists.mockResolvedValue({items:[
  therapist('old'),therapist('new'),therapist('unrelated',['ot'])
 ],nextOffset:null});
 opsApi.proposeHandover.mockImplementation(async()=>{items=[openProposal()];return {id:'handover-1'};});
 opsApi.cancelHandover.mockImplementation(async()=>{items=items.map(x=>({...x,status:'CANCELLED'}));});
 opsApi.handoverReadiness.mockResolvedValue({
  proposalId:'handover-1',status:'PENDING_ACK',checkedAt:'2026-11-10T09:00:00Z',
  checks:[{code:'staff',label:'Staff accepted',met:false}]
 });
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const mount=async()=>act(async()=>{tree=create(h(HandoverProposalPanel,{
 centerId:'center-1',child:child()}));});
const text=()=>JSON.stringify(tree.toJSON());
describe('M4-08 operational handover never implicitly transfers clinical permissions',()=>{
 it('exposes only active original assignment and eligible different-therapist target',async()=>{
  await mount();
  expect(get('handover-manager')).toBeTruthy();
  expect(optionValues('handover-current')).toContain('assignment-1');
  expect(optionValues('handover-current')).not.toContain('assignment-old');
  expect(get('handover-propose').props.disabled).toBe(true);
  await choose('handover-current','assignment-1');
  expect(opsApi.therapists).toHaveBeenCalledWith('center-1',expect.objectContaining({
   service:'speech'}));
  expect(optionValues('handover-incoming')).toContain('new');
  expect(optionValues('handover-incoming')).not.toContain('old');
  expect(optionValues('handover-incoming')).not.toContain('unrelated');
 });
 it('proposes scoped operational preparation, never mutates assignments locally',async()=>{
  await mount();
  await choose('handover-current','assignment-1');
  await choose('handover-incoming','new');
  await choose('handover-reason','AVAILABILITY');
  await click('handover-propose');
  expect(opsApi.proposeHandover).toHaveBeenCalledWith('center-1',{
   childId:'fictional-child',fromMembershipId:'old',
   toMembershipId:'new',service:'speech',reasonCode:'AVAILABILITY'
  });
  expect(get('handover-row-handover-1').props['data-status']).toBe('PENDING_ACK');
  expect(child().assignments[0].membershipId).toBe('old');
  expect(text()).toContain('No clinical information or assignment changed');
 });
 it('blocks duplicate open proposal per exact source assignment',async()=>{
  items=[openProposal()];
  await mount();
  await choose('handover-current','assignment-1');
  await choose('handover-incoming','new');
  expect(get('handover-open-source-notice')).toBeTruthy();
  expect(get('handover-propose').props.disabled).toBe(true);
  expect(opsApi.proposeHandover).not.toHaveBeenCalled();
 });
 it('shows freshness-limited readiness and never asserts clinical authorization',async()=>{
  items=[openProposal()];
  await mount();
  const button=tree.root.findAllByType('button').find(b=>b.props.children==='Check readiness');
  expect(button).toBeDefined();
  await act(async()=>button.props.onClick());
  expect(opsApi.handoverReadiness).toHaveBeenCalledWith('center-1','handover-1');
  expect(get('handover-readiness')).toBeTruthy();
  expect(text()).toContain('Transfer remains blocked');
  expect(text()).toContain('cannot approve a clinical handover');
  expect(text()).toContain('Staff accepted');
 });
 it('cancels an operational proposal and preserves original therapist assignment',async()=>{
  items=[openProposal()];
  await mount();
  const cancel=tree.root.findAllByType('button')
   .find(b=>b.props.children==='Cancel proposal');
  expect(cancel).toBeDefined();
  await act(async()=>cancel.props.onClick());
  expect(opsApi.cancelHandover).toHaveBeenCalledWith('center-1','handover-1');
  expect(get('handover-row-handover-1').props['data-status']).toBe('CANCELLED');
  expect(child().assignments[0].membershipId).toBe('old');
  expect(text()).toContain('No clinical information or assignment changed');
 });
 it('shows a recoverable operational error when readiness cannot be verified',async()=>{
  items=[openProposal()];
  opsApi.handoverReadiness.mockRejectedValueOnce(new Error('Fictional lookup outage'));
  await mount();
  const check=tree.root.findAllByType('button').find(b=>b.props.children==='Check readiness');
  await act(async()=>check.props.onClick());
  expect(text()).toContain('Could not verify this operational readiness snapshot');
  expect(find('handover-readiness')).toHaveLength(0);
 });
 it('shows explicit disabled environment without proposing or loading eligible staff',async()=>{
  opsApi.handovers.mockResolvedValue({enabled:false,items:[],nextCancelledOffset:null});
  await mount();
  expect(get('handover-disabled')).toBeTruthy();
  expect(find('handover-propose')).toHaveLength(0);
  expect(opsApi.therapists).not.toHaveBeenCalled();
 });
});
