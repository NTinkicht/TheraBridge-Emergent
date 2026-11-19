// M5 report route: render real role-scoped shell and internal preview workflows.
// Only fictional records, mocked transport and light source-bound sidecar stubs.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let state,session,errorHandler,previewData;
jest.mock('next/navigation',()=>({useParams:()=>({id:'fictional-report'})}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/centers/kit',()=>{
  const a=jest.requireActual('@/components/centers/kit');
  return {...a, Workspace:({children})=>children(session,errorHandler),
    useLoad:()=>({data:state.data,failed:state.failed,reload:state.reload})};
});
jest.mock('@/components/clinical/ReportEditor',()=>({ReportEditor:({onPreview,onSections,onSuccess})=>
  h('section',{'data-testid':'fictional-editor'},
    h('button',{'data-testid':'preview-internal',onClick:onPreview},'Preview'),
    h('button',{'data-testid':'saved-internal',onClick:()=>onSuccess('Fictional draft saved')},'Saved'),
    h('button',{'data-testid':'change-section',onClick:()=>onSections({summary:'Edited fictional draft'})},'Edit'))}));
jest.mock('@/components/clinical/ReportToPlanHandoff',()=>({ReportToPlanHandoff:()=>h('section',{'data-testid':'fictional-handoff'})}));
jest.mock('@/components/clinical/FamilyProgress',()=>({FamilyProgress:({banner})=>h('aside',{'data-testid':'fictional-family-view'},banner)}));
jest.mock('@/components/clinical/ReportSide',()=>({
  Compare:({onClose})=>h('section',{'data-testid':'fictional-comparison'},h('button',{'data-testid':'close-compare',onClick:onClose},'Close')),
  Review:()=>h('aside',{'data-testid':'fictional-review'}),Evidence:()=>h('aside',{'data-testid':'fictional-evidence'}),
  HistoryList:({onCompare})=>h('button',{'data-testid':'compare-version',onClick:()=>onCompare({id:'historical'})},'Compare')
}));
jest.mock('@/lib/reports',()=>{
  const a=jest.requireActual('@/lib/reports');
  return {...a,reportsApi:{...a.reportsApi,detail:jest.fn(),familyPreview:jest.fn()}};
});
const {reportsApi}=require('../src/lib/reports');
const ReportPage=require('../src/app/app/reports/[id]/page').default;
let tree;
const report=(fields={})=>({id:'fictional-report',childId:'child-1',childName:'Fictional A',
  title:'Fictional progress report',service:'speech',status:'DRAFT',version:1,
  periodStart:'2026-11-01',periodEnd:'2026-11-30',author:'Synthetic Therapist',
  sections:{summary:'Fictional evidence'},...fields});
const detail=(fields={})=>({report:report(),locked:'Signing NO-GO',canEdit:true,evidence:{},...fields});
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const mount=async()=>act(async()=>{tree=create(h(ReportPage));});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const output=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.resetAllMocks();tree=null;
 session={activeContext:{type:'center',centerId:'center-1',role:'THERAPIST'},
 permissions:['center.clinical.read']};
 errorHandler=jest.fn();
 state={data:detail(),failed:false,reload:jest.fn()};
 reportsApi.familyPreview.mockResolvedValue({snapshotId:'synthetic-snapshot',
  fingerprint:'synthetic-hash'});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real report route internal-only access and version state',()=>{
 it('renders authorized draft with no release and available internal handoff',async()=>{
  await mount();
  expect(get('report-page')).toBeTruthy();
  expect(get('report-synthetic-banner')).toBeTruthy();
  expect(get('fictional-handoff')).toBeTruthy();
  expect(output()).toContain('Unreleased');
  expect(output()).toContain('Synthetic data only');
 });
 it('shows read-only supervisor without report-to-plan mutation affordance',async()=>{
  state.data=detail({canEdit:false,report:report({status:'IN_REVIEW'})});
  await mount();
  expect(find('fictional-handoff')).toHaveLength(0);
  expect(output()).toContain('IN REVIEW');
 });
 it('keeps loading and unauthorized failure distinct, without report data',async()=>{
  state.data=null;await mount();
  expect(get('report-loading')).toBeTruthy();
  expect(find('report-page')).toHaveLength(0);
  await act(async()=>tree.unmount());tree=null;
  state.failed=true;await mount();
  expect(get('report-error')).toBeTruthy();
  expect(find('report-page')).toHaveLength(0);
 });
 it('shows an internal-only family-format preview with explicit no-release banner',async()=>{
  await mount();await click('preview-internal');
  expect(reportsApi.familyPreview).toHaveBeenCalledWith('center-1','fictional-report');
  expect(get('report-family-preview')).toBeTruthy();
  expect(get('family-format-unreleased')).toBeTruthy();
  expect(output()).toContain('No family can see this');
  await click('report-preview-close');
  expect(find('report-family-preview')).toHaveLength(0);
 });
 it('cannot synthesize a family preview when server denies authorization',async()=>{
  reportsApi.familyPreview.mockRejectedValueOnce(new Error('Synthetic permission denial'));
  await mount();await click('preview-internal');
  expect(find('report-family-preview')).toHaveLength(0);
  expect(errorHandler).toHaveBeenCalled();
 });
 it('can compare historical draft only on deliberate request and close without approving',async()=>{
  await mount();await click('compare-version');
  expect(get('fictional-comparison')).toBeTruthy();
  await click('close-compare');
  expect(find('fictional-comparison')).toHaveLength(0);
  expect(output()).toContain('Unreleased');
 });
 it('renders acknowledged local save message but not a released report',async()=>{
  await mount();await click('saved-internal');
  expect(get('report-notice-success')).toBeTruthy();
  await click('preview-internal');
  expect(find('report-notice-success')).toHaveLength(0);
 });
});
