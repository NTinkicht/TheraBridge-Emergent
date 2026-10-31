import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Tx, logCenterEvent, uniq } from '../centers/history';
import { PrismaService } from '../prisma/prisma.service';
import type { Viewer } from '../operations/children.service';
import { TrialService } from '../operations/trial.service';
import { asDate, day } from './clinical.service';
import type { FeedbackQueryDto, OutcomeDto } from './clinical.dto';

const DAY = 86_400_000;
export const CHOICES = ['COMPLETED', 'NEEDED_HELP', 'NOT_COMPLETED', 'SKIPPED'] as const;
export const practiceEnabled = () => process.env.FAMILY_PRACTICE_DEMO === 'true' && !['production', 'staging'].includes(process.env.DEPLOYMENT_ENV ?? '');
const DEMO_OFF = 'Recording practice is switched off. It is a synthetic demonstration only.';
const GATES = () => ({ practiceDemo: practiceEnabled(), clinicalPlanRelease: false, freeText: false, media: false, consentDependent: false });
// Fixed synthetic sample schedule. Weekday index: Monday = 0.
const SAMPLE = [{ frequency: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] }, { frequency: '3 times a week (Mon, Wed, Fri)', days: [0, 2, 4] }];
const weekday = (d: string) => (asDate(d).getUTCDay() + 6) % 7;
const addDays = (d: string, n: number) => day(new Date(asDate(d).getTime() + n * DAY));

@Injectable()
export class PracticeService {
  constructor(private readonly prisma: PrismaService, private readonly trial: TrialService) {}

  private async today(centerId: string) {
    const c = await this.prisma.center.findUniqueOrThrow({ where: { id: centerId }, select: { timezone: true } });
    return new Intl.DateTimeFormat('en-CA', { timeZone: c.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(this.trial.now());
  }

  // Active, unrevoked links only: removing a guardian link cuts access immediately.
  private links(centerId: string, v: Viewer, childId?: string) {
    return this.prisma.guardianLink.findMany({ where: { centerId, userId: v.userId, removedAt: null, child: { status: 'ACTIVE' }, ...(childId ? { childId } : {}) }, include: { child: true }, orderBy: { createdAt: 'asc' } });
  }

  private async samples() {
    return (await this.prisma.activityTemplate.findMany({ where: { centerId: null }, orderBy: { title: 'asc' } }));
  }

  private plan(services: string[], all: Awaited<ReturnType<PracticeService['samples']>>) {
    return all.filter((t) => services.includes(t.service)).slice(0, 4).map((t, i) => ({ t, ...SAMPLE[i % SAMPLE.length] }));
  }

  async week(centerId: string, v: Viewer, weekOf?: string) {
    const today = await this.today(centerId);
    const ref = weekOf ?? today;
    const start = addDays(ref, -weekday(ref));
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const [links, all] = await Promise.all([this.links(centerId, v), this.samples()]);
    const outs = await this.prisma.practiceOutcome.findMany({ where: { centerId, guardianLinkId: { in: links.map((l) => l.id) }, practiceDate: { gte: asDate(days[0]), lte: asDate(days[6]) } } });
    const earliest = addDays(today, -6);
    return {
      sample: true, released: false, gates: GATES(), today, week: { start, days }, choices: CHOICES,
      children: links.map((l) => ({
        id: l.child.id, name: l.child.preferredName ?? l.child.firstName,
        activities: this.plan(l.child.services, all).map(({ t, frequency, days: wd }) => ({
          id: t.id, title: t.title, service: t.service, ageBand: t.ageBand, minutes: t.minutes, materials: t.materials, steps: t.steps, safety: t.safety, frequency,
          slots: days.filter((d) => wd.includes(weekday(d))).map((d) => {
            const o = outs.find((x) => x.guardianLinkId === l.id && x.templateId === t.id && day(x.practiceDate) === d);
            return { date: d, status: o ? o.choice : d > today ? 'UPCOMING' : 'PENDING', outcomeId: o?.id ?? null, recordable: !o && d <= today && d >= earliest };
          }),
        })),
      })),
    };
  }

  async record(centerId: string, v: Viewer, dto: OutcomeDto) {
    if (!practiceEnabled()) throw new ForbiddenException(DEMO_OFF);
    const view = (o: { id: string; choice: string; practiceDate: Date; recordedAt: Date }, replayed: boolean) => ({ id: o.id, choice: o.choice, practiceDate: day(o.practiceDate), recordedAt: o.recordedAt, replayed, synthetic: true });
    const replay = async (tx: Tx, linkId: string) => {
      const o = await tx.practiceOutcome.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
      if (!o) return null;
      // A replacement link must not restore access to a removed link's submissions.
      if (o.recordedById === v.userId && (o.centerId !== centerId || o.guardianLinkId !== linkId)) throw new NotFoundException('Child not found');
      if (o.recordedById !== v.userId || o.childId !== dto.childId || o.templateId !== dto.templateId || day(o.practiceDate) !== dto.practiceDate || o.choice !== dto.choice) throw new ConflictException('This submission was already used for a different response. Start again from the activity.');
      return view(o, true);
    };
    return this.prisma.$transaction(async (tx) => {
      // Center first, matching existing child/trial writers. Removal intentionally
      // bypasses trial expiry and UPDATEs the link: FOR UPDATE conflicts with that
      // UPDATE even though removal does not lock the center. READ COMMITTED reads
      // after the wait see its committed removedAt; retain the lock through commit.
      // NO KEY UPDATE still serializes center writers but allows removal's
      // center_event foreign-key KEY SHARE lock (avoids a center/link deadlock).
      await tx.$queryRaw`SELECT id FROM center WHERE id = ${centerId}::uuid FOR NO KEY UPDATE`;
      const links = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM guardian_link
        WHERE center_id = ${centerId}::uuid AND child_id = ${dto.childId}::uuid
          AND user_id = ${v.userId}::uuid AND removed_at IS NULL
        FOR UPDATE`;
      const link = links[0] && await tx.guardianLink.findFirst({ where: { id: links[0].id, centerId, childId: dto.childId, userId: v.userId, removedAt: null, child: { status: 'ACTIVE' } }, include: { child: true } });
      if (!link) throw new NotFoundException('Child not found');
      const prior = await replay(tx, link.id);
      // Existing policy: a confirmed replay is a read, permitted after trial
      // expiry or the recording window. Only genuinely new outcomes are writes.
      if (prior) return prior;
      const now = this.trial.now();
      await this.trial.assertWritable(tx, centerId, now);
      const today = await this.today(centerId);
      const slot = this.plan(link.child.services, await tx.activityTemplate.findMany({ where: { centerId: null }, orderBy: { title: 'asc' } })).find((p) => p.t.id === dto.templateId);
      if (!slot) throw new NotFoundException('This activity is not in your sample plan.');
      if (!slot.days.includes(weekday(dto.practiceDate))) throw new UnprocessableEntityException('This activity is not planned for that day.');
      if (dto.practiceDate > today) throw new UnprocessableEntityException('You can’t record an activity for a future day.');
      if (dto.practiceDate < addDays(today, -6)) throw new UnprocessableEntityException('Outcomes can only be recorded for the last 7 days.');
      // ON CONFLICT does not abort the transaction, so even a globally colliding
      // key is resolved under the same authorization lock (no unlocked fallback).
      const inserted = await tx.practiceOutcome.createMany({ data: [{ centerId, childId: dto.childId, guardianLinkId: link.id, templateId: dto.templateId, service: slot.t.service, practiceDate: asDate(dto.practiceDate), choice: dto.choice, idempotencyKey: dto.idempotencyKey, recordedById: v.userId, recordedAt: now }], skipDuplicates: true });
      if (!inserted.count) {
        const again = await replay(tx, link.id);
        if (again) return again;
        throw new ConflictException('An outcome is already recorded for this activity on this day.');
      }
      const o = await tx.practiceOutcome.findUniqueOrThrow({ where: { idempotencyKey: dto.idempotencyKey } });
      await logCenterEvent(tx, centerId, 'family.practice_recorded', now, { actorUserId: v.userId, meta: { childId: dto.childId, outcomeId: o.id, synthetic: true } });
      return view(o, false);
    });
  }

  async byKey(centerId: string, v: Viewer, key: string) {
    const o = await this.prisma.practiceOutcome.findFirst({ where: { centerId, idempotencyKey: key, recordedById: v.userId, guardianLink: { centerId, userId: v.userId, removedAt: null, child: { centerId, status: 'ACTIVE' } } } });
    if (!o) throw new NotFoundException('No outcome was recorded with this submission.');
    return { id: o.id, choice: o.choice, practiceDate: day(o.practiceDate), recordedAt: o.recordedAt, synthetic: true };
  }

  async history(centerId: string, v: Viewer, childId?: string) {
    const links = await this.links(centerId, v, childId);
    const rows = await this.prisma.practiceOutcome.findMany({ where: { centerId, guardianLinkId: { in: links.map((l) => l.id) } }, include: { template: { select: { title: true } } }, orderBy: [{ practiceDate: 'desc' }, { recordedAt: 'desc' }], take: 200 });
    return { sample: true, items: rows.map((o) => ({ id: o.id, childId: o.childId, childName: links.find((l) => l.id === o.guardianLinkId)!.child.preferredName ?? links.find((l) => l.id === o.guardianLinkId)!.child.firstName, activity: o.template.title, practiceDate: day(o.practiceDate), choice: o.choice, recordedAt: o.recordedAt, seenByCareTeam: !!o.acknowledgedAt })) };
  }

  private async pairs(centerId: string, v: Viewer) {
    return v.role === 'THERAPIST' ? this.prisma.careAssignment.findMany({ where: { centerId, membershipId: v.membershipId, endedAt: null }, select: { childId: true, service: true } }) : null;
  }

  async inbox(centerId: string, v: Viewer, q: FeedbackQueryDto) {
    if (q.from && q.to && q.from > q.to) throw new UnprocessableEntityException('The start date must be on or before the end date.');
    const pairs = await this.pairs(centerId, v);
    const scope: Prisma.PracticeOutcomeWhereInput = pairs ? { OR: pairs.length ? pairs.map((p) => ({ childId: p.childId, service: p.service })) : [{ id: '00000000-0000-0000-0000-000000000000' }] } : {};
    const base: Prisma.PracticeOutcomeWhereInput = { centerId, ...scope };
    const rows = await this.prisma.practiceOutcome.findMany({
      where: { ...base, ...(q.childId ? { childId: q.childId } : {}), ...(q.templateId ? { templateId: q.templateId } : {}), ...(q.choice ? { choice: q.choice } : {}),
        ...(q.status === 'new' ? { acknowledgedAt: null } : q.status === 'acknowledged' ? { acknowledgedAt: { not: null } } : {}),
        ...(q.from || q.to ? { practiceDate: { ...(q.from ? { gte: asDate(q.from) } : {}), ...(q.to ? { lte: asDate(q.to) } : {}) } } : {}) },
      include: { template: { select: { title: true } }, guardianLink: { select: { displayName: true, relationship: true, removedAt: true } } },
      orderBy: [{ recordedAt: 'desc' }], take: 300,
    });
    const all = await this.prisma.practiceOutcome.findMany({ where: base, select: { childId: true, templateId: true, acknowledgedAt: true, template: { select: { title: true } } } });
    const kids = await this.prisma.child.findMany({ where: { centerId, id: { in: uniq([...all.map((r) => r.childId), ...(pairs ?? []).map((p) => p.childId)]) } } });
    const name = (id: string) => { const k = kids.find((x) => x.id === id); return k ? `${k.preferredName ?? k.firstName} ${k.lastName}` : ''; };
    const ackers = await this.prisma.membership.findMany({ where: { id: { in: uniq(rows.map((r) => r.acknowledgedById).filter(Boolean) as string[]) } }, select: { id: true, user: { select: { displayName: true } } } });
    return {
      synthetic: true, notClinical: true, canAcknowledge: v.role === 'THERAPIST',
      children: kids.map((k) => ({ id: k.id, name: name(k.id) })),
      activities: [...new Map(all.map((r) => [r.templateId, r.template.title])).entries()].map(([id, title]) => ({ id, title })),
      counts: { total: all.length, new: all.filter((r) => !r.acknowledgedAt).length },
      items: rows.map((o) => ({ id: o.id, childId: o.childId, childName: name(o.childId), activity: o.template.title, templateId: o.templateId, service: o.service, practiceDate: day(o.practiceDate), choice: o.choice, recordedAt: o.recordedAt, guardian: o.guardianLink.displayName, relationship: o.guardianLink.relationship, guardianAccessRemoved: !!o.guardianLink.removedAt, acknowledgedAt: o.acknowledgedAt, acknowledgedBy: ackers.find((a) => a.id === o.acknowledgedById)?.user.displayName ?? null })),
    };
  }

  async acknowledge(centerId: string, v: Viewer, id: string) {
    if (v.role !== 'THERAPIST') throw new ForbiddenException('Only an assigned therapist can acknowledge practice feedback.');
    const now = this.trial.now();
    const o = await this.prisma.practiceOutcome.findFirst({ where: { id, centerId } });
    const pairs = (await this.pairs(centerId, v))!;
    if (!o || !pairs.some((p) => p.childId === o.childId && p.service === o.service)) throw new NotFoundException('Practice outcome not found');
    if (o.acknowledgedAt) return { id, acknowledgedAt: o.acknowledgedAt, already: true };
    return this.prisma.$transaction(async (tx) => {
      await this.trial.assertWritable(tx, centerId, now);
      const n = await tx.practiceOutcome.updateMany({ where: { id, centerId, childId: o.childId, service: o.service, acknowledgedAt: null }, data: { acknowledgedAt: now, acknowledgedById: v.membershipId } });
      if (n.count === 1) await logCenterEvent(tx, centerId, 'clinical.practice_acknowledged', now, { actorUserId: v.userId, meta: { childId: o.childId, outcomeId: id, synthetic: true } });
      const x = await tx.practiceOutcome.findUniqueOrThrow({ where: { id } });
      return { id, acknowledgedAt: x.acknowledgedAt, already: n.count !== 1 };
    });
  }
}
