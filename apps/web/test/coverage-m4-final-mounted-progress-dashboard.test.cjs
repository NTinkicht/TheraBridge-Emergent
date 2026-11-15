// M4-08: source-executing progress dashboard tests. The actual route owns
// filtering and interpretation; only authenticated service data and view
// primitives are synthetic. No observed value is synthesized as clinical progress.
const React=require('react'), Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let current,loaded,requestedFetcher,handler;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/centers/kit',()=>({
 Workspace:({children})=>children(current,handler),
 useLoad:(fetcher)=>{requestedFetcher=fetcher;return loaded;},
 PageTitle:({title,testId})=>h('h1',{'data-testid':testId},title),
 SelectField:({value,options,onChange,testId})=>h('select',{'data-testid':testId,value,onChange:e=>onChange(e.target.value)},
  options.map(o=>h('option',{key:o.value,value:o.value},o.label)))
}));
jest.mock('@/components/auth/Field',()=>({Field:({value,onChange,testId,error})=>
 h('div',null,h('input',{'data-testid':testId,value,onChange}),error&&h('span',null,error))}));
jest.mock('@/components/clinical/GoalChart',()=>({
 GoalChart:({points,baseline,target,measure,testId})=>h('section',{'data-testid':testId,'data-count':points.length,'data-measure':measure,
 'data-baseline':baseline,'data-target':target}),
 STATUS_TEXT:{recorded:'Recorded observations',insufficient:'Not enough data',none:'No data'}
}));
jest.mock('@/components/clinical/SupervisorReviewQueue',()=>({
 SupervisorReviewQueue:({centerId,childId,service})=>
 h('section',{'data-testid':'supervisor-queue','data-center':centerId,'data-child':childId,'data-service':service})
}));
jest.mock('@/components/operations/BookDialog',()=>({serviceLabel:s=>'Fictional '+s}));
jest.mock('@/components/design/ui',()=>({
 Card:({children,testId})=>h('section',{'data-testid':testId},children),
 Metric:({label,value,testId})=>h('div',{'data-testid':testId},label+':'+value),
 Pill:({tone,children,testId})=>h('span',{'data-testid':testId,'data-tone':tone},children)
}));
jest.mock('@/components/design/states',()=>({
 EmptyState:({title,body,testId})=>h('p',{'data-testid':testId},title+' '+body),
 ErrorState:({onRetry,testId})=>h('button',{'data-testid':testId,onClick:onRetry},'Retry'),
 SkeletonRows:({rows,testId})=>h('p',{'data-testid':testId},'Loading '+rows)
}));
jest.mock('@/lib/reports',()=>{
 const actual=jest.requireActual('@/lib/reports');
 return {...actual,daysAgo:(days)=>{
  const date=new Date('2026-11-11T12:00:00.000Z');
  date.setUTCDate(date.getUTCDate()-days);
  return date.toISOString().slice(0,10);
 },isoDay:()=> '2026-11-11',
 reportsApi:{...actual.reportsApi,dashboard:jest.fn()}};
});
const {reportsApi}=require('../src/lib/reports');
const Page=require('../src/app/app/progress/page').default;
const goal=(extra={})=>({
 childId:'synthetic-child',childName:'Fictional Alex',key:'g1',title:'Fictional goal',
 service:'speech',planTitle:'Synthetic plan',baseline:2,target:9,measure:'count',
 status:'recorded',points:[
  {id:'obs1',date:'2026-11-04',value:4},{id:'obs2',date:'2026-11-10',value:5}
 ],prior:{date:'2026-10-31',value:3},...extra
});
const dashboard=(extra={})=>({
 period:{from:'2026-08-14',to:'2026-11-11'},children:[
  {id:'synthetic-child',name:'Fictional Alex',services:['speech','occupational']}
 ],goals:[goal()],...extra
});
let tree;
const mount=async()=>act(async()=>{tree=create(h(Page));});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const html=()=>JSON.stringify(tree.toJSON());
const select=async(id,value)=>act(async()=>{get(id).props.onChange({target:{value}});await Promise.resolve();});
const input=async(id,value)=>act(async()=>{get(id).props.onChange({target:{value}});await Promise.resolve();});
beforeEach(()=>{
 jest.clearAllMocks();requestedFetcher=null;
 current={activeContext:{type:'center',centerId:'centre-a',role:'THERAPIST'},
 permissions:['center.clinical.read']};handler=jest.fn();
 loaded={data:dashboard(),failed:false,reload:jest.fn()};
 reportsApi.dashboard.mockReset().mockResolvedValue(dashboard());
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});

describe('mounted progress dashboard remains source-bound and version-agnostic about effectiveness',()=>{
 it('synthetic clinical warning renders even when server data exists',async()=>{
  await mount();
  expect(get('progress-dashboard')).toBeTruthy();
  expect(get('progress-synthetic-banner')).toBeTruthy();
  expect(html()).toContain('not for clinical use');
  expect(html()).toContain('Home activity completion is never counted as progress');
 });
 it('initial request stays scoped to exact authorized center and period',async()=>{
  await mount();
  expect(typeof requestedFetcher).toBe('function');
  await requestedFetcher();
  expect(reportsApi.dashboard).toHaveBeenCalledWith('centre-a',{
   childId:undefined,service:undefined,from:'2026-08-14',to:'2026-11-11'
  });
 });
 it('loading response hides goal cards and metric contents',async()=>{
  loaded={data:null,failed:false,reload:jest.fn()};
  await mount();
  expect(get('progress-loading')).toBeTruthy();
  expect(find('dash-goal-synthetic-child-g1')).toHaveLength(0);
 });
 it('failed authenticated read offers retry without displaying stale evidence',async()=>{
  loaded={data:null,failed:true,reload:jest.fn()};
  await mount();expect(get('progress-error')).toBeTruthy();
  expect(find('progress-goals')).toHaveLength(0);
  await act(async()=>get('progress-error').props.onClick());
  expect(loaded.reload).toHaveBeenCalledTimes(1);
 });
 it('recorded, insufficient and absent observations have distinct metric counts',async()=>{
  loaded.data=dashboard({goals:[
   goal(),goal({key:'g2',status:'insufficient',points:[{id:'only',date:'2026-11-11',value:3}],prior:null}),
   goal({key:'g3',status:'none',points:[],prior:null})
  ]});
  await mount();
  expect(get('metric-goals').props.children).toBe('Goals shown:3');
  expect(get('metric-recorded').props.children).toBe('With recorded data:1');
  expect(get('metric-insufficient').props.children).toBe('Not enough data:1');
  expect(get('metric-none').props.children).toBe('No data:1');
  expect(get('dash-status-synthetic-child-g2').props['data-tone']).toBe('caution');
  expect(get('dash-status-synthetic-child-g3').props['data-tone']).toBe('neutral');
 });
 it('goal chart receives only recorded observation values from its exact response',async()=>{
  await mount();
  expect(get('dash-chart-synthetic-child-g1').props).toMatchObject({
   'data-count':2,'data-baseline':2,'data-target':9,'data-measure':'count'
  });
  expect(html()).toContain('2026-10-31');
  expect(html()).toContain('2026-11-10');
  expect(html()).not.toContain('None recorded');
 });
 it('selected child narrows available services and explicitly filters network query',async()=>{
  await mount();await select('filter-child','synthetic-child');
  expect(get('filter-service').findAllByType('option').map(o=>o.props.value))
   .toEqual(['','speech','occupational']);
  await requestedFetcher();
  expect(reportsApi.dashboard).toHaveBeenLastCalledWith('centre-a',expect.objectContaining({childId:'synthetic-child'}));
 });
 it('child selection clears previously selected service and goal',async()=>{
  await mount();await select('filter-service','speech');await select('filter-goal','g1');
  await select('filter-child','synthetic-child');
  expect(get('filter-service').props.value).toBe('');
  expect(get('filter-goal').props.value).toBe('');
 });
 it('service selection resets earlier goal and preserves exact specialty query',async()=>{
  await mount();await select('filter-goal','g1');await select('filter-service','speech');
  expect(get('filter-goal').props.value).toBe('');
  await requestedFetcher();
  expect(reportsApi.dashboard).toHaveBeenLastCalledWith('centre-a',expect.objectContaining({service:'speech'}));
 });
 it('goal filter changes only visible goals and never synthesizes observations',async()=>{
  loaded.data=dashboard({goals:[goal(),goal({key:'g2',title:'Other fictional goal'})]});
  await mount();await select('filter-goal','g2');
  expect(find('dash-goal-synthetic-child-g1')).toHaveLength(0);
  expect(get('dash-goal-synthetic-child-g2')).toBeTruthy();
  expect(get('metric-goals').props.children).toBe('Goals shown:1');
 });
 it.each([
  ['30','2026-10-13'],
  ['90','2026-08-14'],
  ['180','2026-05-16'],
  ['365','2025-11-12']
 ])('period %s requests its exact independently verified inclusive date range',async(period,expectedFrom)=>{
  await mount();await select('filter-period',period);
  expect(get('filter-period').props.value).toBe(period);
  await requestedFetcher();
  expect(reportsApi.dashboard).toHaveBeenLastCalledWith('centre-a',
   expect.objectContaining({from:expectedFrom,to:'2026-11-11'}));
 });
 it('valid custom range uses explicit entered dates and does not infer clinical improvement',async()=>{
  await mount();await select('filter-period','custom');
  await input('filter-from','2026-11-01');await input('filter-to','2026-11-10');
  expect(find('progress-period-error')).toHaveLength(0);
  await requestedFetcher();
  expect(reportsApi.dashboard).toHaveBeenLastCalledWith('centre-a',
   expect.objectContaining({from:'2026-11-01',to:'2026-11-10'}));
 });
 it('reversed custom range disables network fetch and hides stale summary',async()=>{
  await mount();await select('filter-period','custom');
  await input('filter-from','2026-11-10');await input('filter-to','2026-11-01');
  expect(get('progress-period-error')).toBeTruthy();
  expect(requestedFetcher).toBeNull();
  expect(find('progress-summary')).toHaveLength(0);
  expect(find('progress-goals')).toHaveLength(0);
 });
 it('blank custom period disables the fetch rather than retrieving an unbounded history',async()=>{
  await mount();await select('filter-period','custom');await input('filter-from','');
  expect(get('progress-period-error')).toBeTruthy();
  expect(requestedFetcher).toBeNull();
 });
 it('empty assigned-children response never fabricates child access or goal evidence',async()=>{
  loaded.data=dashboard({children:[],goals:[]});
  await mount();expect(get('progress-empty')).toBeTruthy();
  expect(html()).toContain('No children assigned to you');
  expect(find('dash-goal-synthetic-child-g1')).toHaveLength(0);
 });
 it('assigned children without recorded goals get a distinct zero-goals explanation',async()=>{
  loaded.data=dashboard({goals:[]});
  await mount();expect(get('progress-empty')).toBeTruthy();
  expect(html()).toContain('No goals match these filters');
 });
 it('supervisor review queue is available only to exact clinical supervisor role',async()=>{
  await mount();expect(find('supervisor-queue')).toHaveLength(0);
  current.activeContext.role='CLINICAL_SUPERVISOR';
  await act(async()=>tree.update(h(Page)));
  expect(get('supervisor-queue').props['data-center']).toBe('centre-a');
  expect(get('supervisor-queue').props['data-child']).toBe('');
 });
 it('filtering a supervisor queue preserves current child and specialty restrictions',async()=>{
  current.activeContext.role='CLINICAL_SUPERVISOR';
  await mount();await select('filter-child','synthetic-child');await select('filter-service','speech');
  expect(get('supervisor-queue').props).toMatchObject({
   'data-center':'centre-a','data-child':'synthetic-child','data-service':'speech'
  });
 });
});
