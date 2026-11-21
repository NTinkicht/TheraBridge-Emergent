// Stage 3: real application intake must validate synthetic-only acknowledgement,
// scoped center services, estimated load and prevent duplicate/provisional claims.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('@/components/auth/AuthLayout',()=>({
 AuthLayout:({children,testId,title})=>h('main',{'data-testid':testId},
 h('h1',null,title),children)
}));
jest.mock('@/lib/auth',()=>{
 const a=jest.requireActual('@/lib/auth');
 return {...a,authApi:{...a.authApi,submitApplication:jest.fn()}};
});
const {authApi}=require('../src/lib/auth');
const {ApiError}=require('../src/lib/api');
const ApplyPage=require('../src/app/apply/page').default;
let tree,oldFrame;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const check=async(id,checked=true)=>act(async()=>get(id).props.onChange({target:{checked}}));
const submit=async()=>act(async()=>{get('apply-form').props.onSubmit({
 preventDefault:()=>{}
 });await Promise.resolve();});
const mount=async()=>act(async()=>{tree=create(h(ApplyPage));});
const fill=async()=>{
 await change('apply-org-input','  Fictional Pediatric Center  ');
 await change('apply-contact-name-input','  Synthetic Coordinator  ');
 await change('apply-contact-email-input','coordinator@example.invalid');
 await change('apply-country-input','  UAE  ');
 await change('apply-city-input','  Sharjah  ');
 await change('apply-timezone-select','Asia/Dubai');
 await change('apply-therapists-input','5');
 await change('apply-children-input','25');
 await check('apply-specialty-speech');
 await check('apply-ack-checkbox');
};
beforeAll(()=>{oldFrame=global.requestAnimationFrame;
 global.requestAnimationFrame=cb=>{cb();return 1;};});
afterAll(()=>{global.requestAnimationFrame=oldFrame;});
beforeEach(()=>{jest.clearAllMocks();authApi.submitApplication.mockReset();
 authApi.submitApplication.mockResolvedValue({reference:'TB-FAKE-104'});});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real center application source validation and false-success protection',()=>{
 it('requires complete center and contact details and synthetic-only consent',async()=>{
  await mount();await submit();
  expect(get('apply-validation-summary')).toBeTruthy();
  expect(get('apply-ack-error')).toBeTruthy();
  expect(get('apply-specialties-error')).toBeTruthy();
  expect(authApi.submitApplication).not.toHaveBeenCalled();
 });
 it('submits only normalized fields, integer capacity and explicit synthetic acceptance',async()=>{
  await mount();await fill();await submit();
  expect(authApi.submitApplication).toHaveBeenCalledWith({
   organizationName:'Fictional Pediatric Center',contactName:'Synthetic Coordinator',
   contactEmail:'coordinator@example.invalid',contactPhone:undefined,
   country:'UAE',city:'Sharjah',timezone:'Asia/Dubai',
   specialties:['speech'],therapistEstimate:5,childEstimate:25,
   message:undefined,syntheticDataAcknowledged:true
  });
  expect(get('apply-success')).toBeTruthy();
  expect(get('apply-reference').props.children).toBe('TB-FAKE-104');
  expect(find('apply-form')).toHaveLength(0);
 });
 it('removes a previously selected specialty and prevents incomplete submission',async()=>{
  await mount();await fill();
  await check('apply-specialty-speech',false);
  await submit();
  expect(get('apply-specialties-error')).toBeTruthy();
  expect(authApi.submitApplication).not.toHaveBeenCalled();
 });
 it('must retain synthetic-only acknowledgement when fields are otherwise valid',async()=>{
  await mount();await fill();
  await check('apply-ack-checkbox',false);
  await submit();
  expect(get('apply-ack-error')).toBeTruthy();
  expect(authApi.submitApplication).not.toHaveBeenCalled();
 });
 it('serializes optional phone and message only after clinical-safe acknowledgement',async()=>{
  await mount();await fill();
  await change('apply-contact-phone-input',' +971501112233 ');
  await change('apply-message-input','  Synthetic scheduling only  ');
  await submit();
  expect(authApi.submitApplication).toHaveBeenCalledWith(expect.objectContaining({
   contactPhone:'+971501112233',message:'Synthetic scheduling only'
  }));
 });
 it('does not invent a reference when application is already submitted',async()=>{
  authApi.submitApplication.mockRejectedValue(new ApiError(409,'Duplicate synthetic application'));
  await mount();await fill();await submit();
  expect(get('apply-error')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain('Duplicate synthetic application');
  expect(find('apply-success')).toHaveLength(0);
  expect(get('apply-contact-email-input').props.value).toBe('coordinator@example.invalid');
 });
 it('preserves rate limiting server notice without sending another request',async()=>{
  authApi.submitApplication.mockRejectedValue(new ApiError(429,'Synthetic retry after 5 minutes'));
  await mount();await fill();await submit();
  expect(JSON.stringify(tree.toJSON())).toContain('Synthetic retry after 5 minutes');
  expect(authApi.submitApplication).toHaveBeenCalledTimes(1);
  expect(find('apply-success')).toHaveLength(0);
 });
 it('refuses untrusted 400 payload and does not mark application approved',async()=>{
  authApi.submitApplication.mockRejectedValue(new ApiError(400,'Synthetic invalid fields'));
  await mount();await fill();await submit();
  expect(JSON.stringify(tree.toJSON())).toContain('Some details were not accepted');
  expect(find('apply-success')).toHaveLength(0);
 });
});
