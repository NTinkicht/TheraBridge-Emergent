// M4-08 Stage 3: real child clinical workspace router and shared pagination.
// Only panels and backend are controlled; source executes data scoping,
// retries, conflict-sensitive navigation, history merging and access checks.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let session,onError,mockId,oldWindow,oldDoc,oldHistory;
jest.mock('next/navigation',()=>({useParams:()=>({id:mockId})}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('@/components/centers/kit',()=>{
 const a=jest.requireActual('@/components/centers/kit');
 return {...a,Workspace:({children})=>children(session,onError)};
});
const mockPanel=label=>({ws,pagination,run,onPending,onNavigate})=>h('section',
 {'data-testid':'stage3-panel-'+label,'data-plans':ws.plans.length,
  'data-assessments':ws.assessments.length,'data-observations':ws.observations.length},
 pagination&&h('button',{'data-testid':'stage3-load-'+label,
 onClick:()=>pagination.load()},'Load older'),
 onPending&&h('button',{'data-testid':'stage3-pending-'+label,
 onClick:()=>onPending('note-a',true)},'Unsaved note'),
 onPending&&h('button',{'data-testid':'stage3-cleared-'+label,
 onClick:()=>onPending('note-a',false)},'Note saved'),
 run&&h('button',{'data-testid':'stage3-run-'+label,
 onClick:()=>run(()=>Promise.resolve(), 'Synthetic draft recorded')},'Persist synthetic draft'),
 onNavigate&&h('button',{'data-testid':'stage3-navigate-'+label,
 onClick:()=>onNavigate('plan')},'Inspect plan'));
jest.mock('@/components/clinical/Panels',()=>({
 AssessmentsPanel:mockPanel('assessments'),SessionsPanel:mockPanel('sessions'),
 ProgressPanel:mockPanel('progress')}));
jest.mock('@/components/clinical/Child360',()=>({Child360:mockPanel('overview')}));
jest.mock('@/components/clinical/PlanEditor',()=>({PlansPanel:mockPanel('plan')}));
jest.mock('@/components/clinical/ReportsPanel',()=>({ReportsPanel:mockPanel('reports')}));
jest.mock('@/lib/clinical',()=>{
 const a=jest.requireActual('@/lib/clinical');
 return {...a,clinicalApi:{...a.clinicalApi,workspace:jest.fn()}};
});
const {clinicalApi}=require('../src/lib/clinical');
const ClinicalPage=require('../src/app/app/clinical/[id]/page').default;
const plan=(id)=>({id,service:'speech',versions:[]});
const observation=(id)=>({id,planVersionId:'v1',goalKey:'g1'});
const assessment=(id)=>({id,createdAt:'2026-11-09T12:00:00Z'});
const workspace=(changes={})=>({
 child:{id:'child-a',name:'Fictional Alex'},locked:'No clinical signing',
 timezone:'Asia/Dubai',canEdit:true,canReview:false,
 plans:[plan('plan-current')],observations:[observation('obs-current')],
 assessments:[assessment('ass-current')],notes:[],hasMorePlans:true,
 hasMoreAssessments:true,...changes
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const mount=async()=>act(async()=>{tree=create(h(ClinicalPage));});
beforeAll(()=>{
 oldWindow=global.window;oldDoc=global.document;oldHistory=global.history;
 global.window={location:{hash:''},confirm:jest.fn(()=>false),
  addEventListener:jest.fn(),removeEventListener:jest.fn()};
 global.document={addEventListener:jest.fn(),removeEventListener:jest.fn()};
 global.history={go:jest.fn()};
});
afterAll(()=>{global.window=oldWindow;global.document=oldDoc;global.history=oldHistory;});
beforeEach(()=>{
 jest.clearAllMocks();mockId='child-a';global.window.location.hash='';
 clinicalApi.workspace.mockReset();
 clinicalApi.workspace.mockImplementation(async(_center,_id,p=undefined,assessmentOffset=undefined)=>{
  if(p>0)return workspace({plans:[plan('plan-older')],
   observations:[observation('obs-older')],hasMorePlans:false});
  if(assessmentOffset>0)return workspace({assessments:[assessment('ass-older')],
   hasMoreAssessments:false});
  return workspace();
 });
 onError=jest.fn(e=>{throw e;});
 session={activeContext:{type:'center',centerId:'center-a',role:'THERAPIST'},
  permissions:['center.clinical.read']};
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('clinical child route source-scoped evidence history and tab safety',()=>{
 it('loads only selected child in current center and shows clinical NO-GO',async()=>{
  await mount();
  expect(clinicalApi.workspace).toHaveBeenCalledWith('center-a','child-a');
  expect(get('clinical-child-name').props.children).toBe('Fictional Alex');
  expect(get('clinical-synthetic-banner')).toBeTruthy();
  expect(get('stage3-panel-overview').props['data-plans']).toBe(1);
  expect(get('clinical-back').props.href).toBe('/app/clinical');
 });
 it('allows ordinary authorized tabs with correct accessible selected state',async()=>{
  await mount();await click('clinical-tab-sessions');
  expect(get('clinical-tab-sessions').props['aria-selected']).toBe(true);
  expect(get('stage3-panel-sessions')).toBeTruthy();
  await click('clinical-tab-reports');
  expect(get('stage3-panel-reports')).toBeTruthy();
  expect(find('stage3-panel-sessions')).toHaveLength(0);
 });
 it('reopens internal plan editor after a report-to-plan handoff without clinical data in URL',async()=>{
  global.window.location.hash='#plan?source=synthetic';
  await mount();
  expect(get('stage3-panel-plan')).toBeTruthy();
  expect(get('clinical-tab-plan').props['aria-selected']).toBe(true);
 });
 it('keeps earlier historical plan evidence when switching from Plan to Progress',async()=>{
  await mount();await click('clinical-tab-plan');
  await click('stage3-load-plan');
  expect(clinicalApi.workspace).toHaveBeenCalledWith('center-a','child-a',1);
  expect(get('stage3-panel-plan').props['data-plans']).toBe(2);
  expect(get('stage3-panel-plan').props['data-observations']).toBe(2);
  await click('clinical-tab-progress');
  expect(get('stage3-panel-progress').props['data-plans']).toBe(2);
  expect(get('stage3-panel-progress').props['data-observations']).toBe(2);
 });
 it('keeps assessment history across route tabs using independent exact offset',async()=>{
  await mount();await click('clinical-tab-assessments');
  await click('stage3-load-assessments');
  expect(clinicalApi.workspace).toHaveBeenCalledWith('center-a','child-a',0,1);
  expect(get('stage3-panel-assessments').props['data-assessments']).toBe(2);
  await click('clinical-tab-overview');
  expect(get('stage3-panel-overview').props['data-assessments']).toBe(2);
 });
 it('rejects tab switching when a clinician has pending unsaved session evidence',async()=>{
  await mount();await click('clinical-tab-sessions');
  await click('stage3-pending-sessions');
  await click('clinical-tab-plan');
  expect(get('stage3-panel-sessions')).toBeTruthy();
  expect(global.window.confirm).toHaveBeenCalled();
  global.window.confirm.mockReturnValueOnce(true);
  await click('clinical-tab-plan');
  expect(get('stage3-panel-plan')).toBeTruthy();
 });
 it('captures a successful child-scoped write and refreshes authoritative workspace',async()=>{
  await mount();await click('clinical-tab-plan');
  await click('stage3-run-plan');
  expect(get('clinical-notice-success')).toBeTruthy();
  expect(clinicalApi.workspace).toHaveBeenCalledTimes(2);
 });
 it('reports denied fetch without rendering another childs clinical record',async()=>{
  clinicalApi.workspace.mockRejectedValueOnce(new Error('Synthetic access denied'))
   .mockResolvedValueOnce(workspace());
  await mount();
  expect(get('clinical-error')).toBeTruthy();
  expect(find('clinical-child-name')).toHaveLength(0);
  const b=get('clinical-error').findAllByType('button')[0];
  await act(async()=>{b.props.onClick();await Promise.resolve();});
  expect(get('clinical-child-name')).toBeTruthy();
  expect(clinicalApi.workspace).toHaveBeenCalledTimes(2);
 });
 it('loads only a supervisor-specific draft view and never signs a clinical report',async()=>{
  session.activeContext.role='CLINICAL_SUPERVISOR';
  clinicalApi.workspace.mockResolvedValueOnce(workspace({canReview:true,canEdit:false}));
  await mount();
  expect(JSON.stringify(tree.toJSON())).toContain('Clinical supervisor review');
  expect(get('clinical-synthetic-banner')).toBeTruthy();
 });
 it('does not fetch earlier plans if authoritative response reports no more pages',async()=>{
  clinicalApi.workspace.mockResolvedValueOnce(workspace({hasMorePlans:false}));
  await mount();await click('clinical-tab-plan');await click('stage3-load-plan');
  expect(clinicalApi.workspace).toHaveBeenCalledTimes(1);
  expect(get('stage3-panel-plan').props['data-plans']).toBe(1);
 });
 it('does not fetch earlier assessments if authoritative response reports no more pages',async()=>{
  clinicalApi.workspace.mockResolvedValueOnce(workspace({hasMoreAssessments:false}));
  await mount();await click('clinical-tab-assessments');await click('stage3-load-assessments');
  expect(clinicalApi.workspace).toHaveBeenCalledTimes(1);
  expect(get('stage3-panel-assessments').props['data-assessments']).toBe(1);
 });
 it('retains current history and surfaces failure when old plans cannot be read',async()=>{
  await mount();clinicalApi.workspace.mockRejectedValueOnce(Error('Synthetic old-plan access denied'));
  await click('clinical-tab-plan');await click('stage3-load-plan');
  expect(get('stage3-panel-plan').props['data-plans']).toBe(1);
  expect(clinicalApi.workspace).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(tree.toJSON())).toContain('Older plans could not be loaded');
 });
 it('retains current assessment and exposes a retryable older-assessment failure',async()=>{
  await mount();clinicalApi.workspace.mockRejectedValueOnce(Error('Synthetic old-assessment denied'));
  await click('clinical-tab-assessments');await click('stage3-load-assessments');
  expect(get('stage3-panel-assessments').props['data-assessments']).toBe(1);
  expect(JSON.stringify(tree.toJSON())).toContain('Earlier assessments could not be loaded');
 });
 it('deduplicates overlapping historical plans and observations by real item identity',async()=>{
  await mount();
  clinicalApi.workspace.mockResolvedValueOnce(workspace({
   plans:[plan('plan-current'),plan('plan-old-2')],
   observations:[observation('obs-current'),observation('obs-old-2')],
   hasMorePlans:false
  }));
  await click('clinical-tab-plan');await click('stage3-load-plan');
  expect(get('stage3-panel-plan').props['data-plans']).toBe(2);
  expect(get('stage3-panel-plan').props['data-observations']).toBe(2);
 });
 it('deduplicates overlapping assessments without inventing clinical evidence',async()=>{
  await mount();
  clinicalApi.workspace.mockResolvedValueOnce(workspace({assessments:[assessment('ass-current'),assessment('ass-old-2')],hasMoreAssessments:false}));
  await click('clinical-tab-assessments');await click('stage3-load-assessments');
  expect(get('stage3-panel-assessments').props['data-assessments']).toBe(2);
 });
 it('reports ordinary navigation safely when clinician clears unsaved session state',async()=>{
  await mount();await click('clinical-tab-sessions');await click('stage3-pending-sessions');
  await click('stage3-cleared-sessions');
  await click('clinical-tab-plan');
  expect(get('stage3-panel-plan')).toBeTruthy();
  expect(global.window.confirm).not.toHaveBeenCalled();
 });
 it('blocks browser beforeunload while synthetic session text is unsaved',async()=>{
  await mount();await click('clinical-tab-sessions');await click('stage3-pending-sessions');
  const handler=global.window.addEventListener.mock.calls.find(c=>c[0]==='beforeunload')?.[1];
  expect(typeof handler).toBe('function');
  const event={preventDefault:jest.fn(),returnValue:undefined};
  handler(event);
  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  expect(event.returnValue).toBe('');
 });
 it('allows beforeunload without preventDefault when no session is pending',async()=>{
  await mount();
  const handler=global.window.addEventListener.mock.calls.find(c=>c[0]==='beforeunload')?.[1];
  const event={preventDefault:jest.fn(),returnValue:undefined};
  handler(event);
  expect(event.preventDefault).not.toHaveBeenCalled();
  expect(event.returnValue).toBeUndefined();
 });
 it('stops a real anchor navigation when user refuses to discard unsaved text',async()=>{
  await mount();await click('clinical-tab-sessions');await click('stage3-pending-sessions');
  const handler=global.document.addEventListener.mock.calls.find(c=>c[0]==='click')?.[1];
  const event={target:{closest:()=>({href:'/app/children'})},preventDefault:jest.fn(),stopPropagation:jest.fn()};
  handler(event);
  expect(global.window.confirm).toHaveBeenCalled();
  expect(event.preventDefault).toHaveBeenCalledTimes(1);
  expect(event.stopPropagation).toHaveBeenCalledTimes(1);
 });
 it('does not intercept unrelated non-anchor clicks while editing a draft',async()=>{
  await mount();await click('clinical-tab-sessions');await click('stage3-pending-sessions');
  const handler=global.document.addEventListener.mock.calls.find(c=>c[0]==='click')?.[1];
  const event={target:{closest:()=>null},preventDefault:jest.fn(),stopPropagation:jest.fn()};
  handler(event);
  expect(event.preventDefault).not.toHaveBeenCalled();
 });
 it('undoes a browser history traversal after rejected discard confirmation',async()=>{
  await mount();await click('clinical-tab-sessions');await click('stage3-pending-sessions');
  const handler=global.window.addEventListener.mock.calls.find(c=>c[0]==='popstate')?.[1];
  handler();
  expect(global.window.confirm).toHaveBeenCalled();
  expect(global.history.go).toHaveBeenCalledWith(1);
 });
 it('cleans up browser navigation guards when the clinical screen unmounts',async()=>{
  await mount();
  await act(async()=>{tree.unmount();tree=null;});
  const events=global.window.removeEventListener.mock.calls.map(c=>c[0]);
  expect(events).toEqual(expect.arrayContaining(['beforeunload','popstate']));
  expect(global.document.removeEventListener).toHaveBeenCalledWith('click',expect.any(Function),true);
 });

});
