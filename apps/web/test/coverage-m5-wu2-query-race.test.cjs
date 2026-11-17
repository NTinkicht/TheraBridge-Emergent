// M5-07: real shared loader generations must not revive stale A after A->B->A.
const React=require('react');
const {act,create}=require('react-test-renderer');
const h=React.createElement;
const {useLoad}=require('../src/components/centers/kit');
const onError=()=>{throw Error('synthetic failure');};
function BoundProjection({query,request}){
 const fetcher=React.useCallback(async()=>({query,result:await request(query)}),[query,request]);
 const {data,failed}=useLoad(fetcher,onError);
 return h('output',{'data-testid':'projection'},!failed&&data?.query===query?data.result:'NOT_CURRENT');
}
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
let tree;
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M5-07 request identity and out-of-order tenant-filter projections',()=>{
 it('rejects old A and B responses after selecting A, B, then A again',async()=>{
  const first=deferred(),second=deferred(),third=deferred();
  const pending=[first,second,third];
  const request=jest.fn(()=>pending.shift().promise);
  await act(async()=>{tree=create(h(BoundProjection,{query:'center:A',request}));});
  await act(async()=>tree.update(h(BoundProjection,{query:'center:B',request})));
  await act(async()=>tree.update(h(BoundProjection,{query:'center:A',request})));
  await act(async()=>first.resolve('A stale'));
  expect(tree.root.findByType('output').props.children).toBe('NOT_CURRENT');
  await act(async()=>second.resolve('B stale'));
  expect(tree.root.findByType('output').props.children).toBe('NOT_CURRENT');
  await act(async()=>third.resolve('A current'));
  expect(tree.root.findByType('output').props.children).toBe('A current');
  expect(request).toHaveBeenCalledTimes(3);
 });
});
