import type { Evidence } from './reports';
import type { SyntheticSourceRef } from './synthetic-source-integrity';

export type DraftSection = 'assessment' | 'goals' | 'sessions';
export interface SyntheticReportProposal {
  section: DraftSection;
  text: string;
  sourceRefs: string[];
  pinnedSources: SyntheticSourceRef[];
  sourceScope: string;
  warnings: string[];
  promptVersion: 'm3-ai02-offline-v1';
  validation: 'REFERENCED_NOT_VERIFIED';
  released: false;
}

/** Read-only reference snapshot. The caller supplies an authorized scope. */
export function reportSourceSnapshot(e: Evidence, section: DraftSection, scope: string): SyntheticSourceRef[] {
  const mk = (kind: SyntheticSourceRef['kind'], id: string, revision: string, snapshot: unknown): SyntheticSourceRef =>
    ({ kind, id, scope, revision, snapshot: JSON.stringify(snapshot), validation: 'REFERENCED_NOT_VERIFIED' });
  if (section === 'assessment') return e.assessments.slice(0, 20).filter(a => a.id && a.summary?.trim())
    .map(a => mk('assessment', a.id, a.assessedOn, [a.summary, a.assessedOn]));
  if (section === 'goals') return e.goals.slice(0, 20).filter(g => g.key)
    .map(g => mk('goal', (g.planVersionId ?? 'unversioned') + ':' + g.key,
      g.planVersionId ?? 'unversioned', [g.title, g.measure, g.baseline, g.target, g.points]));
  return [mk('session-count', 'period-counts', e.period.from + ':' + e.period.to, [e.period, e.sessions])];
}

/** Offline, deterministic fictional-evidence proposal; never calls a model or stores a report. */
export function proposeSyntheticReportSection(e: Evidence, section: DraftSection, scope: string): SyntheticReportProposal {
  const sourceRefs: string[] = [];
  const warnings: string[] = [];
  const lines: string[] = [];
  // Hard cap before insertion: API report sections reject text above 8,000 characters.
  const prefix = 'SYNTHETIC DRAFT — CLINICIAN REVIEW REQUIRED\\n';
  const limit = 7000;
  let remaining = limit - prefix.length;
  const append = (ref: string, line: string): boolean => {
    const cost = line.length + (lines.length ? 1 : 0);
    if (cost > remaining) {
      warnings.push('Additional sources omitted to respect the report section length limit.');
      return false;
    }
    sourceRefs.push(ref);
    lines.push(line);
    remaining -= cost;
    return true;
  };
  if (section === 'assessment') {
    for (const a of e.assessments.slice(0, 20)) {
      if (!a.id || !a.summary?.trim()) continue;
      const ref = `assessment:${a.id}`;
      if (!append(ref, `[${ref}] Recorded ${a.assessedOn}: ${a.summary.trim().slice(0, 500)}`)) break;
    }
  } else if (section === 'goals') {
    for (const g of e.goals.slice(0, 20)) {
      if (!g.key) continue;
      const ref = `goal:${g.planVersionId ?? 'unversioned'}:${g.key}`;
      const latest = g.points.at(-1);
      if (!append(ref, `[${ref}] ${g.title.slice(0, 120)}: ${latest ? `latest recorded ${latest.value} ${g.measure} (${latest.date})` : 'no recorded observation in this period'}. Baseline ${g.baseline}; target ${g.target}.`)) break;
      if (!latest) warnings.push(`Goal ${g.key} lacks recorded observations.`);
    }
  } else {
    append('session:period-counts', `[session:period-counts] ${e.sessions.completedVisits} completed visits and ${e.sessions.drafts} session drafts in the selected period.`);
    warnings.push('Session counts do not establish outcomes or clinical progress.');
  }
  if (!lines.length) warnings.push('No eligible recorded sources: do not infer findings.');
  return {
    section, sourceRefs, warnings, sourceScope: scope,
    pinnedSources: reportSourceSnapshot(e, section, scope).filter(ref => sourceRefs.includes(ref.kind === 'session-count' ? 'session:period-counts' : ref.kind === 'goal' ? 'goal:' + ref.id : 'assessment:' + ref.id)),
    promptVersion: 'm3-ai02-offline-v1',
    validation: 'REFERENCED_NOT_VERIFIED', released: false,
    text: `${prefix}${lines.join('\n') || 'No eligible recorded evidence.'}`,
  };
}
