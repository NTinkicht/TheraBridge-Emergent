'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Lock, MessageSquarePlus, MessagesSquare, Send, ShieldAlert } from 'lucide-react';
import { FormAlert } from '@/components/auth/Field';
import { SelectField, errorText, useLoad } from '@/components/centers/kit';
import { Button, Card, Pill, type Tone } from '@/components/design/ui';
import { Dialog, EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { AUDIENCES, CATEGORIES, NON_CLINICAL_NOTICE, audienceLabel, categoryLabel, messagesApi, type ThreadAudience, type ThreadDetail, type ThreadRow } from '@/lib/messages';
import { opsApi } from '@/lib/operations';

const when = (s: string) => new Date(s).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function NonClinicalNotice({ tone }: { tone: Tone }) {
  return (
    <p className={`flex items-start gap-2 rounded-control p-3 text-[13px] ${tone === 'family' ? 'bg-fam-warm' : 'bg-status-infoSurface'}`} data-testid="messages-non-clinical-notice">
      <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><span><strong>Synthetic demonstration only.</strong> Real family messaging stays off until the safeguarding, consent and recipient-visibility decisions are approved. Family conversations are visible only to their explicitly addressed guardian; internal staff conversations are never visible to families. {NON_CLINICAL_NOTICE}</span>
    </p>
  );
}

function ThreadList({ items, active, onPick, family }: { items: ThreadRow[]; active: string | null; onPick: (id: string) => void; family: boolean }) {
  return (
    <ul className="divide-y divide-border-light" data-testid="thread-list">
      {items.map((t) => (
        <li key={t.id}>
          <button type="button" onClick={() => onPick(t.id)} aria-current={active === t.id ? 'true' : undefined} data-testid={`thread-${t.id}`}
            className={`flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-surface-subtle ${active === t.id ? 'bg-surface-subtle' : ''}`}>
            <span className="flex items-center justify-between gap-2">
              <span className={`min-w-0 truncate text-[14px] ${t.unread ? 'font-bold' : 'font-semibold'}`}>{t.subject}</span>
              {t.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-action" aria-label="Unread" data-testid={`thread-unread-${t.id}`} />}
            </span>
            <span className="text-[12px] text-brand-inkMuted">{family ? '' : `${t.child} · `}{categoryLabel(t.category)}{!family ? ` · ${audienceLabel(t.audience)}${t.service ? ` (${t.service})` : ''}` : ''} · {when(t.lastMessageAt)}{t.status === 'CLOSED' ? ' · closed' : ''}</span>
            <span className="line-clamp-1 text-[13px] text-brand-inkMuted">{t.lastFrom === 'STAFF' ? (family ? 'Care team: ' : 'You/team: ') : family ? 'You: ' : 'Family: '}{t.preview}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Conversation({ centerId, id, tone, onBack, onChanged, onError }: { centerId: string; id: string; tone: Tone; onBack: () => void; onChanged: () => void; onError: (e: unknown) => void }) {
  const fetcher = useCallback(() => messagesApi.thread(centerId, id), [centerId, id]);
  const { data, setData, failed, reload } = useLoad<ThreadDetail>(fetcher, onError);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (data) onChanged(); }, [data?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ block: 'nearest' }); }, [data?.messages.length]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') void messagesApi.thread(centerId, id).then(setData).catch(() => undefined); }, 30_000);
    return () => clearInterval(t);
  }, [centerId, id, setData]);
  const act = async (fn: () => Promise<ThreadDetail>, clear = false) => {
    setBusy(true);
    setErr(null);
    try {
      setData(await fn());
      if (clear) setText('');
      onChanged();
    } catch (e) {
      setErr(errorText(e, onError));
    } finally {
      setBusy(false);
    }
  };
  if (failed) return <ErrorState tone={tone} onRetry={() => void reload()} testId="conversation-error" />;
  if (!data) return <div className="p-5"><SkeletonRows rows={4} testId="conversation-loading" /></div>;
  const fam = tone === 'family';
  return (
    <div className="flex h-full min-h-[420px] flex-col" data-testid="conversation">
      <div className="flex items-start gap-2 border-b border-border-light px-4 py-3">
        <button type="button" onClick={onBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-control hover:bg-black/5 md:hidden" aria-label="Back to conversations" data-testid="conversation-back"><ArrowLeft size={18} aria-hidden="true" /></button>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-[16px] font-semibold" data-testid="conversation-subject">{data.subject}</h2>
          <p className="text-[13px] text-brand-inkMuted">{data.child} · {categoryLabel(data.category)}{!fam ? ` · ${audienceLabel(data.audience)}${data.service ? ` (${data.service})` : ''}` : ''}</p>
        </div>
        {data.status === 'CLOSED' && <Pill tone="neutral" icon={Lock} testId="conversation-closed">Closed</Pill>}
        {data.canManage && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void act(() => messagesApi.setStatus(centerId, id, data.status === 'OPEN'))} data-testid="conversation-toggle">{data.status === 'OPEN' ? 'Close' : 'Reopen'}</Button>}
      </div>
      <ol className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-label="Messages" data-testid="conversation-messages">
        {data.messages.map((m) => (
          <li key={m.id} className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`} data-testid={`message-${m.id}`}>
            <span className="mb-0.5 text-[12px] text-brand-inkMuted">{m.mine ? 'You' : m.author}{m.authorKind === 'STAFF' && !m.mine ? ' · care team' : ''} · {when(m.createdAt)}</span>
            <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-[14px] px-3.5 py-2.5 text-[14px] ${m.mine ? (fam ? 'bg-fam-accent text-fam-onAccent' : 'bg-brand-action text-white') : 'bg-surface-subtle'}`}>{m.body}</p>
          </li>
        ))}
        <div ref={end} />
      </ol>
      <div className="space-y-2 border-t border-border-light p-3">
        {err && <FormAlert tone="danger" testId="conversation-error-msg">{err}</FormAlert>}
        {data.status === 'OPEN' ? (
          <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void act(() => messagesApi.reply(centerId, id, text.trim()), true); }}>
            <label className="sr-only" htmlFor="reply-box">Write a reply</label>
            <textarea id="reply-box" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={2} placeholder="Write a reply…" data-testid="reply-input"
              className="min-h-[48px] flex-1 resize-y rounded-control border border-border-light bg-transparent px-3 py-2 text-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]" />
            <Button type="submit" tone={tone} disabled={busy || !text.trim()} aria-label="Send" data-testid="reply-send"><Send size={16} aria-hidden="true" /><span className="hidden sm:inline">Send</span></Button>
          </form>
        ) : <p className="text-[13px] text-brand-inkMuted" data-testid="conversation-closed-note">This conversation is closed. Start a new one if you need something else.</p>}
      </div>
    </div>
  );
}

function NewThread({ centerId, open, tone, kids, therapistMembershipId, onClose, onDone, onError }: { centerId: string; open: boolean; tone: Tone; kids: { id: string; name: string }[]; therapistMembershipId?: string; onClose: () => void; onDone: (id: string) => void; onError: (e: unknown) => void }) {
  const [f, setF] = useState({ childId: '', guardianLinkId: '', audience: 'GUARDIAN' as ThreadAudience, service: '', category: 'scheduling', subject: '', body: '' });
  const [guardians, setGuardians] = useState<{ id: string; displayName: string }[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const staff = tone !== 'family';
  useEffect(() => {
    if (!open || !staff || !f.childId) { setGuardians([]); setServices([]); return; }
    let active = true;
    opsApi.child(centerId, f.childId).then((d) => {
      if (!active) return;
      const g = d.guardians.filter((x) => x.portalStatus === 'CONNECTED');
      setGuardians(g);
      const permitted = therapistMembershipId
        ? d.assignments.filter((a) => a.membershipId === therapistMembershipId && a.endedAt === null).map((a) => a.service)
        : d.services;
      const available = d.services.filter((service) => permitted.includes(service));
      setServices(available);
      setF((x) => ({
        ...x,
        guardianLinkId: g.length === 1 ? g[0].id : (g.some((item) => item.id === x.guardianLinkId) ? x.guardianLinkId : ''),
        service: available.includes(x.service) ? x.service : '',
      }));
    }).catch(() => { if (active) { setGuardians([]); setServices([]); } });
    return () => { active = false; };
  }, [open, staff, f.childId, centerId, therapistMembershipId]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setErr(null); setF({ childId: kids.length === 1 ? kids[0].id : '', guardianLinkId: '', audience: 'GUARDIAN', service: '', category: 'scheduling', subject: '', body: '' }); } }, [open, kids]);
  async function send() {
    if (!f.childId) return setErr('Choose which child this is about.');
    if (staff && f.audience === 'GUARDIAN' && !f.guardianLinkId) return setErr('Choose the guardian who should receive this conversation.');
    if (staff && f.audience === 'SPECIALTY' && !f.service) return setErr('Choose the specialty team for this conversation.');
    if (f.subject.trim().length < 3) return setErr('Give the conversation a subject of at least 3 characters.');
    if (!f.body.trim()) return setErr('Write a message.');
    setBusy(true);
    setErr(null);
    try {
      onDone((await messagesApi.open(centerId, { childId: f.childId, category: f.category, subject: f.subject.trim(), body: f.body.trim(), ...(staff ? { audience: f.audience, ...(f.audience === 'GUARDIAN' ? { guardianLinkId: f.guardianLinkId } : {}), ...(f.audience === 'SPECIALTY' ? { service: f.service } : {}) } : {}) })).id);
    } catch (e) {
      setErr(errorText(e, onError));
    } finally {
      setBusy(false);
    }
  }
  const input = 'w-full rounded-control border border-border-light bg-transparent px-3 py-2 text-[14px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]';
  return (
    <Dialog open={open} onClose={onClose} tone={tone} title="New conversation" testId="new-thread-dialog"
      footer={<><Button variant="secondary" tone={tone} onClick={onClose} data-testid="new-thread-cancel">Cancel</Button><Button tone={tone} disabled={busy} onClick={() => void send()} data-testid="new-thread-send">{busy ? 'Sending…' : 'Send'}</Button></>}>
      <div className="space-y-4">
        <NonClinicalNotice tone={tone} />
        {err && <FormAlert tone="danger" testId="new-thread-error">{err}</FormAlert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="About" value={f.childId} onChange={(v) => setF({ ...f, childId: v, guardianLinkId: '', service: '' })} testId="new-thread-child" options={[{ value: '', label: 'Choose a child' }, ...kids.map((k) => ({ value: k.id, label: k.name }))]} />
          <SelectField label="Topic" value={f.category} onChange={(v) => setF({ ...f, category: v })} testId="new-thread-category" options={CATEGORIES} />
          {staff && <SelectField label="Audience" value={f.audience} onChange={(v) => setF({ ...f, audience: v as ThreadAudience, guardianLinkId: v === 'GUARDIAN' ? f.guardianLinkId : '', service: v === 'SPECIALTY' ? f.service : '' })} testId="new-thread-audience" options={AUDIENCES} />}
          {staff && f.audience === 'GUARDIAN' && <SelectField label="Recipient" value={f.guardianLinkId} onChange={(v) => setF({ ...f, guardianLinkId: v })} testId="new-thread-recipient" options={[{ value: '', label: guardians.length ? 'Choose a guardian' : 'No connected guardian' }, ...guardians.map((g) => ({ value: g.id, label: g.displayName }))]} />}
          {staff && f.audience === 'SPECIALTY' && <SelectField label="Specialty" value={f.service} onChange={(v) => setF({ ...f, service: v })} testId="new-thread-service" options={[{ value: '', label: 'Choose a specialty' }, ...services.map((service) => ({ value: service, label: service.charAt(0).toUpperCase() + service.slice(1) }))]} />}
        </div>
        <label className="block text-[14px] font-medium">Subject<input value={f.subject} maxLength={120} onChange={(e) => setF({ ...f, subject: e.target.value })} className={`mt-1 ${input}`} data-testid="new-thread-subject" /></label>
        <label className="block text-[14px] font-medium">Message<textarea value={f.body} maxLength={2000} rows={5} onChange={(e) => setF({ ...f, body: e.target.value })} className={`mt-1 ${input}`} data-testid="new-thread-body" /></label>
      </div>
    </Dialog>
  );
}

// Inbox + conversation. Guardians get the warm family theme; staff get the clinical workspace.
export function Messages({ centerId, family, kids, therapistMembershipId, onError }: { centerId: string; family: boolean; kids: { id: string; name: string }[]; therapistMembershipId?: string; onError: (e: unknown) => void }) {
  const tone: Tone = family ? 'family' : 'clinical';
  const [status, setStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const fetcher = useCallback(() => messagesApi.list(centerId, status), [centerId, status]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const [active, setActive] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') void reload(); }, 30_000);
    return () => clearInterval(t);
  }, [reload]);
  return (
    <div className={`space-y-4 ${family ? 'theme-family-light rounded-card bg-fam-canvas p-4 text-fam-ink md:p-6' : ''}`} data-testid="messages-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={`${family ? 'font-display' : ''} text-[26px] font-bold`} data-testid="messages-title">Messages</h1>
          <p className="text-[14px] text-brand-inkMuted">{family ? 'Talk with your child’s care team about visits and everyday arrangements.' : 'Operational coordination with families and the care team.'}{data?.unread ? ` ${data.unread} unread.` : ''}</p>
        </div>
        <Button tone={tone} onClick={() => setComposing(true)} disabled={!kids.length} data-testid="new-thread-button"><MessageSquarePlus size={17} aria-hidden="true" /> New conversation</Button>
      </div>
      <NonClinicalNotice tone={tone} />
      <Card tone={tone} className="grid min-h-[480px] grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr]" testId="messages-card">
        <div className={`border-border-light md:border-r ${active ? 'hidden md:block' : ''}`}>
          <div role="tablist" aria-label="Conversation status" className="flex gap-1 border-b border-border-light p-2">
            {(['OPEN', 'CLOSED'] as const).map((s) => (
              <button key={s} role="tab" type="button" aria-selected={status === s} onClick={() => { setStatus(s); setActive(null); }} data-testid={`threads-tab-${s.toLowerCase()}`}
                className={`min-h-[38px] flex-1 rounded-[8px] text-[14px] font-semibold transition-colors ${status === s ? 'bg-surface-subtle' : 'text-brand-inkMuted hover:bg-surface-subtle'}`}>{s === 'OPEN' ? 'Open' : 'Closed'}</button>
            ))}
          </div>
          {failed && <div className="p-4"><ErrorState tone={tone} onRetry={() => void reload()} testId="threads-error" /></div>}
          {!failed && !data && <div className="p-4"><SkeletonRows rows={4} testId="threads-loading" /></div>}
          {data && !data.items.length && <div className="p-4"><EmptyState tone={tone} icon={MessagesSquare} title={status === 'OPEN' ? 'No conversations yet' : 'No closed conversations'} body={family ? 'Start a conversation if you need to change a visit or ask about arrangements.' : 'Staff and family coordination appears here.'} testId="threads-empty" /></div>}
          {data && data.items.length > 0 && <ThreadList items={data.items} active={active} onPick={setActive} family={family} />}
        </div>
        <div className={active ? '' : 'hidden md:block'}>
          {active ? <Conversation key={active} centerId={centerId} id={active} tone={tone} onBack={() => setActive(null)} onChanged={() => void reload()} onError={onError} />
            : <div className="grid h-full place-items-center p-8 text-center text-[14px] text-brand-inkMuted" data-testid="conversation-placeholder">Choose a conversation to read it.</div>}
        </div>
      </Card>
      <NewThread centerId={centerId} open={composing} tone={tone} kids={kids} therapistMembershipId={therapistMembershipId} onClose={() => setComposing(false)} onError={onError} onDone={(id) => { setComposing(false); setStatus('OPEN'); setActive(id); void reload(); }} />
    </div>
  );
}
