// Stage 2: mount real clinical work panels, validate persistence, idempotent
// session start and exact plan-version observation provenance. Synthetic data.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/centers/kit',()=>{
 const a=jest.requireActual('@/components/centers/kit');
 return {...a,SelectField:({value,onChange,options,testId})=>h('select',{
  value,'data-testid':testId,onChange:e=>onChange(e.target.value)},
  options.map(o=>h('option',{value:o.value,key:o.value},o.label)))};
});
jest.mock('@/components/clinical/GoalVersionContext',()=>({
 GoalVersionContext:()=>h('p',{'data-testid':'version-context-boundary'},'Source version is explicit')
}));
jest.mock('@/lib/clinical',()=>{
 const actual=jest.requireActual('@/lib/clinical');
 return {...actual,clinicalApi:{...actual.clinicalApi,
  assess:jest.fn(),startSession:jest.fn(),observe:jest.fn()}};
});
const {clinicalApi}=require('../src/lib/clinical');
const {setCenterTz}=require('../src/lib/operations');
const {AssessmentsPanel,SessionsPanel,ProgressPanel}=require('../src/components/clinical/Panels');
const ws=(extra={})=>({
 timezone:'Asia/Dubai',synthetic:true,canEdit:true,canReview:false,
 child:{id:'synthetic-child',name:'Fictional Alex',services:['speech','ot']},
 assessments:[],plans:[],notes:[],observations:[],appointments:[],
 templates:[],careTeam:[],...extra});
const goal=(key='g1')=>({key,title:'Fictional turn-taking',
 measure:'count',baseline:1,target:5,targetOn:'2026-12-31'});
const plan=(version='pv-new',status='DRAFT',number=2)=>({
 id:'p1',title:'Fictional plan',service:'speech',
 versions:[{id:version,number,status,goals:[goal()],
  homeActivities:[],goalCheckpoints:[]}]
});
const obs=(id,version,value,day)=>({id,planVersionId:version,
 goalKey:'g1',value,observedOn:day,author:'Fictional Clinician'});
let tree=null,run,onPending,originalCrypto;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const click=async id=>act(async()=>get(id).props.onClick());
const html=()=>JSON.stringify(tree.toJSON());
beforeAll(()=>{
 setCenterTz('Asia/Dubai');
 originalCrypto=global.crypto;
 if(!global.crypto)global.crypto={randomUUID:jest.fn(()=>'synthetic-start-key')};
});
afterAll(()=>{setCenterTz(undefined);global.crypto=originalCrypto;});
beforeEach(()=>{
 jest.clearAllMocks();run=jest.fn(async(fn)=>{
  try{await fn();return true;}catch{return false;}
 });onPending=jest.fn();
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const mount=async(Component,props)=>act(async()=>{
 tree=create(h(Component,{centerId:'synthetic-center',ws:ws(),run,...props}));
});
describe('Stage 2 mounted clinical assessments: exact source and validation',()=>{
 const pagination={hasMore:false,loading:false,error:'',load:jest.fn()};
 it('shows empty state and suppresses new draft editing for read-only reviewer',async()=>{
  await mount(AssessmentsPanel,{ws:ws({canEdit:false}),pagination});
  expect(get('assessments-empty')).toBeTruthy();
  expect(find('assessment-form')).toHaveLength(0);
  expect(clinicalApi.assess).not.toHaveBeenCalled();
 });
 it('rejects an insufficient summary and never transmits invalid assessment',async()=>{
  await mount(AssessmentsPanel,{pagination});
  await change('assessment-summary','x ');
  await click('assessment-save');
  expect(clinicalApi.assess).not.toHaveBeenCalled();
  expect(run).toHaveBeenCalledTimes(1);
  expect(run.mock.calls[0][1]).toBe('');
 });
 it('saves explicitly scoped assessment with optional structured area',async()=>{
  clinicalApi.assess.mockResolvedValue({id:'a1'});
  await mount(AssessmentsPanel,{pagination});
  await change('assessment-service','ot');
  await change('assessment-summary','Fictional measured observation');
  await change('assessment-area','  Motor skills  ');
  await change('assessment-finding','Observed task with support');
  await click('assessment-save');
  expect(clinicalApi.assess).toHaveBeenCalledWith('synthetic-center','synthetic-child',
   expect.objectContaining({service:'ot',summary:'Fictional measured observation',
    areas:[{area:'Motor skills',finding:'Observed task with support'}]}));
  expect(get('assessment-summary').props.value).toBe('');
 });
 it('exposes paged historical assessment error and a real retry control',async()=>{
  const pagination={hasMore:true,loading:false,error:'Synthetic page unavailable',
   load:jest.fn(async()=>{})};
  await mount(AssessmentsPanel,{pagination});
  expect(get('assessments-load-error')).toBeTruthy();
  await click('assessments-load-more');
  expect(pagination.load).toHaveBeenCalledTimes(1);
 });
});
describe('Stage 2 mounted session start: stable retry request and access boundaries',()=>{
 it('does not expose new session controls to read-only supervisor',async()=>{
  await mount(SessionsPanel,{ws:ws({canEdit:false}),onPending});
  expect(find('session-start')).toHaveLength(0);
  expect(clinicalApi.startSession).not.toHaveBeenCalled();
 });
 it('creates one scoped ad-hoc session with an idempotency key',async()=>{
  clinicalApi.startSession.mockResolvedValue({id:'note-1'});
  await mount(SessionsPanel,{onPending});
  const button=tree.root.findAllByType('button').find(b=>
   JSON.stringify(b.props.children).includes('Start ad-hoc session'));
  await act(async()=>button.props.onClick());
  expect(clinicalApi.startSession).toHaveBeenCalledWith('synthetic-center','synthetic-child',
   expect.objectContaining({service:'speech',startKey:expect.any(String),
    actualStart:expect.any(String),sessionDate:expect.any(String)}));
  expect(run).toHaveBeenCalledWith(expect.any(Function),'Session started.');
 });
 it('reuses original idempotency key on transport failure, rotates key on later new session',async()=>{
  clinicalApi.startSession.mockRejectedValueOnce(new Error('Uncertain synthetic network'))
   .mockResolvedValue({id:'note-1'});
  await mount(SessionsPanel,{onPending});
  const button=tree.root.findAllByType('button').find(b=>
   JSON.stringify(b.props.children).includes('Start ad-hoc session'));
  await act(async()=>button.props.onClick());
  await act(async()=>button.props.onClick());
  expect(clinicalApi.startSession).toHaveBeenCalledTimes(2);
  expect(clinicalApi.startSession.mock.calls[1][2]).toEqual(
   clinicalApi.startSession.mock.calls[0][2]);
 });
});
describe('Stage 2 mounted clinical evidence: no version cross-contamination',()=>{
 const datasets=()=>ws({plans:[{
  ...plan(),versions:[
   {...plan('pv-new','DRAFT',2).versions[0]},
   {...plan('pv-old','SUPERSEDED',1).versions[0]}
  ]}],
 observations:[obs('new-1','pv-new',2,'2026-11-10'),
  obs('old-1','pv-old',99,'2026-11-09')]});
 it('does not combine reused goal keys from old superseded versions',async()=>{
  await mount(ProgressPanel,{ws:datasets(),onNavigate:jest.fn()});
  expect(get('progress-goal-g1')).toBeTruthy();
  expect(get('progress-periods-g1')).toBeTruthy();
  const currentSvg=get('progress-chart-g1').findByType('svg');
  expect(currentSvg.props['aria-label']).toContain('2 on 2026-11-10');
  expect(currentSvg.props['aria-label']).not.toContain('99');
  expect(get('progress-history-toggle').props['aria-expanded']).toBe(false);
  await click('progress-history-toggle');
  expect(get('progress-historical-pv-old-g1')).toBeTruthy();
  expect(get('historical-chart-pv-old-g1').findByType('svg').props['aria-label'])
   .toContain('99 on 2026-11-09');
 });
 it('requires a finite numeric observation and exact selected version before recording',async()=>{
  clinicalApi.observe.mockResolvedValue({id:'ob-new'});
  await mount(ProgressPanel,{ws:datasets(),onNavigate:jest.fn()});
  await change('observation-value','');
  await click('observation-save');
  expect(clinicalApi.observe).not.toHaveBeenCalled();
  await change('observation-value','3.5');
  await click('observation-save');
  expect(clinicalApi.observe).toHaveBeenCalledWith('synthetic-center','synthetic-child',
   expect.objectContaining({planVersionId:'pv-new',goalKey:'g1',value:3.5}));
  expect(get('observation-value').props.value).toBe('');
 });
 it('shows record-only read mode for supervisors even when historical data exists',async()=>{
  await mount(ProgressPanel,{ws:{...datasets(),canEdit:false},onNavigate:jest.fn()});
  expect(find('observation-form')).toHaveLength(0);
  expect(get('progress-history-toggle')).toBeTruthy();
 });
});