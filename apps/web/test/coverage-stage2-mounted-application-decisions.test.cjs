// M4-08: real platform application decision panel with independent permission,
// rationale, concurrency and provisioning checks. Server responses are synthetic.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('@/lib/auth',()=>{
 const real=jest.requireActual('@/lib/auth');
 return {...real,authApi:{...real.authApi,startReview:jest.fn(),decide:jest.fn()}};
});
const {authApi}=require('../src/lib/auth');
const {ApiError}=require('../src/lib/api');
const {DecisionPanel}=require('../src/components/applications/DecisionPanel');
const application=(more={})=>({
 id:'app-fake',status:'SUBMITTED',version:5,decisionRationale:null,
 decidedAt:null,decidedBy:null,provisioning:null,...more
});
let tree,changed,errors;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const choose=async id=>act(async()=>get(id).props.onChange());
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const submit=async()=>act(async()=>{get('decision-form').props.onSubmit({
 preventDefault:()=>{}
 });await Promise.resolve();});
const mount=async(app=application(),canDecide=true)=>act(async()=>{tree=create(h(DecisionPanel,{
 app,canDecide,onChanged:changed,onError:errors
}));});
beforeEach(()=>{
 jest.clearAllMocks();authApi.startReview.mockReset();authApi.decide.mockReset();
 changed=jest.fn();errors=jest.fn(e=>{throw e;});
 authApi.startReview.mockResolvedValue(application({status:'UNDER_REVIEW',version:6}));
 authApi.decide.mockResolvedValue(application({status:'REJECTED',version:6}));
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real application decision mutation authorization and versioning',()=>{
 it('renders read-only state without mutation controls for view-only staff',async()=>{
  await mount(application(),false);
  expect(get('decision-readonly')).toBeTruthy();
  expect(find('decision-form')).toHaveLength(0);
  expect(find('start-review-button')).toHaveLength(0);
  expect(authApi.decide).not.toHaveBeenCalled();
 });
 it('begins a submitted review with exact optimistic application version',async()=>{
  await mount();await click('start-review-button');
  expect(authApi.startReview).toHaveBeenCalledWith('app-fake',5);
  expect(changed).toHaveBeenCalledWith(expect.objectContaining({status:'UNDER_REVIEW'}));
 });
 it('requires an explicit selection and a sufficiently detailed rationale',async()=>{
  await mount();await submit();
  expect(authApi.decide).not.toHaveBeenCalled();
  expect(get('decision-error')).toBeTruthy();
  await choose('decision-approved');
  await change('decision-rationale-input','short');
  await submit();
  expect(authApi.decide).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain('at least 10 characters');
 });
 it('sends trimmed rejection rationale with exact record revision',async()=>{
  await mount(application({status:'UNDER_REVIEW',version:9}));
  expect(find('start-review-button')).toHaveLength(0);
  await choose('decision-rejected');
  await change('decision-rationale-input','  Synthetic compliance requirement is missing  ');
  await submit();
  expect(authApi.decide).toHaveBeenCalledWith('app-fake','REJECTED',
   'Synthetic compliance requirement is missing',9);
  expect(changed).toHaveBeenCalledWith(expect.objectContaining({status:'REJECTED'}));
 });
 it('does not claim approval on a stale optimistic conflict',async()=>{
  authApi.decide.mockRejectedValue(new ApiError(409,'Application changed'));
  await mount();await choose('decision-approved');
  await change('decision-rationale-input','Synthetic approval rationale with evidence');
  await submit();
  expect(get('decision-error')).toBeTruthy();
  expect(changed).not.toHaveBeenCalled();
  expect(get('decision-rationale-input').props.value)
   .toBe('Synthetic approval rationale with evidence');
 });
 it('preserves rationale when the network rejects submission',async()=>{
  authApi.decide.mockRejectedValue(new Error('Synthetic network failure'));
  await mount();await choose('decision-rejected');
  await change('decision-rationale-input','Synthetic rejection due to incomplete records');
  await submit();
  expect(changed).not.toHaveBeenCalled();
  expect(get('decision-error')).toBeTruthy();
 });
 it('shows a recorded outcome and optional provisioning path without an editable decision',async()=>{
  await mount(application({status:'APPROVED',
   decisionRationale:'Synthetic platform approval',
   decidedBy:'Fictional reviewer',decidedAt:'2026-11-10T12:00:00Z',
   provisioning:{status:'PENDING',center:null}}));
  expect(get('decision-record')).toBeTruthy();
  expect(get('provision-center-button').props.href)
   .toBe('/app/centers/new?applicationId=app-fake');
  expect(find('decision-form')).toHaveLength(0);
  expect(JSON.stringify(tree.toJSON())).toContain('Synthetic platform approval');
 });
 it('links only recorded provisioned center identity after successful provisioning',async()=>{
  await mount(application({status:'APPROVED',
   provisioning:{status:'PROVISIONED',center:{id:'center-fake',name:'Fictional Center'}}}));
  expect(get('view-center-button').props.href).toBe('/app/centers/center-fake');
  expect(find('provision-center-button')).toHaveLength(0);
 });
});
