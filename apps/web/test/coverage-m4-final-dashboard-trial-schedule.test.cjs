// M4-08 final coverage: mount actual center dashboard, trial state and appointment
// tiles. Only backend hook/data and view primitives are substituted with
// deterministic synthetic boundaries. No real patient, session or billing data.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let loaded,tracked;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/centers/kit',()=>({
  useLoad:jest.fn(()=>loaded)
}));
jest.mock('@/components/design/ui',()=>({
 Card:({children,testId,...p})=>h('section',{'data-testid':testId,...p},children),
 Pill:({children,tone})=>h('span',{'data-tone':tone},children),
 Metric:({label,value,testId,sub})=>h('div',{'data-testid':testId},label+':'+value+' '+(sub||'')),
 Meter:({label,value,max,state,testId})=>h('div',{'data-testid':testId,'data-state':state},label+':'+value+'/'+max)
}));
jest.mock('@/components/design/states',()=>({
 EmptyState:({title,body,testId})=>h('p',{'data-testid':testId},title+' '+body),
 ErrorState:({onRetry,testId})=>h('button',{'data-testid':testId,onClick:onRetry},'Retry'),
 SkeletonRows:({rows,testId})=>h('p',{'data-testid':testId},'Loading '+rows)
}));
jest.mock('@/components/operations/BookDialog',()=>({serviceLabel:s=>s==='speech'?'Speech therapy':'Synthetic service'}));
jest.mock('@/lib/operations',()=>{
 const real=jest.requireActual('@/lib/operations');
 return {...real,opsApi:{...real.opsApi,dashboard:jest.fn()},
  dayLabel:()=> 'Synthetic Wednesday',timeRange:()=> '09:00–10:00'};
});
const {opsApi}=require('../src/lib/operations');
const {TrialBanner,DayList,ApptPill,CenterDashboard}=require('../src/components/operations/Dashboards');
const item=(extra={})=>({
 id:'appt-1',startsAt:'2026-11-11T05:00:00Z',endsAt:'2026-11-11T06:00:00Z',
 childId:'synthetic-child',childFull:'Fictional Alex',service:'speech',
 therapist:'Fictional Leila',room:'Room A',status:'SCHEDULED',...extra
});
const trial=(extra={})=>({
 onTrial:true,expired:false,daysLeft:5,endsAt:'2026-11-15T12:00:00Z',
 therapistSeats:{used:2,limit:5},children:{used:6,limit:15},...extra
});
const dashboard=(extra={})=>({
 counts:{activeChildren:6,therapists:2,upcomingWeek:8,unassigned:1,noGuardian:2},
 today:[item()],dayStart:'2026-11-11T00:00:00Z',timezone:'Asia/Dubai',
 trial:trial(),...extra
});
let tree;
const mount=async(node)=>act(async()=>{tree=create(node);});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const json=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{jest.clearAllMocks();tracked={reload:jest.fn(),onError:jest.fn()};
 loaded={data:dashboard(),failed:false,reload:tracked.reload};});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});

describe('actual trial and appointment tiles preserve schedule and sample scope',()=>{
 test('no-trial center never receives phantom trial warning',async()=>{
  await mount(h(TrialBanner,{trial:trial({onTrial:false})}));
  expect(tree.toJSON()).toBeNull();
 });
 test('active trial shows remaining days and numeric seat/child meters',async()=>{
  await mount(h(TrialBanner,{trial:trial()}));
  expect(get('trial-banner')).toBeTruthy();
  expect(json()).toContain('Free trial');
  expect(json()).toContain('5 days left');
  expect(get('trial-seats').props['data-state']).toBe('ok');
  expect(get('trial-children').props['data-state']).toBe('ok');
 });
 test('expired trial makes read-only notice visible without implying payment or access',async()=>{
  await mount(h(TrialBanner,{trial:trial({expired:true,daysLeft:0})}));
  expect(json()).toContain('Your trial has ended');
  expect(json()).toContain('Changes are paused');
  expect(json()).toContain('Everything stays visible');
 });
 test('seat and child capacity exhaustion produce separate warning states',async()=>{
  await mount(h(TrialBanner,{trial:trial({therapistSeats:{used:5,limit:5},children:{used:16,limit:15}})}));
  expect(get('trial-seats').props['data-state']).toBe('warn');
  expect(get('trial-children').props['data-state']).toBe('warn');
 });
 test('an empty day has a safe empty state instead of a fabricated child',async()=>{
  await mount(h(DayList,{items:[],testId:'today'}));
  expect(get('today-empty')).toBeTruthy();
  expect(json()).not.toContain('Fictional Alex');
 });
 test('appointment list links to current child rather than unrestricted directory',async()=>{
  await mount(h(DayList,{items:[item()],testId:'today'}));
  expect(get('today-appt-1')).toBeTruthy();
  const a=tree.root.findByType('a');
  expect(a.props.href).toBe('/app/children/synthetic-child');
  expect(json()).toContain('Fictional Alex');
  expect(json()).toContain('Fictional Leila');
  expect(json()).toContain('Room A');
 });
 test('therapist day suppresses therapist identity but preserves service',async()=>{
  await mount(h(DayList,{items:[item({room:''})],testId:'today',showTherapist:false}));
  expect(json()).toContain('Speech therapy');
  expect(json()).not.toContain('Fictional Leila');
  expect(json()).not.toContain('Room A');
 });
 test.each([['SCHEDULED','info'],['COMPLETED','success'],['CANCELLED','neutral'],['NO_SHOW','caution']])(
  'appointment %s maps to expected visual status tone',async(status,tone)=>{
   await mount(h(ApptPill,{a:{status}}));
   expect(tree.root.findByType('span').props['data-tone']).toBe(tone);
  });
});

describe('mounted center dashboard: role-aware data and safe errors',()=>{
 const screen=(isTherapist=false)=>h(CenterDashboard,{centerId:'centre-a',isTherapist,onError:tracked.onError});
 test('empty response shows loading skeleton, not stale metrics',async()=>{
  loaded={data:null,failed:false,reload:tracked.reload};
  await mount(screen());
  expect(get('dashboard-loading')).toBeTruthy();
  expect(find('center-dashboard')).toHaveLength(0);
 });
 test('failed data load offers retry without rendering leaked previous center',async()=>{
  loaded={data:null,failed:true,reload:tracked.reload};
  await mount(screen());
  expect(get('dashboard-error')).toBeTruthy();
  expect(find('center-dashboard')).toHaveLength(0);
  await act(async()=>{get('dashboard-error').props.onClick();await Promise.resolve();});
  expect(tracked.reload).toHaveBeenCalledTimes(1);
 });
 test('center administrator sees accurate active children and attention metrics',async()=>{
  await mount(screen(false));
  expect(get('center-dashboard')).toBeTruthy();
  expect(json()).toContain('Active children:6');
  expect(json()).toContain('Needs attention:3');
  expect(json()).toContain('without a therapist');
  expect(get('trial-banner')).toBeTruthy();
  expect(get('today-card')).toBeTruthy();
 });
 test('therapist sees assigned-children wording without admin trial or attention tiles',async()=>{
  await mount(screen(true));
  expect(json()).toContain('My children:6');
  expect(json()).toContain('Therapists:2');
  expect(json()).not.toContain('Needs attention:3');
  expect(find('trial-banner')).toHaveLength(0);
  expect(json()).toContain('My day');
  expect(json()).not.toContain('Fictional Leila');
 });
 test('day today count excludes completed and cancelled appointments',async()=>{
  loaded={data:dashboard({today:[item(),item({id:'appt-2',status:'COMPLETED'}),item({id:'appt-3',status:'CANCELLED'})]}),failed:false,reload:tracked.reload};
  await mount(screen());
  expect(json()).toContain('Today:1');
  expect(get('today-list-appt-2')).toBeTruthy();
  expect(get('today-list-appt-3')).toBeTruthy();
 });
 test('zero attention count cannot be incorrectly treated as caution',async()=>{
  loaded={data:dashboard({counts:{activeChildren:1,therapists:1,upcomingWeek:0,unassigned:0,noGuardian:0},today:[]}),failed:false,reload:tracked.reload};
  await mount(screen());
  expect(json()).toContain('Needs attention:0');
  expect(get('today-list-empty')).toBeTruthy();
 });
 test('schedule navigation stays in the authorized app workspace',async()=>{
  await mount(screen());
  expect(get('today-open-schedule').props.href).toBe('/app/schedule');
 });
});
