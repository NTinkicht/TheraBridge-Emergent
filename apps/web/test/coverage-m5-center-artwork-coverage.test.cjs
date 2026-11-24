const React=require('react');
const {act,create}=require('react-test-renderer');
jest.mock('@/lib/family-releases',()=>({familyReleaseApi:{centerArtworkCoverage:jest.fn()}}));
jest.mock('@/components/design/ui',()=>({Button:({children,...p})=>React.createElement('button',p,children)}));
const {CenterArtworkCoveragePanel}=require('../src/components/clinical/CenterArtworkCoveragePanel');
const {familyReleaseApi}=require('@/lib/family-releases');
const good={scope:'CENTER_ACTIVE_SYNTHETIC_PLAN_GRANTS',complete:true,reason:null,eligibleGrants:2,total:3,covered:2,percent:66,synthetic:true};
let tree;
const render=async()=>act(async()=>{tree=create(React.createElement(CenterArtworkCoveragePanel,{centerId:'c'}));});
const click=async()=>act(async()=>{tree.root.findByType('button').props.onClick();await Promise.resolve();});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}familyReleaseApi.centerArtworkCoverage.mockReset();});
test('requests on demand and shows actual centre coverage',async()=>{
 await render();expect(familyReleaseApi.centerArtworkCoverage).not.toHaveBeenCalled();
 familyReleaseApi.centerArtworkCoverage.mockResolvedValueOnce(good);await click();
 expect(familyReleaseApi.centerArtworkCoverage).toHaveBeenCalledWith('c');
 expect(JSON.stringify(tree.toJSON())).toContain('66%');
});
test.each([{scope:'global'},{synthetic:false},{percent:100},{covered:4},{total:null},{eligibleGrants:null},{reason:'INVALID_SOURCE'},{complete:false}])('rejects misleading results %j',async patch=>{
 await render();familyReleaseApi.centerArtworkCoverage.mockResolvedValueOnce({...good,...patch});await click();
 expect(JSON.stringify(tree.toJSON())).toContain('Coverage unavailable.');
});
test('shows no percentage for truncated and zero-denominator results',async()=>{
 await render();familyReleaseApi.centerArtworkCoverage.mockResolvedValueOnce({...good,complete:false,reason:'INVENTORY_LIMIT',total:null,covered:null,eligibleGrants:null,percent:null});await click();
 expect(JSON.stringify(tree.toJSON())).toContain('No partial percentage');
 familyReleaseApi.centerArtworkCoverage.mockResolvedValueOnce({...good,total:0,covered:0,eligibleGrants:0,percent:null});await click();
 expect(JSON.stringify(tree.toJSON())).toContain('No eligible activities');
});
test('scope change clears pending result',async()=>{
 await render();let resolve;familyReleaseApi.centerArtworkCoverage.mockReturnValueOnce(new Promise(r=>{resolve=r;}));await click();
 await act(async()=>tree.update(React.createElement(CenterArtworkCoveragePanel,{centerId:'other'})));
 await act(async()=>resolve(good));expect(JSON.stringify(tree.toJSON())).not.toContain('66%');
});
