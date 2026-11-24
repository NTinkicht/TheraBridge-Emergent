// API helper integration tests: only scoped metadata, no media read URL.
const {rest}=require('../src/lib/auth');
const {activityMediaDrafts}=require('../src/lib/activity-media');
describe('M5-14 client candidate history URL construction',()=>{
 it('encodes all scoped ids and returns only the server metadata response',async()=>{
  const get=jest.spyOn(rest,'get').mockResolvedValueOnce({
    items:[],nextCursor:null,hasMore:false,metadataOnly:true,readEnabled:false,
    publishEnabled:false,clinicalReleaseEnabled:false,
  });
  try {
   const result=await activityMediaDrafts.candidates('center 1','activity/a','draft#1');
   expect(result.readEnabled).toBe(false);
   expect(get).toHaveBeenCalledWith('/api/centers/center%201/activities/activity%2Fa/media-drafts/draft%231/candidates?limit=50');
  } finally {get.mockRestore();}
 });
 it('uses bounded explicit page size and encodes cursor in query',async()=>{
  const get=jest.spyOn(rest,'get').mockResolvedValueOnce({items:[],hasMore:false});
  try {
   await activityMediaDrafts.candidates('c','t','d','opaque/cursor',25);
   expect(get).toHaveBeenCalledWith('/api/centers/c/activities/t/media-drafts/d/candidates?limit=25&cursor=opaque%2Fcursor');
  }finally{get.mockRestore();}
 });
});
