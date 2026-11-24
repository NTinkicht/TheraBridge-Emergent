// Stage 2: real Schedule route (navigation, filters, tenant permissions,
// booking orchestration); child dialogs are mocked only at their UI boundary.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let mockSession,routeError;
jest.mock('@/components/centers/kit',()=>{
 const actual=jest.requireActual('@/components/centers/kit');
 return {...actual,Workspace:({children})=>children(mockSession,routeError),
  SelectField:({value,onChange,options,testId})=>h('select',{
   'data-testid':testId,value,onChange:e=>onChange(e.target.value)
  },options.map(o=>h('option',{key:o.value,value:o.value},o.label)))};
});
jest.mock('@/components/operations/Calendar',()=>{
 const real=jest.requireActual('@/components/operations/Calendar');
 return {...real,CalendarGrid:({onSlot,onOpen,items,days})=>h('div',{'data-testid':'synthetic-calendar-grid'},
  h('button',{'data-testid':'synthetic-grid-slot',disabled:!onSlot,
   onClick:()=>onSlot?.(days[0],'09:00')},'Synthetic empty slot'),
  ...items.map(a=>h('button',{key:a.id,'data-testid':'synthetic-grid-appt-'+a.id,
   onClick:()=>onOpen(a)},'Open synthetic visit')))};
});
jest.mock('@/components/operations/BookDialog',()=>{
 const actual=jest.requireActual('@/components/operations/BookDialog');
 return {...actual,BookDialog:({open,onDone,initial,editing})=>open?
 h('div',{'data-testid':'synthetic-book-dialog'},
  h('span',{'data-testid':'synthetic-book-initial'},initial?.date||'none'),
  h('button',{'data-testid':'synthetic-book-done',onClick:()=>onDone('Synthetic booking confirmed')},'Done')):null};
});
jest.mock('@/components/operations/AppointmentPanel',()=>({
 AppointmentPanel:({appt,onMove,onDone,manage,mine})=>appt?
 h('div',{'data-testid':'synthetic-selected-visit','data-manage':manage,'data-mine':mine},
 h('button',{'data-testid':'synthetic-move-selected',onClick:()=>onMove(appt)},'Move'),
 h('button',{'data-testid':'synthetic-complete-selected',onClick:()=>onDone('Synthetic visit saved')},'Done')):null
}));
jest.mock('@/lib/operations',()=>{
 const actual=jest.requireActual('@/lib/operations');
 return {...actual,opsApi:{...actual.opsApi,
  appointments:jest.fn(),children:jest.fn(),therapists:jest.fn()}};
});
const {opsApi,setCenterTz}=require('../src/lib/operations');
const SchedulePage=require('../src/app/app/schedule/page').default;
let tree,originalWindow;
const find=id=>tree.root.findAllByProps({'data-testid':id});
const get=id=>tree.root.findByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const mount=async()=>act(async()=>{tree=create(h(SchedulePage));});
const mockMatchMedia=query=>({matches:true,media:query,addEventListener:()=>{},
 removeEventListener:()=>{}});
beforeAll(()=>{
 originalWindow=global.window;
 global.window={...(originalWindow||{}),matchMedia:mockMatchMedia};
});
afterAll(()=>{global.window=originalWindow;});
beforeEach(()=>{
 setCenterTz('Asia/Dubai');
 jest.clearAllMocks();
 for(const k of ['appointments','children','therapists'])opsApi[k].mockReset();
 opsApi.appointments.mockResolvedValue({items:[],timezone:'Asia/Dubai'});
 opsApi.children.mockResolvedValue({items:[{id:'child-a',firstName:'Fictional',
  lastName:'Alex',preferredName:'Alex'}]});
 opsApi.therapists.mockResolvedValue({items:[{membershipId:'therapist-a',
  displayName:'Fictional Leila',specialties:['speech']}],nextOffset:null});
 routeError=jest.fn(e=>{throw e;});
 mockSession={activeContext:{type:'center',centerId:'center-a',role:'CENTER_ADMIN',
  membershipId:'admin-a'},permissions:['center.schedule.read','center.schedule.manage']};
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real schedule route with scoped access and controlled mutations',()=>{
 it('uses center timezone range and fetches only center-scoped appointment data',async()=>{
  await mount();
  expect(opsApi.appointments).toHaveBeenCalledWith('center-a',
   expect.objectContaining({from:expect.any(String),to:expect.any(String)}));
  expect(get('schedule-title')).toBeTruthy();
  expect(get('schedule-empty')).toBeTruthy();
  expect(get('synthetic-calendar-grid')).toBeTruthy();
 });
 it('switches between week/day and advances exact date bounds without other center requests',async()=>{
  await mount();
  const before=opsApi.appointments.mock.calls.at(-1)[1].from;
  await click('view-day');
  expect(get('view-day').props['aria-pressed']).toBe(true);
  await click('week-next');
  const after=opsApi.appointments.mock.calls.at(-1)[1].from;
  expect(after).not.toEqual(before);
  expect(opsApi.appointments.mock.calls.every(([id])=>id==='center-a')).toBe(true);
 });
 it('applies child and therapist filters to the actual appointment query',async()=>{
  await mount();
  await change('schedule-child-filter','child-a');
  await change('schedule-therapist-filter','therapist-a');
  expect(opsApi.appointments).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({childId:'child-a',membershipId:'therapist-a'}));
 });
 it('searches therapist directory with trimmed query and paginates exactly',async()=>{
  opsApi.therapists.mockResolvedValueOnce({
   items:[{membershipId:'therapist-a',displayName:'Leila',specialties:['speech']}],
   nextOffset:100
  }).mockResolvedValueOnce({
   items:[{membershipId:'therapist-b',displayName:'Fictional OT',specialties:['ot']}],
   nextOffset:null
  });
  await mount();
  expect(get('schedule-therapist-more')).toBeTruthy();
  await click('schedule-therapist-more');
  expect(opsApi.therapists).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({search:'',offset:100,limit:100}));
  await change('schedule-therapist-search','  Leila  ');
  expect(opsApi.therapists).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({search:'Leila',limit:100}));
 });
 it('switching centers remounts schedule filters and ignores late child-directory results from the old center',async()=>{
  let finishOld;
  opsApi.children.mockImplementationOnce(()=>new Promise(resolve=>{finishOld=resolve;}))
    .mockResolvedValueOnce({items:[{id:'child-b',firstName:'Synthetic',lastName:'Second',preferredName:'Second'}]});
  await mount();
  expect(opsApi.children).toHaveBeenCalledWith('center-a',{});
  mockSession={...mockSession,activeContext:{...mockSession.activeContext,
    centerId:'center-b',membershipId:'admin-b'}};
  await act(async()=>{tree.update(h(SchedulePage));await Promise.resolve();});
  expect(opsApi.children).toHaveBeenCalledWith('center-b',{});
  expect(opsApi.appointments).toHaveBeenLastCalledWith('center-b',expect.any(Object));
  const optionLabels=()=>get('schedule-child-filter').findAllByType('option').map(x=>x.props.children);
  expect(optionLabels()).toContain('Second Second');
  expect(optionLabels()).not.toContain('Alex Fictional');
  await act(async()=>{finishOld({items:[{id:'child-a',firstName:'Fictional',
    lastName:'Alex',preferredName:'Alex'}]});await Promise.resolve();});
  expect(optionLabels()).toContain('Second Second');
  expect(optionLabels()).not.toContain('Alex Fictional');
 });
 it('fails closed with an empty child selector when the current center directory rejects a request',async()=>{
  opsApi.children.mockRejectedValueOnce({status:403,message:'Synthetic scope revoked'});
  await mount();
  expect(opsApi.children).toHaveBeenCalledWith('center-a',{});
  const options=get('schedule-child-filter').findAllByType('option');
  expect(options.map(x=>x.props.value)).toEqual(['']);
  expect(options.map(x=>x.props.children)).toEqual(['All children']);
  expect(get('schedule-child-filter').props.value).toBe('');
 });
 it('ignores an old-center directory rejection after a new center has already populated authorized children',async()=>{
  let failOld;
  opsApi.children.mockImplementationOnce(()=>new Promise((_,reject)=>{failOld=reject;}))
    .mockResolvedValueOnce({items:[{id:'only-new',firstName:'Current',lastName:'Center',preferredName:'Current'}]});
  await mount();
  mockSession={...mockSession,activeContext:{...mockSession.activeContext,
    centerId:'center-new',membershipId:'admin-new'}};
  await act(async()=>{tree.update(h(SchedulePage));await Promise.resolve();});
  expect(get('schedule-child-filter').findAllByType('option').map(x=>x.props.value)).toEqual(['','only-new']);
  await act(async()=>{failOld(new Error('old center revoked'));await Promise.resolve();});
  expect(get('schedule-child-filter').findAllByType('option').map(x=>x.props.value)).toEqual(['','only-new']);
  expect(opsApi.appointments).toHaveBeenLastCalledWith('center-new',expect.objectContaining({childId:undefined}));
 });
 it('a current scoped child-directory response after loading only exposes current authorized children',async()=>{
  let returnAuthorized;
  opsApi.children.mockImplementationOnce(()=>new Promise(resolve=>{returnAuthorized=resolve;}));
  await mount();
  expect(get('schedule-child-filter').findAllByType('option').map(x=>x.props.value)).toEqual(['']);
  await act(async()=>{returnAuthorized({items:[{id:'current-kid',firstName:'Current',
    lastName:'Authorized',preferredName:'Current'}]});await Promise.resolve();});
  expect(get('schedule-child-filter').findAllByType('option').map(x=>x.props.value)).toEqual(['','current-kid']);
 });
 it('changing the active membership resets selected center filters and booking overlays',async()=>{
  await mount();
  await change('schedule-child-filter','child-a');
  await click('book-appointment-button');
  expect(get('synthetic-book-dialog')).toBeTruthy();
  mockSession={...mockSession,activeContext:{...mockSession.activeContext,membershipId:'admin-replaced'}};
  await act(async()=>{tree.update(h(SchedulePage));await Promise.resolve();});
  expect(get('schedule-child-filter').props.value).toBe('');
  expect(find('synthetic-book-dialog')).toHaveLength(0);
 });
 it('permits manager booking and refreshes server data only after confirmed completion',async()=>{
  await mount();
  await click('book-appointment-button');
  expect(get('synthetic-book-dialog')).toBeTruthy();
  const calls=opsApi.appointments.mock.calls.length;
  await click('synthetic-book-done');
  expect(opsApi.appointments.mock.calls.length).toBeGreaterThan(calls);
  expect(get('schedule-notice-success')).toBeTruthy();
  expect(find('synthetic-book-dialog')).toHaveLength(0);
 });
 it('allows a manager to select an empty grid slot with captured date and time',async()=>{
  await mount();await click('synthetic-grid-slot');
  expect(get('synthetic-book-dialog')).toBeTruthy();
  expect(get('synthetic-book-initial').props.children).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 });
 it('never exposes booking or therapist search to a read-only therapist',async()=>{
  mockSession.activeContext.role='THERAPIST';
  mockSession.permissions=['center.schedule.read'];
  await mount();
  expect(find('book-appointment-button')).toHaveLength(0);
  expect(find('schedule-therapist-search')).toHaveLength(0);
  expect(opsApi.therapists).not.toHaveBeenCalled();
  expect(get('synthetic-grid-slot').props.disabled).toBe(true);
 });
 it('shows retry state and avoids fabricating appointments when loading fails',async()=>{
  opsApi.appointments.mockRejectedValueOnce(new Error('Synthetic unavailable'))
   .mockResolvedValueOnce({items:[],timezone:'Asia/Dubai'});
  await mount();
  expect(get('schedule-error')).toBeTruthy();
  const retry=get('schedule-error').findAllByType('button')[0];
  await act(async()=>{retry.props.onClick();await Promise.resolve();});
  expect(get('schedule-empty')).toBeTruthy();
  expect(opsApi.appointments).toHaveBeenCalledTimes(2);
 });
});

describe('M5 owner feedback: authorized therapist autocomplete',()=>{
 it('uses real directory suggestions and keyboard selection without granting a new membership',async()=>{
  opsApi.therapists.mockResolvedValue({items:[
   {membershipId:'therapist-a',displayName:'Fictional Leila',specialties:['speech']},
   {membershipId:'therapist-b',displayName:'Fictional Lena',specialties:['occupational']}
  ],nextOffset:null});
  await mount();
  await act(async()=>get('schedule-therapist-search').props.onFocus());
  await change('schedule-therapist-search','Fictional');
  const matches=get('schedule-therapist-suggestions').findAllByProps({role:'option'});
  expect(matches).toHaveLength(2);
  expect(matches[0].props['aria-selected']).toBe(true);
  const prevent=jest.fn();
  await act(async()=>get('schedule-therapist-search').props.onKeyDown({key:'ArrowDown',preventDefault:prevent}));
  expect(matches[1].props['aria-selected']).toBe(true);
  await act(async()=>get('schedule-therapist-search').props.onKeyDown({key:'ArrowUp',preventDefault:prevent}));
  expect(matches[0].props['aria-selected']).toBe(true);
  await act(async()=>get('schedule-therapist-search').props.onKeyDown({key:'Enter',preventDefault:prevent}));
  expect(opsApi.appointments).toHaveBeenLastCalledWith('center-a',expect.objectContaining({membershipId:'therapist-a'}));
  expect(find('schedule-therapist-suggestions')).toHaveLength(0);
  expect(prevent).toHaveBeenCalledTimes(3);
 });
 it('keeps mouse selection and clearing search scoped to server-authorized options', async()=>{
  await mount();
  await act(async()=>get('schedule-therapist-search').props.onFocus());
  await change('schedule-therapist-search','Fictional Leila');
  const item=get('schedule-therapist-suggestions').findByProps({role:'option'});
  await act(async()=>item.findByType('button').props.onMouseDown({preventDefault:jest.fn()}));
  await act(async()=>item.findByType('button').props.onClick());
  expect(opsApi.appointments).toHaveBeenLastCalledWith('center-a',expect.objectContaining({membershipId:'therapist-a'}));
  await change('schedule-therapist-search','Unknown name');
  expect(opsApi.appointments).toHaveBeenLastCalledWith('center-a',expect.objectContaining({membershipId:undefined}));
  expect(find('schedule-therapist-suggestions')).toHaveLength(0);
  await act(async()=>get('schedule-therapist-search').props.onKeyDown({key:'Escape'}));
  expect(find('schedule-therapist-suggestions')).toHaveLength(0);
 });
});
