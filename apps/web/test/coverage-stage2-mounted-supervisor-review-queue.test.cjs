// Stage 2: mounted source-executing supervisor review queue, not a
// synthetic approval path; server-side permissions remain authoritative.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('@/lib/reports',()=>{
 const real=jest.requireActual('@/lib/reports');
 return {...real,reportsApi:{...real.reportsApi,reviewQueue:jest.fn()}};
});
const {reportsApi}=require('../src/lib/reports');
const {SupervisorReviewQueue}=require('../src/components/clinical/SupervisorReviewQueue');
const row=(more={})=>({id:'r1',title:'Synthetic draft',childName:'Fictional Alex',
 service:'speech',author:'Fictional Leila',periodStart:'2026-10-01',
 periodEnd:'2026-10-31',...more});
const page=(more={})=>({items:[row()],page:1,total:1,filteredTotal:1,
 hasMore:false,...more});
let tree,errors;
const find=id=>tree.root.findAllByProps({'data-testid':id});
const get=id=>tree.root.findByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,value)=>act(async()=>{get(id).props.onChange({target:{value}});await Promise.resolve();});
const render=async(opts={})=>act(async()=>{tree=create(h(SupervisorReviewQueue,{
 centerId:'center-a',childId:'child-a',service:'speech',onError:errors,...opts
}));});
beforeEach(()=>{
 jest.clearAllMocks();reportsApi.reviewQueue.mockReset();
 reportsApi.reviewQueue.mockResolvedValue(page());
 errors=jest.fn(e=>{throw e;});
 jest.useFakeTimers();
});
afterEach(async()=>{
 if(tree){await act(async()=>tree.unmount());tree=null;}
 jest.useRealTimers();
});
describe('mounted supervisor report queue scoped source and paging',()=>{
 it('reads exact tenant/child/service review queue without release actions',async()=>{
  await render();
  expect(reportsApi.reviewQueue).toHaveBeenCalledWith('center-a',{
   childId:'child-a',service:'speech',search:undefined,page:1
  });
  expect(get('review-queue-row-r1')).toBeTruthy();
  expect(get('review-queue-open-r1').props.href).toBe('/app/reports/r1');
  expect(JSON.stringify(tree.toJSON())).toContain('not approved, signed or released');
 });
 it('paginates only when server has another page and keeps exact filters',async()=>{
  reportsApi.reviewQueue.mockImplementation(async(_center,params)=>params.page===2?
   page({page:2,items:[row({id:'r2'})],hasMore:false,total:2,filteredTotal:2}):
   page({items:[row()],hasMore:true,total:2,filteredTotal:2}));
  await render();
  expect(get('review-queue-next').props.disabled).toBe(false);
  await click('review-queue-next');
  expect(reportsApi.reviewQueue).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({childId:'child-a',service:'speech',page:2}));
  expect(get('review-queue-row-r2')).toBeTruthy();
  expect(get('review-queue-next').props.disabled).toBe(true);
  await click('review-queue-prev');
  expect(reportsApi.reviewQueue).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({page:1}));
 });
 it('debounces and trims search without changing source scope',async()=>{
  await render();await change('review-queue-search','  Fictional  ');
  await act(async()=>{jest.advanceTimersByTime(249);});
  expect(reportsApi.reviewQueue).toHaveBeenCalledTimes(1);
  await act(async()=>{jest.advanceTimersByTime(1);await Promise.resolve();});
  expect(reportsApi.reviewQueue).toHaveBeenLastCalledWith('center-a',
   {childId:'child-a',service:'speech',search:'Fictional',page:1});
 });
 it('shows server empty state without creating any phantom approval item',async()=>{
  reportsApi.reviewQueue.mockResolvedValue(page({
   items:[],total:0,filteredTotal:0
  }));
  await render();
  expect(get('review-queue-empty')).toBeTruthy();
  expect(find('review-queue-row-r1')).toHaveLength(0);
 });
 it('clears page index when clinical child or specialty changes',async()=>{
  reportsApi.reviewQueue.mockImplementation(async(_center,params)=>
   page({page:params.page,hasMore:params.page===1,total:2,filteredTotal:2}));
  await render();await click('review-queue-next');
  await act(async()=>tree.update(h(SupervisorReviewQueue,{
   centerId:'center-a',childId:'child-b',service:'ot',onError:errors
  })));
  expect(reportsApi.reviewQueue).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({childId:'child-b',service:'ot',page:1}));
 });
 it('rejects a failed queue fetch and retries the same authorized endpoint',async()=>{
  reportsApi.reviewQueue.mockRejectedValueOnce(new Error('synthetic denial'))
   .mockResolvedValueOnce(page());
  await render();
  expect(get('review-queue-error')).toBeTruthy();
  const retry=get('review-queue-error').findAllByType('button')[0];
  await act(async()=>{retry.props.onClick();await Promise.resolve();});
  expect(get('review-queue-row-r1')).toBeTruthy();
  expect(reportsApi.reviewQueue).toHaveBeenCalledTimes(2);
 });
});
