import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { preparePrivatePng } from '../common/private-image-candidate';
import { TrialService } from '../operations/trial.service';
import { logCenterEvent, type Tx } from '../centers/history';
import { assertActor } from './governance-core';
import type { Viewer } from '../operations/children.service';
import type { ActivityMediaDraftDto, ActivityMediaRejectDto } from './activity-media.dto';

@Injectable()
export class ActivityMediaService {
  constructor(private readonly prisma: PrismaService, private readonly trial: TrialService) {}

  // Match ClinicalService.templateWriter: active user/role, live specialty
  // membership and activity ownership are checked in the same DB transaction.
  private async authorizedTemplate(tx: Tx, centerId: string, v: Viewer, templateId: string) {
    await assertActor(tx, centerId, v, ['THERAPIST', 'CLINICAL_SUPERVISOR']);
    const t = await tx.activityTemplate.findFirst({ where: { id: templateId, centerId } });
    if (!t) throw new NotFoundException('Activity not found.');
    if (v.role === 'THERAPIST') {
      const allowed = await tx.membership.findFirst({
        where: {
          id: v.membershipId, userId: v.userId, centerId, status: 'ACTIVE',
          specialties: { has: t.service },
        }, select: { id: true },
      });
      if (!allowed) throw new ForbiddenException('This specialty is no longer assigned.');
      if (t.createdById !== v.userId) throw new ForbiddenException('Duplicate this activity before preparing your own artwork.');
    }
    return t;
  }

  async list(centerId: string, v: Viewer, templateId: string, cursor?: string, limit = 50) {
    // The opaque page boundary is an immutable draft UUID. Every cursor must
    // belong to this same centre/activity; foreign and stale cursors fail closed.
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new UnprocessableEntityException('Media page size must be between 1 and 100.');
    }
    return this.prisma.$transaction(async tx => {
      await this.authorizedTemplate(tx, centerId, v, templateId);
      if (cursor) {
        const boundary = await tx.activityMediaDraft.findFirst({
          where: { id: cursor, centerId, templateId }, select: { id: true },
        });
        if (!boundary) throw new NotFoundException('Media page cursor not found.');
      }
      const rows = await tx.activityMediaDraft.findMany({
        where: { centerId, templateId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take: limit + 1,
      });
      const items = rows.slice(0, limit);
      const hasMore = rows.length > limit;
      return {
        items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null,
        publishEnabled: false, clinicalReleaseEnabled: false,
      };
    });
  }

  async propose(centerId: string, v: Viewer, templateId: string, dto: ActivityMediaDraftDto) {
    const now = this.trial.now();
    return this.prisma.$transaction(async tx => {
      await this.trial.assertWritable(tx, centerId, now);
      // Lock activity row and recheck assignment within the transaction so that
      // a moved/edited activity cannot attach a stale or foreign illustration.
      await tx.$queryRaw`SELECT id FROM activity_template WHERE id=${templateId}::uuid AND center_id=${centerId}::uuid FOR SHARE`;
      const t = await this.authorizedTemplate(tx, centerId, v, templateId);
      if (t.version !== dto.templateVersion) {
        throw new ConflictException('Activity changed. Reload before preparing artwork.');
      }
      if (dto.stepNumber !== undefined && (
          !Number.isSafeInteger(dto.stepNumber) || dto.stepNumber < 1 || dto.stepNumber > 64 ||
          !Array.isArray(t.steps) || dto.stepNumber > t.steps.length ||
          typeof t.steps[dto.stepNumber - 1] !== 'string' || !t.steps[dto.stepNumber - 1].trim()
      )) {
        throw new UnprocessableEntityException('Illustration step must refer to an existing activity instruction.');
      }
      // The client may not claim an approved asset, uploaded bytes or public URL.
      // The future storage adapter and independent reviewer must attest those.
      if (dto.sourceType === 'GENERATED' && !dto.providerTerms?.trim()) {
        throw new UnprocessableEntityException('Generated artwork requires provider terms evidence.');
      }
      const created = await tx.activityMediaDraft.create({
        data: {
          centerId, templateId, templateVersion: t.version, stepNumber: dto.stepNumber ?? null,
          service: t.service, state: 'DRAFT', sourceType: dto.sourceType, styleVersion: dto.styleVersion,
          sceneType: dto.sceneType, altText: dto.altText, license: dto.license,
          sourceReference: dto.sourceReference, providerTerms: dto.providerTerms ?? null,
          createdById: v.userId, createdAt: now, updatedAt: now,
        },
      });
      await logCenterEvent(tx, centerId, 'media.draft_registered', now, {
        actorUserId: v.userId, meta: { templateId, mediaDraftId: created.id, sourceType: dto.sourceType },
      });
      return { ...created, uploaded: false, publishEnabled: false, clinicalReleaseEnabled: false };
    });
  }

  async uploadCandidate(centerId:string,v:Viewer,templateId:string,draftId:string,pngBase64:string) {
    // Check actor/ownership and exact version BEFORE consuming scanner capacity.
    const prior=await this.prisma.$transaction(async tx=>{
      const template=await this.authorizedTemplate(tx,centerId,v,templateId);
      const draft=await tx.activityMediaDraft.findFirst({where:{
        id:draftId,centerId,templateId,templateVersion:template.version,state:'DRAFT',
      },select:{id:true,templateVersion:true,createdById:true}});
      if(!draft)throw new ConflictException('Private image proposal changed. Reload.');
      if(v.role==='THERAPIST'&&draft.createdById!==v.userId)
        throw new ForbiddenException('Only the proposing author may supply the image.');
      return {templateVersion:draft.templateVersion};
    });
    const ready=await preparePrivatePng(pngBase64,'activity-image-v1',centerId,templateId);
    const row=await this.prisma.$transaction(async tx=>{
      await this.trial.assertWritable(tx,centerId,this.trial.now());
      const template=await this.authorizedTemplate(tx,centerId,v,templateId);
      const draft=await tx.activityMediaDraft.findFirst({where:{
        id:draftId,centerId,templateId,templateVersion:prior.templateVersion,state:'DRAFT',
      },select:{id:true,createdById:true}});
      if(!draft || template.version!==prior.templateVersion)
        throw new ConflictException('Activity or media draft changed during scanning.');
      if(v.role==='THERAPIST'&&draft.createdById!==v.userId)
        throw new ForbiddenException('Only the proposing author may supply the image.');
      // Both upload and rejection acquire this same row lock. A rejection
      // cannot sweep before this candidate commits; an upload that starts
      // after rejection sees REJECTED under the lock and is refused.
      // Validate state AGAIN after waiting for any earlier transaction.
      await tx.$queryRaw`SELECT id FROM activity_media_draft
        WHERE id=${draftId}::uuid AND center_id=${centerId}::uuid
          AND template_id=${templateId}::uuid FOR UPDATE`;
      const stillOpen=await tx.activityMediaDraft.findFirst({where:{
        id:draftId,centerId,templateId,templateVersion:prior.templateVersion,state:'DRAFT',
      },select:{id:true}});
      if(!stillOpen) throw new ConflictException('Artwork draft was rejected during scanning.');
      const created=await tx.privateMediaCandidate.create({data:{
        centerId,kind:'ACTIVITY_IMAGE',templateId,templateVersion:template.version,mediaDraftId:draftId,
        ...ready,createdById:v.userId,status:'QUARANTINED',consentState:'PENDING',rightsState:'UNVERIFIED',
      }});
      await logCenterEvent(tx,centerId,'media.private_candidate_quarantined',this.trial.now(),{
        actorUserId:v.userId,meta:{templateId,mediaDraftId:draftId,candidateId:created.id},
      });
      return created;
    });
    return {id:row.id,status:'QUARANTINED' as const,width:row.width,height:row.height,
      rightsApproved:false as const,publishEnabled:false as const,readEnabled:false as const};
  }

  /**
   * Reviewers may inspect only bounded, redacted status metadata for their
   * own centre/activity. No private encrypted bytes, digest, key, storage
   * location, URL, scanner internals or approval claims leave this endpoint.
   * The same authorization is rechecked inside the transaction on every page.
   */
  async candidateStatuses(centerId: string, v: Viewer, templateId: string, draftId: string,
    cursor?: string, limit = 50) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new UnprocessableEntityException('Candidate page size must be between 1 and 100.');
    }
    const scope = { centerId, templateId, mediaDraftId: draftId, kind: 'ACTIVITY_IMAGE' };
    return this.prisma.$transaction(async tx => {
      await this.authorizedTemplate(tx, centerId, v, templateId);
      const draft = await tx.activityMediaDraft.findFirst({
        where: { id: draftId, centerId, templateId }, select: { id: true },
      });
      if (!draft) throw new NotFoundException('Illustration draft not found.');
      if (cursor) {
        const boundary = await tx.privateMediaCandidate.findFirst({
          where: { ...scope, id: cursor }, select: { id: true },
        });
        if (!boundary) throw new NotFoundException('Candidate page cursor not found.');
      }
      const rows = await tx.privateMediaCandidate.findMany({
        where: scope, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take: limit + 1,
        select: {
          id: true, status: true, width: true, height: true, createdAt: true,
          templateVersion: true, revokedAt: true,
        },
      });
      const items = rows.slice(0, limit);
      return {
        items, hasMore: rows.length > limit,
        nextCursor: rows.length > limit ? items[items.length - 1].id : null,
        metadataOnly: true as const, readEnabled: false as const,
        publishEnabled: false as const, clinicalReleaseEnabled: false as const,
      };
    });
  }

  async reject(centerId: string, v: Viewer, templateId: string, draftId: string, dto: ActivityMediaRejectDto) {
    const now = this.trial.now();
    return this.prisma.$transaction(async tx => {
      await this.trial.assertWritable(tx, centerId, now);
      await this.authorizedTemplate(tx, centerId, v, templateId);
      // Use the identical row lock as final candidate admission, before
      // optimistic rejection and before sweeping every linked candidate.
      await tx.$queryRaw`SELECT id FROM activity_media_draft
        WHERE id=${draftId}::uuid AND center_id=${centerId}::uuid
          AND template_id=${templateId}::uuid FOR UPDATE`;
      const changed = await tx.activityMediaDraft.updateMany({
        where: { id: draftId, centerId, templateId, version: dto.version, state: 'DRAFT' },
        data: { state: 'REJECTED', rejectionReason: dto.reason, version: { increment: 1 }, updatedAt: now },
      });
      if (changed.count !== 1) throw new ConflictException('Artwork draft changed or is unavailable.');
      // Revocation is atomic with the optimistic draft transition. Candidates
      // scanned before rejection must never remain review-eligible; a raced
      // uploader either commits first and is revoked here, or sees REJECTED.
      // Keep encrypted bytes for controlled retention/audit cleanup only.
      await tx.privateMediaCandidate.updateMany({
        where: {
          centerId, templateId, mediaDraftId: draftId,
          kind: 'ACTIVITY_IMAGE', status: 'QUARANTINED', revokedAt: null,
        },
        data: { status: 'REVOKED', revokedAt: now },
      });
      await logCenterEvent(tx, centerId, 'media.draft_rejected', now, {
        actorUserId: v.userId, meta: { templateId, mediaDraftId: draftId },
      });
      return { id: draftId, state: 'REJECTED' as const, version: dto.version + 1, publishEnabled: false };
    });
  }
}
