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
 test('file picker aborts empty selection and refuses to claim success after scanner rejection',async()=>{
  const rejected=jest.fn().mockRejectedValue(new Error('scanner down'));
  await mount(PrivatePngCandidatePicker,{label:'Private PNG',onStage:rejected});
  const input=id('private-png-candidate-file');
  await act(async()=>input.props.onChange({currentTarget:{files:[],value:'old.png'}}));
  expect(rejected).not.toHaveBeenCalled();
  const bytes=Buffer.alloc(64,3),target={files:[{type:'image/png',size:bytes.length,
    arrayBuffer:async()=>Uint8Array.from(bytes).buffer}],value:'private-name.png'};
  await act(async()=>{input.props.onChange({currentTarget:target});await Promise.resolve();});
  expect(rejected).toHaveBeenCalledTimes(1);
  expect(visible()).toContain('upload was not accepted');
  expect(visible()).not.toContain('candidate submitted');
  expect(visible()).not.toContain('private-name.png');
 });
 test('private child photo displays only existing consented bytes, and archived child cannot stage new files',async()=>{
  opsApi.privateChildPhoto.mockResolvedValue({mimeType:'image/png',pngBase64:'aW1hZ2U='});
  await mount(ChildPhotoPanel,{centerId:'tenant1',childId:'child1',canManage:true,active:false});
  expect(id('child-consented-photo').props.src).toBe('data:image/png;base64,aW1hZ2U=');
  expect(all('private-png-candidate-picker')).toHaveLength(0);
  expect(all('child-photo-pending')).toHaveLength(0);
 });
 test('staff private photo panel denies upload control for nonmanaging authorized readers',async()=>{
  await mount(ChildPhotoPanel,{centerId:'tenant1',childId:'child1',canManage:false,active:true});
  expect(all('private-png-candidate-picker')).toHaveLength(0);
  expect(all('child-consented-photo')).toHaveLength(0);
 });
 test('guardian empty state renders no private image, no approve, no pending links',async()=>{
  await mount(GuardianPhotoConsent,{centerId:'tenant1',childId:'child1'});
  expect(all('guardian-private-photo')).toHaveLength(0);
  expect(all('guardian-photo-approve')).toHaveLength(0);
  expect(all('guardian-photo-consent')).toHaveLength(0);
 });
 test('guardian transport denial shows safe error, never candidate identities or preview',async()=>{
  opsApi.guardianPhotoCandidates.mockRejectedValue(new Error('cross-center-id'));
  await mount(GuardianPhotoConsent,{centerId:'tenant2',childId:'child2'});
  expect(visible()).toContain('candidates could not be loaded');
  expect(visible()).not.toContain('cross-center-id');
  expect(all('guardian-photo-review-preview')).toHaveLength(0);
 });
 test('guardian rejected photo review fails closed before rendering unverified image',async()=>{
  opsApi.guardianPhotoCandidates.mockResolvedValue({candidates:[{id:'pending-one',
    status:'QUARANTINED',consentState:'PENDING'}]});
  opsApi.guardianReviewPhoto.mockRejectedValue(new Error('not authorized'));
  await mount(GuardianPhotoConsent,{centerId:'tenant1',childId:'child1'});
  await click('guardian-review-photo-pending-one');
  expect(visible()).toContain('Unable to privately inspect');
  expect(all('guardian-photo-review-preview')).toHaveLength(0);
  expect(all('guardian-photo-approve')).toHaveLength(0);
 });
 test('guardian consent conflict preserves explicit pending review and does not pretend approval',async()=>{
  opsApi.guardianPhotoCandidates.mockResolvedValue({candidates:[{id:'pending-two',
    status:'QUARANTINED',consentState:'PENDING'}]});
  opsApi.guardianPhotoConsent.mockRejectedValue(new Error('concurrent revocation'));
  await mount(GuardianPhotoConsent,{centerId:'tenant1',childId:'child1'});
  await click('guardian-review-photo-pending-two');
  await act(async()=>id('guardian-photo-consent-confirm').props.onChange({target:{checked:true}}));
  await click('guardian-photo-approve');
  expect(visible()).toContain('consent was not saved');
  expect(id('guardian-photo-review-preview')).toBeTruthy();
  expect(opsApi.guardianPhotoConsent).toHaveBeenCalledTimes(1);
 });
 test('guardian failed revoke never claims photo deletion or clears consent display',async()=>{
  opsApi.guardianPrivatePhoto.mockResolvedValue({mimeType:'image/png',pngBase64:'aW1hZ2U='});
  opsApi.guardianPhotoRevoke.mockRejectedValue(new Error('server unreachable'));
  await mount(GuardianPhotoConsent,{centerId:'tenant1',childId:'child1'});
  await click('guardian-revoke-photo');
  expect(visible()).toContain('could not be revoked');
  expect(id('guardian-private-photo')).toBeTruthy();
 });
 test('restricted clinical context refuses saves on archived child even for manager',async()=>{
  await mount(PrivateCarePanel,{centerId:'tenant1',childId:'child1',canEdit:true,active:false});
  expect(all('private-care-save')).toHaveLength(0);
  expect(id('private-care-allergies').props.disabled).toBe(true);
 });

 test('staff photo staging submits to server, refreshes only the current child and stays quarantined',async()=>{
  await mount(ChildPhotoPanel,{centerId:'tenant2',childId:'child2',canManage:true,active:true});
  const input=id('private-png-candidate-file');
  const bytes=Buffer.alloc(64,2),file={type:'image/png',size:bytes.length,
    arrayBuffer:async()=>Uint8Array.from(bytes).buffer};
  await act(async()=>{input.props.onChange({currentTarget:{files:[file],value:'private-staff-name.png'}});
    await Promise.resolve();});
  expect(opsApi.uploadChildPhoto).toHaveBeenCalledWith('tenant2','child2',bytes.toString('base64'));
  expect(opsApi.childPhotoCandidates).toHaveBeenCalledTimes(2);
  expect(visible()).toContain('guardian must review and approve');
  expect(visible()).not.toContain('private-staff-name.png');
 });
 test('staff photo staging failure does not assert successful guardian approval',async()=>{
  opsApi.uploadChildPhoto.mockRejectedValue(new Error('scanner missing'));
  await mount(ChildPhotoPanel,{centerId:'tenant2',childId:'child2',canManage:true,active:true});
  const bytes=Buffer.alloc(64,6);
  await act(async()=>{id('private-png-candidate-file').props.onChange({currentTarget:{files:[{
    type:'image/png',size:64,arrayBuffer:async()=>Uint8Array.from(bytes).buffer
  }],value:'private.png'}});await Promise.resolve();});
  expect(visible()).toContain('upload was not accepted');
  expect(visible()).not.toContain('guardian must review and approve');
 });
 test('staff photo status error has no private data and disabled new upload for read-only actor',async()=>{
  opsApi.childPhotoCandidates.mockRejectedValue(new Error('foreign-child-secret'));
  await mount(ChildPhotoPanel,{centerId:'tenant2',childId:'child2',canManage:false,active:true});
  expect(visible()).toContain('Private photo status unavailable');
  expect(visible()).not.toContain('foreign-child-secret');
  expect(all('child-consented-photo')).toHaveLength(0);
  expect(all('private-png-candidate-picker')).toHaveLength(0);
 });
 test('staff photo unexpected format remains hidden rather than rendered',async()=>{
  opsApi.privateChildPhoto.mockResolvedValue({mimeType:'image/jpeg',pngBase64:'aW1hZ2U='});
  await mount(ChildPhotoPanel,{centerId:'tenant2',childId:'child2',canManage:false,active:true});
  expect(all('child-consented-photo')).toHaveLength(0);
  expect(visible()).toContain('No consented private photo available');
 });
 test('private PNG file ignored if newer selection replaces pending read',async()=>{
  const onStage=jest.fn();
  await mount(PrivatePngCandidatePicker,{label:'Candidate',onStage});
  const input=id('private-png-candidate-file');
  let release;
  const pending={type:'image/png',size:64,arrayBuffer:()=>new Promise(ok=>{release=ok;})};
  await act(async()=>input.props.onChange({currentTarget:{files:[pending],value:'old.png'}}));
  await act(async()=>input.props.onChange({currentTarget:{files:[{type:'image/jpeg',size:2}],value:'new.jpg'}}));
  await act(async()=>{release(Uint8Array.from(Buffer.alloc(64)).buffer);await Promise.resolve();});
  expect(onStage).not.toHaveBeenCalled();
  expect(visible()).not.toContain('candidate submitted');
 });
 test('private PNG wrong read size and busy statuses never upload',async()=>{
  const onStage=jest.fn();
  await mount(PrivatePngCandidatePicker,{label:'Candidate',onStage});
  const input=id('private-png-candidate-file');
  await act(async()=>input.props.onChange({currentTarget:{files:[{
    type:'image/png',size:0
  }],value:'empty.png'}}));
  expect(onStage).not.toHaveBeenCalled();
  expect(visible()).toContain('Nothing was uploaded');
 });
 test('linked guardian change resets pending photo preview, confirmation and no stale child bytes',async()=>{
  opsApi.guardianPhotoCandidates.mockResolvedValue({candidates:[{
    id:'pending-1',status:'QUARANTINED',consentState:'PENDING'
  }]});
  await mount(GuardianPhotoConsent,{centerId:'tenant1',childId:'child1'});
  await click('guardian-review-photo-pending-1');
  await act(async()=>id('guardian-photo-consent-confirm').props.onChange({target:{checked:true}}));
  opsApi.guardianPhotoCandidates.mockResolvedValue({candidates:[]});
  await act(async()=>{tree.update(h(GuardianPhotoConsent,{centerId:'tenant2',childId:'child2'}));
    await Promise.resolve();});
  expect(all('guardian-photo-review-preview')).toHaveLength(0);
  expect(all('guardian-photo-approve')).toHaveLength(0);
  expect(opsApi.guardianPhotoCandidates).toHaveBeenCalledWith('tenant2','child2');
 });

 test('guardian explicit consent cannot be forged by activating a disabled confirmation action',async()=>{
  opsApi.guardianPhotoCandidates.mockResolvedValue({candidates:[{
    id:'pending-checkbox',status:'QUARANTINED',consentState:'PENDING'
  }]});
  await mount(GuardianPhotoConsent,{centerId:'tenant1',childId:'child1'});
  await click('guardian-review-photo-pending-checkbox');
  const approve=id('guardian-photo-approve');
  expect(approve.props.disabled).toBe(true);
  // Adversarial handler call bypasses DOM disabled behavior; service must still refuse.
  await act(async()=>approve.props.onClick());
  expect(opsApi.guardianPhotoConsent).not.toHaveBeenCalled();
 });
 test('duplicate restricted-care save while pending cannot create concurrent writes',async()=>{
  let release;
  opsApi.updatePrivateCare.mockImplementationOnce(()=>new Promise(ok=>{release=ok;}));
  await mount(PrivateCarePanel,{centerId:'tenant1',childId:'child1',canEdit:true,active:true});
  await act(async()=>id('private-care-save').props.onClick());
  expect(id('private-care-save').props.disabled).toBe(true);
  await act(async()=>id('private-care-save').props.onClick());
  expect(opsApi.updatePrivateCare).toHaveBeenCalledTimes(1);
  await act(async()=>{release(care({version:2}));await Promise.resolve();});
  expect(id('private-care-saved')).toBeTruthy();
 });
 test('duplicate guardian revoke while one request is pending cannot send two deletes',async()=>{
  opsApi.guardianPrivatePhoto.mockResolvedValue({mimeType:'image/png',pngBase64:'aW1hZ2U='});
  let release;
  opsApi.guardianPhotoRevoke.mockImplementationOnce(()=>new Promise(ok=>{release=ok;}));
  await mount(GuardianPhotoConsent,{centerId:'tenant1',childId:'child1'});
  await act(async()=>id('guardian-revoke-photo').props.onClick());
  expect(id('guardian-revoke-photo').props.disabled).toBe(true);
  await act(async()=>id('guardian-revoke-photo').props.onClick());
  expect(opsApi.guardianPhotoRevoke).toHaveBeenCalledTimes(1);
  opsApi.guardianPrivatePhoto.mockRejectedValue(new Error('revoked'));
  await act(async()=>{release({revoked:true});await Promise.resolve();});
  expect(all('guardian-private-photo')).toHaveLength(0);
 });

});
