import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Tx, logCenterEvent } from '../centers/history';
import type { Viewer } from '../common/viewer';
import { assertActor, json } from './governance-core';
import { FamilyApprovalDto, FamilyConsentDto, FamilyGrantChangeDto, FamilyGrantDto } from './family-release.dto';
import { buildFamilyRendering, familyRenderingHash } from './family-release-rendering';
import { decideFamilyRelease, FAMILY_RELEASE_NOTICE } from './family-release-policy';

/**
 * TB-EM-053 owner-approved SYNTHETIC workflow. It never signs real documents,
 * grants production consent, touches the legacy locked clinical release tables,
 * emails a guardian or activates a clinical production capability.
 */
@Injectable()
export class FamilyReleaseService {
  constructor(private readonly prisma: PrismaService) {}

  private async serialRetry<T>(run: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await run(); }
      catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) ||
          !['P2034', 'P2002'].includes(error.code) || attempt === 2) throw error;
      }
    }
    throw new ConflictException('Concurrent update; retry.');
  }

  private async synthetic(tx: Tx, centerId: string) {
    const center = await tx.center.findFirst({ where: { id: centerId, status: 'ACTIVE' },
      select: { syntheticFamilyReleaseEnabled: true } });
    const enabled = process.env.TB_FAMILY_RELEASE_SYNTHETIC === 'true' &&
      !['production', 'staging'].includes(process.env.DEPLOYMENT_ENV ?? '') &&
      center?.syntheticFamilyReleaseEnabled === true;
    if (!enabled) throw new ForbiddenException('Synthetic family release is disabled.');
  }

  private async clinician(tx: Tx, centerId: string, v: Viewer, childId: string, service: string) {
    await assertActor(tx, centerId, v, ['THERAPIST', 'CLINICAL_SUPERVISOR']);
    const child = await tx.child.findFirst({ where: { id: childId, centerId, status: 'ACTIVE' } });
    if (!child) throw new NotFoundException();
    if (v.role === 'THERAPIST') {
      // Lock the actual assignment; a concurrent revocation must not win a release race.
      await tx.$queryRaw`SELECT id FROM care_assignment WHERE center_id=${centerId}::uuid AND child_id=${childId}::uuid AND membership_id=${v.membershipId}::uuid AND service=${service} AND ended_at IS NULL FOR SHARE`;
      if (!await tx.careAssignment.findFirst({ where: { centerId, childId, membershipId: v.membershipId, service, endedAt: null } }))
        throw new ForbiddenException('Active specialty assignment required.');
    }
  }

  private async guardian(tx: Tx, centerId: string, v: Viewer, childId: string, forWithdrawal = false) {
    await assertActor(tx, centerId, v, ['GUARDIAN']);
    const link = await tx.guardianLink.findFirst({ where: { centerId, childId, userId: v.userId,
      removedAt: null, child: { status: 'ACTIVE' } } });
    if (!link || (!forWithdrawal && link.familyReleaseRestriction !== 'CLEAR')) throw new NotFoundException();
    return link;
  }

  private async recipient(tx: Tx, centerId: string, childId: string, guardianLinkId: string) {
    await tx.$queryRaw`SELECT id FROM guardian_link WHERE id=${guardianLinkId}::uuid AND center_id=${centerId}::uuid AND child_id=${childId}::uuid FOR SHARE`;
    const link = await tx.guardianLink.findFirst({ where: { id: guardianLinkId, centerId, childId,
      removedAt: null, familyReleaseRestriction: 'CLEAR', child: { status: 'ACTIVE' } } });
    if (!link?.userId) throw new NotFoundException();
    const member = await tx.membership.findFirst({ where: { centerId, userId: link.userId, status: 'ACTIVE',
      user: { status: 'ACTIVE' }, roles: { some: { role: 'GUARDIAN' } } } });
    if (!member) throw new NotFoundException();
    return link;
  }

  private async consentActive(tx: Tx, centerId: string, childId: string, linkId: string, purpose: string) {
    const latest = await tx.syntheticFamilyConsent.findFirst({ where: { centerId, childId,
      guardianLinkId: linkId, purpose }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    return latest?.status === 'ACTIVE';
  }

  async approve(centerId: string, v: Viewer, dto: FamilyApprovalDto) {
    return this.prisma.$transaction(async tx => {
      await this.synthetic(tx, centerId);
      const s = await tx.governanceSnapshot.findFirst({ where: { id: dto.snapshotId, centerId } });
      if (!s || !['PLAN', 'REPORT'].includes(s.kind)) throw new NotFoundException();
      const content = s.content as Record<string, unknown>;
      const service = content.service;
      if (typeof service !== 'string') throw new UnprocessableEntityException('Specialty not recorded on snapshot.');
      await this.clinician(tx, centerId, v, s.childId, service);
      // Only a clinician-submitted, immutable review snapshot can be approved;
      // a draft preview created without submission cannot be promoted.
      const submitted = await tx.governanceHistory.findFirst({ where: { centerId, childId: s.childId,
        kind: s.kind, documentId: s.documentId, fromStatus: { in: ['DRAFT', 'RETURNED_FOR_REVISION'] },
        toStatus: 'IN_REVIEW' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      if (!submitted || submitted.snapshotId !== s.id)
        throw new ConflictException('Only the latest submitted clinical version can be approved.');
      const latest = s.kind === 'PLAN'
        ? await tx.planVersion.findFirst({ where: { id: s.documentId, centerId, plan: { childId: s.childId } } })
        : await tx.progressReport.findFirst({ where: { id: s.documentId, centerId, childId: s.childId } });
      if (!latest || latest.status !== 'IN_REVIEW') throw new ConflictException('Document is no longer in review.');
      const rendering = buildFamilyRendering(s.kind as 'PLAN' | 'REPORT', content);
      const hash = familyRenderingHash(rendering);
      const purpose = s.kind === 'PLAN' ? 'FAMILY_PLAN' : 'FAMILY_REPORT';
      const existing = await tx.syntheticFamilyApproval.findFirst({ where: { centerId, snapshotId: s.id, renderingHash: hash } });
      if (existing) return { id: existing.id, kind: s.kind, renderingHash: hash, synthetic: true, signed: false };
      const approval = await tx.syntheticFamilyApproval.create({ data: { centerId, childId: s.childId,
        snapshotId: s.id, kind: s.kind, purpose, rendering: json(rendering), renderingHash: hash, approvedById: v.userId } });
      await logCenterEvent(tx, centerId, 'family.synthetic_approved', new Date(), { actorUserId: v.userId,
        meta: { childId: s.childId, snapshotId: s.id, approvalId: approval.id } });
      return { id: approval.id, kind: s.kind, renderingHash: hash, synthetic: true, signed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async consent(centerId: string, v: Viewer, dto: FamilyConsentDto, withdraw: boolean) {
    return this.prisma.$transaction(async tx => {
      await this.synthetic(tx, centerId);
      const link = await this.guardian(tx, centerId, v, dto.childId, withdraw);
      // Serialise amendments on the guardian link. A new grant always sees the
      // latest consent state, including a withdrawal in a concurrent request.
      await tx.$queryRaw`SELECT id FROM guardian_link WHERE id=${link.id}::uuid FOR UPDATE`;
      const row = await tx.syntheticFamilyConsent.create({ data: { centerId, childId: dto.childId,
        guardianLinkId: link.id, purpose: dto.purpose, status: withdraw ? 'REVOKED' : 'ACTIVE',
        actorUserId: v.userId, revokedAt: withdraw ? new Date() : null } });
      if (withdraw) await tx.syntheticFamilyGrant.updateMany({ where: { centerId, childId: dto.childId,
        guardianLinkId: link.id, purpose: dto.purpose, status: 'ACTIVE' },
        data: { status: 'REVOKED', changedById: v.userId, changedAt: new Date() } });
      await logCenterEvent(tx, centerId, withdraw ? 'family.synthetic_consent_withdrawn' : 'family.synthetic_consent_recorded',
        new Date(), { actorUserId: v.userId, meta: { childId: dto.childId, consentId: row.id } });
      return { synthetic: true, purpose: dto.purpose, status: row.status };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async grant(centerId: string, v: Viewer, dto: FamilyGrantDto) {
    return this.serialRetry(() => this.prisma.$transaction(async tx => {
      await this.synthetic(tx, centerId);
      const approval = await tx.syntheticFamilyApproval.findFirst({ where: { id: dto.approvalId, centerId } });
      if (!approval) throw new NotFoundException();
      const snapshot = await tx.governanceSnapshot.findFirst({ where: { id: approval.snapshotId,
        centerId, childId: approval.childId } });
      if (!snapshot) throw new NotFoundException();
      const source = snapshot.kind === 'PLAN'
        ? await tx.planVersion.findFirst({ where: { id: snapshot.documentId, centerId } })
        : await tx.progressReport.findFirst({ where: { id: snapshot.documentId, centerId } });
      if (!source || source.status !== 'IN_REVIEW') throw new ConflictException('Clinical source changed; release requires a current approval.');
      const service = (snapshot.content as Record<string, unknown>).service;
      if (typeof service !== 'string') throw new NotFoundException();
      await this.clinician(tx, centerId, v, approval.childId, service);
      const link = await this.recipient(tx, centerId, approval.childId, dto.guardianLinkId);
      if (!await this.consentActive(tx, centerId, approval.childId, link.id, approval.purpose))
        throw new ForbiddenException('Recipient-specific synthetic consent required.');
      if (familyRenderingHash(approval.rendering as Parameters<typeof familyRenderingHash>[0]) !== approval.renderingHash)
        throw new ConflictException('Family rendering has changed.');
      const current = await tx.syntheticFamilyGrant.findFirst({ where: { centerId, approvalId: approval.id,
        guardianLinkId: link.id } });
      if (current) {
        if (current.status !== 'ACTIVE') throw new ConflictException('A revoked or withdrawn release cannot be reopened.');
        return { id: current.id, synthetic: true, status: current.status };
      }
      const release = await tx.syntheticFamilyGrant.create({ data: { centerId, childId: approval.childId,
        approvalId: approval.id, guardianLinkId: link.id, purpose: approval.purpose, releasedById: v.userId } });
      await logCenterEvent(tx, centerId, 'family.synthetic_released', new Date(), { actorUserId: v.userId,
        meta: { childId: approval.childId, releaseId: release.id, guardianLinkId: link.id } });
      // Notification is capture-only. No contact destination, email, push or token.
      await logCenterEvent(tx, centerId, 'family.synthetic_notice_captured', new Date(), { actorUserId: v.userId,
        meta: { releaseId: release.id, kind: 'FAMILY_DOCUMENT_AVAILABLE' } });
      return { id: release.id, synthetic: true, status: release.status, noticeCaptured: FAMILY_RELEASE_NOTICE };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  }

  async recipients(centerId: string, v: Viewer, approvalId: string) {
    return this.prisma.$transaction(async tx => {
      await this.synthetic(tx, centerId);
      const approval = await tx.syntheticFamilyApproval.findFirst({ where: { id: approvalId, centerId } });
      if (!approval) throw new NotFoundException();
      const snapshot = await tx.governanceSnapshot.findFirst({ where: { id: approval.snapshotId,
        centerId, childId: approval.childId } });
      if (!snapshot) throw new NotFoundException();
      const service = (snapshot.content as Record<string, unknown>).service;
      if (typeof service !== 'string') throw new NotFoundException();
      await this.clinician(tx, centerId, v, approval.childId, service);
      const links = await tx.guardianLink.findMany({ where: { centerId, childId: approval.childId,
        removedAt: null }, select: { id: true, displayName: true, familyReleaseRestriction: true } });
      const items = [];
      for (const g of links) items.push({ id: g.id, displayName: g.displayName,
        eligible: g.familyReleaseRestriction === 'CLEAR' &&
          await this.consentActive(tx, centerId, approval.childId, g.id, approval.purpose) });
      return { synthetic: true, items };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async change(centerId: string, v: Viewer, id: string, dto: FamilyGrantChangeDto) {
    if (!dto.reason?.trim()) throw new UnprocessableEntityException('Reason required.');
    return this.prisma.$transaction(async tx => {
      await this.synthetic(tx, centerId);
      const release = await tx.syntheticFamilyGrant.findFirst({ where: { id, centerId } });
      if (!release) throw new NotFoundException();
      const approval = await tx.syntheticFamilyApproval.findFirst({ where: { id: release.approvalId, centerId } });
      const s = approval && await tx.governanceSnapshot.findFirst({ where: { id: approval.snapshotId, centerId } });
      const service = s && (s.content as Record<string, unknown>).service;
      if (typeof service !== 'string') throw new NotFoundException();
      await this.clinician(tx, centerId, v, release.childId, service);
      const n = await tx.syntheticFamilyGrant.updateMany({ where: { id, centerId, status: 'ACTIVE' },
        data: { status: dto.status, changedById: v.userId, changedAt: new Date() } });
      if (n.count !== 1) throw new ConflictException('Release was already changed.');
      await logCenterEvent(tx, centerId, 'family.synthetic_release_changed', new Date(), { actorUserId: v.userId,
        meta: { childId: release.childId, releaseId: id, status: dto.status, reason: dto.reason.trim() } });
      await logCenterEvent(tx, centerId, 'family.synthetic_notice_captured', new Date(), { actorUserId: v.userId,
        meta: { releaseId: id, kind: 'FAMILY_DOCUMENT_UPDATED' } });
      return { id, status: dto.status, synthetic: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async eligibleRead(tx: Tx, centerId: string, v: Viewer, id: string) {
    await this.synthetic(tx, centerId);
    const release = await tx.syntheticFamilyGrant.findFirst({ where: { id, centerId } });
    if (!release || !['ACTIVE', 'SUPERSEDED'].includes(release.status)) throw new NotFoundException();
    const link = await this.guardian(tx, centerId, v, release.childId);
    if (release.guardianLinkId !== link.id) throw new NotFoundException();
    if (!await this.consentActive(tx, centerId, release.childId, link.id, release.purpose)) throw new NotFoundException();
    const approval = await tx.syntheticFamilyApproval.findFirst({ where: { id: release.approvalId,
      centerId, childId: release.childId, purpose: release.purpose } });
    if (!approval) throw new NotFoundException();
    const snap = await tx.governanceSnapshot.findFirst({ where: { id: approval.snapshotId, centerId,
      childId: release.childId } });
    if (!snap) throw new NotFoundException();
    const source = snap.kind === 'PLAN'
      ? await tx.planVersion.findFirst({ where: { id: snap.documentId, centerId } })
      : await tx.progressReport.findFirst({ where: { id: snap.documentId, centerId } });
    if (!source || (source.status !== 'IN_REVIEW' && !(release.status === 'SUPERSEDED' && source.status === 'SUPERSEDED')))
      throw new NotFoundException();
    const d = decideFamilyRelease({ action: 'READ', deploymentEnvironment: process.env.DEPLOYMENT_ENV,
      syntheticEnvironmentEnabled: process.env.TB_FAMILY_RELEASE_SYNTHETIC === 'true', syntheticCenterEnabled: true,
      actorActive: true, actorClinician: false, actorAssignedToSpecialty: false,
      guardianAuthenticated: true, guardianActive: true, guardianMatchesRecipient: true,
      tenantMatches: true, childMatches: true, guardianRestriction: 'CLEAR', consentCurrent: true,
      consentPurposeMatches: true, safeguardingHold: false, clinicalApprovalCurrent: true,
      approvedRenderingHash: approval.renderingHash,
      servedRenderingHash: familyRenderingHash(approval.rendering as Parameters<typeof familyRenderingHash>[0]),
      grantActive: true, grantVersionMatches: true, documentFamilySafe: true, documentWithdrawn: false });
    if (!d.allowed) throw new NotFoundException();
    return { release, approval };
  }

  async mine(centerId: string, v: Viewer) {
    return this.prisma.$transaction(async tx => {
      await this.synthetic(tx, centerId);
      await assertActor(tx, centerId, v, ['GUARDIAN']);
      const links = await tx.guardianLink.findMany({ where: { centerId, userId: v.userId, removedAt: null,
        familyReleaseRestriction: 'CLEAR', child: { status: 'ACTIVE' } }, select: { id: true } });
      const grants = await tx.syntheticFamilyGrant.findMany({ where: { centerId, guardianLinkId: { in: links.map(x => x.id) },
        status: { in: ['ACTIVE', 'SUPERSEDED'] } }, select: { id: true }, orderBy: { releasedAt: 'desc' } });
      const items: { id: string; kind: string; status: string }[] = [];
      for (const grant of grants) {
        try {
          const { release, approval } = await this.eligibleRead(tx, centerId, v, grant.id);
          items.push({ id: release.id, kind: approval.kind, status: release.status });
        } catch (e) { if (!(e instanceof NotFoundException)) throw e; }
      }
      return { synthetic: true, items };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async read(centerId: string, v: Viewer, id: string) {
    return this.prisma.$transaction(async tx => {
      const { release, approval } = await this.eligibleRead(tx, centerId, v, id);
      await logCenterEvent(tx, centerId, 'family.synthetic_document_read', new Date(), { actorUserId: v.userId,
        meta: { releaseId: id, childId: release.childId } });
      return { id, kind: approval.kind, status: release.status, replaced: release.status === 'SUPERSEDED',
        rendering: approval.rendering, renderingHash: approval.renderingHash, synthetic: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
