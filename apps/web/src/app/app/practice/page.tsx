'use client';

import { useCallback, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, FlaskConical, History, Sun } from 'lucide-react';
import { Workspace, useLoad } from '@/components/centers/kit';
import { ActivityCard } from '@/components/practice/ActivityCard';
import { RecordDialog } from '@/components/practice/RecordDialog';
import { Pill } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import type { SessionInfo } from '@/lib/auth';
import { CHOICE_LABEL, CHOICE_TONE, dayName, practiceApi, type PracticeActivity } from '@/lib/practice';

const shift = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const tab = (on: boolean) => `inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold ${on ? 'bg-fam-accent text-fam-onAccent' : 'bg-fam-surface text-fam-ink border border-fam-border'}`;

function HistoryList({ centerId, childId, onError }: { centerId: string; childId: string; onError: (e: unknown) => void }) {
  const fetcher = useCallback(() => practiceApi.history(centerId, childId), [centerId, childId]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  if (failed) return <ErrorState tone="family" onRetry={() => void reload()} testId="history-error" />;
  if (!data) return <SkeletonRows rows={3} testId="history-loading" />;
  if (!data.items.length) return <EmptyState tone="family" icon={History} title="Nothing recorded yet" body="Answers you save for sample activities will appear here with their dates." testId="history-empty" />;
  return (
    <ol className="space-y-2" data-testid="practice-history">
      {data.items.map((o) => (
        <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-fam-border bg-fam-surface p-3" data-testid={`history-item-${o.id}`}>
          <div><p className="text-[15px] font-semibold">{o.activity}</p><p className="text-[13px] text-fam-muted">{dayName(o.practiceDate, 'long')} · saved {new Date(o.recordedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
          <div className="flex items-center gap-2"><Pill tone={CHOICE_TONE[o.choice]}>{CHOICE_LABEL[o.choice]}</Pill>{o.seenByCareTeam && <span className="text-[12px] text-fam-muted" data-testid={`history-seen-${o.id}`}>Seen by care team</span>}</div>
        </li>
      ))}
    </ol>
  );
}

function Practice({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const [week, setWeek] = useState<string | undefined>();
  const [view, setView] = useState<'today' | 'week' | 'history'>('today');
  const [childIdx, setChildIdx] = useState(0);
  const [rec, setRec] = useState<{ a: PracticeActivity; date: string } | null>(null);
  const fetcher = useCallback(() => practiceApi.week(centerId, week), [centerId, week]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  if (failed) return <ErrorState tone="family" onRetry={() => void reload()} testId="practice-error" />;
  if (!data) return <SkeletonRows rows={4} testId="practice-loading" />;
  const child = data.children[Math.min(childIdx, data.children.length - 1)];
  const canRecord = data.gates.practiceDemo;
  const day = data.week.days.includes(data.today) ? data.today : data.week.days[0];
  return (
    <div className="theme-family-light space-y-4 rounded-card bg-fam-canvas p-4 text-fam-ink md:p-6" data-testid="practice-page">
      <div>
        <h1 className="flex items-center gap-2 font-display text-[26px] font-bold">Home practice</h1>
        {child && <p className="text-[15px] text-fam-muted" data-testid="practice-child-name">For {child.name}</p>}
      </div>
      <p className="flex items-start gap-2 rounded-control border-2 border-dashed border-fam-caution bg-fam-surface p-3 text-[14px]" data-testid="practice-sample-banner">
        <FlaskConical size={18} className="mt-0.5 shrink-0 text-fam-caution" aria-hidden="true" />
        <span><strong>Sample activities only.</strong> These are synthetic examples, not your child’s released therapy plan. Plans are not shared with families in this version. Your answers are stored as synthetic practice feedback and are never counted as therapy progress.{!canRecord && ' Recording answers is switched off right now.'}</span>
      </p>
      {!data.children.length ? <EmptyState tone="family" icon={Sun} title="No children linked" body="When a center connects you to your child, sample activities appear here." testId="practice-empty" /> : (
        <>
          {data.children.length > 1 && (
            <div role="tablist" aria-label="Choose a child" className="flex flex-wrap gap-2" data-testid="practice-children">
              {data.children.map((k, i) => <button key={k.id} role="tab" aria-selected={k.id === child.id} className={tab(k.id === child.id)} onClick={() => setChildIdx(i)} data-testid={`practice-child-${k.id}`}>{k.name}</button>)}
            </div>
          )}
          <div role="tablist" aria-label="View" className="flex flex-wrap gap-2">
            <button role="tab" aria-selected={view === 'today'} className={tab(view === 'today')} onClick={() => { setView('today'); setWeek(undefined); }} data-testid="practice-view-today"><Sun size={15} aria-hidden="true" />Today</button>
            <button role="tab" aria-selected={view === 'week'} className={tab(view === 'week')} onClick={() => { setView('week'); setWeek(undefined); }} data-testid="practice-view-week"><CalendarDays size={15} aria-hidden="true" />This week</button>
            <button role="tab" aria-selected={view === 'history'} className={tab(view === 'history')} onClick={() => setView('history')} data-testid="practice-view-history"><History size={15} aria-hidden="true" />History</button>
          </div>
          {view === 'week' && (
            <div className="flex items-center justify-between gap-2 rounded-control bg-fam-surface p-2" data-testid="practice-week-nav">
              <button type="button" className="rounded-full p-2 hover:bg-fam-tile" aria-label="Previous week" onClick={() => setWeek(shift(data.week.start, -7))} data-testid="practice-week-prev"><ChevronLeft size={18} aria-hidden="true" /></button>
              <p className="text-[14px] font-semibold" data-testid="practice-week-label">{dayName(data.week.days[0])} – {dayName(data.week.days[6])}</p>
              <button type="button" className="rounded-full p-2 hover:bg-fam-tile disabled:opacity-40" aria-label="Next week" disabled={data.week.days.includes(data.today)} onClick={() => setWeek(shift(data.week.start, 7))} data-testid="practice-week-next"><ChevronRight size={18} aria-hidden="true" /></button>
            </div>
          )}
          {view === 'history' ? <HistoryList centerId={centerId} childId={child.id} onError={onError} /> : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" data-testid={`practice-${view}`}>
              {view === 'today' && <p className="text-[15px] font-semibold lg:col-span-2">{dayName(day, 'long')}</p>}
              {child.activities.map((a) => <ActivityCard key={a.id} a={a} testId={`practice-activity-${a.id}`} slots={view === 'today' ? a.slots.filter((s) => s.date === day) : a.slots} onRecord={canRecord ? (s) => setRec({ a, date: s.date }) : undefined} />)}
              {!child.activities.length && <EmptyState tone="family" icon={Sun} title="No sample activities" body="There are no sample activities for this child’s services yet." testId="practice-no-activities" />}
            </div>
          )}
        </>
      )}
      {rec && child && <RecordDialog centerId={centerId} childId={child.id} childName={child.name} activity={rec.a} date={rec.date} onClose={() => setRec(null)} onRecorded={() => void reload()} />}
    </div>
  );
}

export default function PracticePage() {
  return <Workspace active="practice" permission="family.practice.read" deniedText="Home practice is for connected families.">{(s, onError) => <Practice session={s} onError={onError} />}</Workspace>;
}
