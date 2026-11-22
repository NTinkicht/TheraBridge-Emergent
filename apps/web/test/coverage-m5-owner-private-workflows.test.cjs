const React=require('react');
const Renderer=require('react-test-renderer');
const {act,create}=Renderer;
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
jest.mock('@/lib/operations',()=>{
 const real=jest.requireActual('@/lib/operations');
 return {...real,opsApi:{...real.opsApi,
  privateCare:jest.fn(),updatePrivateCare:jest.fn(),
  childPhotoCandidates:jest.fn(),privateChildPhoto:jest.fn(),uploadChildPhoto:jest.fn(),
  guardianPhotoCandidates:jest.fn(),guardianPrivatePhoto:jest.fn(),
  guardianReviewPhoto:jest.fn(),guardianPhotoConsent:jest.fn(),guardianPhotoRevoke:jest.fn()
 }};
});
const {opsApi}=require('../src/lib/operations');
const {PrivateCarePanel}=require('../src/components/operations/PrivateCarePanel');
const {ChildPhotoPanel}=require('../src/components/operations/ChildPhotoPanel');
const {GuardianPhotoConsent}=require('../src/components/operations/GuardianPhotoConsent');
const {PrivatePngCandidatePicker}=require('../src/components/operations/PrivatePngCandidatePicker');
const h=React.createElement;
let tree;
const id=x=>tree.root.findByProps({'data-testid':x});
const all=x=>tree.root.findAllByProps({'data-testid':x});
const flatten=n=>typeof n==='string'?n:Array.isArray(n)?n.map(flatten).join(''):n?flatten(n.children):'';
const visible=()=>flatten(tree.toJSON());
const mount=async(Component,props)=>{await act(async()=>{tree=create(h(Component,props));await Promise.resolve();});};
const click=async name=>act(async()=>{id(name).props.onClick();await Promise.resolve();});
const care=(extra={})=>({source:'FAMILY_REPORTED_UNVERIFIED',version:1,
  conditions:'Synthetic allergies',allergies:'Synthetic egg',medications:'Synthetic note',
  careNotes:'Synthetic routine',...extra});
beforeEach(()=>{
 jest.clearAllMocks();
 opsApi.privateCare.mockResolvedValue(care());
 opsApi.updatePrivateCare.mockResolvedValue(care({version:2,careNotes:'Updated'}));
 opsApi.childPhotoCandidates.mockResolvedValue({candidates:[],publicRelease:false});
 opsApi.privateChildPhoto.mockRejectedValue(new Error('no private approved photo'));
 opsApi.uploadChildPhoto.mockResolvedValue({id:'candidate-a',status:'QUARANTINED'});
 opsApi.guardianPhotoCandidates.mockResolvedValue({candidates:[]});
 opsApi.guardianPrivatePhoto.mockRejectedValue(new Error('not released'));
 opsApi.guardianReviewPhoto.mockResolvedValue({mimeType:'image/png',pngBase64:'aW1hZ2U='});
 opsApi.guardianPhotoConsent.mockResolvedValue({consentRecorded:true,privateReady:true});
 opsApi.guardianPhotoRevoke.mockResolvedValue({revoked:true});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=undefined;}});

describe('M5 owner private care/consent mounted source',()=>{
 test('care panel loads exact child, only editable by allowed manager and saves explicit version',async()=>{
  await mount(PrivateCarePanel,{centerId:'tenant1',childId:'child1',canEdit:true,active:true});
  expect(opsApi.privateCare).toHaveBeenCalledWith('tenant1','child1');
  expect(id('private-care-fields')).toBeTruthy();
  expect(visible()).toContain('unverified');
  await act(async()=>id('private-care-careNotes').props.onChange({target:{value:'Updated'}}));
  await click('private-care-save');
  expect(opsApi.updatePrivateCare).toHaveBeenCalledWith('tenant1','child1',expect.objectContaining({
    sourceAcknowledged:true,version:1,careNotes:'Updated'
  }));
  expect(id('private-care-saved')).toBeTruthy();
 });
 test('therapist read-only care context cannot submit, and denied fetch leaks no data',async()=>{
  await mount(PrivateCarePanel,{centerId:'tenant1',childId:'child1',canEdit:false,active:true});
  expect(id('private-care-conditions').props.disabled).toBe(true);
  expect(all('private-care-save')).toHaveLength(0);
  await act(async()=>tree.unmount());tree=undefined;
  opsApi.privateCare.mockRejectedValue(new Error('not authorized'));
  await mount(PrivateCarePanel,{centerId:'tenant2',childId:'child2',canEdit:true,active:false});
  expect(all('private-care-fields')).toHaveLength(0);
  expect(all('private-care-error').length).toBe(1);
  expect(visible()).not.toContain('Synthetic egg');
 });
 test('care save rejection keeps draft visible and never claims success',async()=>{
  opsApi.updatePrivateCare.mockRejectedValue(new Error('conflict'));
  await mount(PrivateCarePanel,{centerId:'tenant1',childId:'child1',canEdit:true,active:true});
  await click('private-care-save');
  expect(id('private-care-error')).toBeTruthy();
  expect(all('private-care-saved')).toHaveLength(0);
 });
 test('local private photo input rejects oversize and wrong format without calls',async()=>{
  const onStage=jest.fn();
  await mount(PrivatePngCandidatePicker,{label:'Select optional PNG',onStage});
  const input=id('private-png-candidate-file');
  await act(async()=>input.props.onChange({currentTarget:{
    files:[{type:'image/jpeg',size:11}],value:'never-persist'
  }}));
  expect(onStage).not.toHaveBeenCalled();
  expect(visible()).toContain('Nothing was uploaded');
  await act(async()=>input.props.onChange({currentTarget:{
    files:[{type:'image/png',size:512*1024+1}],value:'never-persist'
  }}));
  expect(onStage).not.toHaveBeenCalled();
 });
 test('bounded private photo input submits only base64 without retaining filename',async()=>{
  const onStage=jest.fn().mockResolvedValue({id:'quarantine',status:'QUARANTINED'});
  await mount(PrivatePngCandidatePicker,{label:'Select optional PNG',onStage});
  const input=id('private-png-candidate-file');
  const buffer=Buffer.alloc(64,7);
  const target={files:[{type:'image/png',size:buffer.length,
    arrayBuffer:async()=>Uint8Array.from(buffer).buffer}],value:'C:\\secret\\photo.png'};
  await act(async()=>{input.props.onChange({currentTarget:target});await Promise.resolve();});
  expect(target.value).toBe('');
  expect(onStage).toHaveBeenCalledWith(buffer.toString('base64'));
  expect(visible()).toContain('not authorized by this upload');
  expect(visible()).not.toContain('photo.png');
 });
 test('manager staff photo card displays no unconsented bytes; quarantine remains hidden',async()=>{
  opsApi.childPhotoCandidates.mockResolvedValue({candidates:[{
    id:'pending-id',status:'QUARANTINED',consentState:'PENDING'
  }]});
  await mount(ChildPhotoPanel,{centerId:'tenant1',childId:'child1',canManage:true,active:true});
  expect(id('child-photo-pending')).toBeTruthy();
  expect(all('child-consented-photo')).toHaveLength(0);
  expect(id('private-png-candidate-picker')).toBeTruthy();
  expect(opsApi.childPhotoCandidates).toHaveBeenCalledWith('tenant1','child1');
 });
 test('linked guardian sees pending photo, cannot consent before review and checkbox',async()=>{
  opsApi.guardianPhotoCandidates.mockResolvedValue({candidates:[{id:'candidate-1',
    status:'QUARANTINED',consentState:'PENDING'}]});
  await mount(GuardianPhotoConsent,{centerId:'tenant1',childId:'child1'});
  expect(all('guardian-private-photo')).toHaveLength(0);
  await click('guardian-review-photo-candidate-1');
  expect(id('guardian-photo-review-preview')).toBeTruthy();
  expect(id('guardian-photo-approve').props.disabled).toBe(true);
  expect(opsApi.guardianPhotoConsent).not.toHaveBeenCalled();
  await act(async()=>id('guardian-photo-consent-confirm').props.onChange({target:{checked:true}}));
  await click('guardian-photo-approve');
  expect(opsApi.guardianPhotoConsent).toHaveBeenCalledWith('tenant1','child1','candidate-1',true);
 });
 test('guardian can refuse and purge without previewing another child',async()=>{
  opsApi.guardianPhotoCandidates.mockResolvedValue({candidates:[{id:'candidate-2',
    status:'QUARANTINED',consentState:'PENDING'}]});
  await mount(GuardianPhotoConsent,{centerId:'tenant2',childId:'child2'});
  await click('guardian-review-photo-candidate-2');
  await click('guardian-photo-deny');
  expect(opsApi.guardianPhotoConsent).toHaveBeenCalledWith('tenant2','child2','candidate-2',false);
 });
 test('guardian can revoke consented photo and hard-delete',async()=>{
  opsApi.guardianPrivatePhoto.mockResolvedValue({mimeType:'image/png',pngBase64:'aW1hZ2U='});
  await mount(GuardianPhotoConsent,{centerId:'tenant1',childId:'child1'});
  expect(id('guardian-private-photo')).toBeTruthy();
  opsApi.guardianPrivatePhoto.mockRejectedValue(new Error('revoked'));
  await click('guardian-revoke-photo');
  expect(opsApi.guardianPhotoRevoke).toHaveBeenCalledWith('tenant1','child1');
  expect(all('guardian-private-photo')).toHaveLength(0);
 });
 test('activity media staging stays tied to draft metadata and does not expose public URL',()=>{
  const api=readFileSync(resolve(__dirname,'../src/lib/activity-media.ts'),'utf8');
  const panel=readFileSync(resolve(__dirname,'../src/components/clinical/ActivityMediaDraftPanel.tsx'),'utf8');
  expect(api).toContain("'/candidates'");
  expect(panel).toContain('activityMediaDrafts.uploadCandidate(centerId,templateId,draft.id,pngBase64)');
  expect(panel).toContain("draft.state==='DRAFT'");
  expect(panel).toContain('No image publication is available');
 });
});
