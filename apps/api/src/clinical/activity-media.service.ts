import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { readPrivateR2 } from '../common/private-r2';
import { openPrivateData } from '../common/private-envelope';
import { verifyPngCandidate } from './activity-media-png-integrity';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_PRIVATE_IMAGE_BYTES, preparePrivatePng } from '../common/private-image-candidate';
import { TrialService } from '../operations/trial.service';
import { logCenterEvent, type Tx } from '../centers/history';
import { assertActor } from './governance-core';
import type { Viewer } from '../operations/children.service';
import type { ActivityMediaDraftDto, ActivityMediaRejectDto } from './activity-media.dto';
import { ILLUSTRATION_STYLE_VERSION } from './illustration-style';
import { verifiesArtworkApproval, type ArtworkContext } from './activity-artwork-approval';
import { assertGeneratedReferenceBytes, assertGeneratedReferenceScope, generatedReferenceDigest } from './generated-artwork-reference';

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

  /** Read-only current-version mapping of private proposals and scanned candidates.
   * No image bytes, identifiers, rights approval or release authority are returned.
   * Group at the database to bound results by the existing 64 instruction slots.
   */
  async mapping(centerId: string, v: Viewer, templateId: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM activity_template WHERE id=${templateId}::uuid AND center_id=${centerId}::uuid FOR SHARE`;
      const t = await this.authorizedTemplate(tx, centerId, v, templateId);
      const numbers = t.steps.slice(0, 64).flatMap((step, i) => step.trim() ? [i + 1] : []);
      const where = {
        centerId, templateId, templateVersion: t.version, service: t.service,
        state: 'DRAFT', styleVersion: ILLUSTRATION_STYLE_VERSION,
        OR: [{ stepNumber: null }, { stepNumber: { in: numbers } }],
      };
      const proposals = await tx.activityMediaDraft.groupBy({
        by: ['stepNumber'], where, _count: { _all: true },
      });
      const staged = await tx.activityMediaDraft.groupBy({
        by: ['stepNumber'], where: {
          ...where, mediaCandidates: { some: {
            centerId, templateId, templateVersion: t.version, kind: 'ACTIVITY_IMAGE',
            status: 'QUARANTINED', revokedAt: null,
          } },
        }, _count: { _all: true },
      });
      const proposed = new Map(proposals.map(row => [row.stepNumber, row._count._all]));
      const scanned = new Map(staged.map(row => [row.stepNumber, row._count._all]));
      return {
        templateVersion: t.version,
        slots: [null, ...numbers].map(stepNumber => ({
          stepNumber, proposed: proposed.get(stepNumber) ?? 0,
          staged: scanned.get(stepNumber) ?? 0,
        })),
        metadataOnly: true as const, readEnabled: false as const,
        publishEnabled: false as const, clinicalReleaseEnabled: false as const,
      };
    }, { isolationLevel: 'RepeatableRead' });
  }


  /** Staff-only receipt inventory. No bytes or publication permission.
   * A signed record cannot resurrect a revoked candidate or rejected draft.
   */
  async approvedArtwork(centerId: string, v: Viewer, templateId: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM activity_template WHERE id=${templateId}::uuid AND center_id=${centerId}::uuid FOR SHARE`;
      const t = await this.authorizedTemplate(tx, centerId, v, templateId);
      const verified = await this.verifiedArtwork(tx, centerId, templateId, t);
      const items = verified.map(({ stepNumber, altText, width, height }) => ({ stepNumber, altText, width, height }));
      const expectedSteps = t.steps.slice(0,64).flatMap((step,i)=>step.trim()?[i+1]:[]);
      const verifiedSteps = items.filter(item=>item.stepNumber!==null).length;
      return { templateVersion:t.version, items,
        coverage:{ wholeActivityVerified:items.some(item=>item.stepNumber===null),
          verifiedSteps, expectedSteps:expectedSteps.length,
          stepCoveragePercent:expectedSteps.length===0?null:Math.floor(100*verifiedSteps/expectedSteps.length),
          publishedCoveragePercent:null, publishedCoverageAvailable:false as const },
        metadataOnly:true as const, readEnabled:false as const, publishEnabled:false as const,
        clinicalReleaseEnabled:false as const };
    }, { isolationLevel:'RepeatableRead' });
  }


  private async verifiedArtwork(tx: Tx, centerId: string, templateId: string,
    t: Awaited<ReturnType<ActivityMediaService['authorizedTemplate']>>, slot?: number) {
      const rows = await tx.activityArtworkApproval.findMany({
        where: { centerId, templateId, templateVersion: t.version, ...(slot === undefined ? {} : { slot }) },
        take: 66, orderBy: { slot: 'asc' },
        include: { candidate: { select: {
          id: true, centerId: true, templateId: true, templateVersion: true, kind: true,
          status: true, revokedAt: true, digestSha256: true, width: true, height: true,
          scannerName: true, scannerVersion: true,
          mediaDraft: { select: {
            id: true, centerId: true, templateId: true, templateVersion: true, version: true,
            state: true, stepNumber: true, service: true, sourceType: true, styleVersion: true,
            sceneType: true, sourceReference: true, altText: true, license: true, providerTerms: true,
          } },
        } } },
      });
      const items = rows.flatMap(row => {
        const c = row.candidate, d = c.mediaDraft;
        if (!d || c.centerId !== centerId || c.templateId !== templateId || c.templateVersion !== t.version ||
            c.kind !== 'ACTIVITY_IMAGE' || c.status !== 'QUARANTINED' || c.revokedAt !== null ||
            c.scannerName !== 'ClamAV' || !c.scannerVersion || c.width !== 400 || c.height !== 300 ||
            d.centerId !== centerId || d.templateId !== templateId || d.templateVersion !== t.version ||
            d.state !== 'DRAFT' || d.service !== t.service || d.sourceType !== 'GENERATED' ||
            d.styleVersion !== ILLUSTRATION_STYLE_VERSION || row.slot !== (d.stepNumber ?? 0) ||
            row.slot < 0 || row.slot > 64 || (row.slot > 0 && !t.steps[row.slot - 1]?.trim())) return [];
        try {
          if (generatedReferenceDigest(d.sourceReference) !== c.digestSha256) return [];
          assertGeneratedReferenceScope(d.sourceReference, t.service, d.sceneType);
        } catch { return []; }
        const context: ArtworkContext = {
          candidateId:c.id, centerId, templateId, templateVersion:t.version, slot:row.slot,
          digestSha256:c.digestSha256, draftId:d.id, draftVersion:d.version, service:d.service,
          styleVersion:d.styleVersion, sceneType:d.sceneType, sourceReference:d.sourceReference,
          altText:d.altText, license:d.license, providerTerms:d.providerTerms,
          instruction:row.slot === 0 ? null : t.steps[row.slot - 1],
          activityTitle:t.title, activitySteps:t.steps, activitySafety:t.safety, activityMaterials:t.materials,
        };
        if (!verifiesArtworkApproval(row, context)) return [];
        return [{ stepNumber:row.slot || null, altText:d.altText, width:c.width, height:c.height, candidateId:c.id, draftId:d.id, digestSha256:c.digestSha256 }];
      });

    return rows.length <= 65 ? items : [];
  }

  /** Staff preview only, with a fresh authorization and evidence check per
   * request. Lock in draft -> candidate order, matching revocation/rejection.
   * No public URL or guardian release is minted. */
  async readApprovedArtwork(centerId: string, v: Viewer, templateId: string, version: number, slot: number) {
    if (!Number.isSafeInteger(version) || version < 1 || !Number.isSafeInteger(slot) || slot < 0 || slot > 64)
      throw new UnprocessableEntityException('Invalid illustration version or slot.');
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM activity_template WHERE id=${templateId}::uuid AND center_id=${centerId}::uuid FOR SHARE`;
      const t = await this.authorizedTemplate(tx, centerId, v, templateId);
      const { digestSha256: _digest, ...image } = await this.readVerifiedArtwork(tx,centerId,templateId,t,version,slot);
      return { ...image, staffPreview:true as const, publishEnabled:false as const, clinicalReleaseEnabled:false as const };
    }, { isolationLevel:'ReadCommitted' });
  }


  // Internal use by staff and the existing family-release service ONLY.
  // The latter must first authorize the specific immutable release.
  private async readVerifiedArtwork(tx:Tx,centerId:string,templateId:string,
    t:Awaited<ReturnType<ActivityMediaService['authorizedTemplate']>>,version:number,slot:number,expectedDigest?:string) {
      const unavailable = () => new NotFoundException('Signed illustration unavailable.');
      if (t.version !== version) throw unavailable();
      const [initial] = await this.verifiedArtwork(tx, centerId, templateId, t, slot);
      if (!initial) throw unavailable();
      await tx.$queryRaw`SELECT id FROM activity_media_draft WHERE id=${initial.draftId}::uuid
        AND center_id=${centerId}::uuid AND template_id=${templateId}::uuid FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM private_media_candidate WHERE id=${initial.candidateId}::uuid
        AND center_id=${centerId}::uuid AND template_id=${templateId}::uuid FOR SHARE`;
      const [current] = await this.verifiedArtwork(tx, centerId, templateId, t, slot);
      if (!current || current.candidateId !== initial.candidateId || current.draftId !== initial.draftId ||
          (expectedDigest !== undefined && current.digestSha256 !== expectedDigest)) throw unavailable();
      const stored = await tx.privateMediaCandidate.findFirst({
        where:{ id:current.candidateId, centerId, templateId, templateVersion:version,
          mediaDraftId:current.draftId, kind:'ACTIVITY_IMAGE', status:'QUARANTINED', revokedAt:null,
          digestSha256:current.digestSha256 },
        select:{ encryptedBytes:true,r2CipherSha256:true,r2CipherBytes:true },
      });
      if (!stored) throw unavailable();
      let bytes: Buffer;
      try {
        const remote=stored.r2CipherSha256!=null||stored.r2CipherBytes!=null;
        const encrypted=remote ? await readPrivateR2({centerId,candidateId:current.candidateId,
          digest:stored.r2CipherSha256??'',size:stored.r2CipherBytes??0}) : stored.encryptedBytes;
        if(encrypted.length>MAX_PRIVATE_IMAGE_BYTES+29)throw unavailable();
        bytes = openPrivateData(encrypted,'activity-image-v1',centerId,templateId);
        const receipt = verifyPngCandidate(bytes);
        if (receipt.sha256 !== current.digestSha256 || receipt.width !== current.width || receipt.height !== current.height)
          throw unavailable();
      } catch { throw unavailable(); }
      return { templateVersion:version, stepNumber:current.stepNumber, altText:current.altText,
        width:current.width, height:current.height, pngBase64:bytes.toString('base64'),
        digestSha256:current.digestSha256 };
  }

  /** Compare the entire server-captured activity snapshot before signing a
   * family rendering. A changed or legacy template has no artwork binding. */
  async familyArtworkBindings(tx:Tx,centerId:string,activity:unknown) {
    const a = activity as {templateId?:unknown;snapshot?:Record<string,unknown>}|null;
    const s=a?.snapshot;
    if (!s || typeof a?.templateId!=='string' || s.id!==a.templateId ||
        !/^[a-f0-9-]{36}$/.test(a.templateId) || !Number.isSafeInteger(s.version)) return [];
    const templateId=a.templateId;
    await tx.$queryRaw`SELECT id FROM activity_template WHERE id=${templateId}::uuid AND center_id=${centerId}::uuid FOR SHARE`;
    const t=await tx.activityTemplate.findFirst({where:{id:templateId,centerId}});
    if (!t || s.version!==t.version || s.title!==t.title || s.service!==t.service ||
        s.ageBand!==t.ageBand || s.minutes!==t.minutes ||
        JSON.stringify(s.steps)!==JSON.stringify(t.steps) || JSON.stringify(s.safety)!==JSON.stringify(t.safety) ||
        JSON.stringify(s.materials)!==JSON.stringify(t.materials)) return [];
    const rows=await this.verifiedArtwork(tx,centerId,templateId,t);
    return rows.map(row=>({slot:row.stepNumber??0,digestSha256:row.digestSha256,altText:row.altText,
      instruction:row.stepNumber===null?null:t.steps[row.stepNumber-1]}));
  }

  /** Called only after eligibleRead has authorized the recipient and release.
   * Never substitute newly approved artwork into an existing release. */
  async readFamilyArtwork(tx:Tx,centerId:string,activity:unknown,slot:number,digest:string) {
    const bindings=await this.familyArtworkBindings(tx,centerId,activity);
    if (!bindings.some(b=>b.slot===slot && b.digestSha256===digest)) throw new NotFoundException('Illustration unavailable.');
    const a=activity as {templateId:string;snapshot:{version:number}};
    const t=await tx.activityTemplate.findFirst({where:{id:a.templateId,centerId}});
    if (!t) throw new NotFoundException('Illustration unavailable.');
    return this.readVerifiedArtwork(tx,centerId,a.templateId,t,a.snapshot.version,slot,digest);
  }

  async propose(centerId: string, v: Viewer, templateId: string, dto: ActivityMediaDraftDto) {
    // The service boundary must reject alternate/legacy visual styles even
    // when invoked outside class-validator or by a future internal caller.
    // Existing pre-lock drafts remain readable for audit, not publication.
    if (dto.styleVersion !== ILLUSTRATION_STYLE_VERSION)
      throw new UnprocessableEntityException('Unsupported illustration style version.');
    const lockedDigest = generatedReferenceDigest(dto.sourceReference);
    if (lockedDigest !== null && dto.sourceType !== 'GENERATED')
      throw new UnprocessableEntityException('Locked artwork requires generated source type.');
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
      assertGeneratedReferenceScope(dto.sourceReference,t.service,dto.sceneType);
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

  /** Isolated synthetic CI overrides only this scanner boundary; live callers never can. */
  protected preparePngCandidate(input:unknown,centerId:string,templateId:string) {
    return preparePrivatePng(input,'activity-image-v1',centerId,templateId);
  }

  async uploadCandidate(centerId:string,v:Viewer,templateId:string,draftId:string,pngBase64:string) {
    // Check actor/ownership and exact version BEFORE consuming scanner capacity.
    const prior=await this.prisma.$transaction(async tx=>{
      const template=await this.authorizedTemplate(tx,centerId,v,templateId);
      const draft=await tx.activityMediaDraft.findFirst({where:{
        id:draftId,centerId,templateId,templateVersion:template.version,state:'DRAFT',
      },select:{id:true,templateVersion:true,createdById:true,sourceReference:true}});
      if(!draft)throw new ConflictException('Private image proposal changed. Reload.');
      if(v.role==='THERAPIST'&&draft.createdById!==v.userId)
        throw new ForbiddenException('Only the proposing author may supply the image.');
      return {templateVersion:draft.templateVersion,sourceReference:draft.sourceReference};
    });
    assertGeneratedReferenceBytes(prior.sourceReference,pngBase64);
    const ready=await this.preparePngCandidate(pngBase64,centerId,templateId);
    const row=await this.prisma.$transaction(async tx=>{
      await this.trial.assertWritable(tx,centerId,this.trial.now());
      const template=await this.authorizedTemplate(tx,centerId,v,templateId);
      const draft=await tx.activityMediaDraft.findFirst({where:{
        id:draftId,centerId,templateId,templateVersion:prior.templateVersion,state:'DRAFT',
      },select:{id:true,createdById:true,sourceReference:true}});
      if(!draft || template.version!==prior.templateVersion || draft.sourceReference!==prior.sourceReference)
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

  /**
   * Security-only, destructive revocation of ONE private candidate.
   * Deliberately available while a centre subscription is read-only: a
   * formerly authorized reviewer must not be trapped with unsafe artwork.
   * The transaction reacquires current role/tenant/specialty authority and
   * serializes with upload and whole-draft rejection on the same draft row.
   * No bytes, object key or image read handle is returned.
   */
  async revokeCandidate(centerId: string, v: Viewer, templateId: string,
    draftId: string, candidateId: string) {
    const now = this.trial.now();
    return this.prisma.$transaction(async tx => {
      await this.authorizedTemplate(tx, centerId, v, templateId);
      await tx.$queryRaw`SELECT id FROM activity_media_draft
        WHERE id=${draftId}::uuid AND center_id=${centerId}::uuid
          AND template_id=${templateId}::uuid FOR UPDATE`;
      const draft = await tx.activityMediaDraft.findFirst({
        where: { id: draftId, centerId, templateId },
        select: { id: true, createdById: true },
      });
      if (!draft) throw new NotFoundException('Private draft unavailable.');
      if (v.role === 'THERAPIST' && draft.createdById !== v.userId)
        throw new ForbiddenException('Only the proposing author may revoke private candidates.');
      // updateMany is an atomic scoped compare-and-set. A forged, already
      // revoked, foreign or concurrently rejected candidate all fail closed.
      const changed = await tx.privateMediaCandidate.updateMany({
        where: {
          id: candidateId, centerId, templateId, mediaDraftId: draftId,
          kind: 'ACTIVITY_IMAGE', status: 'QUARANTINED', revokedAt: null,
        },
        data: { status: 'REVOKED', revokedAt: now },
      });
      if (changed.count !== 1)
        throw new ConflictException('Private candidate unavailable or already revoked.');
      await logCenterEvent(tx, centerId, 'media.private_candidate_revoked', now, {
        actorUserId: v.userId, meta: { templateId, mediaDraftId: draftId, candidateId },
      });
      return {
        id: candidateId, status: 'REVOKED' as const,
        readEnabled: false as const, publishEnabled: false as const,
        clinicalReleaseEnabled: false as const,
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
