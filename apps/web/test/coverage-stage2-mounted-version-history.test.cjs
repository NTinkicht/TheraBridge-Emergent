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

 it('does not invent a version-comparison panel when no saved versions exist',async()=>{
  await render(plan([]));
  expect(tree.toJSON()).toBeNull();
  expect(find('plan-history-list')).toHaveLength(0);
 });
 it('shows all frozen, returned, withdrawn and under-review states as internal only',async()=>{
  await render(plan([
   version(4,{status:'FROZEN_INTERNAL'}),
   version(3,{status:'RETURNED_FOR_REVISION'}),
   version(2,{status:'WITHDRAWN'}),
   version(1,{status:'IN_REVIEW'})
  ]));
  expect(html()).toContain('Frozen internal (not approved)');
  expect(html()).toContain('Returned for revision');
  expect(html()).toContain('Withdrawn');
  expect(html()).toContain('In review');
  expect(html()).toContain('never approved or released');
 });
 it('does not fabricate goals or activities on an empty historical version',async()=>{
  await render(plan([version(2),version(1,{summary:'',goals:[],homeActivities:[]})]));
  expect(html()).toContain('No goals recorded');
  expect(html()).toContain('No draft activities recorded');
  expect(html()).toContain('No summary recorded');
  expect(find('plan-history-goal-g1')).toHaveLength(0);
 });
 it('renders long-term and uncategorized goal definitions distinctly',async()=>{
  await render(plan([version(2),version(1,{goals:[
   goal({key:'g-long',title:'Fictional long-term',horizon:'LONG_TERM'}),
   goal({key:'g-uncategorized',title:'Fictional uncategorized',horizon:undefined,targetOn:undefined,reviewOn:undefined})
  ]})]));
  expect(get('plan-history-goal-g-long')).toBeTruthy();
  expect(get('plan-history-goal-g-uncategorized')).toBeTruthy();
  expect(html()).toContain('Long-term');
  expect(html()).toContain('Uncategorized');
 });
 it('shows immutable clinician checkpoint evidence without promoting it to a signed clinical approval',async()=>{
  await render(plan([version(2),version(1,{goalCheckpoints:[{
   kind:'GOAL_CHECKPOINT',goalKey:'g1',authorId:'fictional-clinician',reviewedOn:'2026-11-10',
   at:'2026-11-10T11:00:00Z',summary:'Fictional progress note',observationIds:['fictional-observation'],
   clinicalAuthorization:false,released:false
  }]})]));
  expect(get('plan-history-checkpoints')).toBeTruthy();
  expect(html()).toContain('Fictional progress note');
  expect(html()).toContain('internal, not approved');
 });
 it('labels missing goal checkpoint source honestly when reference is no longer available',async()=>{
  await render(plan([version(2),version(1,{goals:[],goalCheckpoints:[{
   kind:'GOAL_CHECKPOINT',goalKey:'obsolete-goal',authorId:'fictional-clinician',reviewedOn:'2026-11-10',
   at:'2026-11-10T11:00:00Z',summary:'Fictional',observationIds:[],clinicalAuthorization:false,released:false
  }]})]));
  expect(html()).toContain('obsolete-goal');
  expect(get('plan-history-checkpoints').findAllByType('p').some(n => String(n.props.children?.join?.('') ?? n.props.children).includes('0 explicit source observation(s)'))).toBe(true);
 });
 it('compares both historical directions without combining version-bound outcome data',async()=>{
  await render(plan([version(2,{summary:'New fictional summary',goals:[goal({target:9})]}),version(1,{summary:'Old fictional summary'})]));
  expect(get('plan-history-comparison').findAllByType('p').some(n=>String(n.props.children?.flat?.(Infinity).join('') ?? n.props.children).includes('Version 1 → version 2'))).toBe(true);
  await select('plan-compare-before','version-2');
  await select('plan-compare-after','version-1');
  expect(get('plan-history-comparison').findAllByType('p').some(n=>String(n.props.children?.flat?.(Infinity).join('') ?? n.props.children).includes('Version 2 → version 1'))).toBe(true);
  expect(get('plan-history-comparison')).toBeTruthy();
  expect(html()).toContain('not an outcome or improvement score');
 });
 it('does not declare definition change where the two saved versions are identical',async()=>{
  await render(plan([version(2,{summary:'Same',goals:[goal()],homeActivities:[activity()]}),
   version(1,{summary:'Same',goals:[goal()],homeActivities:[activity()]})]));
  expect(get('plan-history-comparison')).toBeTruthy();
  expect(html()).toContain('Plan summary: ');
  expect(html()).toContain('Unchanged');
  expect(html()).toContain('No goal definition changes');
  expect(html()).toContain('No home activity changes');
  expect(find('goal-definition-warning')).toHaveLength(0);
 });
 it('records a removed home activity without mutating its former saved snapshot',async()=>{
  await render(plan([version(2,{homeActivities:[]}),version(1,{homeActivities:[activity()]})]));
  expect(html()).toContain('Removed');
  expect(html()).toContain('Frozen activity from saved plan');
  expect(html()).toContain('Definition changes only');
 });
 it('preserves an unavailable legacy title and missing duration as explicitly unavailable',async()=>{
  await render(plan([version(2),version(1,{homeActivities:[activity({templateId:'lost-template',snapshot:undefined,note:undefined,durationMinutes:undefined,goalKey:''})]})]));
  expect(html()).toContain('Historic activity (template unavailable)');
  expect(find('plan-history-activity-duration').some(n=>String(n.props.children.flat(Infinity).join('')).includes('Template duration: unavailable'))).toBe(true);
  expect(html()).toContain('No plan-specific duration');
  expect(html()).toContain('Not recorded');
 });
 it('shows an explicit weekly activity schedule only as an internal plan draft',async()=>{
  await render(plan([version(2),version(1,{homeActivities:[activity({
   schedule:{cadence:'WEEKLY',startsOn:'2026-11-09',endsOn:'2026-11-30',weekdays:[1,3,5]}
  })]})]));
  expect(html()).toContain('Planned cadence:');
  expect(html()).toContain('(internal draft only)');
  expect(html()).not.toContain('Ready to send to guardian');
 });
 it('switching inspector version does not mutate previously captured plan source',async()=>{
  const source=plan([version(2),version(1)]);
  const original=JSON.stringify(source);
  await render(source);
  await click('plan-history-select-2');
  await click('plan-history-select-1');
  expect(JSON.stringify(source)).toBe(original);
  expect(get('plan-history-inspection')).toBeTruthy();
 });

});


describe('M4-08 final 90% exact saved version provenance branches',()=>{
 it('missing saved activity title or current library title is explicitly unavailable',async()=>{
  const lost=activity({templateId:'not-in-catalogue',snapshot:undefined,goalKey:undefined,
   note:undefined,durationMinutes:undefined});
  await render(plan([version(2),version(1,{homeActivities:[lost]})]));
  expect(html()).toContain('Historic activity (template unavailable)');
  expect(get('plan-history-activity-duration').children.filter(x=>typeof x==='string').join('')).toContain('Template duration: unavailable');
  expect(html()).toContain('Not recorded');
 });
 it('an activity snapshot with empty materials and safety never borrows newer library metadata',async()=>{
  const saved={...snapshot,materials:[],steps:[],safety:[]};
  await render(plan([version(2),version(1,{homeActivities:[
   activity({snapshot:saved,notes:'Fictional legacy',durationMinutes:undefined})
  ]})]));
  expect(html()).toContain('Saved activity definition');
  expect(html()).toContain('Materials:');
  expect(html()).toContain('None recorded');
  expect(html()).not.toContain('Changed mutable library title');
 });
 it('unchanged goal metadata never suggests an evidence continuity decision',async()=>{
  await render(plan([version(2,{goals:[goal({horizon:undefined})]}),
   version(1,{goals:[goal({horizon:undefined})]})]));
  expect(html()).toContain('No goal definition changes');
  expect(find('goal-definition-warning')).toHaveLength(0);
 });
 it('selected same source versions make the comparison unavailable until distinct IDs are chosen',async()=>{
  await render();
  await select('plan-compare-after','version-1');
  expect(find('plan-history-comparison')).toHaveLength(0);
  await select('plan-compare-after','version-2');
  expect(get('plan-history-comparison')).toBeTruthy();
 });
 it('selected earlier version can be switched repeatedly without mutating current source',async()=>{
  const source=plan([version(2),version(1)]);
  await render(source);
  await click('plan-history-select-2');
  await click('plan-history-select-1');
  await click('plan-history-select-2');
  expect(get('plan-history-inspection')).toBeTruthy();
  expect(JSON.stringify(source)).toContain('Saved synthetic summary 1');
 });
 it('read-only historic goal carries explicit target and next-review dates only from that version',async()=>{
  await render(plan([version(2),version(1,{goals:[goal({
   horizon:'LONG_TERM',targetOn:'2030-01-01',reviewOn:'2029-12-01'
  })]})]));
  expect(html()).toContain('Long-term');
  expect(html()).toContain('2030-01-01');
  expect(html()).toContain('2029-12-01');
 });
 it('saved original step and safety arrays survive later changes in templates',async()=>{
  const old={...snapshot,title:'Original exact saved title',materials:['original-paper'],
   safety:['Original clinician safety'],steps:['Original step']};
  await render(plan([version(2),version(1,{homeActivities:[activity({snapshot:old})]})]));
  expect(html()).toContain('Original exact saved title');
  expect(html()).toContain('Original clinician safety');
  expect(html()).toContain('Original step');
  expect(html()).toContain('original-paper');
 });
 it('review notes can be empty without inventing an identity or supervisor comment',async()=>{
  await render(plan([version(2),version(1,{reviewNotes:[]})]));
  expect(html()).not.toContain('Recorded review notes');
 });
 it('a restored draft status and withdrawn source are both labeled without implied family release',async()=>{
  await render(plan([version(2,{status:'RETURNED_FOR_REVISION'}),
   version(1,{status:'WITHDRAWN'})]));
  expect(html()).toContain('Returned for revision');
  expect(html()).toContain('Withdrawn');
  expect(html()).toContain('Internal, read-only drafts');
 });
});
