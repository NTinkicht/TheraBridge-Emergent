// M4-CLOSE-02 / #268: genuine two-valid-centre HTTP boundary evidence.
// Runs ONLY against the dedicated *_test PostgreSQL database via makeApp();
// never operates on the shared Render demo or live credentials. NOT a hosted receipt.
import { DevMailboxService } from '../src/dev-mailbox/dev-mailbox.service';
import { sha256 } from './unit-helpers';
import { Harness, ORIGIN, PASSWORD, Signed, cookieFrom, createUser, makeApp,
  post, preAuth, resetDb, signIn } from './helpers';

describe('M4-CLOSE-02 disposable two-valid-tenant acceptance (real PostgreSQL)', () => {
  let h: Harness;
  let operator: Signed;
  const get=(session:Pick<Signed,'cookie'>,route:string)=>
    h.http().get(route).set('Cookie',session.cookie);
  const mailbox=()=>h.app.get(DevMailboxService).list();
  const tokenFor=(email:string)=>mailbox().find(x=>x.to===email)?.body.match(/#token=([A-Za-z0-9_-]+)/)?.[1];
  const accept=async(email:string):Promise<Signed>=>{
    const token=tokenFor(email);
    expect(token).toBeDefined();
    const p=await preAuth(h);
    const response=await h.http().post('/api/invitations/accept-new')
      .set('Origin',ORIGIN).set('Cookie',p.cookie).set('X-CSRF-Token',p.token)
      .send({token,displayName:'Fictional Test User',password:PASSWORD}).expect(200);
    const sessionToken=cookieFrom(response,'tb_session');
    expect(sessionToken).toBeTruthy();
    return {token:sessionToken!,cookie:`tb_session=${sessionToken}`,csrf:response.body.csrfToken,body:response.body};
  };
  const provision=async(label:string):Promise<{centerId:string,admin:Signed}>=>{
    const adminEmail=`admin-${label}@m4-two-centres.therabridge.test`;
    const created=await post(h,'/api/platform/centers',operator,{
      name:`Fictional ${label} Therapy`,timezone:'Europe/Berlin',country:'Germany',city:'Berlin',
      specialties:['speech','occupational'],firstAdmin:{email:adminEmail,displayName:'Synthetic Admin'}
    }).expect(201);
    const centerId=created.body.id as string;
    return {centerId,admin:await accept(adminEmail)};
  };
  const staff=async(centerId:string,admin:Signed,label:string):Promise<Signed>=>{
    const email=`therapist-${label}@m4-two-centres.therabridge.test`;
    await post(h,`/api/centers/${centerId}/invitations`,admin,{
      email,displayName:'Synthetic Speech Therapist',roles:['THERAPIST'],specialties:['speech']
    }).expect(201);
    return accept(email);
  };
  const child=async(centerId:string,admin:Signed,therapist:Signed,label:string)=>{
    const route=`/api/centers/${centerId}`;
    const created=await post(h,route+'/children',admin,{
      firstName:'Synthetic',lastName:label,dateOfBirth:'2019-04-02',services:['speech']
    }).expect(201);
    const childId=created.body.id as string;
    await post(h,`${route}/children/${childId}/assignments`,admin,{
      membershipId:therapist.body.activeContext.membershipId,service:'speech',isLead:true
    }).expect(201);
    return childId;
  };
  beforeAll(async()=>{h=await makeApp({DEPLOYMENT_ENV:'local',DEV_MAILBOX_ENABLED:'true'});});
  afterAll(async()=>{await h.close();});
  beforeEach(async()=>{
    await resetDb(h.prisma);
    mailbox().length=0;
    h.clock.t=Date.parse('2026-11-15T09:00:00Z');
    const user=await createUser(h.prisma,'operator@m4-two-centres.therabridge.test');
    await h.prisma.platformRoleAssignment.create({
      data:{userId:user.id,source:'synthetic_seed',reason:'isolated_m4_qa'}
    });
    operator=await signIn(h,user.email);
  });

  it('uses two existing valid center IDs with independently authorized controls; foreign child is masked, not a missing UUID',async()=>{
    const alpha=await provision('Alpha');
    const beta=await provision('Beta');
    expect(alpha.centerId).not.toBe(beta.centerId);
    expect(await h.prisma.center.count({where:{id:{in:[alpha.centerId,beta.centerId]}}})).toBe(2);
    const a=await staff(alpha.centerId,alpha.admin,'alpha');
    const b=await staff(beta.centerId,beta.admin,'beta');
    const idA=await child(alpha.centerId,alpha.admin,a,'Alpha');
    const idB=await child(beta.centerId,beta.admin,b,'Beta');
    const pathA=`/api/centers/${alpha.centerId}/clinical/children/${idA}`;
    const pathB=`/api/centers/${beta.centerId}/clinical/children/${idB}`;
    await get(a,pathA).expect(200);
    await get(b,pathB).expect(200);
    const denied=await get(a,pathB);
    expect([403,404]).toContain(denied.status);
    expect(JSON.stringify(denied.body)).not.toContain('Synthetic Beta');
    const foreignViaOwnCenter=await get(a,`/api/centers/${alpha.centerId}/clinical/children/${idB}`);
    expect([403,404]).toContain(foreignViaOwnCenter.status);
    await get(a,'/api/auth/session').expect(200);
    await get(b,'/api/auth/session').expect(200);
    await get(b,pathB).expect(200);
  });

  it('revokes a real active therapist membership without affecting the other valid center',async()=>{
    const alpha=await provision('Alpha');
    const beta=await provision('Beta');
    const a=await staff(alpha.centerId,alpha.admin,'alpha');
    const b=await staff(beta.centerId,beta.admin,'beta');
    const idA=await child(alpha.centerId,alpha.admin,a,'Alpha');
    const idB=await child(beta.centerId,beta.admin,b,'Beta');
    const pathA=`/api/centers/${alpha.centerId}/clinical/children/${idA}`;
    const pathB=`/api/centers/${beta.centerId}/clinical/children/${idB}`;
    await get(a,pathA).expect(200);
    await get(b,pathB).expect(200);
    await h.prisma.membership.update({
      where:{id:a.body.activeContext.membershipId},data:{status:'SUSPENDED'}
    });
    const revoked=await get(a,pathA);
    expect([401,403,404]).toContain(revoked.status);
    expect(JSON.stringify(revoked.body)).not.toContain('Synthetic Alpha');
    await get(b,pathB).expect(200);
    await get(b,'/api/auth/session').expect(200);
    expect(await h.prisma.careAssignment.count({
      where:{centerId:alpha.centerId,childId:idA,endedAt:null}
    })).toBe(1); // Stale assignment must not override suspended membership.
  });

  it('expires a genuine session hash without revoking the other tenant session',async()=>{
    const alpha=await provision('Alpha');
    const beta=await provision('Beta');
    const a=await staff(alpha.centerId,alpha.admin,'alpha');
    const b=await staff(beta.centerId,beta.admin,'beta');
    const idA=await child(alpha.centerId,alpha.admin,a,'Alpha');
    const idB=await child(beta.centerId,beta.admin,b,'Beta');
    const pathA=`/api/centers/${alpha.centerId}/clinical/children/${idA}`;
    const pathB=`/api/centers/${beta.centerId}/clinical/children/${idB}`;
    await get(a,pathA).expect(200);
    await get(b,pathB).expect(200);
    const changed=await h.prisma.session.updateMany({
      where:{tokenHash:sha256(a.token)},
      data:{absoluteExpiresAt:new Date(h.clock.now().getTime()-1000)}
    });
    expect(changed.count).toBe(1);
    await get(a,'/api/auth/session').expect(401);
    const denied=await get(a,pathA).expect(401);
    expect(denied.headers['cache-control']).toContain('no-store');
    await get(b,pathB).expect(200);
    await get(b,'/api/auth/session').expect(200);
  });
});
