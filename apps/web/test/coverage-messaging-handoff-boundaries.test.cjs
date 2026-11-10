// M4-08: synthetic-only operational messaging and source-bound draft handoffs.
// This suite exercises actual component/pure-source code; it cannot replace
// tenant-side authorization tests or mounted browser interactions.
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const h=React.createElement;
const draw=(Component,props)=>renderToStaticMarkup(h(Component,props));
let loaded=null,failed=false;
jest.mock('@/components/centers/kit',()=>{
 const kit=jest.requireActual('@/components/centers/kit');
 return {...kit,useLoad:()=>({data:loaded,failed,reload:jest.fn(),setData:jest.fn()})};
});
jest.mock('next/navigation',()=>({
 useRouter:()=>({push:jest.fn(),replace:jest.fn(),refresh:jest.fn()}),
 usePathname:()=>'/app',useSearchParams:()=>new URLSearchParams()
}));
const {Messages,NonClinicalNotice}=require('../src/components/messages/Messages');
const {ReportToPlanHandoff}=require('../src/components/clinical/ReportToPlanHandoff');
const {HandoverProposalPanel}=require('../src/components/operations/HandoverProposalPanel');
const {homePlanSourceSnapshot,syntheticHomePlanCandidates}=require('../src/components/clinical/HomePlanSyntheticAssist');
const goal=()=>({key:'g1',title:'Fictional shared-turn goal',measure:'count',baseline:1,target:5});
const ver=(overrides={})=>({id:'v1',number:1,version:2,status:'DRAFT',mine:true,
 goals:[goal()],homeActivities:[],goalCheckpoints:[],summary:'Internal draft',
 author:'Fictional Therapist',updatedAt:'2026-11-10T09:00:00Z',reviewNotes:[],...overrides});
const t=(id,title='Synthetic card',service='speech',extra={})=>({
 id,title,service,library:'center',version:1,ageBand:'6–8',
 minutes:10,materials:['paper'],steps:['try'],safety:['supervise'],...extra});
const ws=(overrides={})=>({
 synthetic:true,canEdit:true,child:{id:'fictional-child',name:'Synthetic Alex',services:['speech']},
 templates:[t('a'),t('b','Other team','ot')],plans:[],observations:[],...overrides
});
const rep=()=>({
 canEdit:true,synthetic:true,released:false,locked:'Not authorized',
 report:{id:'r1',title:'Saved fictional report',childId:'fictional-child',service:'speech'},
 versions:[],
});
const child=()=>({
 id:'fictional-child',assignments:[],guardians:[],services:['speech'],
 firstName:'Alex',lastName:'Fictional',status:'ACTIVE',referent:null
});
beforeEach(()=>{loaded=null;failed=false;});

describe('M4-08 synthetic home-plan source binding and no automatic therapy inference',()=>{
 it('records only exact-authorized goal/template source snapshots with explicit non-validation',()=>{
  const w=ws(),v=ver();
  const refs=homePlanSourceSnapshot(w,v,'speech','center-1',[goal()]);
  expect(refs.map(r=>r.kind)).toEqual(['plan-goal','activity-template']);
  expect(refs.every(r=>r.validation==='REFERENCED_NOT_VERIFIED')).toBe(true);
  expect(refs.every(r=>r.scope===refs[0].scope)).toBe(true);
  expect(refs.map(r=>r.id)).toEqual(['v1:g1','a']);
  expect(refs.find(r=>r.kind==='activity-template').snapshot).not.toContain('Other team');
 });
 it('returns no candidates unless synthetic editor/author/draft gates all hold',()=>{
  const w=ws(),v=ver();
  expect(syntheticHomePlanCandidates({...w,synthetic:false},v,'speech',[],[goal()],'c')).toEqual([]);
  expect(syntheticHomePlanCandidates({...w,canEdit:false},v,'speech',[],[goal()],'c')).toEqual([]);
  expect(syntheticHomePlanCandidates(w,{...v,mine:false},'speech',[],[goal()],'c')).toEqual([]);
  expect(syntheticHomePlanCandidates(w,{...v,status:'IN_REVIEW'},'speech',[],[goal()],'c')).toEqual([]);
  expect(syntheticHomePlanCandidates(w,v,'speech',[],[],'c')).toEqual([]);
 });
 it('excludes already attached templates and unrelated specialty; proposals remain unverified',()=>{
  const w=ws({templates:[t('a'),t('b','Occupational task','ot'),t('c','Another synthetic exercise')]});
  const out=syntheticHomePlanCandidates(w,ver(),'speech',[{templateId:'a'}],[goal()],'c');
  expect(out.map(a=>a.templateId)).toEqual(['c']);
  expect(out[0]).toMatchObject({planVersionId:'v1',goalKey:'g1',
   clinicalValidation:'NOT_VERIFIED',released:false});
  expect(out[0].warnings.join(' ')).toMatch(/Therapist must check/);
  expect(out[0].pinnedSources.some(s=>s.id==='c')).toBe(true);
  expect(out[0].sourceRefs.every(r=>!r.includes('b'))).toBe(true);
 });
});

describe('M4-08 report-to-plan prerequisites never imply plan publication',()=>{
 it('does not offer handoff at all to a read-only report viewer',()=>{
  expect(draw(ReportToPlanHandoff,{centerId:'c',detail:{...rep(),canEdit:false},
    prepare:async()=>({revision:1,release:()=>{}})})).toBe('');
 });
 it('requires a saved immutable report version before creating any plan',()=>{
  const out=draw(ReportToPlanHandoff,{centerId:'c',detail:rep(),
   prepare:async()=>({revision:1,release:()=>{}})});
  expect(out).toContain('data-testid="report-to-plan-needs-version"');
  expect(out).toContain('Save version');
  expect(out).toContain('No automatic release or recommendations');
  expect(out).not.toContain('data-testid="report-to-plan-create"');
 });
 it('provides a disabled draft creation control pending exact saved source opt-in',()=>{
  const detail={...rep(),versions:[{id:'saved-1',number:1}]};
  const out=draw(ReportToPlanHandoff,{centerId:'c',detail,
   prepare:async()=>({revision:1,release:()=>{}})});
  expect(out).toContain('data-testid="report-to-plan-create"');
  expect(out).toContain('disabled=""');
  expect(out).not.toContain('report-to-plan-completed');
  expect(out).toContain('DRAFT');
 });
});

describe('M4-08 operational messaging must always show safeguarding boundaries',()=>{
 const props=(family=false)=>({centerId:'synthetic-center',family,
  kids:[{id:'fictional-child',name:'Alex'}],onError:()=>{}});
 it('shows explicit non-clinical guardian/staff separation at both tones',()=>{
  for(const tone of ['family','clinical']){
   const out=draw(NonClinicalNotice,{tone});
   expect(out).toContain('data-testid="messages-non-clinical-notice"');
   expect(out).toContain('Real family messaging stays off');
   expect(out).toContain('Supervisors and center managers cannot access family conversations');
   expect(out).toContain('Internal staff conversations are never visible to families');
  }
 });
 it('does not fabricate conversation records when none are available',()=>{
  const out=draw(Messages,props(true));
  expect(out).toContain('data-testid="threads-loading"');
  expect(out).toContain('data-testid="messages-non-clinical-notice"');
  expect(out).not.toContain('data-testid="thread-fake"');
 });
 it('preserves a visible family empty state without clinical permission assertions',()=>{
  loaded={items:[],unread:0};
  const out=draw(Messages,props(true));
  expect(out).toContain('data-testid="threads-empty"');
  expect(out).toContain('No conversations yet');
  expect(out).toContain('Talk with your child');
 });
 it('renders only supplied operational threads, with guard/warning still visible',()=>{
  loaded={unread:1,items:[{
   id:'t1',childId:'fictional-child',child:'Alex',
   audience:'CARE_TEAM',service:'speech',subject:'Synthetic schedule change',
   category:'scheduling',status:'OPEN',lastMessageAt:'2026-11-10T09:00:00Z',
   preview:'Visit rescheduled',lastFrom:'STAFF',unread:true
  }]};
  const out=draw(Messages,props(false));
  expect(out).toContain('data-testid="thread-t1"');
  expect(out).toContain('Synthetic schedule change');
  expect(out).toContain('data-testid="thread-unread-t1"');
  expect(out).toContain('data-testid="messages-non-clinical-notice"');
  expect(out).not.toContain('fake-patient-not-authorized');
 });
});

describe('M4-08 synthetic therapist handover remains explicitly non-authorizing',()=>{
 it('has no immediate effect and no implicit access grant in initial view',()=>{
  const out=draw(HandoverProposalPanel,{centerId:'synthetic-center',child:child()});
  expect(out).toContain('data-testid="handover-manager"');
  expect(out).toContain('Synthetic operational acknowledgement only');
  expect(out).toContain('No existing therapist assignment');
  expect(out).not.toContain('Access granted');
 });
});
