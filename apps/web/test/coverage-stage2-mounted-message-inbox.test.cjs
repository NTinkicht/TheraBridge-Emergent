// Stage 2: mounted real inbox/conversation source; transports are synthetic.
// Thread audience, read, reply and close boundaries remain enforced by API.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/design/states',()=>{
 const real=jest.requireActual('@/components/design/states');
 return {...real,Dialog:({open,children,footer,testId})=>open?
 h('section',{'data-testid':testId},children,h('footer',null,footer)):null};
});
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,SelectField:({value,onChange,options,testId})=>h('select',{
  value,'data-testid':testId,onChange:e=>onChange(e.target.value)
 },options.map(o=>h('option',{key:o.value,value:o.value},o.label)))};
});
jest.mock('@/lib/messages',()=>{
 const real=jest.requireActual('@/lib/messages');
 return {...real,messagesApi:{...real.messagesApi,
  list:jest.fn(),thread:jest.fn(),reply:jest.fn(),setStatus:jest.fn(),open:jest.fn()}};
});
jest.mock('@/lib/operations',()=>{
 const real=jest.requireActual('@/lib/operations');
 return {...real,opsApi:{...real.opsApi,child:jest.fn()}};
});
const {messagesApi}=require('../src/lib/messages');
const {Messages,NewThread}=require('../src/components/messages/Messages');
const {opsApi}=require('../src/lib/operations');
const thread=(more={})=>({
 id:'thread-a',subject:'Synthetic family scheduling',child:'Fictional Alex',
 category:'scheduling',audience:'GUARDIAN',service:null,status:'OPEN',
 unread:true,lastFrom:'STAFF',preview:'Synthetic answer',
 lastMessageAt:'2026-11-10T10:00:00Z',...more
});
const detail=(more={})=>({
 id:'thread-a',subject:'Synthetic family scheduling',child:'Fictional Alex',
 category:'scheduling',audience:'GUARDIAN',service:null,status:'OPEN',
 canManage:true,messages:[{id:'message-a',mine:false,author:'Fictional therapist',
 authorKind:'STAFF',body:'Fictional scheduling question',createdAt:'2026-11-10T10:00:00Z'}],
 ...more
});
let tree,onError,oldDocument;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const reply=async()=>act(async()=>{
 const form=get('reply-input').parent;
 form.props.onSubmit({preventDefault:()=>{}});await Promise.resolve();
});
const mount=async(props={})=>act(async()=>{tree=create(h(Messages,{
 centerId:'center-a',family:false,kids:[{id:'child-a',name:'Fictional Alex'}],
 therapistMembershipId:'therapist-a',onError,...props
}));});
beforeAll(()=>{oldDocument=global.document;global.document={visibilityState:'visible'};});
afterAll(()=>{global.document=oldDocument;});
beforeEach(()=>{
 jest.useFakeTimers();jest.clearAllMocks();
 for(const k of ['list','thread','reply','setStatus','open'])messagesApi[k].mockReset();
 opsApi.child.mockReset();opsApi.child.mockResolvedValue({services:['speech','occupational'],
 guardians:[{id:'link-a',displayName:'Fictional guardian',portalStatus:'CONNECTED'},
  {id:'link-pending',displayName:'Another guardian',portalStatus:'INVITED'}],
 assignments:[{membershipId:'therapist-a',endedAt:null,service:'speech'},
  {membershipId:'other-therapist',endedAt:null,service:'occupational'}]});
 messagesApi.list.mockResolvedValue({items:[thread()],unread:1});
 messagesApi.thread.mockResolvedValue(detail());
 messagesApi.reply.mockResolvedValue(detail({
  messages:[...detail().messages,{id:'reply-a',mine:true,body:'Fictional answer',
   author:'Me',authorKind:'STAFF',createdAt:'2026-11-10T11:00:00Z'}]
 }));
 messagesApi.setStatus.mockResolvedValue(detail({status:'CLOSED'}));
 onError=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}jest.useRealTimers();});
describe('real messaging inbox and server-authoritative status',()=>{
 it('loads only authorized center open list and renders explicit family scope warning',async()=>{
  await mount();
  expect(messagesApi.list).toHaveBeenCalledWith('center-a','OPEN');
  expect(get('thread-thread-a')).toBeTruthy();
  expect(get('thread-unread-thread-a')).toBeTruthy();
  expect(get('messages-non-clinical-notice')).toBeTruthy();
  expect(get('conversation-placeholder')).toBeTruthy();
 });
 it('changes server filter to closed and resets selected conversation',async()=>{
  await mount();await click('thread-thread-a');
  expect(get('conversation')).toBeTruthy();
  await click('threads-tab-closed');
  expect(messagesApi.list).toHaveBeenLastCalledWith('center-a','CLOSED');
  expect(get('conversation-placeholder')).toBeTruthy();
 });
 it('renders exact thread detail and latest server message without inventing participants',async()=>{
  await mount();await click('thread-thread-a');
  expect(messagesApi.thread).toHaveBeenCalledWith('center-a','thread-a');
  expect(get('conversation-subject').props.children).toBe('Synthetic family scheduling');
  expect(get('message-message-a')).toBeTruthy();
  expect(find('message-nonexistent')).toHaveLength(0);
 });
 it('prevents empty replies and submits only trimmed source-bound text',async()=>{
  await mount();await click('thread-thread-a');
  expect(get('reply-send').props.disabled).toBe(true);
  await change('reply-input','  Synthetic arrangement confirmed  ');
  await reply();
  expect(messagesApi.reply).toHaveBeenCalledWith('center-a','thread-a',
   'Synthetic arrangement confirmed');
  expect(get('message-reply-a')).toBeTruthy();
  expect(get('reply-input').props.value).toBe('');
 });
 it('keeps unsent reply on API rejection without claiming success',async()=>{
  messagesApi.reply.mockRejectedValue({status:403,message:'Synthetic recipient revoked'});
  await mount();await click('thread-thread-a');
  await change('reply-input','Pending synthetic message');
  await reply();
  expect(get('conversation-error-msg')).toBeTruthy();
  expect(get('reply-input').props.value).toBe('Pending synthetic message');
  expect(find('message-reply-a')).toHaveLength(0);
 });
 it('closes an open thread only on acknowledged server response',async()=>{
  await mount();await click('thread-thread-a');
  await click('conversation-toggle');
  expect(messagesApi.setStatus).toHaveBeenCalledWith('center-a','thread-a',true);
  expect(get('conversation-closed')).toBeTruthy();
  expect(get('conversation-closed-note')).toBeTruthy();
  expect(find('reply-input')).toHaveLength(0);
 });
 it('does not expose thread management action to read-only participants',async()=>{
  messagesApi.thread.mockResolvedValue(detail({canManage:false}));
  await mount({family:true});
  await click('thread-thread-a');
  expect(find('conversation-toggle')).toHaveLength(0);
  expect(get('conversation')).toBeTruthy();
  expect(get('messages-non-clinical-notice')).toBeTruthy();
 });
 it('keeps the inbox source-dependent empty and failure states',async()=>{
  messagesApi.list.mockResolvedValue({items:[],unread:0});
  await mount();
  expect(get('threads-empty')).toBeTruthy();
  expect(find('thread-thread-a')).toHaveLength(0);
 });
});


describe('M4-08 real NewThread boundaries for staff, family, manager and exact recipients',()=>{
 const compose=async(props={})=>{await mount(props);await click('new-thread-button');};
 it('empty child selection fails before network creation',async()=>{
  await act(async()=>tree=create(h(NewThread,{centerId:'center-a',open:true,tone:'family',kids:[],
   onClose:jest.fn(),onDone:jest.fn(),onError})));
  await click('new-thread-send');
  expect(get('new-thread-error')).toBeTruthy();
  expect(messagesApi.open).not.toHaveBeenCalled();
 });
 it('short subject fails locally, never creates a placeholder family conversation',async()=>{
  await compose({family:true});
  await change('new-thread-subject','ab');
  await change('new-thread-body','Fictional arrangement');
  await click('new-thread-send');
  expect(get('new-thread-error')).toBeTruthy();
  expect(messagesApi.open).not.toHaveBeenCalled();
 });
 it('empty message refuses opening a family thread even when subject is valid',async()=>{
  await compose({family:true});
  await change('new-thread-subject','Fictional visit changes');
  await click('new-thread-send');
  expect(messagesApi.open).not.toHaveBeenCalled();
  expect(get('new-thread-error')).toBeTruthy();
 });
 it('guardian submits only exact child, category and trimmed text without staff audiences',async()=>{
  messagesApi.open.mockResolvedValueOnce({id:'new-family-thread'});
  await compose({family:true});
  await change('new-thread-subject','  Fictional schedule question  ');
  await change('new-thread-body','  Can we change a synthetic visit?  ');
  await click('new-thread-send');
  expect(messagesApi.open).toHaveBeenCalledWith('center-a',{
   childId:'child-a',category:'scheduling',subject:'Fictional schedule question',
   body:'Can we change a synthetic visit?'
  });
  expect(find('new-thread-dialog')).toHaveLength(0);
 });
 it('assigned therapist cannot address an unknown guardian ID after linked directory response',async()=>{
  await compose();
  expect(opsApi.child).toHaveBeenCalledWith('center-a','child-a');
  expect(get('new-thread-recipient').findAllByType('option').map(x=>x.props.value))
   .toEqual(['','link-a']);
  await change('new-thread-recipient','');
  await change('new-thread-subject','Fictional safe handoff');
  await change('new-thread-body','Fictional message body');
  await click('new-thread-send');
  expect(get('new-thread-error')).toBeTruthy();
  expect(messagesApi.open).not.toHaveBeenCalled();
 });
 it('assigned therapist can send only to active connected guardian and exact child',async()=>{
  messagesApi.open.mockResolvedValueOnce({id:'new-staff-thread'});
  await compose();
  await change('new-thread-subject','  Fictional family schedule  ');
  await change('new-thread-body','  Fictional update  ');
  await click('new-thread-send');
  expect(messagesApi.open).toHaveBeenCalledWith('center-a',{
   childId:'child-a',category:'scheduling',subject:'Fictional family schedule',
   body:'Fictional update',audience:'GUARDIAN',guardianLinkId:'link-a'
  });
 });
 it('specialty conversation rejects absence of a permitted child service',async()=>{
  await compose();await change('new-thread-audience','SPECIALTY');
  await change('new-thread-subject','Fictional coordination');
  await change('new-thread-body','Fictional staff note');
  await click('new-thread-send');
  expect(get('new-thread-error')).toBeTruthy();
  expect(messagesApi.open).not.toHaveBeenCalled();
 });
 it('specialty conversation permits assigned therapist exact service, not another team',async()=>{
  messagesApi.open.mockResolvedValueOnce({id:'new-team-thread'});
  await compose();await change('new-thread-audience','SPECIALTY');
  expect(get('new-thread-service').findAllByType('option').map(x=>x.props.value))
   .toEqual(['','speech']);
  await change('new-thread-service','speech');
  await change('new-thread-subject','Fictional specialty coordination');
  await change('new-thread-body','Fictional evidence only');
  await click('new-thread-send');
  expect(messagesApi.open.mock.calls[0][1]).toMatchObject({
   audience:'SPECIALTY',service:'speech',childId:'child-a'
  });
  expect(messagesApi.open.mock.calls[0][1]).not.toHaveProperty('guardianLinkId');
 });
 it('unassigned manager has no family audience and no guardian directory for child',async()=>{
  await compose({therapistMembershipId:undefined});
  expect(get('new-thread-audience').findAllByType('option').map(x=>x.props.value))
   .not.toContain('GUARDIAN');
  expect(find('new-thread-recipient')).toHaveLength(0);
  await change('new-thread-audience','GUARDIAN');
  await change('new-thread-subject','Fictional blocked attempt');
  await change('new-thread-body','Fictional body');
  await click('new-thread-send');
  expect(messagesApi.open).not.toHaveBeenCalled();
  expect(get('new-thread-error')).toBeTruthy();
 });
 it('manager may create only an internal care-team thread, not a family release',async()=>{
  messagesApi.open.mockResolvedValueOnce({id:'manager-thread'});
  await compose({therapistMembershipId:undefined});
  await change('new-thread-subject','Fictional care coordination');
  await change('new-thread-body','Synthetic operational message');
  await click('new-thread-send');
  expect(messagesApi.open.mock.calls[0][1]).toMatchObject({
   audience:'CARE_TEAM',childId:'child-a'
  });
  expect(messagesApi.open.mock.calls[0][1]).not.toHaveProperty('guardianLinkId');
 });
 it('remote child directory denial does not retain old guardian eligibility',async()=>{
  opsApi.child.mockRejectedValueOnce(new Error('Synthetic access revoked'));
  await compose();
  expect(get('new-thread-recipient').findAllByType('option').map(x=>x.props.value))
   .toEqual(['']);
  await change('new-thread-subject','Fictional denied recipient');
  await change('new-thread-body','Unsent operational note');
  await click('new-thread-send');
  expect(messagesApi.open).not.toHaveBeenCalled();
 });
 it('message network rejection leaves draft for explicit retry rather than claiming delivery',async()=>{
  messagesApi.open.mockRejectedValueOnce({status:403,message:'Synthetic receiver revoked'});
  await compose({family:true});
  await change('new-thread-subject','Fictional scheduling change');
  await change('new-thread-body','Keep this fictional draft');
  await click('new-thread-send');
  expect(get('new-thread-error')).toBeTruthy();
  expect(get('new-thread-body').props.value).toBe('Keep this fictional draft');
  expect(get('new-thread-dialog')).toBeTruthy();
 });
});
describe('M4-08 message inbox read-only branch and visibility semantics',()=>{
 it('family sees own conversational wording without displaying child identity in row',async()=>{
  await mount({family:true});
  expect(get('messages-page').props.className).toContain('theme-family-light');
  expect(get('thread-thread-a')).toBeTruthy();
  expect(get('messages-non-clinical-notice')).toBeTruthy();
 });
 it('closed list with zero rows gives explicit closed rather than an open-family prompt',async()=>{
  messagesApi.list.mockImplementation(async(_,status)=>({
   items:status==='CLOSED'?[]:[thread()],unread:0
  }));
  await mount();await click('threads-tab-closed');
  expect(get('threads-empty')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('No closed conversations');
 });
 it('no assigned child disables creation instead of allowing unscoped sending',async()=>{
  await mount({kids:[]});
  expect(get('new-thread-button').props.disabled).toBe(true);
  expect(find('new-thread-dialog')).toHaveLength(0);
 });
 it('unread marking is absent for a read thread, even if another unread count exists',async()=>{
  messagesApi.list.mockResolvedValueOnce({items:[thread({unread:false})],unread:1});
  await mount();
  expect(find('thread-unread-thread-a')).toHaveLength(0);
 });
 it('closed thread cannot send an additional reply',async()=>{
  messagesApi.thread.mockResolvedValueOnce(detail({status:'CLOSED',canManage:false}));
  await mount();await click('thread-thread-a');
  expect(get('conversation-closed-note')).toBeTruthy();
  expect(find('reply-input')).toHaveLength(0);
  expect(find('conversation-toggle')).toHaveLength(0);
 });
 it('manager reopens closed conversation only after server acknowledgement',async()=>{
  messagesApi.thread.mockResolvedValueOnce(detail({status:'CLOSED'}));
  messagesApi.setStatus.mockResolvedValueOnce(detail({status:'OPEN'}));
  await mount();await click('thread-thread-a');
  await click('conversation-toggle');
  expect(messagesApi.setStatus).toHaveBeenCalledWith('center-a','thread-a',false);
  expect(get('reply-input')).toBeTruthy();
 });
});
