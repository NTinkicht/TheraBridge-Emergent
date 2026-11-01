'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/design/ui';
import { SelectField } from '@/components/centers/kit';
import { DICTATION_LANGUAGES, nextCaptureState, syntheticProvider, SYNTHETIC_SPEECH_BY_LANGUAGE, type CaptureState, type DictationLanguage, type DictationScenario } from '@/lib/dictation';

export function Dictation({ disabled, onInsert, onPending }: { disabled: boolean; onInsert: (s: string) => { accepted: boolean; message?: string }; onPending: (pending: boolean) => void }) {
  const [text, setText] = useState(''), [scenario, setScenario] = useState<DictationScenario>('success'), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [language, setLanguage] = useState<DictationLanguage>('en'), [capture, setCapture] = useState<CaptureState>('IDLE');
  const abort = useRef<AbortController | null>(null);
  useEffect(() => { onPending(!!text || busy || capture !== 'IDLE'); }, [text, busy, capture, onPending]);
  useEffect(() => () => { abort.current?.abort(); onPending(false); }, [onPending]);
  const transition = (action: 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'RESET') => {
    setCapture(current => nextCaptureState(current, action));
    const messages = { START: 'Simulating capture. No microphone or audio is used.',
      PAUSE: 'Synthetic capture paused.', RESUME: 'Synthetic capture resumed.',
      STOP: 'Synthetic capture stopped. You can process the fictional text fixture.',
      RESET: 'Synthetic capture cleared. No audio was retained.' };
    setMessage(messages[action]);
  };
  async function transcribe() {
    if (capture === 'SIMULATING' || capture === 'PAUSED' || busy || disabled) return;
    const controller = new AbortController(); abort.current = controller; setBusy(true); setMessage('Processing synthetic fixture…');
    try {
      const result = await syntheticProvider(scenario).transcribe({ syntheticFixture: SYNTHETIC_SPEECH_BY_LANGUAGE[language], language }, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.trim()) throw new Error('No transcript returned. Retry or type text.');
      setText(t => t ? `${t}\n${result}` : result); setMessage('Synthetic transcript ready for correction. Not saved or inserted.');
    } catch (e) { if (!controller.signal.aborted) setMessage((e as Error).message); } finally { if (abort.current === controller) { abort.current = null; setBusy(false); setCapture('IDLE'); } }
  }
  return <div className="space-y-3 rounded-control border border-border-light p-3">
    <fieldset className="space-y-3" disabled={disabled}>
    <legend className="text-[14px] font-semibold">Dictation review · synthetic test provider</legend>
    <p className="text-[13px] text-brand-inkMuted">Real microphone and external processing disabled. Capture controls are simulated; they do not access an audio device, upload, store, or transcribe audio.</p>
    <SelectField label="Synthetic dictation language" value={language} onChange={s => { setLanguage(s as DictationLanguage); setCapture('IDLE'); }} options={[...DICTATION_LANGUAGES]} testId="dictation-language" />
    <SelectField label="Synthetic test scenario" value={scenario} onChange={s => setScenario(s as DictationScenario)} testId="dictation-scenario" options={['success', 'permission', 'unavailable', 'unsupported', 'interrupted', 'empty', 'provider', 'network'].map(value => ({ value, label: value }))} />
    <div className="flex flex-wrap gap-2">
      {capture === 'IDLE' && <Button variant="secondary" disabled={busy} onClick={() => transition('START')}>Start simulated capture</Button>}
      {capture === 'SIMULATING' && <Button variant="secondary" onClick={() => transition('PAUSE')}>Pause simulated capture</Button>}
      {capture === 'PAUSED' && <Button variant="secondary" onClick={() => transition('RESUME')}>Resume simulated capture</Button>}
      {(capture === 'SIMULATING' || capture === 'PAUSED') && <Button variant="secondary" onClick={() => transition('STOP')}>Stop simulated capture</Button>}
      {capture === 'READY' && <Button variant="ghost" onClick={() => transition('RESET')}>Discard simulated capture</Button>}
      <Button variant="secondary" disabled={busy || capture === 'SIMULATING' || capture === 'PAUSED'} onClick={() => void transcribe()}><Mic size={16} aria-hidden="true" />Run synthetic transcription</Button>
      {busy && <Button variant="ghost" onClick={() => { abort.current?.abort(); abort.current = null; setBusy(false); setCapture('IDLE'); setMessage('Transcription cancelled.'); }}>Cancel transcription</Button>}
    </div>
    <p className="text-[13px]" data-testid="dictation-capture-state">Synthetic capture state: {capture.toLowerCase()}</p>
    <p role="status" className="text-[13px]">{message}</p>
    </fieldset>
    {disabled && text && <p role="status" className="text-[14px]">Retained uninserted transcript — not saved clinical evidence. Editing and insertion are unavailable. Select and copy this text before leaving; it will not be inserted automatically.</p>}
    <label className="block text-[14px]">{disabled ? 'Retained transcript (not saved; copy only)' : 'Editable transcript (not saved)'}<textarea aria-label={disabled ? 'Retained transcript (not saved; copy only)' : 'Editable transcript (not saved)'} readOnly={disabled} className="mt-1 w-full rounded-control border border-border-light p-2" rows={3} value={text} onChange={e => setText(e.target.value)} /></label>
    <div className="flex flex-wrap gap-2"><Button disabled={disabled || busy || !text.trim()} onClick={() => { const result = onInsert(text); if (result.accepted) { setText(''); setMessage('Reviewed text inserted into the note. Save confirmation is still required.'); } else setMessage(result.message ?? 'Insertion rejected. Your transcript is retained.'); }}>Insert reviewed text</Button><Button variant="ghost" disabled={busy} onClick={() => { if (!text || window.confirm('Discard the unsaved transcript?')) setText(''); }}>Discard transcript</Button></div>
  </div>;
}
