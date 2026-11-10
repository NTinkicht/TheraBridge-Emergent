// Stage 3: real family/home-practice internal calendar projection, explicit
// saved definition provenance, invalid-date omissions and read-only workflow.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
const {HomePracticeCalendar}=require('../src/components/clinical/HomePracticeCalendar');
const goal=(extra={})=>({key:'goal-a',title:'Fictional count goal',measure:'count',baseline:1,target:5,...extra});
const snapshot={title:'Frozen original matching task',minutes:14,service:'speech',
 ageBand:'6-8',materials:['paper'],steps:['Match'],safety:['Supervise']};
const activity=(extra={})=>({
 templateId:'template-a',goalKey:'goal-a',frequency:'Weekly',
 durationMinutes:20,note:'Fictional clinician note',snapshot,
 schedule:{cadence:'WEEKLY',startsOn:'2026-11-09',endsOn:'2026-11-30',
 weekdays:[1,3]},...extra
});
const template=(extra={})=>({
 id:'template-a',title:'Changed mutable title',minutes:40,
 service:'speech',ageBand:'6-8',materials:['cards'],steps:[],safety:[],...extra
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick()});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const mount=async(props={})=>act(async()=>{tree=create(h(HomePracticeCalendar,{
 activities:[activity()],goals:[goal()],templates:[template()],
 versionNumber:3,timezone:'Asia/Dubai',...props
}));});
const output=()=>JSON.stringify(tree.toJSON());
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real clinician-entered home plan calendar is an internal preview',()=>{
 it('starts at exact first scheduled month with immutable recorded title and times',async()=>{
  await mount();
  expect(get('home-practice-calendar')).toBeTruthy();
  expect(get('home-calendar-month').props.value).toBe('2026-11');
  expect(get('home-calendar-item')).toBeTruthy();
  expect(output()).toContain('Frozen original matching task');
  expect(output()).toContain('20 min (plan-specific; template 14 min)');
  expect(output()).not.toContain('Changed mutable title');
  expect(output()).toContain('not approved or shared');
 });
 it('selects another date and correctly reports no planned activities',async()=>{
  await mount();
  await click('home-calendar-day-2026-11-10');
  expect(get('home-calendar-day-2026-11-10').props['aria-pressed']).toBe(true);
  expect(get('home-calendar-empty-day')).toBeTruthy();
  expect(find('home-calendar-item')).toHaveLength(0);
 });
 it('moves to the next calendar month without projecting old-month dates',async()=>{
  await mount();await click('home-calendar-next');
  expect(get('home-calendar-month').props.value).toBe('2026-12');
  expect(get('home-calendar-empty-day')).toBeTruthy();
  expect(find('home-calendar-item')).toHaveLength(0);
  await click('home-calendar-previous');
  expect(get('home-calendar-month').props.value).toBe('2026-11');
 });
 it('refuses malformed month input instead of showing a phantom date',async()=>{
  await mount();await change('home-calendar-month','2026-13');
  expect(get('home-calendar-month').props.value).toBe('2026-11');
  expect(get('home-calendar-item')).toBeTruthy();
 });
 it('marks unsaved therapist edits as local only, never caregiver-shared tasks',async()=>{
  await mount({unsaved:true});
  expect(output()).toContain('Unsaved plan edits are shown as a local preview only');
  expect(output()).toContain('not a booking');
 });
 it('shows invalid dated and undated legacy activity counts without plotting them',async()=>{
  await mount({activities:[
   activity({schedule:undefined}),
   activity({templateId:'template-invalid',snapshot:undefined,
    schedule:{cadence:'MONTHLY',startsOn:'2026-12-31',endsOn:'2026-11-01',monthDay:31}})
  ]});
  expect(get('home-calendar-no-schedules')).toBeTruthy();
  expect(get('home-calendar-omissions')).toBeTruthy();
  expect(find('home-calendar-item')).toHaveLength(0);
 });
 it('labels current mutable-library fallback as not a frozen source',async()=>{
  await mount({activities:[activity({snapshot:undefined,durationMinutes:undefined})]});
  expect(get('home-calendar-item')).toBeTruthy();
  expect(output()).toContain('Current library/legacy source');
  expect(output()).toContain('Changed mutable title');
  expect(output()).not.toContain('plan-specific; template');
 });
 it('preserves unlinked historic activity with explicit no saved goal',async()=>{
  await mount({activities:[activity({goalKey:undefined})],goals:[goal()]});
  expect(get('home-calendar-item')).toBeTruthy();
  expect(output()).toContain('No saved goal link');
 });
 it('keeps an empty read-only plan within its own center-local calendar',async()=>{
  await mount({activities:[],goals:[],timezone:'Asia/Dubai'});
  expect(get('home-calendar-no-schedules')).toBeTruthy();
  expect(find('home-calendar-item')).toHaveLength(0);
  expect(output()).toContain('no timezone conversion');
 });
});
