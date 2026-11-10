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
