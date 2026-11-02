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
  if (section === 'assessment') {
    for (const a of e.assessments.slice(0, 20)) {
      if (!a.id || !a.summary?.trim()) continue;
      sourceRefs.push(`assessment:${a.id}`);
      lines.push(`[assessment:${a.id}] Recorded ${a.assessedOn}: ${a.summary.trim().slice(0, 500)}`);
    }
  } else if (section === 'goals') {
    for (const g of e.goals.slice(0, 20)) {
      if (!g.key) continue;
      sourceRefs.push(`goal:${g.key}`);
      const latest = g.points.at(-1);
      lines.push(`[goal:${g.key}] ${g.title.slice(0, 120)}: ${latest ? `latest recorded ${latest.value} ${g.measure} (${latest.date})` : 'no recorded observation in this period'}. Baseline ${g.baseline}; target ${g.target}.`);
      if (!latest) warnings.push(`Goal ${g.key} lacks recorded observations.`);
    }
  } else {
    sourceRefs.push('session:period-counts');
    lines.push(`[session:period-counts] ${e.sessions.completedVisits} completed visits and ${e.sessions.drafts} session drafts in the selected period.`);
    warnings.push('Session counts do not establish outcomes or clinical progress.');
  }
  if (!lines.length) warnings.push('No eligible recorded sources: do not infer findings.');
  return {
    section, sourceRefs, warnings, promptVersion: 'm3-ai02-offline-v1',
    validation: 'REFERENCED_NOT_VERIFIED', released: false,
    text: `SYNTHETIC DRAFT — CLINICIAN REVIEW REQUIRED\n${lines.join('\n') || 'No eligible recorded evidence.'}`,
  };
}
