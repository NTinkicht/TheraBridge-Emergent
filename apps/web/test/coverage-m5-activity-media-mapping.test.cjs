const React = require('react');
const {act,create}=require('react-test-renderer');
jest.mock('@/lib/activity-media',()=>({activityMediaDrafts:{mapping:jest.fn()}}));
jest.mock('@/components/design/ui',()=>({Button:({children,...props})=>React.createElement('button',props,children)}));
const {activityMediaDrafts}=require('@/lib/activity-media');
const {ActivityMediaMappingStatus}=require('../src/components/clinical/ActivityMediaMappingStatus');
let tree;
const good={templateVersion:7,slots:[{stepNumber:null,proposed:2,staged:1},{stepNumber:1,proposed:0,staged:0}],metadataOnly:true,readEnabled:false,publishEnabled:false,clinicalReleaseEnabled:false};
const render=async(version=7)=>act(async()=>{tree=create(React.createElement(ActivityMediaMappingStatus,{centerId:'c',templateId:'t',templateVersion:version}));});
const click=async()=>act(async()=>{tree.root.findByType('button').props.onClick();await Promise.resolve();});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}activityMediaDrafts.mapping.mockReset();});
test('loads persisted counts only on request and clearly denies approval',async()=>{
 await render();expect(activityMediaDrafts.mapping).not.toHaveBeenCalled();
 activityMediaDrafts.mapping.mockResolvedValueOnce(good);await click();
 expect(activityMediaDrafts.mapping).toHaveBeenCalledWith('c','t');
 expect(tree.root.findAllByType('li')).toHaveLength(2);
 expect(JSON.stringify(tree.toJSON())).toContain('Not approved');
 expect(JSON.stringify(tree.toJSON())).toContain('Whole activity');
 expect(tree.root.findAllByType('img')).toHaveLength(0);
});
test.each([{templateVersion:6},{metadataOnly:false},{readEnabled:true},{publishEnabled:true},{clinicalReleaseEnabled:true}])('fails closed for changed permission or version %j',async patch=>{
 await render();activityMediaDrafts.mapping.mockResolvedValueOnce({...good,...patch});await click();
 expect(tree.root.findAllByType('li')).toHaveLength(0);expect(tree.root.findByProps({role:'alert'})).toBeTruthy();
 activityMediaDrafts.mapping.mockResolvedValueOnce(good);await click();expect(tree.root.findAllByType('li')).toHaveLength(2);
});
test('handles failed refresh without retaining prior rows',async()=>{
 await render();activityMediaDrafts.mapping.mockResolvedValueOnce(good);await click();
 activityMediaDrafts.mapping.mockRejectedValueOnce(Error('denied'));await click();
 expect(tree.root.findAllByType('li')).toHaveLength(0);expect(tree.root.findByProps({role:'alert'})).toBeTruthy();
});
test('disables during request and ignores completion after unmount',async()=>{
 await render();let resolve;activityMediaDrafts.mapping.mockReturnValueOnce(new Promise(r=>{resolve=r;}));await click();
 expect(tree.root.findByType('button').props.disabled).toBe(true);
 await act(async()=>tree.unmount());tree=null;await act(async()=>resolve(good));
});
