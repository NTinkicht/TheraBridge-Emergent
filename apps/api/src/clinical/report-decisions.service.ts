import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicalService } from './clinical.service';
import { ReportsService, type Evidence } from './reports.service';
import { EDITABLE } from './governance-core';
import { logCenterEvent, type Tx } from '../centers/history';
import type { Viewer } from '../operations/children.service';
import type { ReportSuggestionDecisionDto, SuggestionClaimDto } from './clinical.dto';

import { suggestionSources, type Section, type Source } from './report-source-catalog';
export { suggestionSources } from './report-source-catalog';
const SECTIONS: Section[] = ['assessment', 'goals', 'sessions'];
export const SUGGESTION_GENERATOR = 'DETERMINISTIC_V1';
export const SUGGESTION_LABEL = 'NON_CLINICAL_DRAFT';
// A stable, explicit contract for every API consumer: source identity and
// freshness are checked; clinicians' narrative claims are NOT semantically
// verified by the system. Neither APPLIED nor unchanged references are approval.
export const CLAIM_VALIDATION = 'REFERENCED_NOT_VERIFIED' as const;
export const SOURCE_STATUS_CURRENT = 'REFERENCES_UNCHANGED' as const;
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const referenceHeader = (section: Section) => `Evidence references (internal draft; ${section}):`;
const hasReferences = (text: string, section: Section) => text.split(/\r?\n/).some(
  line => line.trim() === referenceHeader(section) || line.trim() === 'Evidence references (internal draft):',
);

// Exact authorized IDs, plan-version/goal identity and values are used for a
// reproducible source fingerprint. Neither the raw assessment summaries nor
// clinician-authored free text is duplicated in the append-only decision ledger.
const proposalHash = (sources: Source[]) => hash(sources.map(s => ({ ref: s.ref, fingerprint: s.fingerprint })));
const manifest = (sources: Source[]) => sources.map(s => ({ ref: s.ref, fingerprint: s.fingerprint }));

@Injectable()
export class ReportDecisionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinical: ClinicalService,
    private readonly reports: ReportsService,
  ) {}

  private async authorized(centerId: string, v: Viewer, reportId: string) {
    const r = await this.prisma.progressReport.findFirst({ where: { id: reportId, centerId } });
    if (!r) throw new NotFoundException('Report not found');
    await this.clinical.child(this.prisma, centerId, v, r.childId, v.role === 'THERAPIST' ? r.service : undefined);
    return r;
  }

  private sourceViews(e: Evidence, reportId: string) {
    return Object.fromEntries(SECTIONS.map(section => {
      const sources = suggestionSources(e, reportId, section);
      return [section, { proposalFingerprint: proposalHash(sources),
        sources: sources.map(({ ref, label }) => ({ ref, label })) }];
    })) as Record<Section, { proposalFingerprint: string; sources: { ref: string; label: string }[] }>;
  }

  // No authorization comes from this read: historical metadata is visible
  // only through existing clinical report + specialty scoping.
  async list(centerId: string, v: Viewer, reportId: string) {
    const r = await this.authorized(centerId, v, reportId);
    const [e, events] = await Promise.all([
      this.reports.evidence(this.prisma, centerId, r.childId, r.service, r.periodStart, r.periodEnd),
      this.prisma.reportSuggestionDecision.findMany({
        where: { centerId, childId: r.childId, reportId },
        orderBy: { reportRevision: 'desc' }, take: 100,
      }),
    ]);
    const sections = r.sections as Record<string, string>;
    const views = this.sourceViews(e, reportId);
    const decisions = events.map(x => {
      const section = x.section as Section;
      const staleSources = x.sourceHash !== views[section].proposalFingerprint;
      const changedText = x.sectionHash !== hash(sections[section] ?? '');
      return {
        id: x.id, section, action: x.action, label: x.label, generator: x.generator,
        actorUserId: x.actorUserId, reportRevision: x.reportRevision, reason: x.reason,
        createdAt: x.createdAt, claimMap: x.claimMap,
        sourceManifest: x.sourceManifest,
        status: staleSources || changedText ? 'REQUIRES_REVIEW' : SOURCE_STATUS_CURRENT,
        claimValidation: CLAIM_VALIDATION,
        reasons: [...(staleSources ? ['EVIDENCE_CHANGED'] : []), ...(changedText ? ['REPORT_TEXT_CHANGED'] : [])],
      };
    });
    return {
      synthetic: true, released: false, clinicalAuthorization: false,
      claimValidation: CLAIM_VALIDATION, // not a semantic/medical correctness assertion
      sources: views, decisions,
      latest: Object.fromEntries(SECTIONS.map(s => [s, decisions.find(d => d.section === s) ?? null])),
    };
  }

  private validateClaims(dto: ReportSuggestionDecisionDto, sources: Source[]) {
    const claims = dto.claims ?? [];
    if (dto.action !== 'APPLIED') {
      if (claims.length) throw new UnprocessableEntityException('Only applied suggestions contain reviewed claims.');
      return [] as { text: string; sourceRefs: string[] }[];
    }
    if (!claims.length) throw new UnprocessableEntityException('Add at least one reviewed claim and its sources.');
    const available = new Set(sources.map(s => s.ref));
    const reviewed = claims.map((c: SuggestionClaimDto) => ({
      text: c.text.trim(),
      sourceRefs: [...new Set(c.sourceRefs)],
    }));
    for (const c of reviewed) {
      if (c.text.length < 3 || !c.sourceRefs.length || c.sourceRefs.some(ref => !available.has(ref))) {
        throw new UnprocessableEntityException('Each reviewed claim must cite an available source in this report and specialty.');
      }
    }
    // A cheap, intentionally incomplete consistency check for quantitative
    // goal claims: every cited observation must appear with its exact recorded
    // value and the relevant unit. The narrative itself is NOT validated.
    // Deliberately do not "verify" interpretations, causality or progress.
    if (dto.section === 'goals') {
      const byRef = new Map(sources.map(source => [source.ref, source]));
      const unitPresent = (text: string, measure: string) => {
        if (measure === 'percent') return /\bpercent(age)?\b|%/i.test(text);
        if (measure === 'count') return /\b(count|times?|occurrences?|items?)\b/i.test(text);
        if (measure === 'level') return /\blevels?\b/i.test(text);
        return false;
      };
      for (const claim of reviewed) {
        const supportedNumbers = new Set<number>();
        for (const ref of claim.sourceRefs) {
          const source = byRef.get(ref);
          if (source?.observed) supportedNumbers.add(source.observed.value);
          for (const value of source?.goalNumbers ?? []) supportedNumbers.add(value);
        }
        const numericTokens = claim.text.match(/(?:^|[^\w.])[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?![\w.])/g) ?? [];
        const extractedValues = numericTokens.map(token => {
          const match = token.match(/[-+]?(?:\d+(?:\.\d+)?|\.\d+)/);
          return match === null ? NaN : Number(match[0]);
        });
        // Block unsupported numbers; this is consistency checking, not semantic
        // verification of narrative conclusions, progress or causation.
        if (extractedValues.some(value => !supportedNumbers.has(value))) {
          throw new UnprocessableEntityException(
            'Numeric values in reviewed goal claims must come from cited observations or goal targets/baselines.',
          );
        }
        for (const ref of claim.sourceRefs) {
          const observed = byRef.get(ref)?.observed;
          if (!observed) continue;
          if (!extractedValues.includes(observed.value) || !unitPresent(claim.text, observed.measure)) {
            throw new UnprocessableEntityException(
              "A claim citing an observation must include that observation's recorded value and measure. Narrative accuracy is not automatically verified.",
            );
          }
        }
      }
    }
    return reviewed;
  }

  async decide(centerId: string, v: Viewer, reportId: string, dto: ReportSuggestionDecisionDto) {
    const r = await this.authorized(centerId, v, reportId);
    return this.clinical.write(centerId, v, r.childId, r.service, async (tx: Tx, now: Date) => {
      // Do not treat membership alone as proof of a current specialty.
      const allowed = await tx.membership.findFirst({ where: {
        id: v.membershipId, centerId, userId: v.userId, status: 'ACTIVE',
        specialties: { has: r.service },
      }, select: { id: true } });
      if (!allowed) throw new ForbiddenException('Your clinical specialty access has changed.');
      await tx.$queryRaw`SELECT id FROM progress_report WHERE id=${reportId}::uuid FOR UPDATE`;
      const fresh = await tx.progressReport.findFirst({ where: { id: reportId, centerId } });
      if (!fresh) throw new NotFoundException('Report not found');
      if (fresh.membershipId !== v.membershipId) throw new ForbiddenException('Only the report author may review its factual draft suggestions.');
      if (!EDITABLE.includes(fresh.status)) throw new ConflictException('This report is not editable while it is under review.');
      const requestHash = hash({ section: dto.section, action: dto.action, version: dto.version,
        proposalFingerprint: dto.proposalFingerprint, reason: dto.reason ?? null, claims: dto.claims ?? [] });
      const previous = await tx.reportSuggestionDecision.findUnique({
        where: { reportId_idempotencyKey: { reportId, idempotencyKey: dto.idempotencyKey } },
      });
      if (previous) {
        if (previous.requestHash !== requestHash) throw new ConflictException('Idempotency key already used for a different review decision.');
        return { id: previous.id, version: previous.reportRevision, action: previous.action,
          section: previous.section, replayed: true, persisted: true,
          claimValidation: CLAIM_VALIDATION };
      }
      if (fresh.version !== dto.version) throw new ConflictException('The report changed in another tab. Reload it before recording the review decision.');
      const e = await this.reports.evidence(tx, centerId, r.childId, r.service, r.periodStart, r.periodEnd);
      const sources = suggestionSources(e, reportId, dto.section);
      const currentHash = proposalHash(sources);
      if (currentHash !== dto.proposalFingerprint) throw new ConflictException('Evidence changed. Reopen the suggestion and verify the sources again.');
      const claims = this.validateClaims(dto, sources);
      const sections = fresh.sections as Record<string, string>;
      const current = sections[dto.section] ?? '';
      const earlier = await tx.reportSuggestionDecision.findFirst({
        where: { reportId, centerId, section: dto.section },
        orderBy: { reportRevision: 'desc' },
      });
      if (dto.action === 'RECONSIDERED' && earlier?.action !== 'OMITTED')
        throw new ConflictException('Only a previously omitted suggestion can be reconsidered.');
      let next = current;
      if (dto.action === 'APPLIED') {
        if (hasReferences(current, dto.section))
          throw new ConflictException('This report section already has evidence references. Revise the existing text instead of duplicating it.');
        const text = claims.map(c => c.text).join('\n\n');
        const refs = claims.map((c, i) => `- Claim ${i + 1}: ${c.sourceRefs.join(', ')}`).join('\n');
        const addition = `${text}\n\n${referenceHeader(dto.section)}\n${refs}`;
        next = current.trim() ? `${current.trimEnd()}\n\n${addition}` : addition;
        if (next.length > 8000) throw new UnprocessableEntityException('Reviewed passage and references exceed the section limit.');
      }
      const updated = await tx.progressReport.updateMany({
        where: { id: reportId, centerId, membershipId: v.membershipId, version: dto.version, status: { in: EDITABLE } },
        data: { ...(dto.action === 'APPLIED' ? { sections: { ...sections, [dto.section]: next } as Prisma.InputJsonValue } : {}),
          updatedAt: now, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ConflictException('Report changed before the decision could be saved.');
      const event = await tx.reportSuggestionDecision.create({
        data: {
          centerId, childId: fresh.childId, reportId, service: fresh.service,
          membershipId: v.membershipId, actorUserId: v.userId,
          section: dto.section, action: dto.action, idempotencyKey: dto.idempotencyKey,
          reason: dto.reason?.trim() || null,
          requestHash, generator: SUGGESTION_GENERATOR,
          sourceManifest: manifest(sources) as Prisma.InputJsonValue,
          sourceHash: currentHash,
          claimMap: claims.map((c, index) => ({ index, textHash: hash(c.text),
            sourceRefs: c.sourceRefs })) as Prisma.InputJsonValue,
          passageHash: dto.action === 'APPLIED' ? hash(claims.map(c => c.text).join('\n\n')) : null,
          sectionHash: hash(next), reportRevision: dto.version + 1,
          label: SUGGESTION_LABEL, createdAt: now,
        },
      });
      await logCenterEvent(tx, centerId, 'clinical.report_suggestion_reviewed', now, {
        actorUserId: v.userId, meta: { childId: fresh.childId, reportId, decisionId: event.id,
          action: dto.action, section: dto.section, reportRevision: dto.version + 1 },
      });
      return { id: event.id, section: event.section, action: event.action,
        version: dto.version + 1, persisted: true, replayed: false,
        claimValidation: CLAIM_VALIDATION };
    });
  }
}
