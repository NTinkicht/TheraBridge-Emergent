import type { GoalCheckpoint, PlanVersion } from './clinical';

type VersionWithCheckpoints = Pick<PlanVersion, 'id' | 'goals' | 'goalCheckpoints'>;
export interface CheckpointEntry {
  index: number;
  checkpoint: GoalCheckpoint;
}
export interface CheckpointReferenceComparison {
  goalKey: string;
  planVersionId: string;
  earlier: CheckpointEntry;
  later: CheckpointEntry;
  shared: string[];
  earlierOnly: string[];
  laterOnly: string[];
}

// Checkpoint identity is local to a single already-authorized plan version.
// These are clinician-authored record references, NOT measurements or outcomes.
export function checkpointTimeline(version: VersionWithCheckpoints, goalKey: string): CheckpointEntry[] {
  if (!version.goals.some(goal => goal.key === goalKey)) return [];
  return (version.goalCheckpoints ?? [])
    .flatMap((checkpoint, index) => checkpoint.kind === 'GOAL_CHECKPOINT' &&
      checkpoint.goalKey === goalKey ? [{ index, checkpoint }] : [])
    .sort((a, b) => a.checkpoint.at.localeCompare(b.checkpoint.at) || a.index - b.index);
}

export function compareCheckpointReferences(
  version: VersionWithCheckpoints, earlierIndex: number, laterIndex: number,
): CheckpointReferenceComparison | null {
  if (!Number.isInteger(earlierIndex) || !Number.isInteger(laterIndex) || earlierIndex === laterIndex) return null;
  const saved = version.goalCheckpoints ?? [];
  const earlier = saved[earlierIndex], later = saved[laterIndex];
  if (!earlier || !later || earlier.kind !== 'GOAL_CHECKPOINT' || later.kind !== 'GOAL_CHECKPOINT' ||
      earlier.goalKey !== later.goalKey ||
      !version.goals.some(goal => goal.key === earlier.goalKey)) return null;
  // Use recorded event order (not possibly backdated reviewedOn) and stable
  // saved-array index to break equal timestamps. Reject inverted selections.
  if (earlier.at > later.at || (earlier.at === later.at && earlierIndex >= laterIndex)) return null;
  const left = [...new Set(earlier.observationIds)];
  const right = [...new Set(later.observationIds)];
  const leftSet = new Set(left), rightSet = new Set(right);
  return {
    goalKey: earlier.goalKey, planVersionId: version.id,
    earlier: { index: earlierIndex, checkpoint: earlier },
    later: { index: laterIndex, checkpoint: later },
    shared: left.filter(id => rightSet.has(id)),
    earlierOnly: left.filter(id => !rightSet.has(id)),
    laterOnly: right.filter(id => !leftSet.has(id)),
  };
}
