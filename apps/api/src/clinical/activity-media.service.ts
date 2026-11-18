import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
      // The client may not claim an approved asset, uploaded bytes or public URL.
      // The future storage adapter and independent reviewer must attest those.
      if (dto.sourceType === 'GENERATED' && !dto.providerTerms?.trim()) {
        throw new UnprocessableEntityException('Generated artwork requires provider terms evidence.');
      }
      const created = await tx.activityMediaDraft.create({
        data: {
          centerId, templateId, templateVersion: t.version, service: t.service,
          state: 'DRAFT', sourceType: dto.sourceType, styleVersion: dto.styleVersion,
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

  async reject(centerId: string, v: Viewer, templateId: string, draftId: string, dto: ActivityMediaRejectDto) {
    const now = this.trial.now();
    return this.prisma.$transaction(async tx => {
      await this.trial.assertWritable(tx, centerId, now);
      await this.authorizedTemplate(tx, centerId, v, templateId);
      const changed = await tx.activityMediaDraft.updateMany({
        where: { id: draftId, centerId, templateId, version: dto.version, state: 'DRAFT' },
        data: { state: 'REJECTED', rejectionReason: dto.reason, version: { increment: 1 }, updatedAt: now },
      });
      if (changed.count !== 1) throw new ConflictException('Artwork draft changed or is unavailable.');
      await logCenterEvent(tx, centerId, 'media.draft_rejected', now, {
        actorUserId: v.userId, meta: { templateId, mediaDraftId: draftId },
      });
      return { id: draftId, state: 'REJECTED' as const, version: dto.version + 1, publishEnabled: false };
    });
  }
}
