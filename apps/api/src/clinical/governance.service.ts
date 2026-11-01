import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrialService } from '../operations/trial.service';
import type { Viewer } from '../operations/children.service';
import { Tx, logCenterEvent } from '../centers/history';
import { ClinicalService } from './clinical.service';
import { ReportsService } from './reports.service';
import { EDITABLE, INTERNAL_NOTICE, assertActor, json, snapshot, transitionHistory } from './governance-core';
import { TransferDraftDto, TransitionDto, HandoverProposalDto } from './governance.dto';

@Injectable()
export class GovernanceService {
  constructor(private readonly prisma: PrismaService, private readonly trial: TrialService, private readonly clinical: ClinicalService, private readonly reports: ReportsService) {}

  private async lockChildScope(tx: Tx, centerId: string, v: Viewer, childId: string) {
    await tx.$queryRaw`SELECT id FROM child WHERE id=${childId}::uuid AND center_id=${centerId}::uuid FOR SHARE`;
    if (v.role === 'THERAPIST') await tx.$queryRaw`SELECT id FROM care_assignment WHERE center_id=${centerId}::uuid AND child_id=${childId}::uuid AND membership_id=${v.membershipId}::uuid FOR SHARE`;
  }

  private async document(tx: Tx, centerId: string, v: Viewer, kind: string, id: string) {
    if (!['PLAN','REPORT'].includes(kind)) throw new NotFoundException();
    if (kind === 'PLAN') {
      const x = await tx.planVersion.findFirst({ where: { id, centerId, plan: { centerId } }, include: { plan: true } });
      if (!x) throw new NotFoundException();
      await this.lockChildScope(tx, centerId, v, x.plan.childId);
      try {
        await this.clinical.child(tx, centerId, v, x.plan.childId, x.plan.service);
      } catch (error) {
        if (error instanceof NotFoundException) throw new NotFoundException();
        throw error;
      }
      return { kind: 'PLAN' as const, documentId: x.id, childId: x.plan.childId, service: x.plan.service, sourceVersion: x.version, status: x.status, authorId: x.authorId, title: x.plan.title, content: { title: x.plan.title, number: x.number, summary: x.summary, goals: x.goals, homeActivities: x.homeActivities }, notes: x.reviewNotes };
    }
    const r = await tx.progressReport.findFirst({ where: { id, centerId } });
    if (!r) throw new NotFoundException();
    await this.lockChildScope(tx, centerId, v, r.childId);
    try {
      await this.clinical.child(tx, centerId, v, r.childId, r.service);
    } catch (error) {
      if (error instanceof NotFoundException) throw new NotFoundException();
      throw error;
    }
    const owner = await tx.membership.findUniqueOrThrow({ where: { id: r.membershipId } });
    return { kind: 'REPORT' as const, documentId: r.id, childId: r.childId, service: r.service, sourceVersion: r.version, status: r.status, authorId: owner.userId, title: r.title, content: { title: r.title, sections: r.sections, periodStart: r.periodStart, periodEnd: r.periodEnd }, notes: r.reviewNotes };
  }

  private async freeze(tx: Tx, centerId: string, v: Viewer, d: Awaited<ReturnType<GovernanceService['document']>>, now: Date) {
    const submitted = d.status === 'IN_REVIEW' ? await tx.governanceHistory.findFirst({ where: { centerId, kind: d.kind, documentId: d.documentId, toStatus: 'IN_REVIEW', fromStatus: { in: EDITABLE } }, orderBy: { sourceVersion: 'desc' } }) : null;
    if (submitted) {
      const bound = await tx.governanceSnapshot.findUniqueOrThrow({ where: { id: submitted.snapshotId } });
      return snapshot(tx, { centerId, childId: d.childId, kind: d.kind, documentId: d.documentId, sourceVersion: d.sourceVersion, authorId: d.authorId, content: bound.content, evidence: bound.evidence }, v.userId, now);
    }
    const child = await tx.child.findUniqueOrThrow({ where: { id: d.childId } });
    let evidence: unknown;
    if (d.kind === 'REPORT') {
      const r = await tx.progressReport.findUniqueOrThrow({ where: { id: d.documentId } });
      evidence = await this.reports.evidence(tx, centerId, d.childId, r.service, r.periodStart, r.periodEnd);
    } else {
      const [observations, templates] = await Promise.all([
        tx.observation.findMany({ where: { centerId, childId: d.childId, planVersionId: d.documentId }, orderBy: [{ observedOn: 'asc' }, { id: 'asc' }] }),
        tx.activityTemplate.findMany({ where: { id: { in: (d.content.homeActivities as { templateId: string }[]).map(a => a.templateId) }, OR: [{ centerId }, { centerId: null }] }, orderBy: { id: 'asc' } }),
      ]);
      evidence = { planVersionId: d.documentId, observations, templates };
    }
    return snapshot(tx, { centerId, childId: d.childId, kind: d.kind, documentId: d.documentId, sourceVersion: d.sourceVersion, authorId: d.authorId, content: { ...d.content, child: { id: child.id, name: `${child.preferredName ?? child.firstName} ${child.lastName}` }, service: d.service, notice: INTERNAL_NOTICE }, evidence }, v.userId, now);
  }

  async transition(centerId: string, v: Viewer, kind: string, id: string, dto: TransitionDto) {
    const now = this.trial.now();
    if (!dto.reason.trim()) throw new UnprocessableEntityException('An explicit reason is required.');
    return this.prisma.$transaction(async tx => {
      await this.trial.assertWritable(tx, centerId, now);
      await assertActor(tx, centerId, v, ['THERAPIST','CLINICAL_SUPERVISOR']);
      const d = await this.document(tx, centerId, v, kind, id);
      if (d.sourceVersion !== dto.version) throw new ConflictException({ code: 'VERSION_CONFLICT', message: 'Document version conflict. Reload before continuing.' });
      const review = ['RETURN','COMMENT'].includes(dto.action);
      if (review ? v.role !== 'CLINICAL_SUPERVISOR' : v.role !== 'THERAPIST' || d.authorId !== v.userId) throw new ForbiddenException('Only the author or an explicitly authorized reviewer can perform this action.');
      let to = d.status;
      if (dto.action === 'SUBMIT' && EDITABLE.includes(d.status)) to = 'IN_REVIEW';
      else if (dto.action === 'RETURN' && d.status === 'IN_REVIEW') to = 'RETURNED_FOR_REVISION';
      else if (dto.action === 'COMMENT' && d.status === 'IN_REVIEW') to = 'IN_REVIEW';
      else if (dto.action === 'WITHDRAW' && d.status === 'IN_REVIEW') to = 'WITHDRAWN';
      else if (dto.action === 'FREEZE' && EDITABLE.includes(d.status)) to = 'FROZEN_INTERNAL';
      else if (dto.action === 'REOPEN' && d.status === 'WITHDRAWN' && d.kind === 'REPORT') to = 'DRAFT';
      else throw new ConflictException({
        code: d.kind === 'REPORT' ? 'INVALID_REPORT_STATUS' : 'INVALID_PLAN_STATUS',
        message: dto.action === 'SUBMIT'
          ? 'Only DRAFT or RETURNED_FOR_REVISION documents can be submitted for review.'
          : 'This transition is not available from the current document status.',
      });
      if (dto.action === 'SUBMIT') {
        if (d.kind === 'PLAN' && !(d.content.goals as unknown[]).length) throw new UnprocessableEntityException('Add at least one goal before review.');
        if (d.kind === 'REPORT' && !((d.content.sections as Record<string,string>).summary ?? '').trim()) throw new UnprocessableEntityException('Write the clinician summary before review.');
        if (d.kind === 'REPORT') {
          // The last SAVED/CREATED evidence snapshot represents what the author
          // reviewed. A plan withdrawn since that snapshot must not silently
          // disappear when we rebuild evidence at submit time. Require the
          // clinician to save a new snapshot and explicitly review the change.
          const last = await tx.reportVersion.findFirst({
            where: { centerId, reportId: id }, orderBy: { number: 'desc' }, select: { evidence: true },
          });
          const saved = last?.evidence as { plan?: { versionId?: unknown } | null;
            plans?: { versionId?: unknown }[] } | undefined;
          const ids = [saved?.plan?.versionId, ...(Array.isArray(saved?.plans) ? saved.plans.map(p => p?.versionId) : [])]
            .filter((value): value is string => typeof value === 'string' &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
          if (ids.length && await tx.planVersion.count({
            where: { id: { in: [...new Set(ids)] }, centerId, status: 'WITHDRAWN',
              plan: { centerId, childId: d.childId, service: d.service } },
          })) throw new ConflictException({ code: 'PLAN_VERSION_WITHDRAWN',
            message: 'A source plan version was withdrawn after this report evidence was saved. Review and save a new report version before submission.' });
        }
      }
      // Preserve the exact content and evidence BEFORE changing its state.
      const s = await this.freeze(tx, centerId, v, d, now);
      const actor = await tx.user.findUniqueOrThrow({ where: { id: v.userId }, select: { displayName: true } });
      const notes = review ? json([...(d.notes as object[]), { by: v.userId, byName: actor.displayName, at: now.toISOString(), comment: dto.reason.trim(), kind: dto.action === 'RETURN' ? 'returned' : 'comment' }]) : undefined;
      const data = { status: to, version: { increment: 1 }, updatedAt: now, ...(notes ? { reviewNotes: notes } : {}) };
      const n = d.kind === 'PLAN' ? await tx.planVersion.updateMany({ where: { id, centerId, version: dto.version, status: d.status }, data }) : await tx.progressReport.updateMany({ where: { id, centerId, version: dto.version, status: d.status }, data });
      if (n.count !== 1) throw new ConflictException({ code: 'VERSION_CONFLICT', message: 'Document version conflict. Reload before continuing.' });
      await transitionHistory(tx, s, d.status, to, dto.reason.trim(), v.userId, now);
      const event = dto.action === 'SUBMIT' ? 'submitted' : dto.action === 'RETURN' ? 'returned' : dto.action === 'COMMENT' ? 'commented' : dto.action.toLowerCase();
      await logCenterEvent(tx, centerId, `clinical.${d.kind.toLowerCase()}_${event}`, now, { actorUserId: v.userId, meta: { childId: d.childId, documentId: id, snapshotId: s.id, from: d.status, to } });
      // Preserve the existing report version browser as well as the shared snapshot history.
      let number: number | undefined;
      if (d.kind === 'REPORT' && dto.action === 'SUBMIT') {
        const last = await tx.reportVersion.aggregate({ where: { reportId: id }, _max: { number: true } });
        number = (last._max.number ?? 0) + 1;
        const decisionIds = await tx.reportSuggestionDecision.findMany({
          where: { centerId, reportId: id, action: 'APPLIED' },
          select: { id: true }, orderBy: { createdAt: 'asc' },
        });
        // ReportVersion itself is immutable; bind the exact applied ledger
        // decisions present at submission time, not later same-text decisions.
        const storedEvidence = s.evidence as Record<string, unknown>;
        await tx.reportVersion.create({ data: { centerId, reportId: id,
          number: (last._max.number ?? 0) + 1, kind: 'SUBMITTED',
          sections: json(d.content.sections),
          evidence: json({ ...storedEvidence, statementDecisionIds: decisionIds.map(d => d.id) }),
          authorId: v.userId, createdAt: now } });
      }
      return { ...(number ? { number } : {}), status: to, version: dto.version + 1, snapshotId: s.id, notice: INTERNAL_NOTICE };
    });
  }

  async documents(centerId: string, v: Viewer) {
    return this.prisma.$transaction(async tx => {
      await assertActor(tx, centerId, v, ['THERAPIST','CLINICAL_SUPERVISOR']);
      const assignments = v.role === 'THERAPIST' ? await this.clinical.therapistAssignments(tx, centerId, v) : null;
      const scope = assignments ? { OR: assignments.length
        ? assignments.map(a => ({ childId: a.childId, service: a.service }))
        : [{ childId: '00000000-0000-0000-0000-000000000000' }] } : {};
      const plans = await tx.planVersion.findMany({ where: { centerId, plan: { centerId, ...scope } }, include: { plan: true }, orderBy: { updatedAt: 'desc' } });
      const reports = await tx.progressReport.findMany({ where: { centerId, ...scope }, orderBy: { updatedAt: 'desc' } });
      const authors = await tx.user.findMany({ where: { OR: [{ id: { in: plans.map(p => p.authorId) } }, { memberships: { some: { id: { in: reports.map(r => r.membershipId) } } } }] }, select: { id: true, displayName: true, memberships: { where: { centerId }, select: { id: true } } } });
      const children = await tx.child.findMany({ where: { centerId, status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true, preferredName: true } });
      const active = new Set(children.map(c => c.id));
      return { notice: INTERNAL_NOTICE, items: [...plans.map(x => ({ kind: 'PLAN', id: x.id, title: x.plan.title, authorName: authors.find(a => a.id === x.authorId)?.displayName ?? 'Staff member', childId: x.plan.childId, status: x.status, version: x.version, mine: x.authorId === v.userId })), ...reports.map(x => ({ kind: 'REPORT', id: x.id, title: x.title, authorName: authors.find(a => a.memberships.some(m => m.id === x.membershipId))?.displayName ?? 'Staff member', childId: x.childId, status: x.status, version: x.version, mine: assignments ? assignments.some(a => a.membershipId === x.membershipId) : false }))].filter(x => active.has(x.childId)).map(x => ({ ...x, childName: children.filter(c => c.id === x.childId).map(c => `${c.preferredName ?? c.firstName} ${c.lastName}`)[0] })) };
    });
  }

  async history(centerId: string, v: Viewer, kind: string, id: string) {
    return this.prisma.$transaction(async tx => {
      await assertActor(tx, centerId, v, ['THERAPIST','CLINICAL_SUPERVISOR']);
      await this.document(tx, centerId, v, kind, id);
      const items = await tx.governanceHistory.findMany({ where: { centerId, kind, documentId: id }, orderBy: { sourceVersion: 'desc' } });
      const actors = await tx.user.findMany({ where: { id: { in: items.map(i => i.actorId) } }, select: { id: true, displayName: true } });
      return { items: items.map(i => ({ ...i, actorName: actors.find(a => a.id === i.actorId)?.displayName ?? 'Staff member' })) };
    });
  }

  async preview(centerId: string, v: Viewer, id: string) {
    return this.prisma.$transaction(async tx => {
      await assertActor(tx, centerId, v, ['THERAPIST','CLINICAL_SUPERVISOR']);
      const s = await tx.governanceSnapshot.findFirst({ where: { id, centerId } });
      if (!s) throw new NotFoundException();
      await this.document(tx, centerId, v, s.kind, s.documentId);
      await logCenterEvent(tx, centerId, 'clinical.preview_viewed', this.trial.now(), { actorUserId: v.userId, meta: { childId: s.childId, snapshotId: id } });
      return { ...s, notice: INTERNAL_NOTICE, approved: false, signed: false, released: false };
    });
  }

  // Compatibility format: each request creates a new identified immutable artifact; it never re-renders an old ID.
  async capturePreview(centerId: string, v: Viewer, kind: string, id: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM center WHERE id=${centerId}::uuid FOR NO KEY UPDATE`;
      await assertActor(tx, centerId, v, ['THERAPIST','CLINICAL_SUPERVISOR']);
      const d = await this.document(tx, centerId, v, kind, id);
      const s = await this.freeze(tx, centerId, v, d, this.trial.now());
      await logCenterEvent(tx, centerId, 'clinical.preview_generated', this.trial.now(), { actorUserId: v.userId, meta: { childId: d.childId, snapshotId: s.id } });
      const content = s.content as Record<string, any>;
      const evidence = s.evidence as Record<string, any>;
      const base = { preview: true, released: false, locked: INTERNAL_NOTICE, notice: INTERNAL_NOTICE, snapshotId: s.id, fingerprint: s.fingerprint, generatedAt: s.createdAt, sourceVersion: s.sourceVersion };
      if (kind === 'PLAN') return { ...base, activities: content.homeActivities.map((a: any) => ({
        ...a,
        // Plan-version-bound snapshot takes precedence over a subsequently
        // edited template. Older unsnapshotted versions retain legacy evidence.
        template: a.snapshot ?? evidence.templates.find((t: any) => t.id === a.templateId) ?? null,
      })) };
      return { ...base, childName: content.child.name.split(' ')[0], service: content.service, period: evidence.period, message: content.sections.familySummary ?? '', goals: evidence.goals.map((g: any) => ({ title: g.title, measure: g.measure, baseline: g.baseline, target: g.target, status: g.status, points: g.points.map((p: any) => ({ date: p.date, value: p.value })) })) };
    });
  }

  async access(centerId: string, v: Viewer) {
    return this.prisma.$transaction(async tx => {
      await assertActor(tx, centerId, v, ['CENTER_ADMIN','COORDINATOR']);
      const children = await tx.child.findMany({ where: { centerId }, select: { id: true, firstName: true, lastName: true, status: true, guardians: { select: { id: true, displayName: true, relationship: true, userId: true, removedAt: true, createdAt: true } } } });
      const guardianMembers = new Set((await tx.membership.findMany({ where: { centerId, status: 'ACTIVE', user: { status: 'ACTIVE' }, roles: { some: { role: 'GUARDIAN' } } }, select: { userId: true } })).map(m => m.userId));
      const invitations = await tx.invitation.findMany({ where: { centerId, kind: 'GUARDIAN' }, select: { id: true, guardianLinkId: true, displayName: true, status: true, expiresAt: true, revokedAt: true } });
      const policies = await tx.consentPolicyDraft.findMany({ where: { centerId }, orderBy: { number: 'desc' } });
      const records = await tx.consentRecordDraft.findMany({ where: { centerId }, orderBy: { createdAt: 'desc' } });
      const events = await tx.centerEvent.findMany({ where: { centerId, type: { not: { startsWith: 'clinical.' } } }, orderBy: { id: 'desc' }, take: 100, select: { id: true, type: true, createdAt: true, actorUserId: true } });
      const transfers = await tx.caseloadTransferDraft.findMany({ where: { centerId, status: 'SIMULATION_ONLY' }, orderBy: { createdAt: 'desc' } });
      const staff = await tx.membership.findMany({ where: { centerId, status: 'ACTIVE', roles: { some: { role: 'THERAPIST' } } }, select: { id: true, user: { select: { displayName: true } } } });
      const assignments = await tx.careAssignment.findMany({ where: { centerId, endedAt: null }, select: { childId: true, membershipId: true, service: true } });
      return { synthetic: true, clinicalRelease: false, consentGrant: false, media: false, ai: false, recording: false, children: children.map(c => ({ ...c, guardians: c.guardians.map(g => ({ ...g, capabilities: c.status !== 'ACTIVE' || g.removedAt || !g.userId || !guardianMembers.has(g.userId) ? [] : ['synthetic_samples','operational_portal'], restrictions: 'Awaiting D4: no custody policy inferred', releaseReadiness: 'BLOCKED_POLICY' })) })), invitations: invitations.map(i => ({ ...i, status: i.status === 'PENDING' && i.expiresAt <= this.trial.now() ? 'EXPIRED' : i.status })), policies, records, events: events.map(e => ({ ...e, id: String(e.id) })), transfers, staff, assignments, blockers: ['D1','D4','D7','D-NEW-3','D-NEW-5','OR-15','OR-16'] };
    });
  }

  // TB-EM-049 preliminary operational handover: intentionally no permission
  // grant, clinical-document access, assignment mutation or automatic completion.
  // Uses a separate status namespace from legacy SIMULATION_ONLY drafts.
  private handoverEnabled() {
    return process.env.HANDOVER_DEMO === 'true' &&
      !['production', 'staging'].includes(process.env.DEPLOYMENT_ENV ?? '');
  }
  private assertHandoverDemo() {
    if (!this.handoverEnabled()) throw new ForbiddenException('Synthetic operational handover is disabled.');
  }
  private handoverView(d: { id: string; centerId: string; childId: string; fromMembershipId: string;
    toMembershipId: string; service: string; reason: string; status: string; createdAt: Date; version: number },
    manager: boolean) {
    return { id: d.id, service: d.service, reasonCode: d.reason, status: d.status, version: d.version,
      createdAt: d.createdAt, ...(manager ? { childId: d.childId,
        fromMembershipId: d.fromMembershipId, toMembershipId: d.toMembershipId } : {}),
      synthetic: true, accessGranted: false, assignmentChanged: false,
      clinicalHandover: false, released: false };
  }

  async handovers(centerId: string, v: Viewer, query: { childId?: string; cancelledOffset?: string } = {}) {
    const manager = ['CENTER_ADMIN','COORDINATOR'].includes(v.role);
    if (!manager && v.role !== 'THERAPIST') throw new ForbiddenException();
    // Child-scoped history is manager-only. In particular, never let the incoming
    // therapist supply or infer a child identifier through this route.
    if (!manager && (query.childId !== undefined || query.cancelledOffset !== undefined)) throw new ForbiddenException();
    if (query.childId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.childId))
      throw new BadRequestException('Invalid child identifier.');
    if (query.cancelledOffset !== undefined && !/^(0|[1-9][0-9]{0,6})$/.test(query.cancelledOffset))
      throw new BadRequestException('Invalid history offset.');
    const cancelledOffset = Number(query.cancelledOffset ?? 0);
    if (!this.handoverEnabled()) return { enabled: false, synthetic: true, items: [], nextCancelledOffset: null };
    const actor = await this.prisma.membership.findFirst({
      where: { id: v.membershipId, centerId, userId: v.userId, status: 'ACTIVE',
        user: { status: 'ACTIVE' }, center: { status: 'ACTIVE' },
        roles: { some: { role: v.role } } },
    });
    if (!actor) throw new ForbiddenException('Active membership required.');
    // All actionable proposals must remain accessible, even after >100 cancellations.
    const scope = { centerId, ...(!manager ? { toMembershipId: v.membershipId } : {}),
      ...(manager && query.childId ? { childId: query.childId } : {}) };
    const [active, cancelled] = await Promise.all([
      this.prisma.caseloadTransferDraft.findMany({
        where: { ...scope, status: { in: ['PENDING_ACK','ACKNOWLEDGED'] } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.caseloadTransferDraft.findMany({
        where: { ...scope, status: 'CANCELLED' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: cancelledOffset, take: 101,
      }),
    ]);
    const rows = [...active, ...cancelled.slice(0, 100)];
    return { enabled: true, synthetic: true, items: rows.map(row => this.handoverView(row, manager)),
      nextCancelledOffset: cancelled.length > 100 ? cancelledOffset + 100 : null };
  }

  // TB-EM-050: manager-only, read-only operational snapshot. It is NEVER an
  // authorization decision, a future approval token or a transfer capability.
  async handoverReadiness(centerId: string, v: Viewer, id: string) {
    this.assertHandoverDemo();
    if (!['CENTER_ADMIN','COORDINATOR'].includes(v.role)) throw new ForbiddenException();
    // Advisory GET only: use lock-free, short-lived reads so the readiness
    // checklist cannot pin a transaction or block legitimate staff edits.
    // The AccessGuard checks the permission; this fresh DB lookup revalidates
    // current center membership, user state and the active manager role.
    const actor = await this.prisma.membership.findFirst({
      where: { id: v.membershipId, centerId, userId: v.userId, status: 'ACTIVE',
        user: { status: 'ACTIVE' }, center: { status: 'ACTIVE' },
        roles: { some: { role: v.role } } },
      select: { id: true },
    });
    if (!actor) throw new ForbiddenException('Your workspace access has changed.');
    const draft = await this.prisma.caseloadTransferDraft.findFirst({
      where: { id, centerId, status: { in: ['PENDING_ACK','ACKNOWLEDGED','CANCELLED'] } },
    });
    if (!draft) throw new NotFoundException('Operational handover proposal not found.');
    const [child, source, recipient] = await Promise.all([
      this.prisma.child.findFirst({ where: { id: draft.childId, centerId },
        select: { status: true, services: true } }),
      this.prisma.careAssignment.findFirst({ where: { centerId, childId: draft.childId,
        membershipId: draft.fromMembershipId, service: draft.service, endedAt: null },
        select: { id: true } }),
      this.prisma.membership.findFirst({ where: { id: draft.toMembershipId, centerId,
        status: 'ACTIVE', user: { status: 'ACTIVE' }, roles: { some: { role: 'THERAPIST' } } },
        select: { specialties: true } }),
    ]);
    const checks = [
      { code: 'PROPOSAL_OPEN', met: draft.status !== 'CANCELLED',
        label: 'Operational proposal remains open' },
      { code: 'INCOMING_RECEIPT', met: draft.status === 'ACKNOWLEDGED',
        label: 'Incoming therapist acknowledged receipt (not access)' },
      { code: 'CHILD_SERVICE_ACTIVE', met: child?.status === 'ACTIVE' &&
        !!child.services.includes(draft.service), label: 'Child and requested service remain active' },
      { code: 'SOURCE_ASSIGNMENT_ACTIVE', met: !!source, label: 'Existing therapist assignment remains active' },
      { code: 'RECIPIENT_QUALIFIED', met: !!recipient &&
        recipient.specialties.includes(draft.service), label: 'Incoming therapist remains active and specialty-qualified' },
      // No signed authorization or approved consent/clinical handover policy
      // currently exists. These blockers MUST NOT be inferred from snapshots,
      // acknowledgement, administrator role or legacy simulated consent drafts.
      { code: 'SIGNED_CLINICAL_AUTHORIZATION', met: false,
        label: 'Signed clinical authorization policy is not available' },
      { code: 'PURPOSE_SPECIFIC_CONSENT', met: false,
        label: 'Approved purpose-specific consent authorization is not available' },
      { code: 'CLINICAL_HANDOVER_SCOPE', met: false,
        label: 'Clinically approved transfer scope and receiving acceptance are not available' },
    ];
    return { proposalId: draft.id, childId: draft.childId, service: draft.service,
        checkedAt: new Date().toISOString(),
        status: draft.status, synthetic: true, readonly: true, readyForTransfer: false,
        assignmentChanged: false, accessGranted: false, clinicalHandover: false, released: false,
        checks };
  }

  async proposeHandover(centerId: string, v: Viewer, dto: HandoverProposalDto) {
    this.assertHandoverDemo();
    if (!['CENTER_ADMIN','COORDINATOR'].includes(v.role)) throw new ForbiddenException();
    const now = this.trial.now();
    return this.prisma.$transaction(async tx => {
      // Center FOR UPDATE serializes proposal dedupe and staff/assignment edits.
      await this.trial.assertWritable(tx, centerId, now);
      await assertActor(tx, centerId, v, ['CENTER_ADMIN','COORDINATOR']);
      const child = await tx.child.findFirst({ where: { centerId, id: dto.childId, status: 'ACTIVE' } });
      if (!child || !child.services.includes(dto.service)) throw new NotFoundException('Active service not found.');
      const from = await tx.careAssignment.findFirst({ where: { centerId,
        childId: dto.childId, membershipId: dto.fromMembershipId,
        service: dto.service, endedAt: null } });
      if (!from) throw new NotFoundException('Current assignment not found.');
      if (dto.fromMembershipId === dto.toMembershipId)
        throw new UnprocessableEntityException('Choose different therapists.');
      const incoming = await tx.membership.findFirst({
        where: { id: dto.toMembershipId, centerId, status: 'ACTIVE',
          user: { status: 'ACTIVE' }, roles: { some: { role: 'THERAPIST' } } },
      });
      if (!incoming || !incoming.specialties.includes(dto.service))
        throw new UnprocessableEntityException('Incoming therapist is not active for this service.');
      const existing = await tx.caseloadTransferDraft.findFirst({ where: {
        centerId, childId: dto.childId, fromMembershipId: dto.fromMembershipId,
        service: dto.service, status: { in: ['PENDING_ACK','ACKNOWLEDGED'] },
      } });
      if (existing) throw new ConflictException('A proposed handover is already open for this assignment.');
      const draft = await tx.caseloadTransferDraft.create({ data: {
        centerId, childId: dto.childId, fromMembershipId: dto.fromMembershipId,
        toMembershipId: dto.toMembershipId, service: dto.service,
        reason: dto.reasonCode, status: 'PENDING_ACK', createdById: v.userId, createdAt: now,
      } });
      await logCenterEvent(tx, centerId, 'handover.proposed', now, { actorUserId: v.userId,
        meta: { handoverId: draft.id, childId: dto.childId, service: dto.service, synthetic: true } });
      return this.handoverView(draft, true);
    });
  }

  async acknowledgeHandover(centerId: string, v: Viewer, id: string) {
    this.assertHandoverDemo();
    if (v.role !== 'THERAPIST') throw new ForbiddenException();
    const now = this.trial.now();
    return this.prisma.$transaction(async tx => {
      await this.trial.assertWritable(tx, centerId, now);
      await assertActor(tx, centerId, v, ['THERAPIST']);
      // Serialize against role/specialty revocation (including self-profile edits).
      // Same center -> membership -> assignment lock order as home-plan responses.
      const targetLock = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM membership WHERE id = ${v.membershipId}::uuid
          AND center_id = ${centerId}::uuid FOR UPDATE
      `;
      if (!targetLock.length) throw new NotFoundException('Incoming therapist not found.');
      const draft = await tx.caseloadTransferDraft.findFirst({ where: {
        id, centerId, toMembershipId: v.membershipId, status: 'PENDING_ACK',
      } });
      if (!draft) throw new NotFoundException('Pending handover not found.');
      // Direct row locks defend against writers which do not take the center lock.
      const assignmentLock = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM care_assignment WHERE center_id = ${centerId}::uuid
          AND child_id = ${draft.childId}::uuid
          AND membership_id = ${draft.fromMembershipId}::uuid
          AND service = ${draft.service} AND ended_at IS NULL FOR UPDATE
      `;
      if (!assignmentLock.length)
        throw new ConflictException('Source assignment ended; ask the care coordinator.');
      const target = await tx.membership.findFirst({ where: {
        id: v.membershipId, centerId, status: 'ACTIVE', roles: { some: { role: 'THERAPIST' } },
        user: { status: 'ACTIVE' }, specialties: { has: draft.service },
      } });
      const from = await tx.careAssignment.findFirst({ where: {
        centerId, childId: draft.childId, membershipId: draft.fromMembershipId,
        service: draft.service, endedAt: null, child: { status: 'ACTIVE' },
      } });
      if (!target || !from) throw new ConflictException('Therapist or source assignment changed; ask the care coordinator.');
      const updated = await tx.caseloadTransferDraft.updateMany({
        where: { id, centerId, toMembershipId: v.membershipId, status: 'PENDING_ACK', version: draft.version },
        data: { status: 'ACKNOWLEDGED', version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ConflictException('Handover changed; refresh.');
      await logCenterEvent(tx, centerId, 'handover.operational_acknowledged', now, {
        actorUserId: v.userId, meta: { handoverId: id, service: draft.service, synthetic: true } });
      return this.handoverView({ ...draft, status: 'ACKNOWLEDGED', version: draft.version + 1 }, false);
    });
  }

  async cancelHandover(centerId: string, v: Viewer, id: string) {
    this.assertHandoverDemo();
    if (!['CENTER_ADMIN','COORDINATOR'].includes(v.role)) throw new ForbiddenException();
    const now = this.trial.now();
    return this.prisma.$transaction(async tx => {
      await this.trial.assertWritable(tx, centerId, now);
      await assertActor(tx, centerId, v, ['CENTER_ADMIN','COORDINATOR']);
      const draft = await tx.caseloadTransferDraft.findFirst({ where: {
        id, centerId, status: { in: ['PENDING_ACK','ACKNOWLEDGED'] },
      } });
      if (!draft) throw new NotFoundException('Open handover not found.');
      const cancelled = await tx.caseloadTransferDraft.updateMany({
        where: { id, centerId, status: { in: ['PENDING_ACK','ACKNOWLEDGED'] }, version: draft.version },
        data: { status: 'CANCELLED', version: { increment: 1 } },
      });
      if (cancelled.count !== 1) throw new ConflictException('Handover changed; refresh.');
      await logCenterEvent(tx, centerId, 'handover.cancelled', now, { actorUserId: v.userId,
        meta: { handoverId: id, childId: draft.childId, synthetic: true } });
      return this.handoverView({ ...draft, status: 'CANCELLED', version: draft.version + 1 }, true);
    });
  }


  // TB-EM-052: synthetic-only integration path. Explicitly non-production and
  // restricted to centers whose slug identifies a disposable synthetic fixture.
  // This never constitutes clinical authorization, guardian notification or signoff.
  private async requireSyntheticTransferCenter(tx: Tx, centerId: string) {
    if (!this.handoverEnabled() || process.env.TB_TRANSFER_SYNTHETIC_EXECUTE !== 'true')
      throw new ForbiddenException('Synthetic transfer execution is disabled.');
    const center = await tx.center.findFirst({ where: { id: centerId, status: 'ACTIVE' },
      select: { slug: true } });
    if (!center?.slug.startsWith('synthetic-'))
      throw new ForbiddenException('Synthetic transfer is restricted to synthetic fixture centers.');
  }

  private async checkCleanSyntheticAssignment(tx: Tx, centerId: string, childId: string, service: string) {
    // Until clinical dispositions, safeguarding and D7 are signed, no transfer
    // can proceed if there is ANY related patient/guardian/clinical work.
    const [guardians, notes, reports, plans, appointments, threads] = await Promise.all([
      tx.guardianLink.count({ where: { centerId, childId } }),
      tx.sessionNote.count({ where: { centerId, childId, service } }),
      tx.progressReport.count({ where: { centerId, childId, service } }),
      tx.therapyPlan.count({ where: { centerId, childId, service } }),
      tx.appointment.count({ where: { centerId, childId, service } }),
      tx.messageThread.count({ where: { centerId, childId, OR: [{ service }, { service: null }] } }),
    ]);
    if (guardians + notes + reports + plans + appointments + threads > 0)
      throw new ConflictException('Clinical, guardian, message or scheduling dispositions are not authorized.');
  }

  async approveSyntheticHandover(centerId: string, v: Viewer, id: string, version: number) {
    if (v.role !== 'CLINICAL_SUPERVISOR') throw new ForbiddenException();
    const now = this.trial.now();
    return this.prisma.$transaction(async tx => {
      await this.trial.assertWritable(tx, centerId, now);
      await this.requireSyntheticTransferCenter(tx, centerId);
      await assertActor(tx, centerId, v, ['CLINICAL_SUPERVISOR']);
      const draft = await tx.caseloadTransferDraft.findFirst({
        where: { id, centerId, status: 'ACKNOWLEDGED', version },
      });
      if (!draft) throw new ConflictException('Handover approval version or status changed.');
      await this.checkCleanSyntheticAssignment(tx, centerId, draft.childId, draft.service);
      const active = await tx.careAssignment.findFirst({ where: {
        centerId, childId: draft.childId, service: draft.service,
        membershipId: draft.fromMembershipId, endedAt: null,
        child: { status: 'ACTIVE' },
      } });
      const target = await tx.membership.findFirst({ where: {
        id: draft.toMembershipId, centerId, status: 'ACTIVE',
        user: { status: 'ACTIVE' }, specialties: { has: draft.service },
        roles: { some: { role: 'THERAPIST' } },
      } });
      if (!active || !target) throw new ConflictException('Assignment or therapist scope changed.');
      const updated = await tx.caseloadTransferDraft.updateMany({ where: {
        id, centerId, status: 'ACKNOWLEDGED', version,
      }, data: { status: 'SYNTHETIC_APPROVED', version: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('Handover approval raced.');
      await logCenterEvent(tx, centerId, 'handover.synthetic_approved', now, {
        actorUserId: v.userId, meta: { handoverId: id, childId: draft.childId,
          service: draft.service, approvedVersion: version + 1, synthetic: true } });
      return { proposalId: id, version: version + 1, status: 'SYNTHETIC_APPROVED',
        synthetic: true, clinicalApproval: false, assignmentChanged: false, accessGranted: false };
    });
  }

  async commitSyntheticHandover(centerId: string, v: Viewer, id: string, version: number) {
    if (!['CENTER_ADMIN', 'COORDINATOR'].includes(v.role)) throw new ForbiddenException();
    const now = this.trial.now();
    return this.prisma.$transaction(async tx => {
      await this.trial.assertWritable(tx, centerId, now);
      await this.requireSyntheticTransferCenter(tx, centerId);
      await assertActor(tx, centerId, v, ['CENTER_ADMIN', 'COORDINATOR']);
      const draft = await tx.caseloadTransferDraft.findFirst({
        where: { id, centerId, status: 'SYNTHETIC_APPROVED', version },
      });
      if (!draft) throw new ConflictException('Handover commit version or status changed.');
      // Enforce the center -> membership -> assignment lock order.
      const members = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM membership WHERE center_id=${centerId}::uuid
          AND id IN (${draft.fromMembershipId}::uuid, ${draft.toMembershipId}::uuid)
          ORDER BY id FOR UPDATE`;
      if (members.length !== 2) throw new ConflictException('Therapist memberships changed.');
      const assignmentRows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM care_assignment WHERE center_id=${centerId}::uuid
          AND child_id=${draft.childId}::uuid AND service=${draft.service}
          AND membership_id=${draft.fromMembershipId}::uuid
          AND ended_at IS NULL FOR UPDATE`;
      if (assignmentRows.length !== 1) throw new ConflictException('Source assignment changed.');
      const sourceRecord = await tx.careAssignment.findFirst({ where: {
        id: assignmentRows[0].id, centerId, childId: draft.childId,
        membershipId: draft.fromMembershipId, service: draft.service, endedAt: null,
      }, select: { isLead: true } });
      if (!sourceRecord) throw new ConflictException('Source assignment changed.');
      const [child, incoming, otherActive] = await Promise.all([
        tx.child.findFirst({ where: { id: draft.childId, centerId, status: 'ACTIVE',
          services: { has: draft.service } }, select: { id: true } }),
        tx.membership.findFirst({ where: { id: draft.toMembershipId, centerId,
          status: 'ACTIVE', user: { status: 'ACTIVE' },
          specialties: { has: draft.service }, roles: { some: { role: 'THERAPIST' } } },
          select: { id: true } }),
        tx.careAssignment.count({ where: { centerId, childId: draft.childId,
          service: draft.service, membershipId: draft.toMembershipId, endedAt: null } }),
      ]);
      if (!child || !incoming || otherActive > 0)
        throw new ConflictException('Assignment or recipient eligibility changed.');
      await this.checkCleanSyntheticAssignment(tx, centerId, draft.childId, draft.service);
      const ended = await tx.careAssignment.updateMany({ where: {
        id: assignmentRows[0].id, centerId, endedAt: null,
      }, data: { endedAt: now } });
      if (ended.count !== 1) throw new ConflictException('Source assignment raced.');
      const incomingAssignment = await tx.careAssignment.create({ data: {
        centerId, childId: draft.childId, membershipId: draft.toMembershipId,
        service: draft.service, startedAt: now, isLead: sourceRecord.isLead,
      } });
      const updated = await tx.caseloadTransferDraft.updateMany({ where: {
        id, centerId, status: 'SYNTHETIC_APPROVED', version,
      }, data: { status: 'SYNTHETIC_COMPLETED', version: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('Handover commit raced.');
      await logCenterEvent(tx, centerId, 'handover.synthetic_committed', now, {
        actorUserId: v.userId, meta: { handoverId: id, childId: draft.childId,
          service: draft.service, newAssignmentId: incomingAssignment.id, synthetic: true } });
      return { proposalId: id, version: version + 1, status: 'SYNTHETIC_COMPLETED',
        synthetic: true, clinicalApproval: false, assignmentChanged: true,
        syntheticAssignmentAccessChanged: true, clinicalHandover: false, released: false };
    });
  }

  async transfer(centerId: string, v: Viewer, dto: TransferDraftDto) {
    return this.prisma.$transaction(async tx => {
      await this.trial.assertWritable(tx, centerId, this.trial.now());
      await assertActor(tx, centerId, v, ['CENTER_ADMIN','COORDINATOR']);
      if (dto.fromMembershipId === dto.toMembershipId || !dto.reason.trim()) throw new UnprocessableEntityException('Choose different therapists and give a reason.');
      if (!await tx.careAssignment.findFirst({ where: { centerId, childId: dto.childId, membershipId: dto.fromMembershipId, service: dto.service, endedAt: null } })) throw new NotFoundException();
      const target = await tx.membership.findFirst({ where: { id: dto.toMembershipId, centerId, status: 'ACTIVE', roles: { some: { role: 'THERAPIST' } } } });
      if (!target) throw new NotFoundException();
      const draft = await tx.caseloadTransferDraft.create({ data: { centerId, ...dto, createdById: v.userId } });
      await logCenterEvent(tx, centerId, 'governance.transfer_simulated', this.trial.now(), { actorUserId: v.userId, meta: { draftId: draft.id } });
      return { ...draft, accessGranted: false };
    });
  }
}
