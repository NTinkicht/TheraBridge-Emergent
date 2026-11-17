'use client';

import { useEffect, useState } from 'react';
import { FileImage, ShieldAlert } from 'lucide-react';
import { Button, Card, Pill } from '@/components/design/ui';
import { activityMediaDrafts, type ActivityMediaDraft as Draft, type ActivityMediaSource as SourceType } from '@/lib/activity-media';

const initial = {
  sourceType: 'ORIGINAL' as SourceType, styleVersion: 'm5-b-v1',
  sceneType: '', altText: '', license: '', sourceReference: '', providerTerms: '',
};
const cls = 'min-h-[44px] w-full rounded-control border border-border-strong bg-surface-white px-3 py-2 text-sm';

// Metadata-only workflow. No image upload/preview or approval exists until the
// separate private-byte verifier, rights sign-off and clinical gates are ready.
export function ActivityMediaDraftPanel({ centerId, templateId, templateVersion }: {
  centerId: string; templateId: string; templateVersion?: number;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Draft[]>([]);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const base = activityMediaDrafts.endpoint(centerId, templateId);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError('');
    activityMediaDrafts.list(centerId, templateId).then(result => {
      if (active) setItems(result.items);
    }).catch(() => {
      if (active) setError('Could not load illustration proposals. Try reopening this panel.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, base]);

  const submit = async () => {
    if (!templateVersion || busy || loading) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = await activityMediaDrafts.propose(centerId, templateId, { ...form, templateVersion,
        providerTerms: form.sourceType === 'GENERATED' ? form.providerTerms : undefined });
      setItems(prev => [saved, ...prev.filter(item => item.id !== saved.id)]);
      setNotice('Metadata proposal saved as a private draft. No image was uploaded, approved or shared.');
      setForm(initial);
    } catch {
      setError('Could not save. Verify the source, rights evidence, version and permissions. Your entries remain available.');
    } finally { setBusy(false); }
  };

  const reject = async (draft: Draft) => {
    if (busy || reason.trim().length < 8) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await activityMediaDrafts.reject(centerId, templateId, draft.id, draft.version, reason.trim());
      setItems(prev => prev.map(item => item.id === result.id ? { ...item, ...result, rejectionReason: reason.trim() } : item));
      setRejecting(null); setReason('');
      setNotice('Draft rejected. This decision was recorded for audit.');
    } catch {
      setError('Could not reject this version. Reload the panel; another editor may have changed it.');
    } finally { setBusy(false); }
  };

  const field = (key: 'sceneType' | 'altText' | 'license' | 'sourceReference' | 'providerTerms', label: string, placeholder = '') =>
    <label className="block text-sm font-medium">{label}
      <input className={cls + ' mt-1'} value={form[key]} maxLength={key === 'altText' ? 600 : key === 'sourceReference' || key === 'providerTerms' ? 500 : key === 'license' ? 160 : 80}
        onChange={event => setForm(previous => ({ ...previous, [key]: event.target.value }))} placeholder={placeholder} required={key !== 'providerTerms'} />
    </label>;

  return <section className="space-y-3" data-testid={`media-drafts-${templateId}`}>
    <Button variant="secondary" size="sm" aria-expanded={open} onClick={() => { if (!open) setLoading(true); setOpen(!open); }}>
      <FileImage size={16} aria-hidden="true" />{open ? 'Close illustration proposals' : 'Illustration proposals'}
    </Button>
    {open && <Card className="space-y-4 p-4">
      <h4 className="font-display text-base font-semibold">Private illustration proposal registry</h4>
      <p className="flex gap-2 rounded-control bg-status-cautionSurface p-3 text-sm text-brand-ink">
        <ShieldAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
        No image upload or publication is available. This records a draft brief and provenance only.
        Human clinical/design approval and verified storage are separate mandatory gates.
      </p>
      {error && <p role="alert" className="text-sm text-status-danger">{error}</p>}
      {notice && <p role="status" className="text-sm text-status-success">{notice}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">Artwork source type
          <select className={cls + ' mt-1'} value={form.sourceType} onChange={e => setForm(v => ({ ...v, sourceType: e.target.value as SourceType }))}>
            <option value="ORIGINAL">Original</option><option value="GENERATED">AI-generated</option><option value="LICENSED">Licensed</option>
          </select>
        </label>
        <label className="block text-sm font-medium">Proposed style version
          <input className={cls + ' mt-1'} value={form.styleVersion} maxLength={120} minLength={4}
            onChange={e => setForm(v => ({ ...v, styleVersion: e.target.value }))} required />
        </label>
        {field('sceneType', 'Scene type', 'Guided fine-motor activity')}
        {field('license', 'License or rights basis', 'Review record, not a license grant')}
        <div className="sm:col-span-2">{field('sourceReference', 'Provenance / source evidence reference', 'Internal record ID; never a public asset URL')}</div>
        <div className="sm:col-span-2">{field('altText', 'Proposed accessible description', 'Describe the action and relevant materials')}</div>
        {form.sourceType === 'GENERATED' && <div className="sm:col-span-2">{field('providerTerms', 'Provider commercial terms evidence', 'Required for AI-generated proposals')}</div>}
      </div>
      <Button onClick={() => void submit()} disabled={busy || loading || !templateVersion || form.styleVersion.trim().length < 4 ||
        form.sceneType.trim().length < 3 || form.license.trim().length < 4 ||
        form.sourceReference.trim().length < 8 || form.altText.trim().length < 10 ||
        (form.sourceType === 'GENERATED' && form.providerTerms.trim().length === 0)}>
        {busy ? 'Saving…' : 'Save private metadata draft'}
      </Button>
      {!templateVersion && <p role="note" className="text-sm text-status-caution">Activity version unavailable. Reload before editing media metadata.</p>}
      <h5 className="font-semibold">Existing drafts</h5>
      {loading ? <p role="status" className="text-sm">Loading proposals…</p> :
        !items.length ? <p className="text-sm text-brand-inkMuted">No proposals registered for this activity.</p> :
        <ul className="space-y-3">{items.map(draft => <li key={draft.id} className="rounded-control border border-border-light p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2"><Pill tone={draft.state === 'REJECTED' ? 'danger' : 'caution'}>{draft.state}</Pill>
            <span className="text-brand-inkMuted">Activity v{draft.templateVersion} · {draft.sourceType} · {draft.styleVersion}</span></div>
          <p className="mt-2 break-words">{draft.altText}</p>
          <p className="mt-1 break-words text-brand-inkMuted">Source: {draft.sourceReference} · Rights: {draft.license}</p>
          {draft.rejectionReason && <p className="mt-1 text-status-danger">Rejected: {draft.rejectionReason}</p>}
          {draft.state === 'DRAFT' && <div className="mt-2">
            {rejecting === draft.id ? <div className="space-y-2">
              <label className="block font-medium">Reason for rejection
                <textarea className={cls + ' mt-1'} rows={2} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
              </label>
              <div className="flex flex-wrap gap-2"><Button variant="danger" size="sm" disabled={busy || reason.trim().length < 8} onClick={() => void reject(draft)}>Record rejection</Button>
                <Button variant="secondary" size="sm" onClick={() => { setRejecting(null); setReason(''); }}>Cancel</Button></div>
            </div> : <Button variant="secondary" size="sm" onClick={() => { setRejecting(draft.id); setReason(''); }}>Reject draft</Button>}
          </div>}
        </li>)}</ul>}
      <p className="text-xs text-brand-inkMuted">Latest 100 drafts only. Never treat a proposal as an approved, uploaded or released asset.</p>
    </Card>}
  </section>;
}
