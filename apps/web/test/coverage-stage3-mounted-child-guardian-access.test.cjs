// Stage 3: mounted operational child details: guardian access, assignment,
// referent designation, archive/restore and permission-gated actions. All
// identities and backend responses are fictional; no clinical release.
const React=require('react'),Renderer=require('react-test-renderer');
const {act,create}=Renderer,h=React.createElement;
let session,errors,oldWindow;
jest.mock('next/navigation',()=>({useParams:()=>({id:'child-a'})}));
jest.mock('next/link',()=>({__esModule:true,default:({href,children,...props})=>
 h('a',{href,...props},children)}));
jest.mock('@/components/design/states',()=>{
 const a=jest.requireActual('@/components/design/states');
 return {...a,Dialog:({open,children,footer,testId})=>open?
  h('section',{'data-testid':testId},children,h('footer',null,footer)):null};
});
jest.mock('@/components/centers/kit',()=>{
 const a=jest.requireActual('@/components/centers/kit');
 return {...a,Workspace:({children})=>children(session,errors),
  ReasonField:({value,onChange,testId})=>h('textarea',{
   value,'data-testid':testId,onChange:e=>onChange(e.target.value)
  }),SelectField:({value,onChange,options,testId})=>h('select',{
   value,'data-testid':testId,onChange:e=>onChange(e.target.value)
  },options.map(o=>h('option',{key:o.value,value:o.value},o.label)))};
});
jest.mock('@/components/operations/BookDialog',()=>{
 const a=jest.requireActual('@/components/operations/BookDialog');
 return {...a,BookDialog:({open,onDone})=>open?h('button',{
  'data-testid':'synthetic-book-done',onClick:()=>onDone('Synthetic visit booked')},'Finish booking'):null};
});
jest.mock('@/components/operations/HandoverProposalPanel',()=>({
 HandoverProposalPanel:()=>h('aside',{'data-testid':'synthetic-handover'})}));
jest.mock('@/lib/operations',()=>{
 const a=jest.requireActual('@/lib/operations');
 return {...a,opsApi:{...a.opsApi,child:jest.fn(),addGuardian:jest.fn(),
  inviteGuardian:jest.fn(),removeGuardian:jest.fn(),therapists:jest.fn(),
  assign:jest.fn(),endAssignment:jest.fn(),designateReferent:jest.fn(),
  archiveChild:jest.fn(),restoreChild:jest.fn()}};
});
const {opsApi}=require('../src/lib/operations');
const ChildDetailPage=require('../src/app/app/children/[id]/page').default;
const assignment=(extra={})=>({
 id:'assign-a',membershipId:'therapist-a',therapist:'Fictional Leila',
 service:'speech',isLead:true,title:'Clinician',endedAt:null,...extra
});
const guardian=(extra={})=>({
 id:'guardian-a',displayName:'Fictional Parent',email:'family@example.invalid',
 relationship:'mother',portalStatus:'PENDING',isPrimary:true,...extra
});
const child=(extra={})=>({
 id:'child-a',firstName:'Fictional',lastName:'Alex',preferredName:'Alex',
 dateOfBirth:'2018-11-09',services:['speech'],status:'ACTIVE',version:3,
 guardians:[guardian()],assignments:[assignment()],referent:null,
 referentStatus:'NONE',appointments:[],events:[],...extra
});
let tree;
const get=id=>tree.root.findByProps({'data-testid':id});
const find=id=>tree.root.findAllByProps({'data-testid':id});
const click=async id=>act(async()=>{get(id).props.onClick();await Promise.resolve();});
const change=async(id,v)=>act(async()=>get(id).props.onChange({target:{value:v}}));
const check=async(id,v)=>act(async()=>get(id).props.onChange({target:{checked:v}}));
const mount=async()=>act(async()=>{tree=create(h(ChildDetailPage));});
beforeAll(()=>{oldWindow=global.window;global.window={location:{search:''}};});
afterAll(()=>{global.window=oldWindow;});
beforeEach(()=>{
 jest.clearAllMocks();global.window.location.search='';
 const names=['child','addGuardian','inviteGuardian','removeGuardian','therapists',
  'assign','endAssignment','designateReferent','archiveChild','restoreChild'];
 names.forEach(k=>{opsApi[k].mockReset();opsApi[k].mockResolvedValue({});});
 opsApi.child.mockResolvedValue(child());
 opsApi.therapists.mockResolvedValue({items:[{membershipId:'therapist-a',
  displayName:'Fictional Leila',specialties:['speech']}],nextOffset:null});
 errors=jest.fn(e=>{throw e;});
 session={activeContext:{type:'center',centerId:'center-a',role:'CENTER_ADMIN'},
 permissions:['center.children.read','center.children.manage','center.schedule.manage']};
});
afterEach(async()=>{if(tree){await act(async()=>tree.unmount());tree=null;}});
describe('mounted child access and operational audit safety',()=>{
 it('loads only exact center and child and presents separate family and care-team cards',async()=>{
  await mount();
  expect(opsApi.child).toHaveBeenCalledWith('center-a','child-a');
  expect(get('guardians-card')).toBeTruthy();
  expect(get('care-team-card')).toBeTruthy();
  expect(get('child-referent')).toBeTruthy();
  expect(get('guardian-status-guardian-a')).toBeTruthy();
  expect(get('assignment-assign-a')).toBeTruthy();
  expect(get('synthetic-handover')).toBeTruthy();
 });
 it('does not grant mutation controls to a read-only assigned therapist',async()=>{
  session.activeContext.role='THERAPIST';
  session.permissions=['center.children.read'];
  await mount();
  expect(find('add-guardian-button')).toHaveLength(0);
  expect(find('assignment-end-assign-a')).toHaveLength(0);
  expect(find('child-archive-button')).toHaveLength(0);
  expect(find('referent-change')).toHaveLength(0);
  expect(find('child-book-button')).toHaveLength(0);
 });
 it('allows invitation resend only for guardian without connected family portal',async()=>{
  await mount();await click('guardian-invite-guardian-a');
  expect(opsApi.inviteGuardian).toHaveBeenCalledWith('center-a','child-a','guardian-a');
  expect(get('child-notice-success')).toBeTruthy();
  expect(opsApi.child).toHaveBeenCalledTimes(2);
 });
 it('never exposes redundant invitations to a connected guardian',async()=>{
  opsApi.child.mockResolvedValue(child({guardians:[guardian({portalStatus:'CONNECTED'})]}));
  await mount();
  expect(find('guardian-invite-guardian-a')).toHaveLength(0);
  expect(get('guardian-status-guardian-a')).toBeTruthy();
 });
 it('validates guardian identity before calling the scoped service',async()=>{
  await mount();await click('add-guardian-button');await click('guardian-save');
  expect(get('guardian-error')).toBeTruthy();
  expect(opsApi.addGuardian).not.toHaveBeenCalled();
  await change('guardian-name-input','  Fictional Other Parent  ');
  await change('guardian-email-input','another@example.invalid');
  await check('guardian-invite-checkbox',false);
  await click('guardian-save');
  expect(opsApi.addGuardian).toHaveBeenCalledWith('center-a','child-a',
   expect.objectContaining({displayName:'Fictional Other Parent',
    email:'another@example.invalid',invite:false}));
 });
 it('requires meaningful reason for immediate guardian removal and preserves access on denial',async()=>{
  opsApi.removeGuardian.mockRejectedValue({status:403,message:'Synthetic denied'});
  await mount();await click('guardian-remove-guardian-a');
  await click('guardian-remove-confirm');
  expect(opsApi.removeGuardian).not.toHaveBeenCalled();
  await change('guardian-remove-reason','  Fictional revoked authorization  ');
  await click('guardian-remove-confirm');
  expect(opsApi.removeGuardian).toHaveBeenCalledWith('center-a','child-a',
   'guardian-a','Fictional revoked authorization');
  expect(get('child-notice-danger')).toBeTruthy();
 });
 it('loads eligible therapists by exact service and assigns one selected member',async()=>{
  await mount();await click('assign-therapist-button');
  expect(opsApi.therapists).toHaveBeenCalledWith('center-a',
   expect.objectContaining({service:'speech',search:'',limit:100}));
  await change('assign-therapist-select','therapist-a');
  await click('assign-save');
  expect(opsApi.assign).toHaveBeenCalledWith('center-a','child-a',
   expect.objectContaining({membershipId:'therapist-a',service:'speech'}));
  expect(get('child-notice-success')).toBeTruthy();
 });
 it('does not end an assignment without server acknowledgment',async()=>{
  opsApi.endAssignment.mockRejectedValue({status:409,message:'Synthetic service conflict'});
  await mount();await click('assignment-end-assign-a');
  expect(opsApi.endAssignment).toHaveBeenCalledWith('center-a','child-a','assign-a');
  expect(get('child-notice-danger')).toBeTruthy();
  expect(opsApi.child).toHaveBeenCalledTimes(1);
 });
 it('designates only an actively assigned therapist with optimistic child revision',async()=>{
  await mount();await click('referent-change');
  expect(opsApi.therapists).toHaveBeenCalledWith('center-a',
   expect.objectContaining({ids:'therapist-a',limit:100}));
  await change('referent-therapist-select','therapist-a');
  await change('referent-reason','Reviewed synthetic team coordination');
  await click('referent-save');
  expect(opsApi.designateReferent).toHaveBeenCalledWith('center-a','child-a',{
   membershipId:'therapist-a',version:3,reason:'Reviewed synthetic team coordination'
  });
 });
 it('archives only after reason, then prevents new appointment booking for archived child',async()=>{
  await mount();await click('child-archive-button');await click('child-archive-confirm');
  expect(get('child-archive-error')).toBeTruthy();
  expect(opsApi.archiveChild).not.toHaveBeenCalled();
  await change('child-archive-reason','  Fictional guardian requested archive  ');
  await click('child-archive-confirm');
  expect(opsApi.archiveChild).toHaveBeenCalledWith('center-a','child-a',
   'Fictional guardian requested archive');
 });
 it('restores archived record with a separately authorized server action',async()=>{
  opsApi.child.mockResolvedValue(child({status:'ARCHIVED'}));
  await mount();
  expect(get('child-restore-button')).toBeTruthy();
  expect(find('child-book-button')).toHaveLength(0);
  await click('child-restore-button');
  expect(opsApi.restoreChild).toHaveBeenCalledWith('center-a','child-a');
 });
 it('refuses to present private child details after failed initial fetch',async()=>{
  opsApi.child.mockRejectedValueOnce(new Error('Synthetic forbidden'))
   .mockResolvedValueOnce(child());
  await mount();
  expect(get('child-error')).toBeTruthy();
  expect(find('guardians-card')).toHaveLength(0);
  const retry=get('child-error').findAllByType('button')[0];
  await act(async()=>{retry.props.onClick();await Promise.resolve();});
  expect(get('guardians-card')).toBeTruthy();
 });

 it.each([
  ['PENDING','Invited',true,'Resend'],
  ['EXPIRED','Invitation expired',true,'Resend'],
  ['NOT_INVITED','Not invited',true,'Invite'],
  ['REVOKED','Invitation revoked',true,'Invite'],
  ['REPLACED','Replaced',true,'Invite'],
  ['CONNECTED','Portal connected',false,'']
 ])('guardian status %s retains explicit access state %s',async(status,label,canInvite,action)=>{
  opsApi.child.mockResolvedValue(child({guardians:[guardian({portalStatus:status})]}));
  await mount();
  expect(get('guardian-status-guardian-a')).toBeTruthy();
  expect(JSON.stringify(tree.toJSON())).toContain(label);
  if(canInvite){
   expect(get('guardian-invite-guardian-a')).toBeTruthy();
   expect(JSON.stringify(get('guardian-invite-guardian-a').props.children)).toContain(action);
  } else expect(find('guardian-invite-guardian-a')).toHaveLength(0);
 });
 it('missing guardian relationships have a safe read-only empty family state',async()=>{
  opsApi.child.mockResolvedValue(child({guardians:[]}));
  await mount();
  expect(get('guardians-empty')).toBeTruthy();
  expect(find('guardian-guardian-a')).toHaveLength(0);
 });
 it('does not allow guardian mutation when child is archived even with manage permission',async()=>{
  opsApi.child.mockResolvedValue(child({status:'ARCHIVED',guardians:[guardian()]}));
  await mount();
  expect(find('add-guardian-button')).toHaveLength(0);
  expect(find('assign-therapist-button')).toHaveLength(0);
  expect(find('child-book-button')).toHaveLength(0);
  expect(find('referent-change')).toHaveLength(0);
 });
 it('denies referent designation UI to coordinator despite operational edit permissions',async()=>{
  session.activeContext.role='COORDINATOR';
  await mount();
  expect(find('referent-change')).toHaveLength(0);
  expect(get('child-referent')).toBeTruthy();
 });
 it('reveals unavailable designated referent without claiming active clinical access',async()=>{
  opsApi.child.mockResolvedValue(child({
   referent:null,referentStatus:'UNAVAILABLE'
  }));
  await mount();
  expect(get('referent-current').props.children).toContain('Designation unavailable');
  expect(JSON.stringify(tree.toJSON())).toContain('grants no clinical permissions');
 });
 it('prevents therapist assignment when no membership has been selected',async()=>{
  await mount();await click('assign-therapist-button');
  await click('assign-save');
  expect(opsApi.assign).not.toHaveBeenCalled();
 });
 it('does not offer a therapist whose specialty differs from requested service',async()=>{
  opsApi.therapists.mockResolvedValue({items:[{
   membershipId:'other-therapist',displayName:'Fictional Other',specialties:['occupational']
  }],nextOffset:null});
  await mount();await click('assign-therapist-button');
  const values=get('assign-therapist-select').findAllByType('option').map(x=>x.props.value);
  expect(values).not.toContain('other-therapist');
  expect(opsApi.assign).not.toHaveBeenCalled();
 });
 it('selects a different service without retaining old specialty therapist choice',async()=>{
  opsApi.child.mockResolvedValue(child({services:['speech','occupational']}));
  opsApi.therapists.mockResolvedValue({items:[
   {membershipId:'therapist-a',displayName:'Fictional Leila',specialties:['speech']},
   {membershipId:'therapist-b',displayName:'Fictional Nora',specialties:['occupational']}
  ],nextOffset:null});
  await mount();await click('assign-therapist-button');
  await change('assign-therapist-select','therapist-a');
  await change('assign-service-select','occupational');
  expect(get('assign-therapist-select').props.value).toBe('');
  expect(opsApi.therapists).toHaveBeenLastCalledWith('center-a',expect.objectContaining({service:'occupational'}));
 });
 it('loads a second bounded therapist-directory page only when backend supplies nextOffset',async()=>{
  opsApi.therapists.mockResolvedValueOnce({items:[{
   membershipId:'therapist-a',displayName:'Fictional Leila',specialties:['speech']
  }],nextOffset:100}).mockResolvedValueOnce({items:[{
   membershipId:'therapist-b',displayName:'Fictional Nora',specialties:['speech']
  }],nextOffset:null});
  await mount();await click('assign-therapist-button');
  expect(get('assign-therapist-load-more')).toBeTruthy();
  await click('assign-therapist-load-more');
  expect(opsApi.therapists).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({service:'speech',offset:100,limit:100}));
  const values=get('assign-therapist-select').findAllByType('option').map(x=>x.props.value);
  expect(values).toContain('therapist-b');
  expect(find('assign-therapist-load-more')).toHaveLength(0);
 });
 it('shows operational directory error without inventing available memberships',async()=>{
  opsApi.therapists.mockRejectedValueOnce(Error('Synthetic therapist directory offline'));
  await mount();await click('assign-therapist-button');
  expect(JSON.stringify(tree.toJSON())).toContain('Unable to load eligible therapists');
  expect(opsApi.assign).not.toHaveBeenCalled();
 });
 it('filters the therapist directory with a trimmed search string',async()=>{
  await mount();await click('assign-therapist-button');
  await change('assign-therapist-search','  Fictional Leila  ');
  expect(opsApi.therapists).toHaveBeenLastCalledWith('center-a',
   expect.objectContaining({search:'Fictional Leila',service:'speech',limit:100}));
 });
 it('child profile archived state remains readable without scheduling controls',async()=>{
  opsApi.child.mockResolvedValue(child({status:'ARCHIVED',assignments:[]}));
  await mount();
  expect(get('child-title')).toBeTruthy();
  expect(get('child-restore-button')).toBeTruthy();
  expect(find('child-book-button')).toHaveLength(0);
  expect(get('care-team-empty')).toBeTruthy();
 });
 it('enforces booking permission separately from ability to manage child profiles',async()=>{
  session.permissions=['center.children.read','center.children.manage'];
  await mount();
  expect(get('add-guardian-button')).toBeTruthy();
  expect(find('child-book-button')).toHaveLength(0);
 });
 it('uses a confirmed booking callback before reloading the child record',async()=>{
  await mount();await click('child-book-button');
  expect(get('synthetic-book-done')).toBeTruthy();
  await click('synthetic-book-done');
  expect(get('child-notice-success')).toBeTruthy();
  expect(opsApi.child).toHaveBeenCalledTimes(2);
 });

});
