// M4-08: source-executed real high-risk clinical editors, synthetic-only states.
// These render real editor components and validate their visible safety boundaries.
// SSR cannot validate event handlers; mounted/browser tests remain required.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
const draw=(Component,props)=>renderToStaticMarkup(h(Component,props));
jest.mock('next/navigation',()=>({
 useRouter:()=>({push:jest.fn(),replace:jest.fn(),refresh:jest.fn()}),
 usePathname:()=>'/app/clinical/fictional-child',
 useSearchParams:()=>new URLSearchParams(),
}));
const {setCenterTz}=require('../src/lib/operations');
const {PlansPanel}=require('../src/components/clinical/PlanEditor');
const {ReportEditor}=require('../src/components/clinical/ReportEditor');
const {SessionEditor}=require('../src/components/clinical/SessionEditor');
beforeAll(()=>setCenterTz('Asia/Dubai'));
afterAll(()=>setCenterTz(undefined));
const goal=()=>({key:'goal-1',title:'Synthetic turn-taking',measure:'count',
 baseline:1,target:5,targetOn:'2026-12-01',reviewOn:'2026-11-20',horizon:'SHORT_TERM'});
const version=(extra={})=>({
 id:'v1',number:1,version:1,status:'DRAFT',summary:'Draft for clinician review',
 author:'Fictional Clinician',mine:true,reviewNotes:[],updatedAt:'2026-11-10T08:00:00Z',
 goals:[goal()],homeActivities:[],goalCheckpoints:[],...extra
});
const ws=(extra={})=>({
 timezone:'Asia/Dubai',synthetic:true,locked:'Clinical release disabled',
 canEdit:true,canReview:false,careTeam:[],childWideReferent:null,
 child:{id:'fictional-child',name:'Alex Fictional',services:['speech'],
 dateOfBirth:'2020-01-01'},
 assessments:[],hasMoreAssessments:false,hasMorePlans:false,
 plans:[],notes:[],observations:[],appointments:[],templates:[],...extra
});
const noop=()=>{};
const pagination={hasMore:false,loading:false,error:'',load:async()=>{}};
const planProps=workspace=>({centerId:'c1',ws:workspace,
 run:async()=>true,pagination});
const report=(extra={})=>({
 synthetic:true,locked:'Release disabled',released:false,canEdit:true,canReview:false,
 evidence:{period:{from:'2026-11-01',to:'2026-11-30'},assessments:[],
 plan:null,goals:[],sessions:{drafts:0,completedVisits:0}},
 report:{id:'r1',childId:'fictional-child',childName:'Alex Fictional',
 title:'Synthetic report',service:'speech',periodStart:'2026-11-01',
 periodEnd:'2026-11-30',status:'DRAFT',version:1,sections:{summary:'Fictional draft only'},
 reviewNotes:[],author:'Fictional Clinician',mine:true,updatedAt:'2026-11-10T08:00:00Z'},
 versions:[],...extra
});
const reportProps=d=>({centerId:'c1',d,onReload:async()=>{},
 onError:noop,onPreview:noop,onSections:noop,onSuccess:noop});
const note=(extra={})=>({
 id:'n1',service:'speech',sessionDate:'2026-11-10',
 actualStart:'2026-11-10T08:00:00Z',actualEnd:null,
 attendance:'PRESENT',executionStatus:'IN_PROGRESS',activities:[],
 sections:{summary:'Fictional note'},version:1,
 author:'Fictional Clinician',mine:true,appointmentId:null,
 updatedAt:'2026-11-10T08:00:00Z',...extra
});
const sessionProps=(workspace,n)=>({
 centerId:'c1',n,ws:workspace,onPending:noop
});

describe('M4-08 real plan editor preserves locked authorization and historical version boundaries',()=>{
 it('does not fabricate plans for a clinician with no records',()=>{
  const out=draw(PlansPanel,planProps(ws()));
  expect(out).toContain('data-testid="plans-empty"');
  expect(out).toContain('data-testid="plan-create"');
  expect(out).not.toContain('data-testid="plan-v1"');
 });
 it('prevents creation for read-only workspace, even with a valid child service',()=>{
  const out=draw(PlansPanel,planProps(ws({canEdit:false})));
  expect(out).toContain('data-testid="plans-empty"');
  expect(out).not.toContain('data-testid="plan-create"');
 });
 it('shows saved draft goals and safe approval controls only, not family release',()=>{
  const workspace=ws({plans:[{id:'p1',title:'Fictional therapy plan',
   service:'speech',versions:[version()]}]});
  const out=draw(PlansPanel,planProps(workspace));
  expect(out).toContain('data-testid="plan-p1"');
  expect(out).toContain('data-testid="plan-version-1"');
  expect(out).toContain('Synthetic turn-taking');
  expect(out).toContain('data-testid="plan-save"');
  expect(out).toContain('data-testid="plan-submit"');
  expect(out).toContain('Approve and release');
  expect(out).toContain('data-testid="saved-home-plan-preview"');
 });
 it('keeps a withdrawn plan read-only and offers only a separately versioned restart',()=>{
  const workspace=ws({plans:[{id:'p1',title:'Withdrawn plan',
   service:'speech',versions:[version({status:'WITHDRAWN'})]}]});
  const out=draw(PlansPanel,planProps(workspace));
  expect(out).toContain('Withdrawn');
  expect(out).not.toContain('data-testid="plan-save"');
  expect(out).toContain('data-testid="plan-new-version"');
  expect(out).toContain('Approve and release');
 });
});

describe('M4-08 real report editor never confuses draft review with clinical release',()=>{
 it('shows editable source-scoped report sections and disabled release action',()=>{
  const out=draw(ReportEditor,reportProps(report()));
  expect(out).toContain('data-testid="report-editor"');
  expect(out).toContain('data-testid="report-save-state"');
  expect(out).toContain('data-testid="report-section-summary"');
  expect(out).toContain('data-testid="report-submit"');
  expect(out).toContain('data-testid="report-save-version"');
  expect(out).toContain('Release to family');
  expect(out).toContain('No model call');
 });
 it('shows a reviewer-held report as read-only with all editable actions suppressed',()=>{
  const d=report({canEdit:false,report:{...report().report,status:'IN_REVIEW'}});
  const out=draw(ReportEditor,reportProps(d));
  expect(out).toContain('data-testid="report-readonly"');
  expect(out).toContain('With the supervisor for review');
  expect(out).not.toContain('data-testid="report-submit"');
  expect(out).not.toContain('data-testid="report-save-version"');
  expect(out).toContain('Release to family');
 });
});

describe('M4-08 real session-note editor honors workflow status without signing',()=>{
 it('renders an in-progress synthetic note with save/complete and locked signing',()=>{
  const workspace=ws({notes:[note()]});
  const out=draw(SessionEditor,sessionProps(workspace,workspace.notes[0]));
  expect(out).toContain('In progress · unsigned');
  expect(out).toContain('Save draft');
  expect(out).toContain('Review and complete session');
  expect(out).toContain('Sign note');
 });
 it('hides mutable session actions when the server has already completed the record',()=>{
  const n=note({executionStatus:'COMPLETED',actualEnd:'2026-11-10T08:30:00Z'});
  const workspace=ws({notes:[n]});
  const out=draw(SessionEditor,sessionProps(workspace,n));
  expect(out).toContain('Sign note');
  expect(out).not.toContain('Review and complete session');
 });
});
