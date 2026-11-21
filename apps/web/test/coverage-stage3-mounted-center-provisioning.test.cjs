// M4-08 Stage 3: real center provisioning page. Transport responses are
// fictional; validation, application authorization, UX, optimistic failures and
// single-use administrator invite payload execute the shipped source.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let router,errors,originalWindow,originalFrame;
jest.mock('next/navigation',()=>({useRouter:()=>router}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>h('a',{href,...props},children)}));
jest.mock('@/components/centers/kit',()=>{
 const a=jest.requireActual('@/components/centers/kit');
 return {...a,Workspace:({children})=>children({permissions:['platform.centers.create']},errors),
  ChoiceGroup:({value,onChange,testId})=>h('div',{'data-testid':testId},
   h('button',{'data-testid':testId+'-select',onClick:()=>onChange(['speech','ot'])},'Select specialties'),
   h('span',null,value.join(','))),
  SelectField:({value,onChange,options,testId})=>h('select',{value,'data-testid':testId,
   onChange:e=>onChange(e.target.value)},options.map(o=>h('option',{key:o.value,value:o.value},o.label)))};
});
jest.mock('@/lib/centers',()=>{
 const a=jest.requireActual('@/lib/centers');
 return {...a,centersApi:{...a.centersApi,create:jest.fn()}};
});
jest.mock('@/lib/auth',()=>{
 const a=jest.requireActual('@/lib/auth');
 return {...a,authApi:{...a.authApi,application:jest.fn()}};
});
const {centersApi}=require('../src/lib/centers'),{authApi}=require('../src/lib/auth');
const NewCenterPage=require('../src/app/app/centers/new/page').default;
let tree;
const find=id=>tree.root.findAllByProps({'data-testid':id});
const get=id=>tree.root.findByProps({'data-testid':id});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const submit=async()=>act(async()=>{get('new-center-form').props.onSubmit({preventDefault:()=>{}});await Promise.resolve();});
const mount=async()=>act(async()=>{tree=create(h(NewCenterPage));});
const fill=async()=>{
 await change('center-name-input','  Fictional Therapy Center  ');
 await change('center-city-input','  Sharjah  ');
 await change('center-country-input','  UAE  ');
 await change('center-timezone-select','Asia/Dubai');
 await change('admin-name-input','  Fictional Administrator  ');
 await change('admin-email-input','admin@example.invalid');
 await click('center-specialty-select');
};
const application=(more={})=>({
 id:'application-fake',reference:'TB-FAKE-17',status:'APPROVED',organizationName:'Fictional Applied Center',
 city:'Sharjah',country:'UAE',timezone:'Asia/Dubai',contactName:'Fictional Owner',
 contactEmail:'owner@example.invalid',specialties:['speech'],...more
});
beforeAll(()=>{
 originalWindow=global.window;originalFrame=global.requestAnimationFrame;
 global.window={location:{search:''}};
 global.requestAnimationFrame=cb=>{cb();return 1;};
});
afterAll(()=>{global.window=originalWindow;global.requestAnimationFrame=originalFrame;});
beforeEach(()=>{
 jest.clearAllMocks();authApi.application.mockReset();centersApi.create.mockReset();
 router={replace:jest.fn()};errors=jest.fn(e=>{throw e;});
 authApi.application.mockResolvedValue(application());
 centersApi.create.mockResolvedValue({id:'center-created'});
 global.window.location.search='';
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real platform center provisioning and invitation atomicity',()=>{
 it('does not submit a blank center and shows validation evidence',async()=>{
  await mount();await submit();
  expect(get('new-center-validation-summary')).toBeTruthy();
  expect(centersApi.create).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
 });
 it('serializes exact normalized center and first admin only after valid inputs',async()=>{
  await mount();await fill();await submit();
  expect(centersApi.create).toHaveBeenCalledWith({
   name:'Fictional Therapy Center',slug:undefined,city:'Sharjah',
   country:'UAE',timezone:'Asia/Dubai',specialties:['speech','ot'],
   applicationId:undefined,firstAdmin:{displayName:'Fictional Administrator',email:'admin@example.invalid'}
  });
  expect(router.replace).toHaveBeenCalledWith('/app/centers/center-created?created=1');
 });
 it('normalizes an optional URL slug and catches malformed text',async()=>{
  await mount();await fill();
  await change('center-slug-input','Fictional-Center');
  expect(get('center-slug-input').props.value).toBe('fictional-center');
  await submit();
  expect(centersApi.create.mock.calls[0][0].slug).toBe('fictional-center');
 });
 it('preserves all fictional fields and never redirects after a rejected creation',async()=>{
  centersApi.create.mockRejectedValue({status:409,message:'Synthetic existing center'});
  await mount();await fill();await submit();
  expect(get('new-center-error')).toBeTruthy();
  expect(get('center-name-input').props.value).toContain('Fictional Therapy Center');
  expect(router.replace).not.toHaveBeenCalled();
 });
 it('prefills exactly the approved application and carries the application id',async()=>{
  global.window.location.search='?applicationId=application-fake';
  await mount();
  expect(authApi.application).toHaveBeenCalledWith('application-fake');
  expect(get('center-name-input').props.value).toBe('Fictional Applied Center');
  expect(get('new-center-back').props.href).toBe('/app/applications/application-fake');
  await submit();
  expect(centersApi.create).toHaveBeenCalledWith(
   expect.objectContaining({applicationId:'application-fake',firstAdmin:{
    displayName:'Fictional Owner',email:'owner@example.invalid'
   }}));
 });
 it('links to a previously provisioned center without allowing duplicate creation',async()=>{
  global.window.location.search='?applicationId=application-fake';
  authApi.application.mockResolvedValue(application({
   provisioning:{status:'PROVISIONED',center:{id:'center-existing',name:'Fictional Center'}}
  }));
  await mount();
  expect(get('new-center-already-provisioned')).toBeTruthy();
  expect(get('open-existing-center-link').props.href).toBe('/app/centers/center-existing');
  expect(find('new-center-form')).toHaveLength(0);
  expect(centersApi.create).not.toHaveBeenCalled();
 });
 it('shows failed application prefill without inventing an approval',async()=>{
  global.window.location.search='?applicationId=missing-app';
  authApi.application.mockRejectedValue({status:404,message:'Synthetic missing application'});
  await mount();
  expect(get('new-center-error')).toBeTruthy();
  expect(centersApi.create).not.toHaveBeenCalled();
 });
});
