// Stage 2: source-executing real NewThread composer. The API is mocked; its
// private child, guardian and specialty authorization stays server-enforced.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/design/states',()=>{
 const actual=jest.requireActual('@/components/design/states');
 return {...actual,Dialog:({open,children,footer,testId,title})=>open?
 h('section',{'data-testid':testId},h('h2',null,title),children,h('footer',null,footer)):null};
});
jest.mock('@/components/centers/kit',()=>{
 const actual=jest.requireActual('@/components/centers/kit');
 return {...actual,SelectField:({value,onChange,options,testId})=>
 h('select',{value,'data-testid':testId,onChange:e=>onChange(e.target.value)},
 options.map(o=>h('option',{key:o.value,value:o.value},o.label)))};
});
jest.mock('@/lib/operations',()=>{
 const actual=jest.requireActual('@/lib/operations');
 return {...actual,opsApi:{...actual.opsApi,child:jest.fn()}};
});
jest.mock('@/lib/messages',()=>{
 const actual=jest.requireActual('@/lib/messages');
 return {...actual,messagesApi:{...actual.messagesApi,open:jest.fn()}};
});
const {opsApi}=require('../src/lib/operations');
const {messagesApi}=require('../src/lib/messages');
const {NewThread}=require('../src/components/messages/Messages');
const child=(extra={})=>({
 id:'fictional-child',services:['speech','ot'],
 guardians:[{id:'guardian-1',displayName:'Synthetic Guardian',portalStatus:'CONNECTED'},
  {id:'guardian-revoked',displayName:'Former Guardian',portalStatus:'REVOKED'}],
 assignments:[{membershipId:'therapist-a',service:'speech',endedAt:null},
  {membershipId:'therapist-a',service:'ot',endedAt:'2026-10-01'}],...extra
});
let tree,done,closed,errors;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const mount=async(props={})=>act(async()=>{tree=create(h(NewThread,{
 centerId:'center-a',open:true,tone:'clinical',kids:[{id:'fictional-child',name:'Fictional Alex'}],
 onClose:closed,onDone:done,onError:errors,therapistMembershipId:'therapist-a',...props
}));});
beforeEach(()=>{
 jest.clearAllMocks();opsApi.child.mockReset();messagesApi.open.mockReset();
 opsApi.child.mockResolvedValue(child());
 messagesApi.open.mockResolvedValue({id:'thread-new'});
 done=jest.fn();closed=jest.fn();errors=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real message composer guards recipient visibility',()=>{
 it('has a non-clinical notice and shows only connected guardians',async()=>{
  await mount();
  expect(get('messages-non-clinical-notice')).toBeTruthy();
  expect(opsApi.child).toHaveBeenCalledWith('center-a','fictional-child');
  const ids=get('new-thread-recipient').findAllByType('option').map(x=>x.props.value);
  expect(ids).toContain('guardian-1');
  expect(ids).not.toContain('guardian-revoked');
 });
 it('requires message subject and body before any outbound API mutation',async()=>{
  await mount();await click('new-thread-send');
  expect(get('new-thread-error')).toBeTruthy();
  expect(messagesApi.open).not.toHaveBeenCalled();
  await change('new-thread-subject','Synthetic visit question');
  await click('new-thread-send');
  expect(messagesApi.open).not.toHaveBeenCalled();
  await change('new-thread-body','  Requesting a fictional visit time  ');
  await click('new-thread-send');
  expect(messagesApi.open).toHaveBeenCalledWith('center-a',expect.objectContaining({
   childId:'fictional-child',guardianLinkId:'guardian-1',
   subject:'Synthetic visit question',body:'Requesting a fictional visit time',
   audience:'GUARDIAN'
  }));
  expect(done).toHaveBeenCalledWith('thread-new');
 });
 it('never exposes revoked guardian when child has no connected guardian',async()=>{
  opsApi.child.mockResolvedValue(child({guardians:[{
   id:'guardian-revoked',portalStatus:'REVOKED',displayName:'Former Guardian'
  }]}));
  await mount();await change('new-thread-subject','Synthetic question');
  await change('new-thread-body','Fictional body');
  await click('new-thread-send');
  expect(messagesApi.open).not.toHaveBeenCalled();
  expect(get('new-thread-error')).toBeTruthy();
 });
 it('never lets center managers start guardian conversations',async()=>{
  await mount({therapistMembershipId:undefined});
  const opts=get('new-thread-audience').findAllByType('option').map(x=>x.props.value);
  expect(opts).not.toContain('GUARDIAN');
  expect(get('new-thread-audience').props.value).toBe('CARE_TEAM');
  expect(find('new-thread-recipient')).toHaveLength(0);
  await change('new-thread-subject','Fictional operational task');
  await change('new-thread-body','Synthetic internal message');
  await click('new-thread-send');
  expect(messagesApi.open).toHaveBeenCalledWith('center-a',
   expect.objectContaining({audience:'CARE_TEAM'}));
  expect(messagesApi.open.mock.calls[0][1]).not.toHaveProperty('guardianLinkId');
 });
 it('limits specialist conversations to currently assigned services',async()=>{
  await mount();await change('new-thread-audience','SPECIALTY');
  const options=get('new-thread-service').findAllByType('option').map(x=>x.props.value);
  expect(options).toContain('speech');
  expect(options).not.toContain('ot');
  await change('new-thread-subject','Synthetic specialty task');
  await change('new-thread-body','Internal note');
  await click('new-thread-send');
  expect(messagesApi.open).not.toHaveBeenCalled();
  await change('new-thread-service','speech');await click('new-thread-send');
  expect(messagesApi.open).toHaveBeenCalledWith('center-a',
   expect.objectContaining({audience:'SPECIALTY',service:'speech'}));
 });
 it('does not claim a thread was created if source mutation is rejected',async()=>{
  messagesApi.open.mockRejectedValue({status:403,message:'Synthetic denied'});
  await mount();await change('new-thread-subject','Fictional question');
  await change('new-thread-body','Synthetic question text');
  await click('new-thread-send');
  expect(get('new-thread-error')).toBeTruthy();
  expect(done).not.toHaveBeenCalled();
 });
 it('does not load private guardian data for a family-side composer',async()=>{
  await mount({tone:'family',therapistMembershipId:undefined});
  expect(opsApi.child).not.toHaveBeenCalled();
  expect(find('new-thread-audience')).toHaveLength(0);
  await change('new-thread-subject','Fictional family logistics');
  await change('new-thread-body','Synthetic request');
  await click('new-thread-send');
  const payload=messagesApi.open.mock.calls[0][1];
  expect(payload).not.toHaveProperty('audience');
  expect(payload).not.toHaveProperty('guardianLinkId');
  expect(payload).not.toHaveProperty('service');
 });
});
