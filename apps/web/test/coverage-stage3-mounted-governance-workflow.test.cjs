// M4-08 Stage 3: real frozen document governance; transport mocked at API
// boundary. Internal review, optimistic versions and immutable preview must
// never masquerade as clinical signing, consent or production release.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let session,errors,oldWindow;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/centers/kit',()=>{
 const a=jest.requireActual('@/components/centers/kit');
 return {...a,Workspace:({children})=>children(session,errors),
  ReasonField:({value,onChange,testId})=>h('textarea',{'data-testid':testId,
   value,onChange:e=>onChange(e.target.value)})};
});
jest.mock('@/components/clinical/SyntheticReleaseActions',()=>({
 SyntheticReleaseActions:({document})=>h('aside',{'data-testid':'synthetic-actions-'+document.id},'Synthetic only')
}));
jest.mock('@/components/clinical/SyntheticGrantRecovery',()=>({
 SyntheticGrantRecovery:({centerId})=>h('aside',{'data-testid':'synthetic-recovery-'+centerId})}));
jest.mock('@/lib/governance',()=>{
 const a=jest.requireActual('@/lib/governance');
 return {...a,governanceApi:{...a.governanceApi,
  documents:jest.fn(),history:jest.fn(),transition:jest.fn(),preview:jest.fn()}};
});
const {governanceApi}=require('../src/lib/governance');
const GovernancePage=require('../src/app/app/governance/page').default;
const doc=(changes={})=>({
 id:'plan-a',kind:'PLAN',title:'Fictional speech plan',status:'DRAFT',
 childId:'child-a',childName:'Fictional Alex',version:3,mine:true,
 authorName:'Fictional Leila',...changes
});
const history=(changes={})=>({
 id:'event-a',fromStatus:'DRAFT',toStatus:'IN_REVIEW',sourceVersion:3,
 reason:'Fictional reviewed reason',createdAt:'2026-11-10T10:00:00Z',
 actorName:'Fictional reviewer',snapshotId:'snapshot-a',...changes
});
const snapshot=(changes={})=>({
 id:'snapshot-a',kind:'PLAN',notice:'Synthetic frozen snapshot — not clinically approved',
 documentId:'plan-a',sourceVersion:3,createdAt:'2026-11-10T10:00:00Z',
 childId:'child-a',centerId:'center-a',authorId:'clinician-a',
 generatedById:'supervisor-a',fingerprint:'fictional-sha256-fingerprint',
 content:{summary:'Fictional saved report',goals:[{title:'Fictional goal',target:5}]},
 evidence:{observations:['Fictional observation']},...changes
});
let tree;
const find=id=>tree.root.findAllByProps({'data-testid':id});
const get=id=>tree.root.findByProps({'data-testid':id});
const textOf=c=>typeof c==='string'?c:Array.isArray(c)?c.map(textOf).join(''):
 React.isValidElement(c)?textOf(c.props.children):'';
const button=label=>tree.root.findAllByType('button').find(b=>textOf(b.props.children).includes(label));
const click=async label=>act(async()=>{const b=button(label);if(!b)throw Error('Missing '+label);
 b.props.onClick();await Promise.resolve();});
const clickId=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const mount=async()=>act(async()=>{tree=create(h(GovernancePage));});
const output=()=>JSON.stringify(tree.toJSON());
beforeAll(()=>{oldWindow=global.window;global.window={print:jest.fn()};});
afterAll(()=>{global.window=oldWindow;});
beforeEach(()=>{
 jest.clearAllMocks();
 for(const k of ['documents','history','transition','preview'])governanceApi[k].mockReset();
 governanceApi.documents.mockResolvedValue({items:[doc()]});
 governanceApi.history.mockResolvedValue({items:[history()]});
 governanceApi.transition.mockResolvedValue({version:4});
 governanceApi.preview.mockResolvedValue(snapshot());
 session={activeContext:{type:'center',centerId:'center-a',role:'THERAPIST'},
 permissions:['center.clinical.read']};
 errors=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real internal clinical governance history and release locks',()=>{
 it('fetches center-scoped documents, never conferring clinical approval',async()=>{
  await mount();
  expect(governanceApi.documents).toHaveBeenCalledWith('center-a');
  expect(get('governance-title')).toBeTruthy();
  expect(output()).toContain('confer no clinical authorization');
  expect(get('synthetic-recovery-center-a')).toBeTruthy();
 });
 it('selects an internal draft and opens only the authorized child-scoped plan',async()=>{
  await mount();await click('Fictional speech plan');
  expect(governanceApi.history).toHaveBeenCalledWith('center-a',expect.objectContaining({
   id:'plan-a',childId:'child-a',kind:'PLAN'
  }));
  expect(get('document-review')).toBeTruthy();
  expect(get('transition-submit')).toBeTruthy();
  expect(get('transition-freeze')).toBeTruthy();
  expect(output()).toContain('/app/clinical/child-a');
  expect(find('transition-return')).toHaveLength(0);
 });
 it('requires reviewer explanation before any draft transition',async()=>{
  await mount();await click('Fictional speech plan');
  expect(get('transition-submit').props.disabled).toBe(true);
  await change('governance-reason','  Human source review completed  ');
  expect(get('transition-submit').props.disabled).toBe(false);
  await clickId('transition-submit');
  expect(governanceApi.transition).toHaveBeenCalledWith('center-a',
   expect.objectContaining({id:'plan-a'}),'SUBMIT',
   '  Human source review completed  ');
  expect(governanceApi.documents).toHaveBeenCalledTimes(2);
 });
 it('allows supervisor comment and return only on submitted drafts, not release',async()=>{
  session.activeContext.role='CLINICAL_SUPERVISOR';
  governanceApi.documents.mockResolvedValue({items:[doc({status:'IN_REVIEW',mine:false})]});
  await mount();await click('Fictional speech plan');
  expect(get('transition-comment')).toBeTruthy();
  expect(get('transition-return')).toBeTruthy();
  expect(find('transition-submit')).toHaveLength(0);
  expect(find('transition-freeze')).toHaveLength(0);
  await change('governance-reason','Synthetic request for correction');
  await clickId('transition-return');
  expect(governanceApi.transition).toHaveBeenCalledWith('center-a',
   expect.any(Object),'RETURN','Synthetic request for correction');
 });
 it('keeps author of in-review draft restricted to explicit withdrawal',async()=>{
  governanceApi.documents.mockResolvedValue({items:[doc({status:'IN_REVIEW'})]});
  await mount();await click('Fictional speech plan');
  expect(get('transition-withdraw')).toBeTruthy();
  expect(find('transition-freeze')).toHaveLength(0);
  expect(find('transition-submit')).toHaveLength(0);
 });
 it('renders withdrawn internal plan read-only, never a release action',async()=>{
  governanceApi.documents.mockResolvedValue({items:[doc({status:'WITHDRAWN'})]});
  await mount();await click('Fictional speech plan');
  expect(find('transition-withdraw')).toHaveLength(0);
  expect(find('transition-freeze')).toHaveLength(0);
  expect(output()).toContain('preserved version stays read-only');
 });
 it('shows an immutable recorded history and server snapshot, not a fabricated approval',async()=>{
  await mount();await click('Fictional speech plan');
  expect(get('view-frozen-preview')).toBeTruthy();
  await clickId('view-frozen-preview');
  expect(governanceApi.preview).toHaveBeenCalledWith('center-a','snapshot-a');
  expect(get('immutable-preview')).toBeTruthy();
  expect(get('preview-fingerprint').props.children).toBe('fictional-sha256-fingerprint');
  expect(output()).toContain('Fictional saved report');
  expect(output()).toContain('Synthetic frozen snapshot');
 });
 it('never claims successful transition after server rejection',async()=>{
  governanceApi.transition.mockRejectedValue({status:403,message:'Synthetic clinician access revoked'});
  await mount();await click('Fictional speech plan');
  await change('governance-reason','Fictional review evidence');
  await clickId('transition-submit');
  expect(governanceApi.transition).toHaveBeenCalledTimes(1);
  expect(governanceApi.documents).toHaveBeenCalledTimes(1);
  expect(output()).toContain('Synthetic clinician access revoked');
 });
 it('switches a supervisor queue without mutating underlying document status',async()=>{
  governanceApi.documents.mockResolvedValue({items:[
   doc(),doc({id:'report-a',kind:'REPORT',title:'Fictional report',status:'IN_REVIEW'})
  ]});
  await mount();await click('Supervisor review queue');
  expect(output()).toContain('Fictional report');
  expect(output()).not.toContain('Fictional speech plan');
  expect(governanceApi.transition).not.toHaveBeenCalled();
 });
 it('renders empty/error states without leaking unreturned clinical documents',async()=>{
  governanceApi.documents.mockResolvedValue({items:[]});
  await mount();
  expect(get('governance-empty')).toBeTruthy();
  expect(find('governance-list')).toHaveLength(0);
 });
});
