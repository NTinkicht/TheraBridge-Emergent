// M4-08: MOUNTED React behavior (not SSR-only), real component source and
// real React hooks with synthetic API boundaries. Never grants clinical release.
const React=require('react');
const Renderer=require('react-test-renderer');
const {act,create}=Renderer;
const h=React.createElement;
const push=jest.fn();
jest.mock('next/navigation',()=>({useRouter:()=>({push,replace:jest.fn(),refresh:jest.fn()}),
 usePathname:()=>'/app',useSearchParams:()=>new URLSearchParams()}));
jest.mock('@/lib/reports',()=>{
 const real=jest.requireActual('@/lib/reports');
 return {...real,reportsApi:{...real.reportsApi,version:jest.fn(),createPlanDraft:jest.fn()}};
});
const {reportsApi}=require('../src/lib/reports');
const {ReportToPlanHandoff}=require('../src/components/clinical/ReportToPlanHandoff');
const {GoalCheckpointComparison}=require('../src/components/clinical/GoalCheckpointComparison');
const goal=(extra={})=>({key:'g1',planVersionId:'plan-v1',title:'Synthetic goal',
 measure:'count',baseline:1,target:5,status:'recorded',prior:null,points:[],...extra});
const detail=()=>({
 synthetic:true,released:false,locked:'Clinical release unavailable',canEdit:true,
 report:{id:'report-1',title:'Fictional report',childId:'fake-child',service:'speech',version:5},
 versions:[{id:'source-version-1',number:1,kind:'SAVED',
   createdAt:'2026-11-10T09:00:00Z',author:'Fictional Clinician'}]
});
const snapshot=()=>({
 id:'source-version-1',number:1,kind:'SAVED',sections:{},author:'Fictional Clinician',
 createdAt:'2026-11-10T09:00:00Z',
 evidence:{period:{from:'2026-11-01',to:'2026-11-30'},assessments:[],
  plan:null,sessions:{drafts:0,completedVisits:0},goals:[goal()]}
});
const use=(tree,testId)=>tree.root.findByProps({'data-testid':testId});
const click=async(tree,testId)=>act(async()=>{use(tree,testId).props.onClick()});
const selectGoal=async(tree)=>act(async()=>{
 use(tree,'report-to-plan-goal-0').props.onChange({target:{checked:true}});
});
let tree=null;
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}jest.clearAllMocks();});
async function mountedHandoff(prepare){
 reportsApi.version.mockResolvedValue(snapshot());
 await act(async()=>{tree=create(h(ReportToPlanHandoff,{centerId:'center-1',
  detail:detail(),prepare}));});
 await click(tree,'report-to-plan-toggle');
 await act(async()=>{await Promise.resolve();});
 expect(reportsApi.version).toHaveBeenCalledWith('center-1','source-version-1');
 expect(use(tree,'report-to-plan-goal-0').props.checked).toBe(false);
 await selectGoal(tree);
 expect(use(tree,'report-to-plan-goal-0').props.checked).toBe(true);
}
describe('M4-08 real mounted report-to-plan source snapshot workflow',()=>{
 it('creates a draft only with explicit opt-in, after editor lease, and uses exact IDs',async()=>{
  const release=jest.fn();
  const prepare=jest.fn().mockResolvedValue({revision:6,release});
  await mountedHandoff(prepare);
  reportsApi.createPlanDraft.mockResolvedValue({
   id:'synthetic-plan',versionId:'pv1',reused:false,released:false});
  await click(tree,'report-to-plan-create');
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(reportsApi.createPlanDraft).toHaveBeenCalledTimes(1);
  const [centerId,reportId,body]=reportsApi.createPlanDraft.mock.calls[0];
  expect([centerId,reportId]).toEqual(['center-1','report-1']);
  expect(body).toMatchObject({sourceReportVersionId:'source-version-1',reportRevision:6,
   selectedGoals:[{planVersionId:'plan-v1',goalKey:'g1'}]});
  expect(typeof body.requestId).toBe('string');
  expect(use(tree,'report-to-plan-completed')).toBeTruthy();
  expect(push).toHaveBeenCalledWith('/app/clinical/fake-child#plan');
  expect(release).not.toHaveBeenCalled();
  await click(tree,'report-to-plan-resume-report');
  expect(release).toHaveBeenCalledTimes(1);
 });
 it('retries uncertain network response with unchanged idempotency key and no second lease',async()=>{
  const release=jest.fn();
  const prepare=jest.fn().mockResolvedValue({revision:7,release});
  await mountedHandoff(prepare);
  reportsApi.createPlanDraft
   .mockRejectedValueOnce(new Error('Synthetic network uncertainty'))
   .mockResolvedValueOnce({id:'recovered-plan',versionId:'v2',reused:true,released:false});
  await click(tree,'report-to-plan-create');
  expect(use(tree,'report-to-plan-error').props.children).toMatch(/same request/);
  const first=reportsApi.createPlanDraft.mock.calls[0][2];
  expect(use(tree,'report-to-plan-create').props.children).toBe('Retry same request');
  await click(tree,'report-to-plan-create');
  expect(reportsApi.createPlanDraft).toHaveBeenCalledTimes(2);
  expect(reportsApi.createPlanDraft.mock.calls[1][2]).toEqual(first);
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(use(tree,'report-to-plan-completed')).toBeTruthy();
  expect(release).not.toHaveBeenCalled();
 });
});
describe('M4-08 mounted clinician checkpoint selector invalid order enforcement',()=>{
 const checkpoint=(at,ids,goalKey='g1')=>({
  kind:'GOAL_CHECKPOINT',goalKey,at,reviewedOn:'2026-11-10',
  summary:'Fictional clinician review',authorId:'fake',
  observationIds:ids,clinicalAuthorization:false,released:false});
 const version=()=>({
  id:'plan-v1',number:1,status:'DRAFT',goals:[
   {key:'g1',title:'Fictional goal',baseline:1,target:5,measure:'count'}],
  goalCheckpoints:[
   checkpoint('2026-11-09T10:00:00Z',['a','b']),
   checkpoint('2026-11-10T10:00:00Z',['b','c'])
  ]});
 it('rejects inverted checkpoint selection and restores source-only comparison',async()=>{
  await act(async()=>{tree=create(h(GoalCheckpointComparison,{version:version()}));});
  expect(use(tree,'checkpoint-compare-notes')).toBeTruthy();
  await act(async()=>{use(tree,'checkpoint-compare-earlier').props.onChange({
   target:{value:'1'}});});
  expect(use(tree,'checkpoint-compare-selection-warning')).toBeTruthy();
  await act(async()=>{use(tree,'checkpoint-compare-earlier').props.onChange({
   target:{value:'0'}});});
  expect(use(tree,'checkpoint-compare-sources')).toBeTruthy();
  const body=JSON.stringify(tree.toJSON());
  expect(body).toContain('Only in later review');
  expect(body).toContain('not clinical outcome');
 });
});
