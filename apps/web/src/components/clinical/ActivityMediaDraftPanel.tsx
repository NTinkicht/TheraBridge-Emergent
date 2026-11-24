'use client';

import { useEffect, useRef, useState } from 'react';
import { FileImage, ShieldAlert } from 'lucide-react';
import { Button, Card, Pill } from '@/components/design/ui';
import { activityMediaDrafts, type ActivityMediaDraft as Draft, type ActivityMediaSource as SourceType } from '@/lib/activity-media';
import { LocalActivityMediaReadiness } from './LocalActivityMediaReadiness';
import { GeneratedArtworkSelector } from './GeneratedArtworkSelector';
import { PrivateIllustrationStepPreview } from './PrivateIllustrationStepPreview';
import { ActivityMediaCandidateHistory } from './ActivityMediaCandidateHistory';
import { PrivatePngCandidatePicker } from '@/components/operations/PrivatePngCandidatePicker';
import { ILLUSTRATION_STYLE_VERSION } from '@/lib/illustration-style.mjs';

const initial = {
  sourceType: 'ORIGINAL' as SourceType, styleVersion: ILLUSTRATION_STYLE_VERSION,
  sceneType: '', stepNumber: '', altText: '', license: '', sourceReference: '', providerTerms: '',
};
const cls = 'min-h-[44px] w-full rounded-control border border-border-strong bg-surface-white px-3 py-2 text-sm';

// Metadata-only workflow. No image upload/preview or approval exists until the
// separate private-byte verifier, rights sign-off and clinical gates are ready.
export function ActivityMediaDraftPanel({ centerId, templateId, templateVersion, steps = [] }: {
  centerId: string; templateId: string; templateVersion?: number; steps?: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  // Invalidate previous-page and initial-list responses whenever panel lifetime changes.
  const listGeneration = useRef(0);
  const [items, setItems] = useState<Draft[]>([]);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [attaching,setAttaching]=useState<string|null>(null);
  const [candidateRevision,setCandidateRevision]=useState(0);
  const [reason, setReason] = useState('');
  const base = activityMediaDrafts.endpoint(centerId, templateId);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const generation = listGeneration.current;
    setLoading(true);
    setError('');
    activityMediaDrafts.list(centerId, templateId).then(result => {
      if (active && listGeneration.current === generation) {
        setItems(result.items); setNextCursor(result.nextCursor); setHasMore(result.hasMore);
      }
    }).catch(() => {
      if (active && listGeneration.current === generation) setError('Could not load illustration proposals. Try reopening this panel.');
    }).finally(() => { if (active && listGeneration.current === generation) setLoading(false); });
    return () => { active = false; listGeneration.current += 1; };
  }, [open, base, centerId, templateId]);

  const loadMore = async () => {
    if (loading || loadingMore || busy || !nextCursor || !hasMore) return;
    const cursor = nextCursor;
    const generation = listGeneration.current;
    setLoadingMore(true); setError('');
    try {
      const result = await activityMediaDrafts.list(centerId, templateId, cursor);
      // A closed/reopened panel must never append an earlier generation's page.
      if (listGeneration.current !== generation) return;
      // Older pages never overwrite newer saved proposals or rejection states.
      setItems(previous => {
        const seen = new Set(previous.map(item => item.id));
        return [...previous, ...result.items.filter(item => !seen.has(item.id))];
      });
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      if (listGeneration.current === generation) setError('Older proposals could not be loaded. Retry without losing the visible history.');
    } finally {
      if (listGeneration.current === generation) setLoadingMore(false);
    }
  };

  const submit = async () => {
    if (!templateVersion || busy || loading || loadingMore) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = await activityMediaDrafts.propose(centerId, templateId, { ...form, templateVersion, stepNumber: form.stepNumber ? Number(form.stepNumber) : undefined,
        providerTerms: form.sourceType === 'GENERATED' ? form.providerTerms : undefined });
      setItems(prev => [saved, ...prev.filter(item => item.id !== saved.id)]);
      setNotice('Metadata proposal saved as a private draft. No image was uploaded, approved or shared.');
      setForm(initial);
    } catch {
      setError('Could not save. Verify the source, rights evidence, version and permissions. Your entries remain available.');
    } finally { setBusy(false); }
  };

  const reject = async (draft: Draft) => {
    if (busy || loading || loadingMore || reason.trim().length < 8) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await activityMediaDrafts.reject(centerId, templateId, draft.id, draft.version, reason.trim());
      setItems(prev => prev.map(item => item.id === result.id ? { ...item, ...result, rejectionReason: reason.trim() } : item));
      // History identity includes this draft's optimistic version and state,
      // so only the rejected row remounts after its atomic revocation.
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
    <Button variant="secondary" size="sm" aria-expanded={open} onClick={() => {
      listGeneration.current += 1;
      setLoadingMore(false);
      if (!open) setLoading(true);
      setOpen(!open);
    }}>
      <FileImage size={16} aria-hidden="true" />{open ? 'Close illustration proposals' : 'Illustration proposals'}
    </Button>
    {open && <Card className="space-y-4 p-4">
      <h4 className="font-display text-base font-semibold">Private illustration proposal registry</h4>
      <p className="flex gap-2 rounded-control bg-status-cautionSurface p-3 text-sm text-brand-ink">
        <ShieldAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
        Only private scanned PNG candidate staging is available after a metadata draft. No image publication is available.
        Human clinical/design approval and verified storage are separate mandatory gates.
      </p>
      <PrivateIllustrationStepPreview key={centerId + ':' + templateId + ':' + String(templateVersion ?? 'unversioned')}
        templateVersion={templateVersion} steps={steps} />
      <GeneratedArtworkSelector key={centerId + ':' + templateId + ':' + String(templateVersion ?? 'unversioned')}
        disabled={busy || !templateVersion}
        onSelect={asset=>setForm(previous=>({...previous,sourceType:'GENERATED',
          sceneType:asset.scene,altText:asset.alt,
          sourceReference:'m5-b-v1:' + asset.referenceId + ':sha256:' + asset.reviewSha256,
          license:'',providerTerms:''}))} />
      {/* Scope-coupled key invalidates pending local file checks when activity identity/version changes. */}
      <LocalActivityMediaReadiness key={centerId + ':' + templateId + ':' + String(templateVersion ?? 'unversioned')} />
      {error && <p role="alert" className="text-sm text-status-danger">{error}</p>}
      {notice && <p role="status" className="text-sm text-status-success">{notice}</p>}
      <fieldset disabled={busy} aria-label="Illustration proposal metadata" className="grid grid-cols-1 gap-3 sm:grid-cols-2 disabled:opacity-60">
        <label className="block text-sm font-medium">Artwork source type
          <select className={cls + ' mt-1'} value={form.sourceType} onChange={e => setForm(v => ({ ...v, sourceType: e.target.value as SourceType }))}>
            <option value="ORIGINAL">Original</option><option value="GENERATED">AI-generated</option><option value="LICENSED">Licensed</option>
          </select>
        </label>
        <label className="block text-sm font-medium">Proposed style version
          <input className={cls + ' mt-1'} value={ILLUSTRATION_STYLE_VERSION} readOnly
            aria-readonly="true" data-testid="locked-illustration-style" />
          <span className="mt-1 block text-[12px] text-brand-inkMuted">
            Direction B is locked across all specialties and activity screens.
            A metadata draft does not approve or publish an image.
          </span>
        </label>
        {field('sceneType', 'Scene type', 'Guided fine-motor activity')}
        <label className="block text-sm font-medium">Illustration target
          <select className={cls + ' mt-1'} value={form.stepNumber}
            onChange={e => setForm(prev => ({ ...prev, stepNumber: e.target.value }))}>
            <option value="">Whole activity</option>
            {steps.slice(0, 64).map((step, i) => <option key={i} value={i + 1}>
              {i + 1}. {step.length > 78 ? step.slice(0, 78) + '…' : step}
            </option>)}
          </select>
        </label>
        {field('license', 'License or rights basis', 'Review record, not a license grant')}
        <div className="sm:col-span-2">{field('sourceReference', 'Provenance / source evidence reference', 'Internal record ID; never a public asset URL')}</div>
        <div className="sm:col-span-2">{field('altText', 'Proposed accessible description', 'Describe the action and relevant materials')}</div>
        {form.sourceType === 'GENERATED' && <div className="sm:col-span-2">{field('providerTerms', 'Provider commercial terms evidence', 'Required for AI-generated proposals')}</div>}
      </fieldset>
      <Button onClick={() => void submit()} disabled={busy || loading || loadingMore || !templateVersion || form.styleVersion.trim().length < 4 ||
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
            <span className="text-brand-inkMuted">Activity v{draft.templateVersion} · {draft.stepNumber ? `Step ${draft.stepNumber}` : 'whole activity'} · {draft.sourceType} · {draft.styleVersion}</span></div>
          <p className="mt-2 break-words">{draft.altText}</p>
          <p className="mt-1 break-words text-brand-inkMuted">Source: {draft.sourceReference} · Rights: {draft.license}</p>
          {draft.rejectionReason && <p className="mt-1 text-status-danger">Rejected: {draft.rejectionReason}</p>}
          {draft.state==='DRAFT' && templateVersion===draft.templateVersion &&
            <div className="mt-2 space-y-2" data-testid={`media-private-upload-${draft.id}`}>
              <Button variant="secondary" size="sm"
                onClick={()=>setAttaching(current=>current===draft.id?null:draft.id)}>
                {attaching===draft.id?'Close private image intake':'Attach scanned private PNG'}
              </Button>
              {attaching===draft.id&&<PrivatePngCandidatePicker
                label="Stage a private illustration candidate (not published)"
                onStage={async pngBase64=>{
                  await activityMediaDrafts.uploadCandidate(centerId,templateId,draft.id,pngBase64);
                  setNotice('Encrypted scanned illustration candidate is quarantined; independent rights and clinical review still required.');
                  setAttaching(null);
                  setCandidateRevision(value=>value+1);
                }} />}
            </div>}
          <ActivityMediaCandidateHistory key={[draft.id, draft.version, draft.state, candidateRevision].join(':')}
            centerId={centerId} templateId={templateId} draftId={draft.id} />
          {draft.state === 'DRAFT' && <div className="mt-2">
            {rejecting === draft.id ? <div className="space-y-2">
              <label className="block font-medium">Reason for rejection
                <textarea className={cls + ' mt-1'} rows={2} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} />
              </label>
              <div className="flex flex-wrap gap-2"><Button variant="danger" size="sm" disabled={busy || loading || loadingMore || reason.trim().length < 8} onClick={() => void reject(draft)}>Record rejection</Button>
                <Button variant="secondary" size="sm" onClick={() => { setRejecting(null); setReason(''); }}>Cancel</Button></div>
            </div> : <Button variant="secondary" size="sm" onClick={() => { setRejecting(draft.id); setReason(''); }}>Reject draft</Button>}
          </div>}
        </li>)}</ul>}
      {hasMore && <Button variant="secondary" size="sm" disabled={busy || loading || loadingMore}
        onClick={() => void loadMore()} data-testid={`media-drafts-more-${templateId}`}>
        {loadingMore ? 'Loading older proposals…' : 'Load older proposals'}
      </Button>}
      <p className="text-xs text-brand-inkMuted">Showing {items.length}{hasMore ? '+' : ''} proposals. Every historical draft remains accessible by loading older pages. Proposals may have a separate encrypted quarantined candidate. No asset is automatically approved, readable or released.</p>
    </Card>}
  </section>;
}
