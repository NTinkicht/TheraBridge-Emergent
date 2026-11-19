// Genuine calendar and clinical timeline edge execution (all records fictional).
// No inferred treatment progress, booking, notification, signatures, or release.
const {isCalendarDay,scheduleProblem,scheduledDays,scheduleDescription,practiceCalendarMonth}=
  require('../src/lib/home-schedule');
const {child360Timeline,filterChild360Timeline}=require('../src/lib/child360-timeline');
const weekly=(overrides={})=>({startsOn:'2026-11-01',endsOn:'2026-11-30',
  cadence:'WEEKLY',weekdays:[1,3],...overrides});
const monthly=(overrides={})=>({startsOn:'2026-01-01',endsOn:'2026-12-31',
  cadence:'MONTHLY',monthDay:31,...overrides});
describe('validated internal recurring practice boundaries',()=>{
 it.each(['2026-02-30','2026-13-01','2026-11-31','1999-12-31','2101-01-01','not-a-day','2026-2-1'])(
   'rejects invalid calendar day %s',d=>expect(isCalendarDay(d)).toBe(false));
 it('accepts a leap-day and first/last supported years',()=>{
  for(const d of ['2024-02-29','2000-01-01','2100-12-31'])
    expect(isCalendarDay(d)).toBe(true);
 });
 it('rejects reversed and over-one-year recurrence bounds',()=>{
  expect(scheduleProblem(weekly({startsOn:'2026-11-30',endsOn:'2026-11-01'})))
    .toContain('end must follow');
  expect(scheduleProblem(monthly({startsOn:'2026-01-01',endsOn:'2027-12-31'})))
    .toContain('within one year');
 });
 it('validates duplicate, missing, fractional and out-of-range weekdays',()=>{
  for(const weekdays of [[],[2,2],[-1],[7],[1.5]])
    expect(scheduleProblem(weekly({weekdays}))).toContain('unique weekday');
  expect(scheduleProblem(weekly({monthDay:4}))).toContain('unique weekday');
 });
 it('rejects monthly weekday mixtures and malformed day selection',()=>{
  for(const monthDay of [0,32,1.3,undefined])
    expect(scheduleProblem(monthly({monthDay}))).toContain('day of the month');
  expect(scheduleProblem(monthly({weekdays:[1]}))).toContain('day of the month');
  expect(scheduleProblem(monthly({cadence:'DAILY'}))).toContain('valid schedule pattern');
 });
 it('requires a real occurrence without shifting the requested monthly day',()=>{
  const feb=monthly({startsOn:'2026-02-01',endsOn:'2026-02-28'});
  expect(scheduleProblem(feb)).toContain('No practice dates');
  expect(scheduledDays(feb)).toEqual([]);
  const shorter=weekly({startsOn:'2026-11-03',endsOn:'2026-11-03',weekdays:[1]});
  expect(scheduleProblem(shorter)).toContain('No practice dates');
 });
 it('bounds sample size, never shifts day 31, and preserves declared recurrence labels',()=>{
  expect(scheduledDays(weekly(),0)).toEqual([]);
  expect(scheduledDays(weekly(),2)).toHaveLength(2);
  expect(scheduledDays(monthly(),40)).not.toContain('2026-02-28');
  expect(scheduleDescription(monthly())).toContain('Monthly on day 31');
  expect(scheduleDescription(weekly())).toContain('Weekly on Mon, Wed');
 });
 it('builds only entries within the selected valid month and valid scheduled activity',()=>{
  const activities=[
    {templateId:'fictional-a',goalKey:'fictional-goal',schedule:weekly()},
    {templateId:'fictional-b',schedule:monthly()},
    {templateId:'fictional-no-schedule'},
    {templateId:'fictional-invalid',schedule:weekly({startsOn:'invalid'})}
  ];
  expect(practiceCalendarMonth(activities,'2026-13')).toEqual([]);
  expect(practiceCalendarMonth(activities,'2099-99')).toEqual([]);
  const entries=practiceCalendarMonth(activities,'2026-11');
  expect(entries.every(e=>e.date.startsWith('2026-11-'))).toBe(true);
  expect(entries.every(e=>e.templateId==='fictional-a')).toBe(true);
  expect(entries.some(e=>e.goalKey==='fictional-goal')).toBe(true);
 });
});
const ws=(extra={})=>({plans:[],notes:[],assessments:[],observations:[],...extra});
describe('Child360 timelines never invent unavailable evidence links',()=>{
 it('omits undated records and does not invent a plan version',()=>{
   expect(child360Timeline(ws({notes:[{id:'n',sessionDate:'bad'}],
     assessments:[{id:'a',assessedOn:null}],
     observations:[{id:'o',observedOn:'bad'}]}))).toEqual([]);
 });
 it('retains unavailable-goal and orphan-version explanations',()=>{
   const events=child360Timeline(ws({plans:[{id:'p',service:'speech',versions:[{
     id:'v1',number:2,status:'DRAFT',updatedAt:'2026-11-01T09:00:00Z',
     goals:[{key:'g1',title:'Fictional objective'}],goalCheckpoints:[]
   }]}],observations:[
     {id:'a',observedOn:'2026-11-04',planVersionId:'v1',goalKey:'absent',value:3},
     {id:'b',observedOn:'2026-11-03',planVersionId:'deleted',goalKey:'g1',value:4}
   ]}));
   expect(events.find(e=>e.id==='observation-a').detail).toContain('Goal link unavailable');
   expect(events.find(e=>e.id==='observation-b').detail).toContain('no attribution inferred');
   expect(filterChild360Timeline(events,'OBSERVATION','speech').map(e=>e.id)).toEqual(['observation-a']);
   expect(filterChild360Timeline(events,'ALL','ALL')).toHaveLength(3);
 });
 it('sorts genuine same-day timestamps and retains clinician-entered review-day distinction',()=>{
   const events=child360Timeline(ws({plans:[{service:'ot',versions:[{
     id:'v1',number:1,status:'DRAFT',updatedAt:'2026-11-02T08:00:00Z',
     goals:[{key:'g1',title:'Fictional plan goal'}],
     goalCheckpoints:[
       {kind:'GOAL_CHECKPOINT',at:'2026-11-02T13:00:00Z',reviewedOn:'2026-11-01',goalKey:'g1'},
       {kind:'GOAL_CHECKPOINT',at:'2026-11-02T11:00:00Z',reviewedOn:'2026-11-03',goalKey:'missing'},
       {kind:'OTHER',at:'2026-11-02T15:00:00Z',goalKey:'g1'},
       {kind:'GOAL_CHECKPOINT',at:'invalid',reviewedOn:'2026-11-01',goalKey:'g1'}
     ]
   }]}]}));
   expect(events[0].recordedAt).toBe('2026-11-02T13:00:00Z');
   expect(events[1].detail).toContain('Goal link unavailable');
   expect(events).toHaveLength(3);
   expect(filterChild360Timeline(events,'GOAL_REVIEW','ot')).toHaveLength(2);
 });
 it('distinguishes completed unsigned sessions from drafts and matches specialty',()=>{
   const events=child360Timeline(ws({notes:[
     {id:'a',sessionDate:'2026-11-10',service:'speech',executionStatus:'COMPLETED'},
     {id:'b',sessionDate:'2026-11-11',service:'ot',executionStatus:'IN_PROGRESS'}
   ],assessments:[{id:'c',assessedOn:'2026-11-12',service:'speech'}]}));
   expect(events.find(e=>e.id==='session-a').detail).toContain('unsigned');
   expect(events.find(e=>e.id==='session-b').detail).toContain('draft');
   expect(filterChild360Timeline(events,'SESSION','speech')).toHaveLength(1);
   expect(filterChild360Timeline(events,'ASSESSMENT','ALL')).toHaveLength(1);
 });
});
