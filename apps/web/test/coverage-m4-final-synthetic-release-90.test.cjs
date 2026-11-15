// M4-08: execute synthetic-only release user-flow branches, never clinical
// signing or real guardian releases. All access decisions are server-side.
const React=require('react'), Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/components/design/ui',()=>({
 Card:({children,testId})=>h('section',{'data-testid':testId},children),
 Button:({children,onClick,disabled})=>h('button',{onClick,disabled},children)
}));
jest.mock('@/lib/family-releases',()=>({familyReleaseApi:{
 approve:jest.fn(),recipients:jest.fn(),grantsForApproval:jest.fn(),
 grant:jest.fn(),change:jest.fn()
}}));
const {familyReleaseApi:api}=require('../src/lib/family-releases');
const {SyntheticReleaseActions}=require('../src/components/clinical/SyntheticReleaseActions');
const document={status:'IN_REVIEW'};
const history=[{fromStatus:'DRAFT',toStatus:'IN_REVIEW',snapshotId:'synthetic-snapshot'}];
const approved={id:'synthetic-approval'};
const recipient={id:'guardian-fictional',displayName:'Synthetic Guardian',eligible:true};
let tree;
const mount=async(d=document,hs=history)=>act(async()=>{tree=create(h(SyntheticReleaseActions,{
 centerId:'center-a',document:d,history:hs
}));});
const buttons=()=>tree.root.findAllByType('button');
const button=(text)=>buttons().find(x=>String(x.props.children).includes(text));
const click=async text=>act(async()=>{button(text).props.onClick();await Promise.resolve();});
const select=async id=>act(async()=>{tree.root.findByProps({id}).props.onChange({target:{value:id==='family-release-guardian'?'guardian-fictional':''}});});
const view=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();api.approve.mockResolvedValue(approved);
 api.recipients.mockResolvedValue({items:[recipient]});
 api.grantsForApproval.mockResolvedValue({items:[]});
 api.grant.mockResolvedValue({id:'synthetic-grant'});
 api.change.mockResolvedValue({});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 rendered synthetic family-release state boundaries',()=>{
 it('renders no release controls outside in-review status',async()=>{
  await mount({status:'DRAFT'});expect(tree.toJSON()).toBeNull();
 });
 it('blocks in-review documents without a valid submission transition',async()=>{
  await mount(document,[]);expect(tree.toJSON()).toBeNull();
 });
 it('cannot mistake a finished review transition for a fresh submission',async()=>{
  await mount(document,[{fromStatus:'APPROVED',toStatus:'IN_REVIEW'}]);
  expect(tree.toJSON()).toBeNull();
 });
 it('shows no recipients or release buttons before synthetic approval',async()=>{
  await mount();expect(view()).toContain('Clinical production signing and release remain disabled');
  expect(button('Approve family rendering')).toBeDefined();
  expect(button('Release approved version')).toBeUndefined();
 });
 it('a server approval rejection cannot create a synthetic guardian grant',async()=>{
  api.approve.mockRejectedValue(new Error('synthetic denied'));
  await mount();await click('Approve family rendering');
  expect(view()).toContain('Synthetic approval unavailable or denied');
  expect(api.grant).not.toHaveBeenCalled();
  expect(button('Release approved version')).toBeUndefined();
 });
 it('approval loads only server-confirmed eligible recipients',async()=>{
  await mount();await click('Approve family rendering');
  expect(api.approve).toHaveBeenCalledWith('center-a','synthetic-snapshot');
  expect(api.recipients).toHaveBeenCalledWith('center-a','synthetic-approval');
  expect(button('Release approved version').props.disabled).toBe(true);
  expect(view()).toContain('No production clinical signature was issued');
 });
 it('selecting an eligible recipient activates the explicit synthetic grant action',async()=>{
  await mount();await click('Approve family rendering');
  await select('family-release-guardian');
  expect(button('Release approved version').props.disabled).toBe(false);
  await click('Release approved version');
  expect(api.grant).toHaveBeenCalledWith('center-a','synthetic-approval','guardian-fictional');
  expect(button('Revoke')).toBeDefined();
 });
 it('rejected grant does not invent release state',async()=>{
  api.grant.mockRejectedValue(new Error('synthetic restriction'));
  await mount();await click('Approve family rendering');
  await select('family-release-guardian');await click('Release approved version');
  expect(view()).toContain('Release denied');
  expect(button('Revoke')).toBeUndefined();
 });
 it('restricted guardian without prior grant cannot be selected for new release',async()=>{
  api.recipients.mockResolvedValue({items:[{...recipient,eligible:false}]});
  await mount();await click('Approve family rendering');
  await select('family-release-guardian');
  expect(button('Release approved version').props.disabled).toBe(true);
 });
 it('existing recipient-specific grant is shown, not duplicated',async()=>{
  api.grantsForApproval.mockResolvedValue({items:[{id:'old-grant',guardianLinkId:'guardian-fictional',status:'ACTIVE'}]});
  await mount();await click('Approve family rendering');
  await select('family-release-guardian');
  expect(button('Release approved version').props.disabled).toBe(true);
  expect(button('Withdraw')).toBeDefined();
 });
 it('a revoked release clears actionable grant state',async()=>{
  await mount();await click('Approve family rendering');await select('family-release-guardian');
  await click('Release approved version');await click('Revoke');
  expect(api.change).toHaveBeenCalledWith('center-a','synthetic-grant','REVOKED','Synthetic clinical release correction');
  expect(button('Revoke')).toBeUndefined();
  expect(view()).toContain('Release revoked');
 });
 it('a replacement retains the existing release identity for later revocation',async()=>{
  await mount();await click('Approve family rendering');await select('family-release-guardian');
  await click('Release approved version');await click('Mark replaced');
  expect(api.change).toHaveBeenCalledWith('center-a','synthetic-grant','SUPERSEDED','Synthetic clinical release correction');
  expect(button('Revoke')).toBeDefined();
  expect(button('Mark replaced')).toBeUndefined();
 });
 it('a failed change never claims a successful revocation',async()=>{
  api.change.mockRejectedValue(new Error('synthetic failure'));
  await mount();await click('Approve family rendering');await select('family-release-guardian');
  await click('Release approved version');await click('Withdraw');
  expect(view()).toContain('Release change denied');
  expect(button('Revoke')).toBeDefined();
 });
 it('grant handler itself refuses an empty recipient even if invoked programmatically',async()=>{
  await mount();await click('Approve family rendering');
  await click('Release approved version');
  expect(api.grant).not.toHaveBeenCalled();
  expect(api.grantsForApproval).toHaveBeenCalledTimes(1);
 });
 it('a denied grant refresh displays an actionable error without changing access state',async()=>{
  api.grantsForApproval.mockRejectedValueOnce(new Error('synthetic unavailable'));
  await mount();await click('Approve family rendering');
  expect(view()).toContain('Synthetic approval unavailable or denied');
  // The approval ID may be set before the grant-list request fails; the
  // release control must remain disabled without a selected recipient.
  expect(button('Release approved version').props.disabled).toBe(true);
  expect(api.grant).not.toHaveBeenCalled();
 });
 it('failed grant reload leaves existing release identity unchanged',async()=>{
  await mount();await click('Approve family rendering');await select('family-release-guardian');
  await click('Release approved version');
  api.grantsForApproval.mockRejectedValueOnce(new Error('synthetic reload denial'));
  await click('Reload existing grants');
  expect(view()).toContain('Unable to reload grants');
  expect(button('Revoke')).toBeDefined();
 });
 it('withdrawal always clears previously recorded release identity',async()=>{
  await mount();await click('Approve family rendering');await select('family-release-guardian');
  await click('Release approved version');await click('Withdraw');
  expect(api.change).toHaveBeenCalledWith('center-a','synthetic-grant','WITHDRAWN','Synthetic clinical release correction');
  expect(button('Revoke')).toBeUndefined();
 });
});
