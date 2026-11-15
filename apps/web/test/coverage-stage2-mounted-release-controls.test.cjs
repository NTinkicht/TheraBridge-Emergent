// Stage 2: mount synthetic-only release controls against fake server states.
// This qualifies fail-closed eligibility, exact recipient grants, and withdrawal.
// No production signing, real patients or clinical authorization implied.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/lib/family-releases',()=>{
 const real=jest.requireActual('@/lib/family-releases');
 return {...real,familyReleaseApi:{...real.familyReleaseApi,
  approve:jest.fn(),grantsForApproval:jest.fn(),
  recipients:jest.fn(),grant:jest.fn(),change:jest.fn()}};
});
const {familyReleaseApi}=require('../src/lib/family-releases');
const {SyntheticReleaseActions}=require('../src/components/clinical/SyntheticReleaseActions');
const history=[{id:'h1',fromStatus:'DRAFT',toStatus:'IN_REVIEW',
 snapshotId:'synthetic-snapshot',createdAt:'2026-11-10T10:00:00Z'}];
const doc={id:'synthetic-report',status:'IN_REVIEW',childId:'fictional-child'};
let tree=null;
const textOf=v=>typeof v==='string'?v:Array.isArray(v)?v.map(textOf).join(''):
 React.isValidElement(v)?textOf(v.props.children):'';
const button=s=>tree.root.findAllByType('button').find(x=>textOf(x.props.children).includes(s));
const click=async name=>act(async()=>{const b=button(name);if(!b)throw Error('No '+name);b.props.onClick();});
const choose=async id=>act(async()=>tree.root.findByType('select').props.onChange({target:{value:id}}));
const html=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();
 familyReleaseApi.approve.mockResolvedValue({id:'approved-synthetic'});
 familyReleaseApi.grantsForApproval.mockResolvedValue({items:[]});
 familyReleaseApi.recipients.mockResolvedValue({items:[
  {id:'g-active',displayName:'Fictional Guardian',eligible:true},
  {id:'g-restricted',displayName:'Restricted Fictional Guardian',eligible:false}
 ]});
 familyReleaseApi.grant.mockResolvedValue({id:'grant-1'});
 familyReleaseApi.change.mockResolvedValue({});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const mount=async(args={})=>act(async()=>{tree=create(h(SyntheticReleaseActions,{
 centerId:'c1',document:doc,history,...args}));});
describe('Stage 2 synthetic-only approval and guardian grant policy gates',()=>{
 it('never opens action surface unless an actual review submission is recorded',async()=>{
  await mount({document:{...doc,status:'DRAFT'}});
  expect(tree.toJSON()).toBeNull();
  await act(async()=>tree.update(h(SyntheticReleaseActions,{
   centerId:'c1',document:doc,history:[]})));
  expect(tree.toJSON()).toBeNull();
  expect(familyReleaseApi.approve).not.toHaveBeenCalled();
 });
 it('cannot grant anything before server-controlled synthetic approval',async()=>{
  await mount();
  expect(html()).toContain('Clinical production signing and release remain disabled');
  expect(button('Release approved version')).toBeUndefined();
  expect(familyReleaseApi.grant).not.toHaveBeenCalled();
 });
 it('shows explicit refusal and no grant actions after denied server approval',async()=>{
  familyReleaseApi.approve.mockRejectedValue(new Error('Clinical gate remains closed'));
  await mount();await click('Approve family rendering');
  expect(html()).toContain('Synthetic approval unavailable or denied');
  expect(button('Release approved version')).toBeUndefined();
  expect(familyReleaseApi.grant).not.toHaveBeenCalled();
 });
 it('requires an explicitly eligible individual recipient for grant command',async()=>{
  await mount();await click('Approve family rendering');
  expect(familyReleaseApi.approve).toHaveBeenCalledWith('c1','synthetic-snapshot');
  expect(familyReleaseApi.recipients).toHaveBeenCalledWith('c1','approved-synthetic');
  expect(button('Release approved version').props.disabled).toBe(true);
  const select=tree.root.findByType('select');
  expect(select.findAllByType('option').find(o=>o.props.value==='g-restricted').props.disabled).toBe(true);
  await choose('g-active');
  expect(button('Release approved version').props.disabled).toBe(false);
  await click('Release approved version');
  expect(familyReleaseApi.grant).toHaveBeenCalledWith('c1','approved-synthetic','g-active');
  expect(html()).toContain('Synthetic recipient-specific grant recorded');
  expect(button('Revoke')).toBeDefined();
 });
 it('retains safe withdrawal of existing grant even after guardian becomes ineligible',async()=>{
  familyReleaseApi.grantsForApproval.mockResolvedValue({items:[
   {id:'grant-existing',guardianLinkId:'g-restricted',status:'ACTIVE'}]});
  await mount();await click('Approve family rendering');
  await choose('g-restricted');
  expect(button('Release approved version').props.disabled).toBe(true);
  expect(button('Withdraw')).toBeDefined();
  await click('Withdraw');
  expect(familyReleaseApi.change).toHaveBeenCalledWith('c1','grant-existing',
   'WITHDRAWN','Synthetic clinical release correction');
  expect(html()).toContain('Release withdrawn.');
  expect(familyReleaseApi.grant).not.toHaveBeenCalled();
 });
 it('reports server refusal of grant without a falsely created recipient grant',async()=>{
  familyReleaseApi.grant.mockRejectedValue(new Error('Guardian consent missing'));
  await mount();await click('Approve family rendering');await choose('g-active');
  await click('Release approved version');
  expect(html()).toContain('Release denied. Check guardian consent');
  expect(button('Revoke')).toBeUndefined();
  expect(button('Release approved version').props.disabled).toBe(false);
 });
 it('keeps precise revoke and supersede commands separate for existing active synthetic grants',async()=>{
  familyReleaseApi.grantsForApproval.mockResolvedValue({items:[
   {id:'g1',guardianLinkId:'g-active',status:'ACTIVE'}]});
  await mount();await click('Approve family rendering');await choose('g-active');
  await click('Mark replaced');
  expect(familyReleaseApi.change).toHaveBeenCalledWith('c1','g1',
   'SUPERSEDED','Synthetic clinical release correction');
  expect(button('Mark replaced')).toBeUndefined();
  expect(button('Revoke')).toBeDefined();
  await click('Revoke');
  expect(familyReleaseApi.change).toHaveBeenLastCalledWith('c1','g1',
   'REVOKED','Synthetic clinical release correction');
 });
});