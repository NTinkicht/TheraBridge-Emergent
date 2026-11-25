const React=require('react');
const {act,create}=require('react-test-renderer');
jest.mock('@/lib/activity-media',()=>({activityMediaDrafts:{readApprovedArtwork:jest.fn()}}));
jest.mock('@/components/design/ui',()=>({...jest.requireActual('@/components/design/ui'),Button:({children,...p})=>React.createElement('button',p,children)}));
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

test.each([{height:299},{altText:''},{altText:'x'.repeat(601)},{altText:null},{pngBase64:null},{pngBase64:'A'.repeat(699056)},{pngBase64:'AAA'},{pngBase64:'AAAA'},{pngBase64:Buffer.alloc(33).toString('base64')}])('rejects further invalid image metadata %j',async patch=>{
 await render();activityMediaDrafts.readApprovedArtwork.mockResolvedValueOnce({...good,...patch});await click();
 expect(tree.root.findAllByType('img')).toHaveLength(0);expect(createUrl).not.toHaveBeenCalled();
});
test('numbered step shows a loading state then image failure and cleanup',async()=>{
 await act(async()=>{tree=create(React.createElement(StaffArtworkImage,{scope,slot:1}));});
 let resolve;activityMediaDrafts.readApprovedArtwork.mockReturnValueOnce(new Promise(r=>{resolve=r;}));await click();
 expect(JSON.stringify(tree.toJSON())).toContain('Checking illustration');
 await act(async()=>resolve({...good,stepNumber:1}));expect(tree.root.findByType('img')).toBeTruthy();
 await act(async()=>tree.root.findByType('img').props.onError());expect(tree.root.findAllByType('img')).toHaveLength(0);
 await click();expect(revokeUrl).toHaveBeenCalledWith('blob:private-test');
});

test.each(['grid','list'])('catalogue %s private artwork expands without clipping its controls or notice',async layout=>{
 const {ActivityCard}=require('../src/components/clinical/ActivityCard');
 const t={id:'t',title:'Private synthetic test',service:'speech',ageBand:'sample',minutes:10,materials:[],steps:[],safety:[]};
 await act(async()=>{tree=create(React.createElement(ActivityCard,{t,visual:true,compact:true,layout,artworkScope:scope}));});
 const media=tree.root.findByProps({'data-testid':'activity-media-placeholder-t'});
 expect(media.props.className).not.toMatch(/overflow-hidden|max-h-|aspect-\[/);
 expect(media.props.className).toContain('p-3');
 expect(activityMediaDrafts.readApprovedArtwork).not.toHaveBeenCalled();
 activityMediaDrafts.readApprovedArtwork.mockResolvedValueOnce(good);
 await act(async()=>{media.findByType('button').props.onClick();await Promise.resolve();});
 expect(media.findByType('img').props.alt).toBe('Signed art');
 expect(media.findByType('button').props.children).toBe('Close illustration');
 expect(JSON.stringify(tree.toJSON())).toContain('Private staff preview · not released to families');
 await act(async()=>media.findByType('button').props.onClick());
 expect(media.findAllByType('img')).toHaveLength(0);
 expect(revokeUrl).toHaveBeenCalledWith('blob:private-test');
});
