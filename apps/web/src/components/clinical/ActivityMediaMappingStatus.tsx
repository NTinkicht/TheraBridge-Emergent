'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/design/ui';
import { activityMediaDrafts, type ActivityMediaMapping } from '@/lib/activity-media';

function validateMapping(data: ActivityMediaMapping, templateVersion?: number) {
  if (!Number.isSafeInteger(templateVersion) || !templateVersion || templateVersion < 1 ||
      data.templateVersion !== templateVersion || data.metadataOnly !== true ||
      data.readEnabled !== false || data.publishEnabled !== false || data.clinicalReleaseEnabled !== false ||
      !Array.isArray(data.slots) || data.slots.length < 1 || data.slots.length > 65) {
    throw new Error('Invalid private mapping response');
  }
  let previous = 0;
  for (const [index, slot] of data.slots.entries()) {
    if (!slot || !Number.isSafeInteger(slot.proposed) || slot.proposed < 0 ||
        !Number.isSafeInteger(slot.staged) || slot.staged < 0 || slot.staged > slot.proposed)
      throw new Error('Invalid private mapping counts');
    if (index === 0) {
      if (slot.stepNumber !== null) throw new Error('Missing whole-activity slot');
    } else {
      const n = slot.stepNumber;
      if (n === null || !Number.isSafeInteger(n) || n <= previous || n > 64)
        throw new Error('Invalid private mapping step');
      previous = n;
    }
  }
  return data;
}

/** Remount the snapshot on every identity/version change, including while a
 * previous request is outstanding. Never render stale scope data. */
export function ActivityMediaMappingStatus(props: {
  centerId: string; templateId: string; templateVersion?: number;
}) {
  return <MappingSnapshot key={JSON.stringify([props.centerId, props.templateId, props.templateVersion])} {...props} />;
}

function MappingSnapshot({ centerId, templateId, templateVersion }: {
  centerId: string; templateId: string; templateVersion?: number;
}) {
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<ActivityMediaMapping | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!request) return;
    let active = true;
    activityMediaDrafts.mapping(centerId, templateId).then(data => {
      if (!active) return;
      setResult(validateMapping(data, templateVersion));
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [request, centerId, templateId, templateVersion]);
  const loading = request > 0 && !result && !error;
  const proposedSlots = result?.slots.filter(slot => slot.proposed > 0).length ?? 0;
  const stagedSlots = result?.slots.filter(slot => slot.staged > 0).length ?? 0;
  return <section className="space-y-2 rounded-control border border-border-light p-3" aria-label="Private artwork mapping">
    <h5 className="font-semibold text-sm">Activity artwork mapping</h5>
    <p className="text-xs text-brand-inkMuted">Snapshot of saved proposals for this activity version. Scanned candidates are quarantined, not approved illustrations. Refresh after editing or revoking a proposal.</p>
    <Button variant="secondary" size="sm" disabled={loading || !templateVersion}
      onClick={() => { setResult(null); setError(false); setRequest(n => n + 1); }}>
      {loading ? 'Checking mapping…' : 'Check saved artwork mapping'}
    </Button>
    {error && <p role="alert" className="text-sm text-status-danger">Mapping unavailable. Reload the activity or retry.</p>}
    {result && <>
      <p className="text-sm" role="status">
        {proposedSlots} of {result.slots.length} slots have a proposal; {stagedSlots} of {result.slots.length} have a scanned candidate.
        {' '}Approved illustration coverage is not measured by this private mapping.
      </p>
      <ul className="space-y-1 text-sm" aria-label="Saved illustration mapping">
        {result.slots.map(slot => <li key={slot.stepNumber ?? 'whole'} className="flex flex-wrap gap-x-2">
          <strong>{slot.stepNumber === null ? 'Whole activity' : 'Step ' + slot.stepNumber}</strong>
          <span>{slot.proposed} proposed · {slot.staged} with scanned candidate · Not approved</span>
        </li>)}
      </ul>
    </>}
  </section>;
}
