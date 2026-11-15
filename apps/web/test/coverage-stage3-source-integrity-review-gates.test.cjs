// M4-08 Stage 3: exact source provenance and human review state-machine
// barriers. Real domain source executes, no mock subject or forged approval.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
const {syntheticScope,inspectSyntheticSources}=require('../src/lib/synthetic-source-integrity');
const {newSyntheticReview,transitionSyntheticReview}=require('../src/lib/synthetic-human-review');
const {SyntheticHumanReviewControls}=require('../src/components/clinical/SyntheticHumanReviewControls');
const scope=syntheticScope('center-a','child-a','speech');
const mk=(change={})=>({
 kind:'plan-goal',id:'version-a:goal-a',scope,revision:'4',
 snapshot:'[\"Fictional goal\",5]',validation:'REFERENCED_NOT_VERIFIED',...change
});
describe('source provenance fails closed on every stale or cross-scope evidence',()=>{
 it('uses exact center, child, and specialty scope rather than merely source id',()=>{
  expect(syntheticScope('center-a','child-a','speech')).not.toBe(
   syntheticScope('center-b','child-a','speech'));
  expect(syntheticScope('center-a','child-b','speech')).not.toBe(scope);
  expect(syntheticScope('center-a','child-a','ot')).not.toBe(scope);
 });
 it('marks source CURRENT only for identical revision, value and scope',()=>{
  expect(inspectSyntheticSources([mk()],[mk()],scope)).toEqual({
   status:'CURRENT',issues:[]
  });
 });
 it('refuses missing source and rejects empty evidence without asserting verification',()=>{
  expect(inspectSyntheticSources([mk()],[],scope)).toEqual({
   status:'MISSING',issues:[{kind:'MISSING',id:'plan-goal:version-a:goal-a'}]
  });
  expect(inspectSyntheticSources([],[],scope)).toEqual({
   status:'MISSING',issues:[{kind:'MISSING',id:'no-sources'}]
  });
 });
 it('detects stale source revision even when the text happens to match',()=>{
  const r=inspectSyntheticSources([mk()],[mk({revision:'5'})],scope);
  expect(r.status).toBe('CHANGED');
 });
 it('detects changed snapshot even when source revision claims no change',()=>{
  expect(inspectSyntheticSources([mk()],[mk({snapshot:'altered'})],scope).status)
   .toBe('CHANGED');
 });
 it('does not accept foreign-center sources even when local id and text match',()=>{
  const r=inspectSyntheticSources([mk({scope:'different-center'})],[mk()],scope);
  expect(r.status).toBe('OUT_OF_SCOPE');
  expect(r.issues).toContainEqual({kind:'OUT_OF_SCOPE',id:'plan-goal:version-a:goal-a'});
 });
 it('rejects duplicate pinned sources, never multiplying evidence strength',()=>{
  expect(inspectSyntheticSources([mk(),mk()],[mk()],scope).status).toBe('DUPLICATE');
 });
 it('never treats an unexpected validation state as verified evidence',()=>{
  expect(inspectSyntheticSources([mk({validation:'CLINICALLY_APPROVED'})],[mk()],scope).status)
   .toBe('CHANGED');
 });
});
describe('fictional human review state machine never becomes clinical approval',()=>{
 const context=(more={})=>({sourceRevision:'source-v1',actorMembershipId:'staff-a',
  authorized:true,now:'2026-11-10T12:00:00Z',...more});
 it('starts unreviewed and expressly unsigned/unreleased',()=>{
  expect(newSyntheticReview('source-v1','staff-a')).toEqual({
   phase:'UNREVIEWED',sourceRevision:'source-v1',actorMembershipId:'staff-a',
   recordedAt:null,clinicalApproval:false,released:false
  });
 });
 it('requires examine before acknowledgement, with explicit review boundaries',()=>{
  const start=newSyntheticReview('source-v1','staff-a');
  expect(()=>transitionSyntheticReview(start,'ACKNOWLEDGE_DRAFT',context()))
   .toThrow('Invalid synthetic draft review transition');
  const examined=transitionSyntheticReview(start,'EXAMINE',context());
  expect(examined.phase).toBe('EXAMINED');
  const done=transitionSyntheticReview(examined,'ACKNOWLEDGE_DRAFT',context());
  expect(done.phase).toBe('ACKNOWLEDGED');
  expect(done.clinicalApproval).toBe(false);
  expect(done.released).toBe(false);
  expect(()=>transitionSyntheticReview(done,'ACKNOWLEDGE_DRAFT',context())).toThrow();
 });
 it('cannot reuse prior acknowledgement after actor, revision or access change',()=>{
  const start=newSyntheticReview('source-v1','staff-a');
  expect(()=>transitionSyntheticReview(start,'EXAMINE',context({authorized:false}))).toThrow();
  expect(()=>transitionSyntheticReview(start,'EXAMINE',context({actorMembershipId:'staff-b'}))).toThrow();
  expect(()=>transitionSyntheticReview(start,'EXAMINE',context({sourceRevision:'source-v2'}))).toThrow();
  expect(()=>transitionSyntheticReview(start,'EXAMINE',context({actorMembershipId:''}))).toThrow();
 });
 it('supports explicit rejection/reset but never review signing',()=>{
  const start=newSyntheticReview('source-v1','staff-a');
  const rejected=transitionSyntheticReview(start,'REJECT',context());
  expect(rejected.phase).toBe('REJECTED');
  expect(rejected.clinicalApproval).toBe(false);
  expect(rejected.released).toBe(false);
  expect(()=>transitionSyntheticReview(rejected,'ACKNOWLEDGE_DRAFT',context())).toThrow();
  const reset=transitionSyntheticReview(rejected,'RESET',context({sourceRevision:'source-v2'}));
  expect(reset).toEqual(newSyntheticReview('source-v2','staff-a'));
 });
});
let tree,changed,rejected;
const get=id=>tree.root.findByProps({'data-testid':id});
const click=async id=>act(async()=>get(id).props.onClick());
const mount=async(review=null,other={})=>act(async()=>{tree=create(h(SyntheticHumanReviewControls,{
 review,onReview:changed,onReject:rejected,sourceRevision:'source-v1',
 actorMembershipId:'staff-a',authorized:true,...other
}));});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
beforeEach(()=>{changed=jest.fn();rejected=jest.fn();});
describe('mounted human review controls never bypass source/actor authorization',()=>{
 it('does not acknowledge without a completed examine action',async()=>{
  await mount();
  expect(get('synthetic-review-acknowledge').props.disabled).toBe(true);
  expect(get('synthetic-review-examine').props.disabled).toBe(false);
  await click('synthetic-review-examine');
  expect(changed).toHaveBeenCalledWith(expect.objectContaining({
   phase:'EXAMINED',clinicalApproval:false,released:false
  }));
  expect(rejected).not.toHaveBeenCalled();
 });
 it('records explicit human acknowledgement only on identical source and actor',async()=>{
  const examined=transitionSyntheticReview(newSyntheticReview('source-v1','staff-a'),
   'EXAMINE',{sourceRevision:'source-v1',actorMembershipId:'staff-a',authorized:true,
    now:'2026-11-10T12:00:00Z'});
  await mount(examined);
  expect(get('synthetic-review-acknowledge').props.disabled).toBe(false);
  await click('synthetic-review-acknowledge');
  expect(changed).toHaveBeenCalledWith(expect.objectContaining({
   phase:'ACKNOWLEDGED',clinicalApproval:false,released:false
  }));
 });
 it('disables revoked reviewers and never emits an approval',async()=>{
  await mount(null,{authorized:false});
  expect(get('synthetic-review-examine').props.disabled).toBe(true);
  expect(get('synthetic-review-reject').props.disabled).toBe(true);
  await click('synthetic-review-examine');
  expect(changed).not.toHaveBeenCalled();
 });
 it('invalidates prior reviewed evidence on actor/source mismatch',async()=>{
  await mount(newSyntheticReview('old-source','staff-a'),
   {sourceRevision:'new-source',actorMembershipId:'staff-b'});
  expect(get('synthetic-review-acknowledge').props.disabled).toBe(true);
  expect(get('synthetic-review-examine').props.disabled).toBe(false);
 });
 it('rejects and discards an unacknowledged fictional proposal',async()=>{
  await mount();
  await click('synthetic-review-reject');
  expect(changed).toHaveBeenCalledWith(expect.objectContaining({
   phase:'REJECTED',clinicalApproval:false,released:false
  }));
  expect(rejected).toHaveBeenCalledTimes(1);
 });
});
