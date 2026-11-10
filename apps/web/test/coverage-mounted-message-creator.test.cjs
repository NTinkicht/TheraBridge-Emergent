// M4-08 mounted non-clinical family-messaging safeguards.
// Exercises real NewThread hooks and send validation; the dialog host is a
// testing boundary. No actual guardian, child or clinical credentials.
const React=require('react');
const Renderer=require('react-test-renderer');
const {act,create}=Renderer;
const h=React.createElement;
jest.mock('@/components/design/states',()=>{
 const actual=jest.requireActual('@/components/design/states');
 return {...actual,Dialog:({open,footer,children})=>open?
  React.createElement('aside',{'data-testid':'modal-test-boundary'},children,footer):null};
});
jest.mock('@/components/centers/kit',()=>{
 const actual=jest.requireActual('@/components/centers/kit');
 return {...actual,SelectField:({value,onChange,options,testId})=>
   React.createElement('select',{'data-testid':testId,value,onChange:v=>onChange(v.target.value)},
     options.map(o=>React.createElement('option',{key:o.value,value:o.value},o.label)))};
});
jest.mock('@/lib/messages',()=>{
 const actual=jest.requireActual('@/lib/messages');
 return {...actual,messagesApi:{...actual.messagesApi,open:jest.fn()}};
});
jest.mock('@/lib/operations',()=>{
 const actual=jest.requireActual('@/lib/operations');
 return {...actual,opsApi:{...actual.opsApi,child:jest.fn()}};
});
const {messagesApi}=require('../src/lib/messages');
const {opsApi}=require('../src/lib/operations');
const {NewThread}=require('../src/components/messages/Messages');
const kids=[{id:'fictional-child',name:'Synthetic Alex'}];
const connected=(extra={})=>({
 id:'fictional-child',services:['speech','ot'],
 assignments:[{membershipId:'assigned',service:'speech',endedAt:null},
  {membershipId:'former',service:'ot',endedAt:'2026-10-01T09:00:00Z'}],
 guardians:[{id:'g1',displayName:'Synthetic guardian',portalStatus:'CONNECTED'},
  {id:'g2',displayName:'Unverified guardian',portalStatus:'PENDING'}],...extra
});
let tree=null,done,error;
beforeEach(()=>{jest.clearAllMocks();done=jest.fn();error=jest.fn();
 opsApi.child.mockResolvedValue(connected());});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const element=props=>h(NewThread,{centerId:'c1',open:true,tone:'clinical',
 kids,onClose:()=>{},onDone:done,onError:error,...props});
const mount=async props=>act(async()=>{tree=create(element(props));});
const get=id=>tree.root.findByProps({'data-testid':id});
const choose=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const write=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const send=async()=>act(async()=>get('new-thread-send').props.onClick());
const text=()=>JSON.stringify(tree.toJSON());
describe('M4-08 mounted conversation creator enforces child and recipient restrictions',()=>{
 it('does not offer family recipient audience for a center manager without therapist assignment',async()=>{
  await mount({});
  const audience=get('new-thread-audience');
  expect(audience.findAllByType('option').map(x=>x.props.value)).not.toContain('GUARDIAN');
  expect(tree.root.findAllByProps({'data-testid':'new-thread-recipient'})).toHaveLength(0);
 });
 it('requires a connected guardian before an assigned therapist can send family message',async()=>{
  opsApi.child.mockResolvedValue(connected({guardians:[
   {id:'g1',displayName:'First synthetic guardian',portalStatus:'CONNECTED'},
   {id:'g3',displayName:'Second synthetic guardian',portalStatus:'CONNECTED'},
   {id:'g2',displayName:'Pending guardian',portalStatus:'PENDING'}]}));
  await mount({therapistMembershipId:'assigned'});
  expect(opsApi.child).toHaveBeenCalledWith('c1','fictional-child');
  await write('new-thread-subject','Family scheduling');
  await write('new-thread-body','Synthetic appointment change');
  await send();
  expect(messagesApi.open).not.toHaveBeenCalled();
  expect(text()).toContain('Choose the guardian who should receive');
  const recipients=get('new-thread-recipient').findAllByType('option');
  expect(recipients.map(o=>o.props.value)).toContain('g1');
  expect(recipients.map(o=>o.props.value)).not.toContain('g2');
  await choose('new-thread-recipient','g1');
  messagesApi.open.mockResolvedValue({id:'safe-thread'});
  await send();
  expect(done).toHaveBeenCalledWith('safe-thread');
  expect(messagesApi.open).toHaveBeenCalledWith('c1',expect.objectContaining({
   childId:'fictional-child',audience:'GUARDIAN',guardianLinkId:'g1',
   subject:'Family scheduling',body:'Synthetic appointment change'
  }));
 });
 it('refuses a specialty outside an assigned therapist permitted services',async()=>{
  await mount({therapistMembershipId:'assigned'});
  await choose('new-thread-audience','SPECIALTY');
  const services=get('new-thread-service').findAllByType('option').map(o=>o.props.value);
  expect(services).toContain('speech');
  expect(services).not.toContain('ot');
  await write('new-thread-subject','Fictional team coordination');
  await write('new-thread-body','Safe meeting plan');
  await send();
  expect(messagesApi.open).not.toHaveBeenCalled();
  expect(text()).toContain('Choose the specialty team');
  await choose('new-thread-service','speech');
  messagesApi.open.mockResolvedValue({id:'t1'});
  await send();
  expect(messagesApi.open).toHaveBeenCalledWith('c1',expect.objectContaining({
   audience:'SPECIALTY',service:'speech'
  }));
 });
 it('requires non-empty message and three-character subject for a manager internal conversation',async()=>{
  await mount({});
  await send();
  expect(text()).toContain('subject of at least 3 characters');
  await write('new-thread-subject','Okay');
  await send();
  expect(text()).toContain('Write a message');
  expect(messagesApi.open).not.toHaveBeenCalled();
 });
 it('guardian family conversation carries no internal staff audience, team or specialty fields',async()=>{
  await mount({tone:'family'});
  expect(tree.root.findAllByProps({'data-testid':'new-thread-audience'})).toHaveLength(0);
  await write('new-thread-subject','Request different visit');
  await write('new-thread-body','Synthetic family feedback');
  messagesApi.open.mockResolvedValue({id:'family-t1'});
  await send();
  expect(messagesApi.open).toHaveBeenCalledWith('c1',{
   childId:'fictional-child',category:'scheduling',
   subject:'Request different visit',body:'Synthetic family feedback'
  });
 });
});
