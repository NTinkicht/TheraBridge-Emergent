// Stage 2 mounted guardian-facing synthetic document rendering.
// The real component must hide the feature on server denial, scope consent
// to child + purpose and never expose download or production release.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/lib/family-releases',()=>{
 const a=jest.requireActual('@/lib/family-releases');
 return {...a,familyReleaseApi:{...a.familyReleaseApi,
  mine:jest.fn(),read:jest.fn(),consent:jest.fn()}};
});
jest.mock('@/lib/operations',()=>{
 const a=jest.requireActual('@/lib/operations');
 return {...a,opsApi:{...a.opsApi,family:jest.fn()}};
});
const {familyReleaseApi}=require('../src/lib/family-releases');
const {opsApi}=require('../src/lib/operations');
const {ApiError}=require('../src/lib/api');
const {FamilyReleasedDocuments}=require('../src/components/clinical/FamilyReleasedDocuments');
let tree=null;
const view=()=>JSON.stringify(tree.toJSON());
const textOf=n=>typeof n==='string'?n:Array.isArray(n)?n.map(textOf).join(''):
 React.isValidElement(n)?textOf(n.props.children):'';
const button=label=>tree.root.findAllByType('button').find(b=>textOf(b.props.children).includes(label));
const click=async label=>act(async()=>{const b=button(label);if(!b)throw Error('Missing '+label);b.props.onClick();});
const get=id=>tree.root.findByProps({'data-testid':id});
const fakeChild={id:'child-1',name:'Fictional Alex',fullName:'Fictional Alex',
 relationship:'parent',upcoming:[],history:[],team:[],remindersEnabled:false,
 attendance:{attended:0,noShow:0,cancelled:0,days:30}};
const listing=()=>({items:[{id:'grant-1',kind:'PLAN',status:'ACTIVE',
 childId:'child-1',childName:'Fictional Alex'},
 {id:'grant-2',kind:'REPORT',status:'SUPERSEDED',
 childId:'child-1',childName:'Fictional Alex'}]});
beforeEach(()=>{
 jest.clearAllMocks();tree=null;
 familyReleaseApi.mine.mockResolvedValue(listing());
 opsApi.family.mockResolvedValue({center:{name:'Fictional Center'},children:[fakeChild]});
 familyReleaseApi.read.mockResolvedValue({childName:'Fictional Alex',replaced:false,
 rendering:{kind:'PLAN',title:'Fictional home plan',
 summary:'Parent-approved synthetic practice',
 goals:[{title:'Fictional counting'}],
 homeActivities:[{frequency:'Weekly',note:'Adult supervision'}]}});
 familyReleaseApi.consent.mockResolvedValue({});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const mount=async()=>act(async()=>{tree=create(h(FamilyReleasedDocuments,{centerId:'center-1'}));});
describe('Stage 2 released-document UI cannot bypass dual server flags',()=>{
 it('stays completely absent on 403 regardless of underlying document fixtures',async()=>{
  familyReleaseApi.mine.mockRejectedValue(new ApiError(403,'Feature gate disabled'));
  await mount();
  expect(tree.toJSON()).toBeNull();
  expect(familyReleaseApi.read).not.toHaveBeenCalled();
  expect(familyReleaseApi.consent).not.toHaveBeenCalled();
 });
 it('does not expose released documents on a failed family identity lookup',async()=>{
  opsApi.family.mockRejectedValue(new Error('Synthetic inaccessible center'));
  await mount();
  expect(tree.toJSON()).toBeNull();
  expect(familyReleaseApi.read).not.toHaveBeenCalled();
 });
 it('keeps an authorized empty list clearly empty, never inventing a plan',async()=>{
  familyReleaseApi.mine.mockResolvedValue({items:[]});
  await mount();
  expect(get('synthetic-family-documents')).toBeTruthy();
  expect(view()).toContain('No documents have been released to you');
  expect(button('View plan')).toBeUndefined();
 });
 it('records separate child-level plan/report consent and withdrawal commands',async()=>{
  await mount();
  await click('Consent to plans');
  expect(familyReleaseApi.consent).toHaveBeenCalledWith('center-1','child-1','FAMILY_PLAN',false);
  await click('Withdraw report consent');
  expect(familyReleaseApi.consent).toHaveBeenLastCalledWith('center-1','child-1','FAMILY_REPORT',true);
  expect(familyReleaseApi.read).not.toHaveBeenCalled();
 });
 it('shows a saved synthetic plan as view-only with no export controls',async()=>{
  await mount();await click('Fictional Alex — View plan');
  expect(familyReleaseApi.read).toHaveBeenCalledWith('center-1','grant-1');
  expect(get('family-released-rendering')).toBeTruthy();
  expect(view()).toContain('Fictional counting');
  expect(view()).toContain('Adult supervision');
  expect(view()).toContain('cannot be downloaded or exported');
  expect(view()).not.toContain('download=');
  await click('Close document');
  expect(tree.root.findAllByProps({'data-testid':'family-released-rendering'})).toHaveLength(0);
 });
 it('marks superseded rendering distinctly without treating it as the latest approval',async()=>{
  familyReleaseApi.read.mockResolvedValue({childName:'Fictional Alex',replaced:true,
   rendering:{kind:'REPORT',title:'Fictional report',familySummary:'Superseded fictional wording'}});
  await mount();await click('View report');
  expect(view()).toContain('Fictional report — replaced');
  expect(view()).toContain('Superseded fictional wording');
  expect(button('Download')).toBeUndefined();
 });
 it('clears stale selection and reports denial after a revoked grant',async()=>{
  familyReleaseApi.read.mockRejectedValue(new ApiError(403,'Grant revoked'));
  await mount();await click('View plan');
  expect(tree.root.findAllByProps({'data-testid':'family-released-rendering'})).toHaveLength(0);
  expect(view()).toContain('This document is no longer available');
  expect(familyReleaseApi.mine).toHaveBeenCalledTimes(2);
 });
 it('leaves saved consent unchanged and visible error on server rejection',async()=>{
  familyReleaseApi.consent.mockRejectedValue(new ApiError(403,'Consent rejected'));
  await mount();await click('Withdraw plan consent');
  expect(view()).toContain('This consent choice could not be saved');
  expect(familyReleaseApi.mine).toHaveBeenCalledTimes(1);
 });
});