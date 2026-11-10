// M4-08 Stage 2: mounted production invitation lifecycle with fictional user
// records and transport-only mocks. Never accepts mismatched accounts.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
const mockRouter={replace:jest.fn(),push:jest.fn(),refresh:jest.fn()};
jest.mock('next/navigation',()=>({useRouter:()=>mockRouter}));
jest.mock('next/link',()=>({__esModule:true,
 default:({children,href,...props})=>React.createElement('a',{href,...props},children)}));
jest.mock('@/lib/centers',()=>{
 const real=jest.requireActual('@/lib/centers');
 return {...real,centersApi:{...real.centersApi,
  inspectInvite:jest.fn(),acceptNew:jest.fn(),acceptExisting:jest.fn()}};
});
jest.mock('@/lib/auth',()=>{
 const real=jest.requireActual('@/lib/auth');
 return {...real,authApi:{...real.authApi,session:jest.fn(),logout:jest.fn()}};
});
const {centersApi}=require('../src/lib/centers');
const {authApi}=require('../src/lib/auth');
const {ApiError}=require('../src/lib/api');
const InvitePage=require('../src/app/invite/page').default;
const pending=(overrides={})=>({
 status:'PENDING',kind:'STAFF',centerName:'Fictional Center',
 email:'recipient@example.invalid',displayName:'Fictional Recipient',
 roles:['THERAPIST'],title:'Clinical specialist',
 expiresAt:'2026-11-17T09:00:00Z',accountExists:false,...overrides
});
const logged=(email='recipient@example.invalid')=>({
 user:{id:'u1',email,displayName:'Fictional Recipient'},
 csrfToken:'',contexts:[],permissions:[],activeContext:null
});
let tree,store,windowOriginal,storageOriginal;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const text=()=>JSON.stringify(tree.toJSON());
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const submit=async()=>act(async()=>get('invite-new-account-form').props.onSubmit({preventDefault:()=>{}}));
const click=async(id)=>act(async()=>get(id).props.onClick());
const mount=async()=>{await act(async()=>{tree=create(h(InvitePage));});};
beforeAll(()=>{
 windowOriginal=global.window;storageOriginal=global.sessionStorage;
 store=new Map();
 global.sessionStorage={getItem:k=>store.get(k)||null,
  setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 global.window={location:{hash:'#token=fictional-once-token'},
  history:{replaceState:jest.fn()},addEventListener:jest.fn(),removeEventListener:jest.fn(),
  locationReload:jest.fn()};
});
afterAll(()=>{global.window=windowOriginal;global.sessionStorage=storageOriginal;});
beforeEach(()=>{
 store.clear();jest.clearAllMocks();tree=null;
 global.window.location.hash='#token=fictional-once-token';
 centersApi.inspectInvite.mockResolvedValue(pending());
 authApi.session.mockRejectedValue(new ApiError(401,'Not signed in'));
 centersApi.acceptNew.mockResolvedValue({});
 centersApi.acceptExisting.mockResolvedValue({});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('M4-08 Stage 2 real invitation token and identity fail-closed flows',()=>{
 it('reads a one-time hash token, removes it from URL and never displays it in markup',async()=>{
  await mount();
  expect(centersApi.inspectInvite).toHaveBeenCalledWith('fictional-once-token');
  expect(global.window.history.replaceState).toHaveBeenCalledWith(null,'','/invite');
  expect(store.get('tb_invite_token')).toBe('fictional-once-token');
  expect(get('invite-summary')).toBeTruthy();
  expect(text()).not.toContain('fictional-once-token');
  expect(get('invite-email-input').props.disabled).toBe(true);
 });
 it('rejects missing invitation tokens without any invitation API call',async()=>{
  global.window.location.hash='';store.clear();
  await mount();
  expect(centersApi.inspectInvite).not.toHaveBeenCalled();
  expect(get('invite-load-error')).toBeTruthy();
  expect(text()).toContain('Open the link again');
 });
 it.each(['EXPIRED','ACCEPTED','REVOKED','REPLACED','UNAVAILABLE'])(
  'does not expose an account activation form for %s invitation',async status=>{
   centersApi.inspectInvite.mockResolvedValue({status});
   await mount();
   expect(get('invite-ended')).toBeTruthy();
   expect(find('invite-new-account-form')).toHaveLength(0);
   expect(find('invite-accept-button')).toHaveLength(0);
   expect(centersApi.acceptExisting).not.toHaveBeenCalled();
   expect(centersApi.acceptNew).not.toHaveBeenCalled();
  });
 it('maps a nonexistent or revoked server token response to a non-revealing warning',async()=>{
  centersApi.inspectInvite.mockRejectedValue(new ApiError(404,'Synthetic not found'));
  await mount();
  expect(get('invite-load-error')).toBeTruthy();
  expect(text()).toContain('This invitation link is not valid');
  expect(find('invite-summary')).toHaveLength(0);
 });
 it('requires minimum name, password length and exact confirmation before new account mutation',async()=>{
  await mount();
  await change('invite-name-input','X');
  await submit();
  expect(text()).toContain('Enter your full name');
  await change('invite-name-input','Fictional Recipient');
  await change('invite-password-input','short');
  await submit();
  expect(text()).toContain('at least 12 characters');
  await change('invite-password-input','UniqueSyntheticPassword123!');
  await change('invite-confirm-input','not-the-same-password');
  await submit();
  expect(text()).toContain('do not match');
  expect(centersApi.acceptNew).not.toHaveBeenCalled();
  await change('invite-confirm-input','UniqueSyntheticPassword123!');
  await submit();
  expect(centersApi.acceptNew).toHaveBeenCalledWith(
   'fictional-once-token','Fictional Recipient','UniqueSyntheticPassword123!');
  expect(store.has('tb_invite_token')).toBe(false);
  expect(mockRouter.replace).toHaveBeenCalledWith('/app');
 });
 it('requires login for an existing recipient when no current session exists',async()=>{
  centersApi.inspectInvite.mockResolvedValue(pending({accountExists:true}));
  await mount();
  expect(get('invite-sign-in-required')).toBeTruthy();
  expect(get('invite-sign-in-link').props.href).toBe('/login?next=invite');
  expect(centersApi.acceptExisting).not.toHaveBeenCalled();
 });
 it('refuses existing-account acceptance while signed into another email',async()=>{
  centersApi.inspectInvite.mockResolvedValue(pending({accountExists:true}));
  authApi.session.mockResolvedValue(logged('other@example.invalid'));
  await mount();
  expect(get('invite-wrong-account')).toBeTruthy();
  expect(find('invite-accept-button')).toHaveLength(0);
  expect(centersApi.acceptExisting).not.toHaveBeenCalled();
 });
 it('accepts only an existing signed-in user with matching email and removes saved token',async()=>{
  centersApi.inspectInvite.mockResolvedValue(pending({accountExists:true}));
  authApi.session.mockResolvedValue(logged('RECIPIENT@example.invalid'));
  await mount();
  expect(get('invite-accept-button')).toBeTruthy();
  await click('invite-accept-button');
  expect(centersApi.acceptExisting).toHaveBeenCalledWith('fictional-once-token');
  expect(store.has('tb_invite_token')).toBe(false);
  expect(mockRouter.replace).toHaveBeenCalledWith('/app');
 });
 it('keeps invitation unaccepted when server rejects mutation, allowing retry',async()=>{
  centersApi.inspectInvite.mockResolvedValue(pending({accountExists:true}));
  authApi.session.mockResolvedValue(logged());
  centersApi.acceptExisting.mockRejectedValueOnce(new ApiError(409,'Synthetic already used'));
  await mount();
  await click('invite-accept-button');
  expect(get('invite-error')).toBeTruthy();
  expect(store.has('tb_invite_token')).toBe(true);
  expect(mockRouter.replace).not.toHaveBeenCalled();
  await click('invite-accept-button');
  expect(centersApi.acceptExisting).toHaveBeenCalledTimes(2);
  expect(mockRouter.replace).toHaveBeenCalledWith('/app');
 });
});