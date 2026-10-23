import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { Tx, logCenterEvent, uniq } from '../centers/history';
import { PrismaService } from '../prisma/prisma.service';
import type { Viewer } from '../operations/children.service';
import { TrialService } from '../operations/trial.service';
import { assertActor, EDITABLE, fingerprint } from './governance-core';
import type { AssessmentDto, AssessmentUpdateDto, ObservationDto, PlanDto, PlanVersionUpdateDto, ReviewDto, SessionNoteDto, SessionNoteUpdateDto, TemplateDto } from './clinical.dto';

export const asDate = (d: string) => new Date(`${d}T00:00:00Z`);
export const day = (d: Date) => d.toISOString().slice(0, 10);
export const LOCKED = 'Signing, approval and release are disabled until an owner-approved clinical policy exists.';
type Goal = { key: string; title: string; measure: string; baseline: number; target: number };
type HomeActivity = { templateId: string; frequency: string; note?: string };

// Clinical drafts: therapists work on children actively assigned to them; clinical supervisors read and review the whole center.
// Center administrators, coordinators and guardians never reach these records.
@Injectable()
export class ClinicalService {
  constructor(private readonly prisma: PrismaService, private readonly trial: TrialService) {}

  async child(db: Tx | PrismaService, centerId: string, v: Viewer, childId: string, service?: string) {
    if (!['THERAPIST', 'CLINICAL_SUPERVISOR'].includes(v.role)) throw new ForbiddenException('Clinical records are restricted.');
    const where: Prisma.ChildWhereInput = v.role === 'THERAPIST' ? { assignments: { some: { membershipId: v.membershipId, endedAt: null, ...(service ? { service } : {}) } } } : {};
    const c = await db.child.findFirst({ where: { id: childId, centerId, status: 'ACTIVE', ...where } });
    if (!c || (service && !c.services.includes(service))) throw new NotFoundException('Child not found');
    return c;
  }

  async write<T>(centerId: string, v: Viewer, childId: string, service: string | undefined, fn: (tx: Tx, now: Date) => Promise<T>) {
    if (v.role !== 'THERAPIST') throw new ForbiddenException('Only an assigned therapist can edit clinical drafts.');
    const now = this.trial.now();
    return this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      await assertActor(tx, centerId, v, ['THERAPIST']);
      await tx.$queryRaw`SELECT id FROM child WHERE id=${childId}::uuid FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM care_assignment WHERE center_id=${centerId}::uuid AND child_id=${childId}::uuid AND membership_id=${v.membershipId}::uuid FOR SHARE`;
      await this.child(tx, centerId, v, childId, service);
      return fn(tx, now);
    });
  }

  async workspace(centerId: string, v: Viewer, childId: string) {
    const c = await this.child(this.prisma, centerId, v, childId);
    // A therapist may see only the services assigned to that therapist for this child.
    const assignedServices = v.role === 'THERAPIST'
      ? (await this.prisma.careAssignment.findMany({
          where: { centerId, childId, membershipId: v.membershipId, endedAt: null },
          select: { service: true },
        })).map(a => a.service)
      : null;
    const serviceScope = assignedServices ? { service: { in: assignedServices } } : {};
    const [assessments, plans, notes, appointments, templates, assignments] = await Promise.all([
      this.prisma.assessment.findMany({ where: { centerId, childId, ...serviceScope }, orderBy: { assessedOn: 'desc' } }),
      this.prisma.therapyPlan.findMany({ where: { centerId, childId, ...serviceScope }, include: { versions: { orderBy: { number: 'desc' } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.sessionNote.findMany({ where: { centerId, childId, ...serviceScope }, orderBy: { sessionDate: 'desc' }, take: 50 }),
      this.prisma.appointment.findMany({ where: { centerId, childId, ...serviceScope, status: { in: ['SCHEDULED', 'COMPLETED'] }, startsAt: { gte: new Date(this.trial.now().getTime() - 30 * 86_400_000), lte: new Date(this.trial.now().getTime() + 86_400_000) }, ...(v.role === 'THERAPIST' ? { membershipId: v.membershipId } : {}) }, orderBy: { startsAt: 'desc' } }),
      this.templates(centerId).then(rows => assignedServices ? rows.filter(t => assignedServices.includes(t.service)) : rows),
      // Never disclose names for another specialty to a therapist. A supervisor
      // may view centre-scoped assignment names, but not family discussions.
      this.prisma.careAssignment.findMany({
        where: { centerId, childId, endedAt: null, ...(assignedServices ? { service: { in: assignedServices } } : {}) },
        select: { id: true, membershipId: true, service: true, isLead: true },
      }),
    ]);
    // Observations must be bound to the exact plan versions that survived the service filter.
    const observations = await this.prisma.observation.findMany({
      where: { centerId, childId, planVersionId: { in: plans.flatMap(p => p.versions.map(ver => ver.id)) } },
      orderBy: [{ observedOn: 'asc' }, { createdAt: 'asc' }],
    });
    const team = await this.prisma.membership.findMany({ where: { id: { in: uniq([...assessments, ...notes, ...observations].map((x) => x.membershipId)) } }, select: { id: true, user: { select: { displayName: true } } } });
    const users = await this.prisma.user.findMany({ where: { id: { in: uniq(plans.flatMap((p) => p.versions.map((x) => x.authorId))) } }, select: { id: true, displayName: true } });
    // A current team member must belong to THIS centre, have an active user
    // and membership, retain their therapist role, and still hold this specialty.
    // Historical assignment/notes are not evidence of current team membership.
    const activeStaff = await this.prisma.membership.findMany({
      where: {
        centerId, id: { in: uniq(assignments.map(a => a.membershipId)) },
        status: 'ACTIVE', user: { status: 'ACTIVE' },
        roles: { some: { role: 'THERAPIST' } },
      },
      select: { id: true, specialties: true, user: { select: { displayName: true } } },
    });
    const careTeam = assignments.flatMap(a => {
      const member = activeStaff.find(m => m.id === a.membershipId && m.specialties.includes(a.service));
      return member ? [{ assignmentId: a.id, service: a.service, displayName: member.user.displayName, isSpecialtyLead: a.isLead }] : [];
    }).sort((a, b) => a.service.localeCompare(b.service) || Number(b.isSpecialtyLead) - Number(a.isSpecialtyLead) || a.displayName.localeCompare(b.displayName) || a.assignmentId.localeCompare(b.assignmentId));
    const who = (id: string) => team.find((t) => t.id === id)?.user.displayName ?? '';
    const center = await this.prisma.center.findUniqueOrThrow({ where: { id: centerId }, select: { timezone: true } });
    return {
      timezone: center.timezone, synthetic: true, locked: LOCKED, canEdit: v.role === 'THERAPIST', canReview: v.role === 'CLINICAL_SUPERVISOR',
      child: { id: c.id, name: `${c.preferredName ?? c.firstName} ${c.lastName}`, services: assignedServices ?? c.services, dateOfBirth: day(c.dateOfBirth) },
      careTeam,
      // No dedicated child-wide referent record exists in the current schema.
      // Do not elevate a per-specialty lead into a global referent.
      childWideReferent: null,
      assessments: assessments.map((a) => ({ id: a.id, service: a.service, assessedOn: day(a.assessedOn), summary: a.summary, areas: a.areas, status: a.status, version: a.version, author: who(a.membershipId), mine: a.membershipId === v.membershipId, updatedAt: a.updatedAt })),
      plans: plans.map((p) => ({ id: p.id, service: p.service, title: p.title, versions: p.versions.map((x) => ({ id: x.id, number: x.number, status: x.status, summary: x.summary, goals: x.goals, homeActivities: x.homeActivities, reviewNotes: x.reviewNotes, version: x.version, mine: x.authorId === v.userId, author: users.find((u) => u.id === x.authorId)?.displayName ?? '', updatedAt: x.updatedAt })) })),
      notes: notes.map((n) => ({ id: n.id, service: n.service, sessionDate: day(n.sessionDate), appointmentId: n.appointmentId, sections: n.sections, status: n.status, executionStatus: n.executionStatus, actualStart: n.actualStart, actualEnd: n.actualEnd, attendance: n.attendance, activities: n.activities, version: n.version, author: who(n.membershipId), mine: n.membershipId === v.membershipId, updatedAt: n.updatedAt })),
      observations: observations.map((o) => ({ id: o.id, planVersionId: o.planVersionId, goalKey: o.goalKey, value: o.value, observedOn: day(o.observedOn), note: o.note, sessionNoteId: o.sessionNoteId, author: who(o.membershipId) })),
      appointments: appointments.map((a) => ({ id: a.id, service: a.service, startsAt: a.startsAt, endsAt: a.endsAt, room: a.room, status: a.status, hasNote: notes.some((n) => n.appointmentId === a.id) })),
      templates,
    };
  }

  async createAssessment(centerId: string, v: Viewer, childId: string, dto: AssessmentDto) {
    return this.write(centerId, v, childId, dto.service, async (tx, now) => {
      const a = await tx.assessment.create({ data: { centerId, childId, membershipId: v.membershipId, service: dto.service, assessedOn: asDate(dto.assessedOn), summary: dto.summary, areas: dto.areas as unknown as Prisma.InputJsonValue, createdAt: now, updatedAt: now } });
      await logCenterEvent(tx, centerId, 'clinical.assessment_drafted', now, { actorUserId: v.userId, membershipId: v.membershipId, meta: { childId, assessmentId: a.id } });
      return { id: a.id };
    });
  }

  async updateAssessment(centerId: string, v: Viewer, id: string, dto: AssessmentUpdateDto) {
    const a = await this.prisma.assessment.findFirst({ where: { id, centerId } });
    if (!a) throw new NotFoundException('Assessment not found');
    return this.write(centerId, v, a.childId, a.service, async (tx, now) => {
      // Authorize against the persisted specialty before exposing any validation detail.
      if (dto.service !== a.service) throw new UnprocessableEntityException('Assessment specialty cannot be changed.');
      const r = await tx.assessment.updateMany({ where: { id, membershipId: v.membershipId, service: a.service, version: dto.version }, data: { assessedOn: asDate(dto.assessedOn), summary: dto.summary, areas: dto.areas as unknown as Prisma.InputJsonValue, updatedAt: now, version: { increment: 1 } } });
      if (r.count !== 1) throw new ConflictException(a.membershipId !== v.membershipId ? 'Only the author can edit this draft.' : 'This draft changed since you opened it. Reload to see the latest version.');
      await logCenterEvent(tx, centerId, 'clinical.assessment_updated', now, { actorUserId: v.userId, meta: { childId: a.childId, assessmentId: id } });
      return { ok: true };
    });
  }

  async createPlan(centerId: string, v: Viewer, childId: string, dto: PlanDto) {
    return this.write(centerId, v, childId, dto.service, async (tx, now) => {
      const p = await tx.therapyPlan.create({ data: { centerId, childId, service: dto.service, title: dto.title, createdById: v.userId, createdAt: now } });
      const ver = await tx.planVersion.create({ data: { planId: p.id, centerId, number: 1, authorId: v.userId, createdAt: now, updatedAt: now } });
      await logCenterEvent(tx, centerId, 'clinical.plan_created', now, { actorUserId: v.userId, meta: { childId, planId: p.id, planVersionId: ver.id } });
      return { id: p.id, versionId: ver.id };
    });
  }

  private async version(centerId: string, id: string) {
    const x = await this.prisma.planVersion.findFirst({ where: { id, centerId }, include: { plan: true } });
    if (!x) throw new NotFoundException('Plan version not found');
    return x;
  }

  async updateVersion(centerId: string, v: Viewer, id: string, dto: PlanVersionUpdateDto) {
    const x = await this.version(centerId, id);
    if (new Set(dto.goals.map((g) => g.key)).size !== dto.goals.length) throw new UnprocessableEntityException('Each goal needs its own key.');
    const ids = uniq(dto.homeActivities.map((h) => h.templateId));
    if ((await this.prisma.activityTemplate.count({ where: { id: { in: ids }, OR: [{ centerId }, { centerId: null }] } })) !== ids.length) throw new UnprocessableEntityException('Choose activities from this center’s library.');
    return this.write(centerId, v, x.plan.childId, x.plan.service, async (tx, now) => {
      if ((await tx.activityTemplate.count({ where: { id: { in: ids }, OR: [{ centerId }, { centerId: null }] } })) !== ids.length) throw new UnprocessableEntityException('Choose activities from this center’s library.');
      const fresh = await tx.planVersion.findUniqueOrThrow({ where: { id } });
      if (fresh.authorId !== v.userId) throw new ForbiddenException('Only the author can edit this plan version.');
      const observed = await tx.observation.findMany({ where: { planVersionId: id }, select: { goalKey: true } });
      for (const o of observed) {
        const oldGoal = (fresh.goals as Goal[]).find(g => g.key === o.goalKey);
        if (fingerprint(oldGoal ?? null) !== fingerprint(dto.goals.find(g => g.key === o.goalKey) ?? null)) throw new ConflictException('A goal with observations cannot be redefined. Start a new plan version.');
      }
      const r = await tx.planVersion.updateMany({ where: { id, centerId, authorId: v.userId, status: { in: EDITABLE }, version: dto.version }, data: { summary: dto.summary, goals: dto.goals as unknown as Prisma.InputJsonValue, homeActivities: dto.homeActivities as unknown as Prisma.InputJsonValue, updatedAt: now, version: { increment: 1 } } });
      if (r.count !== 1) throw new ConflictException(x.status !== 'DRAFT' ? 'Only a draft can be edited. Start a new version to make changes.' : 'This draft changed since you opened it. Reload to see the latest version.');
      await logCenterEvent(tx, centerId, 'clinical.plan_draft_saved', now, { actorUserId: v.userId, meta: { childId: x.plan.childId, planId: x.planId, planVersionId: id, goals: dto.goals.length } });
      return { ok: true };
    });
  }

  // Legacy entry points also require the caller's concurrency token and use the same governance service through controllers.
  async newVersion(centerId: string, v: Viewer, planId: string) {
    const p = await this.prisma.therapyPlan.findFirst({ where: { id: planId, centerId } });
    if (!p) throw new NotFoundException('Plan not found');
    return this.write(centerId, v, p.childId, p.service, async (tx, now) => {
      const last = await tx.planVersion.findFirstOrThrow({ where: { planId, centerId }, orderBy: { number: 'desc' } });
      if (last.authorId !== v.userId) throw new ForbiddenException('Only the author can create the next version.');
      if (!['WITHDRAWN', 'FROZEN_INTERNAL'].includes(last.status)) throw new ConflictException('Explicitly withdraw the reviewed version with a reason, or freeze an internal draft first.');
      const ver = await tx.planVersion.create({ data: { planId, centerId, number: last.number + 1, summary: last.summary, goals: last.goals as Prisma.InputJsonValue, homeActivities: last.homeActivities as Prisma.InputJsonValue, authorId: v.userId, createdAt: now, updatedAt: now } });
      await logCenterEvent(tx, centerId, 'clinical.plan_version_started', now, { actorUserId: v.userId, meta: { childId: p.childId, planId, planVersionId: ver.id, number: ver.number } });
      return { id: ver.id, number: ver.number };
    });
  }

  async createNote(centerId: string, v: Viewer, childId: string, dto: SessionNoteDto) {
    if (dto.appointmentId && !(await this.prisma.appointment.findFirst({ where: { id: dto.appointmentId, centerId, childId, membershipId: v.membershipId } }))) throw new UnprocessableEntityException('Choose one of your own appointments with this child.');
    return this.write(centerId, v, childId, dto.service, async (tx, now) => {
      const member = await tx.membership.findUniqueOrThrow({ where: { id: v.membershipId } });
      if (!member.specialties.includes(dto.service)) throw new NotFoundException('Specialty not assigned');
      if (dto.appointmentId && !await tx.appointment.findFirst({ where: { id: dto.appointmentId, centerId, childId, service: dto.service, membershipId: v.membershipId, status: 'SCHEDULED' } })) throw new UnprocessableEntityException('Choose your own scheduled appointment for this child and service.');
      if (dto.appointmentId && (await tx.sessionNote.findUnique({ where: { appointmentId: dto.appointmentId } }))) throw new ConflictException('This appointment already has a session draft.');
      const n = await tx.sessionNote.create({ data: { centerId, childId, membershipId: v.membershipId, appointmentId: dto.appointmentId ?? null, service: dto.service, sessionDate: asDate(dto.sessionDate), createdAt: now, updatedAt: now } });
      await logCenterEvent(tx, centerId, 'clinical.session_drafted', now, { actorUserId: v.userId, meta: { childId, sessionNoteId: n.id } });
      return { id: n.id };
    });
  }

  async updateNote(centerId: string, v: Viewer, id: string, dto: SessionNoteUpdateDto) {
    const n = await this.prisma.sessionNote.findFirst({ where: { id, centerId } });
    if (!n) throw new NotFoundException('Session draft not found');
    return this.write(centerId, v, n.childId, n.service, async (tx, now) => {
      const member = await tx.membership.findUniqueOrThrow({ where: { id: v.membershipId } });
      if (!member.specialties.includes(n.service)) throw new NotFoundException('Specialty not assigned');
      // Compatibility endpoint only edits pre-execution drafts. Established sessions use saveSession.
      const r = await tx.sessionNote.updateMany({ where: { id, membershipId: v.membershipId, version: dto.version, executionStatus: 'IN_PROGRESS', actualStart: null }, data: { sections: { ...dto.sections } as Prisma.InputJsonValue, updatedAt: now, version: { increment: 1 } } });
      if (r.count !== 1) throw new ConflictException(n.membershipId !== v.membershipId ? 'Only the author can edit this draft.' : 'This draft changed since you opened it. Reload to see the latest version.');
      await logCenterEvent(tx, centerId, 'clinical.session_saved', now, { actorUserId: v.userId, meta: { childId: n.childId, sessionNoteId: id } });
      return { ok: true };
    });
  }

  async addObservation(centerId: string, v: Viewer, childId: string, dto: ObservationDto) {
    const x = await this.prisma.planVersion.findFirst({ where: { id: dto.planVersionId, centerId, plan: { childId } }, include: { plan: true } });
    if (!x || !(x.goals as Goal[]).some((g) => g.key === dto.goalKey)) throw new UnprocessableEntityException('Choose a goal from this child’s plan.');
    if (asDate(dto.observedOn) > this.trial.now()) throw new UnprocessableEntityException('Observations cannot be dated in the future.');
    return this.write(centerId, v, childId, x.plan.service, async (tx, now) => {
      const fresh = await tx.planVersion.findFirst({ where: { id: dto.planVersionId, centerId, plan: { centerId, childId, service: x.plan.service } } });
      if (!fresh || !(fresh.goals as Goal[]).some(g => g.key === dto.goalKey)) throw new UnprocessableEntityException('Choose a goal from this child’s plan.');
      if (dto.sessionNoteId && !await tx.sessionNote.findFirst({ where: { id: dto.sessionNoteId, centerId, childId, service: x.plan.service, membershipId: v.membershipId } })) throw new UnprocessableEntityException('Choose your own session note for this child and service.');
      const o = await tx.observation.create({ data: { centerId, childId, planVersionId: x.id, goalKey: dto.goalKey, membershipId: v.membershipId, sessionNoteId: dto.sessionNoteId ?? null, value: dto.value, observedOn: asDate(dto.observedOn), note: dto.note || null, createdAt: now } });
      await logCenterEvent(tx, centerId, 'clinical.observation_recorded', now, { actorUserId: v.userId, meta: { childId, observationId: o.id, goalKey: dto.goalKey } });
      return { id: o.id };
    });
  }

  templates(centerId: string) {
    return this.prisma.activityTemplate.findMany({ where: { OR: [{ centerId }, { centerId: null }] }, orderBy: [{ service: 'asc' }, { title: 'asc' }] })
      .then((rows) => rows.map((t) => ({ id: t.id, title: t.title, service: t.service, ageBand: t.ageBand, minutes: t.minutes, materials: t.materials, steps: t.steps, safety: t.safety, library: t.centerId ? 'center' : 'synthetic', version: t.version })));
  }

  async createTemplate(centerId: string, v: Viewer, dto: TemplateDto) {
    if (!dto.steps.length || !dto.safety.length) throw new UnprocessableEntityException('Add at least one step and one safety note.');
    const now = this.trial.now();
    return this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const t = await tx.activityTemplate.create({ data: { centerId, ...dto, createdById: v.userId, createdAt: now } });
      await logCenterEvent(tx, centerId, 'clinical.template_created', now, { actorUserId: v.userId, meta: { templateId: t.id } });
      return { id: t.id };
    });
  }

  // Guardians see synthetic sample activities for their linked children's services; no plan content is shown until release is approved.
  async familyActivities(centerId: string, v: Viewer) {
    const links = await this.prisma.guardianLink.findMany({ where: { centerId, userId: v.userId, removedAt: null, child: { status: 'ACTIVE' } }, include: { child: true } });
    const all = await this.prisma.activityTemplate.findMany({ where: { centerId: null }, orderBy: { title: 'asc' } });
    return {
      sample: true, released: false,
      children: links.map((l) => ({ id: l.child.id, name: l.child.preferredName ?? l.child.firstName, activities: all.filter((t) => l.child.services.includes(t.service)).slice(0, 6).map((t) => ({ id: t.id, title: t.title, service: t.service, ageBand: t.ageBand, minutes: t.minutes, materials: t.materials, steps: t.steps, safety: t.safety })) })),
    };
  }
}
