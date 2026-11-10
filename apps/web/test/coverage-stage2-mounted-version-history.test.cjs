// Stage 2: real immutable plan-version inspection and comparison; only
// visualization sidecars are isolated. No clinical sign-off or network writes.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/clinical/GoalCheckpointComparison',()=>({
 GoalCheckpointComparison:()=>h('aside',null,'Synthetic checkpoint comparison sidecar')}));
jest.mock('@/components/clinical/HomePracticeCalendar',()=>({
 HomePracticeCalendar:()=>h('aside',null,'Synthetic practice calendar sidecar')}));
jest.mock('@/components/clinical/SavedHomePlanPreview',()=>({
 SavedHomePlanPreview:()=>h('aside',null,'Synthetic frozen preview sidecar')}));
const {PlanVersionHistory}=require('../src/components/clinical/PlanVersionHistory');
const snapshot={title:'Frozen activity from saved plan',service:'speech',
 ageBand:'6-8',minutes:18,materials:['paper'],steps:['Practice together'],
 safety:['Adult supervision']};
const activity=(extra={})=>({templateId:'template-1',frequency:'2 times weekly',
 goalKey:'g1',durationMinutes:25,note:'Synthetic instructions',snapshot,...extra});
const goal=(more={})=>({key:'g1',title:'Synthetic expressive language',
 measure:'count',baseline:1,target:5,horizon:'SHORT_TERM',targetOn:'2030-03-01',
 reviewOn:'2030-02-01',...more});
const version=(number,more={})=>({id:'version-'+number,number,version:number,
 status:number===2?'DRAFT':'SUPERSEDED',author:'Fictional clinician',
 updatedAt:'2026-11-10T12:00:00Z',summary:'Saved synthetic summary '+number,
 goals:[goal()],homeActivities:[activity()],reviewNotes:[],goalCheckpoints:[],
 ...more});
const plan=(versions=[version(2),version(1)],more={})=>({
 id:'plan-a',title:'Synthetic speech plan',service:'speech',versions,...more});
const templates=[{id:'template-1',service:'speech',title:'Changed mutable library title',
 minutes:50,materials:[],steps:[],safety:[]}];
let tree;
const render=async(p=plan(),target)=>act(async()=>{tree=create(h(PlanVersionHistory,{
 plan:p,templates,timezone:'Asia/Dubai',target
 }));});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>get(id).props.onClick());
const select=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const html=()=>JSON.stringify(tree.toJSON());
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real immutable plan version history and source provenance',()=>{
 it('does not fabricate history for a single version',async()=>{
  await render(plan([version(1)]));
  expect(tree.toJSON()).toBe(null);
  expect(find('plan-history-comparison')).toHaveLength(0);
 });
 it('sorts saved version order without mutating source and defaults to previous snapshot',async()=>{
  const p=plan([version(1),version(2)]);
  await render(p);
  expect(get('plan-history-list')).toBeTruthy();
  expect(get('plan-history-select-2')).toBeTruthy();
  expect(get('plan-history-inspection')).toBeTruthy();
  expect(html()).toContain('Saved synthetic summary 1');
  expect(p.versions[0].number).toBe(1);
  expect(html()).toContain('read-only drafts');
 });
 it('shows frozen saved activity title, timing, safety and clinician note rather than mutated library title',async()=>{
  await render();
  expect(html()).toContain('Frozen activity from saved plan');
  expect(html()).toContain('Plan-specific duration: 25 minutes');
  expect(html()).toContain('Adult supervision');
  expect(html()).toContain('Synthetic instructions');
  expect(html()).toContain('Saved activity definition');
  expect(html()).not.toContain('Legacy draft: title from current library');
 });
 it('opens a selected historical version with exact goal and recorded audit note',async()=>{
  await render(plan([version(2),version(1,{
   summary:'Historic-only evidence',
   reviewNotes:[{at:'2026-11-09',comment:'Returned for synthetic revision'}]
  })]));
  await click('plan-history-select-2');
  expect(html()).toContain('Saved synthetic summary 2');
  expect(html()).not.toContain('Historic-only evidence');
  await click('plan-history-select-1');
  expect(html()).toContain('Historic-only evidence');
  expect(html()).toContain('Returned for synthetic revision');
  expect(get('plan-history-goal-g1')).toBeTruthy();
 });
 it('compares changed goal definitions but never treats them as improvement',async()=>{
  await render(plan([version(2,{goals:[goal({target:8,title:'Changed synthetic goal'})],
   summary:'New summary'}),version(1)]));
  expect(get('plan-history-comparison')).toBeTruthy();
  expect(html()).toContain('Goal definition changed');
  expect(html()).toContain('not an outcome or improvement score');
  expect(get('goal-definition-warning')).toBeTruthy();
  await select('plan-compare-before','version-2');
  expect(find('plan-history-comparison')).toHaveLength(0);
  expect(html()).toContain('Choose two different versions');
 });
 it('flags legacy current-library definitions clearly without treating them as frozen source',async()=>{
  await render(plan([version(2),version(1,{
   homeActivities:[activity({snapshot:undefined,durationMinutes:undefined,note:undefined})]
  })]));
  expect(html()).toContain('Legacy draft: title from current library');
  expect(html()).toContain('Changed mutable library title');
  expect(html()).toContain('No plan-specific duration');
  expect(html()).toContain('not a frozen snapshot');
 });
 it('reports removed or newly-added activities without inferred approval',async()=>{
  await render(plan([version(2,{
    homeActivities:[activity(),{...activity({templateId:'missing',snapshot:undefined,goalKey:'g2'})}]
  }),version(1,{homeActivities:[]})]));
  expect(html()).toContain('Historic activity (template unavailable)');
  expect(html()).toContain('Added');
  expect(html()).toContain('not an outcome or improvement score');
  expect(html()).not.toContain('Approved and released');
 });
});
