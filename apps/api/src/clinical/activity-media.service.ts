import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrialService } from '../operations/trial.service';
import { logCenterEvent } from '../centers/history';
import type { Viewer } from '../operations/children.service';
import type { ActivityMediaDraftDto, ActivityMediaRejectDto } from './activity-media.dto';

@Injectable()
export class ActivityMediaService {
  constructor(private readonly prisma: PrismaService, private readonly trial: TrialService) {}

  private async authorizedTemplate(centerId: string, v: Viewer, templateId: string) {
    // Centre-owned activity only. Globally shared synthetic samples cannot be modified.
    const t = await this.prisma.activityTemplate.findFirst({ where: { id: templateId, centerId } });
    if (!t) throw new NotFoundException('Activity not found.');
    if (v.role === 'THERAPIST' && t.createdById !== v.userId) {
      throw new ForbiddenException('Duplicate this activity before preparing your own artwork.');
    }
    if (!['THERAPIST', 'CENTER_ADMIN', 'COORDINATOR'].includes(v.role)) {
      throw new ForbiddenException('Only authorized activity editors can prepare media.');
    }
    return t;
  }

  async list(centerId: string, v: Viewer, templateId: string) {
    await this.authorizedTemplate(centerId, v, templateId);
    const rows = await this.prisma.activityMediaDraft.findMany({
      where: { centerId, templateId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100,
    });
    return { items: rows, hasMore: rows.length === 100, publishEnabled: false, clinicalReleaseEnabled: false };
  }

  async propose(centerId: string, v: Viewer, templateId: string, dto: ActivityMediaDraftDto) {
    const now = this.trial.now();
    return this.prisma.$transaction(async tx => {
      await this.trial.assertWritable(tx, centerId, now);
      // Lock activity row and recheck assignment within the transaction so that
      // a moved/edited activity cannot attach a stale or foreign illustration.
      await tx.$queryRaw`SELECT id FROM activity_template WHERE id=${templateId}::uuid AND center_id=${centerId}::uuid FOR SHARE`;
      const t = await tx.activityTemplate.findFirst({ where: { id: templateId, centerId } });
      if (!t) throw new NotFoundException('Activity not found.');
      if (v.role === 'THERAPIST' && t.createdById !== v.userId) {
        throw new ForbiddenException('Duplicate this activity before preparing your own artwork.');
      }
      if (!['THERAPIST', 'CENTER_ADMIN', 'COORDINATOR'].includes(v.role)) {
        throw new ForbiddenException('Only authorized activity editors can prepare media.');
      }
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
      const t = await tx.activityTemplate.findFirst({ where: { id: templateId, centerId } });
      if (!t) throw new NotFoundException('Activity not found.');
      if (v.role === 'THERAPIST' && t.createdById !== v.userId) {
        throw new ForbiddenException('Only the activity author can reject its draft.');
      }
      if (!['THERAPIST', 'CENTER_ADMIN', 'COORDINATOR'].includes(v.role)) {
        throw new ForbiddenException('Only authorized activity editors can reject media.');
      }
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
