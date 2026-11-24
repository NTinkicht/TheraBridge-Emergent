'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/design/ui';
import { activityMediaDrafts, type ActivityMediaMapping } from '@/lib/activity-media';

/** An explicitly requested, point-in-time view of persisted private mappings. */
export function ActivityMediaMappingStatus({ centerId, templateId, templateVersion }: {
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
      if (data.templateVersion !== templateVersion || data.metadataOnly !== true ||
          data.readEnabled !== false || data.publishEnabled !== false || data.clinicalReleaseEnabled !== false)
        throw new Error('Invalid private mapping response');
      setResult(data);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [request, centerId, templateId, templateVersion]);
  const loading = request > 0 && !result && !error;
  return <section className="space-y-2 rounded-control border border-border-light p-3" aria-label="Private artwork mapping">
    <h5 className="font-semibold text-sm">Activity artwork mapping</h5>
    <p className="text-xs text-brand-inkMuted">Snapshot of saved proposals for this activity version. Scanned candidates are quarantined, not approved illustrations. Refresh after editing or revoking a proposal.</p>
    <Button variant="secondary" size="sm" disabled={loading || !templateVersion}
      onClick={() => { setResult(null); setError(false); setRequest(n => n + 1); }}>
      {loading ? 'Checking mapping…' : 'Check saved artwork mapping'}
    </Button>
    {error && <p role="alert" className="text-sm text-status-danger">Mapping unavailable. Reload the activity or retry.</p>}
    {result && <ul className="space-y-1 text-sm" aria-label="Saved illustration mapping">
      {result.slots.map(slot => <li key={slot.stepNumber ?? 'whole'} className="flex flex-wrap gap-x-2">
        <strong>{slot.stepNumber === null ? 'Whole activity' : 'Step ' + slot.stepNumber}</strong>
        <span>{slot.proposed} proposed · {slot.staged} with scanned candidate · Not approved</span>
      </li>)}
    </ul>}
  </section>;
}
