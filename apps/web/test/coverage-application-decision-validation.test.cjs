// M4-08 actual source-executing Web application/center validation and
// decision panel. These are UI checks, never authorization or deployment.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement,draw=(C,p)=>renderToStaticMarkup(h(C,p));
const {validate:validateApplication}=require('../src/apply-validation');
const {validate:validateCenter}=require('../src/app/app/centers/new/page');
const {DecisionPanel}=require('../src/components/applications/DecisionPanel');
const application=(extra={})=>({
 id:'a1',status:'SUBMITTED',version:3,
 organizationName:'Fictional Center',reference:'APP-FAKE',country:'AE',city:'Sharjah',
 specialties:['speech'],contactName:'Fictional Admin',contactEmail:'none@example.invalid',
 contactPhone:'',therapistEstimate:3,childEstimate:30,
 submittedAt:'2026-11-09T09:00:00Z',decisionRationale:'',
 ...extra
});
const applicant=(extra={})=>({
 organizationName:'Fictional Center',contactName:'Fictional Administrator',
 contactEmail:'none@example.invalid',contactPhone:'',
 country:'AE',city:'Sharjah',timezone:'Asia/Dubai',
 therapistEstimate:'3',childEstimate:'30',message:'',...extra
});
const center=(extra={})=>({
 name:'Fictional Center',slug:'fictional-center',city:'Sharjah',country:'AE',
 timezone:'Asia/Dubai',adminName:'Fictional Administrator',
 adminEmail:'none@example.invalid',...extra
});
describe('M4-08 real applicant validation prevents unconsented or malformed submissions',()=>{
 it('accepts a fully specified fictional request only with explicit synthetic-data acknowledgement',()=>{
  expect(validateApplication(applicant(),['speech'],true)).toEqual({});
  expect(validateApplication(applicant(),['speech'],false)).toMatchObject({
   ack:'Please confirm to continue.'});
 });
 it('rejects under/overrange counts and invalid contact fields',()=>{
  const e=validateApplication(applicant({
   organizationName:' ',contactName:'x',contactEmail:'bad',
   contactPhone:'bad',country:'',city:'',
   therapistEstimate:'0',childEstimate:'5001',message:'x'.repeat(2001)
  }),[],true);
  expect(Object.keys(e).sort()).toEqual([
   'childEstimate','city','contactEmail','contactName','contactPhone',
   'country','message','organizationName','specialties','therapistEstimate'
  ]);
 });
 it('accepts zero children but refuses blank, fractional and negative estimates',()=>{
  expect(validateApplication(applicant({childEstimate:'0'}),['speech'],true)).toEqual({});
  expect(validateApplication(applicant({childEstimate:''}),['speech'],true))
   .toHaveProperty('childEstimate');
  expect(validateApplication(applicant({therapistEstimate:'2.5'}),['speech'],true))
   .toHaveProperty('therapistEstimate');
  expect(validateApplication(applicant({childEstimate:'-1'}),['speech'],true))
   .toHaveProperty('childEstimate');
 });
});
describe('M4-08 first center provisioning validation and tenant identifier constraints',()=>{
 it('permits a blank optional slug and accepts a valid single-dash slug',()=>{
  expect(validateCenter(center({slug:''}),['speech'])).toEqual({});
  expect(validateCenter(center(),['speech'])).toEqual({});
 });
 it.each(['UPPERCASE','bad--slug','leading-','-trailing','a','a'.repeat(65)])(
  'rejects invalid center slug %s',slug=>{
   expect(validateCenter(center({slug}),['speech'])).toHaveProperty('slug');
  });
 it('requires a properly identified administrator and center location/services',()=>{
  const x=validateCenter(center({name:'',city:'',country:'A',
   adminName:'X',adminEmail:'unusable'}),[]);
  expect(Object.keys(x).sort()).toEqual([
   'adminEmail','adminName','city','country','name','specialties'
  ]);
 });
});
describe('M4-08 decisions require explicit platform-granted rights and recorded rationale',()=>{
 const props=(app,canDecide=false)=>({
  app,canDecide,onChanged:()=>{},onError:()=>{}
 });
 it('does not show approval actions to a reviewer without decision permission',()=>{
  const out=draw(DecisionPanel,props(application(),false));
  expect(out).toContain('data-testid="decision-readonly"');
  expect(out).not.toContain('data-testid="decision-form"');
  expect(out).not.toContain('data-testid="start-review-button"');
 });
 it('shows under-review decision and rationale fields only to explicit approver',()=>{
  const out=draw(DecisionPanel,props(application({status:'UNDER_REVIEW'}),true));
  expect(out).toContain('data-testid="decision-form"');
  expect(out).toContain('data-testid="decision-approved"');
  expect(out).toContain('data-testid="decision-rejected"');
  expect(out).toContain('data-testid="decision-rationale-input"');
  expect(out).not.toContain('data-testid="start-review-button"');
 });
 it('requires an explicit review transition before approving a submitted request',()=>{
  const out=draw(DecisionPanel,props(application(),true));
  expect(out).toContain('data-testid="start-review-button"');
  expect(out).toContain('Your decision and rationale become a permanent part');
 });
 it('shows recorded approval/rejection but no second decision or direct center grant',()=>{
  for(const status of ['APPROVED','REJECTED']){
   const out=draw(DecisionPanel,props(application({status,decidedBy:'Fictional Reviewer',
    decidedAt:'2026-11-10T09:00:00Z',decisionRationale:'Reviewed synthetic application.'}),true));
   expect(out).toContain('data-testid="decision-record"');
   expect(out).toContain('data-testid="decision-rationale"');
   expect(out).not.toContain('data-testid="decision-form"');
  }
 });
 it('makes provisioning a separate subsequent action rather than automatic approval',()=>{
  const approved=application({status:'APPROVED',provisioning:{status:'READY',center:null}});
  const out=draw(DecisionPanel,props(approved,true));
  expect(out).toContain('data-testid="provisioning-pending"');
  expect(out).toContain('data-testid="provision-center-button"');
  expect(out).not.toContain('data-testid="view-center-button"');
 });
});
