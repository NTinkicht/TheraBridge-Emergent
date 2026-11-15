// Stage 2 source-executing member self-profile; server remains authoritative
// for the active center, roles, email and permissions.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let session,errors;
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,Workspace:({children})=>children(session,errors),
 ChoiceGroup:({value,onChange,testId})=>h('div',{'data-testid':testId},
  h('button',{'data-testid':testId+'-clear',onClick:()=>onChange([])},'Clear values'),
  h('button',{'data-testid':testId+'-set',onClick:()=>onChange(['speech'])},'Select'),
  h('span',null,value.join(', ')))};
});
jest.mock('@/lib/centers',()=>{
 const real=jest.requireActual('@/lib/centers');
 return {...real,centersApi:{...real.centersApi,me:jest.fn(),updateMe:jest.fn()}};
});
const {centersApi}=require('../src/lib/centers');
const ProfilePage=require('../src/app/app/profile/page').default;
const me=(more={})=>({
 id:'user-a',displayName:'Fictional Leila',email:'leila@example.invalid',
 roles:['THERAPIST'],specialties:['speech'],responsibilities:[],
 title:'Speech therapist',phone:'+971501112233',...more
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>get(id).props.onClick());
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const submit=async()=>act(async()=>{get('profile-form').props.onSubmit({
 preventDefault:()=>{}
 });await Promise.resolve();});
const mount=async()=>act(async()=>{tree=create(h(ProfilePage));});
beforeEach(()=>{
 jest.clearAllMocks();centersApi.me.mockReset();centersApi.updateMe.mockReset();
 centersApi.me.mockResolvedValue(me());
 centersApi.updateMe.mockImplementation(async(_id,input)=>me(input));
 session={activeContext:{type:'center',centerId:'center-a'},
 permissions:['center.profile.self']};
 errors=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('mounted self-profile and immutable identity fields',()=>{
 it('loads only the active center self-profile, not another staff member',async()=>{
  await mount();
  expect(centersApi.me).toHaveBeenCalledWith('center-a');
  expect(get('profile-title')).toBeTruthy();
  expect(get('profile-name-input').props.value).toBe('Fictional Leila');
  expect(get('profile-email-input').props.disabled).toBe(true);
  expect(get('profile-email-input').props.readOnly).toBe(true);
 });
 it('rejects a blank or one-character display name',async()=>{
  await mount();
  await change('profile-name-input','X');
  await submit();
  expect(get('profile-danger')).toBeTruthy();
  expect(centersApi.updateMe).not.toHaveBeenCalled();
 });
 it('rejects malformed phone numbers prior to remote mutation',async()=>{
  await mount();
  await change('profile-phone-input','not-a-phone');
  await submit();
  expect(get('profile-danger')).toBeTruthy();
  expect(centersApi.updateMe).not.toHaveBeenCalled();
 });
 it('saves only editable personal fields with trimmed values',async()=>{
  await mount();
  await change('profile-name-input','  Synthetic Dr Leila  ');
  await change('profile-title-input','  Speech therapist  ');
  await change('profile-phone-input','  +971 50 111 2233  ');
  await click('profile-specialty-set');
  await submit();
  expect(centersApi.updateMe).toHaveBeenCalledWith('center-a',
   expect.objectContaining({displayName:'Synthetic Dr Leila',title:'Speech therapist',
    phone:'+971 50 111 2233',specialties:['speech']}));
  expect(centersApi.updateMe.mock.calls[0][1]).not.toHaveProperty('roles');
  expect(centersApi.updateMe.mock.calls[0][1]).not.toHaveProperty('email');
  expect(get('profile-success')).toBeTruthy();
 });
 it('preserves edits and displays rejection after server denied update',async()=>{
  centersApi.updateMe.mockRejectedValue({status:403,message:'Synthetic revoked access'});
  await mount();await change('profile-name-input','Synthetic New Name');await submit();
  expect(get('profile-danger')).toBeTruthy();
  expect(get('profile-name-input').props.value).toBe('Synthetic New Name');
  expect(find('profile-success')).toHaveLength(0);
 });
 it('does not invent a profile on denied initial fetch and retries',async()=>{
  centersApi.me.mockRejectedValueOnce(new Error('Synthetic expired session'))
   .mockResolvedValueOnce(me());
  await mount();
  expect(get('profile-error')).toBeTruthy();
  expect(find('profile-form')).toHaveLength(0);
  const retry=get('profile-error').findAllByType('button')[0];
  await act(async()=>{retry.props.onClick();await Promise.resolve();});
  expect(get('profile-form')).toBeTruthy();
  expect(centersApi.me).toHaveBeenCalledTimes(2);
 });
});
