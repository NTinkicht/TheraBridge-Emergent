'use client';
import { useState } from 'react';
import { Copy, PencilLine, X } from 'lucide-react';
import { Button, Card } from '@/components/design/ui';
import { FormAlert } from '@/components/auth/Field';
import { errorText } from '@/components/centers/kit';
import { clinicalApi, type Template } from '@/lib/clinical';

const items = (value: string) => value.split('\n').map(s => s.trim()).filter(Boolean);
export function TemplateActions({ centerId, template, onChanged, onError }: {
  centerId: string; template: Template; onChanged: (text: string) => void; onError: (e: unknown) => void;
}) {
  const [mode, setMode] = useState<'none' | 'copy' | 'edit'>('none');
  const [f, setF] = useState({
    title: template.title, ageBand: template.ageBand, minutes: String(template.minutes),
    materials: template.materials.join('\n'), steps: template.steps.join('\n'),
    safety: template.safety.join('\n'),
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const start = (next: 'copy' | 'edit') => {
    setF({
      title: next === 'copy' ? `${template.title} — copy` : template.title,
      ageBand: template.ageBand, minutes: String(template.minutes),
      materials: template.materials.join('\n'), steps: template.steps.join('\n'),
      safety: template.safety.join('\n'),
    });
    setError(null); setMode(next);
  };
  async function submit() {
    if (busy) return;
    if (f.title.trim().length < 3) { setError('Enter a descriptive title of at least three characters.'); return; }
    if (mode === 'edit' && (!items(f.steps).length || !items(f.safety).length)) {
      setError('Include at least one step and one safety instruction.'); return;
    }
    setBusy(true); setError(null);
    try {
      if (mode === 'copy') {
        await clinicalApi.duplicateTemplate(centerId, template.id, f.title.trim());
        onChanged('An independent centre-owned copy was created. The source remains unchanged.');
      } else {
        if (template.version === undefined) throw new Error('Activity version is missing. Reload before editing.');
        await clinicalApi.editTemplate(centerId, template.id, {
          version: template.version, title: f.title.trim(), ageBand: f.ageBand.trim(),
          minutes: Number(f.minutes), materials: items(f.materials),
          steps: items(f.steps), safety: items(f.safety),
        });
        onChanged('Activity updated. Previously captured plan and session activity snapshots are unchanged.');
      }
      setMode('none');
    } catch (e) { setError(errorText(e, onError) || 'Could not save this activity. Your edits remain here.'); }
    finally { setBusy(false); }
  }
  return <div className="mt-2 space-y-3" data-testid={`activity-actions-${template.id}`}>
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" onClick={() => start('copy')} data-testid={`activity-duplicate-${template.id}`}>
        <Copy size={14} aria-hidden="true" />Duplicate
      </Button>
      {template.mine === true && <Button size="sm" variant="secondary" onClick={() => start('edit')} data-testid={`activity-edit-${template.id}`}>
        <PencilLine size={14} aria-hidden="true" />Edit my activity
      </Button>}
      {template.mine === false && template.library === 'center' && <span className="text-[12px] text-brand-inkMuted">Duplicate to customize another author's activity.</span>}
    </div>
    {mode !== 'none' && <Card className="space-y-3 p-4" testId={`activity-${mode}-form-${template.id}`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold">{mode === 'copy' ? 'Duplicate activity' : 'Edit my activity'}</h4>
        <button type="button" onClick={() => setMode('none')} aria-label="Close activity editor" className="rounded-control p-2 focus-visible:outline"><X size={18} /></button>
      </div>
      <p className="text-[12px] text-brand-inkMuted">Specialty: {template.service} · source version {template.version ?? 1}. Existing plan snapshots will not be rewritten.</p>
      {error && <FormAlert tone="danger" testId="activity-action-error">{error}</FormAlert>}
      <label className="block text-[13px] font-semibold">Title
        <input className="mt-1 w-full rounded-control border border-border-strong p-2 text-[14px]" value={f.title} maxLength={120} onChange={e => setF(old=>({...old,title:e.target.value}))} />
      </label>
      {mode === 'edit' && <>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-[13px] font-semibold">Age band
            <input className="mt-1 w-full rounded-control border border-border-strong p-2" value={f.ageBand} maxLength={32} onChange={e=>setF(old=>({...old,ageBand:e.target.value}))}/>
          </label>
          <label className="block text-[13px] font-semibold">Minutes
            <input type="number" min={1} max={120} className="mt-1 w-full rounded-control border border-border-strong p-2" value={f.minutes} onChange={e=>setF(old=>({...old,minutes:e.target.value}))}/>
          </label>
        </div>
        {(['materials','steps','safety'] as const).map(k=><label key={k} className="block text-[13px] font-semibold capitalize">{k} (one per line)
          <textarea className="mt-1 w-full rounded-control border border-border-strong p-2 text-[13px]" rows={3} value={f[k]} onChange={e=>setF(old=>({...old,[k]:e.target.value}))}/>
        </label>)}
      </>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => void submit()} data-testid={`activity-action-save-${template.id}`}>{busy ? 'Saving…' : mode === 'copy' ? 'Create my copy' : 'Save updated version'}</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setMode('none')}>Cancel</Button>
      </div>
    </Card>}
  </div>;
}
