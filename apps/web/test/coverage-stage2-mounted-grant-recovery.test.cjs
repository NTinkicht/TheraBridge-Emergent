// M4-08 Stage 2: execute real synthetic release-recovery actions without
// permitting clinical signing, approval, new release or an access grant.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/lib/family-releases',()=>{
 const real=jest.requireActual('@/lib/family-releases');
 return {...real,familyReleaseApi:{...real.familyReleaseApi,
  recoverGrants:jest.fn(),change:jest.fn()}};
});
const {familyReleaseApi}=require('../src/lib/family-releases');
const {SyntheticGrantRecovery}=require('../src/components/clinical/SyntheticGrantRecovery');
const grant=(extra={})=>({
 id:'grant-fictional',approvalId:'approval-fictional',guardianLinkId:'guardian-fictional',
 status:'ACTIVE',childId:'child-fictional',childName:'Fictional Alex',
 guardianName:'Fictional Parent',...extra
});
let tree;
const render=async(centerId='center-a')=>act(async()=>{
 tree=create(h(SyntheticGrantRecovery,{centerId}));
});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const get=id=>tree.root.findByProps({'data-testid':id});
const button=label=>tree.root.findAllByType('button').find(b=>
 typeof b.props.children==='string'&&b.props.children===label);
const click=async label=>act(async()=>{button(label).props.onClick();await Promise.resolve();});
const html=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();
 familyReleaseApi.recoverGrants.mockReset();
 familyReleaseApi.change.mockReset();
 familyReleaseApi.recoverGrants.mockResolvedValue({items:[grant()]});
 familyReleaseApi.change.mockResolvedValue({});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real scoped synthetic grant revocation and withdrawal recovery',()=>{
 it('shows no release controls until an authorized server list is returned',async()=>{
  familyReleaseApi.recoverGrants.mockRejectedValue(new Error('Synthetic denied'));
  await render();
  expect(find('synthetic-grant-recovery')).toHaveLength(0);
  expect(familyReleaseApi.change).not.toHaveBeenCalled();
 });
 it('shows exact returned center-scoped grant, but no clinical approval control',async()=>{
  await render();
  expect(familyReleaseApi.recoverGrants).toHaveBeenCalledWith('center-a');
  expect(get('synthetic-grant-recovery')).toBeTruthy();
  expect(html()).toContain('Fictional Alex');
  expect(html()).toContain('Fictional Parent');
  expect(html()).toContain('synthetic only');
  expect(html()).not.toContain('Approve and release');
 });
 it('revokes grant using the exact center and id, then refreshes server truth',async()=>{
  familyReleaseApi.recoverGrants.mockResolvedValueOnce({items:[grant()]})
   .mockResolvedValueOnce({items:[grant({status:'REVOKED'})]});
  await render();await click('Revoke');
  expect(familyReleaseApi.change).toHaveBeenCalledWith('center-a','grant-fictional',
   'REVOKED','Synthetic family release correction');
  expect(familyReleaseApi.recoverGrants).toHaveBeenCalledTimes(2);
  expect(html()).toContain('Grant revoked.');
  expect(tree.root.findAllByType('p').flatMap(p=>Array.isArray(p.props.children)?p.props.children:[])).toContain('revoked');
 });
 it('withdraws existing grant without any new approval or release mutation',async()=>{
  familyReleaseApi.recoverGrants.mockResolvedValueOnce({items:[grant()]})
   .mockResolvedValueOnce({items:[grant({status:'WITHDRAWN'})]});
  await render();await click('Withdraw');
  expect(familyReleaseApi.change).toHaveBeenCalledWith('center-a','grant-fictional',
   'WITHDRAWN','Synthetic family release correction');
  expect(html()).toContain('Grant withdrawn.');
  expect(tree.root.findAllByType('p').flatMap(p=>Array.isArray(p.props.children)?p.props.children:[])).toContain('withdrawn');
 });
 it('preserves evidence and error notice after rejected withdrawal',async()=>{
  familyReleaseApi.change.mockRejectedValue(new Error('Synthetic 403'));
  await render();await click('Withdraw');
  expect(html()).toContain('Unable to change grant');
  expect(html()).toContain('Fictional Parent');
  expect(familyReleaseApi.recoverGrants).toHaveBeenCalledTimes(1);
 });
 it('reloads the exact server list without inventing prior releases',async()=>{
  familyReleaseApi.recoverGrants.mockResolvedValueOnce({items:[grant()]})
   .mockResolvedValueOnce({items:[]});
  await render();await click('Reload grants');
  expect(html()).toContain('No accessible releases requiring correction');
  expect(html()).not.toContain('Fictional Parent');
 });
 it('shows a recoverable reload failure without replacing current grant',async()=>{
  familyReleaseApi.recoverGrants.mockResolvedValueOnce({items:[grant()]})
   .mockRejectedValueOnce(new Error('Synthetic outage'));
  await render();await click('Reload grants');
  expect(html()).toContain('Unable to reload grants.');
  expect(html()).toContain('Fictional Parent');
 });
});
