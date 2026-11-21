// M4-08: real source-executing clinician/family presentation and reviewer
// boundaries. Synthetic fixtures only. Visualization sidecars are isolated.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
const {renderToStaticMarkup}=require('react-dom/server');
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/clinical/GoalChart',()=>({
 GoalChart:({testId,points})=>h('figure',{'data-testid':testId,'data-count':points.length}),
 STATUS_TEXT:{recorded:'Recorded observations',insufficient:'Not enough data',none:'No data'}
}));
jest.mock('@/components/clinical/ReportStatementTrace',()=>({ReportStatementTrace:()=>h('aside',null,'Saved fictional provenance')}));
jest.mock('@/components/clinical/ReportEvidenceDiff',()=>({ReportEvidenceDiff:()=>h('aside',null,'Source evidence differences')}));
jest.mock('@/lib/reports',()=>{
 const actual=jest.requireActual('@/lib/reports');
 return {...actual,reportsApi:{...actual.reportsApi,version:jest.fn(),comment:jest.fn(),giveBack:jest.fn()}};
});
const {reportsApi}=require('../src/lib/reports');
const {FamilyProgress}=require('../src/components/clinical/FamilyProgress');
const {HomeActivityDetails}=require('../src/components/clinical/HomeActivityDetails');
const {Evidence,Review,HistoryList,Compare}=require('../src/components/clinical/ReportSide');
const goal=(extra={})=>({key:'g1',title:'Fictional progress',measure:'count',baseline:1,target:5,
 status:'recorded',prior:null,points:[{date:'2026-11-10',value:3,observationId:'obs-a'}],
 planVersionId:'fictional-plan-v1',...extra});
const family=(extra={})=>({childName:'Fictional Child',service:'speech',message:'Synthetic parent summary',
 period:{from:'2026-11-01',to:'2026-11-11'},goals:[goal()],released:false,...extra});
const evidence=(extra={})=>({period:{from:'2026-11-01',to:'2026-11-11'},assessments:[],
 plan:{id:'fictional-plan',title:'Fictional plan',versionNumber:2,status:'DRAFT'},
 goals:[goal()],sessions:{drafts:2,completedVisits:1},...extra});
const detail=(extra={})=>({canEdit:false,canReview:false,evidence:evidence(),versions:[],
 report:{id:'report-a',childId:'child-a',childName:'Fictional Child',
 title:'Fictional report',service:'speech',status:'IN_REVIEW',version:3,
 periodStart:'2026-11-01',periodEnd:'2026-11-11',
 sections:{summary:'Synthetic notes'},reviewNotes:[],...extra.report},...extra});
const render=(C,props)=>renderToStaticMarkup(h(C,props));
const out=(C,props)=>render(C,props);
let tree=null,onReload,onError,onCompare,onClose;
const mount=async(C,props)=>act(async()=>{tree=create(h(C,props));});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
beforeEach(()=>{jest.clearAllMocks();onReload=jest.fn(async()=>{});onError=jest.fn();
 onCompare=jest.fn();onClose=jest.fn();reportsApi.comment.mockResolvedValue({});
 reportsApi.giveBack.mockResolvedValue({});reportsApi.version.mockResolvedValue({
  id:'saved-version',number:1,sections:{},evidence:evidence(),createdAt:'2026-11-10T10:00:00Z',author:'Fictional clinician'
 });});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 real family progress preview is always fact-based and unreleased',()=>{
 it('empty family summary and no goals are not replaced with fabricated progress',()=>{
  const html=out(FamilyProgress,{data:family({message:'',goals:[]}),
   banner:h('p',null,'Synthetic preview only'),testId:'family-preview'});
  expect(html).toContain('family-preview-message-empty');
  expect(html).toContain('No goals are in this example yet');
  expect(html).not.toContain('family-preview-goal-0');
 });
 it('one recorded source appears as one factual measurement, not inferred outcome',()=>{
  const html=out(FamilyProgress,{data:family(),banner:null,testId:'family-preview'});
  expect(html).toContain('family-preview-goal-0');
  expect(html).toContain('last check-in 3 on 2026-11-10');
  expect(html).toContain('Synthetic parent summary');
  expect(html).not.toContain('too early to show a change');
 });
 it('insufficient data says explicitly that no change can be shown',()=>{
  const html=out(FamilyProgress,{data:family({goals:[goal({status:'insufficient'})]}),
   banner:null,testId:'family-preview'});
  expect(html).toContain('too early to show a change');
 });
 it('no goal observations renders no latest-value claim',()=>{
  const html=out(FamilyProgress,{data:family({goals:[goal({status:'none',points:[]})]}),
   banner:null,testId:'family-preview'});
  expect(html).toContain('Nothing recorded for this goal');
  expect(html).not.toContain('last check-in');
 });
});
describe('M4-08 real home activity definition discloses exact source and typed internal instruction only',()=>{
 const t={id:'t1',service:'speech',title:'Fictional library exercise',minutes:15,
  ageBand:'6-8',materials:['card'],steps:['Read together'],safety:['Supervise']};
 const snap={...t,title:'Saved historical exercise',minutes:11};
 const props=(activity={},templates=[t],editable=true)=>({
  activity:{templateId:'t1',frequency:'Weekly',...activity},templates,editable,index:0,
  onInstructionsChange:jest.fn(),onDurationChange:jest.fn()
 });
 it('snapshot overrides later mutable library content for safety and duration',()=>{
  const html=out(HomeActivityDetails,props({snapshot:snap,durationMinutes:12,note:'Fictional guidance'}));
  expect(html).toContain('Saved historical exercise');
  expect(html).toContain('Saved activity definition');
  expect(html).toContain('Template remains 11');
  expect(html).not.toContain('Fictional library exercise');
 });
 it('legacy source clearly labels current library evidence as non-frozen',()=>{
  const html=out(HomeActivityDetails,props());
  expect(html).toContain('Current activity-library definition');
  expect(html).toContain('Saving this draft captures');
  expect(html).toContain('Read together');
 });
 it('missing source has no invented safety/duration/steps',()=>{
  const html=out(HomeActivityDetails,props({templateId:'missing'},[]));
  expect(html).toContain('Activity definition unavailable');
  expect(html).toContain('No safety guidance recorded');
  expect(html).toContain('No steps recorded');
  expect(html).toContain('No source duration');
 });
 it('read-only version keeps stored narrative but prevents duration/instruction mutation',async()=>{
  await mount(HomeActivityDetails,props({durationMinutes:30,note:'Fictional existing instructions'},[t],false));
  expect(get('home-activity-duration-override-0').props.disabled).toBe(true);
  expect(get('home-activity-instructions-0').props.disabled).toBe(true);
  expect(get('home-activity-instructions-0').props.value).toBe('Fictional existing instructions');
 });
 it('duration corrections and explicit clear send typed values to caller only',async()=>{
  const p=props({durationMinutes:5},[t]);
  await mount(HomeActivityDetails,p);
  await change('home-activity-duration-override-0','120');
  expect(p.onDurationChange).toHaveBeenCalledWith(120);
  await change('home-activity-duration-override-0','');
  expect(p.onDurationChange).toHaveBeenCalledWith(undefined);
 });
 it('invalid duration is marked before saving without changing template duration',async()=>{
  await mount(HomeActivityDetails,props({durationMinutes:121},[t]));
  expect(get('home-activity-duration-override-0').props['aria-invalid']).toBe(true);
  expect(get('home-activity-duration-0')).toBeTruthy();
 });
 it('typed therapist instructions do not bypass explicit draft save',async()=>{
  const p=props({note:''},[t]);await mount(HomeActivityDetails,p);
  await change('home-activity-instructions-0','Synthetic safety adaptation');
  expect(p.onInstructionsChange).toHaveBeenCalledWith('Synthetic safety adaptation');
 });
 it('empty template material and safety arrays are shown as missing rather than safe defaults',()=>{
  const html=out(HomeActivityDetails,props({snapshot:{...snap,materials:[],steps:[],safety:[]}}));
  expect(html).toContain('No safety guidance recorded');
  expect(html).toContain('No steps recorded');
  expect(html).toContain('None recorded');
 });
});
describe('M4-08 real recorded report evidence never infers clinical validity',()=>{
 it('no plan still keeps exact recorded session count and absence warning',()=>{
  const html=out(Evidence,{d:detail({evidence:evidence({plan:null,goals:[]})})});
  expect(html).toContain('evidence-no-plan');
  expect(html).toContain('2 session drafts');
  expect(html).not.toContain('evidence-goal-g1');
 });
 it('active plan includes exact version deep-link with permission requirement',()=>{
  const html=out(Evidence,{d:detail()});
  expect(html).toContain('evidence-goal-g1');
  expect(html).toContain('plan?version=fictional-plan-v1');
  expect(html).toContain('evidence-open-goal-g1');
  expect(html).toContain('source may be a historical plan version');
 });
 it('legacy evidence without plan version ID never exposes navigable modern plan link',()=>{
  const html=out(Evidence,{d:detail({evidence:evidence({goals:[goal({
   planVersionId:undefined,points:[{date:'2026-11-10',value:3}]
  })]})})});
  expect(html).toContain('Historical evidence snapshot');
  expect(html).not.toContain('evidence-open-goal-g1');
  expect(html).toContain('source ID unavailable');
 });
 it('recorded prior measurement is labeled before period but never combined with current goal',()=>{
  const html=out(Evidence,{d:detail({evidence:evidence({goals:[goal({
   prior:{date:'2026-10-30',value:4,observationId:'earlier'},
   points:[{date:'2026-11-10',value:5,sessionNoteId:'session-a',observationId:'latest'}]
  })]})})});
  expect(html).toContain('before the period: 4');
  expect(html).toContain('Session session-a');
  expect(html).toContain('Observation earlier');
 });
 it('goal with no recorded data has explicit absence and no invented trace rows',()=>{
  const html=out(Evidence,{d:detail({evidence:evidence({goals:[goal({points:[],status:'none'})]})})});
  expect(html).toContain('No recorded observation in this period');
  expect(html).toContain('No data');
 });
});
describe('M4-08 real supervisor review comments enforce validation and exact version',()=>{
 const mountReview=async(d=detail({canReview:true}))=>mount(Review,{centerId:center,d,onReload,onError});
 const center='fictional-center';
 it('supervisor with no history sees empty note state and no invented reviewers',async()=>{
  await mountReview();
  expect(get('review-empty')).toBeTruthy();
  expect(find('review-note-0')).toHaveLength(0);
 });
 it('read-only staff sees reviewer history but cannot send comments',async()=>{
  await mountReview(detail({canReview:false,report:{...detail().report,
   reviewNotes:[{byName:'Fictional supervisor',at:'2026-11-10T08:00:00Z',kind:'returned',comment:'Fictional correction'}]}}));
  expect(get('review-note-0')).toBeTruthy();
  expect(find('review-add-comment')).toHaveLength(0);
  expect(find('review-return')).toHaveLength(0);
 });
 it('empty/short reviewer note is rejected without server mutation',async()=>{
  await mountReview();await change('review-comment',' ab ');
  await click('review-add-comment');
  expect(get('review-error')).toBeTruthy();
  expect(reportsApi.comment).not.toHaveBeenCalled();
 });
 it('reviewer adds an internal comment to exact report version only',async()=>{
  await mountReview();await change('review-comment','  Fictional review correction  ');
  await click('review-add-comment');
  expect(reportsApi.comment).toHaveBeenCalledWith(center,'report-a','Fictional review correction',3);
  expect(reportsApi.giveBack).not.toHaveBeenCalled();
  expect(onReload).toHaveBeenCalledTimes(1);
  expect(get('review-comment').props.value).toBe('');
 });
 it('return for revision is separate from comment and never approves report',async()=>{
  await mountReview();await change('review-comment','  More fictional evidence  ');
  await click('review-return');
  expect(reportsApi.giveBack).toHaveBeenCalledWith(center,'report-a','More fictional evidence',3);
  expect(reportsApi.comment).not.toHaveBeenCalled();
  expect(onReload).toHaveBeenCalledTimes(1);
 });
 it('failed reviewer submission retains typed evidence for retry',async()=>{
  reportsApi.giveBack.mockRejectedValueOnce({status:403,message:'Fictional access changed'});
  await mountReview();await change('review-comment','Fictional unsent feedback');
  await click('review-return');
  expect(get('review-comment').props.value).toBe('Fictional unsent feedback');
  expect(onError).toHaveBeenCalledTimes(1);
  expect(onReload).not.toHaveBeenCalled();
 });
});
describe('M4-08 immutable report history and source comparison',()=>{
 const saved={id:'saved-a',number:1,kind:'SAVED',createdAt:'2026-11-10T10:00:00Z',
  author:'Fictional clinician',sections:{summary:'Fictional old summary'},evidence:evidence()};
 it('unknown legacy version kind is labeled with original kind, no guesswork',()=>{
  const html=out(HistoryList,{centerId:'center-a',d:detail({versions:[{...saved,kind:'ARCHIVED_LEGACY'}]}),
   onCompare,onError});
  expect(html).toContain('ARCHIVED_LEGACY');
 });
 it('clicking history compare fetches exact saved source version',async()=>{
  await mount(HistoryList,{centerId:'center-a',d:detail({versions:[saved]}),onCompare,onError});
  await click('history-compare-1');
  expect(reportsApi.version).toHaveBeenCalledWith('center-a','saved-a');
  expect(onCompare).toHaveBeenCalledTimes(1);
 });
 it('failed saved version read cannot fabricate a comparison',async()=>{
  reportsApi.version.mockRejectedValueOnce({status:404,message:'Fictional unavailable version'});
  await mount(HistoryList,{centerId:'center-a',d:detail({versions:[saved]}),onCompare,onError});
  await click('history-compare-1');
  expect(onCompare).not.toHaveBeenCalled();
 });
 it('same saved and current narrative produces no fake changed section',()=>{
  const html=out(Compare,{v:saved,current:saved.sections,currentEvidence:evidence(),childId:'child-a',onClose});
  expect(html).toContain('No changes since version 1');
  expect(html).toContain('Saved fictional provenance');
 });
 it('changed section displays saved and current literal text without inferred measurement',()=>{
  const html=out(Compare,{v:saved,current:{summary:'Changed clinician-authored draft'},
   currentEvidence:evidence(),childId:'child-a',onClose});
  expect(html).toContain('1 of');
  expect(html).toContain('Fictional old summary');
  expect(html).toContain('Changed clinician-authored draft');
 });
 it('closing comparison invokes caller without changing stored history',async()=>{
  await mount(Compare,{v:saved,current:saved.sections,currentEvidence:evidence(),childId:'child-a',onClose});
  await click('compare-close');
  expect(onClose).toHaveBeenCalledTimes(1);
 });
});
