'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Field } from '@/components/auth/Field';
import { SelectField } from '@/components/centers/kit';
import { Button, Card, LockedAction, Pill } from '@/components/design/ui';
import { serviceLabel } from '@/components/operations/BookDialog';
import { clinicalApi, LOCKED_REASON, type SessionActivity, type Workspace } from '@/lib/clinical';
import { Dictation } from './Dictation';
const input = 'mt-1 w-full rounded-control border border-border-light bg-transparent px-3 py-2 text-[14px]';
const options = (items: string[]) => items.map(value => ({ value, label: value.replaceAll('_', ' ').toLowerCase() }));
const localTime = (iso: string | null) => iso ? new Date(Date.parse(iso) - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0,16) : '';
export function SessionEditor({ centerId, n, ws, onPending }: { centerId: string; n: Workspace['notes'][number]; ws: Workspace; onPending: (id: string, pending: boolean) => void }) {
  const [sections, setSections] = useState(n.sections), [activities, setActivities] = useState(n.activities), [start, setStart] = useState(localTime(n.actualStart)), [end, setEnd] = useState(localTime(n.actualEnd)), [attendance, setAttendance] = useState(n.attendance);
  const [saving, setSaving] = useState(false), [startError, setStartError] = useState<string>(), [pinnedStart, setPinnedStart] = useState(n.actualStart), [completed, setCompleted] = useState(n.executionStatus === 'COMPLETED'), [dirty, setDirty] = useState(false), [transcriptPending, setTranscriptPending] = useState(false), [status, setStatus] = useState('Saved on server'), [error, setError] = useState(false), [query, setQuery] = useState('');
  const version = useRef(n.version), busy = useRef(false), revision = useRef(0), retry = useRef<Parameters<typeof clinicalApi.saveSession>[2] | null>(null);
  const edit = ws.canEdit && n.mine && !completed;
  const changed = () => { revision.current++; retry.current = null; setDirty(true); setError(false); setStatus('Unsaved changes'); };
  useEffect(() => { onPending(n.id, dirty || transcriptPending); return () => onPending(n.id, false); }, [dirty, transcriptPending, n.id, onPending]);
  const update = (id: string, patch: Partial<SessionActivity>) => { changed(); setActivities(a => a.map(x => x.id === id ? { ...x, ...patch } : x)); };
  async function save(finish = false) {
    if (busy.current || !edit) return;
    if (finish && (transcriptPending || !window.confirm('Complete this session as read-only? This does not sign or release a clinical document.'))) return;
    const parsedStart = pinnedStart ?? (start && Number.isFinite(Date.parse(start)) ? new Date(start).toISOString() : null);
    if (!parsedStart || !Number.isFinite(Date.parse(parsedStart))) { setStartError('Enter the actual start on the recorded session date before saving.'); setError(true); setStatus('Actual start is required. Your original note is preserved.'); return; }
    setStartError(undefined);
    busy.current = true; setSaving(true); setStatus('Saving…'); setError(false); const rev = revision.current;
    try {
      const body = retry.current ?? { version: version.current, mutationKey: crypto.randomUUID(), sections, activities: activities.map(({ id, templateId, minutes, objective, planVersionId, goalKey, completion, outcome, assistance, observation }) => ({ id, templateId, minutes, objective, planVersionId, goalKey, completion, outcome, assistance, observation })), actualStart: parsedStart, actualEnd: end ? new Date(end).toISOString() : undefined, attendance, executionStatus: finish ? 'COMPLETED' : 'IN_PROGRESS' };
      retry.current = body;
      const result = await clinicalApi.saveSession(centerId, n.id, body); version.current = result.version; retry.current = null; setPinnedStart(body.actualStart);
      if (rev === revision.current) { setDirty(false); setStatus(`Saved on server · ${new Date(result.updatedAt).toLocaleTimeString()}`); } else setStatus('Newer edits are not saved yet');
      if (body.executionStatus === 'COMPLETED') setCompleted(true);
    } catch (e) { setError(true); setStatus((e as Error).message + ' Your text remains here. Retry, or copy it before reloading.'); } finally { busy.current = false; setSaving(false); }
  }
  useEffect(() => { if (!dirty || error || !edit) return; const timer = setTimeout(() => void save(), 1500); return () => clearTimeout(timer); });
  const insert = (text: string) => { changed(); setSections(s => ({ ...s, response: [s.response, text].filter(Boolean).join('\n') })); };
  const pending = useCallback((value: boolean) => setTranscriptPending(value), []);
  const goals = ws.plans.filter(p => p.service === n.service).flatMap(p => p.versions.flatMap(v => v.goals.map(g => ({ value: `${v.id}|${g.key}`, label: `${p.title} v${v.number}: ${g.title} (${g.measure})` }))));
  return <Card className="space-y-4 p-4 md:p-5" testId={`note-${n.id}`}>
    <div className="flex flex-wrap gap-2"><h3 className="font-semibold">{serviceLabel(n.service)} session · {n.sessionDate}</h3><Pill>{completed ? 'Completed · unsigned' : 'In progress · unsigned'}</Pill><span className="text-[13px]">by {n.author}</span></div>
    <fieldset disabled={!edit || saving} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3"><Field label="Actual start" type="datetime-local" disabled={!!pinnedStart} error={startError} hint={pinnedStart ? 'Pinned actual start; corrections require an authorized amendment (not enabled).' : `Legacy draft: enter actual start in your browser’s local time. It must fall on ${n.sessionDate} in center time zone ${ws.timezone}. No time has been inferred.`} value={start} onChange={e => { changed(); setStart(e.target.value); }} testId={`session-start-time-${n.id}`} /><Field label="Actual end" type="datetime-local" value={end} onChange={e => { changed(); setEnd(e.target.value); }} testId={`session-end-time-${n.id}`} /><SelectField label="Attendance review" value={attendance} onChange={s => { changed(); setAttendance(s as typeof attendance); }} options={options(['PRESENT', 'NO_SHOW'])} testId={`session-attendance-${n.id}`} /></div>
      <p className="text-[13px] text-brand-inkMuted">Activity results are factual, unvalidated session evidence—not approved progress measurements. Goals retain their exact version and measurement semantics.</p>
      {activities.map((a, index) => <section key={a.id} className="space-y-3 rounded-control border border-border-light p-3" aria-label={`Activity ${index + 1}`}>
        <h4 className="font-semibold">{index + 1}. {a.snapshot?.title ?? ws.templates.find(t => t.id === a.templateId)?.title}</h4>
        {(() => { const t = a.snapshot ?? ws.templates.find(t => t.id === a.templateId); return t && <details><summary className="cursor-pointer text-[14px]">Instructions, materials and estimated duration</summary><p>{t.minutes} minutes · {t.materials.join(', ')}</p><ol className="list-decimal pl-5">{t.steps.map((s,i) => <li key={i}>{s}</li>)}</ol><p>{t.safety.join(' ')}</p></details>; })()}
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Actual minutes" type="number" value={String(a.minutes)} onChange={e => update(a.id, { minutes: Number(e.target.value) })} testId={`minutes-${a.id}`} /><Field label="Objective addressed" value={a.objective} onChange={e => update(a.id, { objective: e.target.value })} testId={`objective-${a.id}`} />
        <SelectField label="Goal version (optional)" value={a.planVersionId ? `${a.planVersionId}|${a.goalKey}` : ''} options={[{ value: '', label: 'No goal reference' }, ...goals]} onChange={s => { const [planVersionId, goalKey] = s.split('|'); update(a.id, { planVersionId: planVersionId || undefined, goalKey: goalKey || undefined }); }} testId={`goal-${a.id}`} />
        <SelectField label="Completion" value={a.completion} onChange={s => update(a.id, { completion: s as SessionActivity['completion'] })} options={options(['NOT_STARTED', 'COMPLETED', 'SKIPPED'])} testId={`completion-${a.id}`} />
        <SelectField label="Outcome" value={a.outcome ?? ''} onChange={s => update(a.id, { outcome: s as SessionActivity['outcome'] || undefined })} options={[{ value: '', label: 'Not recorded' }, ...options(['ACHIEVED', 'PARTIAL', 'NOT_ACHIEVED'])]} testId={`outcome-${a.id}`} />
        <SelectField label="Assistance (separate from outcome)" value={a.assistance ?? ''} onChange={s => update(a.id, { assistance: s as SessionActivity['assistance'] || undefined })} options={[{ value: '', label: 'Not recorded' }, ...options(['INDEPENDENT', 'SOME_ASSISTANCE', 'SUBSTANTIAL_ASSISTANCE'])]} testId={`assistance-${a.id}`} /></div>
        <label className="block text-[14px]">Factual observation<textarea aria-label="Factual observation" className={input} value={a.observation} maxLength={1000} onChange={e => update(a.id, { observation: e.target.value })} /></label>
        <div className="flex flex-wrap gap-2">{[-1,1].map(delta => <Button key={delta} variant="secondary" size="sm" disabled={!edit || index + delta < 0 || index + delta >= activities.length} onClick={() => { changed(); setActivities(items => { const next = [...items]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return next; }); }}>{delta < 0 ? 'Move up' : 'Move down'}</Button>)}<Button variant="ghost" size="sm" onClick={() => { changed(); setActivities(items => items.filter(x => x.id !== a.id)); }}>Remove activity</Button></div>
      </section>)}
      {!activities.length && <p className="text-[14px]">No activities selected yet.</p>}
      {edit && <div className="space-y-2"><Field label={`Search ${serviceLabel(n.service)} activity library`} value={query} onChange={e => setQuery(e.target.value)} testId={`session-search-${n.id}`} /><div className="flex max-h-48 flex-col gap-2 overflow-y-auto">{ws.templates.filter(t => t.service === n.service && t.title.toLowerCase().includes(query.toLowerCase())).map(t => <Button key={t.id} variant="secondary" onClick={() => { changed(); setActivities(items => [...items, { id: crypto.randomUUID(), templateId: t.id, snapshot: t, minutes: 0, objective: '', completion: 'NOT_STARTED', observation: '' }]); }}>Add {t.title}</Button>)}</div></div>}
      <div className="grid gap-3 md:grid-cols-2">{[['focus','Session focus'],['activities','Overall session note'],['response','Child response / reviewed dictation'],['nextSteps','Next steps']].map(([key,label]) => <label key={key} className="block text-[14px]">{label}<textarea aria-label={label} className={input} rows={3} maxLength={4000} value={sections[key] ?? ''} onChange={e => { changed(); setSections(s => ({ ...s, [key]: e.target.value })); }} /></label>)}</div>
    </fieldset>
    {edit && <Dictation disabled={!edit || saving} onInsert={insert} onPending={pending} />}
    <p role="status" aria-live="polite" className={error ? 'text-status-danger text-[14px]' : 'text-brand-inkMuted text-[13px]'}>{status}</p>
    <div className="flex flex-wrap items-start gap-2">{edit && <><Button disabled={saving} onClick={() => void save()}>{error ? 'Retry save' : 'Save draft'}</Button><Button variant="secondary" disabled={transcriptPending || saving} onClick={() => void save(true)}>Review and complete session</Button></>}<LockedAction id={`sign-${n.id}`} label="Sign note" reason={LOCKED_REASON} /></div>
  </Card>;
}
