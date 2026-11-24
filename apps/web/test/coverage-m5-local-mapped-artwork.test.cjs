const React=require('react');
const {act,create}=require('react-test-renderer');
jest.mock('@/lib/activity-media',()=>({activityMediaDrafts:{list:jest.fn()}}));
const {activityMediaDrafts}=require('@/lib/activity-media');
const {LocalMappedArtworkReview}=require('../src/components/clinical/LocalMappedArtworkReview');
const template={id:'t',version:7,service:'speech',steps:['Match a card.','']};
const asset={referenceId:'WU2A-S1-SPEECH',family:'speech',scene:'therapist-guided',reviewSha256:'a'.repeat(64),alt:'Fictional reference'};
const previews=[{asset,url:'blob:verified-local'}];
const draft={id:'d',centerId:'c',templateId:'t',templateVersion:7,state:'DRAFT',sourceType:'GENERATED',styleVersion:'m5-b-v1',stepNumber:1,sceneType:asset.scene,sourceReference:'m5-b-v1:'+asset.referenceId+':sha256:'+asset.reviewSha256};
const page=(items=[draft],hasMore=false,nextCursor=null)=>({items,hasMore,nextCursor,publishEnabled:false,clinicalReleaseEnabled:false});
let tree;
const render=async(t=template,p=previews)=>act(async()=>{tree=create(React.createElement(LocalMappedArtworkReview,{centerId:'c',template:t,previews:p}));});
const check=async()=>act(async()=>{tree.root.findByType('button').props.onClick();await Promise.resolve();});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}activityMediaDrafts.list.mockReset();});
test('explicitly reads saved metadata, displays exact local reference and authored instruction',async()=>{
 await render();expect(activityMediaDrafts.list).not.toHaveBeenCalled();
 activityMediaDrafts.list.mockResolvedValueOnce(page());await check();
 expect(activityMediaDrafts.list).toHaveBeenCalledWith('c','t',undefined,100);
 expect(tree.root.findByType('img').props.src).toBe('blob:verified-local');
 expect(JSON.stringify(tree.toJSON())).toContain('Match a card.');
 expect(JSON.stringify(tree.toJSON())).toContain('Not approved');
 activityMediaDrafts.list.mockResolvedValueOnce(page([{...draft,stepNumber:null}]));
 await check();expect(JSON.stringify(tree.toJSON())).toContain('Whole activity');
});
test('reject stale, rejected, altered, wrong scene, wrong source/style and missing authored step',async()=>{
 await render();
 activityMediaDrafts.list.mockResolvedValueOnce(page([
 {...draft,id:'a',state:'REJECTED'},{...draft,id:'b',templateVersion:6},
 {...draft,id:'c',sourceReference:'forged'},{...draft,id:'e',sceneType:'other'},
 {...draft,id:'f',sourceType:'ORIGINAL'},{...draft,id:'g',styleVersion:'other'},
 {...draft,id:'h',stepNumber:2},{...draft,id:'i',stepNumber:0},{...draft,id:'j',stepNumber:65}
 ]));await check();
 expect(tree.root.findAllByType('img')).toHaveLength(0);
 expect(JSON.stringify(tree.toJSON())).toContain('No matching current-version');
});
test('complete paginated history or no display; failed refresh removes prior images',async()=>{
 await render();
 activityMediaDrafts.list.mockResolvedValueOnce(page([draft],true,'d')).mockResolvedValueOnce(page([{...draft,id:'e',stepNumber:null}]));
 await check();expect(tree.root.findAllByType('img')).toHaveLength(2);
 activityMediaDrafts.list.mockResolvedValueOnce(page([draft],true,'d')).mockRejectedValueOnce(Error('denied'));
 await check();expect(tree.root.findAllByType('img')).toHaveLength(0);expect(tree.root.findByProps({role:'alert'})).toBeTruthy();
});
test.each([
 {...page(),publishEnabled:true},{...page(),clinicalReleaseEnabled:true},
 page([{...draft,centerId:'foreign'}]),page([{...draft,templateId:'foreign'}]),
 page([draft,draft]),page([draft],true,'other'),page([draft],false,'d'),
 {...page(),items:null}
])('reject unsafe history %j',async response=>{
 await render();activityMediaDrafts.list.mockResolvedValueOnce(response);await check();
 expect(tree.root.findAllByType('img')).toHaveLength(0);expect(tree.root.findByProps({role:'alert'})).toBeTruthy();
});
test('bounded pagination fails closed',async()=>{
 await render();for(let i=0;i<10;i++)activityMediaDrafts.list.mockResolvedValueOnce(page([{...draft,id:'d'+i}],true,'d'+i));
 await check();expect(tree.root.findAllByType('img')).toHaveLength(0);expect(activityMediaDrafts.list).toHaveBeenCalledTimes(10);
});
test('cleared local collection removes images even if metadata is retained',async()=>{
 await render();activityMediaDrafts.list.mockResolvedValueOnce(page());await check();
 await act(async()=>tree.update(React.createElement(LocalMappedArtworkReview,{centerId:'c',template,previews:[]})));
 expect(tree.root.findAllByType('img')).toHaveLength(0);
});
test('missing version blocks reads; pending request invalidated on unmount',async()=>{
 await render({...template,version:undefined});await check();expect(activityMediaDrafts.list).not.toHaveBeenCalled();
 await act(async()=>tree.update(React.createElement(LocalMappedArtworkReview,{centerId:'c',template,previews})));
 let finish;activityMediaDrafts.list.mockReturnValueOnce(new Promise(r=>{finish=r;}));await check();
 expect(tree.root.findByType('button').props.disabled).toBe(true);
 await act(async()=>tree.unmount());tree=null;await act(async()=>finish(page()));
});
