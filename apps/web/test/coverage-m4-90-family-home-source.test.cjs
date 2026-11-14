// M4-08 measured ≥90% source-executed family overview, privacy, reminders
// and historical visit UI. Fictional records only; no messaging gate is opened.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let mockData,mockFailed,mockReload;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/centers/kit',()=>{
 const actual=jest.requireActual('@/components/centers/kit');
 return {...actual,useLoad:()=>({data:mockData,failed:mockFailed,reload:mockReload})};
});
jest.mock('@/lib/messages',()=>{
 const real=jest.requireActual('@/lib/messages');
 return {...real,messagesApi:{...real.messagesApi,list:jest.fn()}};
});
jest.mock('@/lib/operations',()=>{
 const real=jest.requireActual('@/lib/operations');
 return {...real,opsApi:{...real.opsApi,setReminders:jest.fn(),family:jest.fn()}};
});
const {opsApi}=require('../src/lib/operations');
const {messagesApi}=require('../src/lib/messages');
const {FamilyHome}=require('../src/components/operations/FamilyHome');
const visit=(extra={})=>({
 id:'appt-a',startsAt:'2099-01-01T10:00:00.000Z',
 endsAt:'2099-01-01T11:00:00.000Z',service:'speech',
 therapist:'Fictional therapist',status:'SCHEDULED',room:'Room F',
 recurring:false,changed:false,...extra
});
const kid=(more={})=>({
 id:'child-a',name:'Fictional Child',fullName:'Fictional A Child',
 relationship:'parent',remindersEnabled:false,
 team:[{name:'Fictional therapist',title:'Therapist',service:'speech',isLead:true}],
 upcoming:[visit()],history:[],
 attendance:{attended:0,noShow:0,cancelled:0,days:120},...more
});
const family=(children=[kid()])=>({center:{name:'Fictional Center',timezone:'Asia/Dubai'},children});
let tree=null,onError;
const mount=async()=>act(async()=>{tree=create(h(FamilyHome,{centerId:'fictional-center',onError}));
 await Promise.resolve();await Promise.resolve();});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const get=id=>tree.root.findByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();await Promise.resolve();});
const html=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();mockData=family();mockFailed=false;mockReload=jest.fn(async()=>{});
 onError=jest.fn();messagesApi.list.mockReset();opsApi.setReminders.mockReset();
 messagesApi.list.mockResolvedValue({items:[],unread:0});
 opsApi.setReminders.mockResolvedValue({remindersEnabled:true});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 real family-home branch qualification honors private child/visit scopes',()=>{
 it('loading family data never displays a previous child or placeholder visit',async()=>{
  mockData=null;await mount();
  expect(get('family-loading')).toBeTruthy();
  expect(find('family-home')).toHaveLength(0);
  expect(find('family-visit-appt-a')).toHaveLength(0);
 });
 it('API denial returns retry without retaining old protected child information',async()=>{
  mockData=null;mockFailed=true;await mount();
  expect(get('family-error')).toBeTruthy();
  expect(find('family-home')).toHaveLength(0);
  await click('family-error-retry');expect(mockReload).toHaveBeenCalledTimes(1);
 });
 it('guardian without links sees explicit empty state, not arbitrary center children',async()=>{
  mockData=family([]);await mount();
  expect(get('family-empty')).toBeTruthy();
  expect(find('family-child-child-a')).toHaveLength(0);
  expect(html()).toContain('No children linked yet');
 });
 it('authorized one-child overview includes only confirmed appointment and its team',async()=>{
  await mount();
  expect(get('family-child-child-a')).toBeTruthy();
  expect(get('family-upcoming-child-a')).toBeTruthy();
  expect(get('family-team-child-a')).toBeTruthy();
  expect(html()).toContain('Fictional therapist');
  expect(html()).not.toContain('Signed therapy plan');
 });
 it('zero scheduled visits, history, and team are all explicit, not fabricated',async()=>{
  mockData=family([kid({upcoming:[],history:[],team:[]})]);await mount();
  expect(get('family-upcoming-empty-child-a')).toBeTruthy();
  expect(get('family-history-empty-child-a')).toBeTruthy();
  expect(html()).toContain('Your care team will appear');
 });
 it('past scheduled visit is not misrepresented as confirmed attendance',async()=>{
  mockData=family([kid({history:[visit({id:'past-a',startsAt:'2026-10-10T10:00:00Z',
   status:'SCHEDULED'})]})]);await mount();
  expect(get('family-visit-status-past-a')).toBeTruthy();
  expect(html()).toContain('Not recorded yet');
  expect(html()).not.toContain('Completed unsigned session');
 });
 it('cancelled upcoming visit hides context and displays cancellation information',async()=>{
  mockData=family([kid({upcoming:[visit({id:'cancelled',status:'CANCELLED',
   room:null,changed:false})]})]);await mount();
  expect(get('family-visit-cancelled')).toBeTruthy();
  expect(html()).toContain('The center cancelled this visit');
  expect(html()).not.toContain('Room F');
 });
 it('changed recurring visit includes explicit changed + repeating labels without claiming attendance',async()=>{
  mockData=family([kid({upcoming:[visit({id:'changed',changed:true,recurring:true})]})]);
  await mount();
  expect(get('family-visit-changed-changed')).toBeTruthy();
  expect(html()).toContain('Repeating visit');
  expect(html()).toContain('Time changed');
 });
 it('past cancellation does not duplicate future-cancellation explanation',async()=>{
  mockData=family([kid({upcoming:[],history:[visit({
   id:'old-cancel',status:'CANCELLED',startsAt:'2026-10-01T08:00:00Z'
  })]})]);await mount();
  expect(get('family-visit-old-cancel')).toBeTruthy();
  expect(html()).not.toContain('The center cancelled this visit');
 });
 it('upcoming list uses six-item limit and explicit expansion, preserving all individual visits',async()=>{
  mockData=family([kid({upcoming:Array.from({length:8},(_,i)=>visit({id:'up-'+i}))})]);
  await mount();expect(get('family-upcoming-child-a').findAllByType('li')).toHaveLength(6);
  await click('family-upcoming-more-child-a');
  expect(get('family-upcoming-child-a').findAllByType('li')).toHaveLength(8);
  await click('family-upcoming-more-child-a');
  expect(get('family-upcoming-child-a').findAllByType('li')).toHaveLength(6);
 });
 it('historical visits show four by default and all only on explicit user request',async()=>{
  mockData=family([kid({history:Array.from({length:6},(_,i)=>visit({
   id:'past-'+i,startsAt:'2026-09-01T10:00:00Z',status:'COMPLETED'
  }))})]);await mount();
  expect(get('family-history-child-a').findAllByType('li')).toHaveLength(4);
  await click('family-history-more-child-a');
  expect(get('family-history-child-a').findAllByType('li')).toHaveLength(6);
 });
 it('missing team title and lead flag never fabricate service roles',async()=>{
  mockData=family([kid({team:[{name:'Fictional A',service:'speech',
   title:null,isLead:false}]})]);await mount();
  expect(html()).toContain('Fictional A');
  expect(html()).not.toContain(' · lead');
 });
 it('family appointment reminders initially off, toggled with exact linked child only',async()=>{
  await mount();
  expect(get('family-reminders-toggle-child-a').props['aria-checked']).toBe(false);
  await click('family-reminders-toggle-child-a');
  expect(opsApi.setReminders).toHaveBeenCalledWith('fictional-center','child-a',true);
  expect(get('family-reminders-toggle-child-a').props['aria-checked']).toBe(true);
 });
 it('family reminder toggle off never changes the child ID or staff scope',async()=>{
  mockData=family([kid({remindersEnabled:true})]);opsApi.setReminders.mockResolvedValueOnce({
   remindersEnabled:false
  });await mount();await click('family-reminders-toggle-child-a');
  expect(opsApi.setReminders).toHaveBeenCalledWith('fictional-center','child-a',false);
  expect(get('family-reminders-toggle-child-a').props['aria-checked']).toBe(false);
 });
 it('reminder API failure keeps last confirmed value and reports retry',async()=>{
  opsApi.setReminders.mockRejectedValueOnce({status:403,message:'Fictional link revoked'});
  await mount();await click('family-reminders-toggle-child-a');
  expect(get('family-reminders-toggle-child-a').props['aria-checked']).toBe(false);
  expect(html()).toContain('That didn');
  expect(onError).toHaveBeenCalledTimes(1);
 });
 it('onError callback failure never erases local error or falsely toggles state',async()=>{
  onError.mockImplementationOnce(()=>{throw Error('Fictional reporting failure')});
  opsApi.setReminders.mockRejectedValueOnce(new Error('Synthetic timeout'));
  await mount();await click('family-reminders-toggle-child-a');
  expect(get('family-reminders-toggle-child-a').props['aria-checked']).toBe(false);
  expect(html()).toContain('That didn');
 });
 it('family unread count appears only for actual server-reported unread messages',async()=>{
  messagesApi.list.mockResolvedValueOnce({items:[],unread:3});
  await mount();
  expect(messagesApi.list).toHaveBeenCalledWith('fictional-center','OPEN');
  expect(get('family-unread')).toBeTruthy();
  expect(html()).toContain('3');
 });
 it('messaging API denial leaves unread zero and no artificial alert',async()=>{
  messagesApi.list.mockRejectedValueOnce({status:403,message:'Synthetic messaging disabled'});
  await mount();expect(find('family-unread')).toHaveLength(0);
  expect(get('family-messages-link')).toBeTruthy();
 });
 it('multiple authorized child links each get independent reminder state',async()=>{
  mockData=family([kid(),kid({id:'child-b',name:'Another fictional child',
   fullName:'Another Fictional Child',remindersEnabled:true})]);await mount();
  expect(get('family-reminders-toggle-child-a').props['aria-checked']).toBe(false);
  expect(get('family-reminders-toggle-child-b').props['aria-checked']).toBe(true);
  await click('family-reminders-toggle-child-a');
  expect(get('family-reminders-toggle-child-b').props['aria-checked']).toBe(true);
 });
});
