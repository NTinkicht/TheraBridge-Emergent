'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/design/ui';
import { SelectField } from '@/components/centers/kit';
import { syntheticProvider, SYNTHETIC_SPEECH, type DictationScenario } from '@/lib/dictation';

export function Dictation({ disabled, onInsert, onPending }: { disabled: boolean; onInsert: (s: string) => void; onPending: (pending: boolean) => void }) {
  const [text, setText] = useState(''), [scenario, setScenario] = useState<DictationScenario>('success'), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const abort = useRef<AbortController | null>(null);
  useEffect(() => { onPending(!!text || busy); }, [text, busy, onPending]);
  useEffect(() => () => { abort.current?.abort(); onPending(false); }, [onPending]);
  async function transcribe() {
    const controller = new AbortController(); abort.current = controller; setBusy(true); setMessage('Processing synthetic fixture…');
    try {
      const result = await syntheticProvider(scenario).transcribe({ syntheticFixture: SYNTHETIC_SPEECH }, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.trim()) throw new Error('No transcript returned. Retry or type text.');
      setText(t => t ? `${t}\n${result}` : result); setMessage('Synthetic transcript ready for correction. Not saved or inserted.');
    } catch (e) { if (!controller.signal.aborted) setMessage((e as Error).message); } finally { if (abort.current === controller) { abort.current = null; if (!controller.signal.aborted) setBusy(false); } }
  }
  return <fieldset className="space-y-3 rounded-control border border-border-light p-3" disabled={disabled}>
    <legend className="text-[14px] font-semibold">Dictation review · synthetic test provider</legend>
    <p className="text-[13px] text-brand-inkMuted">Real microphone and external processing disabled. This loads a fixed synthetic text fixture, not speech recognition. No audio is captured.</p>
    <SelectField label="Synthetic test scenario" value={scenario} onChange={s => setScenario(s as DictationScenario)} testId="dictation-scenario" options={['success', 'permission', 'unavailable', 'unsupported', 'interrupted', 'empty', 'provider', 'network'].map(value => ({ value, label: value }))} />
    <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy || disabled} onClick={() => void transcribe()}><Mic size={16} aria-hidden="true" />Run synthetic transcription</Button>{busy && <Button variant="ghost" onClick={() => { abort.current?.abort(); setBusy(false); setMessage('Transcription cancelled.'); }}>Cancel transcription</Button>}</div>
    <p role="status" className="text-[13px]">{message}</p>
    <label className="block text-[14px]">Editable transcript (not saved)<textarea aria-label="Editable transcript (not saved)" className="mt-1 w-full rounded-control border border-border-light p-2" maxLength={4000} rows={3} value={text} onChange={e => setText(e.target.value)} /></label>
    <div className="flex flex-wrap gap-2"><Button disabled={disabled || busy || !text.trim()} onClick={() => { onInsert(text); setText(''); setMessage('Reviewed text inserted into the note. Save confirmation is still required.'); }}>Insert reviewed text</Button><Button variant="ghost" disabled={busy} onClick={() => { if (!text || window.confirm('Discard the unsaved transcript?')) setText(''); }}>Discard transcript</Button></div>
  </fieldset>;
}
