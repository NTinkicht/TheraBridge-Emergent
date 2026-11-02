import type { Evidence } from './reports';

export type DraftSection = 'assessment' | 'goals' | 'sessions';
export interface SyntheticReportProposal {
  section: DraftSection;
  text: string;
  sourceRefs: string[];
  warnings: string[];
  promptVersion: 'm3-ai02-offline-v1';
  validation: 'REFERENCED_NOT_VERIFIED';
  released: false;
}

/** Offline, deterministic fictional-evidence proposal; never calls a model or stores a report. */
export function proposeSyntheticReportSection(e: Evidence, section: DraftSection): SyntheticReportProposal {
  const sourceRefs: string[] = [];
  const warnings: string[] = [];
  const lines: string[] = [];
  // Hard cap before insertion: API report sections reject text above 8,000 characters.
  const prefix = 'SYNTHETIC DRAFT — CLINICIAN REVIEW REQUIRED\\n';
  const limit = 7000;
  let remaining = limit - (prefix.length - 1);
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
    section, sourceRefs, warnings, promptVersion: 'm3-ai02-offline-v1',
    validation: 'REFERENCED_NOT_VERIFIED', released: false,
    text: `${prefix}${lines.join('\n') || 'No eligible recorded evidence.'}`,
  };
}
