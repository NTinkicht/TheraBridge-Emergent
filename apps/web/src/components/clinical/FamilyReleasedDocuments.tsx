'use client';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { familyReleaseApi, type FamilyDocument } from '@/lib/family-releases';
import { opsApi, type FamilyOverview } from '@/lib/operations';
import { Button, Card } from '@/components/design/ui';

type Item = { id: string; kind: string; status: string; childId: string; childName: string };
export function FamilyReleasedDocuments({ centerId }: { centerId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [children, setChildren] = useState<FamilyOverview['children']>([]);
  const [selected, setSelected] = useState<FamilyDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      const [data, family] = await Promise.all([familyReleaseApi.mine(centerId), opsApi.family(centerId)]);
      setItems(data.items); setChildren(family.children); setEnabled(true);
    } catch (e) {
      // Server-side dual-flag gating is authoritative. Do not advertise an
      // unapproved release feature just because the frontend is deployed.
      if (e instanceof ApiError && e.status === 403) { setEnabled(false); return; }
      setError('Family documents could not be loaded.');
    }
  }, [centerId]);
  useEffect(() => { void reload(); }, [reload]);

  const open = async (id: string) => {
    setBusy(true); setError('');
    try { setSelected(await familyReleaseApi.read(centerId, id)); }
    catch { setSelected(null); setError('This document is no longer available.'); await reload(); }
    finally { setBusy(false); }
  };
  const consent = async (childId: string, purpose: 'FAMILY_PLAN' | 'FAMILY_REPORT', withdraw: boolean) => {
    setBusy(true); setError('');
    try { await familyReleaseApi.consent(centerId, childId, purpose, withdraw); setSelected(null); await reload(); }
    catch { setError('This consent choice could not be saved.'); }
    finally { setBusy(false); }
  };
  if (!enabled) return null;
  return <Card tone="family" className="space-y-4 p-5" testId="synthetic-family-documents">
    <div><h2 className="font-display text-xl font-bold">Family plans and reports</h2>
      <p className="text-sm">Synthetic training documents only. Your consent choice applies separately to plans and reports.</p></div>
    {children.map(child => <div key={child.id} className="space-y-2 rounded-control border border-fam-border p-3">
      <h3 className="font-semibold">{child.name}</h3>
      <div className="flex flex-wrap gap-2">{(['FAMILY_PLAN', 'FAMILY_REPORT'] as const).map(purpose => <div key={purpose} className="flex flex-wrap gap-1">
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void consent(child.id, purpose, false)}>
          Consent to {purpose === 'FAMILY_PLAN' ? 'plans' : 'reports'} (synthetic)
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => void consent(child.id, purpose, true)}>
          Withdraw {purpose === 'FAMILY_PLAN' ? 'plan' : 'report'} consent
        </Button>
      </div>)}</div>
    </div>)}
    {items.length ? <ul className="space-y-2">{items.map(item => <li key={item.id}>
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => void open(item.id)}>
        {item.childName} — View {item.kind.toLowerCase()} {item.status === 'SUPERSEDED' ? '(replaced)' : ''}
      </Button>
    </li>)}</ul> : <p className="text-sm">No documents have been released to you.</p>}
    {selected && <section aria-label="Family document" className="space-y-3 rounded-control border border-fam-border p-4" data-testid="family-released-rendering">
      <p className="text-sm font-semibold">For: {selected.childName}</p>
      <h3 className="font-semibold">{String(selected.rendering.title ?? 'Family document')}{selected.replaced ? ' — replaced' : ''}</h3>
      <p className="whitespace-pre-wrap text-sm">{String(selected.rendering.summary ?? selected.rendering.familySummary ?? '')}</p>
      {selected.rendering.kind === 'PLAN' && Array.isArray(selected.rendering.goals) && <ul className="list-disc space-y-1 pl-6 text-sm">
        {(selected.rendering.goals as { title: string }[]).map((goal, i) => <li key={i}>{goal.title}</li>)}
      </ul>}
      {selected.rendering.kind === 'PLAN' && Array.isArray(selected.rendering.homeActivities) &&
        <div className="space-y-2"><h4 className="font-semibold">Home activities</h4><ul className="list-disc space-y-2 pl-6 text-sm">
          {(selected.rendering.homeActivities as { frequency: string; note: string }[]).map((activity, i) =>
            <li key={i}><span className="font-semibold">{activity.frequency}</span>{activity.note && <p className="whitespace-pre-wrap">{activity.note}</p>}</li>)}
        </ul></div>}
      <p className="text-xs text-fam-muted">This synthetic document is view-only and cannot be downloaded or exported.</p>
      <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close document</Button>
    </section>}
    {error && <p role="alert" className="text-sm text-status-danger">{error}</p>}
  </Card>;
}
