// Stage 2 mounted actual report drafts: role-based creation, validation,
// exact child/service scope and historical pagination error/duplicate safety.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let mockData,mockFailed,mockReload;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 React.createElement('a',{href,...props},children)}));
jest.mock('@/components/centers/kit',()=>{
 const actual=jest.requireActual('@/components/centers/kit');
 return {...actual,useLoad:()=>({data:mockData,failed:mockFailed,reload:mockReload}),
 SelectField:({value,onChange,options,testId})=>React.createElement('select',{
  value,'data-testid':testId,onChange:e=>onChange(e.target.value)},
  options.map(o=>React.createElement('option',{value:o.value,key:o.value},o.label)))};
});
jest.mock('@/lib/reports',()=>{
 const actual=jest.requireActual('@/lib/reports');
 return {...actual,reportsApi:{...actual.reportsApi,list:jest.fn(),create:jest.fn()}};
});
const {reportsApi}=require('../src/lib/reports');
const {ReportsPanel}=require('../src/components/clinical/ReportsPanel');
const child=(extra={})=>({
 synthetic:true,canEdit:true,canReview:false,
 child:{id:'fictional-child',name:'Fictional Alex',services:['speech','ot']},
 assessments:[],plans:[],notes:[],observations:[],appointments:[],templates:[],...extra
});
const row=(id,extra={})=>({id,title:'Synthetic report '+id,
 service:'speech',periodStart:'2026-11-01',periodEnd:'2026-11-10',
 author:'Fictional Clinician',versions:1,status:'DRAFT',...extra});
let tree=null,run,onError;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>get(id).props.onClick());
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const html=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();mockFailed=false;mockReload=jest.fn(async()=>{});
 mockData={items:[row('r1')],hasMore:false,nextOffset:null};
 run=jest.fn(async fn=>{try{await fn();return true;}catch{return false;}});
 onError=jest.fn();reportsApi.create.mockResolvedValue({id:'created'});
 reportsApi.list.mockResolvedValue({items:[],hasMore:false,nextOffset:null});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const mount=async(ws=child())=>act(async()=>{tree=create(h(ReportsPanel,{
 centerId:'c1',ws,run,onError}));});
describe('Stage 2 source-scoped reports panel history and creation',()=>{
 it('renders only the actual authorized report list and no creation controls for read-only roles',async()=>{
  await mount(child({canEdit:false}));
  expect(get('report-row-r1')).toBeTruthy();
  expect(get('report-open-r1').props.href).toBe('/app/reports/r1');
  expect(find('report-form')).toHaveLength(0);
  expect(reportsApi.create).not.toHaveBeenCalled();
 });
 it('never fabricates a report if server returns empty records',async()=>{
  mockData={items:[],hasMore:false,nextOffset:null};
  await mount();
  expect(get('reports-empty')).toBeTruthy();
  expect(find('report-row-r1')).toHaveLength(0);
 });
 it('rejects inverted report period before calling the API',async()=>{
  await mount();
  await change('report-from','2026-12-31');
  await change('report-to','2026-11-01');
  await click('report-create');
  expect(reportsApi.create).not.toHaveBeenCalled();
  expect(run.mock.calls[0][1]).toBe('');
 });
 it('creates a draft for only the selected child and service, then reloads saved evidence',async()=>{
  await mount();
  await change('report-service','ot');
  await change('report-title','Synthetic occupational report');
  await change('report-from','2026-11-01');
  await change('report-to','2026-11-10');
  await click('report-create');
  expect(reportsApi.create).toHaveBeenCalledWith('c1','fictional-child',
   {service:'ot',title:'Synthetic occupational report',
    periodStart:'2026-11-01',periodEnd:'2026-11-10'});
  expect(mockReload).toHaveBeenCalledTimes(1);
  expect(run).toHaveBeenCalledWith(expect.any(Function),
   'Report draft started from recorded data.');
 });
 it('loads older reports with exact offset, removing duplicate records already in fresh list',async()=>{
  mockData={items:[row('r1')],hasMore:true,nextOffset:1};
  reportsApi.list.mockResolvedValue({items:[row('r1'),row('r2',{versions:2,status:'IN_REVIEW'})],
   hasMore:false,nextOffset:null});
  await mount();await click('reports-load-more');
  expect(reportsApi.list).toHaveBeenCalledWith('c1','fictional-child',1);
  expect(find('report-row-r1')).toHaveLength(1);
  expect(find('report-row-r2')).toHaveLength(1);
  expect(html()).toContain('2 saved versions');
  expect(find('reports-load-more')).toHaveLength(0);
 });
 it('shows non-fatal older report fetch error and preserves already loaded row',async()=>{
  mockData={items:[row('r1')],hasMore:true,nextOffset:1};
  reportsApi.list.mockRejectedValueOnce(new Error('Synthetic pagination failed'));
  await mount();await click('reports-load-more');
  expect(get('reports-load-error')).toBeTruthy();
  expect(get('report-row-r1')).toBeTruthy();
  await click('reports-load-more');
  expect(reportsApi.list).toHaveBeenCalledTimes(2);
 });
 it('distinguishes fetch error from loading and avoids creating default results',async()=>{
  mockData=null;await mount();
  expect(get('reports-loading')).toBeTruthy();
  expect(find('report-row-r1')).toHaveLength(0);
  await act(async()=>{mockFailed=true;tree.update(h(ReportsPanel,{
   centerId:'c1',ws:child(),run,onError}));});
  expect(get('reports-error')).toBeTruthy();
 });
});