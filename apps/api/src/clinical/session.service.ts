import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { logCenterEvent } from '../centers/history';
import { PrismaService } from '../prisma/prisma.service';
import type { Viewer } from '../operations/children.service';
import { ClinicalService, asDate } from './clinical.service';
import { fingerprint, json } from './governance-core';
import { SessionSaveDto, SessionStartDto } from './session.dto';

type Evidence = { id: string; templateId: string; snapshot: Record<string, unknown>; createdAt: string; authorId: string; goalSnapshot?: unknown; planVersionId?: string; goalKey?: string; [key: string]: unknown };
@Injectable()
export class SessionExecutionService {
  constructor(private readonly prisma: PrismaService, private readonly clinical: ClinicalService) {}

  async start(centerId: string, v: Viewer, childId: string, dto: SessionStartDto) {
    try {
      return await this.startAuthorized(centerId, v, childId, dto);
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2002' ||
          !Array.isArray(e.meta?.target) || !e.meta.target.every(k => ['start_key', 'appointment_id'].includes(String(k)))) throw e;
      // The failed transaction is rolled back. Reauthorize and resolve only the winning start.
      return this.startAuthorized(centerId, v, childId, dto, true);
    }
  }

  private async startAuthorized(centerId: string, v: Viewer, childId: string, dto: SessionStartDto, replayOnly = false) {
    return this.clinical.write(centerId, v, childId, dto.service, async (tx, now) => {
      const m = await tx.membership.findUniqueOrThrow({ where: { id: v.membershipId } });
      if (!m.specialties.includes(dto.service)) throw new NotFoundException('Specialty not assigned');
      const start = new Date(dto.actualStart);
      let appointment = null;
      if (dto.appointmentId) {
        appointment = await tx.appointment.findFirst({ where: { id: dto.appointmentId, centerId, childId, membershipId: v.membershipId, service: dto.service } });
        if (!appointment) throw new NotFoundException('Appointment not found');
        if (appointment.status !== 'SCHEDULED') throw new ConflictException('Only a scheduled appointment can start a session.');
        if (appointment.startsAt > now) throw new UnprocessableEntityException('This appointment has not started yet.');
      }
      const prior = await tx.sessionNote.findFirst({ where: { OR: [{ startKey: dto.startKey }, ...(dto.appointmentId ? [{ appointmentId: dto.appointmentId }] : [])] } });
      if (prior) {
        if (prior.centerId !== centerId || prior.childId !== childId || prior.membershipId !== v.membershipId || prior.service !== dto.service || prior.appointmentId !== (dto.appointmentId ?? null) || prior.startKey !== dto.startKey || prior.actualStart?.getTime() !== start.getTime() || prior.sessionDate.getTime() !== asDate(dto.sessionDate).getTime()) throw new ConflictException('Start key already used.');
        return { id: prior.id };
      }
      if (replayOnly) throw new ConflictException('Session start conflicted. Reload before retrying.');
      if (!Number.isFinite(start.getTime()) || start > now || start < new Date(now.getTime() - 86_400_000)) throw new UnprocessableEntityException('Actual start must be within the past 24 hours.');
      const center = await tx.center.findUniqueOrThrow({ where: { id: centerId } });
      if (this.centerDay(start, center.timezone) !== dto.sessionDate) throw new UnprocessableEntityException('Actual start must fall on the session date in the center time zone.');
      const note = await tx.sessionNote.create({ data: { centerId, childId, membershipId: v.membershipId, service: dto.service, sessionDate: asDate(dto.sessionDate), appointmentId: appointment?.id, actualStart: start, startKey: dto.startKey, createdAt: now, updatedAt: now } });
      await logCenterEvent(tx, centerId, 'clinical.session_started', now, { actorUserId: v.userId, membershipId: v.membershipId, meta: { childId, sessionNoteId: note.id } });
      return { id: note.id };
    });
  }

  private centerDay(date: Date, timezone: string): string {
    if (!Number.isFinite(date.getTime())) throw new UnprocessableEntityException('Enter a valid actual start.');
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const part = (type: string) => parts.find(p => p.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  async save(centerId: string, v: Viewer, id: string, dto: SessionSaveDto) {
    const n = await this.prisma.sessionNote.findFirst({ where: { id, centerId } });
    if (!n) throw new NotFoundException('Session not found');
    return this.clinical.write(centerId, v, n.childId, n.service, async (tx, now) => {
      const fresh = await tx.sessionNote.findUniqueOrThrow({ where: { id } });
      if (fresh.membershipId !== v.membershipId) throw new ForbiddenException('Only the author can edit this session.');
      const m = await tx.membership.findUniqueOrThrow({ where: { id: v.membershipId } });
      if (!m.specialties.includes(fresh.service)) throw new NotFoundException('Specialty not assigned');
      const hash = fingerprint(dto);
      if (fresh.lastMutationKey === dto.mutationKey) {
        if (fresh.lastMutationHash !== hash) throw new ConflictException('Retry key does not match the saved content.');
        return { version: fresh.version, updatedAt: fresh.updatedAt };
      }
      if (fresh.executionStatus === 'COMPLETED' || fresh.version !== dto.version) throw new ConflictException('Session is completed or changed. Keep your text and reload before retrying.');
      if (fresh.appointmentId) {
        const a = await tx.appointment.findFirst({ where: { id: fresh.appointmentId, centerId, childId: fresh.childId, service: fresh.service, membershipId: v.membershipId } });
        if (!a || !['SCHEDULED', 'COMPLETED'].includes(a.status)) throw new ConflictException('This appointment was cancelled or marked no-show.');
      }
      const start = new Date(dto.actualStart), end = dto.actualEnd ? new Date(dto.actualEnd) : null;
      if (fresh.actualStart && start.getTime() !== fresh.actualStart.getTime()) throw new UnprocessableEntityException('Actual start is pinned. Corrections require a future authorized amendment workflow.');
      if (!fresh.actualStart) {
        const center = await tx.center.findUniqueOrThrow({ where: { id: centerId } });
        if (this.centerDay(start, center.timezone) !== fresh.sessionDate.toISOString().slice(0, 10)) throw new UnprocessableEntityException('First actual start must fall on the recorded session date in the center time zone.');
      }
      if (!Number.isFinite(start.getTime()) || (end && !Number.isFinite(end.getTime())) || start > now || (end && (end < start || end > now)) || (dto.executionStatus === 'COMPLETED' && !end)) throw new UnprocessableEntityException('Check actual session times; completion requires an end time, not in the future.');
      if (new Set(dto.activities.map(a => a.id)).size !== dto.activities.length) throw new UnprocessableEntityException('Activity identities must be unique.');
      const old = fresh.activities as unknown as Evidence[];
      const activities: Evidence[] = [];
      for (const a of dto.activities) {
        const previous = old.find(x => x.id === a.id);
        if (previous && previous.templateId !== a.templateId) throw new UnprocessableEntityException('Replace an activity with a new identity.');
        let snapshot = previous?.snapshot;
        if (!snapshot) {
          const t = await tx.activityTemplate.findFirst({ where: { id: a.templateId, service: fresh.service, OR: [{ centerId }, { centerId: null }] } });
          if (!t) throw new UnprocessableEntityException('Choose an activity for this specialty from the library.');
          snapshot = { id: t.id, version: t.version, title: t.title, service: t.service, ageBand: t.ageBand, minutes: t.minutes, materials: t.materials, steps: t.steps, safety: t.safety, source: t.centerId ? 'CENTER_LIBRARY' : 'SYNTHETIC_LIBRARY' };
        }
        if (!!a.planVersionId !== !!a.goalKey) throw new UnprocessableEntityException('A goal requires its exact plan version.');
        let goalSnapshot: unknown = undefined;
        if (a.planVersionId) {
          if (previous?.planVersionId === a.planVersionId && previous.goalKey === a.goalKey) goalSnapshot = previous.goalSnapshot;
          else {
            const p = await tx.planVersion.findFirst({ where: { id: a.planVersionId, centerId, plan: { childId: fresh.childId, centerId, service: fresh.service } } });
            goalSnapshot = (p?.goals as { key: string }[] | undefined)?.find(g => g.key === a.goalKey);
            if (!goalSnapshot) throw new UnprocessableEntityException('Choose a goal from this child’s exact specialty plan version.');
          }
        }
        if (a.completion !== 'COMPLETED' && (a.outcome != null || a.assistance != null)) throw new UnprocessableEntityException('Skipped and not-started activities must not contain performed outcomes or assistance.');
        if (a.completion === 'COMPLETED' && (!a.outcome || !a.assistance || !a.objective.trim())) throw new UnprocessableEntityException('Performed activities require objective, outcome and assistance separately.');
        if (dto.executionStatus === 'COMPLETED' && a.completion === 'NOT_STARTED') throw new UnprocessableEntityException('Review every activity before completing.');
        activities.push({ ...a, snapshot, goalSnapshot, authorId: previous?.authorId ?? v.userId, createdAt: previous?.createdAt ?? now.toISOString(), updatedAt: now.toISOString(), position: activities.length, evidenceKind: 'UNVALIDATED_SESSION_ACTIVITY' });
      }
      if (dto.attendance === 'NO_SHOW' && activities.some(a => a.completion === 'COMPLETED' || Number(a.minutes) > 0)) throw new UnprocessableEntityException('A no-show cannot contain performed activities.');
      const r = await tx.sessionNote.updateMany({ where: { id, centerId, childId: fresh.childId, membershipId: v.membershipId, service: fresh.service, version: dto.version, executionStatus: 'IN_PROGRESS' }, data: { sections: json(dto.sections), activities: json(activities), actualStart: start, actualEnd: end, attendance: dto.attendance, executionStatus: dto.executionStatus, version: { increment: 1 }, updatedAt: now, lastMutationKey: dto.mutationKey, lastMutationHash: hash } });
      if (r.count !== 1) throw new ConflictException('Session changed. Reload before retrying.');
      await logCenterEvent(tx, centerId, dto.executionStatus === 'COMPLETED' ? 'clinical.session_completed' : 'clinical.session_saved', now, { actorUserId: v.userId, membershipId: v.membershipId, meta: { childId: fresh.childId, sessionNoteId: id, version: dto.version + 1, activities: activities.length, firstActualStart: fresh.actualStart ? undefined : start.toISOString() } });
      return { version: dto.version + 1, updatedAt: now };
    });
  }
}
