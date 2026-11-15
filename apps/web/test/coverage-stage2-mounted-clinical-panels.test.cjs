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

describe('M4-08 90% real panel branch and permission qualification',()=>{
 const emptyPage={hasMore:false,loading:false,error:'',load:jest.fn()};
 it('assessment entries render optional findings only when saved evidence actually contains them',async()=>{
  await mount(AssessmentsPanel,{pagination:emptyPage,ws:ws({canEdit:false,assessments:[
   {id:'a1',service:'speech',assessedOn:'2026-11-10',author:'Fictional clinician',summary:'A fictional summary',areas:[]},
   {id:'a2',service:'ot',assessedOn:'2026-11-09',author:'Fictional clinician',summary:'B fictional summary',
    areas:[{area:'Motor',finding:'Observed safely'}]}
  ]})});
  expect(find('assessment-a1')).toHaveLength(1);
  expect(find('assessment-a2')).toHaveLength(1);
  expect(html()).toContain('Observed safely');
  expect(find('assessment-form')).toHaveLength(0);
 });
 it('loading additional assessments is disabled without losing existing evidence',async()=>{
  const page={hasMore:true,loading:true,error:'',load:jest.fn()};
  await mount(AssessmentsPanel,{pagination:page});
  expect(get('assessments-load-more').props.disabled).toBe(true);
  expect(html()).toContain('Loading earlier assessments');
  expect(page.load).not.toHaveBeenCalled();
 });
 it('optional assessment area of one character is omitted rather than invented',async()=>{
  clinicalApi.assess.mockResolvedValue({id:'fictional-assessment'});
  await mount(AssessmentsPanel,{pagination:emptyPage});
  await change('assessment-summary','Fictional clear summary');
  await change('assessment-area',' X ');
  await change('assessment-finding','Fictional finding');
  await click('assessment-save');
  expect(clinicalApi.assess.mock.calls[0][2].areas).toEqual([]);
 });
 it('failed assessment save retains clinician draft and does not claim saved state',async()=>{
  clinicalApi.assess.mockRejectedValueOnce(new Error('Fictional failed save'));
  await mount(AssessmentsPanel,{pagination:emptyPage});
  await change('assessment-summary','Retain fictional assessment evidence');
  await click('assessment-save');
  expect(get('assessment-summary').props.value).toBe('Retain fictional assessment evidence');
  expect(run).toHaveBeenCalledTimes(1);
 });
 it('session start controls are disabled when child has no active specialty',async()=>{
  await mount(SessionsPanel,{onPending,ws:ws({child:{id:'synthetic-child',name:'Fictional Alex',services:[]}})});
  const start=tree.root.findAllByType('button').find(b=>
   JSON.stringify(b.props.children).includes('Start ad-hoc session'));
  expect(start.props.disabled).toBe(true);
  expect(find('session-specialty')).toHaveLength(1);
 });
 it('scheduled sessions distinguish future appointments from existing records',async()=>{
  await mount(SessionsPanel,{onPending,ws:ws({appointments:[
   {id:'future',service:'speech',status:'SCHEDULED',startsAt:'2035-02-01T08:00:00Z',hasNote:false,room:'Room F'},
   {id:'past',service:'ot',status:'SCHEDULED',startsAt:'2020-02-01T08:00:00Z',hasNote:false,room:null},
   {id:'already-recorded',service:'speech',status:'SCHEDULED',startsAt:'2020-02-01T08:00:00Z',hasNote:true},
   {id:'cancelled',service:'ot',status:'CANCELLED',startsAt:'2020-02-01T08:00:00Z',hasNote:false}
  ]})});
  const startButtons=tree.root.findAllByType('button').filter(b=>
   JSON.stringify(b.props.children).includes('Start scheduled session'));
  expect(startButtons).toHaveLength(2);
  expect(startButtons[0].props.disabled).toBe(true);
  expect(startButtons[1].props.disabled).toBe(false);
  expect(html()).toContain('Room F');
 });
 it('actual scheduled session start passes matching appointment ID and current timestamp',async()=>{
  clinicalApi.startSession.mockResolvedValueOnce({id:'fictional-note'});
  await mount(SessionsPanel,{onPending,ws:ws({appointments:[
   {id:'past',service:'speech',status:'SCHEDULED',startsAt:'2020-01-01T08:00:00Z',hasNote:false,room:''}
  ]})});
  const b=tree.root.findAllByType('button').find(b=>
   JSON.stringify(b.props.children).includes('Start scheduled session'));
  await act(async()=>b.props.onClick());
  expect(clinicalApi.startSession).toHaveBeenCalledWith('synthetic-center','synthetic-child',
   expect.objectContaining({service:'speech',appointmentId:'past',startKey:expect.any(String)}));
 });
 it('change of service creates distinct retry identity instead of replaying wrong specialty',async()=>{
  clinicalApi.startSession.mockRejectedValueOnce(new Error('Fictional uncertainty'))
   .mockResolvedValueOnce({id:'fictional-note'});
  await mount(SessionsPanel,{onPending});
  const b=tree.root.findAllByType('button').find(b=>
   JSON.stringify(b.props.children).includes('Start ad-hoc session'));
  await act(async()=>b.props.onClick());
  await change('session-specialty','ot');
  await act(async()=>b.props.onClick());
  expect(clinicalApi.startSession).toHaveBeenCalledTimes(2);
  const previous=clinicalApi.startSession.mock.calls[0][2];
  const newer=clinicalApi.startSession.mock.calls[1][2];
  expect(previous.service).toBe('speech');
  expect(newer.service).toBe('ot');
  expect(newer.startKey).not.toBe(previous.startKey);
 });
 it('empty progress dataset displays safe guidance, no invented observation editor',async()=>{
  await mount(ProgressPanel,{ws:ws(),onNavigate:jest.fn()});
  expect(get('progress-empty')).toBeTruthy();
  expect(find('observation-form')).toHaveLength(0);
  expect(find('progress-history')).toHaveLength(0);
  expect(clinicalApi.observe).not.toHaveBeenCalled();
 });
 it('single measurement is not treated as clinical improvement',async()=>{
  await mount(ProgressPanel,{ws:ws({plans:[plan()],observations:[
   obs('single','pv-new',3,'2026-11-10')
  ]}),onNavigate:jest.fn()});
  expect(get('progress-periods-g1')).toBeTruthy();
  expect(html()).toContain('Only one observation recorded');
 });
 it('saved goal with zero observations shows no chart or inferred progress',async()=>{
  await mount(ProgressPanel,{ws:ws({plans:[plan()]}),onNavigate:jest.fn()});
  expect(get('progress-goal-g1')).toBeTruthy();
  expect(find('progress-periods-g1')).toHaveLength(0);
  expect(html()).toContain('No observations yet');
 });
 it('monthly aggregation computes only source-linked recorded values',async()=>{
  await mount(ProgressPanel,{ws:ws({plans:[plan()],observations:[
   obs('one','pv-new',2,'2026-10-30'),
   obs('two','pv-new',4,'2026-11-10')
  ]}),onNavigate:jest.fn()});
  await change('progress-granularity','month');
  expect(get('progress-periods-g1').findByType('caption').children.join('')).toContain('Monthly measurements');
  expect(find('progress-periods-g1')).toHaveLength(1);
  expect(html()).toContain('2026-10');
  expect(html()).toContain('2026-11');
 });
 it('historical goal without any observations remains visible, explicitly read-only',async()=>{
  const current=plan('pv-new','DRAFT',2).versions[0];
  const old=plan('pv-old','SUPERSEDED',1).versions[0];
  await mount(ProgressPanel,{ws:ws({plans:[{...plan(),versions:[current,old]}]}),onNavigate:jest.fn()});
  expect(get('progress-history-toggle')).toBeTruthy();
  await click('progress-history-toggle');
  expect(get('progress-historical-pv-old-g1')).toBeTruthy();
  expect(html()).toContain('No recorded observations for this historical goal');
  expect(find('historical-chart-pv-old-g1')).toHaveLength(0);
 });
 it('recorded historical single source retains exact original plan version only',async()=>{
  const current=plan('pv-new','DRAFT',2).versions[0];
  const old=plan('pv-old','SUPERSEDED',1).versions[0];
  await mount(ProgressPanel,{ws:ws({plans:[{...plan(),versions:[current,old]}],
   observations:[obs('old','pv-old',9,'2026-10-19')]
  }),onNavigate:jest.fn()});
  await click('progress-history-toggle');
  expect(get('historical-chart-pv-old-g1')).toBeTruthy();
  expect(html()).toContain('A single measurement cannot establish change');
  await click('progress-history-toggle');
  expect(find('progress-historical-pv-old-g1')).toHaveLength(0);
 });
 it('nonnumeric observation rejects without touching server, while successful response clears only input',async()=>{
  clinicalApi.observe.mockResolvedValueOnce({id:'fictional-observation'});
  await mount(ProgressPanel,{ws:ws({plans:[plan()]}),onNavigate:jest.fn()});
  await change('observation-value','not numeric');
  await click('observation-save');
  expect(clinicalApi.observe).not.toHaveBeenCalled();
  expect(get('observation-value').props.value).toBe('not numeric');
  await change('observation-value','7');
  await click('observation-save');
  expect(clinicalApi.observe.mock.calls[0][2].value).toBe(7);
  expect(get('observation-value').props.value).toBe('');
 });
});
