// Stage 2: mounted center settings with authorization and optimistic revision.
// Server remains authoritative for tenancy, specialties, and timezone.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let session,errors;
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,Workspace:({children})=>children(session,errors),
  SelectField:({value,onChange,testId,options})=>h('select',{
   value,'data-testid':testId,onChange:e=>onChange(e.target.value)
  },options.map(o=>h('option',{key:o.value,value:o.value},o.label))),
  ChoiceGroup:({value,onChange,testId})=>h('div',{'data-testid':testId},
   h('button',{'data-testid':testId+'-clear',onClick:()=>onChange([])},'Clear specialties'),
   h('button',{'data-testid':testId+'-select',onClick:()=>onChange(['speech','ot'])},'Select specialties'),
   h('span',null,value.join(', ')))};
});
jest.mock('@/lib/centers',()=>{
 const real=jest.requireActual('@/lib/centers');
 return {...real,centersApi:{...real.centersApi,
  settings:jest.fn(),updateSettings:jest.fn()}};
});
const {centersApi}=require('../src/lib/centers');
const CenterSettingsPage=require('../src/app/app/center/page').default;
const center=(more={})=>({
 id:'center-a',name:'Fictional Center',slug:'fictional-center',city:'Sharjah',
 country:'United Arab Emirates',timezone:'Asia/Dubai',specialties:['speech'],
 version:7,...more
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const submit=async()=>act(async()=>{get('center-settings-form').props.onSubmit({
 preventDefault:()=>{}
 });await Promise.resolve();});
const mount=async()=>act(async()=>{tree=create(h(CenterSettingsPage));});
const output=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();centersApi.settings.mockReset();centersApi.updateSettings.mockReset();
 centersApi.settings.mockResolvedValue(center());
 centersApi.updateSettings.mockImplementation(async(_id,input)=>center(input));
 session={activeContext:{type:'center',centerId:'center-a',role:'CENTER_ADMIN'},
 permissions:['center.settings.read','center.settings.update']};
 errors=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('mounted center settings tenant-scoped revision controls',()=>{
 it('loads center-scoped settings without a default overwrite',async()=>{
  await mount();
  expect(centersApi.settings).toHaveBeenCalledWith('center-a');
  expect(get('settings-name-input').props.value).toBe('Fictional Center');
  expect(get('settings-slug-input').props.disabled).toBe(true);
  expect(get('settings-slug-input').props.readOnly).toBe(true);
 });
 it('never exposes save for read-only staff',async()=>{
  session.permissions=['center.settings.read'];
  await mount();
  expect(find('settings-save-button')).toHaveLength(0);
  expect(get('settings-name-input').props.disabled).toBe(true);
  expect(centersApi.updateSettings).not.toHaveBeenCalled();
 });
 it('rejects empty center name, city, or country before server mutation',async()=>{
  await mount();await change('settings-name-input','X');
  await submit();
  expect(get('center-settings-danger')).toBeTruthy();
  expect(centersApi.updateSettings).not.toHaveBeenCalled();
  await change('settings-name-input','Fictional Center');
  await change('settings-city-input','');
  await submit();
  expect(centersApi.updateSettings).not.toHaveBeenCalled();
 });
 it('refuses removal of all specialties',async()=>{
  await mount();await click('settings-specialty-clear');
  await submit();
  expect(get('center-settings-danger')).toBeTruthy();
  expect(centersApi.updateSettings).not.toHaveBeenCalled();
 });
 it('sends normalized fields and exact optimistic version only on valid submit',async()=>{
  await mount();
  await change('settings-name-input','  Synthetic Therapy Center  ');
  await change('settings-city-input','  Sharjah  ');
  await change('settings-country-input','  UAE  ');
  await click('settings-specialty-select');
  await submit();
  expect(centersApi.updateSettings).toHaveBeenCalledWith('center-a',
   expect.objectContaining({
    name:'Synthetic Therapy Center',city:'Sharjah',country:'UAE',
    specialties:['speech','ot'],version:7,timezone:'Asia/Dubai'
   }));
  expect(get('center-settings-success')).toBeTruthy();
 });
 it('retains original version and entered values on rejected concurrent change',async()=>{
  centersApi.updateSettings.mockRejectedValue({status:409,message:'Synthetic stale center revision'});
  await mount();await change('settings-name-input','Fictional newer center');
  await submit();
  expect(get('center-settings-danger')).toBeTruthy();
  expect(get('settings-name-input').props.value).toBe('Fictional newer center');
  expect(centersApi.updateSettings.mock.calls[0][1].version).toBe(7);
  expect(find('center-settings-success')).toHaveLength(0);
 });
 it('includes historic saved timezone even when not in predefined options',async()=>{
  centersApi.settings.mockResolvedValue(center({timezone:'Etc/GMT-4'}));
  await mount();
  const options=get('settings-timezone-select').findAllByType('option').map(x=>x.props.value);
  expect(options).toContain('Etc/GMT-4');
  expect(get('settings-timezone-select').props.value).toBe('Etc/GMT-4');
 });
 it('shows retry rather than inventing settings on failed initial fetch',async()=>{
  centersApi.settings.mockRejectedValueOnce(new Error('Synthetic unavailable'))
   .mockResolvedValueOnce(center());
  await mount();
  expect(get('center-settings-error')).toBeTruthy();
  expect(find('center-settings-form')).toHaveLength(0);
  const retry=get('center-settings-error').findAllByType('button')[0];
  await act(async()=>{retry.props.onClick();await Promise.resolve();});
  expect(get('center-settings-form')).toBeTruthy();
  expect(centersApi.settings).toHaveBeenCalledTimes(2);
 });
});
