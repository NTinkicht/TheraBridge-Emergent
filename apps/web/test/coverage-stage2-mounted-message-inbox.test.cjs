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
const {messagesApi}=require('../src/lib/messages');
const {Messages}=require('../src/components/messages/Messages');
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
