// M4-08 final source coverage: mount the real shared permission gate,
// status/error controls and async stale-response handler. These regressions
// are scoped to synthetic UI data and never grant API permissions.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let currentSession,tree,hookState;
jest.mock('@/components/auth/useSession',()=>({useSession:()=>currentSession}));
jest.mock('@/components/auth/ProductShell',()=>({ProductShell:({children,active})=>h('main',{'data-active':active},children)}));
jest.mock('@/components/auth/Field',()=>({FormAlert:({children,testId,tone})=>h('p',{'data-testid':testId,'data-tone':tone},children)}));
jest.mock('@/components/applications/StatusPill',()=>({formatDate:date=>'Synthetic date '+date}));
jest.mock('@/components/design/ui',()=>({
 Card:({children,testId})=>h('section',{'data-testid':testId},children),
 Pill:({children,tone,testId})=>h('span',{'data-testid':testId,'data-tone':tone},children)
}));
jest.mock('@/components/design/states',()=>({SkeletonRows:({rows,testId})=>h('p',{'data-testid':testId},'Loading '+rows)}));
const kit=require('../src/components/centers/kit');
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const json=()=>JSON.stringify(tree.toJSON());
const mount=async(component)=>act(async()=>{tree=create(component);});
const session=(permissions=[])=>({
 state:{status:'ready',data:{
  user:{id:'synthetic-user',displayName:'Fictional operator',email:'fake@example.invalid'},
  csrfToken:'fictional',permissions,contexts:[],
  activeContext:{type:'center',role:'THERAPIST',centerId:'centre-a'}
 }},
 handle:jest.fn()
});
beforeEach(()=>{jest.clearAllMocks();tree=null;hookState=null;currentSession=session();});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const workspace=(permission='center.children.read')=>h(kit.Workspace,{
 active:'children',permission,deniedText:'Synthetic access denied',
 children:(s)=>h('p',{'data-testid':'authorized-content'},s.user.displayName)
});

describe('M4-08 shared workspace denies unauthorized pages before mounting child components',()=>{
 it('renders loading without mounting protected content',async()=>{
  currentSession={state:{status:'loading'},handle:jest.fn()};
  await mount(workspace());
  expect(get('session-loading')).toBeTruthy();
  expect(find('authorized-content')).toHaveLength(0);
 });
 it('renders safe session error without displaying page data',async()=>{
  currentSession={state:{status:'error',message:'Synthetic session unavailable'},handle:jest.fn()};
  await mount(workspace());
  expect(get('session-error')).toBeTruthy();
  expect(find('authorized-content')).toHaveLength(0);
 });
 it('denies missing scoped permission even with an authenticated session',async()=>{
  currentSession=session(['center.team.read']);
  await mount(workspace());
  expect(get('page-forbidden')).toBeTruthy();
  expect(find('authorized-content')).toHaveLength(0);
  expect(json()).toContain('Synthetic access denied');
 });
 it('requires at least one exact permission from OR group',async()=>{
  currentSession=session(['center.children.manage']);
  await mount(workspace('center.children.read|center.children.manage'));
  expect(get('authorized-content').props.children).toBe('Fictional operator');
  expect(find('page-forbidden')).toHaveLength(0);
 });
 it('does not treat a prefix-matching role as a granted exact permission',async()=>{
  currentSession=session(['center.children.read.extended']);
  await mount(workspace('center.children.read'));
  expect(get('page-forbidden')).toBeTruthy();
 });
 it('renders an authorized child exactly once inside the proper shell',async()=>{
  currentSession=session(['center.children.read']);
  await mount(workspace());
  expect(get('authorized-content')).toBeTruthy();
  expect(tree.root.findByType('main').props['data-active']).toBe('children');
 });
});

describe('M4-08 error classification and refusal to fabricate success',()=>{
 it.each([400,409,410,422,429])('returns bounded, actionable HTTP %d message without dispatching session logout',status=>{
  const called=jest.fn();
  const text=kit.errorText({status,message:'Synthetic conflict '+status},called);
  expect(text).toBe('Synthetic conflict '+status);
  expect(called).not.toHaveBeenCalled();
 });
 it('dispatches a 401 to the authorized global session handler and yields no local success',()=>{
  const onError=jest.fn();const text=kit.errorText({status:401,message:'Synthetic expiry'},onError);
  expect(onError).toHaveBeenCalledWith({status:401,message:'Synthetic expiry'});
  expect(text).toBeNull();
 });
 it('retains recoverable unexpected failure when session handler rethrows',()=>{
  const error=Error('Synthetic retry needed'),onError=jest.fn(()=>{throw error;});
  expect(kit.errorText(error,onError)).toBe('Synthetic retry needed');
  expect(onError).toHaveBeenCalledWith(error);
 });
});

describe('M4-08 actual asynchronous useLoad race and retry boundaries',()=>{
 const Probe=({fetcher,handler})=>{
  hookState=kit.useLoad(fetcher,handler);
  return h('span',{'data-testid':'load-probe'},hookState.failed?'failed':hookState.data?.id??'loading');
 };
 const deferred=()=>{let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j;});return {promise,resolve,reject};};
 it('does not start unconfigured load or fabricate server data',async()=>{
  await mount(h(Probe,{fetcher:null,handler:jest.fn()}));
  expect(hookState.data).toBeNull();
  expect(hookState.failed).toBe(false);
  await act(async()=>hookState.reload());
  expect(hookState.data).toBeNull();
 });
 it('accepts exact latest successful response and exposes reload',async()=>{
  const fetcher=jest.fn().mockResolvedValue({id:'synthetic-result'});
  await mount(h(Probe,{fetcher,handler:jest.fn()}));
  expect(hookState.data.id).toBe('synthetic-result');
  await act(async()=>hookState.reload());
  expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('surfaces handled transport error through explicit handler only',async()=>{
  const handler=jest.fn(),fetcher=jest.fn().mockRejectedValue(Error('Synthetic offline'));
  await mount(h(Probe,{fetcher,handler}));
  expect(handler).toHaveBeenCalledTimes(1);
  expect(hookState.failed).toBe(false);
  expect(hookState.data).toBeNull();
 });
 it('keeps a safe failed state when session handler deliberately throws',async()=>{
  const handler=jest.fn(e=>{throw e;}),fetcher=jest.fn().mockRejectedValue(Error('Synthetic forbidden'));
  await mount(h(Probe,{fetcher,handler}));
  expect(hookState.failed).toBe(true);
  expect(hookState.data).toBeNull();
 });
 it('retries a failed request and stores confirmed server data',async()=>{
  const handler=jest.fn(e=>{throw e;});
  const fetcher=jest.fn().mockRejectedValueOnce(Error('Synthetic timeout')).mockResolvedValueOnce({id:'recovered'});
  await mount(h(Probe,{fetcher,handler}));
  expect(hookState.failed).toBe(true);
  await act(async()=>hookState.reload());
  expect(hookState.failed).toBe(false);
  expect(hookState.data.id).toBe('recovered');
 });
 it('ignores older response after newer successful reload',async()=>{
  const a=deferred(),b=deferred();
  const fetcher=jest.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  await mount(h(Probe,{fetcher,handler:jest.fn()}));
  let newer;
  await act(async()=>{newer=hookState.reload();});
  await act(async()=>{b.resolve({id:'new-tenant'});await newer;});
  expect(hookState.data.id).toBe('new-tenant');
  await act(async()=>{a.resolve({id:'old-tenant'});await a.promise;});
  expect(hookState.data.id).toBe('new-tenant');
 });
 it('does not report stale forbidden responses after newer authorized data',async()=>{
  const a=deferred(),b=deferred(),handler=jest.fn();
  const fetcher=jest.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  await mount(h(Probe,{fetcher,handler}));
  let newer;
  await act(async()=>{newer=hookState.reload();});
  await act(async()=>{b.resolve({id:'active'});await newer;});
  await act(async()=>{a.reject(Error('Synthetic older-center 403'));await a.promise.catch(()=>{});});
  expect(hookState.data.id).toBe('active');
  expect(handler).not.toHaveBeenCalled();
 });
});

describe('M4-08 shared form, history and semantic controls are source-driven',()=>{
 it('renders title with optional scope and action, preserving its data-test identity',async()=>{
  await mount(h(kit.PageTitle,{title:'Fictional children',eyebrow:'Center',body:'Synthetic data',testId:'title',
   action:h('button',{'data-testid':'title-action'},'Add')}));
  expect(get('title').props.children).toBe('Fictional children');
  expect(get('title-action')).toBeTruthy();
  expect(json()).toContain('Synthetic data');
 });
 it('renders a title without absent optional metadata',async()=>{
  await mount(h(kit.PageTitle,{title:'Fictional',testId:'title'}));
  expect(get('title')).toBeTruthy();
  expect(json()).not.toContain('Center');
 });
 it('renders one labeled history row without extending user scope',async()=>{
  await mount(h(kit.Row,{label:'Service'},'Fictional therapy'));
  expect(json()).toContain('Service');
  expect(json()).toContain('Fictional therapy');
 });
 it('checkbox group adds an eligible option but never changes another value',async()=>{
  const onChange=jest.fn();
  await mount(h(kit.ChoiceGroup,{label:'Specialties',options:[
   {value:'speech',label:'Speech',hint:'Synthetic description'},
   {value:'ot',label:'OT'}],value:['speech'],onChange,testId:'choice',columns:3}));
  expect(get('choice-speech').props.checked).toBe(true);
  expect(get('choice-ot').props.checked).toBe(false);
  await act(async()=>get('choice-ot').props.onChange({target:{checked:true}}));
  expect(onChange).toHaveBeenCalledWith(['speech','ot']);
  expect(json()).toContain('Synthetic description');
 });
 it('checkbox group removes exactly the unchecked specialty and retains error',async()=>{
  const onChange=jest.fn();
  await mount(h(kit.ChoiceGroup,{label:'Specialties',options:[
   {value:'speech',label:'Speech'},{value:'ot',label:'OT'}],
   value:['speech','ot'],onChange,testId:'choice',error:'Select one'}));
  await act(async()=>get('choice-speech').props.onChange({target:{checked:false}}));
  expect(onChange).toHaveBeenCalledWith(['ot']);
  expect(get('choice-error').props.children).toBe('Select one');
 });
 it('select field sends only exact selected option value',async()=>{
  const onChange=jest.fn();
  await mount(h(kit.SelectField,{label:'Role',value:'THERAPIST',options:[
   {value:'THERAPIST',label:'Therapist'},{value:'COORDINATOR',label:'Coordinator'}],
   testId:'role',onChange}));
  await act(async()=>get('role').props.onChange({target:{value:'COORDINATOR'}}));
  expect(onChange).toHaveBeenCalledWith('COORDINATOR');
 });
 it('reason field preserves a human-entered auditable explanation',async()=>{
  const onChange=jest.fn();
  await mount(h(kit.ReasonField,{label:'Reason',value:'',testId:'reason',onChange}));
  await act(async()=>get('reason').props.onChange({target:{value:'Synthetic change reason'}}));
  expect(onChange).toHaveBeenCalledWith('Synthetic change reason');
  expect(get('reason').props.maxLength).toBe(500);
 });
 it.each([['PENDING','info'],['EXPIRED','caution'],['ACCEPTED','success'],['REVOKED','danger'],['REPLACED','neutral']])(
  'invitation status %s maps to semantic %s tone',async(status,tone)=>{
   await mount(h(kit.InvitationPill,{status,testId:'status'}));
   expect(get('status').props['data-tone']).toBe(tone);
  });
 it.each([['ACTIVE','success'],['SUSPENDED','caution'],['REVOKED','danger']])(
  'membership state %s uses an appropriate %s tone',async(status,tone)=>{
   await mount(h(kit.MemberPill,{status,testId:'member'}));
   expect(get('member').props['data-tone']).toBe(tone);
  });
 it('role labels distinguish center admin from non-admin without implied clinical signing',async()=>{
  await mount(h(kit.RolePills,{roles:['CENTER_ADMIN','THERAPIST']}));
  const pills=tree.root.findAllByType('span').filter(n=>n.props['data-tone']);
  expect(pills.map(n=>n.props['data-tone'])).toEqual(['brand','neutral']);
  expect(json()).not.toContain('Clinical sign-off approved');
 });
 it('empty history cannot invent an audit actor',async()=>{
  await mount(h(kit.HistoryCard,{events:[],testId:'history'}));
  expect(get('history')).toBeTruthy();
  expect(json()).toContain('Nothing recorded yet');
 });
 it('history records events, actor and reason without silently changing event code',async()=>{
  await mount(h(kit.HistoryCard,{events:[
   {id:1,type:'member.suspended',actor:'Fictional operator',createdAt:'2026-11-11T09:00Z',meta:{reason:'Synthetic policy',invitee:'Fictional staff'}},
   {id:2,type:'fictional.unknown',actor:null,createdAt:'2026-11-11T10:00Z',meta:{}}
  ],testId:'history'}));
  expect(get('history-member.suspended')).toBeTruthy();
  expect(get('history-fictional.unknown')).toBeTruthy();
  expect(json()).toContain('Access suspended');
  expect(json()).toContain('Synthetic policy');
  expect(json()).toContain('fictional.unknown');
 });
});
