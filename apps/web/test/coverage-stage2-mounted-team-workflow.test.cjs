// M4-08 Stage 2 — real Team page with source-bound invitations, permission
// controls and directory filters. Only synthetic backend responses are mocked.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let mockSession,routeError;
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('@/components/design/states',()=>{
 const real=jest.requireActual('@/components/design/states');
 return {...real,Dialog:({open,title,children,footer,testId})=>open?
 h('section',{'data-testid':testId},h('h2',null,title),children,h('footer',null,footer)):null};
});
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,Workspace:({children})=>children(mockSession,routeError),
  SelectField:({value,onChange,options,testId})=>h('select',{
   value,'data-testid':testId,onChange:e=>onChange(e.target.value)
  },options.map(o=>h('option',{key:o.value,value:o.value},o.label))),
  ChoiceGroup:({value,onChange,testId,options})=>h('div',{'data-testid':testId},
   h('button',{'data-testid':testId+'-select',onClick:()=>onChange([options[0].value])},
    String(value.length)))};
});
jest.mock('@/lib/centers',()=>{
 const real=jest.requireActual('@/lib/centers');
 return {...real,centersApi:{...real.centersApi,
  staff:jest.fn(),invitations:jest.fn(),inviteStaff:jest.fn(),staffInvitation:jest.fn()}};
});
const {centersApi}=require('../src/lib/centers');
const TeamPage=require('../src/app/app/team/page').default;
const member=(more={})=>({id:'staff-a',displayName:'Synthetic Leila',
 email:'synthetic-leila@example.invalid',title:'Therapist',roles:['THERAPIST'],
 status:'ACTIVE',...more});
const invite=(more={})=>({id:'invite-a',displayName:'Synthetic May',
 email:'synthetic-may@example.invalid',roles:['THERAPIST'],status:'PENDING',
 sendCount:1,lastSentAt:'2026-11-10T12:00:00Z',...more});
let tree,originalWindow;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const json=()=>JSON.stringify(tree.toJSON());
const mount=async()=>act(async()=>{tree=create(h(TeamPage));});
beforeAll(()=>{originalWindow=global.window;global.window={
 ...(originalWindow||{}),location:{search:''},
};});
afterAll(()=>{global.window=originalWindow;});
beforeEach(()=>{
 jest.clearAllMocks();
 for(const k of ['staff','invitations','inviteStaff','staffInvitation'])centersApi[k].mockReset();
 centersApi.staff.mockResolvedValue({items:[member()],total:1});
 centersApi.invitations.mockResolvedValue({items:[invite()]});
 centersApi.inviteStaff.mockResolvedValue({id:'invite-new'});
 centersApi.staffInvitation.mockResolvedValue({email:'synthetic-may@example.invalid'});
 routeError=jest.fn(e=>{throw e;});
 mockSession={activeContext:{type:'center',centerId:'center-a',role:'CENTER_ADMIN'},
  permissions:['center.staff.read','center.staff.invite']};
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real team route and permission-scoped invitations',()=>{
 it('loads the scoped staff directory with no invented members',async()=>{
  await mount();
  expect(centersApi.staff).toHaveBeenCalledWith('center-a',
   {q:'',role:'',status:'',specialty:''});
  expect(get('staff-row-staff-a').props.href).toBe('/app/team/staff-a');
  expect(get('staff-count')).toBeTruthy();
  expect(find('staff-row-another')).toHaveLength(0);
 });
 it('applies actual role/specialty filters to backend request',async()=>{
  await mount();
  await change('staff-role-filter','THERAPIST');
  await change('staff-specialty-filter','speech');
  expect(centersApi.staff).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({role:'THERAPIST',specialty:'speech'}));
 });
 it('trims a submitted search and keeps latest active filters',async()=>{
  await mount();await change('staff-search-input','  Synthetic  ');
  const form=tree.root.findByProps({role:'search'});
  await act(async()=>form.props.onSubmit({preventDefault:()=>{}}));
  expect(centersApi.staff).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({q:'Synthetic'}));
 });
 it('does not grant invitation actions to read-only staff',async()=>{
  mockSession.permissions=['center.staff.read'];
  await mount();
  expect(find('invite-staff-button')).toHaveLength(0);
  await click('team-tab-invitations');
  expect(get('invitation-row-invite-a')).toBeTruthy();
  expect(find('invitation-resend-invite-a')).toHaveLength(0);
  expect(find('invitation-revoke-invite-a')).toHaveLength(0);
 });
 it('requires name, valid email, and role before sending',async()=>{
  await mount();await click('invite-staff-button');
  await click('staff-invite-send');
  expect(get('staff-invite-error')).toBeTruthy();
  expect(centersApi.inviteStaff).not.toHaveBeenCalled();
  await change('staff-invite-name-input','Synthetic May');
  await change('staff-invite-email-input','invalid-email');
  await click('staff-invite-role-select');
  await click('staff-invite-send');
  expect(centersApi.inviteStaff).not.toHaveBeenCalled();
  expect(json()).toContain('valid email address');
 });
 it('sends a trimmed and exact center-scoped invitation, then refreshes invitation tab',async()=>{
  await mount();await click('invite-staff-button');
  await change('staff-invite-name-input','  Synthetic May  ');
  await change('staff-invite-email-input','synthetic-may@example.invalid');
  await change('staff-invite-title-input','  Therapist  ');
  await click('staff-invite-role-select');
  await click('staff-invite-send');
  expect(centersApi.inviteStaff).toHaveBeenCalledWith('center-a',
   expect.objectContaining({
    displayName:'Synthetic May',email:'synthetic-may@example.invalid',title:'Therapist',
    roles:[expect.any(String)]
   }));
  expect(find('staff-invite-dialog')).toHaveLength(0);
  expect(get('team-notice')).toBeTruthy();
  expect(get('invitation-row-invite-a')).toBeTruthy();
 });
 it('resends only pending or expired invitations and never for accepted ones',async()=>{
  centersApi.invitations.mockResolvedValue({items:[
   invite(),invite({id:'accepted-a',status:'ACCEPTED'})
  ]});
  await mount();await click('team-tab-invitations');
  expect(find('invitation-resend-accepted-a')).toHaveLength(0);
  expect(find('invitation-revoke-accepted-a')).toHaveLength(0);
  await click('invitation-resend-invite-a');
  expect(centersApi.staffInvitation).toHaveBeenCalledWith('center-a','invite-a','resend');
  expect(get('invitations-success')).toBeTruthy();
 });
 it('shows an API rejection without claiming an invitation was sent',async()=>{
  centersApi.inviteStaff.mockRejectedValue({status:422,message:'Synthetic duplicate invitation'});
  await mount();await click('invite-staff-button');
  await change('staff-invite-name-input','Synthetic May');
  await change('staff-invite-email-input','synthetic-may@example.invalid');
  await click('staff-invite-role-select');
  await click('staff-invite-send');
  expect(get('staff-invite-error')).toBeTruthy();
  expect(find('team-notice')).toHaveLength(0);
  expect(get('staff-invite-dialog')).toBeTruthy();
 });
});
