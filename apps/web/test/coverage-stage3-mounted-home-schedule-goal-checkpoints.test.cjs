// Stage 3: real home cadence and internal clinician checkpoints. No browser
// notifications, booking, clinical sign-off or guardian release are implied.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/clinical/GoalCheckpointComparison',()=>({
 GoalCheckpointComparison:()=>h('aside',null,'Immutable synthetic comparisons')}));
jest.mock('@/lib/clinical',()=>{
 const a=jest.requireActual('@/lib/clinical');
 return {...a,clinicalApi:{...a.clinicalApi,goalCheckpoint:jest.fn()}};
});
const {clinicalApi}=require('../src/lib/clinical');
const {HomeScheduleFields}=require('../src/components/clinical/HomeScheduleFields');
const {GoalCheckpointPanel}=require('../src/components/clinical/GoalCheckpointPanel');
const goal=(extra={})=>({
 key:'goal-a',title:'Fictional speech goal',measure:'count',
 baseline:1,target:5,...extra
});
const version=(extra={})=>({
 id:'version-a',number:3,version:7,status:'DRAFT',goals:[goal()],
 homeActivities:[],goalCheckpoints:[],...extra
});
const observations=[{id:'observation-a',goalKey:'goal-a',
 planVersionId:'version-a',observedOn:'2026-11-09',value:2},
 {id:'wrong-version',goalKey:'goal-a',planVersionId:'version-old',
 observedOn:'2026-11-08',value:4},
 {id:'wrong-goal',goalKey:'other',planVersionId:'version-a',
 observedOn:'2026-11-09',value:3}];
let tree,changed,run;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const mountSchedule=async(schedule,disabled=false)=>act(async()=>{tree=create(
 h(HomeScheduleFields,{schedule,disabled,index:0,onChange:changed}));});
const mountCheckpoint=async(extra={})=>act(async()=>{tree=create(h(GoalCheckpointPanel,{
 centerId:'center-a',version:version(),ws:{timezone:'Asia/Dubai',observations},
 editable:true,unsavedPlanEdits:false,run,...extra
}));});
beforeEach(()=>{
 jest.clearAllMocks();changed=jest.fn();run=jest.fn(async fn=>{await fn();return true;});
 clinicalApi.goalCheckpoint.mockReset();
 clinicalApi.goalCheckpoint.mockResolvedValue({version:8});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real home draft schedule controls and invalid calendar guards',()=>{
 it('shows legacy free text without creating hidden dated schedule',async()=>{
  await mountSchedule(undefined);
  expect(get('activity-schedule-0')).toBeTruthy();
  expect(find('activity-schedule-preview-0')).toHaveLength(0);
  expect(find('activity-schedule-start-0')).toHaveLength(0);
 });
 it('switches cadence into a fresh weekly schedule with empty dates and days',async()=>{
  await mountSchedule(undefined);
  await change('activity-schedule-cadence-0','WEEKLY');
  expect(changed).toHaveBeenCalledWith({
   cadence:'WEEKLY',startsOn:'',endsOn:'',weekdays:[]
  });
 });
 it('selects and removes weekly weekdays without losing other saved dates',async()=>{
  const schedule={cadence:'WEEKLY',startsOn:'2026-11-09',
   endsOn:'2026-12-09',weekdays:[1,3]};
  await mountSchedule(schedule);
  const days=get('activity-schedule-weekdays-0').findAllByType('input');
  await act(async()=>days[5].props.onChange({target:{checked:true}}));
  expect(changed).toHaveBeenCalledWith({...schedule,weekdays:[1,3,5]});
  await act(async()=>days[1].props.onChange({target:{checked:false}}));
  expect(changed).toHaveBeenCalledWith({...schedule,weekdays:[3]});
 });
 it('shows deterministic dates for valid weekly planning but never says family-visible',async()=>{
  await mountSchedule({cadence:'WEEKLY',startsOn:'2026-11-09',
   endsOn:'2026-12-09',weekdays:[1,3]});
  expect(get('activity-schedule-preview-0')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('2026-11');
  expect(JSON.stringify(tree.toJSON())).toContain('do not create bookings');
 });
 it('blocks invalid date spans instead of silently scheduling nonexistent tasks',async()=>{
  await mountSchedule({cadence:'MONTHLY',startsOn:'2026-12-31',
   endsOn:'2026-11-01',monthDay:31});
  expect(get('activity-schedule-error-0')).toBeTruthy();
  expect(find('activity-schedule-preview-0')).toHaveLength(0);
 });
 it('changes monthly date and 31st-day preference while preserving cadence',async()=>{
  const schedule={cadence:'MONTHLY',startsOn:'2026-11-01',endsOn:'2027-01-31',monthDay:15};
  await mountSchedule(schedule);
  await change('activity-schedule-monthday-0','31');
  expect(changed).toHaveBeenCalledWith({...schedule,monthDay:31});
  await change('activity-schedule-start-0','2026-11-11');
  expect(changed).toHaveBeenCalledWith({...schedule,startsOn:'2026-11-11'});
 });
 it('removes legacy or dated schedule only with explicit cadence clear',async()=>{
  await mountSchedule({cadence:'MONTHLY',startsOn:'2026-11-01',
   endsOn:'2026-12-01',monthDay:1});
  await change('activity-schedule-cadence-0','');
  expect(changed).toHaveBeenCalledWith(undefined);
 });
 it('disables all schedule edits for read-only clinician records',async()=>{
  await mountSchedule({cadence:'MONTHLY',startsOn:'2026-11-01',
   endsOn:'2026-12-01',monthDay:1},true);
  expect(get('activity-schedule-cadence-0').props.disabled).toBe(true);
  expect(get('activity-schedule-start-0').props.disabled).toBe(true);
 });
});
describe('real plan-version-specific clinician goal checkpoint safeguards',()=>{
 it('requires explicit goal and enough narrative, without inferring outcome',async()=>{
  await mountCheckpoint();
  expect(get('goal-checkpoint-empty')).toBeTruthy();
  expect(get('goal-checkpoint-save').props.disabled).toBe(true);
  await change('goal-checkpoint-goal','goal-a');
  await change('goal-checkpoint-summary','short');
  expect(get('goal-checkpoint-save').props.disabled).toBe(true);
  expect(clinicalApi.goalCheckpoint).not.toHaveBeenCalled();
 });
 it('filters observation references to exact plan version and goal key',async()=>{
  await mountCheckpoint();await change('goal-checkpoint-goal','goal-a');
  const labels=get('goal-checkpoint-sources').findAllByType('input');
  expect(labels).toHaveLength(1);
  expect(JSON.stringify(tree.toJSON())).toContain('observation-a');
  expect(JSON.stringify(tree.toJSON())).not.toContain('wrong-version');
  expect(JSON.stringify(tree.toJSON())).not.toContain('wrong-goal');
 });
 it('records the exact versioned goal, date and selected observation IDs',async()=>{
  await mountCheckpoint();
  await change('goal-checkpoint-goal','goal-a');
  await change('goal-checkpoint-date','2026-11-10');
  await change('goal-checkpoint-summary','  Reviewed fictional observations and plans  ');
  const checkbox=get('goal-checkpoint-sources').findAllByType('input')[0];
  await act(async()=>checkbox.props.onChange({target:{checked:true}}));
  await click('goal-checkpoint-save');
  expect(clinicalApi.goalCheckpoint).toHaveBeenCalledWith('center-a','version-a',{
   goalKey:'goal-a',reviewedOn:'2026-11-10',
   summary:'Reviewed fictional observations and plans',
   observationIds:['observation-a'],version:7
  });
  expect(run).toHaveBeenCalledWith(expect.any(Function),
   'Internal goal review checkpoint recorded. This is not a clinical approval.');
  expect(get('goal-checkpoint-summary').props.value).toBe('');
 });
 it('locks review recording when unsaved plan draft could be overwritten by reload',async()=>{
  await mountCheckpoint({unsavedPlanEdits:true});
  expect(get('goal-checkpoint-unsaved-lock')).toBeTruthy();
  expect(get('goal-checkpoint-save').props.disabled).toBe(true);
 });
 it('does not allow read-only clinician to create goal checkpoints',async()=>{
  await mountCheckpoint({editable:false});
  expect(find('goal-checkpoint-save')).toHaveLength(0);
  expect(get('goal-checkpoint-panel')).toBeTruthy();
 });
 it('renders historical internal reviews with explicit evidence counts but no approval',async()=>{
  await mountCheckpoint({version:version({goalCheckpoints:[{
   at:'2026-11-11T09:00:00Z',reviewedOn:'2026-11-11',
   goalKey:'goal-a',summary:'Fictional clinician statement',
   observationIds:['observation-a']
  }]})});
  expect(get('goal-checkpoint-history')).toBeTruthy();
  expect(get('goal-checkpoint-record-0')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('Fictional clinician statement');
  expect(JSON.stringify(tree.toJSON())).toContain('not verified or approved');
 });
 it('prevents saving an invalid checkpoint after review date was cleared',async()=>{
  await mountCheckpoint();
  await change('goal-checkpoint-goal','goal-a');
  await change('goal-checkpoint-summary','Synthetic reviewed observation');
  await change('goal-checkpoint-date','');
  expect(get('goal-checkpoint-save').props.disabled).toBe(true);
  expect(clinicalApi.goalCheckpoint).not.toHaveBeenCalled();
 });
});
