import { randomUUID } from 'node:crypto';
import { Harness, Signed, ORIGIN, createUser, makeApp, post, resetDb, signIn } from './helpers';
import { fingerprint, canonical } from '../src/clinical/governance-core';
import { GovernanceService } from '../src/clinical/governance.service';
import { TrialService } from '../src/operations/trial.service';

describe('TB-EM-011 non-authorizing governance (real PostgreSQL)', () => {
 let h:Harness,c:string,kid:string,plan:string,report:string,link:string;
 let therapist:Signed,supervisor:Signed,admin:Signed,guardian:Signed,other:Signed,foreign:Signed;
 let authorId:string,memberId:string,otherId:string;
 const path=(s:string)=>`/api/centers/${c}/${s}`;
 const get=(s:Signed,p:string)=>h.http().get(path(p)).set('Cookie',s.cookie);
 const transition=(s:Signed,action:string,version:number,kind='PLAN',id=plan,reason='Synthetic internal governance reason')=>post(h,path(`governance/documents/${kind}/${id}/transitions`),s,{action,version,reason});
 const patch=(body:object)=>h.http().patch(path(`clinical/plan-versions/${plan}`)).set('Origin',ORIGIN).set('Cookie',therapist.cookie).set('X-CSRF-Token',therapist.csrf).send(body);
 const goal={key:'phrases',title:'Synthetic goal',measure:'percent',baseline:20,target:80};
 async function actor(name:string,role:'THERAPIST'|'CLINICAL_SUPERVISOR'|'CENTER_ADMIN'|'GUARDIAN',center=c){const u=await createUser(h.prisma,`${name}@governance.test`);const m=await h.prisma.membership.create({data:{centerId:center,userId:u.id,roles:{create:{role}}}});return {s:await signIn(h,u.email),u,m};}
 beforeAll(async()=>{h=await makeApp();});afterAll(async()=>h.close());
 beforeEach(async()=>{
  await resetDb(h.prisma);c=(await h.prisma.center.create({data:{slug:'governance',name:'Synthetic governance center',timezone:'UTC'}})).id;
  const t=await actor('author','THERAPIST');therapist=t.s;authorId=t.u.id;memberId=t.m.id;
  supervisor=(await actor('reviewer','CLINICAL_SUPERVISOR')).s;admin=(await actor('admin','CENTER_ADMIN')).s;guardian=(await actor('guardian','GUARDIAN')).s;
  const o=await actor('other','THERAPIST');other=o.s;otherId=o.m.id;
  const fc=await h.prisma.center.create({data:{slug:'foreign',name:'Other center',timezone:'UTC'}});foreign=(await actor('foreign','CLINICAL_SUPERVISOR',fc.id)).s;
  kid=(await h.prisma.child.create({data:{centerId:c,firstName:'Synthetic',lastName:'Child',dateOfBirth:new Date('2020-01-01'),services:['speech'],createdById:authorId,createdAt:h.clock.now()}})).id;
  await h.prisma.careAssignment.createMany({data:[memberId,otherId].map(membershipId=>({centerId:c,childId:kid,membershipId,service:'speech',startedAt:h.clock.now()}))});
  link=(await h.prisma.guardianLink.create({data:{centerId:c,childId:kid,userId:guardian.body.user.id,displayName:'Proposed principal',email:'principal@synthetic.test',emailNorm:'principal@synthetic.test',relationship:'guardian',createdAt:h.clock.now()}})).id;
  const p=await h.prisma.therapyPlan.create({data:{centerId:c,childId:kid,service:'speech',title:'Synthetic plan',createdById:authorId,createdAt:h.clock.now()}});
  plan=(await h.prisma.planVersion.create({data:{centerId:c,planId:p.id,number:1,authorId,summary:'Immutable synthetic content',goals:[goal],createdAt:h.clock.now(),updatedAt:h.clock.now()}})).id;
  report=(await post(h,path(`clinical/children/${kid}/reports`),therapist,{service:'speech',title:'Synthetic report',periodStart:'2026-01-01',periodEnd:'2026-01-02'}).expect(201)).body.id;
 });
 it('withdraws explicitly, preserves reviewed content and requires withdrawal before a new version',async()=>{
  const submitted=await transition(therapist,'SUBMIT',1).expect(201);
  const p=await h.prisma.planVersion.findUniqueOrThrow({where:{id:plan}});
  await post(h,path(`clinical/plans/${p.planId}/versions`),therapist).expect(409);
  await transition(therapist,'WITHDRAW',2,'PLAN',plan,' ').expect(400);
  await transition(therapist,'WITHDRAW',1).expect(409);
  await transition(other,'WITHDRAW',2).expect(403);
  await transition(therapist,'WITHDRAW',2).expect(201);
  const next=await post(h,path(`clinical/plans/${p.planId}/versions`),therapist).expect(201);expect(next.body.number).toBe(2);
  expect((await h.prisma.planVersion.findUniqueOrThrow({where:{id:plan}})).status).toBe('WITHDRAWN');
  const s=await get(supervisor,`governance/previews/${submitted.body.snapshotId}`).expect(200);expect(s.body.content.summary).toBe('Immutable synthetic content');
  expect((await get(therapist,`governance/documents/PLAN/${plan}/history`).expect(200)).body.items).toHaveLength(2);
 });
 it('supervisor comments and returns with concurrency tokens; author resumes editing',async()=>{
  await transition(therapist,'SUBMIT',1).expect(201);await transition(therapist,'RETURN',2).expect(403);
  await transition(supervisor,'COMMENT',2).expect(201);await transition(supervisor,'RETURN',2).expect(409);
  await transition(supervisor,'RETURN',3).expect(201);
  await patch({summary:'Revised',goals:[goal],homeActivities:[],version:4}).expect(200);
  await transition(therapist,'SUBMIT',5).expect(201);
 });
 it('freezes without approval, hashes canonical exact content and evidence and audits viewing',async()=>{
  const r=await transition(therapist,'FREEZE',1).expect(201);const s=(await get(supervisor,`governance/previews/${r.body.snapshotId}`).expect(200)).body;
  expect(s).toMatchObject({approved:false,signed:false,released:false,notice:'Internal preview — not approved, signed or released.'});
  expect(s.fingerprint).toBe(fingerprint({centerId:s.centerId,childId:s.childId,kind:s.kind,documentId:s.documentId,sourceVersion:s.sourceVersion,authorId:s.authorId,content:s.content,evidence:s.evidence}));
  expect(canonical({b:1,a:2})).toBe(canonical({a:2,b:1}));
  await patch({summary:'overwrite',goals:[goal],homeActivities:[],version:2}).expect(409);
  await expect(h.prisma.governanceSnapshot.update({where:{id:s.id},data:{content:{tamper:true}}})).rejects.toThrow(/immutable/);
  await expect(h.prisma.governanceSnapshot.delete({where:{id:s.id}})).rejects.toThrow(/immutable/);
  await expect(h.prisma.planVersion.update({where:{id:plan},data:{summary:'tamper'}})).rejects.toThrow(/frozen/);
  expect(await h.prisma.centerEvent.count({where:{type:'clinical.preview_viewed'}})).toBe(1);
 });
 it('keeps review evidence bound to the submitted artifact when later observations arrive',async()=>{
  const submitted=await transition(therapist,'SUBMIT',1).expect(201);
  const first=(await get(supervisor,`governance/previews/${submitted.body.snapshotId}`).expect(200)).body;
  await h.prisma.observation.create({data:{centerId:c,childId:kid,planVersionId:plan,goalKey:goal.key,membershipId:memberId,value:25,observedOn:new Date('2026-01-01'),createdAt:h.clock.now()}});
  const reviewed=await transition(supervisor,'RETURN',2).expect(201);
  const returned=(await get(supervisor,`governance/previews/${reviewed.body.snapshotId}`).expect(200)).body;
  expect(returned.evidence).toEqual(first.evidence);
 });
 it('only one concurrent transition succeeds and creates one snapshot',async()=>{
  const r=await Promise.all([transition(therapist,'FREEZE',1),transition(therapist,'SUBMIT',1)]);expect(r.map(x=>x.status).sort()).toEqual([201,409]);expect(await h.prisma.governanceSnapshot.count()).toBe(1);
 });
 it('only the plan author can edit, even when another therapist is assigned',async()=>{
  await h.http().patch(path(`clinical/plan-versions/${plan}`)).set('Origin',ORIGIN).set('Cookie',other.cookie).set('X-CSRF-Token',other.csrf).send({summary:'replace',goals:[goal],homeActivities:[],version:1}).expect(403);
 });
 it.each(['admin','guardian','foreign'])('%s cannot read clinical queue, history or immutable preview',async role=>{
  const s=role==='admin'?admin:role==='guardian'?guardian:foreign;const code=role==='foreign'?404:403;const snap=await transition(therapist,'FREEZE',1).expect(201);
  for(const p of ['governance/documents',`governance/documents/PLAN/${plan}/history`,`governance/previews/${snap.body.snapshotId}`,`clinical/reports/${report}`])await get(s,p).expect(code);
 });
 it('revoked assignment denies preview and lifecycle changes immediately',async()=>{
  const s=await transition(therapist,'SUBMIT',1).expect(201);await h.prisma.careAssignment.updateMany({where:{membershipId:memberId},data:{endedAt:h.clock.now()}});
  await get(therapist,`governance/previews/${s.body.snapshotId}`).expect(404);await transition(therapist,'WITHDRAW',2).expect(404);
 });
 it('rechecks membership inside the transaction after waiting for the center lock',async()=>{
  const trial=h.app.get(TrialService);const original=trial.assertWritable.bind(trial);let entered!:()=>void;let release!:()=>void;const ready=new Promise<void>(r=>entered=r);const gate=new Promise<void>(r=>release=r);
  const spy=jest.spyOn(trial,'assertWritable').mockImplementation(async(tx,center,now)=>{await original(tx,center,now);entered();await gate;return tx.center.findUniqueOrThrow({where:{id:center}});});
  const viewer={userId:authorId,membershipId:memberId,role:'THERAPIST' as const};
  const pending=h.app.get(GovernanceService).transition(c,viewer,'PLAN',plan,{action:'FREEZE',version:1,reason:'Race test'});
  try{await ready;await h.prisma.membership.update({where:{id:memberId},data:{status:'REVOKED'}});release();await expect(pending).rejects.toThrow(/access has changed/);}finally{release();spy.mockRestore();}
  expect(await h.prisma.governanceSnapshot.count()).toBe(0);
 });
 it('binds report observations to exact goal versions and freezes evidence despite later edits',async()=>{
  await h.prisma.observation.create({data:{centerId:c,childId:kid,planVersionId:plan,goalKey:goal.key,membershipId:memberId,value:25,observedOn:new Date('2026-01-01'),createdAt:h.clock.now()}});
  // Measured definitions cannot be silently replaced in the same version.
  await patch({summary:'x',goals:[{...goal,measure:'count'}],homeActivities:[],version:1}).expect(409);
  await transition(therapist,'FREEZE',1).expect(201);const p=await h.prisma.planVersion.findUniqueOrThrow({where:{id:plan}});
  const next=(await post(h,path(`clinical/plans/${p.planId}/versions`),therapist).expect(201)).body.id;
  await h.http().patch(path(`clinical/plan-versions/${next}`)).set('Origin',ORIGIN).set('Cookie',therapist.cookie).set('X-CSRF-Token',therapist.csrf).send({summary:'New definition',goals:[{...goal,measure:'count',baseline:1,target:5}],homeActivities:[],version:1}).expect(200);
  const r=await transition(therapist,'FREEZE',1,'REPORT',report).expect(201);const before=(await get(supervisor,`governance/previews/${r.body.snapshotId}`).expect(200)).body;
  expect(before.evidence.plan.versionId).toBe(next);expect(before.evidence.goals[0]).toMatchObject({measure:'count',baseline:1,target:5,points:[]});
  await h.prisma.observation.create({data:{centerId:c,childId:kid,planVersionId:next,goalKey:goal.key,membershipId:memberId,value:3,observedOn:new Date('2026-01-01'),createdAt:h.clock.now()}});
  const after=(await get(supervisor,`governance/previews/${r.body.snapshotId}`).expect(200)).body;expect(after.fingerprint).toBe(before.fingerprint);expect(after.evidence).toEqual(before.evidence);
 });
 it('rejects cross-child observation note associations',async()=>{
  const n=await h.prisma.sessionNote.create({data:{centerId:c,childId:randomUUID(),membershipId:memberId,service:'speech',sessionDate:new Date(),createdAt:new Date(),updatedAt:new Date()}});
  await post(h,path(`clinical/children/${kid}/observations`),therapist,{planVersionId:plan,goalKey:goal.key,value:3,observedOn:'2026-01-01',sessionNoteId:n.id}).expect(422);
 });
 it('consent policy/record revisions remain immutable and cannot authorize grants',async()=>{
  const policy=await h.prisma.consentPolicyDraft.create({data:{centerId:c,purpose:'Synthetic proposal',number:1,restrictions:{decisions:['D7']},createdById:authorId}});
  const record=await h.prisma.consentRecordDraft.create({data:{centerId:c,childId:kid,guardianLinkId:link,policyId:policy.id,restrictions:{scope:'undecided'},createdById:authorId}});
  const rev=await h.prisma.consentRecordDraft.create({data:{centerId:c,childId:kid,guardianLinkId:link,policyId:policy.id,previousId:record.id,status:'REVOKED',revokedAt:h.clock.now(),restrictions:{},createdById:authorId}});expect(rev.authorizes).toBe(false);
  await expect(h.prisma.consentRecordDraft.create({data:{centerId:c,childId:kid,guardianLinkId:link,policyId:policy.id,restrictions:{},createdById:authorId,authorizes:true}})).rejects.toThrow();
  await expect(h.prisma.consentPolicyDraft.update({where:{id:policy.id},data:{status:'APPROVED'}})).rejects.toThrow(/immutable/);
  await post(h,path('governance/consent-grants'),admin,{}).expect(403);
  await get(guardian,'governance/access').expect(403);
 });
 it('operational governance excludes clinical content, shows immediate guardian revocation and invitation history',async()=>{
  const access=(await get(admin,'governance/access').expect(200)).body;expect(JSON.stringify(access)).not.toMatch(/Immutable synthetic content|Synthetic plan|Synthetic report/);expect(access.children[0].guardians[0].capabilities.length).toBeGreaterThan(0);
  await h.prisma.guardianLink.update({where:{id:link},data:{removedAt:h.clock.now()}});
  const after=(await get(admin,'governance/access').expect(200)).body;expect(after.children[0].guardians[0].capabilities).toEqual([]);
  expect((await get(guardian,'family/activities').expect(200)).body.children).toEqual([]);
 });
 it('lists no authorized portal capabilities for a suspended guardian membership',async()=>{
  await h.prisma.membership.updateMany({where:{userId:guardian.body.user.id,centerId:c},data:{status:'SUSPENDED'}});
  const access=(await get(admin,'governance/access').expect(200)).body;
  expect(access.children[0].guardians[0].capabilities).toEqual([]);
 });
 it('caseload simulation cannot grant access or change assignments',async()=>{
  const before=await h.prisma.careAssignment.findMany();const r=await post(h,path('governance/transfer-simulations'),admin,{childId:kid,fromMembershipId:memberId,toMembershipId:otherId,service:'speech',reason:'Synthetic draft only'}).expect(201);expect(r.body).toMatchObject({accessGranted:false,status:'SIMULATION_ONLY'});expect(await h.prisma.careAssignment.findMany()).toEqual(before);
 });
 it.each(['PLAN','REPORT'])('%s release and authorization are denied by API and database',async kind=>{
  const s=await transition(therapist,'FREEZE',1,kind,kind==='PLAN'?plan:report).expect(201);
  for(const actor of [therapist,supervisor,admin,guardian])await post(h,path('governance/release'),actor,{}).expect(403);
  await expect(h.prisma.clinicalAuthorizationDecision.create({data:{centerId:c,snapshotId:s.body.snapshotId}})).rejects.toThrow(/release is disabled/);
  await expect(h.prisma.recipientRelease.create({data:{centerId:c,childId:kid,snapshotId:s.body.snapshotId,decisionId:randomUUID(),guardianLinkId:link}})).rejects.toThrow(/release is disabled/);
 });
 it('allows unchanged measured goals and separate unobserved edits, but rejects measured redefinition',async()=>{
  await h.prisma.observation.create({data:{centerId:c,childId:kid,planVersionId:plan,goalKey:goal.key,membershipId:memberId,value:25,observedOn:new Date('2026-01-01'),createdAt:h.clock.now()}});
  await patch({summary:'Narrative revision',goals:[goal,{...goal,key:'unobserved'}],homeActivities:[],version:1}).expect(200);
  await patch({summary:'Narrative revision',goals:[goal,{...goal,key:'unobserved',target:95}],homeActivities:[],version:2}).expect(200);
  await patch({summary:'Redefined measure',goals:[{...goal,measure:'count'}],homeActivities:[],version:3}).expect(409);
 });
 it('keeps multiple same-service plans separate in report evidence and dashboard',async()=>{
  const second=await h.prisma.therapyPlan.create({data:{centerId:c,childId:kid,service:'speech',title:'Independent plan',createdById:authorId,createdAt:h.clock.now(),versions:{create:{centerId:c,number:1,authorId,goals:[{...goal,measure:'count',baseline:1,target:5}],createdAt:h.clock.now(),updatedAt:h.clock.now()}}},include:{versions:true}});
  await h.prisma.observation.create({data:{centerId:c,childId:kid,planVersionId:second.versions[0].id,goalKey:goal.key,membershipId:memberId,value:3,observedOn:new Date('2026-01-01'),createdAt:h.clock.now()}});
  const snap=await transition(therapist,'FREEZE',1,'REPORT',report).expect(201);
  const preview=(await get(supervisor,`governance/previews/${snap.body.snapshotId}`).expect(200)).body;
  expect(preview.evidence.plan).toBeNull();expect(preview.evidence.plans).toHaveLength(2);
  expect(preview.evidence.goals.find((g:any)=>g.planVersionId===plan).points).toEqual([]);
  expect(preview.evidence.goals.find((g:any)=>g.planVersionId===second.versions[0].id).points[0].value).toBe(3);
  const dashboard=(await get(therapist,'clinical/progress?from=2026-01-01&to=2026-01-02').expect(200)).body;
  expect(dashboard.goals.find((g:any)=>g.planVersionId===plan).points).toEqual([]);
  expect(dashboard.goals.find((g:any)=>g.planVersionId===second.versions[0].id).measure).toBe('count');
 });
 it('preview compatibility endpoint issues immutable IDs and never changes an earlier artifact',async()=>{
  const a=(await get(therapist,`clinical/reports/${report}/family-preview`).expect(200)).body;
  await h.http().patch(path(`clinical/reports/${report}`)).set('Origin',ORIGIN).set('Cookie',therapist.cookie).set('X-CSRF-Token',therapist.csrf).send({version:1,sections:{familySummary:'A later draft'}}).expect(200);
  const b=(await get(therapist,`clinical/reports/${report}/family-preview`).expect(200)).body;
  expect(b.snapshotId).not.toBe(a.snapshotId);expect(b.fingerprint).not.toBe(a.fingerprint);
  const original=(await get(supervisor,`governance/previews/${a.snapshotId}`).expect(200)).body;
  expect(original.content.sections.familySummary).toBe('');expect(original.fingerprint).toBe(a.fingerprint);
 });
 it.each(['child','center','therapist','service'])('rejects linked session-note %s mismatch at API and database',async mismatch=>{
  const n=await h.prisma.sessionNote.create({data:{centerId:mismatch==='center'?randomUUID():c,childId:mismatch==='child'?randomUUID():kid,membershipId:mismatch==='therapist'?otherId:memberId,service:mismatch==='service'?'physical':'speech',sessionDate:new Date(),createdAt:new Date(),updatedAt:new Date()}});
  await post(h,path(`clinical/children/${kid}/observations`),therapist,{planVersionId:plan,goalKey:goal.key,value:3,observedOn:'2026-01-01',sessionNoteId:n.id}).expect(422);
  await expect(h.prisma.observation.create({data:{centerId:c,childId:kid,planVersionId:plan,goalKey:goal.key,membershipId:memberId,sessionNoteId:n.id,value:3,observedOn:new Date('2026-01-01'),createdAt:new Date()}})).rejects.toThrow(/note scope/);
 });
 it('snapshot database scope rejects mismatched child and tenant associations',async()=>{
  await expect(h.prisma.governanceSnapshot.create({data:{centerId:c,childId:randomUUID(),kind:'PLAN',documentId:plan,sourceVersion:1,content:{},evidence:{},fingerprint:'0'.repeat(64),authorId,generatedById:authorId}})).rejects.toThrow(/invalid child scope/);
 });
});
