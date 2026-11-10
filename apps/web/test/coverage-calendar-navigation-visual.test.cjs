// M4-08: real scheduling/visualization source executed with fictional data.
// Calendar slots are read-only if not explicitly enabled. No clinical inference.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
const render=(Component,props)=>renderToStaticMarkup(h(Component,props));
const {setCenterTz}=require('../src/lib/operations');
const {CalendarGrid,weekOf,dayTitle}=require('../src/components/operations/Calendar');
const {RepeatFields}=require('../src/components/operations/RepeatFields');
const {GoalChart}=require('../src/components/clinical/GoalChart');
const {navigateTabs}=require('../src/lib/a11y-tabs');
beforeAll(()=>setCenterTz('Asia/Dubai'));
afterAll(()=>setCenterTz(undefined));
const visit=(id,start,end,override={})=>({
 id,startsAt:start,endsAt:end,child:'Alex',
 childFull:'Synthetic Alex',therapist:'Fictional Clinician',
 status:'SCHEDULED',service:'speech',seriesId:null,...override
});

describe('M4-08 clinic date and timeline projection',()=>{
 it('creates a Monday-first calendar across week/month boundaries',()=>{
  expect(weekOf('2026-11-01')).toEqual([
   '2026-10-26','2026-10-27','2026-10-28','2026-10-29',
   '2026-10-30','2026-10-31','2026-11-01'
  ]);
  expect(weekOf('2026-11-10')[0]).toBe('2026-11-09');
  expect(dayTitle('2026-11-10',{weekday:'long',month:'long',day:'numeric'})).toContain('10');
 });
 it('renders two genuinely overlapping visits as separate lanes and correct statuses',()=>{
  const days=['2026-11-10'];
  const visits=[
   visit('a','2026-11-10T06:00:00.000Z','2026-11-10T07:00:00.000Z'),
   visit('b','2026-11-10T06:30:00.000Z','2026-11-10T07:30:00.000Z',
     {status:'CANCELLED',seriesId:'synthetic-series'}),
  ];
  const out=render(CalendarGrid,{days,items:visits,onOpen:()=>{}});
  expect(out).toContain('data-testid="calendar-grid"');
  expect(out).toContain('data-testid="calendar-appt-a"');
  expect(out).toContain('data-testid="calendar-appt-b"');
  expect(out).toContain('calc(50% - 4px)');
  expect(out).toContain('line-through');
  expect(out).toContain('↻');
  expect(out).toContain('Synthetic Alex');
  expect(out).not.toContain('fake-patient-not-authorized');
 });
 it('disables empty time slots in read-only schedule but enables explicit booking actions',()=>{
  const props={days:['2026-11-10'],items:[],onOpen:()=>{}};
  const readonly=render(CalendarGrid,props);
  expect(readonly).toContain('data-testid="calendar-slot-2026-11-10-7"');
  expect(readonly).toContain('disabled=""');
  const enabled=render(CalendarGrid,{...props,onSlot:()=>{}});
  expect(enabled).toContain('aria-label="Book');
  expect(enabled).not.toContain('disabled=""');
 });
});

describe('M4-08 recurrence controls preserve explicit mode and accessible state',()=>{
 const value={mode:'weekly',weekdays:[1,3],end:'count',count:'8',until:''};
 it('labels selected weekdays and does not render date end when count chosen',()=>{
  const out=render(RepeatFields,{value,onChange:()=>{}});
  expect(out).toContain('data-testid="book-weekday-1"');
  expect(out).toContain('aria-pressed="true"');
  expect(out).toContain('data-testid="book-repeat-count"');
  expect(out).not.toContain('data-testid="book-repeat-until"');
 });
 it('keeps non-repeating forms free of recurrence-specific controls',()=>{
  const out=render(RepeatFields,{value:{...value,mode:'none'},onChange:()=>{}});
  expect(out).toContain('data-testid="book-repeat-select"');
  expect(out).not.toContain('data-testid="book-weekday-1"');
  expect(out).not.toContain('data-testid="book-repeat-count"');
 });
 it('uses end date rather than count for until-based recurrence',()=>{
  const out=render(RepeatFields,{value:{...value,end:'until',until:'2026-12-01'},onChange:()=>{}});
  expect(out).toContain('data-testid="book-repeat-until"');
  expect(out).not.toContain('data-testid="book-repeat-count"');
 });
});

describe('M4-08 WAI-ARIA keyboard tab interactions execute real application helper',()=>{
 const tabs=()=>Array.from({length:3},(_,i)=>({
  index:i,focus:jest.fn(),click:jest.fn()
 }));
 const send=(key,which=1)=>{
  const choices=tabs();const preventDefault=jest.fn();
  navigateTabs({key,target:choices[which],currentTarget:{
   querySelectorAll:()=>choices},preventDefault});
  return {choices,preventDefault};
 };
 it.each([['ArrowRight',2],['ArrowLeft',0],['Home',0],['End',2]])(
  '%s focuses and clicks its actual tab handler',(key,target)=>{
   const {choices,preventDefault}=send(key);
   expect(preventDefault).toHaveBeenCalledTimes(1);
   expect(choices[target].focus).toHaveBeenCalledTimes(1);
   expect(choices[target].click).toHaveBeenCalledTimes(1);
  });
 it('wraps navigation and never runs handlers for unrelated keys',()=>{
  expect(send('ArrowLeft',0).choices[2].click).toHaveBeenCalled();
  expect(send('ArrowRight',2).choices[0].click).toHaveBeenCalled();
  const other=send('Escape');
  expect(other.preventDefault).not.toHaveBeenCalled();
  expect(other.choices.every(t=>t.click.mock.calls.length===0)).toBe(true);
 });
});

describe('M4-08 recorded clinical chart accessibility and source truth',()=>{
 const props={baseline:1,target:5,measure:'count',from:'2026-11-01',
  to:'2026-11-30',testId:'synthetic-chart'};
 it('shows no fabricated measurement when no observations exist',()=>{
  const out=render(GoalChart,{...props,points:[]});
  expect(out).toContain('No values recorded between');
  expect(out).not.toContain('<circle');
  expect(out).not.toContain('<polyline');
  expect(out).not.toContain('Recorded observations</caption>');
 });
 it('renders only supplied values with an accessible text table and no trend extrapolation',()=>{
  const out=render(GoalChart,{...props,points:[
   {date:'2026-11-09',value:2,observationId:'o1'},
   {date:'2026-11-10',value:3,observationId:'o2'}]});
  expect(out).toContain('Recorded observations');
  expect(out).toContain('<polyline');
  expect(out).toContain('2 on 2026-11-09');
  expect(out).toContain('3 on 2026-11-10');
  expect(out).toContain('aria-label=');
 });
 it('distinguishes family visual variant from clinician presentation',()=>{
  const out=render(GoalChart,{...props,points:[{date:'2026-11-10',value:30}],measure:'percent',tone:'family'});
  expect(out).toContain('text-fam-accent');
  expect(out).toContain('Recorded observations');
  expect(out).not.toContain('<polyline');
 });
});
