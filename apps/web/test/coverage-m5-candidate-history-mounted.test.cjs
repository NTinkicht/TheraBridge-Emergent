// M5-14: actual mounted private media candidate-status UX.
 // Real source execution, synthetic records only; no bytes, URLs or approvals.
const React=require('react');
const {act,create}=require('react-test-renderer');
const h=React.createElement;
jest.mock('@/lib/activity-media',()=>({activityMediaDrafts:{candidates:jest.fn()}}));
const {activityMediaDrafts:api}=require('../src/lib/activity-media');
const {ActivityMediaCandidateHistory}=require('../src/components/clinical/ActivityMediaCandidateHistory');
const item=(id='candidate-one',override={})=>({
  id,status:'QUARANTINED',templateVersion:2,width:1600,height:1200,
  revokedAt:null,createdAt:'2026-11-23T00:00:00.000Z',...override
});
const ok=(items=[],hasMore=false,nextCursor=null)=>({
  items,hasMore,nextCursor,metadataOnly:true,readEnabled:false,
  publishEnabled:false,clinicalReleaseEnabled:false,
});
let tree;
const output=()=>JSON.stringify(tree.toJSON());
const textOf=v=>typeof v==='string'?v:Array.isArray(v)?v.map(textOf).join(''):
  React.isValidElement(v)?textOf(v.props.children):'';
const button=word=>{
 const found=tree.root.findAllByType('button').find(x=>textOf(x.props.children).includes(word));
 if(!found)throw Error('Missing button '+word);
 return found;
};
const click=async word=>act(async()=>{button(word).props.onClick();await Promise.resolve();});
const mount=async()=>act(async()=>{tree=create(h(ActivityMediaCandidateHistory,{
  centerId:'center-a',templateId:'activity-a',draftId:'draft-a',
}));});
const cleanup=async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}};
beforeEach(()=>{jest.resetAllMocks();tree=null;api.candidates.mockResolvedValue(ok());});
afterEach(cleanup);

describe('M5-14 isolated candidate history status-only interface',()=>{
 it('is collapsed before a real scoped load; empty result stays unpublished',async()=>{
  await mount();
  expect(api.candidates).not.toHaveBeenCalled();
  expect(output()).not.toContain('No private candidates recorded');
  await click('Inspect private candidate statuses');
  expect(api.candidates).toHaveBeenCalledWith('center-a','activity-a','draft-a',undefined);
  expect(output()).toContain('No private candidates recorded');
  expect(output()).toContain('never displayed, approved or released');
  expect(output()).not.toContain('https://');
  await click('Hide private candidate statuses');
  expect(output()).not.toContain('No private candidates recorded');
 });
 it('renders quarantined and revoked statuses plus unknown and absent versions without URLs',async()=>{
  api.candidates.mockResolvedValue(ok([
   item('first'),item('second',{status:'REVOKED',revokedAt:'2026-11-23T01:00:00Z'}),
   item('third',{status:'BROKEN',templateVersion:null,width:64,height:64}),
  ]));
  await mount();await click('Inspect private candidate statuses');
  expect(tree.root.findAllByType('li')).toHaveLength(3);
  expect(output()).toContain('Quarantined');
  expect(output()).toContain('Revoked');
  expect(output()).toContain('Unrecognized / blocked');
  expect(output()).toContain('unknown');
  expect(output()).toContain('1600');
  expect(output()).not.toContain('encryptedBytes');
  expect(output()).not.toContain('digestSha256');
 });
 it('loads bounded older statuses, deduplicates rows and closes without publication',async()=>{
  api.candidates.mockResolvedValueOnce(ok([item('first')],true,'cursor-1'))
    .mockResolvedValueOnce(ok([
      item('first'),item('second',{status:'REVOKED',revokedAt:'2026-11-23T01:00:00Z'})
    ]));
  await mount();await click('Inspect private candidate statuses');
  expect(button('Load older candidate statuses').props.disabled).toBe(false);
  await click('Load older candidate statuses');
  expect(api.candidates).toHaveBeenLastCalledWith('center-a','activity-a','draft-a','cursor-1');
  expect(tree.root.findAllByType('li')).toHaveLength(2);
  expect(output()).toContain('Revoked');
  expect(output()).not.toContain('Load older candidate statuses');
 });
 it.each([
  ['missing metadataOnly', {metadataOnly:false}],
  ['readEnabled', {readEnabled:true}],
  ['publishEnabled', {publishEnabled:true}],
  ['clinicalReleaseEnabled', {clinicalReleaseEnabled:true}],
 ])('fails closed on unexpected rights response: %s',async(_,permissions)=>{
  api.candidates.mockResolvedValue({...ok([item()]),...permissions});
  await mount();await click('Inspect private candidate statuses');
  expect(output()).toContain('Could not load private candidate status');
  expect(tree.root.findAllByType('li')).toHaveLength(0);
  expect(output()).not.toContain('Quarantined');
 });
 it('retains a retryable error when a candidate metadata request fails',async()=>{
  api.candidates.mockRejectedValueOnce(new Error('Synthetic offline'))
    .mockResolvedValueOnce(ok([item('recovered')]));
  await mount();await click('Inspect private candidate statuses');
  expect(output()).toContain('Could not load private candidate status');
  await click('Hide private candidate statuses');
  await click('Inspect private candidate statuses');
  expect(output()).toContain('Quarantined');
  expect(api.candidates).toHaveBeenCalledTimes(2);
 });
 it('discards stale in-flight status responses after close and reopen',async()=>{
  let release;
  const delayed=new Promise(resolve=>{release=resolve;});
  api.candidates.mockImplementationOnce(()=>delayed)
    .mockResolvedValueOnce(ok([item('current')]));
  await mount();
  await act(async()=>{button('Inspect private candidate statuses').props.onClick();await Promise.resolve();});
  expect(output()).toContain('Loading candidate status');
  await click('Hide private candidate statuses');
  await click('Inspect private candidate statuses');
  await act(async()=>release(ok([item('stale-secret')])));
  expect(output()).not.toContain('stale-secret');
  expect(tree.root.findAllByType('li')).toHaveLength(1);
  expect(api.candidates).toHaveBeenCalledTimes(2);
 });
 it('does not issue duplicate older-page requests while already busy',async()=>{
  let release;
  const delayed=new Promise(resolve=>{release=resolve;});
  api.candidates.mockResolvedValueOnce(ok([item('first')],true,'cursor'))
    .mockImplementationOnce(()=>delayed);
  await mount();await click('Inspect private candidate statuses');
  await act(async()=>{button('Load older candidate statuses').props.onClick();await Promise.resolve();});
  expect(button('Load older candidate statuses').props.disabled).toBe(true);
  await act(async()=>{button('Load older candidate statuses').props.onClick();await Promise.resolve();});
  expect(api.candidates).toHaveBeenCalledTimes(2);
  await act(async()=>release(ok([item('second')])));
  expect(tree.root.findAllByType('li')).toHaveLength(2);
 });
 it('ignores an in-flight candidate result after unmount, without extra requests',async()=>{
  let release;
  api.candidates.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
  await mount();
  await act(async()=>{button('Inspect private candidate statuses').props.onClick();await Promise.resolve();});
  await cleanup();
  await act(async()=>release(ok([item('never-render')])));
  expect(api.candidates).toHaveBeenCalledTimes(1);
 });
});
