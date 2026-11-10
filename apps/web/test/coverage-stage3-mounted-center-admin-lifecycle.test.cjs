// M4-08 Stage 3: real platform center administrator invitation lifecycle.
// Fake responses cross only the external API boundary; the route, validation,
// status controls, retry/confirmation and provisioning links execute source.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let errors,oldWindow;
jest.mock('next/navigation',()=>({useParams:()=>({id:'center-a'})}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('@/components/design/states',()=>{
 const a=jest.requireActual('@/components/design/states');
 return {...a,Dialog:({open,children,footer,testId,title})=>open?
 h('section',{'data-testid':testId},h('h2',null,title),children,h('footer',null,footer)):null};
});
jest.mock('@/components/centers/kit',()=>{
 const a=jest.requireActual('@/components/centers/kit');
 return {...a,Workspace:({children})=>children({permissions:['platform.centers.read']},errors)};
});
jest.mock('@/components/operations/TrialCard',()=>({
 TrialCard:({centerId})=>h('aside',{'data-testid':'synthetic-trial-'+centerId})}));
jest.mock('@/lib/centers',()=>{
 const a=jest.requireActual('@/lib/centers');
 return {...a,centersApi:{...a.centersApi,detail:jest.fn(),inviteAdmin:jest.fn(),
  replaceAdmin:jest.fn(),adminInvitation:jest.fn()}};
});
const {centersApi}=require('../src/lib/centers');
const CenterDetailPage=require('../src/app/app/centers/[id]/page').default;
const invitation=(extra={})=>({
 id:'invite-a',displayName:'Fictional candidate',email:'candidate@example.invalid',
 status:'PENDING',sendCount:1,lastSentAt:'2026-11-08T10:00:00Z',
 expiresAt:'2026-11-15T10:00:00Z',...extra
});
const center=(extra={})=>({
 id:'center-a',name:'Synthetic Rehabilitation Center',city:'Sharjah',country:'UAE',
 timezone:'Asia/Dubai',slug:'synthetic-rehab',source:'APPLICATION',status:'ACTIVE',
 specialties:['speech'],createdAt:'2026-11-08T10:00:00Z',
 application:{id:'application-a',reference:'TB-FAKE-17'},admins:[],
 adminInvitations:[invitation()],stats:{activeMembers:0,pendingStaffInvites:1},
 setup:[{key:'ADMIN_INVITED',completedAt:'2026-11-08T10:00:00Z'}],events:[],...extra
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const mount=async()=>act(async()=>{tree=create(h(CenterDetailPage));});
beforeAll(()=>{oldWindow=global.window;global.window={location:{search:''}};});
afterAll(()=>{global.window=oldWindow;});
beforeEach(()=>{
 jest.clearAllMocks();errors=jest.fn(e=>{throw e;});global.window.location.search='';
 for(const k of ['detail','inviteAdmin','replaceAdmin','adminInvitation'])centersApi[k].mockReset();
 centersApi.detail.mockResolvedValue(center());
 centersApi.inviteAdmin.mockResolvedValue({});
 centersApi.replaceAdmin.mockResolvedValue({});
 centersApi.adminInvitation.mockResolvedValue({});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('real center administrator invite and revocation boundaries',()=>{
 it('reads only the requested center, with application provenance and setup state',async()=>{
  await mount();
  expect(centersApi.detail).toHaveBeenCalledWith('center-a');
  expect(get('center-title')).toBeTruthy();
  expect(get('center-slug').props.children).toBe('synthetic-rehab');
  expect(get('center-application-link').props.href).toBe('/app/applications/application-a');
  expect(get('admin-invitation-invite-a')).toBeTruthy();
  expect(get('synthetic-trial-center-a')).toBeTruthy();
 });
 it('offers resend and revoke only on a pending or expired invitation',async()=>{
  await mount();
  expect(get('admin-invitation-resend-invite-a')).toBeTruthy();
  expect(get('admin-invitation-revoke-invite-a')).toBeTruthy();
  expect(find('invite-admin-button')).toHaveLength(0);
 });
 it('resends a pending invitation with exact scoped id and reloads authoritative record',async()=>{
  await mount();await click('admin-invitation-resend-invite-a');
  expect(centersApi.adminInvitation).toHaveBeenCalledWith('center-a','invite-a','resend');
  expect(centersApi.detail).toHaveBeenCalledTimes(2);
  expect(get('center-notice')).toBeTruthy();
 });
 it('does not claim successful revocation when source request rejects',async()=>{
  centersApi.adminInvitation.mockRejectedValue({status:403,message:'Synthetic access revoked'});
  await mount();await click('admin-invitation-revoke-invite-a');
  expect(get('admin-action-error')).toBeTruthy();
  expect(find('center-notice')).toHaveLength(0);
 });
 it('asks for valid name and email before replacing an existing invitation',async()=>{
  await mount();await click('admin-invitation-replace-invite-a');
  expect(get('admin-invite-dialog')).toBeTruthy();
  await click('admin-invite-send');
  expect(get('admin-invite-error')).toBeTruthy();
  expect(centersApi.replaceAdmin).not.toHaveBeenCalled();
  await change('admin-invite-name-input','  Fictional Replacement  ');
  await change('admin-invite-email-input','  replacement@example.invalid  ');
  await click('admin-invite-send');
  expect(centersApi.replaceAdmin).toHaveBeenCalledWith('center-a','invite-a',{
   displayName:'Fictional Replacement',email:'replacement@example.invalid'
  });
  expect(find('admin-invite-dialog')).toHaveLength(0);
 });
 it('creates a new administrator invite only without a pending request',async()=>{
  centersApi.detail.mockResolvedValue(center({adminInvitations:[]}));
  await mount();await click('invite-admin-button');
  await change('admin-invite-name-input','Fictional Admin');
  await change('admin-invite-email-input','new@example.invalid');
  await click('admin-invite-send');
  expect(centersApi.inviteAdmin).toHaveBeenCalledWith('center-a',{
   displayName:'Fictional Admin',email:'new@example.invalid'
  });
  expect(centersApi.replaceAdmin).not.toHaveBeenCalled();
 });
 it('never exposes renewal operations for accepted or revoked invitations',async()=>{
  centersApi.detail.mockResolvedValue(center({adminInvitations:[
   invitation({status:'ACCEPTED'}),invitation({id:'revoked',status:'REVOKED'})
  ]}));
  await mount();
  expect(find('admin-invitation-resend-invite-a')).toHaveLength(0);
  expect(find('admin-invitation-revoke-revoked')).toHaveLength(0);
  expect(get('invite-admin-button')).toBeTruthy();
 });
 it('retains the pending invitation after a rejected replacement',async()=>{
  centersApi.replaceAdmin.mockRejectedValue({status:409,message:'Synthetic invitation already changed'});
  await mount();await click('admin-invitation-replace-invite-a');
  await change('admin-invite-name-input','Replacement Candidate');
  await change('admin-invite-email-input','replacement@example.invalid');
  await click('admin-invite-send');
  expect(get('admin-invite-error')).toBeTruthy();
  expect(get('admin-invite-dialog')).toBeTruthy();
  expect(centersApi.detail).toHaveBeenCalledTimes(1);
 });
 it('shows recoverable failure rather than untrusted center details',async()=>{
  centersApi.detail.mockRejectedValueOnce(new Error('Synthetic service outage'))
   .mockResolvedValueOnce(center());
  await mount();
  expect(get('center-error')).toBeTruthy();
  expect(find('admin-card')).toHaveLength(0);
  const retry=get('center-error').findAllByType('button')[0];
  await act(async()=>{retry.props.onClick();await Promise.resolve();});
  expect(get('admin-card')).toBeTruthy();
  expect(centersApi.detail).toHaveBeenCalledTimes(2);
 });
});
