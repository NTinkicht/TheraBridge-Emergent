// M4-08 Stage 3: genuine read-only report evidence, supervisor comments
// and immutable saved-version comparisons; mocked transport only.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('@/components/clinical/GoalChart',()=>({
 GoalChart:({testId})=>h('figure',{'data-testid':testId}),
 STATUS_TEXT:{recorded:'recorded observations',insufficient:'insufficient observations',none:'no observations'}
}));
jest.mock('@/components/clinical/ReportStatementTrace',()=>({
 ReportStatementTrace:()=>h('aside',null,'Source-referenced statement trace')}));
jest.mock('@/components/clinical/ReportEvidenceDiff',()=>({
 ReportEvidenceDiff:()=>h('aside',null,'Immutable evidence difference')}));
jest.mock('@/lib/reports',()=>{
 const a=jest.requireActual('@/lib/reports');
 return {...a,reportsApi:{...a.reportsApi,comment:jest.fn(),giveBack:jest.fn(),version:jest.fn()}};
});
const {reportsApi}=require('../src/lib/reports');
const {Evidence,Review,HistoryList,Compare}=require('../src/components/clinical/ReportSide');
const baseEvidence=(more={})=>({
 period:{from:'2026-11-01',to:'2026-11-30'},
 assessments:[],plan:{id:'plan-a',title:'Fictional plan',versionNumber:3},
 sessions:{drafts:2,completedVisits:4},
 goals:[{key:'goal-a',planVersionId:'version-old',title:'Fictional tracked goal',
 measure:'count',baseline:1,target:5,status:'recorded',
 prior:{date:'2026-10-21',value:2,observationId:'obs-previous'},
 points:[{date:'2026-11-05',value:3,observationId:'obs-a',
 sessionNoteId:'note-a'}]}],...more
});
const report=(more={})=>({
 id:'report-a',childId:'child-a',title:'Fictional report',service:'speech',
 version:4,status:'IN_REVIEW',sections:{summary:'New fictional summary'},
 reviewNotes:[],...more
});
const details=(more={})=>({
 synthetic:true,canReview:true,canEdit:false,locked:'Clinical NO-GO',
 released:false,evidence:baseEvidence(),
 versions:[{id:'saved-a',number:2,kind:'SAVED',author:'Fictional Leila',
 createdAt:'2026-11-10T10:00:00Z'}],
 report:report(),...more
});
const saved=(more={})=>({
 id:'saved-a',number:2,kind:'SAVED',author:'Fictional Leila',
 createdAt:'2026-11-09T10:00:00Z',
 sections:{summary:'Old fictional summary'},evidence:baseEvidence(),...more
});
let tree,done,reload,errors;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const mount=async(Component,props)=>act(async()=>{tree=create(h(Component,props));});
const out=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();
 for(const k of ['comment','giveBack','version'])reportsApi[k].mockReset();
 reportsApi.comment.mockResolvedValue({});reportsApi.giveBack.mockResolvedValue({});
 reportsApi.version.mockResolvedValue(saved());
 done=jest.fn();reload=jest.fn(async()=>{});errors=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real report evidence and saved version review boundaries',()=>{
 it('shows recorded evidence tied to exact historical plan version and source ids',async()=>{
  await mount(Evidence,{d:details()});
  expect(get('report-evidence')).toBeTruthy();
  expect(get('evidence-goal-goal-a')).toBeTruthy();
  expect(get('evidence-sources-goal-a')).toBeTruthy();
  expect(get('report-evidence-open-goal-goal-a').props.href)
   .toBe('/app/clinical/child-a#plan?version=version-old&goal=goal-a');
  expect(out()).toContain('obs-a');
  expect(out()).toContain('obs-previous');
 });
 it('does not infer a plan or fabricate measurements when no plan is assigned',async()=>{
  await mount(Evidence,{d:details({evidence:baseEvidence({plan:null,goals:[]})})});
  expect(get('evidence-no-plan')).toBeTruthy();
  expect(find('evidence-goal-goal-a')).toHaveLength(0);
 });
 it('does not direct to a current goal when a legacy source has no version id',async()=>{
  const e=baseEvidence({goals:[{...baseEvidence().goals[0],planVersionId:undefined}]});
  await mount(Evidence,{d:details({evidence:e})});
  expect(find('report-evidence-open-goal-goal-a')).toHaveLength(0);
  expect(out()).toContain('Historical evidence snapshot');
 });
 it('prevents a supervisor comment without a meaningful explanation',async()=>{
  await mount(Review,{centerId:'center-a',d:details(),onReload:reload,onError:errors});
  await click('review-add-comment');
  expect(get('review-error')).toBeTruthy();
  expect(reportsApi.comment).not.toHaveBeenCalled();
 });
 it('records exact supervisor comment and optimistic revision then reloads',async()=>{
  await mount(Review,{centerId:'center-a',d:details(),onReload:reload,onError:errors});
  await change('review-comment','  Fictional assessment needs more context  ');
  await click('review-add-comment');
  expect(reportsApi.comment).toHaveBeenCalledWith('center-a','report-a',
   'Fictional assessment needs more context',4);
  expect(reload).toHaveBeenCalledTimes(1);
  expect(get('review-comment').props.value).toBe('');
 });
 it('returns a synthetic draft with reason and unchanged clinical release state',async()=>{
  await mount(Review,{centerId:'center-a',d:details(),onReload:reload,onError:errors});
  await change('review-comment','  Correct fictional assessment details  ');
  await click('review-return');
  expect(reportsApi.giveBack).toHaveBeenCalledWith('center-a','report-a',
   'Correct fictional assessment details',4);
  expect(reportsApi.comment).not.toHaveBeenCalled();
 });
 it('never claims saved review when a revoked clinician receives 403',async()=>{
  reportsApi.giveBack.mockRejectedValue({status:403,message:'Synthetic review revoked'});
  await mount(Review,{centerId:'center-a',d:details(),onReload:reload,onError:errors});
  await change('review-comment','Fictional report correction');
  await click('review-return');
  expect(get('review-error')).toBeTruthy();
  expect(reload).not.toHaveBeenCalled();
  expect(get('review-comment').props.value).toBe('Fictional report correction');
 });
 it('shows recorded read-only notes without granting a supervisor mutation',async()=>{
  await mount(Review,{centerId:'center-a',d:details({canReview:false,
   report:report({reviewNotes:[{byName:'Fictional Supervisor',at:'2026-11-10T12:00:00Z',
    kind:'returned',comment:'Synthetic correction'}]})}),onReload:reload,onError:errors});
  expect(get('review-note-0')).toBeTruthy();
  expect(find('review-add-comment')).toHaveLength(0);
  expect(out()).toContain('Returned for revision');
 });
 it('reads exact saved version only on demand and never substitutes current report',async()=>{
  await mount(HistoryList,{centerId:'center-a',d:details(),onError:errors,onCompare:done});
  expect(get('history-2')).toBeTruthy();
  expect(reportsApi.version).not.toHaveBeenCalled();
  await click('history-compare-2');
  expect(reportsApi.version).toHaveBeenCalledWith('center-a','saved-a');
  expect(done).toHaveBeenCalledWith(expect.objectContaining({id:'saved-a',number:2}));
 });
 it('keeps history accessible after rejected version fetch without false comparison',async()=>{
  reportsApi.version.mockRejectedValue(new Error('Synthetic denied history'));
  await mount(HistoryList,{centerId:'center-a',d:details(),onError:jest.fn(),
   onCompare:done});
  await click('history-compare-2');
  expect(done).not.toHaveBeenCalled();
  expect(get('history-compare-2').props.disabled).toBe(false);
 });
 it('compares immutable saved text and current draft without clinical outcome labels',async()=>{
  await mount(Compare,{v:saved(),current:{summary:'Changed fictional summary'},
   currentEvidence:baseEvidence(),childId:'child-a',onClose:done});
  expect(get('report-compare')).toBeTruthy();
  expect(out()).toContain('sections changed');
  expect(get('compare-section-summary')).toBeTruthy();
  expect(out()).toContain('Immutable evidence difference');
  await click('compare-close');
  expect(done).toHaveBeenCalledTimes(1);
 });
 it('does not imply changes or manipulate source if both versions identical',async()=>{
  await mount(Compare,{v:saved(),current:saved().sections,
   currentEvidence:baseEvidence(),childId:'child-a',onClose:done});
  expect(get('compare-summary').props.children).toBeDefined();
  expect(out()).toContain('No changes since version');
 });
});
