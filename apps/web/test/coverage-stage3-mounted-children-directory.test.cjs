// Stage 3: real center child directory and first-registration UI with
// tenant scope and role restrictions. No real child or clinical information.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let session,routeError,router;
jest.mock('next/navigation',()=>({useRouter:()=>router}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('@/components/design/states',()=>{
 const a=jest.requireActual('@/components/design/states');
 return {...a,Dialog:({open,children,footer,testId})=>open?
 h('section',{'data-testid':testId},children,h('footer',null,footer)):null};
});
jest.mock('@/components/centers/kit',()=>{
 const a=jest.requireActual('@/components/centers/kit');
 return {...a,Workspace:({children})=>children(session,routeError),
  ChoiceGroup:({value,onChange,testId})=>h('div',{'data-testid':testId},
   h('button',{'data-testid':testId+'-set',onClick:()=>onChange(['speech'])},'Select speech'),
   h('span',null,value.join(','))),
  SelectField:({value,onChange,testId,options})=>h('select',{
   value,'data-testid':testId,onChange:e=>onChange(e.target.value)
  },options.map(o=>h('option',{value:o.value,key:o.value},o.label)))};
});
jest.mock('@/lib/operations',()=>{
 const a=jest.requireActual('@/lib/operations');
 return {...a,opsApi:{...a.opsApi,children:jest.fn(),createChild:jest.fn()}};
});
const {opsApi}=require('../src/lib/operations');
const ChildrenPage=require('../src/app/app/children/page').default;
const child=(more={})=>({
 id:'child-a',firstName:'Fictional',lastName:'Alex',preferredName:'Alex',
 dateOfBirth:'2018-11-09',services:['speech'],team:[],guardians:false,
 nextAppointment:null,status:'ACTIVE',...more
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const submitSearch=async()=>act(async()=>{get('children-search-input').parent.parent.props.onSubmit({
 preventDefault:()=>{}
 });await Promise.resolve();});
const mount=async()=>act(async()=>{tree=create(h(ChildrenPage));});
beforeEach(()=>{
 jest.clearAllMocks();opsApi.children.mockReset();opsApi.createChild.mockReset();
 opsApi.children.mockResolvedValue({items:[child()]});
 opsApi.createChild.mockResolvedValue({id:'new-child'});
 router={push:jest.fn()};
 routeError=jest.fn(e=>{throw e;});
 session={activeContext:{type:'center',centerId:'center-a',role:'CENTER_ADMIN'},
  permissions:['center.children.read','center.children.manage']};
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real tenant-scoped child directory and operational registration',()=>{
 it('loads only the active center and does not fabricate a guardian or assignment',async()=>{
  await mount();
  expect(opsApi.children).toHaveBeenCalledWith('center-a',{q:'',status:'ACTIVE'});
  expect(get('child-row-child-a').props.href).toBe('/app/children/child-a');
  expect(get('children-list')).toBeTruthy();
  const display=JSON.stringify(tree.toJSON());
  expect(display).toContain('No guardian');
  expect(display).toContain('No therapist assigned');
 });
 it('searches normalized child name and archived status within exact center',async()=>{
  await mount();
  await change('children-search-input','  Fictional Alex  ');
  await act(async()=>{get('children-search-button').parent.props.onSubmit({
   preventDefault:()=>{}
  });await Promise.resolve();});
  await change('children-status-filter','ARCHIVED');
  expect(opsApi.children).toHaveBeenLastCalledWith('center-a',{
   q:'Fictional Alex',status:'ARCHIVED'
  });
 });
 it('does not allow a therapist to create operational child profiles',async()=>{
  session.activeContext.role='THERAPIST';
  session.permissions=['center.children.read'];
  await mount();
  expect(find('register-child-button')).toHaveLength(0);
  expect(find('register-child-dialog')).toHaveLength(0);
  expect(get('child-row-child-a')).toBeTruthy();
 });
 it('requires child identity, birth date and at least one service',async()=>{
  await mount();await click('register-child-button');
  await click('register-child-save');
  expect(get('register-child-error')).toBeTruthy();
  expect(opsApi.createChild).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
 });
 it('creates a fictional operational record with the exact center and service',async()=>{
  await mount();await click('register-child-button');
  await change('child-first-name-input','Fictional');
  await change('child-last-name-input','Case');
  await change('child-preferred-name-input','Alex');
  await change('child-dob-input','2018-11-09');
  await click('child-service-set');await click('register-child-save');
  expect(opsApi.createChild).toHaveBeenCalledWith('center-a',{
   firstName:'Fictional',lastName:'Case',preferredName:'Alex',
   dateOfBirth:'2018-11-09',services:['speech']
  });
  expect(router.push).toHaveBeenCalledWith('/app/children/new-child?registered=1');
 });
 it('preserves entered identity and does not redirect after rejected registration',async()=>{
  opsApi.createChild.mockRejectedValue({status:403,message:'Synthetic denied'});
  await mount();await click('register-child-button');
  await change('child-first-name-input','Fictional');
  await change('child-last-name-input','Case');
  await change('child-dob-input','2018-11-09');
  await click('child-service-set');await click('register-child-save');
  expect(get('register-child-error')).toBeTruthy();
  expect(get('child-first-name-input').props.value).toBe('Fictional');
  expect(router.push).not.toHaveBeenCalled();
 });
 it('shows accurate no-children and fetch-error recovery states',async()=>{
  opsApi.children.mockResolvedValueOnce({items:[]});
  await mount();
  expect(get('children-empty')).toBeTruthy();
  expect(find('child-row-child-a')).toHaveLength(0);
 });
 it('retries an initial failed search rather than inventing private child rows',async()=>{
  opsApi.children.mockRejectedValueOnce(new Error('Synthetic denied'))
   .mockResolvedValueOnce({items:[child()]});
  await mount();expect(get('children-error')).toBeTruthy();
  expect(find('child-row-child-a')).toHaveLength(0);
  const button=get('children-error').findAllByType('button')[0];
  await act(async()=>{button.props.onClick();await Promise.resolve();});
  expect(get('child-row-child-a')).toBeTruthy();
  expect(opsApi.children).toHaveBeenCalledTimes(2);
 });
});

describe('M5 owner feedback: real authorized child search suggestions', () => {
 it('suggests only scoped child results and opens the selected returned record by keyboard', async () => {
  jest.useFakeTimers();
  try {
   opsApi.children.mockResolvedValue({items:[child(),child({id:'child-b',firstName:'Fictional',lastName:'Bella',preferredName:'Bella'})]});
   await mount();
   await change('children-search-input','Bell');
   await act(async()=>{get('children-search-input').props.onFocus();});
   expect(find('children-search-suggestions')).toHaveLength(0);
   await act(async()=>{jest.advanceTimersByTime(250);await Promise.resolve();});
   expect(opsApi.children).toHaveBeenCalledWith('center-a',{q:'Bell',status:'ACTIVE'});
   expect(get('children-search-suggestions')).toBeTruthy();
   const options=get('children-search-suggestions').findAllByProps({role:'option'});
   expect(options).toHaveLength(2);
   expect(options[0].props['aria-selected']).toBe(true);
   const prevent=jest.fn();
   await act(async()=>get('children-search-input').props.onKeyDown({key:'ArrowDown',preventDefault:prevent}));
   expect(options[1].props['aria-selected']).toBe(true);
   await act(async()=>get('children-search-input').props.onKeyDown({key:'Enter',preventDefault:prevent}));
   expect(prevent).toHaveBeenCalledTimes(2);
   expect(router.push).toHaveBeenCalledWith('/app/children/child-b');
  } finally { jest.useRealTimers(); }
 });
 it('supports pointer selection, Escape and blur without exposing unauthorized names',async()=>{
  jest.useFakeTimers();
  try {
   await mount();
   await change('children-search-input','Alex');
   await act(async()=>{jest.advanceTimersByTime(250);await Promise.resolve();});
   const results=get('children-search-suggestions');
   const li=results.findByProps({role:'option'});
   await act(async()=>li.findByType('button').props.onMouseDown({preventDefault:jest.fn()}));
   await act(async()=>li.findByType('button').props.onClick());
   expect(router.push).toHaveBeenCalledWith('/app/children/child-a');
   await act(async()=>get('children-search-input').props.onFocus());
   await act(async()=>get('children-search-input').props.onKeyDown({key:'Escape'}));
   expect(find('children-search-suggestions')).toHaveLength(0);
   await act(async()=>get('children-search-input').props.onFocus());
   await act(async()=>get('children-search-input').props.onBlur());
   expect(find('children-search-suggestions')).toHaveLength(0);
  } finally { jest.useRealTimers(); }
 });
 it('returns no suggestions on network denial and never navigates to a guessed child', async()=>{
  jest.useFakeTimers();
  try {
   opsApi.children.mockResolvedValueOnce({items:[child()]})
     .mockRejectedValueOnce(new Error('Synthetic child lookup denied'));
   await mount();await change('children-search-input','Private');
   await act(async()=>{jest.advanceTimersByTime(250);await Promise.resolve();});
   expect(find('children-search-suggestions')).toHaveLength(0);
   expect(router.push).not.toHaveBeenCalled();
  } finally { jest.useRealTimers(); }
 });
});
