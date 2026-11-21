// Stage 2 real team member profile and revocation controls, with synthetic
// backend responses. API remains authoritative for membership permissions.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let session,errors;
jest.mock('next/navigation',()=>({useParams:()=>({id:'member-a'})}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('@/components/design/states',()=>{
 const actual=jest.requireActual('@/components/design/states');
 return {...actual,Dialog:({open,children,footer,testId})=>open?
 h('section',{'data-testid':testId},children,h('footer',null,footer)):null};
});
jest.mock('@/components/centers/kit',()=>{
 const actual=jest.requireActual('@/components/centers/kit');
 return {...actual,
  Workspace:({children})=>children(session,errors),
  ChoiceGroup:({value,onChange,options,testId})=>h('div',{'data-testid':testId},
   h('button',{'data-testid':testId+'-clear',onClick:()=>onChange([])},'Clear choices'),
   h('button',{'data-testid':testId+'-set',onClick:()=>onChange([options[0].value])},'Select first'),
   h('span',null,value.join(', '))),
  ReasonField:({value,onChange,testId})=>h('textarea',{
   value,'data-testid':testId,onChange:e=>onChange(e.target.value)
  })};
});
jest.mock('@/lib/centers',()=>{
 const real=jest.requireActual('@/lib/centers');
 return {...real,centersApi:{...real.centersApi,
  member:jest.fn(),updateMember:jest.fn(),memberStatus:jest.fn()}};
});
const {centersApi}=require('../src/lib/centers');
const MemberPage=require('../src/app/app/team/[id]/page').default;
const member=(changes={})=>({
 id:'member-a',displayName:'Fictional Leila',email:'leila@example.invalid',
 roles:['THERAPIST'],specialties:['speech'],responsibilities:[],
 title:'Clinician',phone:'+971501112233',joinedAt:'2026-10-01T12:00:00Z',
 status:'ACTIVE',statusReason:null,statusChangedAt:null,events:[],...changes
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const mount=async()=>act(async()=>{tree=create(h(MemberPage));});
const output=()=>JSON.stringify(tree.toJSON());
beforeEach(()=>{
 jest.clearAllMocks();for(const k of ['member','updateMember','memberStatus'])centersApi[k].mockReset();
 centersApi.member.mockResolvedValue(member());
 centersApi.updateMember.mockImplementation(async(_c,_id,v)=>member({
  title:v.title,phone:v.phone,roles:v.roles
 }));
 centersApi.memberStatus.mockImplementation(async(_c,_id,status)=>member({
  status:status==='suspend'?'SUSPENDED':status==='revoke'?'REVOKED':'ACTIVE'
 }));
 session={activeContext:{type:'center',centerId:'center-a',membershipId:'admin-a'},
 permissions:['center.staff.read','center.staff.manage']};
 errors=jest.fn(e=>{throw e;});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('mounted therapist access revocation and scoped management',()=>{
 it('fetches exact center member and renders read-only profile',async()=>{
  await mount();expect(centersApi.member).toHaveBeenCalledWith('center-a','member-a');
  expect(get('member-title')).toBeTruthy();
  expect(get('back-to-team').props.href).toBe('/app/team');
  expect(get('member-profile')).toBeTruthy();
 });
 it('hides all management mutations from directory read-only staff',async()=>{
  session.permissions=['center.staff.read'];
  await mount();
  expect(find('member-edit-card')).toHaveLength(0);
  expect(find('member-access-card')).toHaveLength(0);
  expect(centersApi.updateMember).not.toHaveBeenCalled();
 });
 it('refuses to change the current administrators own access',async()=>{
  session.activeContext.membershipId='member-a';
  await mount();
  expect(get('member-self-note')).toBeTruthy();
  expect(find('member-suspend-button')).toHaveLength(0);
  expect(find('member-revoke-button')).toHaveLength(0);
 });
 it('requires a real role for non-admin staff and validates a phone number',async()=>{
  await mount();await click('member-role-clear');await click('member-save-button');
  expect(get('member-edit-error')).toBeTruthy();
  expect(centersApi.updateMember).not.toHaveBeenCalled();
  await click('member-role-set');
  await change('member-phone-input','invalid!');
  await click('member-save-button');
  expect(centersApi.updateMember).not.toHaveBeenCalled();
 });
 it('saves exact center roles with normalized title and phone, awaiting server response',async()=>{
  await mount();await change('member-title-input','  Synthetic coordinator  ');
  await change('member-phone-input','  +971 50 111 2233  ');
  await click('member-save-button');
  expect(centersApi.updateMember).toHaveBeenCalledWith('center-a','member-a',
   expect.objectContaining({title:'Synthetic coordinator',phone:'+971 50 111 2233'}));
  expect(get('member-notice')).toBeTruthy();
 });
 it('blocks suspension without a meaningful reason and then sends exact revocation scope',async()=>{
  await mount();await click('member-suspend-button');
  await click('member-status-confirm');
  expect(centersApi.memberStatus).not.toHaveBeenCalled();
  expect(get('member-status-error')).toBeTruthy();
  await change('member-status-reason','  Fictional staffing change  ');
  await click('member-status-confirm');
  expect(centersApi.memberStatus).toHaveBeenCalledWith('center-a','member-a','suspend',
   'Fictional staffing change');
  expect(get('member-status-reason-text')).toBeTruthy();
 });
 it('reactivates suspended account without fabricated reason',async()=>{
  centersApi.member.mockResolvedValue(member({status:'SUSPENDED'}));
  await mount();await click('member-reactivate-button');
  await click('member-status-confirm');
  expect(centersApi.memberStatus).toHaveBeenCalledWith('center-a','member-a','reactivate',undefined);
 });
 it('does not restore a revoked membership through the profile form',async()=>{
  centersApi.member.mockResolvedValue(member({status:'REVOKED'}));
  await mount();
  expect(find('member-edit-card')).toHaveLength(0);
  expect(find('member-suspend-button')).toHaveLength(0);
  expect(find('member-reactivate-button')).toHaveLength(0);
  expect(output()).toContain('new invitation');
 });
 it('does not claim revocation success if backend rejects the mutation',async()=>{
  centersApi.memberStatus.mockRejectedValue({status:409,message:'Synthetic concurrent status change'});
  await mount();await click('member-revoke-button');
  await change('member-status-reason','Fictional security concern');
  await click('member-status-confirm');
  expect(get('member-status-error')).toBeTruthy();
  expect(find('member-notice')).toHaveLength(0);
  expect(get('member-status-dialog')).toBeTruthy();
 });
});
