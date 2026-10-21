'use client';

import { useState } from 'react';
import { CheckCircle2, CircleHelp, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/design/ui';
import { Dialog } from '@/components/design/states';
import { CHOICE_LABEL, dayName, practiceApi, type Choice, type Outcome, type PracticeActivity } from '@/lib/practice';

type Phase = 'choose' | 'confirm' | 'sending' | 'success' | 'failure' | 'unknown';
const CHOICES: Choice[] = ['COMPLETED', 'NEEDED_HELP', 'NOT_COMPLETED', 'SKIPPED'];
const errStatus = (e: unknown) => (e as { status?: number }).status;

// One fixed choice, a confirmation step, then a single submission key reused for every retry so nothing is recorded twice.
// Success is only shown once the server has confirmed the outcome.
export function RecordDialog({ centerId, childId, childName, activity, date, onClose, onRecorded }: { centerId: string; childId: string; childName: string; activity: PracticeActivity; date: string; onClose: () => void; onRecorded: () => void }) {
  const [phase, setPhase] = useState<Phase>('choose');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [key] = useState(() => crypto.randomUUID());
  const [result, setResult] = useState<Outcome | null>(null);
  const [msg, setMsg] = useState('');

  const send = async () => {
    setPhase('sending');
    try { setResult(await practiceApi.record(centerId, { childId, templateId: activity.id, practiceDate: date, choice: choice!, idempotencyKey: key })); setPhase('success'); onRecorded(); }
    catch (e) {
      const s = errStatus(e);
      if (!s || s >= 500) return setPhase('unknown');
      setMsg((e as Error).message || 'This couldn’t be saved.');
      setPhase('failure');
    }
  };
  const check = async () => {
    setPhase('sending');
    try { setResult(await practiceApi.byKey(centerId, key)); setPhase('success'); onRecorded(); }
    catch (e) { setPhase(errStatus(e) === 404 ? 'confirm' : 'unknown'); if (errStatus(e) === 404) setMsg('Nothing was saved yet. You can send it again.'); }
  };

  const footer = {
    choose: <><Button variant="ghost" tone="family" onClick={onClose} data-testid="record-cancel">Cancel</Button><Button tone="family" disabled={!choice} onClick={() => { setMsg(''); setPhase('confirm'); }} data-testid="record-next">Continue</Button></>,
    confirm: <><Button variant="ghost" tone="family" onClick={() => setPhase('choose')} data-testid="record-back">Change answer</Button><Button tone="family" onClick={() => void send()} data-testid="record-submit">Save this answer</Button></>,
    sending: null,
    success: <Button tone="family" onClick={onClose} data-testid="record-done">Done</Button>,
    failure: <><Button variant="ghost" tone="family" onClick={onClose} data-testid="record-close">Close</Button><Button tone="family" onClick={() => setPhase('choose')} data-testid="record-retry-choose">Try again</Button></>,
    unknown: <><Button variant="ghost" tone="family" onClick={onClose} data-testid="record-close-unknown">Close</Button><Button tone="family" onClick={() => void check()} data-testid="record-check">Check if it was saved</Button></>,
  }[phase];

  return (
    <Dialog open onClose={onClose} tone="family" title={activity.title} testId="record-dialog" footer={footer}>
      <p className="text-[14px] text-fam-muted">{childName} · {dayName(date, 'long')} · <strong>Sample activity</strong></p>
      {phase === 'choose' && (
        <fieldset className="mt-3 space-y-2" data-testid="record-choices">
          <legend className="mb-1 text-[15px] font-semibold">How did it go?</legend>
          {CHOICES.map((ch) => (
            <label key={ch} className={`flex cursor-pointer items-center gap-3 rounded-control border-2 p-3 text-[15px] ${choice === ch ? 'border-fam-accent bg-fam-accentTint' : 'border-fam-border bg-fam-surface'}`}>
              <input type="radio" name="choice" value={ch} checked={choice === ch} onChange={() => setChoice(ch)} className="h-4 w-4 accent-current" data-testid={`record-choice-${ch}`} />{CHOICE_LABEL[ch]}
            </label>
          ))}
          <p className="pt-1 text-[12px] text-fam-muted">Notes, photos and videos are switched off in this demonstration.</p>
        </fieldset>
      )}
      {phase === 'confirm' && (
        <div className="mt-3 space-y-2" data-testid="record-confirm">
          <p className="text-[15px]">You’re about to save <strong data-testid="record-confirm-choice">{CHOICE_LABEL[choice!]}</strong> for this activity on {dayName(date, 'long')}.</p>
          <p className="text-[13px] text-fam-muted">You can’t change it after saving. This is synthetic sample data, not part of your child’s therapy record.</p>
          {msg && <p className="text-[13px] text-fam-caution" data-testid="record-not-saved">{msg}</p>}
        </div>
      )}
      {phase === 'sending' && <p className="mt-4 flex items-center gap-2 text-[15px]" role="status" data-testid="record-sending"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Saving…</p>}
      {phase === 'success' && result && (
        <p className="mt-4 flex items-start gap-2 rounded-control bg-fam-accentTint p-3 text-[15px]" role="status" data-testid="record-success"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-fam-accent" aria-hidden="true" /><span>Saved: <strong>{CHOICE_LABEL[result.choice]}</strong> for {dayName(result.practiceDate, 'long')}. The server confirmed it at {new Date(result.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</span></p>
      )}
      {phase === 'failure' && <p className="mt-4 flex items-start gap-2 rounded-control bg-status-dangerSurface p-3 text-[15px] text-status-danger" role="alert" data-testid="record-failure"><XCircle size={20} className="mt-0.5 shrink-0" aria-hidden="true" /><span>Not saved. {msg}</span></p>}
      {phase === 'unknown' && <p className="mt-4 flex items-start gap-2 rounded-control bg-status-cautionSurface p-3 text-[15px]" role="alert" data-testid="record-unknown"><CircleHelp size={20} className="mt-0.5 shrink-0" aria-hidden="true" /><span>We couldn’t confirm whether this was saved, because the connection dropped. Nothing is stored on this device. Check before trying again; it won’t be saved twice.</span></p>}
    </Dialog>
  );
}
