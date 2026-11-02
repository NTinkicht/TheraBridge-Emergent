import type { Evidence, GoalEvidence, Point } from './reports';

// UI-only comparison of a selected FROZEN report-version evidence payload
// with the current authorized report evidence read model. No fresh query,
// source trust assertion, clinical validity check, or cross-version re-mapping.
export type EvidenceRowStatus =
  'UNCHANGED_REFERENCES' | 'DIFFERENT_REFERENCES' | 'DIFFERENT_DEFINITION' |
  'NOT_IN_CURRENT' | 'ADDED_SINCE_SNAPSHOT' | 'LEGACY_IDENTITY_UNAVAILABLE' |
  'SOURCE_IDS_UNAVAILABLE' | 'NO_OBSERVATIONS';
export interface GoalSourceChange {
  key: string;
  planVersionId: string | null;
  title: string;
  status: EvidenceRowStatus;
  savedSources: number;
  currentSources: number;
}
export interface ReportSourceChange {
  samePeriod: boolean;
  savedPeriod: Evidence['period'];
  currentPeriod: Evidence['period'];
  assessmentIdsOnlyInSaved: string[];
  assessmentIdsOnlyInCurrent: string[];
  sessionsCountChanged: boolean;
  goals: GoalSourceChange[];
}

const goalId = (goal: GoalEvidence) =>
  goal.planVersionId ? goal.planVersionId + '\u0000' + goal.key : null;
const sourceRecords = (goal: GoalEvidence) =>
  [...(goal.prior ? [goal.prior] : []), ...goal.points];
const hasStableIds = (points: Point[]) =>
  points.every(point => typeof point.observationId === 'string' && point.observationId.length > 0);
const sourceRecordFingerprints = (points: Point[]) =>
  points.map(point => JSON.stringify([point.observationId, point.date, point.value]))
    .sort();
const distinct = (items: readonly string[]) => [...new Set(items)].sort();
const equals = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

export function compareRecordedReportEvidence(saved: Evidence, current: Evidence): ReportSourceChange {
  const currentByKey = new Map(current.goals.map(goal => [goalId(goal), goal]));
  const savedKeys = new Set(saved.goals.map(goal => goalId(goal)).filter((key): key is string => !!key));
  const goals: GoalSourceChange[] = saved.goals.map(goal => {
    const id = goalId(goal);
    const oldRecords = sourceRecords(goal);
    const newer = id ? currentByKey.get(id) : undefined;
    const newRecords = newer ? sourceRecords(newer) : [];
    const common = { key: goal.key, planVersionId: goal.planVersionId ?? null,
      title: goal.title, savedSources: oldRecords.length, currentSources: newRecords.length };
    if (!id) return { ...common, status: 'LEGACY_IDENTITY_UNAVAILABLE' as const };
    if (!newer) return { ...common, status: 'NOT_IN_CURRENT' as const };
    if (goal.title !== newer.title || goal.measure !== newer.measure ||
        goal.baseline !== newer.baseline || goal.target !== newer.target)
      return { ...common, status: 'DIFFERENT_DEFINITION' as const };
    if (!oldRecords.length && !newRecords.length)
      return { ...common, status: 'NO_OBSERVATIONS' as const };
    if (!hasStableIds(oldRecords) || !hasStableIds(newRecords))
      return { ...common, status: 'SOURCE_IDS_UNAVAILABLE' as const };
    const oldSignatures = sourceRecordFingerprints(oldRecords);
    const newSignatures = sourceRecordFingerprints(newRecords);
    return { ...common, status: equals(oldSignatures,newSignatures)
      ? 'UNCHANGED_REFERENCES' as const : 'DIFFERENT_REFERENCES' as const };
  });
  for (const goal of current.goals) {
    const id = goalId(goal);
    if (!id || savedKeys.has(id)) continue;
    const oldRecords = sourceRecords(goal);
    goals.push({ key: goal.key, planVersionId: goal.planVersionId ?? null,
      title: goal.title, status: 'ADDED_SINCE_SNAPSHOT',
      savedSources: 0, currentSources: oldRecords.length });
  }
  const oldAssessmentIds = distinct(saved.assessments.map(a => a.id));
  const currentAssessmentIds = distinct(current.assessments.map(a => a.id));
  return {
    samePeriod: saved.period.from === current.period.from && saved.period.to === current.period.to,
    savedPeriod: saved.period, currentPeriod: current.period,
    assessmentIdsOnlyInSaved: oldAssessmentIds.filter(id => !currentAssessmentIds.includes(id)),
    assessmentIdsOnlyInCurrent: currentAssessmentIds.filter(id => !oldAssessmentIds.includes(id)),
    sessionsCountChanged: saved.sessions.drafts !== current.sessions.drafts ||
      saved.sessions.completedVisits !== current.sessions.completedVisits,
    goals,
  };
}
