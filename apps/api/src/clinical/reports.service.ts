import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, type ProgressReport } from '@prisma/client';
import { Tx, logCenterEvent, uniq } from '../centers/history';
import { PrismaService } from '../prisma/prisma.service';
import type { Viewer } from '../operations/children.service';
import { TrialService } from '../operations/trial.service';
import { ClinicalService, LOCKED, asDate, day } from './clinical.service';
import { EDITABLE, fingerprint } from './governance-core';
import { traceSavedStatements } from './report-statement-trace';
import type { ProgressQueryDto, ReportCreateDto, ReportSaveDto, ReviewDto, ReportToPlanDraftDto } from './clinical.dto';

const DAY = 86_400_000;
type Goal = { key: string; title: string; measure: string; baseline: number; target: number };
type Point = { date: string; value: number; note: string | null; observationId?: string; sessionNoteId?: string };
type Obs = { observedOn: Date; value: number; note: string | null; id?: string; sessionNoteId?: string | null };
type Sections = Record<string, string>;
type Note = { by: string; byName: string; at: string; comment: string; kind: 'comment' | 'returned' };
export type GoalEvidence = Goal & { points: Point[]; prior: Point | null; status: 'none' | 'insufficient' | 'recorded' };
export type Evidence = Awaited<ReturnType<ReportsService['evidence']>>;

// Progress is only ever what was recorded: points inside the period, plus the last value before it for comparison.
export function goalEvidence(g: Goal, rows: Obs[], from: Date): GoalEvidence {
  const all = rows.map((o) => ({ date: day(o.observedOn), value: o.value, note: o.note, ...(o.id ? { observationId: o.id } : {}), ...(o.sessionNoteId ? { sessionNoteId: o.sessionNoteId } : {}) }));
  const start = day(from);
  const points = all.filter((p) => p.date >= start);
  const before = all.filter((p) => p.date < start);
  return { ...g, points, prior: before.length ? before[before.length - 1] : null, status: points.length === 0 ? 'none' : points.length < 2 ? 'insufficient' : 'recorded' };
}

function goalLine(g: GoalEvidence) {
  const head = `${g.title}\nBaseline ${g.baseline}, target ${g.target} (${g.measure}).`;
  if (g.status === 'none') return `${head}\nNo observations recorded in this period.`;
  const [f, l] = [g.points[0], g.points[g.points.length - 1]];
  if (g.status === 'insufficient') return `${head}\nOne observation recorded in this period (${f.date}: ${f.value}). Not enough recorded data to describe change.`;
  return `${head}\n${g.points.length} observations recorded between ${f.date} and ${l.date}. First recorded value ${f.value}; most recent ${l.value}.`;
}

// Factual starting text only: copied assessment summaries and recorded values. Interpretation is left blank for the clinician.
const prefill = (e: Evidence): Sections => ({
  summary: '',
  assessment: e.assessments.map((a) => `Initial assessment (${a.assessedOn}): ${a.summary}`).join('\n\n'),
  goals: e.goals.map(goalLine).join('\n\n'),
  sessions: `${e.sessions.drafts} session drafts and ${e.sessions.completedVisits} completed visits recorded in this period.`,
  recommendations: '',
  familySummary: '',
});

export const FAMILY_PROGRESS_SAMPLE = {
  sample: true, released: false, childName: 'Juniper (sample child)', service: 'speech', period: { from: '2026-07-01', to: '2026-09-30' },
  message: 'This is a made-up example to show how a progress update could look one day. Juniper is not a real child, and none of this comes from your child’s records.',
  goals: [
    { title: 'Uses two-word phrases during play', measure: 'percent', baseline: 20, target: 80, status: 'recorded', points: [{ date: '2026-07-08', value: 25 }, { date: '2026-07-29', value: 30 }, { date: '2026-08-19', value: 40 }, { date: '2026-09-09', value: 45 }, { date: '2026-09-30', value: 55 }] },
    { title: 'Takes turns in a simple game', measure: 'count', baseline: 1, target: 5, status: 'insufficient', points: [{ date: '2026-09-16', value: 2 }] },
    { title: 'Names familiar objects in pictures', measure: 'count', baseline: 3, target: 15, status: 'none', points: [] },
  ],
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService, private readonly trial: TrialService, private readonly clinical: ClinicalService) {}

  async evidence(db: Tx | PrismaService, centerId: string, childId: string, service: string, from: Date, to: Date) {
    const [assessments, plans, drafts, completedVisits] = await Promise.all([
      db.assessment.findMany({ where: { centerId, childId, service, assessedOn: { lte: to } }, orderBy: { assessedOn: 'asc' } }),
      db.therapyPlan.findMany({ where: { centerId, childId, service }, include: { versions: { where: { status: { notIn: ['WITHDRAWN', 'SUPERSEDED'] } }, orderBy: { number: 'desc' } } }, orderBy: { createdAt: 'asc' } }),
      db.sessionNote.count({ where: { centerId, childId, service, sessionDate: { gte: from, lte: to } } }),
      db.appointment.count({ where: { centerId, childId, service, status: 'COMPLETED', startsAt: { gte: from, lt: new Date(to.getTime() + DAY) } } }),
    ]);
    const selected = plans.flatMap(plan => {
      // Withdrawn and superseded versions are preserved in history but cannot be
      // selected as active evidence for a new report or goal summary.
      const current = plan.versions.find(v => v.status !== 'SUPERSEDED' && v.status !== 'WITHDRAWN');
      return current ? [{ plan, current }] : [];
    });
    const obs = selected.length ? await db.observation.findMany({ where: { centerId, childId, planVersionId: { in: selected.map(p => p.current.id) }, observedOn: { lte: to } }, orderBy: [{ observedOn: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }] }) : [];
    const definitions = selected.map(({ plan, current }) => ({ id: plan.id, title: plan.title, versionId: current.id, versionNumber: current.number, status: current.status }));
    // A checkpoint is an immutable, internal clinician review of one exact
    // version and goal. Expose only source identity / fingerprint here, not
    // its narrative, and never turn it into an outcome or approval.
    const checkpoints = selected.flatMap(({ current }) => {
      const keys = new Set((current.goals as Goal[]).map(g => g.key));
      return (Array.isArray(current.reviewNotes) ? current.reviewNotes : []).flatMap((raw, index) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
        const item = raw as Record<string, unknown>;
        if (item.kind !== 'GOAL_CHECKPOINT' || typeof item.goalKey !== 'string' || !keys.has(item.goalKey) ||
            typeof item.reviewedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.reviewedOn) ||
            item.reviewedOn < day(from) || item.reviewedOn > day(to) || typeof item.at !== 'string') return [];
        return [{ ref: `goalCheckpoint:${current.id}:${index}`,
          planVersionId: current.id, goalKey: item.goalKey, reviewedOn: item.reviewedOn,
          fingerprint: fingerprint({ planVersionId: current.id, index, goalKey: item.goalKey,
            reviewedOn: item.reviewedOn, at: item.at, authorId: item.authorId,
            summary: item.summary, observationIds: item.observationIds }) }];
      });
    });

    return {
      period: { from: day(from), to: day(to) },
      assessments: assessments.map((a) => ({ id: a.id, assessedOn: day(a.assessedOn), summary: a.summary })),
      plan: definitions.length === 1 ? definitions[0] : null,
      plans: definitions,
      goals: selected.flatMap(({plan, current}) => (current.goals as Goal[]).map(g => ({ planId: plan.id, planTitle: plan.title, planVersionId: current.id, ...goalEvidence(g, obs.filter(o => o.planVersionId === current.id && o.goalKey === g.key), from) }))),
      checkpoints,
      sessions: { drafts, completedVisits },
    };
  }

  private period(fromS: string | undefined, toS: string | undefined, fallbackDays: number) {
    const today = asDate(day(this.trial.now()));
    const to = toS ? asDate(toS) : today;
    const from = fromS ? asDate(fromS) : new Date(to.getTime() - (fallbackDays - 1) * DAY);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new UnprocessableEntityException('Enter valid dates.');
    if (from > to) throw new UnprocessableEntityException('The start of the period must be on or before its end.');
    if (to.getTime() - from.getTime() > 731 * DAY) throw new UnprocessableEntityException('Choose a period of two years or less.');
    return { from, to, today };
  }

  async dashboard(centerId: string, v: Viewer, q: ProgressQueryDto) {
    const { from, to } = this.period(q.from, q.to, 90);
    const pairs = v.role === 'THERAPIST' ? await this.clinical.therapistAssignments(this.prisma, centerId, v) : null;
    const kids = await this.prisma.child.findMany({ where: { centerId, status: 'ACTIVE', ...(pairs ? { id: { in: uniq(pairs.map((p) => p.childId)) } } : {}) }, orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }] });
    const name = (id: string) => { const k = kids.find((x) => x.id === id)!; return `${k.preferredName ?? k.firstName} ${k.lastName}`; };
    const scope = q.childId ? kids.filter((k) => k.id === q.childId) : kids;
    const plans = (await this.prisma.therapyPlan.findMany({ where: { centerId, childId: { in: scope.map((k) => k.id) }, ...(q.service ? { service: q.service } : {}) }, include: { versions: { where: { status: { notIn: ['WITHDRAWN', 'SUPERSEDED'] } }, orderBy: { number: 'desc' } } }, orderBy: { createdAt: 'asc' } }))
      .filter((p) => !pairs || pairs.some((x) => x.childId === p.childId && x.service === p.service));
    const obs = await this.prisma.observation.findMany({ where: { centerId, planVersionId: { in: plans.flatMap((p) => p.versions.map((x) => x.id)) }, observedOn: { lte: to } }, orderBy: [{ observedOn: 'asc' }, { createdAt: 'asc' }] });
    const goals = plans.flatMap((p) => {
      const cur = p.versions.find((x) => x.status !== 'SUPERSEDED' && x.status !== 'WITHDRAWN');
      if (!cur) return [];
      const ids = new Set([cur.id]);
      return ((cur?.goals ?? []) as Goal[]).filter((g) => !q.goalKey || g.key === q.goalKey)
        .map((g) => ({ childId: p.childId, childName: name(p.childId), service: p.service, planId: p.id, planVersionId: cur.id, planTitle: p.title, ...goalEvidence(g, obs.filter((o) => o.goalKey === g.key && ids.has(o.planVersionId)), from) }));
    });
    return {
      synthetic: true, period: { from: day(from), to: day(to) },
      children: kids.map((k) => ({ id: k.id, name: name(k.id), services: pairs ? uniq(pairs.filter((x) => x.childId === k.id).map((x) => x.service)) : k.services })),
      goals,
      summary: { goals: goals.length, recorded: goals.filter((g) => g.status === 'recorded').length, insufficient: goals.filter((g) => g.status === 'insufficient').length, none: goals.filter((g) => g.status === 'none').length },
    };
  }

  private async names(ids: string[]) {
    const users = await this.prisma.user.findMany({ where: { id: { in: uniq(ids) } }, select: { id: true, displayName: true } });
    return (id: string) => users.find((u) => u.id === id)?.displayName ?? '';
  }

  private async report(centerId: string, v: Viewer, id: string) {
    const r = await this.prisma.progressReport.findFirst({ where: { id, centerId } });
    if (!r) throw new NotFoundException('Report not found');
    try {
      await this.clinical.child(this.prisma, centerId, v, r.childId, v.role === 'THERAPIST' ? r.service : undefined);
    } catch (error) {
      if (error instanceof NotFoundException) throw new NotFoundException('Report not found');
      throw error;
    }
    return r;
  }

  // TB-EM-026: Supervisor-only operational inbox, never a clinical authorization
  // or approval endpoint. Only IN_REVIEW metadata from ACTIVE children is returned.
  async reviewQueue(centerId: string, v: Viewer, q: { childId?: string; service?: string; search?: string; page?: number }) {
    if (v.role !== 'CLINICAL_SUPERVISOR') throw new ForbiddenException('Clinical supervisor access required.');
    const page = q.page ?? 1;
    const pageSize = 25;
    const where = Prisma.sql`r.center_id = ${centerId}::uuid
      AND ch.center_id = ${centerId}::uuid AND ch.status = 'ACTIVE'
      AND r.status = 'IN_REVIEW'`;
    const from = Prisma.sql`FROM progress_report r
      INNER JOIN child ch ON ch.id = r.child_id AND ch.center_id = r.center_id
      INNER JOIN membership m ON m.id = r.membership_id AND m.center_id = r.center_id
      INNER JOIN app_user u ON u.id = m.user_id`;
    const filtered = Prisma.sql`${where}
      ${q.childId ? Prisma.sql`AND r.child_id = ${q.childId}::uuid` : Prisma.empty}
      ${q.service ? Prisma.sql`AND r.service = ${q.service}` : Prisma.empty}
      ${q.search ? Prisma.sql`AND (
        STRPOS(LOWER(TRANSLATE(r.title, 'áàâäãåéèêëíìîïóòôöõúùûüýÿñçÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÝŸÑÇ',
          'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYYNC')), ${q.search.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}) > 0
        OR STRPOS(LOWER(TRANSLATE(CONCAT(COALESCE(ch.preferred_name, ch.first_name), ' ', ch.last_name),
          'áàâäãåéèêëíìîïóòôöõúùûüýÿñçÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÝŸÑÇ',
          'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYYNC')), ${q.search.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}) > 0
        OR STRPOS(LOWER(TRANSLATE(u.display_name,
          'áàâäãåéèêëíìîïóòôöõúùûüýÿñçÁÀÂÄÃÅÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÝŸÑÇ',
          'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYYNC')), ${q.search.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()}) > 0
        OR STRPOS(LOWER(r.service), LOWER(${q.search})) > 0
        OR (r.service = 'speech' AND STRPOS(LOWER('speech & language'), LOWER(${q.search})) > 0)
        OR (r.service = 'occupational' AND STRPOS(LOWER('occupational therapy'), LOWER(${q.search})) > 0)
        OR (r.service = 'physical' AND STRPOS(LOWER('physical therapy'), LOWER(${q.search})) > 0)
        OR (r.service = 'behavioral' AND STRPOS(LOWER('behavioral therapy'), LOWER(${q.search})) > 0)
        OR (r.service = 'feeding' AND STRPOS(LOWER('feeding therapy'), LOWER(${q.search})) > 0)
        OR (r.service = 'developmental' AND STRPOS(LOWER('developmental therapy'), LOWER(${q.search})) > 0)
      )` : Prisma.empty}`;
    type Count = { total: number };
    type Row = { id: string; childId: string; childName: string; title: string;
      service: string; author: string; periodStart: Date; periodEnd: Date; updatedAt: Date };
    // SQL JOIN avoids materializing every ACTIVE child UUID; all bind values are
    // parameterized through Prisma.sql. Do not expose report sections/evidence.
    const [all, filteredCounts, reports] = await Promise.all([
      this.prisma.$queryRaw<Count[]>(Prisma.sql`SELECT COUNT(*)::int AS total ${from} WHERE ${where}`),
      this.prisma.$queryRaw<Count[]>(Prisma.sql`SELECT COUNT(*)::int AS total ${from} WHERE ${filtered}`),
      this.prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT r.id, r.child_id AS "childId",
          CONCAT(COALESCE(ch.preferred_name, ch.first_name), ' ', ch.last_name) AS "childName",
          r.title, r.service, u.display_name AS author,
          r.period_start AS "periodStart", r.period_end AS "periodEnd",
          r.updated_at AS "updatedAt"
        ${from} WHERE ${filtered}
        ORDER BY r.updated_at DESC, r.id ASC
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`),
    ]);
    const filteredTotal = filteredCounts[0]?.total ?? 0;
    return {
      synthetic: true, released: false, total: all[0]?.total ?? 0, filteredTotal,
      page, pageSize, hasMore: page * pageSize < filteredTotal,
      items: reports.map((r) => ({
        id: r.id, childId: r.childId, childName: r.childName,
        title: r.title, service: r.service, status: 'IN_REVIEW' as const,
        author: r.author, periodStart: day(r.periodStart), periodEnd: day(r.periodEnd), updatedAt: r.updatedAt,
      })),
    };
  }

  async list(centerId: string, v: Viewer, childId: string, offset = 0) {
    await this.clinical.child(this.prisma, centerId, v, childId);
    const services = v.role === 'THERAPIST' ? (await this.clinical.therapistAssignments(this.prisma, centerId, v, childId)).map((a) => a.service) : null;
    const batch = await this.prisma.progressReport.findMany({ where: { centerId, childId, ...(services ? { service: { in: services } } : {}) }, include: { _count: { select: { versions: true } } }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: offset, take: 201 });
    const hasMore = batch.length > 200;
    const rows = batch.slice(0, 200);
    const team = await this.prisma.membership.findMany({ where: { id: { in: uniq(rows.map((r) => r.membershipId)) } }, select: { id: true, user: { select: { displayName: true } } } });
    return { items: rows.map((r) => ({ id: r.id, title: r.title, service: r.service, periodStart: day(r.periodStart), periodEnd: day(r.periodEnd), status: r.status, versions: r._count.versions, author: team.find((t) => t.id === r.membershipId)?.user.displayName ?? '', mine: r.membershipId === v.membershipId, updatedAt: r.updatedAt })),
      hasMore, nextOffset: hasMore ? offset + rows.length : null };
  }

  async create(centerId: string, v: Viewer, childId: string, dto: ReportCreateDto) {
    const { from, to, today } = this.period(dto.periodStart, dto.periodEnd, 90);
    if (to > today) throw new UnprocessableEntityException('A report period cannot end in the future.');
    return this.clinical.write(centerId, v, childId, dto.service, async (tx, now) => {
      const ev = await this.evidence(tx, centerId, childId, dto.service, from, to);
      const sections = prefill(ev);
      const r = await tx.progressReport.create({ data: { centerId, childId, membershipId: v.membershipId, service: dto.service, title: dto.title.trim(), periodStart: from, periodEnd: to, sections, createdAt: now, updatedAt: now } });
      await tx.reportVersion.create({ data: { reportId: r.id, centerId, number: 1, kind: 'CREATED', sections,
        evidence: { ...ev, statementDecisionIds: [] } as unknown as Prisma.InputJsonValue, authorId: v.userId, createdAt: now } });
      await logCenterEvent(tx, centerId, 'clinical.report_drafted', now, { actorUserId: v.userId, meta: { childId, reportId: r.id } });
      return { id: r.id };
    });
  }

  // Milestone 1 / TB-EM-030: clinician-initiated handoff from ONE saved
  // evidence snapshot into a NEW internal draft. No report prose, outcome
  // measurement or clinical recommendation is interpreted or transferred.
  async createPlanDraftFromReport(centerId: string, v: Viewer, reportId: string, dto: ReportToPlanDraftDto) {
    // Lock current child/service assignment and trial status with the normal
    // clinician write transaction. No administrative or supervisor bypass.
    const r = await this.report(centerId, v, reportId);
    return this.clinical.write(centerId, v, r.childId, r.service, async (tx, now) => {
      await tx.$queryRaw`SELECT id FROM progress_report WHERE id=${reportId}::uuid AND center_id=${centerId}::uuid FOR SHARE`;
      const current = await tx.progressReport.findFirst({ where: { id: reportId, centerId } });
      if (!current) throw new NotFoundException('Report not found');
      if (current.membershipId !== v.membershipId) throw new ForbiddenException('Only the report author can prepare its linked plan draft.');

      const snapshot = await tx.reportVersion.findFirst({
        where: { id: dto.sourceReportVersionId, reportId, centerId },
        select: { id: true, number: true, evidence: true },
      });
      if (!snapshot) throw new NotFoundException('Saved report version not found');
      // A caller-chosen UUID is the plan ID. The immutable audit event binds
      // retries to the same exact inputs; no second plan on a retried POST.
      const requestFingerprint = fingerprint({
        reportId, sourceReportVersionId: dto.sourceReportVersionId,
        title: dto.title.trim(), selectedGoals: dto.selectedGoals,
      });
      // Serialize concurrent retries using the same request UUID. Without
      // this lock, both transactions may see no plan and the loser would get
      // a uniqueness exception instead of the same successful receipt.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${centerId}), hashtext(${requestFingerprint}))::text AS lock_receipt`;
      const existing = await tx.therapyPlan.findUnique({ where: { id: dto.requestId } });
      if (existing) {
        const event = await tx.centerEvent.findFirst({
          where: { centerId, type: 'clinical.report_plan_drafted', meta: { path: ['planId'], equals: dto.requestId } },
        });
        const meta = event?.meta as { requestFingerprint?: string } | undefined;
        if (existing.centerId !== centerId || existing.childId !== current.childId ||
            existing.service !== current.service || existing.createdById !== v.userId ||
            meta?.requestFingerprint !== requestFingerprint)
          throw new ConflictException('This request identifier has already been used.');
        const version = await tx.planVersion.findFirstOrThrow({ where: { centerId, planId: existing.id }, orderBy: { number: 'asc' } });
        return { id: existing.id, versionId: version.id, reused: true, released: false };
      }

      // Recover a committed response even if the browser was reloaded and
      // produced a NEW UUID for an otherwise identical report-to-plan intent.
      // The append-only event is the durable source-to-target record.
      const matchingEvent = await tx.centerEvent.findFirst({
        where: { centerId, type: 'clinical.report_plan_drafted',
          meta: { path: ['requestFingerprint'], equals: requestFingerprint } },
      });
      if (matchingEvent) {
        const meta = matchingEvent.meta as { planId?: string; planVersionId?: string };
        const samePlan = meta.planId ? await tx.therapyPlan.findFirst({
          where: { id: meta.planId, centerId, childId: current.childId, service: current.service, createdById: v.userId },
        }) : null;
        if (!samePlan || !meta.planVersionId) throw new ConflictException('A matching handoff is being reconciled.');
        return { id: samePlan.id, versionId: meta.planVersionId, reused: true, released: false };
      }

      if (!EDITABLE.includes(current.status))
        throw new ConflictException('The report is not an editable internal draft.');
      if (current.version !== dto.reportRevision)
        throw new ConflictException('The report changed. Reload and review the saved evidence snapshot.');

      const evidence = snapshot.evidence as { goals?: unknown } | null;
      if (!Array.isArray(evidence?.goals)) throw new UnprocessableEntityException('Saved report evidence does not contain selectable goals.');
      const refs = dto.selectedGoals.map(g => g.planVersionId + ':' + g.goalKey);
      if (new Set(refs).size !== refs.length) throw new UnprocessableEntityException('Select each recorded goal only once.');
      // Exact version+key is essential: a goal key alone can be reused in
      // unrelated plans/versions with incompatible units or definitions.
      const candidates = evidence.goals as Array<Record<string, unknown>>;
      const goals = dto.selectedGoals.map((ref, index) => {
        const matches = candidates.filter(g => g && g.planVersionId === ref.planVersionId && g.key === ref.goalKey);
        if (matches.length !== 1) throw new UnprocessableEntityException('Selected goal is not in this saved report snapshot.');
        const g = matches[0];
        if (typeof g.title !== 'string' || g.title.length < 3 || g.title.length > 200 ||
            !['percent','count','level'].includes(String(g.measure)) ||
            typeof g.baseline !== 'number' || !Number.isFinite(g.baseline) ||
            typeof g.target !== 'number' || !Number.isFinite(g.target))
          throw new UnprocessableEntityException('A saved goal definition is incomplete or invalid.');
        // New keys intentionally have no cross-version measurement continuity.
        return { key: 'g' + (index + 1), title: g.title, measure: g.measure as string, baseline: g.baseline, target: g.target };
      });

      // Validate the immutable snapshot before querying live plan status so
      // guessed UUIDs cannot disclose whether another version exists.
      const sourceIds = uniq(dto.selectedGoals.map(g => g.planVersionId));
      const eligibleVersions = await tx.planVersion.findMany({
        where: { centerId, id: { in: sourceIds }, status: { not: 'WITHDRAWN' },
          plan: { centerId, childId: current.childId, service: current.service } },
        select: { id: true },
      });
      if (eligibleVersions.length !== sourceIds.length)
        throw new ConflictException({ code: 'PLAN_VERSION_WITHDRAWN',
          message: 'Cannot use withdrawn or unavailable plan versions as sources for a new clinical draft.' });

      const plan = await tx.therapyPlan.create({ data: {
        id: dto.requestId, centerId, childId: current.childId, service: current.service,
        title: dto.title.trim(), createdById: v.userId, createdAt: now,
      } });
      const version = await tx.planVersion.create({ data: {
        planId: plan.id, centerId, number: 1, authorId: v.userId,
        summary: `Draft candidate copied from saved report evidence snapshot #${snapshot.number}. Review all goal definitions and select suitable activities before any internal review. Not approved or released.`,
        goals: goals as unknown as Prisma.InputJsonValue,
        homeActivities: [], createdAt: now, updatedAt: now,
      } });
      // Append-only source traceability. No free-text report sections,
      // observation values or patient details are placed in event metadata.
      await logCenterEvent(tx, centerId, 'clinical.report_plan_drafted', now, {
        actorUserId: v.userId,
        meta: { childId: current.childId, reportId, reportVersionId: snapshot.id,
          planId: plan.id, planVersionId: version.id, selectedGoalRefs: refs,
          requestFingerprint, draftOnly: true, released: false },
      });
      return { id: plan.id, versionId: version.id, reused: false, released: false };
    });
  }

  async detail(centerId: string, v: Viewer, id: string) {
    const r = await this.report(centerId, v, id);
    const [ev, versions, child] = await Promise.all([
      this.evidence(this.prisma, centerId, r.childId, r.service, r.periodStart, r.periodEnd),
      this.prisma.reportVersion.findMany({ where: { reportId: id }, orderBy: { number: 'desc' }, select: { id: true, number: true, kind: true, authorId: true, createdAt: true } }),
      this.prisma.child.findUniqueOrThrow({ where: { id: r.childId } }),
    ]);
    const author = await this.prisma.membership.findUnique({ where: { id: r.membershipId }, select: { user: { select: { displayName: true } } } });
    const who = await this.names(versions.map((x) => x.authorId));
    const mine = r.membershipId === v.membershipId;
    return {
      synthetic: true, locked: LOCKED, released: false,
      report: { id: r.id, childId: r.childId, childName: `${child.preferredName ?? child.firstName} ${child.lastName}`, title: r.title, service: r.service, periodStart: day(r.periodStart), periodEnd: day(r.periodEnd), status: r.status, sections: r.sections as Sections, reviewNotes: r.reviewNotes as Note[], version: r.version, author: author?.user.displayName ?? '', mine, updatedAt: r.updatedAt },
      canEdit: v.role === 'THERAPIST' && mine && EDITABLE.includes(r.status),
      canReview: v.role === 'CLINICAL_SUPERVISOR' && r.status === 'IN_REVIEW',
      evidence: ev,
      versions: versions.map((x) => ({ id: x.id, number: x.number, kind: x.kind, author: who(x.authorId), createdAt: x.createdAt })),
    };
  }

  private why(r: ProgressReport, v: Viewer) {
    if (r.membershipId !== v.membershipId) return new ForbiddenException('Only the author can edit this report.');
    if (!EDITABLE.includes(r.status)) return new ConflictException({
      code: 'INVALID_REPORT_STATUS', message: r.status === 'IN_REVIEW'
        ? 'This report is with the supervisor. Only DRAFT or RETURNED_FOR_REVISION reports can be edited.'
        : 'Only DRAFT or RETURNED_FOR_REVISION reports can be edited.',
    });
    return new ConflictException({ code: 'VERSION_CONFLICT', message: 'Report version conflict. The report changed in another window; reload before editing.' });
  }

  // Lock the draft at the version the author is looking at; every write bumps the version.
  private async bump(tx: Tx, r: ProgressReport, v: Viewer, version: number, now: Date, data: Prisma.ProgressReportUpdateManyMutationInput = {}) {
    const n = await tx.progressReport.updateMany({ where: { id: r.id, centerId: r.centerId, childId: r.childId, service: r.service, membershipId: v.membershipId, status: { in: EDITABLE }, version }, data: { ...data, updatedAt: now, version: { increment: 1 } } });
    if (n.count !== 1) {
      // The caller's pre-transaction snapshot may be stale; diagnose the
      // authoritative row rather than mislabel a returned report as uneditable.
      const latest = await tx.progressReport.findUniqueOrThrow({ where: { id: r.id } });
      throw this.why(latest, v);
    }
    return tx.progressReport.findUniqueOrThrow({ where: { id: r.id } });
  }

  async autosave(centerId: string, v: Viewer, id: string, dto: ReportSaveDto) {
    const r = await this.report(centerId, v, id);
    return this.clinical.write(centerId, v, r.childId, r.service, async (tx, now) => {
      const locked = await tx.progressReport.findUniqueOrThrow({ where: { id } });
      const sections = { ...(locked.sections as Sections), ...Object.fromEntries(Object.entries(dto.sections).filter(([, x]) => typeof x === 'string')) };
      const fresh = await this.bump(tx, r, v, dto.version, now, { sections });
      await logCenterEvent(tx, centerId, 'clinical.report_autosaved', now, { actorUserId: v.userId, meta: { childId: r.childId, reportId: id } });
      return { version: fresh.version, savedAt: now };
    });
  }

  private async snapshot(tx: Tx, r: ProgressReport, v: Viewer, kind: 'SAVED' | 'SUBMITTED', now: Date) {
    const last = await tx.reportVersion.aggregate({ where: { reportId: r.id }, _max: { number: true } });
    const [ev, existingDecisions] = await Promise.all([
      this.evidence(tx, r.centerId, r.childId, r.service, r.periodStart, r.periodEnd),
      tx.reportSuggestionDecision.findMany({
        where: { centerId: r.centerId, reportId: r.id, action: 'APPLIED' },
        select: { id: true }, orderBy: { createdAt: 'asc' },
      }),
    ]);
    // Freeze eligible ledger identities at the same transactional boundary as
    // the report snapshot. Source hashes alone cannot prove chronology: a
    // later decision must never be retroactively attributed to this version.
    const frozenEvidence = { ...ev, statementDecisionIds: existingDecisions.map(d => d.id) };
    return tx.reportVersion.create({ data: { reportId: r.id, centerId: r.centerId,
      number: (last._max.number ?? 0) + 1, kind, sections: r.sections as Prisma.InputJsonValue,
      evidence: frozenEvidence as unknown as Prisma.InputJsonValue, authorId: v.userId, createdAt: now } });
  }

  async saveVersion(centerId: string, v: Viewer, id: string, version: number) {
    const r = await this.report(centerId, v, id);
    return this.clinical.write(centerId, v, r.childId, r.service, async (tx, now) => {
      const fresh = await this.bump(tx, r, v, version, now);
      const s = await this.snapshot(tx, fresh, v, 'SAVED', now);
      await logCenterEvent(tx, centerId, 'clinical.report_version_saved', now, { actorUserId: v.userId, meta: { childId: r.childId, reportId: id, number: s.number } });
      return { number: s.number, version: fresh.version };
    });
  }

  async versionDetail(centerId: string, v: Viewer, versionId: string) {
    const x = await this.prisma.reportVersion.findFirst({ where: { id: versionId, centerId } });
    if (!x) throw new NotFoundException('Report version not found');
    try {
      await this.report(centerId, v, x.reportId);
    } catch (error) {
      if (error instanceof NotFoundException) throw new NotFoundException('Report version not found');
      throw error;
    }
    const frozen = x.evidence as { statementDecisionIds?: unknown };
    const eligible = Array.isArray(frozen?.statementDecisionIds) &&
      frozen.statementDecisionIds.length <= 1000 &&
      frozen.statementDecisionIds.every((id: unknown) =>
        typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))
      ? frozen.statementDecisionIds as string[] : [];
    const [who, decisions] = await Promise.all([
      this.names([x.authorId]),
      this.prisma.reportSuggestionDecision.findMany({
        where: { centerId, reportId: x.reportId, action: 'APPLIED', id: { in: eligible } },
        select: { id: true, section: true, action: true, sectionHash: true,
          passageHash: true, claimMap: true, sourceManifest: true },
        orderBy: { createdAt: 'desc' }, take: 100,
      }),
    ]);
    const statementTrace = traceSavedStatements(
      x.sections as Sections, x.evidence as unknown as Evidence, decisions, x.reportId,
    );
    return { id: x.id, reportId: x.reportId, number: x.number, kind: x.kind,
      sections: x.sections as Sections, evidence: x.evidence as unknown as Evidence,
      statementTrace, author: who(x.authorId), createdAt: x.createdAt,
      claimValidation: 'REFERENCED_NOT_VERIFIED' as const, released: false as const };
  }

}
