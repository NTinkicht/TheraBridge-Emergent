// M4-08 Stage 2: real mounted child management, guardian portal revocation,
// referent restrictions, and therapist assignment. Fictional records only.
// Server API methods are mocked, never the production component transitions.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let mockChild,mockSession,mockReload,mockOnError;
jest.mock('next/navigation',()=>({
 useParams:()=>({id:'synthetic-child'}),useRouter:()=>({
 push:jest.fn(),replace:jest.fn(),refresh:jest.fn()}),
 usePathname:()=>'/app/children/synthetic-child',useSearchParams:()=>new URLSearchParams()
}));
jest.mock('next/link',()=>({__esModule:true,
 default:({href,children,...props})=>React.createElement('a',{href,...props},children)}));
jest.mock('@/components/centers/kit',()=>{
 const real=jest.requireActual('@/components/centers/kit');
 return {...real,
  Workspace:({children})=>React.createElement('main',null,children(mockSession,mockOnError)),
  useLoad:()=>({data:mockChild,failed:false,reload:mockReload}),
  SelectField:({value,onChange,options,testId})=>React.createElement('select',{
   value,'data-testid':testId,onChange:e=>onChange(e.target.value)},
   options.map(o=>React.createElement('option',{key:o.value,value:o.value},o.label)))};
});
jest.mock('@/components/design/states',()=>{
 const real=jest.requireActual('@/components/design/states');
 return {...real,Dialog:({open,children,footer,testId})=>open?
  React.createElement('aside',{'data-testid':testId},children,footer):null};
});
jest.mock('@/components/operations/BookDialog',()=>{
 const real=jest.requireActual('@/components/operations/BookDialog');
 return {...real,BookDialog:()=>React.createElement('aside',{'data-testid':'booking-host-boundary'})};
});
jest.mock('@/components/operations/HandoverProposalPanel',()=>({
 HandoverProposalPanel:()=>React.createElement('aside',{'data-testid':'handover-host-boundary'})
}));
jest.mock('@/lib/operations',()=>{
 const real=jest.requireActual('@/lib/operations');
 return {...real,opsApi:{...real.opsApi,child:jest.fn(),addGuardian:jest.fn(),
  removeGuardian:jest.fn(),inviteGuardian:jest.fn(),therapists:jest.fn(),
  assign:jest.fn(),endAssignment:jest.fn(),designateReferent:jest.fn(),
  archiveChild:jest.fn(),restoreChild:jest.fn()}};
});
const {opsApi,setCenterTz}=require('../src/lib/operations');
const Page=require('../src/app/app/children/[id]/page').default;
const active=(extra={})=>({
 id:'synthetic-child',firstName:'Alex',lastName:'Fictional',
 preferredName:'Alex',dateOfBirth:'2020-01-01',services:['speech','ot'],
 status:'ACTIVE',version:4,referent:null,referentStatus:'NOT_DESIGNATED',
 guardians:[],assignments:[],appointments:[],events:[],...extra
});
const guardian=(status='PENDING')=>({id:'g1',displayName:'Fictional Guardian',
 email:'none@example.invalid',relationship:'mother',isPrimary:true,
 portalStatus:status});
const assigned=()=>({id:'a1',membershipId:'m1',therapist:'Fictional Speech Therapist',
 service:'speech',title:'SLT',isLead:true,endedAt:null});
const staff=(membershipId,specialties)=>({membershipId,displayName:'Fictional '+membershipId,specialties});
const perms=(role='CENTER_ADMIN',permissions=['center.children.read','center.children.manage','center.schedule.manage'])=>({
 user:{id:'u1',email:'none@example.invalid'},csrfToken:'',
 activeContext:{type:'center',role,centerId:'c1',centerName:'Fictional Center',
 membershipId:'admin'},permissions,contexts:[]
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>get(id).props.onClick());
const change=async(id,value)=>act(async()=>get(id).props.onChange({target:{value}}));
const choose=async(id,value)=>change(id,value);
const options=id=>get(id).findAllByType('option').map(o=>o.props.value);
const html=()=>JSON.stringify(tree.toJSON());
beforeAll(()=>{setCenterTz('Asia/Dubai');global.window={location:{search:''}};});
afterAll(()=>{setCenterTz(undefined);delete global.window;});
beforeEach(()=>{
 jest.clearAllMocks();mockChild=active();mockSession=perms();
 mockReload=jest.fn(async()=>{});mockOnError=jest.fn();
 opsApi.addGuardian.mockResolvedValue({id:'g2'});
 opsApi.removeGuardian.mockResolvedValue({});
 opsApi.inviteGuardian.mockResolvedValue({});
 opsApi.therapists.mockResolvedValue({items:[
  staff('m1',['speech']),staff('m2',['speech']),staff('m3',['ot'])],
  nextOffset:null});
 opsApi.assign.mockResolvedValue({});
 opsApi.designateReferent.mockResolvedValue({});
 opsApi.archiveChild.mockResolvedValue({});
 opsApi.restoreChild.mockResolvedValue({});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
const mount=async()=>act(async()=>{tree=create(h(Page));});
describe('Stage 2 child / guardian access changes',()=>{
 it('never shows mutation actions when center role has read permission only',async()=>{
  mockSession=perms('COORDINATOR',['center.children.read']);
  mockChild=active({guardians:[guardian()],assignments:[assigned()]});
  await mount();
  expect(get('guardians-card')).toBeTruthy();
  for(const id of ['add-guardian-button','guardian-remove-g1','assign-therapist-button',
   'child-book-button','child-archive-button','referent-change'])
    expect(find(id)).toHaveLength(0);
 });
 it('requires valid guardian name/email before creating child-to-guardian link',async()=>{
  await mount();
  await click('add-guardian-button');
  expect(get('guardian-dialog')).toBeTruthy();
  await click('guardian-save');
  expect(get('guardian-error')).toBeTruthy();
  expect(opsApi.addGuardian).not.toHaveBeenCalled();
  await change('guardian-name-input',' Fictional New Guardian ');
  await change('guardian-email-input',' parent@example.invalid ');
  await click('guardian-save');
  expect(opsApi.addGuardian).toHaveBeenCalledWith('c1','synthetic-child',
   expect.objectContaining({displayName:'Fictional New Guardian',
    email:'parent@example.invalid',isPrimary:true,invite:true}));
  expect(mockReload).toHaveBeenCalledTimes(1);
 });
 it('requires documented reason before guardian removal and sends exact linkage identity',async()=>{
  mockChild=active({guardians:[guardian('CONNECTED')]});
  await mount();
  expect(find('guardian-invite-g1')).toHaveLength(0);
  await click('guardian-remove-g1');
  expect(get('guardian-remove-dialog')).toBeTruthy();
  await click('guardian-remove-confirm');
  expect(opsApi.removeGuardian).not.toHaveBeenCalled();
  await change('guardian-remove-reason','  Transfer of care  ');
  await click('guardian-remove-confirm');
  expect(opsApi.removeGuardian).toHaveBeenCalledWith('c1','synthetic-child','g1','Transfer of care');
  expect(html()).toContain('Their portal access to this child ended');
 });
 it('allows a resend for pending recipient, but never a resend for connected guardian',async()=>{
  mockChild=active({guardians:[guardian('PENDING')]});
  await mount();
  await click('guardian-invite-g1');
  expect(opsApi.inviteGuardian).toHaveBeenCalledWith('c1','synthetic-child','g1');
  expect(mockReload).toHaveBeenCalledTimes(1);
 });
});
describe('Stage 2 assignment and referent are operational, not clinical authorization',()=>{
 it('loads therapists only for selected specialty and excludes unrelated specialty',async()=>{
  await mount();
  await click('assign-therapist-button');
  expect(opsApi.therapists).toHaveBeenCalledWith('c1',
   expect.objectContaining({service:'speech',limit:100}));
  expect(options('assign-therapist-select')).toContain('m2');
  expect(options('assign-therapist-select')).not.toContain('m3');
  await choose('assign-therapist-select','m2');
  await click('assign-save');
  expect(opsApi.assign).toHaveBeenCalledWith('c1','synthetic-child',
   {membershipId:'m2',service:'speech',isLead:true});
 });
 it('only designates existing active assigned therapist with a reason and original revision',async()=>{
  mockChild=active({assignments:[assigned()]});
  await mount();
  await click('referent-change');
  expect(opsApi.therapists).toHaveBeenCalledWith('c1',
   expect.objectContaining({ids:'m1',limit:100}));
  expect(options('referent-therapist-select')).toContain('m1');
  expect(options('referent-therapist-select')).not.toContain('m2');
  expect(get('referent-save').props.disabled).toBe(true);
  await choose('referent-therapist-select','m1');
  await change('referent-reason','  Operational coordination  ');
  await click('referent-save');
  expect(opsApi.designateReferent).toHaveBeenCalledWith('c1','synthetic-child',
   {membershipId:'m1',version:4,reason:'Operational coordination'});
  expect(html()).toContain('No clinical access changed');
 });
 it('requires archive reason and keeps archived record recovery distinct',async()=>{
  await mount();
  await click('child-archive-button');
  await click('child-archive-confirm');
  expect(get('child-archive-error')).toBeTruthy();
  expect(opsApi.archiveChild).not.toHaveBeenCalled();
  await change('child-archive-reason','  Record maintenance  ');
  await click('child-archive-confirm');
  expect(opsApi.archiveChild).toHaveBeenCalledWith('c1','synthetic-child','Record maintenance');
 });
});