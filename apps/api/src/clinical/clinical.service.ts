import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { Tx, logCenterEvent, uniq } from '../centers/history';
import { PrismaService } from '../prisma/prisma.service';
import type { Viewer } from '../operations/children.service';
import { TrialService } from '../operations/trial.service';
import { assertActor, EDITABLE, fingerprint } from './governance-core';
import type { AssessmentDto, AssessmentUpdateDto, ObservationDto, PlanDto, PlanVersionUpdateDto, ReviewDto, SessionNoteDto, SessionNoteUpdateDto, TemplateDto, TemplateUpdateDto, TemplateCopyDto, GoalReviewCheckpointDto } from './clinical.dto';

export const asDate = (d: string) => new Date(`${d}T00:00:00Z`);
export const day = (d: Date) => d.toISOString().slice(0, 10);
export const LOCKED = 'Signing, approval and release are disabled until an owner-approved clinical policy exists.';
type Goal = { key: string; title: string; measure: string; baseline: number; target: number; horizon?: 'SHORT_TERM' | 'LONG_TERM'; targetOn?: string; reviewOn?: string };
// Normalize optional fields for the measured-goal immutability check. The DTO
// may materialize absent optional properties as undefined, while old JSON
// snapshots omit them entirely. Neither representation is a definition change.
const goalDefinition = (g?: Goal) => !g ? null : {
  key: g.key, title: g.title, measure: g.measure,
  baseline: g.baseline, target: g.target,
  horizon: g.horizon ?? null, targetOn: g.targetOn ?? null, reviewOn: g.reviewOn ?? null,
};

// Snapshots are captured by the server, never accepted as client input.
type ActivitySnapshot = { id: string; title: string; service: string; ageBand: string; minutes: number; materials: string[]; steps: string[]; safety: string[]; version: number; capturedAt: string };
type ActivitySchedule = { cadence: 'WEEKLY' | 'MONTHLY'; startsOn: string; endsOn: string; weekdays?: number[]; monthDay?: number };
type HomeActivity = { templateId: string; frequency: string; note?: string; durationMinutes?: number; goalKey?: string; schedule?: ActivitySchedule; snapshot?: ActivitySnapshot };

// All date-only fields are calendar dates, never UTC timestamps. Reject
// invalid month/day combinations (February 30, non-leap Feb 29, etc.).
const validCalendarDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 2100 &&
  !Number.isNaN(Date.parse(value + 'T00:00:00Z')) &&
  new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const calendarDays = (from: string, to: string): number =>
  (Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86_400_000;
function validateSchedule(schedule: ActivitySchedule) {
  if (!validCalendarDate(schedule.startsOn) || !validCalendarDate(schedule.endsOn)) {
    throw new UnprocessableEntityException('Enter valid start and end calendar dates for the activity schedule.');
  }
  const days = calendarDays(schedule.startsOn, schedule.endsOn);
  if (days < 0 || days > 366) throw new UnprocessableEntityException('An activity schedule must cover at most one year and end after it starts.');
  if (schedule.cadence === 'WEEKLY') {
    if (!Array.isArray(schedule.weekdays) || !schedule.weekdays.length ||
        new Set(schedule.weekdays).size !== schedule.weekdays.length || schedule.monthDay !== undefined) {
      throw new UnprocessableEntityException('Weekly schedules require unique weekdays and no monthly day.');
    }
  } else if (schedule.cadence === 'MONTHLY') {
    if (!Number.isInteger(schedule.monthDay) || schedule.monthDay! < 1 ||
        schedule.monthDay! > 31 || schedule.weekdays !== undefined) {
      throw new UnprocessableEntityException('Monthly schedules require one month day and no weekdays.');
    }
  } else throw new UnprocessableEntityException('Unsupported activity schedule cadence.');
  // A valid-looking date range must actually contain a scheduled occurrence.
  let hasOccurrence = false;
  for (let t = Date.parse(schedule.startsOn + 'T00:00:00Z');
       t <= Date.parse(schedule.endsOn + 'T00:00:00Z'); t += 86_400_000) {
    const current = new Date(t);
    if (schedule.cadence === 'WEEKLY'
      ? schedule.weekdays!.includes(current.getUTCDay())
      : current.getUTCDate() === schedule.monthDay) { hasOccurrence = true; break; }
  }
  if (!hasOccurrence) throw new UnprocessableEntityException('The selected period contains no scheduled activity dates.');
}


// Clinical drafts: therapists work on children actively assigned to them; clinical supervisors read and review the whole center.
// Center administrators, coordinators and guardians never reach these records.
@Injectable()
export class ClinicalService {
  constructor(private readonly prisma: PrismaService, private readonly trial: TrialService) {}

  // Authoritative child + specialty pairs. A care assignment alone is insufficient:
  // a suspended membership or removed membership specialty must revoke access.
  async therapistAssignments(db: Tx | PrismaService, centerId: string, v: Viewer, childId?: string) {
    if (v.role !== 'THERAPIST') return [];
    const member = await db.membership.findFirst({
      where: { id: v.membershipId, centerId, userId: v.userId, status: 'ACTIVE',
        user: { status: 'ACTIVE' }, roles: { some: { role: 'THERAPIST' } } },
      select: { specialties: true },
    });
    if (!member?.specialties.length) return [];
    return db.careAssignment.findMany({
      where: { centerId, membershipId: v.membershipId, endedAt: null,
        service: { in: member.specialties }, ...(childId ? { childId } : {}) },
      select: { childId: true, service: true },
    });
  }

  async child(db: Tx | PrismaService, centerId: string, v: Viewer, childId: string, service?: string) {
    if (!['THERAPIST', 'CLINICAL_SUPERVISOR'].includes(v.role)) throw new ForbiddenException('Clinical records are restricted.');
    if (v.role === 'THERAPIST') {
      const assigned = await this.therapistAssignments(db, centerId, v, childId);
      if (!assigned.some(a => !service || a.service === service)) throw new NotFoundException('Child not found');
    }
    const c = await db.child.findFirst({ where: { id: childId, centerId, status: 'ACTIVE' } });
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
      ? (await this.therapistAssignments(this.prisma, centerId, v, childId)).map(a => a.service)
      : null;
    const serviceScope = assignedServices ? { service: { in: assignedServices } } : {};
    const [assessments, plans, notes, appointments, templates, assignments] = await Promise.all([
      this.prisma.assessment.findMany({ where: { centerId, childId, ...serviceScope }, orderBy: { assessedOn: 'desc' } }),
      this.prisma.therapyPlan.findMany({ where: { centerId, childId, ...serviceScope }, include: { versions: { orderBy: { number: 'desc' } } }, orderBy: { createdAt: 'asc' } }),
      this.prisma.sessionNote.findMany({ where: { centerId, childId, ...serviceScope }, orderBy: { sessionDate: 'desc' }, take: 50 }),
      this.prisma.appointment.findMany({ where: { centerId, childId, ...serviceScope, status: { in: ['SCHEDULED', 'COMPLETED'] }, startsAt: { gte: new Date(this.trial.now().getTime() - 30 * 86_400_000), lte: new Date(this.trial.now().getTime() + 42 * 86_400_000) }, ...(v.role === 'THERAPIST' ? { membershipId: v.membershipId } : {}) }, orderBy: { startsAt: 'desc' } }),
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
    // TB-EM-032: expose a source trace ONLY for plans already authorized by
    // this child's specialty-scoped workspace. The event records the original
    // report-to-plan handoff but never makes its report evidence public.
    const sourceEvents = plans.length ? await this.prisma.centerEvent.findMany({
      where: { centerId, type: 'clinical.report_plan_drafted',
        OR: plans.map(p => ({ meta: { path: ['planId'], equals: p.id } })) },
      select: { meta: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }) : [];
    type SourceMeta = { planId?: string; planVersionId?: string; reportId?: string;
      reportVersionId?: string; selectedGoalRefs?: unknown; draftOnly?: boolean; released?: boolean };
    const uuid = (value: unknown): value is string =>
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    const sourceMetadata = sourceEvents.map(e => ({ ...(e.meta as SourceMeta), at: e.createdAt }))
      .filter(m => m.draftOnly === true && m.released === false &&
        // Audit metadata is schemaless. A bad historical value must not be
        // interpolated into any @db.Uuid query and break Child 360 entirely.
        uuid(m.reportId) && uuid(m.reportVersionId) &&
        plans.some(p => p.id === m.planId && p.versions.some(x => x.id === m.planVersionId)) &&
        Array.isArray(m.selectedGoalRefs) && m.selectedGoalRefs.length <= 12 &&
        m.selectedGoalRefs.every((ref: unknown) => typeof ref === 'string' &&
          uuid(ref.slice(0, 36)) && ref[36] === ':' &&
          /^[a-z0-9-]{1,40}$/.test(ref.slice(37))));
    const reportsForSources = sourceMetadata.length ? await this.prisma.progressReport.findMany({
      where: { centerId, childId, id: { in: uniq(sourceMetadata.map(m => m.reportId!)) },
        service: { in: uniq(plans.map(p => p.service)) } },
      select: { id: true, title: true, service: true },
    }) : [];
    const versionsForSources = reportsForSources.length ? await this.prisma.reportVersion.findMany({
      where: { centerId, id: { in: uniq(sourceMetadata.map(m => m.reportVersionId!)) },
        reportId: { in: reportsForSources.map(r => r.id) } },
      select: { id: true, reportId: true, number: true },
    }) : [];
    const planSource = (p: (typeof plans)[number]) => {
      const m = sourceMetadata.find(m => m.planId === p.id);
      const report = reportsForSources.find(r => r.id === m?.reportId && r.service === p.service);
      const version = versionsForSources.find(v => v.id === m?.reportVersionId && v.reportId === report?.id);
      if (!m || !report || !version || !m.planVersionId) return null;
      // Goal mappings are only valid in the initially created version. Later
      // versions may redefine keys; no cross-version evidence is inferred.
      return {
        reportId: report.id, reportTitle: report.title,
        reportVersionId: version.id, reportVersionNumber: version.number,
        originalPlanVersionId: m.planVersionId, draftedAt: m.at,
        selectedGoals: (m.selectedGoalRefs as string[]).map((ref, i) => {
          const colon = ref.indexOf(':');
          return { planGoalKey: 'g' + (i + 1),
            sourcePlanVersionId: ref.slice(0, colon), sourceGoalKey: ref.slice(colon + 1) };
        }),
        draftOnly: true as const, released: false as const,
      };
    };
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
    const referentAssignment = c.referentMembershipId
      ? assignments.find(a => a.membershipId === c.referentMembershipId
        && activeStaff.some(m => m.id === a.membershipId && m.specialties.includes(a.service)))
      : null;
    const visibleReferent = referentAssignment
      ? activeStaff.find(m => m.id === referentAssignment.membershipId) : null;
    const who = (id: string) => team.find((t) => t.id === id)?.user.displayName ?? '';
    const center = await this.prisma.center.findUniqueOrThrow({ where: { id: centerId }, select: { timezone: true } });
    return {
      timezone: center.timezone, synthetic: true, locked: LOCKED, canEdit: v.role === 'THERAPIST', canReview: v.role === 'CLINICAL_SUPERVISOR',
      child: { id: c.id, name: `${c.preferredName ?? c.firstName} ${c.lastName}`, services: assignedServices ?? c.services, dateOfBirth: day(c.dateOfBirth) },
      careTeam,
      // Explicit centre-admin designation only, not inferred from a per-service
      // lead. Do not disclose a cross-specialty or inactive referent's name.
      childWideReferent: visibleReferent ? { displayName: visibleReferent.user.displayName } : null,
      childWideReferentStatus: !c.referentMembershipId ? 'NOT_DESIGNATED'
        : visibleReferent ? 'VISIBLE' : 'UNAVAILABLE',
      assessments: assessments.map((a) => ({ id: a.id, service: a.service, assessedOn: day(a.assessedOn), summary: a.summary, areas: a.areas, status: a.status, version: a.version, author: who(a.membershipId), mine: a.membershipId === v.membershipId, updatedAt: a.updatedAt })),
      plans: plans.map((p) => ({ id: p.id, service: p.service, title: p.title, source: planSource(p), versions: p.versions.map((x) => ({ id: x.id, number: x.number, status: x.status, summary: x.summary, goals: x.goals, homeActivities: x.homeActivities, reviewNotes: (Array.isArray(x.reviewNotes) ? x.reviewNotes : []).filter((n: any) => n?.kind !== 'GOAL_CHECKPOINT'),
        goalCheckpoints: (Array.isArray(x.reviewNotes) ? x.reviewNotes : []).filter((n: any) =>
          n?.kind === 'GOAL_CHECKPOINT' && typeof n.goalKey === 'string' &&
          (x.goals as Goal[]).some(g => g.key === n.goalKey)),
        version: x.version, mine: x.authorId === v.userId, author: users.find((u) => u.id === x.authorId)?.displayName ?? '', updatedAt: x.updatedAt })) })),
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
      const r = await tx.assessment.updateMany({ where: { id, centerId, childId: a.childId, membershipId: v.membershipId, service: a.service, version: dto.version }, data: { assessedOn: asDate(dto.assessedOn), summary: dto.summary, areas: dto.areas as unknown as Prisma.InputJsonValue, updatedAt: now, version: { increment: 1 } } });
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
    // homeActivities are contained by THIS PlanVersion. Verify that every
    // explicit goal association targets a goal saved in that same version;
    // older unlinked drafts remain readable/editable without inventing links.
    const keys = new Set(dto.goals.map((g) => g.key));
    for (const g of dto.goals) {
      if ((g.targetOn && !validCalendarDate(g.targetOn)) || (g.reviewOn && !validCalendarDate(g.reviewOn)))
        throw new UnprocessableEntityException('Goal dates must be valid calendar dates.');
    }
    for (const a of dto.homeActivities) if (a.schedule) validateSchedule(a.schedule);
    if (dto.homeActivities.some((a) => a.goalKey && !keys.has(a.goalKey))) throw new UnprocessableEntityException('Link each home activity to a goal in this plan version.');
    const ids = uniq(dto.homeActivities.map(h => h.templateId));
    if (ids.length !== dto.homeActivities.length) throw new UnprocessableEntityException('An activity can only appear once in this plan version.');
    // Validate templates inside the write transaction so no change to
    // permissions, centre, or specialty races the final persisted snapshot.
    return this.write(centerId, v, x.plan.childId, x.plan.service, async (tx, now) => {
      const fresh = await tx.planVersion.findUniqueOrThrow({ where: { id } });
      // The same library template may be reused in another draft, but not
      // duplicated inside this version. Capture its immutable contents once.
      const templates = await tx.activityTemplate.findMany({
        where: { id: { in: ids }, service: x.plan.service, OR: [{ centerId }, { centerId: null }] },
      });
      if (templates.length !== ids.length) throw new UnprocessableEntityException('Choose activities from the same specialty and this center’s library.');
      const previous = fresh.homeActivities as HomeActivity[];
      const homeActivities: HomeActivity[] = dto.homeActivities.map(activity => {
        const template = templates.find(t => t.id === activity.templateId)!;
        const old = previous.find(p => p.templateId === activity.templateId);
        const snapshot: ActivitySnapshot = old?.snapshot ?? {
          id: template.id, title: template.title, service: template.service,
          ageBand: template.ageBand, minutes: template.minutes,
          materials: [...template.materials], steps: [...template.steps],
          safety: [...template.safety], version: template.version,
          capturedAt: now.toISOString(),
        };
        // Drop any untrusted client keys: only the server-generated snapshot
        // can enter this version's JSON content.
        return { templateId: activity.templateId,
          frequency: activity.schedule ? (activity.schedule.cadence === 'WEEKLY' ? 'Weekly calendar draft' : 'Monthly calendar draft') : activity.frequency,
          ...(activity.goalKey ? { goalKey: activity.goalKey } : {}),
          ...(activity.note !== undefined ? { note: activity.note } : {}),
          ...(activity.durationMinutes !== undefined ? { durationMinutes: activity.durationMinutes } : {}),
          ...(activity.schedule ? { schedule: {
            cadence: activity.schedule.cadence,
            startsOn: activity.schedule.startsOn, endsOn: activity.schedule.endsOn,
            ...(activity.schedule.cadence === 'WEEKLY' ? { weekdays: activity.schedule.weekdays } : { monthDay: activity.schedule.monthDay }),
          } } : {}),
          snapshot };
      });
      if (fresh.authorId !== v.userId) throw new ForbiddenException('Only the author can edit this plan version.');
      const observed = await tx.observation.findMany({ where: { planVersionId: id }, select: { goalKey: true } });
      for (const o of observed) {
        const oldGoal = (fresh.goals as Goal[]).find(g => g.key === o.goalKey);
        if (fingerprint(goalDefinition(oldGoal)) !== fingerprint(goalDefinition(dto.goals.find(g => g.key === o.goalKey)))) throw new ConflictException('A goal with observations cannot be redefined. Start a new plan version.');
      }
      // A recorded checkpoint freezes the goal's definition in THIS plan
      // version, even when the therapist linked zero measured observations.
      for (const n of Array.isArray(fresh.reviewNotes) ? fresh.reviewNotes : []) {
        if (!n || typeof n !== 'object' || Array.isArray(n) ||
            n.kind !== 'GOAL_CHECKPOINT' || typeof n.goalKey !== 'string') continue;
        const priorGoal = (fresh.goals as Goal[]).find(g => g.key === n.goalKey);
        const proposed = dto.goals.find(g => g.key === n.goalKey);
        if (fingerprint(goalDefinition(priorGoal)) !== fingerprint(goalDefinition(proposed)))
          throw new ConflictException('A goal with recorded review checkpoints cannot be redefined. Start a new plan version.');
      }
      const r = await tx.planVersion.updateMany({ where: { id, centerId, authorId: v.userId, status: { in: EDITABLE }, version: dto.version }, data: { summary: dto.summary, goals: dto.goals as unknown as Prisma.InputJsonValue, homeActivities: homeActivities as unknown as Prisma.InputJsonValue, updatedAt: now, version: { increment: 1 } } });
      if (r.count !== 1) throw new ConflictException(x.status !== 'DRAFT' ? 'Only a draft can be edited. Start a new version to make changes.' : 'This draft changed since you opened it. Reload to see the latest version.');
      await logCenterEvent(tx, centerId, 'clinical.plan_draft_saved', now, { actorUserId: v.userId, meta: { childId: x.plan.childId, planId: x.planId, planVersionId: id, goals: dto.goals.length, activityTemplates: ids.length } });
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

  // Internal goal-review checkpoint, stored as a tagged append-only entry in
  // the existing plan-version review ledger. This does NOT update definitions,
  // measurements, source observations or any clinical approval state.
  async recordGoalCheckpoint(centerId: string, v: Viewer, id: string, dto: GoalReviewCheckpointDto) {
    const x = await this.version(centerId, id);
    return this.write(centerId, v, x.plan.childId, x.plan.service, async (tx, now) => {
      const fresh = await tx.planVersion.findFirst({
        where: { id, centerId, plan: { centerId, childId: x.plan.childId, service: x.plan.service } },
      });
      if (!fresh) throw new NotFoundException('Plan version unavailable');
      if (fresh.authorId !== v.userId) throw new ForbiddenException('Only the plan author can record its draft goal review.');
      // Active child assignments alone are insufficient: a separate staff
      // specialty revocation must also make new clinical writes impossible.
      const member = await tx.membership.findFirst({ where: {
        id: v.membershipId, centerId, userId: v.userId, status: 'ACTIVE',
        specialties: { has: x.plan.service },
      }, select: { id: true } });
      if (!member) throw new ForbiddenException('This clinical specialty is no longer authorized.');
      if (!['DRAFT', 'RETURNED_FOR_REVISION'].includes(fresh.status))
        throw new ConflictException('Goal review checkpoints can only be added to an editable internal draft.');
      if (fresh.version !== dto.version) throw new ConflictException('The plan has changed. Reload before recording a checkpoint.');
      const centre = await tx.center.findUniqueOrThrow({ where: { id: centerId },
        select: { timezone: true } });
      let localToday: string;
      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: centre.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
        }).formatToParts(now);
        const part = (type: string) => parts.find(p => p.type === type)?.value ?? '';
        localToday = [part('year'), part('month'), part('day')].join('-');
      } catch {
        throw new UnprocessableEntityException('The center timezone is invalid. Correct it before recording a dated review.');
      }
      if (!validCalendarDate(dto.reviewedOn) || dto.reviewedOn > localToday)
        throw new UnprocessableEntityException('Review date must be a valid center-local calendar day, not in the future.');
      if (dto.summary.trim().length < 10)
        throw new UnprocessableEntityException('Describe the completed review in at least 10 characters.');
      if (!(fresh.goals as Goal[]).some(g => g.key === dto.goalKey))
        throw new UnprocessableEntityException('Choose a goal in this exact saved plan version.');
      if (new Set(dto.observationIds).size !== dto.observationIds.length)
        throw new UnprocessableEntityException('Observation sources must be unique.');
      const sources = await tx.observation.findMany({
        where: { id: { in: dto.observationIds }, centerId, childId: x.plan.childId,
          planVersionId: id, goalKey: dto.goalKey },
        select: { id: true },
      });
      if (sources.length !== dto.observationIds.length)
        throw new UnprocessableEntityException('Every source must be a recorded observation of this exact plan version and goal.');
      const prior = Array.isArray(fresh.reviewNotes) ? [...fresh.reviewNotes] : [];
      const checkpoint = { kind: 'GOAL_CHECKPOINT', goalKey: dto.goalKey, authorId: v.userId,
        reviewedOn: dto.reviewedOn, at: now.toISOString(), summary: dto.summary.trim(),
        observationIds: [...dto.observationIds].sort(), clinicalAuthorization: false,
        released: false };
      const updated = await tx.planVersion.updateMany({
        where: { id, centerId, authorId: v.userId, version: dto.version,
          status: { in: ['DRAFT', 'RETURNED_FOR_REVISION'] } },
        data: { reviewNotes: [...prior, checkpoint] as Prisma.InputJsonValue,
          version: { increment: 1 }, updatedAt: now },
      });
      if (updated.count !== 1) throw new ConflictException('Plan version changed during the goal review. Reload and retry.');
      // Do not mirror even metadata to centre-wide events: ordinary staff
      // timelines include centre events but must not expose clinical reviews.
      // The protected append-only plan-version ledger is the source of truth.
      return { persisted: true, version: dto.version + 1, released: false,
        clinicalAuthorization: false };
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
      const r = await tx.sessionNote.updateMany({ where: { id, centerId, childId: n.childId, service: n.service, membershipId: v.membershipId, version: dto.version, executionStatus: 'IN_PROGRESS', actualStart: null }, data: { sections: { ...dto.sections } as Prisma.InputJsonValue, updatedAt: now, version: { increment: 1 } } });
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

  // Authenticates the current actor inside the write transaction. Therapists
  // can only create or customize activities in their own active specialties.
  private async templateWriter(tx: Tx, centerId: string, v: Viewer, service: string) {
    await assertActor(tx, centerId, v, ['THERAPIST', 'CLINICAL_SUPERVISOR']);
    if (v.role === 'THERAPIST') {
      const allowed = await tx.membership.findFirst({
        where: {
          id: v.membershipId, userId: v.userId, centerId, status: 'ACTIVE',
          specialties: { has: service },
        },
        select: { id: true },
      });
      if (!allowed) throw new ForbiddenException('You cannot edit activities outside your assigned specialties.');
    }
  }

  private templateTitle(raw: string) {
    const title = raw.trim();
    if (title.length < 3) throw new UnprocessableEntityException('Activity title needs at least three non-space characters.');
    return title;
  }

  templates(centerId: string, v?: Viewer) {
    return this.prisma.activityTemplate.findMany({ where: { OR: [{ centerId }, { centerId: null }] }, orderBy: [{ service: 'asc' }, { title: 'asc' }] })
      .then((rows) => rows.map((t) => ({ id: t.id, title: t.title, service: t.service, ageBand: t.ageBand, minutes: t.minutes, materials: t.materials, steps: t.steps, safety: t.safety, library: t.centerId ? 'center' : 'synthetic', version: t.version, mine: !!v && t.centerId === centerId && t.createdById === v.userId })));
  }

  async createTemplate(centerId: string, v: Viewer, dto: TemplateDto) {
    if (!dto.steps.length || !dto.safety.length) throw new UnprocessableEntityException('Add at least one step and one safety note.');
    const title = this.templateTitle(dto.title);
    const now = this.trial.now();
    return this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      await this.templateWriter(tx, centerId, v, dto.service);
      const t = await tx.activityTemplate.create({ data: { centerId, ...dto, title, createdById: v.userId, createdAt: now } });
      await logCenterEvent(tx, centerId, 'clinical.template_created', now, { actorUserId: v.userId, meta: { templateId: t.id } });
      return { id: t.id };
    });
  }

  // A copy is always a new centre-owned draft template, never a mutation of
  // the original (including the global synthetic sample library).
  async duplicateTemplate(centerId: string, v: Viewer, templateId: string, dto: TemplateCopyDto) {
    const now = this.trial.now();
    return this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const source = await tx.activityTemplate.findFirst({
        where: { id: templateId, OR: [{ centerId }, { centerId: null }] },
      });
      if (!source) throw new NotFoundException('Activity not found.');
      await this.templateWriter(tx, centerId, v, source.service);
      const copy = await tx.activityTemplate.create({
        data: {
          centerId, createdById: v.userId, createdAt: now,
          title: this.templateTitle(dto.title), service: source.service,
          ageBand: source.ageBand, minutes: source.minutes,
          materials: [...source.materials], steps: [...source.steps], safety: [...source.safety],
        },
      });
      await logCenterEvent(tx, centerId, 'clinical.template_duplicated', now, {
        actorUserId: v.userId, meta: { templateId: copy.id, sourceTemplateId: templateId },
      });
      return { id: copy.id, version: copy.version };
    });
  }

  // Existing plan/session snapshots remain frozen; only the live reusable
  // template changes. Author ownership + optimistic version prevent lost edits.
  async updateTemplate(centerId: string, v: Viewer, templateId: string, dto: TemplateUpdateDto) {
    if (!dto.steps.length || !dto.safety.length) throw new UnprocessableEntityException('Add at least one step and one safety note.');
    const title = this.templateTitle(dto.title);
    const now = this.trial.now();
    return this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const source = await tx.activityTemplate.findFirst({ where: { id: templateId, centerId } });
      if (!source) throw new NotFoundException('Activity not found.');
      await this.templateWriter(tx, centerId, v, source.service);
      if (source.createdById !== v.userId) throw new ForbiddenException('Only the activity author can edit this template. Duplicate it to customize.');
      const { version, ...fields } = dto;
      const changed = await tx.activityTemplate.updateMany({
        where: { id: templateId, centerId, createdById: v.userId, version },
        data: { ...fields, title, version: { increment: 1 } },
      });
      if (changed.count !== 1) throw new ConflictException('This activity changed. Reload it before saving again.');
      await logCenterEvent(tx, centerId, 'clinical.template_updated', now, {
        actorUserId: v.userId, meta: { templateId, fromVersion: version, toVersion: version + 1 },
      });
      return { id: templateId, version: version + 1 };
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
