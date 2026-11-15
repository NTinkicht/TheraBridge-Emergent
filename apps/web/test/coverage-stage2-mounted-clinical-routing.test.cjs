// M4-08 Stage 2: mounted clinical route state, cross-tenant pagination,
// exact-source merging, unsaved-text navigation protection. All fixtures fake.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let mockChildId='synthetic-child',mockWorkspace=null,mockFailed=false,mockSession,mockReload;
jest.mock('next/navigation',()=>({
 useParams:()=>({id:mockChildId}),useRouter:()=>({replace:jest.fn(),push:jest.fn()}),
 usePathname:()=>'/app/clinical/synthetic-child',useSearchParams:()=>new URLSearchParams()
}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 React.createElement('a',{href,...props},children)}));
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,Workspace:({children})=>
  React.createElement('main',null,children(mockSession,()=>{})),
 useLoad:()=>({data:mockWorkspace,failed:mockFailed,reload:mockReload})};
});
jest.mock('@/lib/clinical',()=>{
 const real=jest.requireActual('@/lib/clinical');
 return {...real,clinicalApi:{...real.clinicalApi,workspace:jest.fn()}};
});
jest.mock('@/components/clinical/Child360',()=>({
 Child360:({ws,onNavigate})=>React.createElement('div',{'data-testid':'child360-test-boundary'},
  React.createElement('span',{'data-testid':'child360-plan-count'},String(ws.plans.length)),
  React.createElement('button',{'data-testid':'go-plan-from-360',onClick:()=>onNavigate('plan')},'Plan'))
}));
jest.mock('@/components/clinical/PlanEditor',()=>({
 PlansPanel:({ws,pagination})=>React.createElement('div',{'data-testid':'plans-boundary'},
  React.createElement('span',{'data-testid':'visible-plan-count'},String(ws.plans.length)),
  React.createElement('span',{'data-testid':'visible-observation-count'},String(ws.observations.length)),
  React.createElement('span',{'data-testid':'plan-page-error'},pagination.error),
  React.createElement('button',{'data-testid':'load-older-plans',disabled:!pagination.hasMore,
    onClick:()=>void pagination.load()},'Older'))
}));
jest.mock('@/components/clinical/Panels',()=>({
 AssessmentsPanel:({ws,pagination})=>React.createElement('div',{'data-testid':'assessments-boundary'},
  React.createElement('span',{'data-testid':'visible-assessment-count'},String(ws.assessments.length)),
  React.createElement('span',{'data-testid':'assessment-page-error'},pagination.error),
  React.createElement('button',{'data-testid':'load-older-assessments',disabled:!pagination.hasMore,
    onClick:()=>void pagination.load()},'Older')),
 SessionsPanel:({ws,onPending})=>React.createElement('div',{'data-testid':'sessions-boundary'},
  React.createElement('button',{'data-testid':'mark-session-unsaved',
    onClick:()=>onPending('fictional-note',true)},'Mark unsaved'),
  React.createElement('button',{'data-testid':'mark-session-saved',
    onClick:()=>onPending('fictional-note',false)},'Mark saved'),
  React.createElement('span',null,String(ws.plans.length))),
 ProgressPanel:({ws})=>React.createElement('span',{'data-testid':'progress-source-count'},
  String(ws.observations.length))
}));
jest.mock('@/components/clinical/ReportsPanel',()=>({
 ReportsPanel:()=>React.createElement('p',{'data-testid':'reports-boundary'},'Reports')
}));
const {clinicalApi}=require('../src/lib/clinical');
const Page=require('../src/app/app/clinical/[id]/page').default;
const plan=id=>({id,title:'Fictional plan',service:'speech',versions:[]});
const assessment=id=>({id,service:'speech',summary:'Fictional',assessedOn:'2026-11-10',
 author:'Fictional Clinician',areas:[]});
const obs=(id,planVersionId='pv1')=>({id,planVersionId,goalKey:'g1',
 value:2,observedOn:'2026-11-10'});
const workspace=(extra={})=>({
 timezone:'Asia/Dubai',locked:'G2/G2b disabled',synthetic:true,
 canEdit:true,canReview:false,child:{id:'synthetic-child',name:'Synthetic Alex',services:['speech']},
 assessments:[assessment('a1')],plans:[plan('p1')],notes:[],observations:[obs('o1')],
 appointments:[],templates:[],careTeam:[],hasMorePlans:true,hasMoreAssessments:true,...extra
});
let tree,originals;
const get=id=>tree.root.findByProps({'data-testid':id});
const click=async id=>act(async()=>get(id).props.onClick());
const selectTab=async id=>click('clinical-tab-'+id);
const html=()=>JSON.stringify(tree.toJSON());
const initialSession=()=>({user:{id:'u1',email:'none@example.invalid'},
 csrfToken:'',permissions:['center.clinical.read'],contexts:[],
 activeContext:{type:'center',centerId:'c1',role:'THERAPIST'}});
beforeAll(()=>{
 originals={window:global.window,document:global.document,history:global.history};
 global.window={location:{hash:''},confirm:jest.fn(()=>true),
  addEventListener:jest.fn(),removeEventListener:jest.fn()};
 global.document={addEventListener:jest.fn(),removeEventListener:jest.fn()};
 global.history={go:jest.fn()};
});
afterAll(()=>{
 global.window=originals.window;global.document=originals.document;global.history=originals.history;
});
beforeEach(()=>{
 jest.clearAllMocks();tree=null;mockChildId='synthetic-child';
 mockWorkspace=workspace();mockFailed=false;mockSession=initialSession();
 mockReload=jest.fn(async()=>{});
 global.window.location.hash='';
 clinicalApi.workspace.mockResolvedValue(workspace({plans:[],observations:[],assessments:[],
  hasMorePlans:false,hasMoreAssessments:false}));
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const mount=async()=>act(async()=>{tree=create(h(Page));});
describe('Stage 2 clinical workspace pagination maintains exact child and versions',()=>{
 it('switches tabs and preserves synthetic no-release banner across every section',async()=>{
  await mount();
  expect(get('clinical-synthetic-banner')).toBeTruthy();
  for(const tab of ['plan','assessments','sessions','progress','reports','overview']){
   await selectTab(tab);
   expect(get('clinical-tab-'+tab).props['aria-selected']).toBe(true);
  }
  expect(html()).toContain('G2/G2b disabled');
 });
 it('appends older plans/observations only once despite duplicate identities in server response',async()=>{
  clinicalApi.workspace.mockResolvedValueOnce(workspace({
   plans:[plan('p2'),plan('p1')],observations:[obs('o2'),obs('o1')],
   assessments:[],hasMorePlans:false,hasMoreAssessments:false}));
  await mount();
  await selectTab('plan');
  await click('load-older-plans');
  expect(clinicalApi.workspace).toHaveBeenCalledWith('c1','synthetic-child',1);
  expect(get('visible-plan-count').props.children).toBe('2');
  expect(get('visible-observation-count').props.children).toBe('2');
  expect(get('load-older-plans').props.disabled).toBe(true);
 });
 it('keeps earlier-assessment pages separate from plan pagination and deduplicates by ID',async()=>{
  clinicalApi.workspace.mockResolvedValueOnce(workspace({
   plans:[],observations:[],
   assessments:[assessment('a2'),assessment('a1')],hasMorePlans:false,hasMoreAssessments:false}));
  await mount();
  await selectTab('assessments');
  await click('load-older-assessments');
  expect(clinicalApi.workspace).toHaveBeenCalledWith('c1','synthetic-child',0,1);
  expect(get('visible-assessment-count').props.children).toBe('2');
 });
 it('renders page-fetch failures rather than silently discarding inaccessible historical evidence',async()=>{
  clinicalApi.workspace.mockRejectedValueOnce(new Error('Synthetic offline'));
  await mount();await selectTab('plan');await click('load-older-plans');
  expect(get('plan-page-error').props.children).toContain('Older plans could not be loaded');
  expect(get('visible-plan-count').props.children).toBe('1');
 });
 it('does not leak prior-child pagination when route ID changes',async()=>{
  clinicalApi.workspace.mockResolvedValueOnce(workspace({
   plans:[plan('another-child-private-plan')],observations:[],
   assessments:[],hasMorePlans:false,hasMoreAssessments:false}));
  await mount();await selectTab('plan');await click('load-older-plans');
  expect(get('visible-plan-count').props.children).toBe('2');
  await act(async()=>{mockChildId='different-child';mockWorkspace=workspace({
   child:{id:'different-child',name:'Different Fictional Child',services:['speech']},
   plans:[plan('different-plan')],observations:[],hasMorePlans:false});
   tree.update(h(Page));});
  expect(get('visible-plan-count').props.children).toBe('1');
  expect(html()).not.toContain('another-child-private-plan');
 });
});
describe('Stage 2 clinical navigation protects unsaved notes',()=>{
 it('does not switch away from session while unsaved text exists and user refuses',async()=>{
  await mount();await selectTab('sessions');await click('mark-session-unsaved');
  global.window.confirm.mockReturnValueOnce(false);
  await selectTab('plan');
  expect(get('clinical-tab-sessions').props['aria-selected']).toBe(true);
  expect(global.window.confirm).toHaveBeenCalledWith(expect.stringContaining('Unsaved session'));
  await click('mark-session-saved');await selectTab('plan');
  expect(get('clinical-tab-plan').props['aria-selected']).toBe(true);
 });
 it('returns from report handoff hash into plan tab, without passing permissions in hash',async()=>{
  global.window.location.hash='#plan?version=pv1';
  await mount();
  expect(get('clinical-tab-plan').props['aria-selected']).toBe(true);
  expect(get('plans-boundary')).toBeTruthy();
 });
 it('does not fabricate a clinical child when response is missing or unauthorized',async()=>{
  mockWorkspace=null;
  await mount();
  expect(get('clinical-loading')).toBeTruthy();
  expect(html()).not.toContain('synthetic-child');
  await act(async()=>{mockFailed=true;tree.update(h(Page));});
  expect(get('clinical-error')).toBeTruthy();
 });
});