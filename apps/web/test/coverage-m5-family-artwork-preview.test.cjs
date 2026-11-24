const React=require('react');
const {act,create}=require('react-test-renderer');
jest.mock('@/lib/family-releases',()=>({familyReleaseApi:{artwork:jest.fn()}}));
jest.mock('@/components/design/ui',()=>({Button:({children,...p})=>React.createElement('button',p,children)}));
const {FamilyArtworkPreview}=require('../src/components/clinical/FamilyArtworkPreview');
const {familyReleaseApi}=require('@/lib/family-releases');
const slot={slot:0,altText:'Signed art',instruction:null};
const manifest=[{activityIndex:0,slots:[slot]}];
const bytes=Buffer.alloc(33);bytes.writeUInt32BE(0x89504e47,0);bytes.writeUInt32BE(0x0d0a1a0a,4);bytes.writeUInt32BE(400,16);bytes.writeUInt32BE(300,20);
const good={activityIndex:0,slot:0,altText:slot.altText,width:400,height:300,pngBase64:bytes.toString('base64'),synthetic:true};
let tree,createUrl,revokeUrl;
beforeEach(()=>{createUrl=jest.spyOn(URL,'createObjectURL').mockReturnValue('blob:family-test');revokeUrl=jest.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}jest.restoreAllMocks();familyReleaseApi.artwork.mockReset();});
const props={centerId:'c',releaseId:'r',index:0,manifest};
const render=async(p={})=>act(async()=>{tree=create(React.createElement(FamilyArtworkPreview,{...props,...p}));});
const click=async()=>act(async()=>{tree.root.findByType('button').props.onClick();await Promise.resolve();});
test.each([null,[],Array(11).fill({}),[{activityIndex:0,slots:null}],[{activityIndex:0,slots:Array(66).fill(slot)}],
 [{activityIndex:0,slots:[null]}],[{activityIndex:0,slots:[slot,slot]}],[{activityIndex:0,slots:[{...slot,slot:65}]}],
 [{activityIndex:0,slots:[{...slot,slot:-1}]}],[{activityIndex:0,slots:[{...slot,slot:1.5}]}],
 [{activityIndex:0,slots:[{...slot,altText:null}]}],[{activityIndex:0,slots:[{...slot,instruction:9}]}]
].map(manifest=>[manifest]))('no request or controls for invalid manifest %j',async manifest=>{
 await render({manifest});expect(tree.root.findAllByType('button')).toHaveLength(0);expect(familyReleaseApi.artwork).not.toHaveBeenCalled();
});
test('whole activity preview loads only on request and cleans up',async()=>{
 await render();expect(familyReleaseApi.artwork).not.toHaveBeenCalled();let resolve;
 familyReleaseApi.artwork.mockReturnValueOnce(new Promise(r=>{resolve=r;}));await click();
 expect(JSON.stringify(tree.toJSON())).toContain('Checking illustration');
 await act(async()=>resolve(good));expect(tree.root.findByType('img').props.alt).toBe(slot.altText);
 await click();expect(revokeUrl).toHaveBeenCalledWith('blob:family-test');expect(tree.root.findAllByType('img')).toHaveLength(0);
});
test.each([{synthetic:false},{activityIndex:1},{slot:1},{altText:'Changed'},{width:399},{height:299},{pngBase64:null},{pngBase64:'A'.repeat(699056)},{pngBase64:'bad!'},{pngBase64:'AAAA'},{pngBase64:Buffer.alloc(33).toString('base64')}])('denies invalid response %j',async patch=>{
 await render();familyReleaseApi.artwork.mockResolvedValueOnce({...good,...patch});await click();
 expect(tree.root.findAllByType('img')).toHaveLength(0);expect(createUrl).not.toHaveBeenCalled();
});
test('step illustration and instruction, image error, and release switch',async()=>{
 await render({manifest:[{activityIndex:0,slots:[{...slot,slot:1,instruction:'Step instruction'}]}]});
 familyReleaseApi.artwork.mockResolvedValueOnce({...good,slot:1});await click();
 expect(JSON.stringify(tree.toJSON())).toContain('Step instruction');expect(tree.root.findByType('img')).toBeTruthy();
 await act(async()=>tree.root.findByType('img').props.onError());expect(tree.root.findAllByType('img')).toHaveLength(0);
 await act(async()=>tree.update(React.createElement(FamilyArtworkPreview,{...props,releaseId:'new'})));expect(revokeUrl).toHaveBeenCalledWith('blob:family-test');
 let resolve;familyReleaseApi.artwork.mockReturnValueOnce(new Promise(r=>{resolve=r;}));await click();
 await act(async()=>tree.update(React.createElement(FamilyArtworkPreview,{...props,releaseId:'another'})));
 await act(async()=>resolve(good));expect(tree.root.findAllByType('img')).toHaveLength(0);
});
