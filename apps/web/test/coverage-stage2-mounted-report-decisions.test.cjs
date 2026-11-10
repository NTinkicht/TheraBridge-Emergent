// Stage 2: mounted real immutable evidence-decision state machine.
// Human-reviewed wording and exact pinned source are prerequisites.
// Decision receipts never constitute clinical approval or family release.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/lib/reports',()=>{
 const real=jest.requireActual('@/lib/reports');
 return {...real,reportsApi:{...real.reportsApi,
  decisions:jest.fn(),recordDecision:jest.fn()}};
});
const {reportsApi}=require('../src/lib/reports');
const {ReportDecisionAssist}=require('../src/components/clinical/ReportDecisionAssist');
const view=(latest={})=>({
 sources:{
  assessment:{proposalFingerprint:'a-fingerprint',sources:[
   {ref:'assessment:a1',label:'Fictional assessment on 2026-11-10'}]},
  goals:{proposalFingerprint:'g-fingerprint',sources:[
   {ref:'goal:pv1:g1',label:'Fictional observed goal'}]},
  sessions:{proposalFingerprint:'s-fingerprint',sources:[
   {ref:'session:period-counts',label:'Recorded session counts'}]}
 },latest
});
const validReceipt={persisted:true,claimValidation:'REFERENCED_NOT_VERIFIED'};
let tree=null,flush,beginDecision,endDecision,onCommitted,onError,rev;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();});
const change=async(id,value)=>act(async()=>{get(id).props.onChange({target:{value}});});
const html=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();rev=4;
 flush=jest.fn(async()=>true);
 beginDecision=jest.fn(()=>true);endDecision=jest.fn();
 onCommitted=jest.fn(async()=>{});onError=jest.fn();
 reportsApi.decisions.mockResolvedValue(view());
 reportsApi.recordDecision.mockResolvedValue(validReceipt);
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const mount=async()=>act(async()=>{tree=create(h(ReportDecisionAssist,{
 centerId:'synthetic-center',reportId:'fictional-report',
 getVersion:()=>rev,flush,beginDecision,endDecision,onCommitted,onError}));});
describe('Stage 2 immutable source-scoped clinician decision workflow',()=>{
 it('never presents evidence identity as independent clinical validity',async()=>{
  await mount();
  expect(get('report-decisions-persistent')).toBeTruthy();
  expect(html()).toContain('Referenced, not verified');
  expect(html()).toContain('not approvals or family releases');
  expect(reportsApi.recordDecision).not.toHaveBeenCalled();
 });
 it('requires both explicitly chosen source and clinician-authored wording',async()=>{
  await mount();
  expect(get('report-assist-apply-goals').props.disabled).toBe(true);
  await change('report-assist-source-goals','goal:pv1:g1');
  expect(get('report-assist-apply-goals').props.disabled).toBe(true);
  await change('report-assist-edit-goals','  Reviewed fictional statement  ');
  expect(get('report-assist-apply-goals').props.disabled).toBe(false);
  await click('report-assist-apply-goals');
  expect(reportsApi.recordDecision).toHaveBeenCalledWith('synthetic-center','fictional-report',
   expect.objectContaining({section:'goals',action:'APPLIED',version:4,
    proposalFingerprint:'g-fingerprint',
    claims:[{text:'Reviewed fictional statement',sourceRefs:['goal:pv1:g1']}],
    idempotencyKey:expect.any(String)}));
  expect(onCommitted).toHaveBeenCalledTimes(1);
  expect(endDecision).toHaveBeenCalledTimes(1);
 });
 it('does not record a decision if the parent cannot flush the draft',async()=>{
  flush.mockResolvedValue(false);
  await mount();await change('report-assist-edit-assessment','Fictional reviewed');
  await change('report-assist-source-assessment','assessment:a1');
  await click('report-assist-apply-assessment');
  expect(beginDecision).toHaveBeenCalledTimes(1);
  expect(reportsApi.recordDecision).not.toHaveBeenCalled();
  expect(onCommitted).not.toHaveBeenCalled();
  expect(get('report-decisions-error')).toBeTruthy();
  expect(html()).toContain('could not be saved');
  expect(endDecision).toHaveBeenCalledTimes(1);
 });
 it('blocks all server mutations if parent cannot acquire an exclusive decision lease',async()=>{
  beginDecision.mockReturnValue(false);
  await mount();await click('report-assist-omit-sessions');
  expect(flush).not.toHaveBeenCalled();
  expect(reportsApi.recordDecision).not.toHaveBeenCalled();
  expect(endDecision).not.toHaveBeenCalled();
 });
 it('retains same idempotency key on an uncertain receipt before retrying',async()=>{
  reportsApi.recordDecision.mockRejectedValueOnce(new Error('Synthetic transport timeout'))
   .mockResolvedValueOnce(validReceipt);
  await mount();await change('report-assist-source-assessment','assessment:a1');
  await change('report-assist-edit-assessment','Recorded fictional detail');
  await click('report-assist-apply-assessment');
  expect(onCommitted).not.toHaveBeenCalled();
  expect(get('report-decisions-error')).toBeTruthy();
  const first=reportsApi.recordDecision.mock.calls[0][2];
  await click('report-assist-apply-assessment');
  const second=reportsApi.recordDecision.mock.calls[1][2];
  expect(second).toEqual(first);
  expect(onCommitted).toHaveBeenCalledTimes(1);
 });
 it('refuses a success-shaped receipt without non-validation marker and does not commit',async()=>{
  reportsApi.recordDecision.mockResolvedValue({
   persisted:true,claimValidation:'CLINICALLY_VERIFIED'});
  await mount();await click('report-assist-omit-sessions');
  expect(get('report-decisions-error')).toBeTruthy();
  expect(onCommitted).not.toHaveBeenCalled();
  expect(endDecision).toHaveBeenCalledTimes(1);
 });
 it('permits saved omission without implying an assessment was performed',async()=>{
  await mount();await click('report-assist-omit-assessment');
  expect(reportsApi.recordDecision).toHaveBeenCalledWith('synthetic-center','fictional-report',
   expect.objectContaining({section:'assessment',action:'OMITTED',
    proposalFingerprint:'a-fingerprint',version:4}));
  const payload=reportsApi.recordDecision.mock.calls[0][2];
  expect(payload.claims).toBeUndefined();
 });
 it('shows stale/source-revision warning and allows explicit reconsideration',async()=>{
  reportsApi.decisions.mockResolvedValue(view({
   goals:{action:'OMITTED',status:'REQUIRES_REVIEW',
    reportRevision:3}
  }));
  await mount();
  expect(get('report-decision-history-goals')).toBeTruthy();
  expect(html()).toContain('Evidence or draft text changed');
  await click('report-assist-restore-goals');
  expect(reportsApi.recordDecision).toHaveBeenCalledWith('synthetic-center','fictional-report',
   expect.objectContaining({section:'goals',action:'RECONSIDERED'}));
 });
 it('retries transient server history failure without permitting phantom decisions',async()=>{
  reportsApi.decisions.mockRejectedValueOnce(new Error('Synthetic source unavailable'))
   .mockResolvedValueOnce(view());
  await mount();
  expect(get('report-decisions-load-error')).toBeTruthy();
  expect(find('report-assist-apply-goals')).toHaveLength(0);
  const retry=tree.root.findAllByType('button').find(b=>
   JSON.stringify(b.props.children).includes('Retry loading'));
  await act(async()=>retry.props.onClick());
  expect(get('report-decisions-persistent')).toBeTruthy();
  expect(reportsApi.decisions).toHaveBeenCalledTimes(2);
 });
});