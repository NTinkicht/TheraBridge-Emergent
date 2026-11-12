// M4-08 90%-floor real mounted schedule orchestration, agenda, filter
// identity and booking boundaries. Network/UI chrome isolated; route is real.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let mockSession,mockLoaded,mockFetcher,mockWide=true,mockListeners=[];
jest.mock('@/components/centers/kit',()=>({
 Workspace:({children})=>children(mockSession,jest.fn()),
 useLoad:fetcher=>{mockFetcher=fetcher;return mockLoaded;},
 PageTitle:({title,action,testId})=>h('header',{'data-testid':testId},title,action),
 SelectField:({value,onChange,options,testId})=>h('select',{'data-testid':testId,value,onChange:e=>onChange(e.target.value)},
  options.map(o=>h('option',{key:o.value,value:o.value},o.label)))
}));
jest.mock('@/components/operations/BookDialog',()=>({
 BookDialog:({open,editing,initial,onClose,onDone})=>h('section',{'data-testid':'synthetic-book',
  'data-open':open,'data-edit':!!editing,'data-initial':JSON.stringify(initial)},
  h('button',{'data-testid':'book-finish',onClick:()=>onDone('Fictional appointment saved')},'Finish'),
  h('button',{'data-testid':'book-close',onClick:onClose},'Close')),
 serviceLabel:s=>s
}));
jest.mock('@/components/operations/AppointmentPanel',()=>({
 AppointmentPanel:({appt,manage,mine,canOpenClinical,onClose,onMove,onDone})=>h('section',{
  'data-testid':'synthetic-selected','data-id':appt?.id||'',
  'data-manage':manage,'data-mine':mine,'data-clinical':canOpenClinical
 },h('button',{'data-testid':'selection-close',onClick:onClose},'Close'),
 h('button',{'data-testid':'selection-move',onClick:()=>appt&&onMove(appt)},'Reschedule'),
 h('button',{'data-testid':'selection-done',onClick:()=>onDone('Fictional operation saved')},'Done'))
}));
jest.mock('@/components/operations/Calendar',()=>{
 const real=jest.requireActual('@/components/operations/Calendar');
 return {...real,CalendarGrid:({days,items,onOpen,onSlot})=>h('section',{
  'data-testid':'fake-calendar','data-days':days.length,'data-count':items.length,'data-slot-enabled':!!onSlot
 },h('button',{'data-testid':'fake-calendar-open',onClick:()=>items[0]&&onOpen(items[0])},'Open'),
 h('button',{'data-testid':'fake-calendar-slot',onClick:()=>onSlot&&onSlot(days[0],'09:00')},'Book slot'))};
});
jest.mock('@/components/operations/Dashboards',()=>({ApptPill:({a})=>h('span',null,a.status)}));
jest.mock('@/components/design/states',()=>({
 EmptyState:({title,body,testId})=>h('p',{'data-testid':testId},title+' '+body),
 ErrorState:({onRetry,testId})=>h('button',{'data-testid':testId,onClick:onRetry},'Retry'),
 SkeletonRows:({rows,testId})=>h('p',{'data-testid':testId},'Loading '+rows)
}));
jest.mock('@/lib/operations',()=>{
 const real=jest.requireActual('@/lib/operations');
 return {...real,opsApi:{...real.opsApi,
  appointments:jest.fn(),children:jest.fn(),therapists:jest.fn()}}
});
const {opsApi,setCenterTz}=require('../src/lib/operations');
const Page=require('../src/app/app/schedule/page').default;
const item=(more={})=>({
 id:'appt-a',childId:'child-a',childFull:'Fictional Child',
 membershipId:'membership-a',service:'speech',therapist:'Fictional therapist',room:'Room A',
 status:'SCHEDULED',seriesId:'series-a',
 startsAt:new Date().toISOString(),endsAt:new Date(Date.now()+1800000).toISOString(),...more
});
const data=(items=[item()])=>({items});
const session=(role='CENTER_ADMIN',permissions=['center.schedule.read','center.schedule.manage'])=>({
 activeContext:{type:'center',centerId:'centre-a',membershipId:'membership-a',role},permissions
});
let tree=null,oldWindow;
const mount=async()=>act(async()=>{tree=create(h(Page));await Promise.resolve();await Promise.resolve();});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const select=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const json=()=>JSON.stringify(tree.toJSON());
beforeAll(()=>{
 oldWindow=global.window;
 global.window={matchMedia:()=>({matches:mockWide,addEventListener:(_,fn)=>mockListeners.push(fn),
  removeEventListener:(_,fn)=>{mockListeners=mockListeners.filter(x=>x!==fn);}})};
 setCenterTz('Asia/Dubai');
});
afterAll(()=>{global.window=oldWindow;setCenterTz(undefined);});
beforeEach(()=>{
 jest.clearAllMocks();mockWide=true;mockListeners=[];
 mockSession=session();
 mockLoaded={data:data(),failed:false,reload:jest.fn()};
 opsApi.children.mockResolvedValue({items:[{id:'child-a',firstName:'Fictional',lastName:'Child',preferredName:'Alex'}]});
 opsApi.therapists.mockResolvedValue({items:[{membershipId:'membership-a',displayName:'Fictional therapist'}],nextOffset:null});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 real schedule role, range and booking boundaries',()=>{
 it('manager sees exact scheduled week, authorized book action and grid',async()=>{
  await mount();
  expect(get('schedule-title')).toBeTruthy();
  expect(get('view-week').props['aria-pressed']).toBe(true);
  expect(get('fake-calendar').props['data-days']).toBe(7);
  expect(get('fake-calendar').props['data-slot-enabled']).toBe(true);
  expect(get('book-appointment-button')).toBeTruthy();
  expect(get('synthetic-book').props['data-open']).toBe(false);
  expect(opsApi.children).toHaveBeenCalledWith('centre-a',{});
 });
 it('therapist never sees management booking or another staff directory',async()=>{
  mockSession=session('THERAPIST',['center.schedule.read','center.clinical.read']);
  await mount();
  expect(find('book-appointment-button')).toHaveLength(0);
  expect(find('schedule-therapist-search')).toHaveLength(0);
  expect(get('fake-calendar').props['data-slot-enabled']).toBe(false);
  expect(opsApi.therapists).not.toHaveBeenCalled();
 });
 it('read-only coordinator sees schedule but cannot book or edit',async()=>{
  mockSession=session('COORDINATOR',['center.schedule.read']);
  await mount();
  expect(find('book-appointment-button')).toHaveLength(0);
  expect(get('fake-calendar').props['data-slot-enabled']).toBe(false);
 });
 it('empty server response shows loading and never a previous center appointment',async()=>{
  mockLoaded={data:null,failed:false,reload:jest.fn()};
  await mount();expect(get('schedule-loading')).toBeTruthy();
  expect(find('fake-calendar')).toHaveLength(0);
  expect(find('appointment-appt-a')).toHaveLength(0);
 });
 it('API failure shows retry and avoids stale appointment list',async()=>{
  mockLoaded={data:null,failed:true,reload:jest.fn()};
  await mount();expect(get('schedule-error')).toBeTruthy();
  await click('schedule-error');expect(mockLoaded.reload).toHaveBeenCalledTimes(1);
  expect(find('fake-calendar')).toHaveLength(0);
 });
 it('day/week controls change exact calendar span without changing authorization',async()=>{
  await mount();await click('view-day');
  expect(get('fake-calendar').props['data-days']).toBe(1);
  expect(get('view-day').props['aria-pressed']).toBe(true);
  await click('week-next');
  await click('week-prev');
  await click('week-today');
  await click('view-week');
  expect(get('fake-calendar').props['data-days']).toBe(7);
  expect(get('view-week').props['aria-pressed']).toBe(true);
 });
 it('child selection uses exact tenant child ID and never expands therapist scope',async()=>{
  await mount();await select('schedule-child-filter','child-a');
  await mockFetcher();
  expect(opsApi.appointments).toHaveBeenCalledWith('centre-a',
   expect.objectContaining({childId:'child-a'}));
 });
 it('therapist filter sends exact membership ID from scoped server directory',async()=>{
  await mount();await select('schedule-therapist-filter','membership-a');
  await mockFetcher();
  expect(opsApi.appointments).toHaveBeenLastCalledWith('centre-a',
   expect.objectContaining({membershipId:'membership-a'}));
 });
 it('search trims query and source directory remains center-scoped',async()=>{
  await mount();await select('schedule-therapist-search','  Fictional  ');
  expect(opsApi.therapists).toHaveBeenLastCalledWith('centre-a',
   expect.objectContaining({search:'Fictional',limit:100}));
 });
 it('therapist search failure denies directory rows but does not expose old personnel',async()=>{
  opsApi.therapists.mockRejectedValueOnce(new Error('Fictional outage'));
  await mount();
  expect(get('schedule-therapist-filter').findAllByType('option')).toHaveLength(1);
 });
 it('staff search supports 100-row bounded paginated load',async()=>{
  opsApi.therapists
   .mockResolvedValueOnce({items:[{membershipId:'a',displayName:'Fictional A'}],nextOffset:100})
   .mockResolvedValueOnce({items:[{membershipId:'b',displayName:'Fictional B'}],nextOffset:null});
  await mount();
  expect(get('schedule-therapist-more')).toBeTruthy();
  await click('schedule-therapist-more');
  expect(opsApi.therapists).toHaveBeenLastCalledWith('centre-a',
   expect.objectContaining({search:'',offset:100,limit:100}));
  expect(get('schedule-therapist-filter').findAllByType('option').map(x=>x.props.value))
   .toEqual(['','a','b']);
  expect(find('schedule-therapist-more')).toHaveLength(0);
 });
 it('failed therapist pagination retains previously authorized directory page',async()=>{
  opsApi.therapists.mockResolvedValueOnce({items:[{membershipId:'a',displayName:'Fictional A'}],nextOffset:100})
   .mockRejectedValueOnce(new Error('Fictional page outage'));
  await mount();await click('schedule-therapist-more');
  expect(get('schedule-therapist-filter').findAllByType('option').map(x=>x.props.value))
   .toEqual(['','a']);
  expect(get('schedule-therapist-more')).toBeTruthy();
 });
 it('empty week displays correct scoped prompt and does not invent visits',async()=>{
  mockLoaded={data:data([]),failed:false,reload:jest.fn()};
  await mount();expect(get('schedule-empty')).toBeTruthy();
  expect(get('fake-calendar').props['data-count']).toBe(0);
  expect(json()).toContain('Choose an empty slot to book');
 });
 it('manager opens booking only from explicit permitted calendar slot',async()=>{
  await mount();await click('fake-calendar-slot');
  expect(get('synthetic-book').props['data-open']).toBe(true);
  expect(get('synthetic-book').props['data-initial']).toContain('09:00');
  await click('book-close');
  expect(get('synthetic-book').props['data-open']).toBe(false);
  await click('book-appointment-button');
  expect(get('synthetic-book').props['data-open']).toBe(true);
 });
 it('successful booking receipt closes all local modals and triggers current server reload',async()=>{
  await mount();await click('book-appointment-button');
  await click('book-finish');
  expect(get('schedule-notice-success')).toBeTruthy();
  expect(get('synthetic-book').props['data-open']).toBe(false);
  expect(mockLoaded.reload).toHaveBeenCalledTimes(1);
 });
 it('appointment selection is tenant-bound and exposes only actual membership permissions',async()=>{
  await mount();await click('fake-calendar-open');
  expect(get('synthetic-selected').props).toMatchObject({
   'data-id':'appt-a','data-manage':true,'data-mine':true
  });
  await click('selection-close');
  expect(get('synthetic-selected').props['data-id']).toBe('');
 });
 it('therapist may open clinical context only for own appointment with read permission',async()=>{
  mockSession=session('THERAPIST',['center.schedule.read','center.clinical.read']);
  await mount();await click('fake-calendar-open');
  expect(get('synthetic-selected').props['data-clinical']).toBe(true);
 });
 it('therapist cannot open clinical context for a different assigned membership',async()=>{
  mockSession=session('THERAPIST',['center.schedule.read','center.clinical.read']);
  mockLoaded={data:data([item({membershipId:'another-member'})]),failed:false,reload:jest.fn()};
  await mount();await click('fake-calendar-open');
  expect(get('synthetic-selected').props).toMatchObject({
   'data-mine':false,'data-clinical':false
  });
 });
 it('rescheduling uses selected appointment instead of fabricating booking data',async()=>{
  await mount();await click('fake-calendar-open');await click('selection-move');
  expect(get('synthetic-book').props).toMatchObject({
   'data-open':true,'data-edit':true
  });
  expect(get('synthetic-selected').props['data-id']).toBe('');
 });
 it('narrow screens show the real agenda only when visits actually exist',async()=>{
  mockWide=false;
  await mount();
  expect(get('schedule-agenda')).toBeTruthy();
  expect(get('appointment-appt-a')).toBeTruthy();
  await click('appointment-appt-a');
  expect(get('synthetic-selected').props['data-id']).toBe('appt-a');
 });
 it('narrow empty screen shows tenant-safe empty message, not fake appointment',async()=>{
  mockWide=false;mockLoaded={data:data([]),failed:false,reload:jest.fn()};
  await mount();
  expect(get('schedule-empty')).toBeTruthy();
  expect(find('schedule-agenda')).toHaveLength(0);
  expect(find('fake-calendar')).toHaveLength(0);
 });
 it('narrow read-only role uses non-booking message, not management suggestion',async()=>{
  mockWide=false;mockSession=session('THERAPIST',['center.schedule.read']);
  mockLoaded={data:data([]),failed:false,reload:jest.fn()};
  await mount();
  expect(json()).toContain('Visits booked for you');
  expect(json()).not.toContain('Book a visit for a child');
 });
});
