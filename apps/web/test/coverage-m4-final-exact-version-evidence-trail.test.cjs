// M4-08: exact-version evidence trace is a staff-only read projection.
// Mount the actual production component; all source records are fictional.
// Counts are not progress, approval, guardian release or clinical effectiveness.
const React=require('react'), Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
const {PlanEvidenceTrail}=require('../src/components/clinical/PlanEvidenceTrail');
const goal=(key='goal-a',extra={})=>({key,title:'Fictional '+key,measure:'count',
 baseline:2,target:7,...extra});
const version=(extra={})=>({id:'plan-version-2',number:2,status:'DRAFT',
 goals:[goal()],...extra});
const observation=(extra={})=>({
 id:'observation-a',planVersionId:'plan-version-2',goalKey:'goal-a',
 observedOn:'2026-11-09',value:3,author:'Fictional clinician',
 note:'Fictional observed task',sessionNoteId:'fictional-session',...extra
});
const origin=(extra={})=>({
 reportTitle:'Synthetic source report',reportVersionNumber:3,reportId:'source-report-a',
 draftedAt:'2026-11-09T09:00:00Z',originalPlanVersionId:'plan-version-2',
 selectedGoals:[{planGoalKey:'goal-a',sourceGoalKey:'report-goal-a',
 sourcePlanVersionId:'report-plan-version-1'}],...extra
});
let tree;
const mount=async(v=version(),observations=[],o)=>act(async()=>{
 tree=create(h(PlanEvidenceTrail,{version:v,observations,origin:o}));
});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const html=()=>JSON.stringify(tree.toJSON());
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 real evidence trail never crosses clinical version or report scope',()=>{
 it('manual plan has explicit absent origin rather than fabricating a report link',async()=>{
  await mount();
  expect(get('plan-evidence-trail')).toBeTruthy();
  expect(get('plan-source-none')).toBeTruthy();
  expect(find('plan-source-report')).toHaveLength(0);
  expect(html()).toContain('Manual or legacy drafts do not receive an inferred origin');
 });
 it('empty version displays honest zero goals and no invented observation rows',async()=>{
  await mount(version({goals:[]}),[observation()]);
  expect(html()).toContain('No goals are defined in this version');
  expect(find('plan-evidence-goal-goal-a')).toHaveLength(0);
  expect(html()).toContain('0');
 });
 it('zero matching observations shows explicit absence for the exact plan and goal',async()=>{
  await mount(version(),[observation({planVersionId:'different-version'}),
   observation({goalKey:'different-goal'})]);
  expect(get('plan-evidence-count-goal-a').props.children).toBe(
   'No observations recorded for this goal in this plan version.');
  expect(find('plan-evidence-records-goal-a')).toHaveLength(0);
 });
 it('same key on a different version is never counted as this version evidence',async()=>{
  await mount(version(),[
   observation(),observation({id:'foreign',planVersionId:'prior-plan-version'})
  ]);
  expect(get('plan-evidence-count-goal-a').props.children).toContain('1 observation(s)');
  expect(html()).not.toContain('prior-plan-version');
 });
 it('same version different goal cannot borrow another goal observations',async()=>{
  await mount(version({goals:[goal('goal-a'),goal('goal-b')]}),[observation()]);
  expect(get('plan-evidence-count-goal-a').props.children).toContain('1 observation(s)');
  expect(get('plan-evidence-count-goal-b').props.children).toBe(
   'No observations recorded for this goal in this plan version.');
 });
 it('multiple same-version records remain individually inspectable, ordered by date',async()=>{
  await mount(version(),[
   observation({id:'later',observedOn:'2026-11-10',value:5,sessionNoteId:null,note:''}),
   observation({id:'earlier',observedOn:'2026-11-07',value:2,sessionNoteId:null,note:''})
  ]);
  const details=get('plan-evidence-records-goal-a');
  expect(details).toBeTruthy();
  expect(details.findAllByType('li')).toHaveLength(2);
  expect(html().indexOf('2026-11-07')).toBeLessThan(html().indexOf('2026-11-10'));
  expect(get('plan-evidence-count-goal-a').props.children).toContain('2 observation(s)');
 });
 it('optional author, clinical note and session link are rendered only when recorded',async()=>{
  await mount(version(),[observation()]);
  expect(html()).toContain('Fictional clinician');
  expect(html()).toContain('Fictional observed task');
  expect(html()).toContain('Linked session note on record');
  expect(html()).toContain('Recorded value');
 });
 it('missing optional evidence fields do not invent author or session note',async()=>{
  await mount(version(),[observation({author:null,note:null,sessionNoteId:null})]);
  expect(html()).not.toContain('Fictional clinician');
  expect(html()).not.toContain('Linked session note on record');
  expect(get('plan-evidence-records-goal-a')).toBeTruthy();
 });
 it('original linked report remains a pointer, never a clinical approval',async()=>{
  await mount(version(),[],origin());
  expect(get('plan-source-report')).toBeTruthy();
  expect(get('plan-source-report-open').props.href).toBe('/app/reports/source-report-a');
  expect(html()).toContain('Synthetic source report');
  expect(html()).toContain('Not signed, approved or released');
  expect(get('plan-evidence-source-goal-a')).toBeTruthy();
  expect(html()).toContain('definition reference only');
 });
 it('a later plan version retains source provenance but never reuses old report goal mapping',async()=>{
  await mount(version({id:'later-plan-version',number:4,goals:[goal()]}),[
   observation({planVersionId:'plan-version-2'})
  ],origin());
  expect(get('plan-source-report')).toBeTruthy();
  expect(html()).toContain('original report goal mappings are not assumed to carry forward');
  expect(find('plan-evidence-source-goal-a')).toHaveLength(0);
  expect(find('plan-evidence-records-goal-a')).toHaveLength(0);
 });
 it('unmapped goal in an originating report remains without inferred source',async()=>{
  await mount(version({goals:[goal('goal-a'),goal('goal-b')]}),[],origin());
  expect(get('plan-evidence-source-goal-a')).toBeTruthy();
  expect(find('plan-evidence-source-goal-b')).toHaveLength(0);
 });
 it('an explicit alternate source mapping preserves source goal identity only as an internal pointer',async()=>{
  await mount(version(),[],origin({selectedGoals:[{
   planGoalKey:'goal-a',sourceGoalKey:'report-goal-special',
   sourcePlanVersionId:'report-source-v7'
  }]}));
  const source=get('plan-evidence-source-goal-a');
  expect(source).toBeTruthy();
  expect(html()).toContain('report-goal-special');
  expect(html()).toContain('report-source-v7');
  expect(html()).not.toContain('Clinical approval granted');
 });
});
