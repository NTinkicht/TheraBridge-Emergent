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
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
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
      // A missing/changed rights envelope is an access denial. Invalidate
      // previously loaded metadata before rendering any new result.
      if (result.metadataOnly !== true || result.readEnabled !== false ||
        result.publishEnabled !== false || result.clinicalReleaseEnabled !== false)
        throw new Error('Unexpected media permission response');
      setItems(previous => reset ? result.items : [
        ...previous, ...result.items.filter(row => !previous.some(existing => existing.id === row.id)),
      ]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      if (generation.current === current) {
        // Includes forbidden (403), expired sessions, failed pagination,
        // network errors and invalid rights envelopes. The previous rows
        // were authorized at an earlier instant, not necessarily now.
        setItems([]); setCursor(null); setHasMore(false);
        setError('Could not load private candidate status. Retry.');
      }
    } finally {
      if (generation.current === current) setBusy(false);
    }
  }
  async function revoke(id: string) {
    if (busy || confirmRevoke !== id) return;
    const current = ++generation.current;
    setBusy(true); setError(''); setNotice('');
    // Hide all earlier metadata immediately while the server re-checks role,
    // draft ownership and the candidate's current quarantine state.
    setItems([]); setCursor(null); setHasMore(false);
    try {
      const result = await activityMediaDrafts.revokeCandidate(centerId, templateId, draftId, id);
      if (generation.current !== current) return;
      if (result.id !== id || result.status !== 'REVOKED' ||
          result.readEnabled !== false || result.publishEnabled !== false ||
          result.clinicalReleaseEnabled !== false) throw new Error('Unexpected revocation response');
      setExpanded(false); setConfirmRevoke(null);
      setNotice('Private candidate revoked. Reopen to inspect current status.');
    } catch {
      if (generation.current === current) {
        setError('Could not revoke the private candidate. Access may have changed; reopen to refresh.');
        setConfirmRevoke(null);
      }
    } finally {
      if (generation.current === current) setBusy(false);
    }
  }
  function toggle() {
    if (expanded) {
      generation.current += 1;
      setExpanded(false); setBusy(false); setError('');
      setConfirmRevoke(null); setNotice('');
      setItems([]); setCursor(null); setHasMore(false);
    } else {
      // Do not display stale rows while rechecking permissions.
      setItems([]); setCursor(null); setHasMore(false);
      setConfirmRevoke(null); setNotice('');
      setExpanded(true);
      void load(true);
    }
  }
  return <div className="mt-3 space-y-2" data-testid={`media-candidate-history-${draftId}`}>
    {notice && <p role="status" className="text-[12px] text-status-success">{notice}</p>}
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
      {!error && <ul className="space-y-1" aria-label="Private candidate status history">
        {items.map(item => <li key={item.id} className="rounded-control border border-border-light p-2 text-[12px]">
          <strong>{item.status === 'QUARANTINED' ? 'Quarantined' :
            item.status === 'REVOKED' ? 'Revoked' : 'Unrecognized / blocked'}</strong>
          {' · '}Template v{item.templateVersion ?? 'unknown'}
          {' · '}{item.width}×{item.height} px
          {item.revokedAt ? ' · revoked' : ''}
          {item.status === 'QUARANTINED' && <div className="mt-2 flex flex-wrap gap-2">
            {confirmRevoke !== item.id
              ? <Button variant="secondary" size="sm" disabled={busy}
                  onClick={() => setConfirmRevoke(item.id)}>Revoke private candidate</Button>
              : <>
                <Button variant="secondary" size="sm" disabled={busy}
                  onClick={() => void revoke(item.id)}>Confirm revocation</Button>
                <Button variant="secondary" size="sm" disabled={busy}
                  onClick={() => setConfirmRevoke(null)}>Cancel revocation</Button>
              </>}
          </div>}
        </li>)}
      </ul>}
      {!error && hasMore && <Button variant="secondary" size="sm" disabled={busy}
        onClick={() => void load(false)}>Load older candidate statuses</Button>}
    </>}
  </div>;
}
