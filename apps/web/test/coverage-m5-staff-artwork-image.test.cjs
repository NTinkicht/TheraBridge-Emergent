const React=require('react');
const {act,create}=require('react-test-renderer');
jest.mock('@/lib/activity-media',()=>({activityMediaDrafts:{readApprovedArtwork:jest.fn()}}));
jest.mock('@/components/design/ui',()=>({Button:({children,...p})=>React.createElement('button',p,children)}));
const {StaffArtworkImage}=require('../src/components/clinical/StaffArtworkImage');
const {activityMediaDrafts}=require('@/lib/activity-media');
const scope={centerId:'c',templateId:'t',version:7,actorKey:'actor'};
const bytes=Buffer.alloc(33);bytes.writeUInt32BE(0x89504e47,0);bytes.writeUInt32BE(0x0d0a1a0a,4);bytes.writeUInt32BE(400,16);bytes.writeUInt32BE(300,20);
const good={templateVersion:7,stepNumber:null,altText:'Signed art',width:400,height:300,pngBase64:bytes.toString('base64'),staffPreview:true,publishEnabled:false,clinicalReleaseEnabled:false};
let tree,createUrl,revokeUrl;
beforeEach(()=>{createUrl=jest.spyOn(URL,'createObjectURL').mockReturnValue('blob:private-test');revokeUrl=jest.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}jest.restoreAllMocks();activityMediaDrafts.readApprovedArtwork.mockReset();});
const render=async()=>act(async()=>{tree=create(React.createElement(StaffArtworkImage,{scope,slot:0}));});
const click=async()=>act(async()=>{tree.root.findByType('button').props.onClick();await Promise.resolve();});
test('explicit authorized preview, close clears image and revokes object URL',async()=>{
 await render();expect(activityMediaDrafts.readApprovedArtwork).not.toHaveBeenCalled();
 activityMediaDrafts.readApprovedArtwork.mockResolvedValueOnce(good);await click();
 expect(activityMediaDrafts.readApprovedArtwork).toHaveBeenCalledWith('c','t',7,0);
 expect(tree.root.findByType('img').props.alt).toBe('Signed art');
 await click();expect(tree.root.findAllByType('img')).toHaveLength(0);expect(revokeUrl).toHaveBeenCalledWith('blob:private-test');
});
test.each([{templateVersion:6},{stepNumber:1},{staffPreview:false},{publishEnabled:true},{clinicalReleaseEnabled:true},{pngBase64:'invalid'},{width:999}])('rejects mismatched preview %j',async patch=>{
 await render();activityMediaDrafts.readApprovedArtwork.mockResolvedValueOnce({...good,...patch});await click();
 expect(tree.root.findAllByType('img')).toHaveLength(0);expect(createUrl).not.toHaveBeenCalled();
});
test('actor change discards pending response',async()=>{
 await render();let resolve;activityMediaDrafts.readApprovedArtwork.mockReturnValueOnce(new Promise(r=>{resolve=r;}));await click();
 await act(async()=>tree.update(React.createElement(StaffArtworkImage,{scope:{...scope,actorKey:'other'},slot:0})));
 await act(async()=>resolve(good));expect(createUrl).not.toHaveBeenCalled();
 expect(tree.root.findAllByType('img')).toHaveLength(0);
});
