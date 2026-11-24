import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { assertActor } from '../clinical/governance-core';
import type { Viewer } from '../common/viewer';
export type { Viewer } from '../common/viewer';
import { describeEvents, invitationView, logCenterEvent, uniq, withUniqueGuard, type Tx } from '../centers/history';
import { InvitationsService } from '../centers/invitations.service';
import { terminateTherapistCare } from '../centers/therapist-lifecycle';
import { normalizeEmail } from '../common/security';
import { PrismaService } from '../prisma/prisma.service';
import { openPrivateData, sealPrivateData } from '../common/private-envelope';
import { preparePrivatePng } from '../common/private-image-candidate';
import type { AssignmentDto, ChildDto, GuardianDto, ListChildrenQuery, UpdateChildDto, ReferentDto, PrivateCareFieldsDto, PrivateCareUpdateDto } from './operations.dto';
import { lockCenter, TrialService } from './trial.service';
import { NoticesService } from './notices.service';

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');
// Therapists see only children they are actively assigned to; other center roles see the whole center.
export const childScope = (v: Viewer): Prisma.ChildWhereInput =>
  v.role === 'THERAPIST' ? { assignments: { some: { membershipId: v.membershipId, endedAt: null } } } : {};
const dob = (s: string) => new Date(`${s}T00:00:00Z`);
// Family/staff-reported medical context is not a verified clinical finding.
// Encrypt at application layer and never include content in list/event/audit rows.
const privateCareBody = (dto: PrivateCareFieldsDto) => ({
  conditions: dto.conditions?.trim() ?? '',
  allergies: dto.allergies?.trim() ?? '',
  medications: dto.medications?.trim() ?? '',
  careNotes: dto.careNotes?.trim() ?? '',
  source: 'FAMILY_REPORTED_UNVERIFIED' as const,
});
const encryptCare = (centerId: string, childId: string, dto: PrivateCareFieldsDto) =>
  sealPrivateData(Buffer.from(JSON.stringify(privateCareBody(dto)), 'utf8'), 'care-v1', centerId, childId);


@Injectable()
export class ChildrenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trial: TrialService,
    private readonly invitations: InvitationsService,
    private readonly audit: AuditService,
    private readonly notices: NoticesService,
  ) {}

  private checkDob(s: string, now: Date) {
    if (dob(s) > now) throw new UnprocessableEntityException('Date of birth cannot be in the future.');
  }

  private names(ids: string[]) {
    return this.prisma.membership.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, user: { select: { displayName: true } } } });
  }

  async list(centerId: string, v: Viewer, q: ListChildrenQuery) {
    const now = this.trial.now();
    const rows = await this.prisma.child.findMany({
      where: {
        centerId, status: q.status ?? 'ACTIVE', ...childScope(v),
        ...(q.q ? { OR: [{ firstName: { contains: q.q, mode: 'insensitive' } }, { lastName: { contains: q.q, mode: 'insensitive' } }, { preferredName: { contains: q.q, mode: 'insensitive' } }] } : {}),
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { id: 'asc' }], take: 200,
      include: {
        guardians: { where: { removedAt: null }, select: { id: true } },
        assignments: { where: { endedAt: null }, select: { membershipId: true, service: true } },
        appointments: { where: { status: 'SCHEDULED', startsAt: { gte: now } }, orderBy: { startsAt: 'asc' }, take: 1, select: { startsAt: true } },
      },
    });
    const team = await this.names(uniq(rows.flatMap((r) => r.assignments.map((a) => a.membershipId))));
    return {
      items: rows.map((c) => ({
        id: c.id, firstName: c.firstName, lastName: c.lastName, preferredName: c.preferredName, dateOfBirth: c.dateOfBirth.toISOString().slice(0, 10),
        services: c.services, status: c.status, guardians: c.guardians.length, nextAppointment: c.appointments[0]?.startsAt ?? null,
        team: c.assignments.map((a) => ({ service: a.service, name: team.find((t) => t.id === a.membershipId)?.user.displayName ?? '' })),
      })),
    };
  }

  async create(centerId: string, actorUserId: string, dto: ChildDto) {
    const now = this.trial.now();
    this.checkDob(dto.dateOfBirth, now);
    const child = await this.prisma.$transaction(async (tx) => {
      await this.trial.assertChildCapacity(tx, centerId, now);
      const c = await tx.child.create({
        data: { centerId, firstName: clean(dto.firstName), lastName: clean(dto.lastName), preferredName: dto.preferredName ? clean(dto.preferredName) : null, dateOfBirth: dob(dto.dateOfBirth), services: uniq(dto.services), createdById: actorUserId, createdAt: now },
      });
      if (dto.privateCare) {
        const encryptedBody = encryptCare(centerId, c.id, dto.privateCare);
        await tx.childCareIntake.create({ data: { centerId, childId: c.id, encryptedBody, modifiedById: actorUserId, createdAt: now, updatedAt: now } });
      }
      await logCenterEvent(tx, centerId, 'child.registered', now, { actorUserId, meta: { childId: c.id } });
      return c;
    });
    await this.audit.record('child.registered', { actorUserId, meta: { centerId, childId: child.id } });
    return { id: child.id };
  }

  async child(centerId: string, id: string, v?: Viewer) {
    const c = await this.prisma.child.findFirst({ where: { id, centerId, ...(v ? childScope(v) : {}) } });
    if (!c) throw new NotFoundException('Child not found');
    return c;
  }

  async detail(centerId: string, v: Viewer, id: string) {
    const now = this.trial.now();
    const c = await this.prisma.child.findFirst({
      where: { id, centerId, ...childScope(v) },
      include: {
        guardians: { where: { removedAt: null }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        assignments: { orderBy: [{ endedAt: { sort: 'desc', nulls: 'first' } }, { startedAt: 'desc' }] },
        appointments: { where: { startsAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } }, orderBy: { startsAt: 'asc' }, take: 50 },
      },
    });
    if (!c) throw new NotFoundException('Child not found');
    const team = await this.names(uniq([...c.assignments.map((a) => a.membershipId), ...c.appointments.map((a) => a.membershipId)]));
    const name = (m: string) => team.find((t) => t.id === m)?.user.displayName ?? '';
    const invites = await this.prisma.invitation.findMany({ where: { centerId, kind: 'GUARDIAN', guardianLinkId: { in: c.guardians.map((g) => g.id) } }, orderBy: { createdAt: 'desc' } });
    const events = await this.prisma.centerEvent.findMany({ where: { centerId, meta: { path: ['childId'], equals: id } }, orderBy: { id: 'desc' }, take: 50 });
    const manager = v.role === 'CENTER_ADMIN' || v.role === 'COORDINATOR';
    const { timezone } = await this.prisma.center.findUniqueOrThrow({ where: { id: centerId }, select: { timezone: true } });
    const designated = c.referentMembershipId && c.status === 'ACTIVE'
      ? await this.prisma.membership.findFirst({ where: {
        id: c.referentMembershipId, centerId, status: 'ACTIVE',
        user: { status: 'ACTIVE' }, roles: { some: { role: 'THERAPIST' } },
      }, select: { id: true, specialties: true, user: { select: { displayName: true } } } })
      : null;
    const currentReferent = designated && c.assignments.some(a =>
      a.membershipId === designated.id && a.endedAt === null && designated.specialties.includes(a.service))
      ? { membershipId: designated.id, displayName: designated.user.displayName } : null;
    return {
      timezone,
      id: c.id, firstName: c.firstName, lastName: c.lastName, preferredName: c.preferredName, dateOfBirth: c.dateOfBirth.toISOString().slice(0, 10),
      services: c.services, status: c.status, version: c.version, createdAt: c.createdAt,
      referent: currentReferent, referentRevision: c.referentRevision,
      referentStatus: !c.referentMembershipId ? 'NOT_DESIGNATED' : currentReferent ? 'ACTIVE' : 'UNAVAILABLE',
      guardians: c.guardians.map((g) => {
        const inv = invites.find((i) => i.guardianLinkId === g.id);
        return {
          id: g.id, displayName: g.displayName, relationship: g.relationship, isPrimary: g.isPrimary, portalStatus: g.userId ? 'CONNECTED' : inv ? invitationView(inv, now).status : 'NOT_INVITED',
          ...(manager ? { email: g.email, invitationId: inv?.id ?? null } : {}),
        };
      }),
      assignments: c.assignments.map((a) => ({ id: a.id, membershipId: a.membershipId, therapist: name(a.membershipId), title: team.find((t) => t.id === a.membershipId)?.title ?? null, service: a.service, isLead: a.isLead, startedAt: a.startedAt, endedAt: a.endedAt })),
      appointments: c.appointments.map((a) => ({ id: a.id, startsAt: a.startsAt, endsAt: a.endsAt, service: a.service, status: a.status, room: a.room, therapist: name(a.membershipId), membershipId: a.membershipId, version: a.version })),
      events: await describeEvents(this.prisma, events),
    };
  }

  private async authorizeCare(centerId: string, id: string, v: Viewer) {
    if (!['CENTER_ADMIN','COORDINATOR','THERAPIST'].includes(v.role))
      throw new ForbiddenException('Private care context is restricted to the current care team.');
    const membership = await this.prisma.membership.findFirst({ where: {
      id: v.membershipId, userId: v.userId, centerId, status: 'ACTIVE',
    }, select: { id: true } });
    if (!membership) throw new NotFoundException('Child not found');
    const child = await this.prisma.child.findFirst({ where: {
      id, centerId,
      ...(v.role === 'THERAPIST' ? childScope(v) : {}),
    }, select: { id: true, status: true } });
    if (!child) throw new NotFoundException('Child not found');
    return child;
  }

  async privateCare(centerId: string, id: string, v: Viewer) {
    await this.authorizeCare(centerId, id, v);
    const row = await this.prisma.childCareIntake.findFirst({ where: { centerId, childId: id } });
    if (!row) return { version: 0, source: 'FAMILY_REPORTED_UNVERIFIED',
      conditions: '', allergies: '', medications: '', careNotes: '' };
    const opened = openPrivateData(row.encryptedBody, 'care-v1', centerId, id);
    return { ...JSON.parse(opened.toString('utf8')) as ReturnType<typeof privateCareBody>, version: row.version };
  }

  async updatePrivateCare(centerId: string, id: string, v: Viewer, dto: PrivateCareUpdateDto) {
    if (!['CENTER_ADMIN','COORDINATOR'].includes(v.role))
      throw new ForbiddenException('Only authorized child managers may change family-reported care context.');
    await this.authorizeCare(centerId, id, v);
    const encryptedBody = encryptCare(centerId, id, dto);
    const now = this.trial.now();
    try {
      await this.prisma.$transaction(async tx => {
        await this.trial.assertWritable(tx, centerId, now);
        // P2: the earlier request check is not authoritative. A coordinator
        // can lose their live role or membership while waiting for the center
        // lock. Revalidate under the same lock before writing sensitive care.
        await assertActor(tx, centerId, v, ['CENTER_ADMIN', 'COORDINATOR']);
        await tx.$queryRaw`SELECT id FROM child WHERE id=${id}::uuid AND center_id=${centerId}::uuid FOR UPDATE`;
        const currentChild = await tx.child.findFirst({ where: { id, centerId } });
        if (!currentChild || currentChild.status !== 'ACTIVE') throw new NotFoundException('Active child not found');
        const current = await tx.childCareIntake.findFirst({ where: { centerId, childId: id } });
        if (current?.version !== (dto.version || 0)) {
          if (current || dto.version !== 0) throw new ConflictException('Care context changed. Reload before saving.');
        }
        if (!current) {
          await tx.childCareIntake.create({ data: { centerId, childId: id, encryptedBody,
            modifiedById: v.userId, createdAt: now, updatedAt: now } });
        } else {
          const updated = await tx.childCareIntake.updateMany({ where: { id: current.id, centerId, version: dto.version },
            data: { encryptedBody, modifiedById: v.userId, version: { increment: 1 }, updatedAt: now } });
          if (updated.count !== 1) throw new ConflictException('Care context changed. Reload before saving.');
        }
        await logCenterEvent(tx, centerId, 'child.care_context_updated', now, {
          actorUserId: v.userId, meta: { childId: id, category: 'family_reported_unverified' },
        });
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('Care context changed. Reload before saving.');
      throw error;
    }
    await this.audit.record('child.care_context_updated', {
      actorUserId: v.userId, meta: { centerId, childId: id },
    });
    return this.privateCare(centerId, id, v);
  }

  // An uploaded child photograph is sealed and quarantined until an actual
  // connected guardian explicitly attests the photo and authorizes private use.
  // Isolated scan stage allows adversarial testing of permission revocation
  // while antivirus processing is pending; the post-scan transaction is
  // authoritative and never trusts this stage's earlier authorization.
  private preparePhotoCandidate(pngBase64: string, centerId: string, childId: string) {
    return preparePrivatePng(pngBase64, 'child-photo-v1', centerId, childId);
  }

  async uploadPhotoCandidate(centerId: string, childId: string, v: Viewer, pngBase64: string) {
    if (!['CENTER_ADMIN','COORDINATOR'].includes(v.role))
      throw new ForbiddenException('Only child managers can prepare a private photo candidate.');
    const child = await this.authorizeCare(centerId, childId, v);
    if (child.status !== 'ACTIVE') throw new NotFoundException('Active child not found');
    const ready = await this.preparePhotoCandidate(pngBase64, centerId, childId);
    const record = await this.prisma.$transaction(async tx => {
      await this.trial.assertWritable(tx, centerId, this.trial.now());
      // P1: Never store scanned photo if role, user or membership changed
      // while antivirus was pending. This locks the live role assignment and
      // verifies the exact active session role, not the original request guard.
      await assertActor(tx, centerId, v, ['CENTER_ADMIN', 'COORDINATOR']);
      const current = await tx.child.findFirst({ where: { id: childId, centerId, status: 'ACTIVE' }, select: { id: true } });
      if (!current) throw new NotFoundException('Active child not found');
      const saved = await tx.privateMediaCandidate.create({ data: {
        centerId, kind:'CHILD_PHOTO', childId,
        ...ready, createdById:v.userId, status:'QUARANTINED',
        consentState:'PENDING', rightsState:'UNVERIFIED',
      } });
      await logCenterEvent(tx, centerId, 'child.photo_candidate_created', this.trial.now(),
        { actorUserId:v.userId, meta:{childId,candidateId:saved.id,kind:'CHILD_PHOTO'} });
      return saved;
    });
    await this.audit.record('child.photo_candidate_created', {actorUserId:v.userId,meta:{centerId,childId,candidateId:record.id}});
    return { id:record.id, status:'QUARANTINED' as const, consentState:'PENDING' as const,
      publishEnabled:false as const, width:record.width,height:record.height };
  }

  async privatePhotoStatus(centerId: string, childId: string, v: Viewer) {
    await this.authorizeCare(centerId, childId, v);
    const rows=await this.prisma.privateMediaCandidate.findMany({where:{
      centerId,childId,kind:'CHILD_PHOTO',status:{in:['QUARANTINED','PRIVATE_READY']},
    },orderBy:[{createdAt:'desc'},{id:'desc'}],take:15,
      select:{id:true,status:true,consentState:true,width:true,height:true,createdAt:true}});
    return {candidates:rows,publicRelease:false};
  }

  async readPrivatePhoto(centerId:string,childId:string,v:Viewer) {
    await this.authorizeCare(centerId,childId,v);
    const image=await this.prisma.privateMediaCandidate.findFirst({
      where:{centerId,childId,kind:'CHILD_PHOTO',status:'PRIVATE_READY',
        consentState:'GRANTED',rightsState:'GUARDIAN_ATTESTED',revokedAt:null,consentedGuardianLinkId:{not:null}},
      orderBy:[{createdAt:'desc'},{id:'desc'}],
      select:{encryptedBytes:true,width:true,height:true,id:true,consentedGuardianLinkId:true},
    });
    if (!image) throw new NotFoundException('No consented private photo is available.');
    const consentLink=await this.prisma.guardianLink.findFirst({where:{
      id:image.consentedGuardianLinkId!,centerId,childId,removedAt:null,
    },select:{id:true}});
    if(!consentLink)throw new NotFoundException('No consented private photo is available.');
    const plain=openPrivateData(image.encryptedBytes,'child-photo-v1',centerId,childId);
    return {mimeType:'image/png' as const,pngBase64:plain.toString('base64'),
      width:image.width,height:image.height,publicRelease:false as const};
  }

  private async linkedGuardian(centerId:string,childId:string,v:Viewer,allowArchived=false) {
    if(v.role!=='GUARDIAN')throw new ForbiddenException('Guardian-linked child access required.');
    // Cached session permissions alone cannot authorize sensitive media reads.
    const membership=await this.prisma.membership.findFirst({where:{
      id:v.membershipId,userId:v.userId,centerId,status:'ACTIVE',
      user:{status:'ACTIVE'},center:{status:'ACTIVE'},roles:{some:{role:'GUARDIAN'}},
    },select:{id:true}});
    if(!membership)throw new ForbiddenException('Your guardian workspace access has changed.');
    const link=await this.prisma.guardianLink.findFirst({where:{
      centerId,childId,userId:v.userId,removedAt:null,
      ...(allowArchived ? {} : {child:{status:'ACTIVE' as const,centerId}}),
    },select:{id:true}});
    if(!link)throw new NotFoundException('Linked child not found');
    return link;
  }

  private async lockedGuardianPhotoWrite(tx:Tx,centerId:string,childId:string,v:Viewer,allowArchived=false) {
    // Revocation of membership/role and removal of the guardian-child link
    // must serialize with consent and erasure, not merely the HTTP guard.
    await lockCenter(tx,centerId);
    await assertActor(tx,centerId,v,['GUARDIAN']);
    await tx.$queryRaw`SELECT id FROM guardian_link WHERE center_id=${centerId}::uuid AND child_id=${childId}::uuid
      AND user_id=${v.userId}::uuid AND removed_at IS NULL FOR UPDATE`;
    const link=await tx.guardianLink.findFirst({where:{
      centerId,childId,userId:v.userId,removedAt:null,
      ...(allowArchived ? {} : {child:{status:'ACTIVE' as const,centerId}}),
    },select:{id:true}});
    if(!link)throw new NotFoundException('Linked child not found');
    return link;
  }

  async guardianPhotoCandidates(centerId:string,childId:string,v:Viewer) {
    await this.linkedGuardian(centerId,childId,v);
    const candidates=await this.prisma.privateMediaCandidate.findMany({where:{
      centerId,childId,kind:'CHILD_PHOTO',
      status:{in:['QUARANTINED','PRIVATE_READY']},
    },orderBy:[{createdAt:'desc'},{id:'desc'}],take:15,
      select:{id:true,status:true,consentState:true}});
    return {candidates};
  }

  async guardianReadPhoto(centerId:string,childId:string,v:Viewer) {
    await this.linkedGuardian(centerId,childId,v);
    const candidate=await this.prisma.privateMediaCandidate.findFirst({where:{
      centerId,childId,kind:'CHILD_PHOTO',status:'PRIVATE_READY',
      consentState:'GRANTED',rightsState:'GUARDIAN_ATTESTED',revokedAt:null,consentedGuardianLinkId:{not:null},
    },orderBy:[{createdAt:'desc'},{id:'desc'}],
    select:{encryptedBytes:true,width:true,height:true,consentedGuardianLinkId:true}});
    if(!candidate)throw new NotFoundException('No consented private photo is available.');
    const consentLink=await this.prisma.guardianLink.findFirst({where:{
      id:candidate.consentedGuardianLinkId!,centerId,childId,removedAt:null,
    },select:{id:true}});
    if(!consentLink)throw new NotFoundException('No consented private photo is available.');
    const bytes=openPrivateData(candidate.encryptedBytes,'child-photo-v1',centerId,childId);
    return {mimeType:'image/png' as const,pngBase64:bytes.toString('base64'),
      width:candidate.width,height:candidate.height,publicRelease:false as const};
  }

  async guardianReviewPhoto(centerId:string,childId:string,v:Viewer,candidateId:string) {
    await this.linkedGuardian(centerId,childId,v);
    const candidate=await this.prisma.privateMediaCandidate.findFirst({where:{
      id:candidateId,centerId,childId,kind:'CHILD_PHOTO',
      status:'QUARANTINED',consentState:'PENDING',revokedAt:null,
    },select:{encryptedBytes:true,width:true,height:true}});
    if(!candidate) throw new NotFoundException('Pending private photo not found');
    const bytes=openPrivateData(candidate.encryptedBytes,'child-photo-v1',centerId,childId);
    return {mimeType:'image/png' as const,pngBase64:bytes.toString('base64'),
      width:candidate.width,height:candidate.height,previewOnly:true as const,publicRelease:false as const};
  }

  async guardianPhotoDecision(centerId:string,childId:string,v:Viewer,candidateId:string,consent:boolean) {
    if(v.role!=='GUARDIAN') throw new ForbiddenException('Only an active linked guardian may give photo consent.');
    await this.linkedGuardian(centerId,childId,v);
    return this.prisma.$transaction(async tx=>{
      const link=await this.lockedGuardianPhotoWrite(tx,centerId,childId,v);
      const row=await tx.privateMediaCandidate.findFirst({where:{
        id:candidateId,centerId,childId,kind:'CHILD_PHOTO',status:'QUARANTINED',
        consentState:'PENDING',rightsState:'UNVERIFIED',
      },select:{id:true}});
      if(!row)throw new NotFoundException('Pending photo candidate not found');
      if(consent){
        // Replace older private-ready photo, revoking its private-read eligibility.
        await tx.privateMediaCandidate.deleteMany({where:{
          centerId,childId,kind:'CHILD_PHOTO',status:'PRIVATE_READY',id:{not:candidateId},
        }});
        await tx.privateMediaCandidate.update({where:{id:candidateId},data:{
          status:'PRIVATE_READY',consentState:'GRANTED',rightsState:'GUARDIAN_ATTESTED',consentedGuardianLinkId:link.id,
        }});
      }else{
        // Denial purges ciphertext instead of retaining unconsented child imagery.
        await tx.privateMediaCandidate.delete({where:{id:candidateId}});
      }
      await logCenterEvent(tx,centerId,consent?'child.photo_private_consent':'child.photo_private_denied',
        this.trial.now(),{actorUserId:v.userId,meta:{childId,candidateId,linkedGuardianId:link.id}});
      return {consentRecorded:true,privateReady:consent,publicRelease:false};
    });
  }

  async guardianRevokePhoto(centerId:string,childId:string,v:Viewer) {
    if(v.role!=='GUARDIAN') throw new ForbiddenException('Only a linked guardian may revoke photo consent.');
    // Erasure remains available even after a child record was archived.
    await this.linkedGuardian(centerId,childId,v,true);
    return this.prisma.$transaction(async tx=>{
      const link=await this.lockedGuardianPhotoWrite(tx,centerId,childId,v,true);
      // Hard delete ciphertext to revoke read and reduce retention risk.
      const purged=await tx.privateMediaCandidate.deleteMany({where:{
        centerId,childId,kind:'CHILD_PHOTO',status:{in:['PRIVATE_READY','QUARANTINED']},
      }});
      await logCenterEvent(tx,centerId,'child.photo_consent_revoked',this.trial.now(),
        {actorUserId:v.userId,meta:{childId,purgedCandidates:purged.count}});
      return {revoked:true,deleted:purged.count};
    });
  }

  async update(centerId: string, actorUserId: string, id: string, dto: UpdateChildDto) {
    const now = this.trial.now();
    if (dto.dateOfBirth) this.checkDob(dto.dateOfBirth, now);
    const data = {
      ...(dto.firstName ? { firstName: clean(dto.firstName) } : {}), ...(dto.lastName ? { lastName: clean(dto.lastName) } : {}),
      ...(dto.preferredName !== undefined ? { preferredName: dto.preferredName ? clean(dto.preferredName) : null } : {}),
      ...(dto.dateOfBirth ? { dateOfBirth: dob(dto.dateOfBirth) } : {}), ...(dto.services ? { services: uniq(dto.services) } : {}),
    };
    await this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const r = await tx.child.updateMany({ where: { id, centerId, version: dto.version }, data: { ...data, version: { increment: 1 } } });
      if (r.count !== 1) {
        if (!(await tx.child.findFirst({ where: { id, centerId } }))) throw new NotFoundException('Child not found');
        throw new ConflictException('This record changed since you opened it. Reload to see the latest version.');
      }
      await logCenterEvent(tx, centerId, 'child.updated', now, { actorUserId, meta: { childId: id, fields: Object.keys(data) } });
    });
  }

  async setStatus(centerId: string, actorUserId: string, id: string, status: 'ACTIVE' | 'ARCHIVED', reason?: string) {
    const now = this.trial.now();
    const affected = await this.prisma.$transaction(async (tx) => {
      // Global lock order: centre (trial/capacity) -> child -> assignment -> history.
      // Reading referent/revision before the child lock can orphan a new
      // concurrent designation when this transaction archives the child.
      if (status === 'ACTIVE') await this.trial.assertChildCapacity(tx, centerId, now);
      else await this.trial.assertWritable(tx, centerId, now);
      await tx.$queryRaw`SELECT id FROM child WHERE id=${id}::uuid AND center_id=${centerId}::uuid FOR UPDATE`;
      const c = await tx.child.findFirst({ where: { id, centerId } });
      if (!c) throw new NotFoundException('Child not found');
      if (c.status === status) throw new ConflictException(status === 'ACTIVE' ? 'This child is already active.' : 'This child is already archived.');
      await tx.child.update({ where: { id }, data: { status, version: { increment: 1 } } });
      let near: { id: string; before: Date }[] = [];
      if (status === 'ARCHIVED') {
        if (c.referentMembershipId) {
          await tx.child.update({ where: { id }, data: {
            referentMembershipId: null, referentRevision: { increment: 1 }, version: { increment: 1 },
          } });
          await tx.childReferentHistory.create({ data: {
            centerId, childId: id, actorUserId, previousMembershipId: c.referentMembershipId,
            nextMembershipId: null, reason: 'Child archived', revision: c.referentRevision + 1, createdAt: now,
          } });
        }
        near = (await tx.appointment.findMany({ where: { centerId, childId: id, status: 'SCHEDULED', startsAt: { gte: now, lte: new Date(now.getTime() + 14 * 86_400_000) } }, select: { id: true, startsAt: true } })).map((a) => ({ id: a.id, before: a.startsAt }));
        await tx.appointment.updateMany({ where: { centerId, childId: id, status: 'SCHEDULED', startsAt: { gte: now } }, data: { status: 'CANCELLED', statusReason: 'Child record archived', version: { increment: 1 } } });
        await tx.appointmentSeries.updateMany({ where: { centerId, childId: id, status: 'ACTIVE' }, data: { status: 'ENDED', version: { increment: 1 } } });
        await tx.careAssignment.updateMany({ where: { centerId, childId: id, endedAt: null }, data: { endedAt: now, isLead: false } });
      }
      await logCenterEvent(tx, centerId, status === 'ACTIVE' ? 'child.restored' : 'child.archived', now, { actorUserId, meta: { childId: id, ...(reason ? { reason } : {}) } });
      return near;
    });
    await this.notices.changed(affected, 'cancelled');
  }

  private async invite(tx: Prisma.TransactionClient, centerId: string, link: { id: string; email: string; displayName: string }, actorUserId: string, now: Date) {
    return this.invitations.createInTx(tx, { centerId, kind: 'GUARDIAN', email: link.email, displayName: link.displayName, roles: ['GUARDIAN'], guardianLinkId: link.id, invitedById: actorUserId }, now);
  }

  async addGuardian(centerId: string, actorUserId: string, childId: string, dto: GuardianDto) {
    const now = this.trial.now();
    const emailNorm = normalizeEmail(dto.email);
    const result = await withUniqueGuard(() => this.prisma.$transaction(async (tx) => {
      const center = await this.trial.assertWritable(tx, centerId, now);
      const child = await tx.child.findFirst({ where: { id: childId, centerId, status: 'ACTIVE' } });
      if (!child) throw new NotFoundException('Child not found');
      if (dto.isPrimary) await tx.guardianLink.updateMany({ where: { centerId, childId, removedAt: null, isPrimary: true }, data: { isPrimary: false } });
      // Every guardian, even one already connected at this center, must accept an invitation before seeing this child.
      const link = await tx.guardianLink.create({
        data: { centerId, childId, displayName: clean(dto.displayName), email: dto.email.trim(), emailNorm, relationship: dto.relationship, isPrimary: !!dto.isPrimary, userId: null, createdAt: now },
      });
      await logCenterEvent(tx, centerId, 'guardian.added', now, { actorUserId, meta: { childId, guardianLinkId: link.id, invitee: link.displayName } });
      const sent = dto.invite ? await this.invite(tx, centerId, link, actorUserId, now) : null;
      return { link, sent, centerName: center.name };
    }), 'This guardian is already linked to the child, or a pending invitation already exists for this email.');
    if (result.sent) this.invitations.deliver(result.sent.invitation, result.centerName, result.sent.token);
    return { id: result.link.id, connected: !!result.link.userId, invited: !!result.sent };
  }

  async sendGuardianInvite(centerId: string, actorUserId: string, childId: string, linkId: string) {
    const link = await this.prisma.guardianLink.findFirst({ where: { id: linkId, childId, centerId, removedAt: null } });
    if (!link) throw new NotFoundException('Guardian not found');
    if (link.userId) throw new ConflictException('This guardian is already connected to the family portal.');
    const pending = await this.prisma.invitation.findFirst({ where: { centerId, guardianLinkId: linkId, status: 'PENDING' } });
    if (pending) {
      await this.prisma.$transaction((tx) => this.trial.assertWritable(tx, centerId, this.trial.now()));
      return this.invitations.resend(centerId, pending.id, actorUserId, 'GUARDIAN');
    }
    const now = this.trial.now();
    const r = await withUniqueGuard(() => this.prisma.$transaction(async (tx) => {
      const center = await this.trial.assertWritable(tx, centerId, now);
      return { ...(await this.invite(tx, centerId, link, actorUserId, now)), centerName: center.name };
    }), 'A pending invitation already exists for this email.');
    this.invitations.deliver(r.invitation, r.centerName, r.token);
    return invitationView(r.invitation, now);
  }

  async removeGuardian(centerId: string, actorUserId: string, childId: string, linkId: string, reason: string) {
    const now = this.trial.now();
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.guardianLink.updateMany({ where: { id: linkId, childId, centerId, removedAt: null }, data: { removedAt: now, isPrimary: false } });
      if (r.count !== 1) throw new NotFoundException('Guardian not found');
      await tx.invitation.updateMany({ where: { centerId, guardianLinkId: linkId, status: 'PENDING' }, data: { status: 'REVOKED', revokedAt: now, revokedById: actorUserId } });
      await logCenterEvent(tx, centerId, 'guardian.removed', now, { actorUserId, meta: { childId, guardianLinkId: linkId, reason } });
    });
  }

  // Non-authorizing child-wide coordination designation. Unlike per-service
  // isLead, this may only be set explicitly by an active centre administrator.
  async setReferent(centerId: string, v: Viewer, childId: string, dto: ReferentDto) {
    if (dto.membershipId === undefined) throw new UnprocessableEntityException('Explicitly choose a therapist or clear the designation.');
    const now = this.trial.now();
    return this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      await assertActor(tx, centerId, v, ['CENTER_ADMIN']);
      await tx.$queryRaw`SELECT id FROM child WHERE id=${childId}::uuid AND center_id=${centerId}::uuid FOR UPDATE`;
      const child = await tx.child.findFirst({ where: { id: childId, centerId, status: 'ACTIVE' } });
      if (!child) throw new NotFoundException('Active child not found.');
      if (child.version !== dto.version) throw new ConflictException('This child changed. Reload before reassigning the referent.');
      const next = dto.membershipId ?? null;
      if (child.referentMembershipId === next) throw new ConflictException('This referent designation is already current.');
      if (next) {
        const member = await tx.membership.findFirst({
          where: { id: next, centerId, status: 'ACTIVE', user: { status: 'ACTIVE' },
            roles: { some: { role: 'THERAPIST' } } },
          select: { id: true, specialties: true },
        });
        const assigned = member && await tx.careAssignment.findFirst({
          where: { centerId, childId, membershipId: next, endedAt: null, service: { in: member.specialties } },
          select: { id: true },
        });
        if (!assigned) throw new UnprocessableEntityException('Choose an active therapist assigned to this child.');
      }
      const updated = await tx.child.updateMany({
        where: { id: childId, centerId, version: dto.version },
        data: { referentMembershipId: next, referentRevision: { increment: 1 }, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ConflictException('This child changed before the designation could be saved.');
      const revision = child.referentRevision + 1;
      await tx.childReferentHistory.create({ data: {
        centerId, childId, actorUserId: v.userId,
        previousMembershipId: child.referentMembershipId, nextMembershipId: next,
        reason: dto.reason.trim(), revision, createdAt: now,
      } });
      await logCenterEvent(tx, centerId, 'child.referent_changed', now, {
        actorUserId: v.userId, meta: { childId, previousMembershipId: child.referentMembershipId,
          nextMembershipId: next, revision, reason: dto.reason.trim() },
      });
      return { referentMembershipId: next, referentRevision: revision, version: dto.version + 1 };
    });
  }

  async assign(centerId: string, actorUserId: string, childId: string, dto: AssignmentDto) {
    const now = this.trial.now();
    return withUniqueGuard(() => this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const child = await tx.child.findFirst({ where: { id: childId, centerId, status: 'ACTIVE' } });
      if (!child) throw new NotFoundException('Child not found');
      const m = await tx.membership.findFirst({ where: { id: dto.membershipId, centerId, status: 'ACTIVE', roles: { some: { role: 'THERAPIST' } } }, include: { user: true } });
      if (!m) throw new UnprocessableEntityException('Choose an active therapist from this center.');
      if (!m.specialties.includes(dto.service)) throw new UnprocessableEntityException('This therapist’s profile does not list that specialty. Update their specialties in Team first.');
      if (!child.services.includes(dto.service)) throw new UnprocessableEntityException('Add this service to the child’s profile before assigning a therapist for it.');
      if (dto.isLead) await tx.careAssignment.updateMany({ where: { centerId, childId, service: dto.service, endedAt: null, isLead: true }, data: { isLead: false } });
      const a = await tx.careAssignment.create({ data: { centerId, childId, membershipId: m.id, service: dto.service, isLead: !!dto.isLead, startedAt: now } });
      await logCenterEvent(tx, centerId, 'assignment.started', now, { actorUserId, subjectUserId: m.userId, membershipId: m.id, meta: { childId, service: dto.service } });
      return { id: a.id };
    }), 'This therapist is already assigned to this child for that service.');
  }

  async endAssignment(centerId: string, actorUserId: string, childId: string, assignmentId: string) {
    const now = this.trial.now();
    const cascade = await this.prisma.$transaction(async (tx) => {
      // Match clinical.write/setReferent: the centre must be locked first.
      // Do not add a new trial-expiry permission gate to assignment ending.
      await lockCenter(tx, centerId);
      await tx.$queryRaw`SELECT id FROM child WHERE id=${childId}::uuid AND center_id=${centerId}::uuid FOR UPDATE`;
      const child = await tx.child.findFirst({ where: { id: childId, centerId } });
      if (!child) throw new NotFoundException('Child not found');
      const a = await tx.careAssignment.findFirst({ where: { id: assignmentId, childId, centerId, endedAt: null } });
      if (!a) throw new NotFoundException('Active assignment not found');
      const result = await terminateTherapistCare(tx, centerId, a.membershipId, actorUserId, now, 'Therapist assignment ended', { childId, service: a.service });
      await logCenterEvent(tx, centerId, 'assignment.ended', now, { actorUserId, membershipId: a.membershipId, meta: { childId, service: a.service, cancelledAppointments: result.cancelledAppointments, endedSeries: result.endedSeries } });
      return result;
    });
    await this.notices.changed(cascade.noticeAppointments, 'cancelled');
  }

  async therapists(centerId: string, options: { offset?: number; limit?: number; service?: string; search?: string; ids?: string[] } = {}) {
    const offset = options.offset ?? 0, limit = options.limit ?? 100;
    const batch = await this.prisma.membership.findMany({ where: {
      centerId, status: 'ACTIVE', roles: { some: { role: 'THERAPIST' } },
      ...(options.service ? { specialties: { has: options.service } } : {}),
      ...(options.search ? { user: { displayName: { contains: options.search, mode: 'insensitive' } } } : {}),
      ...(options.ids ? { id: { in: options.ids } } : {}),
    }, include: { user: { select: { displayName: true } } },
    orderBy: [{ user: { displayName: 'asc' } }, { id: 'asc' }], skip: offset, take: limit + 1 });
    const hasMore = batch.length > limit;
    return { items: batch.slice(0, limit).map((m) => ({ membershipId: m.id, displayName: m.user.displayName,
      title: m.title, specialties: m.specialties })), hasMore, nextOffset: hasMore ? offset + limit : null };
  }
}
