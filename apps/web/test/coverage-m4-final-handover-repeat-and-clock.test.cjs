// M4-08 final: execute real operational handover inbox and recurrence controls.
// Synthetic-only, no transfer, signed clinical authorization, or real scheduling.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/design/ui',()=>({
 Card:({children,testId})=>h('section',{'data-testid':testId},children),
 Button:({children,testId,disabled,onClick})=>h('button',{'data-testid':testId,disabled,onClick},children)
}));
jest.mock('@/components/auth/Field',()=>({Field:({label,value,onChange,testId})=>
 h('input',{'data-testid':testId,'aria-label':label,value,onChange})}));
jest.mock('@/components/centers/kit',()=>({SelectField:({label,value,onChange,testId,options})=>
 h('select',{'aria-label':label,'data-testid':testId,value,onChange:e=>onChange(e.target.value)},
  options.map(o=>h('option',{key:o.value,value:o.value},o.label)))}));
jest.mock('@/components/operations/BookDialog',()=>({serviceLabel:s=>'Fictional '+s}));
jest.mock('@/lib/operations',()=>{
 const a=jest.requireActual('@/lib/operations');
 return {...a,opsApi:{...a.opsApi,handovers:jest.fn(),acknowledgeHandover:jest.fn()}};
});
const {opsApi}=require('../src/lib/operations');
const {HandoverInboxPanel}=require('../src/components/practice/HandoverInboxPanel');
const {RepeatFields,WEEKDAYS}=require('../src/components/operations/RepeatFields');
const {useNow}=require('../src/components/design/useNow');
const entry=(more={})=>({
 id:'synthetic-handover',service:'speech',status:'PENDING_ACK',
 synthetic:true,accessGranted:false,assignmentChanged:false,
 clinicalHandover:false,released:false,...more
});
const inbox=(more={})=>({enabled:true,synthetic:true,items:[entry()],...more});
const repeat=(more={})=>({mode:'none',weekdays:[],end:'count',count:'3',until:'',...more});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const mount=async node=>act(async()=>{tree=create(node);});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>{get(id).props.onChange({target:{value:v}});await Promise.resolve();});
const text=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();opsApi.handovers.mockReset().mockResolvedValue(inbox());
 opsApi.acknowledgeHandover.mockReset().mockResolvedValue({status:'ACKNOWLEDGED'});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});

describe('mounted incoming therapist operational handover inbox is not clinical transfer',()=>{
 it('renders explicit read-only warning and only current scoped requests',async()=>{
  await mount(h(HandoverInboxPanel,{centerId:'centre-a'}));
  expect(opsApi.handovers).toHaveBeenCalledWith('centre-a');
  expect(get('handover-inbox')).toBeTruthy();
  expect(get('handover-acknowledge')).toBeTruthy();
  expect(text()).toContain('does not grant access');
  expect(text()).toContain('No child details or clinical documents exposed');
 });
 it('renders synthetic gate disabled without actionable buttons',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({enabled:false}));
  await mount(h(HandoverInboxPanel,{centerId:'centre-a'}));
  expect(get('handover-inbox-disabled')).toBeTruthy();
  expect(find('handover-acknowledge')).toHaveLength(0);
 });
 it('never invents synthetic proposals for an empty server response',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[]}));
  await mount(h(HandoverInboxPanel,{centerId:'centre-a'}));
  expect(text()).toContain('No operational handover requests');
  expect(find('handover-acknowledge')).toHaveLength(0);
 });
 it.each(['ACKNOWLEDGED','CANCELLED'])('status %s does not expose another acknowledgement mutation',async status=>{
  opsApi.handovers.mockResolvedValueOnce(inbox({items:[entry({status})]}));
  await mount(h(HandoverInboxPanel,{centerId:'centre-a'}));
  expect(find('handover-acknowledge')).toHaveLength(0);
  expect(opsApi.acknowledgeHandover).not.toHaveBeenCalled();
 });
 it('successful acknowledgement reloads authoritative request state without granting access',async()=>{
  opsApi.handovers.mockResolvedValueOnce(inbox()).mockResolvedValueOnce(inbox({
   items:[entry({status:'ACKNOWLEDGED'})]
  }));
  await mount(h(HandoverInboxPanel,{centerId:'centre-a'}));
  await click('handover-acknowledge');
  expect(opsApi.acknowledgeHandover).toHaveBeenCalledWith('centre-a','synthetic-handover');
  expect(opsApi.handovers).toHaveBeenCalledTimes(2);
  expect(find('handover-acknowledge')).toHaveLength(0);
  expect(text()).not.toContain('Child clinical records released');
 });
 it('a rejected acknowledgement retains pending request and shows conflict recovery guidance',async()=>{
  opsApi.acknowledgeHandover.mockRejectedValueOnce({status:409,message:'Synthetic stale proposal'});
  await mount(h(HandoverInboxPanel,{centerId:'centre-a'}));
  await click('handover-acknowledge');
  expect(text()).toContain('The proposed handover changed');
  expect(get('handover-acknowledge').props.disabled).toBe(false);
  expect(opsApi.handovers).toHaveBeenCalledTimes(1);
 });
 it('failed initial read reveals only safe error without fabricated handover target',async()=>{
  opsApi.handovers.mockRejectedValueOnce({status:403,message:'Synthetic denied'});
  await mount(h(HandoverInboxPanel,{centerId:'centre-a'}));
  expect(text()).toContain('Could not load handover preparation requests');
  expect(find('handover-acknowledge')).toHaveLength(0);
 });
 it('does not issue duplicate acknowledge calls while a server write is unresolved',async()=>{
  let resolve;
  const slow=new Promise(r=>{resolve=r;});
  opsApi.acknowledgeHandover.mockReturnValueOnce(slow);
  await mount(h(HandoverInboxPanel,{centerId:'centre-a'}));
  let first;
  await act(async()=>{first=get('handover-acknowledge').props.onClick();await Promise.resolve();});
  expect(get('handover-acknowledge').props.disabled).toBe(true);
  await act(async()=>{get('handover-acknowledge').props.onClick();});
  expect(opsApi.acknowledgeHandover).toHaveBeenCalledTimes(1);
  await act(async()=>{resolve({status:'ACKNOWLEDGED'});await slow;await Promise.resolve();});
  expect(opsApi.handovers).toHaveBeenCalledTimes(2);
 });
});

describe('mounted recurrence form preserves exact chosen weekly schedule inputs',()=>{
 it('no repeat keeps weekday and expiry controls hidden',async()=>{
  await mount(h(RepeatFields,{value:repeat(),onChange:jest.fn()}));
  expect(get('book-repeat')).toBeTruthy();
  expect(get('book-repeat-select').props.value).toBe('none');
  expect(find('book-weekday-1')).toHaveLength(0);
  expect(find('book-repeat-count')).toHaveLength(0);
 });
 it('selects weekly or biweekly mode without silently overwriting days',async()=>{
  const onChange=jest.fn();
  const initial=repeat({weekdays:[1,3]});
  await mount(h(RepeatFields,{value:initial,onChange}));
  await change('book-repeat-select','biweekly');
  expect(onChange).toHaveBeenCalledWith({...initial,mode:'biweekly'});
  expect(initial.mode).toBe('none');
 });
 it('renders all seven actual weekdays and marks selected days accessible',async()=>{
  await mount(h(RepeatFields,{value:repeat({mode:'weekly',weekdays:[1,5]}),onChange:jest.fn()}));
  expect(WEEKDAYS).toHaveLength(7);
  for(let d=1;d<=7;d++)expect(get('book-weekday-'+d)).toBeTruthy();
  expect(get('book-weekday-1').props['aria-pressed']).toBe(true);
  expect(get('book-weekday-5').props['aria-pressed']).toBe(true);
  expect(get('book-weekday-2').props['aria-pressed']).toBe(false);
 });
 it('adds missing weekdays in ISO sorted order and preserves original state',async()=>{
  const onChange=jest.fn(),initial=repeat({mode:'weekly',weekdays:[5,1]});
  await mount(h(RepeatFields,{value:initial,onChange}));
  await click('book-weekday-3');
  expect(onChange).toHaveBeenCalledWith({...initial,weekdays:[1,3,5]});
  expect(initial.weekdays).toEqual([5,1]);
 });
 it('removes only the selected weekday without altering other rules',async()=>{
  const onChange=jest.fn(),initial=repeat({mode:'weekly',weekdays:[1,3,5]});
  await mount(h(RepeatFields,{value:initial,onChange}));
  await click('book-weekday-3');
  expect(onChange).toHaveBeenCalledWith({...initial,weekdays:[1,5]});
 });
 it('renders numeric visit count expiry and forwards exact input',async()=>{
  const onChange=jest.fn(),initial=repeat({mode:'weekly',end:'count'});
  await mount(h(RepeatFields,{value:initial,onChange}));
  expect(get('book-repeat-count')).toBeTruthy();
  expect(find('book-repeat-until')).toHaveLength(0);
  await change('book-repeat-count','5');
  expect(onChange).toHaveBeenCalledWith({...initial,count:'5'});
 });
 it('renders final-date recurrence without visit-count field',async()=>{
  const onChange=jest.fn(),initial=repeat({mode:'biweekly',end:'until',until:'2026-12-11'});
  await mount(h(RepeatFields,{value:initial,onChange}));
  expect(get('book-repeat-until')).toBeTruthy();
  expect(find('book-repeat-count')).toHaveLength(0);
  await change('book-repeat-until','2026-12-18');
  expect(onChange).toHaveBeenCalledWith({...initial,until:'2026-12-18'});
 });
 it('expiry-mode change preserves selected recurring days without API writes',async()=>{
  const onChange=jest.fn(),initial=repeat({mode:'weekly',weekdays:[2,4]});
  await mount(h(RepeatFields,{value:initial,onChange}));
  await change('book-repeat-end','until');
  expect(onChange).toHaveBeenCalledWith({...initial,end:'until'});
  expect(initial.weekdays).toEqual([2,4]);
 });
});

describe('client clock hydration avoids using time until mounted',()=>{
 it('mounts a clock inside an effect without using external network or timers',async()=>{
  let value='unmounted';
  const Probe=()=>{const now=useNow();value=now===null?'unmounted':now instanceof Date?'mounted':'invalid';return h('p',null,value);};
  await mount(h(Probe));
  expect(value).toBe('mounted');
  expect(text()).toContain('mounted');
 });
});
