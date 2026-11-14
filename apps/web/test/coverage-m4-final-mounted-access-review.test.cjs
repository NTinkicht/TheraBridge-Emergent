// M4-08: mount the actual governance access-review route. Data and service
// responses are synthetic; the original route owns filtering, simulations,
// policy warnings, invitation states and error handling. Never signs consent.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let current,loaded,handler;
jest.mock('@/components/centers/kit',()=>({
 Workspace:({children})=>children(current,handler),
 useLoad:()=>loaded,
 PageTitle:({title,testId,body})=>h('h1',{'data-testid':testId},title+' '+body),
 ReasonField:({value,onChange,testId})=>h('textarea',{'data-testid':testId,value,onChange:e=>onChange(e.target.value)}),
 SelectField:({value,onChange,testId,options})=>h('select',{'data-testid':testId,value,onChange:e=>onChange(e.target.value)},
  options.map(o=>h('option',{key:o.value,value:o.value},o.label))),
 errorText:e=>e.message??'Synthetic error'
}));
jest.mock('@/components/design/ui',()=>({
 Card:({children,testId})=>h('section',{'data-testid':testId},children),
 Button:({children,disabled,onClick,testId})=>h('button',{'data-testid':testId,disabled,onClick},children),
 Pill:({children,tone})=>h('span',{'data-tone':tone},children)
}));
jest.mock('@/components/design/states',()=>({
 EmptyState:({title,body})=>h('p',{'data-testid':'empty-state'},title+' '+body),
 ErrorState:({onRetry})=>h('button',{'data-testid':'access-retry',onClick:onRetry},'Retry'),
 SkeletonRows:({rows})=>h('p',{'data-testid':'access-loading'},'Loading '+rows)
}));
jest.mock('@/lib/governance',()=>{
 const a=jest.requireActual('@/lib/governance');
 return {...a,governanceApi:{...a.governanceApi,access:jest.fn(),transfer:jest.fn()}};
});
const {governanceApi}=require('../src/lib/governance');
const Page=require('../src/app/app/access-review/page').default;
const child=(extra={})=>({
 id:'child-a',firstName:'Fictional',lastName:'Alex',
 guardians:[{id:'guardian-a',displayName:'Fictional Parent',userId:'family-a',relationship:'mother',
  removedAt:null,capabilities:['FAMILY_ACTIVITY_VIEW'],restrictions:'Synthetic only'}],...extra
});
const member=(id='member-a')=>({id,user:{displayName:'Fictional '+id}});
const data=(extra={})=>({
 synthetic:true,children:[child()],staff:[member('member-a'),member('member-b')],
 assignments:[{childId:'child-a',membershipId:'member-a',service:'speech'}],
 policies:[],records:[],transfers:[],invitations:[],events:[],...extra
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const json=()=>JSON.stringify(tree.toJSON());
const mount=async()=>act(async()=>{tree=create(h(Page));});
const pick=async(id,v)=>act(async()=>{get(id).props.onChange({target:{value:v}});await Promise.resolve();});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const save=async()=>act(async()=>{tree.root.findAllByType('button').find(x=>String(x.props.children).includes('Save simulation only')).props.onClick();await Promise.resolve();});
const getSave=()=>tree.root.findAllByType('button').find(x=>String(x.props.children).includes('Save simulation only'));
beforeEach(()=>{
 jest.clearAllMocks();current={activeContext:{type:'center',centerId:'centre-a',role:'CENTER_ADMIN'},
 permissions:['center.governance.read']};
 handler=jest.fn();
 loaded={data:data(),failed:false,reload:jest.fn().mockResolvedValue(undefined)};
 governanceApi.access.mockReset().mockResolvedValue(data());
 governanceApi.transfer.mockReset().mockResolvedValue({status:'simulated_only'});
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});

describe('Access and consent readiness stays locked even when synthetic records exist',()=>{
 it('loading state exposes no child/guardian information',async()=>{
  loaded={data:null,failed:false,reload:jest.fn()};
  await mount();
  expect(get('access-loading')).toBeTruthy();
  expect(json()).not.toContain('Fictional Parent');
 });
 it('server denial exposes retry rather than another tenant governance records',async()=>{
  loaded={data:null,failed:true,reload:jest.fn().mockResolvedValue(undefined)};
  await mount();
  expect(get('access-retry')).toBeTruthy();
  expect(json()).not.toContain('Fictional Parent');
  await click('access-retry');expect(loaded.reload).toHaveBeenCalledTimes(1);
 });
 it('renders synthetic-only no-clinical-activation warning irrespective of permissions',async()=>{
  await mount();
  expect(get('access-governance')).toBeTruthy();
  expect(json()).toContain('Clinical activation is locked');
  expect(json()).toContain('No consent grants, clinical release, media, AI or recording');
  expect(json()).toContain('No custody permissions are inferred');
 });
 it('empty center renders safe messages instead of inventing guardian records',async()=>{
  loaded.data=data({children:[],staff:[],assignments:[]});
  await mount();
  expect(json()).toContain('No children yet');
  expect(json()).toContain('No guardian invitations');
  expect(json()).toContain('No policy proposals');
  expect(json()).toContain('No operational events');
 });
 it('children without guardian links have explicit empty state',async()=>{
  loaded.data=data({children:[child({guardians:[]})]});
  await mount();
  expect(json()).toContain('No guardian links');
  expect(json()).not.toContain('Fictional Parent');
 });
 it('connected guardian displays recipient-specific link and nonauthorizing restriction',async()=>{
  await mount();
  expect(json()).toContain('Fictional Parent');
  expect(json()).toContain('recipient-specific link');
  expect(json()).toContain('Synthetic only');
  expect(json()).toContain('Consent / release: blocked pending policy');
 });
 it.each([
  [{userId:null,removedAt:null},'Invitation pending'],
  [{userId:'fake',removedAt:null},'Connected'],
  [{userId:'fake',removedAt:'2026-11-11T09:00Z'},'Revoked']
 ])('guardian state %j is shown as %s without granting permissions',async(attrs,label)=>{
  loaded.data=data({children:[child({guardians:[{
   id:'guardian-a',displayName:'Fictional Parent',relationship:'mother',
   capabilities:[],restrictions:'Unavailable',...attrs
  }]})]});
  await mount();
  expect(json()).toContain(label);
  expect(json()).toContain('Consent / release: blocked');
 });
 it('empty guardian capabilities are displayed as None rather than undefined',async()=>{
  loaded.data=data({children:[child({guardians:[{
   id:'guardian-a',displayName:'Fictional Parent',relationship:'mother',
   userId:null,removedAt:null,capabilities:[],restrictions:'Not approved'
  }]})]});
  await mount();expect(json()).toContain('Portal capabilities: ');
  expect(json()).toContain('None');
 });
 it('invitation lifecycle distinguishes returned application status without mutating it',async()=>{
  loaded.data=data({invitations:[
   {id:'invite-a',displayName:'Fictional Pending',status:'PENDING'},
   {id:'invite-b',displayName:'Fictional Revoked',status:'REVOKED'}
  ]});
  await mount();
  expect(json()).toContain('Fictional Pending');
  expect(json()).toContain('Fictional Revoked');
  expect(json()).toContain('PENDING');
  expect(json()).toContain('REVOKED');
 });
 it('proposed policy restrictions render all boolean, string, list and policy-unavailable values',async()=>{
  loaded.data=data({policies:[{
   id:'policy-a',purpose:'FAMILY_PLAN',number:2,status:'PENDING_APPROVAL',
   restrictions:{
    scheduleOnly:true,clinicalRelease:false,scope:'guardian-specific',
    specialties:['speech','occupational'],unknown:{unapproved:true}
   }
  }]});
  await mount();
  expect(json()).toContain('PENDING APPROVAL');
  expect(json()).toContain('Proposed only');
  expect(json()).toContain('Disabled');
  expect(json()).toContain('guardian-specific');
  expect(json()).toContain('speech, occupational');
  expect(json()).toContain('Awaiting policy');
 });
 it('absent restriction object renders undecided, not automatic consent',async()=>{
  loaded.data=data({policies:[{
   id:'policy-a',purpose:'FAMILY_REPORT',number:1,status:'PROPOSED',
   restrictions:null
  }]});
  await mount();expect(json()).toContain('Undecided');
  expect(json()).not.toContain('Consent approved');
 });
 it('consent record displays exact guardian, policy, effective and predecessor details as proposals only',async()=>{
  loaded.data=data({policies:[{
   id:'policy-a',purpose:'FAMILY_REPORT',number:3,status:'PROPOSED',restrictions:false
  }],records:[{
   id:'record-a',guardianLinkId:'guardian-a',policyId:'policy-a',
   status:'PENDING_REVIEW',effectiveAt:'2026-11-09',expiresAt:'2026-12-09',
   revokedAt:null,previousId:'record-old',restrictions:{consent:false}
  }]});
  await mount();
  expect(json()).toContain('Fictional Parent');
  expect(json()).toContain('FAMILY_REPORT · version 3');
  expect(json()).toContain('PENDING REVIEW');
  expect(json()).toContain('2026-11-09');
  expect(json()).toContain('record-old');
  expect(json()).toContain('Authorizes nothing');
 });
 it('orphaned proposal shows explicit unresolved principal and policy rather than fabricated authorization',async()=>{
  loaded.data=data({records:[{
   id:'record-orphan',guardianLinkId:'unknown',policyId:'unknown',
   status:'DRAFT',effectiveAt:null,expiresAt:null,revokedAt:null,previousId:null,
   restrictions:undefined
  }]});
  await mount();
  expect(json()).toContain('Proposed principal');
  expect(json()).toContain('Policy proposal');
  expect(json()).toContain('Undecided');
  expect(json()).toContain('No revocation recorded');
 });
 it('events without actor identity are safely labeled System',async()=>{
  loaded.data=data({events:[
   {id:'e1',type:'synthetic.member.suspended',actorUserId:null,createdAt:'2026-11-11T09:00:00Z'},
   {id:'e2',type:'synthetic.guardian.link',actorUserId:'fictional-operator',createdAt:'2026-11-11T10:00:00Z'}
  ]});
  await mount();
  expect(json()).toContain('synthetic.member.suspended');
  expect(json()).toContain('System');
  expect(json()).toContain('fictional-operator');
  expect(json()).toContain('Latest 100 non-clinical events');
 });
});

describe('operational transfer simulation retains source and recipient scope without changing assignments',()=>{
 it('initial form is disabled until source, recipient and 3-character reason all present',async()=>{
  await mount();expect(getSave().props.disabled).toBe(true);
  await pick('transfer-source','0');expect(getSave().props.disabled).toBe(true);
  await pick('transfer-target','member-b');expect(getSave().props.disabled).toBe(true);
  await pick('transfer-reason','x');expect(getSave().props.disabled).toBe(true);
  await pick('transfer-reason','Fictional coordinated replacement');
  expect(getSave().props.disabled).toBe(false);
 });
 it('recipient options exclude current assigned therapist but not other active members',async()=>{
  await mount();await pick('transfer-source','0');
  const choices=get('transfer-target').findAllByType('option').map(x=>x.props.value);
  expect(choices).toContain('member-b');
  expect(choices).not.toContain('member-a');
 });
 it('simulation sends exact child, source membership, target, service and reason, then reloads',async()=>{
  await mount();
  await pick('transfer-source','0');
  await pick('transfer-target','member-b');
  await pick('transfer-reason','Synthetic staffing request');
  await save();
  expect(governanceApi.transfer).toHaveBeenCalledWith('centre-a',{
   childId:'child-a',fromMembershipId:'member-a',
   toMembershipId:'member-b',service:'speech',reason:'Synthetic staffing request'
  });
  expect(loaded.reload).toHaveBeenCalledTimes(1);
  expect(get('transfer-reason').props.value).toBe('');
  expect(json()).toContain('Assignments and clinical access do not change');
 });
 it('denied simulation preserves original selection and never claims transfer completed',async()=>{
  governanceApi.transfer.mockRejectedValueOnce({status:403,message:'Synthetic forbidden'});
  await mount();
  await pick('transfer-source','0');await pick('transfer-target','member-b');
  await pick('transfer-reason','Fictional denied request');await save();
  expect(json()).toContain('Synthetic forbidden');
  expect(get('transfer-reason').props.value).toBe('Fictional denied request');
  expect(loaded.reload).not.toHaveBeenCalled();
 });
 it('historical transfer records remain explicitly simulations without clinical access',async()=>{
  loaded.data=data({transfers:[{id:'sim-a',reason:'Fictional staff change'}]});
  await mount();
  expect(json()).toContain('Simulation only');
  expect(json()).toContain('Fictional staff change');
 });
 it('missing assignment staff metadata uses safe generic role labels without cross-tenant lookup',async()=>{
  loaded.data=data({children:[],staff:[],assignments:[{
   childId:'unknown',membershipId:'unknown',service:'speech'
  }]});
  await mount();
  const options=get('transfer-source').findAllByType('option');
  expect(options.some(x=>String(x.props.children).includes('Child · Therapist'))).toBe(true);
 });
});
