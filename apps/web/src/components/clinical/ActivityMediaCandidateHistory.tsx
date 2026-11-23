'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/design/ui';
import { activityMediaDrafts, type PrivateActivityCandidateStatus } from '@/lib/activity-media';

/**
 * Only metadata that the authenticated server intentionally selected can be
 * rendered here. No thumbnails, paths, bytes, hashes or image read URLs.
 */
export function ActivityMediaCandidateHistory({ centerId, templateId, draftId }: {
  centerId: string; templateId: string; draftId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<PrivateActivityCandidateStatus[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; }, []);
  async function load(reset: boolean) {
    if (busy) return;
    const current = ++generation.current;
    setBusy(true); setError('');
    try {
      const result = await activityMediaDrafts.candidates(centerId, templateId, draftId,
        reset ? undefined : cursor ?? undefined);
      if (generation.current !== current) return;
      if (!result.metadataOnly || result.readEnabled || result.publishEnabled ||
        result.clinicalReleaseEnabled) throw new Error('Unexpected media permission response');
      setItems(previous => reset ? result.items : [
        ...previous, ...result.items.filter(row => !previous.some(existing => existing.id === row.id)),
      ]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      if (generation.current === current) setError('Could not load private candidate status. Retry.');
    } finally {
      if (generation.current === current) setBusy(false);
    }
  }
  function toggle() {
    if (expanded) {
      generation.current += 1;
      setExpanded(false); setBusy(false); setError('');
    } else {
      setExpanded(true);
      void load(true);
    }
  }
  return <div className="mt-3 space-y-2" data-testid={`media-candidate-history-${draftId}`}>
    <Button variant="secondary" size="sm" aria-expanded={expanded} onClick={toggle}>
      {expanded ? 'Hide private candidate statuses' : 'Inspect private candidate statuses'}
    </Button>
    {expanded && <>
      <p className="text-[12px] text-brand-inkMuted">
        Status metadata only. Quarantined and revoked images are never displayed, approved or released.
      </p>
      {error && <p role="alert" className="text-[12px] text-status-danger">{error}</p>}
      {busy && <p role="status" className="text-[12px]">Loading candidate status…</p>}
      {!busy && !error && items.length === 0 &&
        <p className="text-[12px] text-brand-inkMuted">No private candidates recorded.</p>}
      <ul className="space-y-1" aria-label="Private candidate status history">
        {items.map(item => <li key={item.id} className="rounded-control border border-border-light p-2 text-[12px]">
          <strong>{item.status === 'QUARANTINED' ? 'Quarantined' :
            item.status === 'REVOKED' ? 'Revoked' : 'Unrecognized / blocked'}</strong>
          {' · '}Template v{item.templateVersion ?? 'unknown'}
          {' · '}{item.width}×{item.height} px
          {item.revokedAt ? ' · revoked' : ''}
        </li>)}
      </ul>
      {hasMore && <Button variant="secondary" size="sm" disabled={busy}
        onClick={() => void load(false)}>Load older candidate statuses</Button>}
    </>}
  </div>;
}
