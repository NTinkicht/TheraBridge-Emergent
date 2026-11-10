// M4-08 mounted report editor save queue, revision controls, and safety guards.
// Real React state and handlers; only backend transport is mocked.
const React=require('react');
const Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('@/lib/reports',()=>{
 const real=jest.requireActual('@/lib/reports');
 return {...real,reportsApi:{...real.reportsApi,
  autosave:jest.fn(),saveVersion:jest.fn(),submit:jest.fn()}};
});
const {reportsApi}=require('../src/lib/reports');
const {ReportEditor}=require('../src/components/clinical/ReportEditor');
const rootProps=()=>({
 centerId:'fictional-center',
 d:{synthetic:true,locked:'Clinical release blocked',released:false,
  canEdit:true,canReview:false,versions:[],
  evidence:{period:{from:'2026-11-01',to:'2026-11-30'},
   assessments:[],plan:null,goals:[],sessions:{drafts:0,completedVisits:0}},
  report:{id:'r1',childId:'fake-child',childName:'Alex Fictional',title:'Internal fictional',
   service:'speech',periodStart:'2026-11-01',periodEnd:'2026-11-30',
   status:'DRAFT',sections:{summary:'Initial fictional text'},reviewNotes:[],
   version:1,author:'Fictional Clinician',mine:true,updatedAt:'2026-11-10T09:00:00Z'}},
 onReload:jest.fn(async()=>{}),onError:jest.fn(),onPreview:jest.fn(),
 onSections:jest.fn(),onSuccess:jest.fn()
});
let tree=null,originalWindow;
beforeAll(()=>{originalWindow=global.window;
 global.window={addEventListener:jest.fn(),removeEventListener:jest.fn()};});
afterAll(()=>{global.window=originalWindow;});
beforeEach(()=>jest.clearAllMocks());
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}jest.clearAllMocks();});
const get=(id)=>tree.root.findByProps({'data-testid':id});
const find=(id)=>tree.root.findAllByProps({'data-testid':id});
async function mount(p=rootProps()){
 await act(async()=>{tree=create(h(ReportEditor,p));});
 return p;
}
async function edit(value){await act(async()=>{get('report-section-summary').props.onChange({
 target:{value}});});}
async function click(id){await act(async()=>{get(id).props.onClick();});}
describe('M4-08 mounted clinical report editor refuses unacknowledged revisions',()=>{
 it('saves changed sections with exact version, then creates immutable saved revision',async()=>{
  reportsApi.autosave.mockResolvedValue({version:2,savedAt:'2026-11-10T10:00:00Z'});
  reportsApi.saveVersion.mockResolvedValue({number:2,version:3});
  const p=await mount();
  await edit('Changed fictional draft with evidence note');
  expect(get('report-save-state').props['data-state']).toBe('pending');
  await click('report-save-version');
  expect(reportsApi.autosave).toHaveBeenCalledWith('fictional-center','r1',
   {summary:'Changed fictional draft with evidence note'},1);
  expect(reportsApi.saveVersion).toHaveBeenCalledWith('fictional-center','r1',2);
  expect(p.onSuccess).toHaveBeenCalledWith('Saved as version 2.');
  expect(p.onReload).toHaveBeenCalledTimes(1);
  expect(get('report-save-state').props['data-state']).toBe('saved');
 });
 it('never submits a version after failed autosave; allows explicit retry',async()=>{
  reportsApi.autosave.mockRejectedValueOnce(new Error('Synthetic network unavailable'))
   .mockResolvedValueOnce({version:2,savedAt:'2026-11-10T10:00:00Z'});
  reportsApi.submit.mockResolvedValue({number:2,version:3});
  await mount();
  await edit('Changed narrative after failure');
  await click('report-submit');
  expect(reportsApi.submit).not.toHaveBeenCalled();
  expect(get('report-save-state').props['data-state']).toBe('error');
  await click('report-save-retry');
  expect(reportsApi.autosave).toHaveBeenCalledTimes(2);
  expect(get('report-save-state').props['data-state']).toBe('saved');
  await click('report-submit');
  expect(reportsApi.submit).toHaveBeenCalledWith('fictional-center','r1',2);
 });
 it('conflicting stale report preserves unsaved text and never submits',async()=>{
  reportsApi.autosave.mockRejectedValue({status:409,message:'Synthetic revision conflict'});
  const p=await mount();
  await edit('Local evidence must not be overwritten');
  await click('report-submit');
  expect(get('report-save-state').props['data-state']).toBe('conflict');
  expect(get('report-conflict')).toBeTruthy();
  expect(get('report-section-summary').props.value).toBe('Local evidence must not be overwritten');
  expect(reportsApi.submit).not.toHaveBeenCalled();
  expect(p.onSuccess).not.toHaveBeenCalled();
  await click('report-conflict-reload');
  expect(p.onReload).toHaveBeenCalledTimes(1);
 });
 it('previews only after the exact dirty revision is acknowledged by server',async()=>{
  reportsApi.autosave.mockResolvedValue({version:3,savedAt:'2026-11-10T10:30:00Z'});
  const p=await mount();
  await edit('Pending fictional report');
  await click('report-preview-toggle');
  expect(reportsApi.autosave).toHaveBeenCalledWith('fictional-center','r1',
   {summary:'Pending fictional report'},1);
  expect(p.onPreview).toHaveBeenCalledTimes(1);
  expect(get('report-save-state').props['data-state']).toBe('saved');
 });
 it('does not open family preview if save fails',async()=>{
  reportsApi.autosave.mockRejectedValue({status:422,message:'Synthetic rejected content'});
  const p=await mount();
  await edit('Invalid synthetic section');
  await click('report-preview-toggle');
  expect(p.onPreview).not.toHaveBeenCalled();
  expect(get('report-save-state').props['data-state']).toBe('error');
 });
 it('creates exact server-acknowledged handoff revision and locks editor until released',async()=>{
  reportsApi.autosave.mockResolvedValue({version:9,savedAt:'2026-11-10T11:00:00Z'});
  const ref={current:null};
  await mount({...rootProps(),handoffGateRef:ref});
  expect(ref.current).toEqual(expect.any(Function));
  await edit('Synthetic report draft before plan handoff');
  let lease;
  await act(async()=>{lease=await ref.current();});
  expect(lease.revision).toBe(9);
  expect(get('report-handoff-edit-lock')).toBeTruthy();
  expect(get('report-section-summary').props.disabled).toBe(true);
  await act(async()=>lease.release());
  expect(find('report-handoff-edit-lock')).toHaveLength(0);
  expect(get('report-section-summary').props.disabled).toBe(false);
 });
 it('refuses handoff lease after failed autosave and releases busy gate',async()=>{
  reportsApi.autosave.mockRejectedValue({status:409,message:'Synthetic conflict'});
  const ref={current:null};
  await mount({...rootProps(),handoffGateRef:ref});
  await edit('Synthetic pending handoff');
  let failure;
  await act(async()=>{try{await ref.current();}catch(e){failure=e;}});
  expect(failure).toEqual(expect.objectContaining({message:expect.stringContaining('could not be saved')}));
  expect(find('report-handoff-edit-lock')).toHaveLength(0);
  expect(get('report-section-summary').props.disabled).toBe(false);
 });
 it('prevents save-version transition from overlapping a pending autosave',async()=>{
  let finish;
  reportsApi.autosave.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  reportsApi.saveVersion.mockResolvedValue({number:3});
  await mount();
  await edit('Pending synthetic update');
  await act(async()=>{get('report-save-version').props.onClick();await Promise.resolve();});
  expect(get('report-transition-edit-lock')).toBeTruthy();
  expect(get('report-section-summary').props.disabled).toBe(true);
  expect(reportsApi.saveVersion).not.toHaveBeenCalled();
  await act(async()=>finish({version:2,savedAt:'2026-11-10T12:00:00Z'}));
  expect(reportsApi.saveVersion).toHaveBeenCalledWith('fictional-center','r1',2);
  expect(find('report-transition-edit-lock')).toHaveLength(0);
 });
 it('returns read-only report sections with no submission action for a supervisor',async()=>{
  const p=rootProps();p.d.canEdit=false;p.d.canReview=true;p.d.report.status='IN_REVIEW';
  await mount(p);
  expect(get('report-readonly')).toBeTruthy();
  expect(find('report-save-version')).toHaveLength(0);
  expect(find('report-submit')).toHaveLength(0);
  expect(find('synthetic-report-assist')).toHaveLength(0);
  expect(get('report-section-summary').props.disabled).toBe(true);
  expect(JSON.stringify(tree.toJSON())).toContain('Release to family');
 });
 it('never exposes a production family release button as enabled authority',async()=>{
  await mount();
  const json=JSON.stringify(tree.toJSON());
  expect(json).toContain('Release to family');
  expect(json).toContain('Signing, approval and release stay off');
  expect(json).not.toContain('data-testid\\":\\"clinical-release-approved');
 });
});
