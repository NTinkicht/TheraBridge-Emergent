// M4-08 minimum-90 branch qualification: real immutable statement provenance
// and shared state components. Fictional source labels only; never signed.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let mockPreviewState='populated';let mockSetState=jest.fn();
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/design/PreviewContext',()=>({
 usePreview:()=>({dataState:mockPreviewState,setDataState:mockSetState})
}));
const {ReportStatementTrace}=require('../src/components/clinical/ReportStatementTrace');
const {StateGate,EmptyState,ErrorState,SkeletonRows,Skeleton,AccessDenied,Dialog}=require('../src/components/design/states');
const icon=()=>h('span',null,'Synthetic icon');
const id='11111111-1111-4111-8111-111111111111';
const claim=(sources=[{ref:`planVersion:${id}:goal:g1`,label:'Fictional goal provenance'}])=>({
 index:1,text:'Fictional recorded statement',sources
});
const linked=(section='goals',extra={})=>({
 section,status:'LINKED_TO_SAVED_TEXT',decisionId:'fictional-decision',passage:'Fictional recorded statement',
 claims:[claim()],claimValidation:'REFERENCED_NOT_VERIFIED',...extra
});
const v=(trace,extra={})=>({
 id:'fictional-report-version',number:2,kind:'SAVED',sections:{},
 evidence:{goals:[{key:'g1',planVersionId:id,prior:{date:'2026-11-01',value:1,observationId:'obs-prior'},
   points:[{date:'2026-11-10',value:2,observationId:'obs-current'}]}],
   checkpoints:[{ref:'goalCheckpoint:checkpoint-a',planVersionId:id,goalKey:'g1'}]},
 statementTrace:trace,...extra
});
let tree=null;const mount=async(c,props)=>act(async()=>{tree=create(h(c,props));});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const get=id=>tree.root.findByProps({'data-testid':id});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const out=()=>JSON.stringify(tree.toJSON());
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 real report statement trace never promotes evidence to clinical validation',()=>{
 it('missing trace uses exact empty-state rather than inventing source links',async()=>{
  await mount(ReportStatementTrace,{version:v(undefined),childId:'fictional-child'});
  expect(get('statement-trace-empty')).toBeTruthy();
  expect(find('statement-trace-inspector')).toHaveLength(0);
 });
 it('linked source for exact plan version yields permission-scoped goal URL',async()=>{
  await mount(ReportStatementTrace,{version:v([linked()]),childId:'fictional-child'});
  expect(get('statement-trace-claims-goals')).toBeTruthy();
  const refs=find('statement-trace-source');
  expect(refs).toHaveLength(1);
  const anchor=refs[0].findByType('a');
  expect(anchor.props.href).toBe(`/app/clinical/fictional-child#plan?version=${id}&goal=g1`);
  expect(out()).toContain('not clinically verified');
 });
 it('malformed plan goal ref never forms an authorization-bypassing deep link',async()=>{
  await mount(ReportStatementTrace,{version:v([linked('goals',{claims:[claim([
   {ref:'planVersion:malformed:goal:g1',label:'Fictional untrusted reference'}
  ])]})]),childId:'fictional-child'});
  expect(find('statement-trace-source')).toHaveLength(1);
  expect(find('statement-trace-source')[0].findAllByType('a')).toHaveLength(0);
 });
 it('saved observation reference resolves only within exact stored goal evidence',async()=>{
  await mount(ReportStatementTrace,{version:v([linked('goals',{claims:[claim([
   {ref:'observation:obs-prior',label:'Historical fictional observation'},
   {ref:'observation:obs-current',label:'Current fictional observation'},
   {ref:'observation:absent',label:'Unlinked fictional observation'}
  ])]})]),childId:'fictional-child'});
  const links=find('statement-trace-source').map(x=>x.findAllByType('a').length);
  expect(links).toEqual([1,1,0]);
 });
 it('checkpoint source is resolved only from immutable matching record',async()=>{
  await mount(ReportStatementTrace,{version:v([linked('goals',{claims:[claim([
   {ref:'goalCheckpoint:checkpoint-a',label:'Recorded review checkpoint'},
   {ref:'goalCheckpoint:absent',label:'Unknown checkpoint'}
  ])]})]),childId:'fictional-child'});
  expect(find('statement-trace-source').map(x=>x.findAllByType('a').length)).toEqual([1,0]);
 });
 it.each(['SECTION_EDITED','PASSAGE_MISMATCH','SOURCE_MISMATCH'])('%s warns, never provides a falsely linked source',async status=>{
  await mount(ReportStatementTrace,{version:v([linked('assessment',{status})]),childId:'fictional-child'});
  expect(get('statement-trace-status-assessment')).toBeTruthy();
  expect(find('statement-trace-claims-assessment')).toHaveLength(0);
  expect(out()).toContain('No source is presented as supporting');
 });
 it('search by wording matches only attributable claims and preserves mismatched section warning',async()=>{
  await mount(ReportStatementTrace,{version:v([
   linked('goals',{claims:[claim(),{...claim(),index:2,text:'Another unrelated draft',sources:[]}]}),
   linked('sessions',{status:'SECTION_EDITED',claims:[]})
  ]),childId:'fictional-child'});
  await change('statement-trace-search','  recorded STATEMENT  ');
  expect(find('statement-trace-source')).toHaveLength(1);
  expect(get('statement-trace-status-sessions')).toBeTruthy();
  expect(get('statement-trace-result-count').children.join('')).toContain('Showing 1 of 2');
 });
 it('search by source label or reference supports exact provenance, not guessed clinical claims',async()=>{
  await mount(ReportStatementTrace,{version:v([linked()]),childId:'fictional-child'});
  await change('statement-trace-search','fIcTiOnAl GoAl');
  expect(find('statement-trace-source')).toHaveLength(1);
  await change('statement-trace-search','planVersion:');
  expect(find('statement-trace-source')).toHaveLength(1);
  await change('statement-trace-search','no such recorded source');
  expect(find('statement-trace-no-matches')).toHaveLength(1);
  expect(find('statement-trace-source')).toHaveLength(0);
 });
 it('section filter hides unrelated claims but never marks mismatches as linked',async()=>{
  await mount(ReportStatementTrace,{version:v([
   linked('goals'),linked('assessment',{status:'PASSAGE_MISMATCH',claims:[]})
  ]),childId:'fictional-child'});
  await change('statement-trace-section-filter','assessment');
  expect(get('statement-trace-status-assessment')).toBeTruthy();
  expect(find('statement-trace-section-goals')).toHaveLength(0);
  await change('statement-trace-section-filter','sessions');
  expect(get('statement-trace-no-matches')).toBeTruthy();
  await change('statement-trace-section-filter','all');
  expect(get('statement-trace-section-goals')).toBeTruthy();
 });
 it('zero source links and missing saved evidence do not fabricate deep links',async()=>{
  await mount(ReportStatementTrace,{version:v([linked('sessions',{claims:[claim([])]})],{
   evidence:{goals:[]}
  }),childId:'fictional-child'});
  expect(find('statement-trace-source')).toHaveLength(0);
  expect(tree.root.findAllByType('p').map(x=>x.children.filter(y=>typeof y==='string').join('')).join(' ')).toContain('0 recorded sources');
 });
});
describe('M4-08 real shared state controls retain loading, denial and retry boundaries',()=>{
 beforeEach(()=>{mockPreviewState='populated';mockSetState=jest.fn();});
 it('loads real skeleton rows with safe defaults and explicit zero rows',async()=>{
  await mount(SkeletonRows,{testId:'busy'});
  expect(get('busy').findAllByType(Skeleton)).toHaveLength(9);
  await act(async()=>tree.update(h(SkeletonRows,{rows:0,testId:'busy'})));
  expect(get('busy').findAllByType(Skeleton)).toHaveLength(0);
 });
 it.each(['loading','empty','populated','error'])('StateGate renders exactly the selected %s state',async state=>{
  mockPreviewState=state;
  await mount(StateGate,{testId:'state',rows:2,empty:h('span',{'data-testid':'explicit-empty'},'Empty'),children:h('span',{'data-testid':'data'},'Data')});
  expect(find('state-loading').length).toBe(state==='loading'?1:0);
  expect(find('explicit-empty').length).toBe(state==='empty'?1:0);
  expect(find('state-error').length).toBe(state==='error'?1:0);
  expect(find('data').length).toBe(state==='populated'?1:0);
  if(state==='error'){
   await act(async()=>get('state-error-retry').props.onClick());
   expect(mockSetState).toHaveBeenCalledWith('populated');
  }
 });
 it.each(['clinical','family'])('%s EmptyState preserves action and tone',async tone=>{
  await mount(EmptyState,{icon,title:'Fictional empty',body:'No authorized records',
   action:h('button',{'data-testid':'empty-action'},'Return'),tone,testId:'empty'});
  expect(get('empty-action')).toBeTruthy();
  expect(out()).toContain('Fictional empty');
  expect(get('empty').props.className).toContain(tone==='family'?'fam-border':'border-border-strong');
 });
 it.each(['clinical','family'])('%s ErrorState retry invokes caller only',async tone=>{
  const onRetry=jest.fn();
  await mount(ErrorState,{onRetry,tone,testId:'error'});
  await act(async()=>get('error-retry').props.onClick());
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(out()).toContain('Nothing was changed');
 });
 it('AccessDenied keeps explicit back destination without leaking private detail',async()=>{
  await mount(AccessDenied,{title:'Access changed',body:'Fictional access refused',
   backHref:'/app/home',backLabel:'Return',testId:'denied'});
  expect(get('denied').findByType('a').props.href).toBe('/app/home');
  expect(out()).toContain('Access changed');
 });
 it.each(['clinical','family'])('%s Dialog renders only expected content and close control',async tone=>{
  const close=jest.fn();
  await mount(Dialog,{open:false,onClose:close,title:'Fictional choice',tone,testId:'dialog',
   children:h('p',null,'Unsaved synthetic evidence'),footer:h('span',null,'Draft only')});
  expect(out()).toContain('Unsaved synthetic evidence');
  expect(out()).toContain('Draft only');
  await act(async()=>get('dialog-close').props.onClick());
  expect(close).toHaveBeenCalledTimes(1);
 });
});
