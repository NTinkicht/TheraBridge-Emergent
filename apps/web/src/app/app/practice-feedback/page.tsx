'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { CheckCheck, FlaskConical, Inbox } from 'lucide-react';
import { Field } from '@/components/auth/Field';
import { PageTitle, SelectField, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { Button, Card, Pill } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { serviceLabel } from '@/components/operations/BookDialog';
import { ClinicianPlanRequestsPanel } from '@/components/practice/ClinicianPlanRequestsPanel';
import type { SessionInfo } from '@/lib/auth';
import { CHOICE_LABEL, CHOICE_TONE, dayName, practiceApi, type FeedbackItem } from '@/lib/practice';

function Row({ o, canAck, onAck }: { o: FeedbackItem; canAck: boolean; onAck: (id: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Card className={`flex flex-wrap items-center justify-between gap-3 p-4 ${o.acknowledgedAt ? '' : 'border-l-4 border-l-brand-action'}`} testId={`feedback-${o.id}`}>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{o.activity} <span className="text-[12px] font-normal text-brand-inkMuted">(sample)</span></p>
        <p className="text-[13px] text-brand-inkMuted"><Link href={`/app/clinical/${o.childId}`} className="font-medium text-brand-action hover:underline">{o.childName}</Link> · {serviceLabel(o.service)} · practised {dayName(o.practiceDate, 'long')} · recorded by {o.guardian} ({o.relationship}){o.guardianAccessRemoved ? ' · guardian access since removed' : ''}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span data-testid={`feedback-choice-${o.id}`}><Pill tone={CHOICE_TONE[o.choice]}>Family chose: {CHOICE_LABEL[o.choice]}</Pill></span>
        {o.acknowledgedAt ? <span className="inline-flex items-center gap-1 text-[12px] text-brand-inkMuted" data-testid={`feedback-acked-${o.id}`}><CheckCheck size={14} aria-hidden="true" />Acknowledged{o.acknowledgedBy ? ` by ${o.acknowledgedBy}` : ''}</span>
          : canAck ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setBusy(true); void onAck(o.id).finally(() => setBusy(false)); }} data-testid={`feedback-ack-${o.id}`}>Acknowledge</Button>
            : <Pill tone="caution" testId={`feedback-new-${o.id}`}>New</Pill>}
      </div>
    </Card>
  );
}

function InboxView({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const [f, setF] = useState({ childId: '', templateId: '', choice: '', status: '', from: '', to: '' });
  const invalid = !!f.from && !!f.to && f.from > f.to;
  const fetcher = useCallback(() => practiceApi.inbox(centerId, f), [centerId, f]);
  const { data, failed, reload } = useLoad(invalid ? null : fetcher, onError);
  const [ackErr, setAckErr] = useState<string | null>(null);
  const ack = async (id: string) => { setAckErr(null); try { await practiceApi.acknowledge(centerId, id); await reload(); } catch (e) { setAckErr(errorText(e, onError) || 'This couldn’t be acknowledged. Nothing was changed.'); } };
  return (
    <div className="space-y-5" data-testid="feedback-page">
      <PageTitle eyebrow="Clinical" title="Practice feedback" body="Fixed-choice answers families recorded for sample home activities. They are not clinical observations and never count towards goals or progress." testId="feedback-title" />
      <p className="flex items-start gap-2 rounded-control bg-status-cautionSurface p-3 text-[13px]" data-testid="feedback-synthetic-banner"><FlaskConical size={16} className="mt-0.5 shrink-0" aria-hidden="true" />Synthetic demonstration only. Families see sample activities, not your draft home plans, which stay unreleased. Answers are shown exactly as recorded, with no interpretation.</p>
      <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6" testId="feedback-filters">
        <SelectField label="Child" value={f.childId} onChange={(childId) => setF({ ...f, childId })} testId="feedback-filter-child" options={[{ value: '', label: 'All children' }, ...(data?.children ?? []).map((k) => ({ value: k.id, label: k.name }))]} />
        <SelectField label="Activity" value={f.templateId} onChange={(templateId) => setF({ ...f, templateId })} testId="feedback-filter-activity" options={[{ value: '', label: 'All activities' }, ...(data?.activities ?? []).map((a) => ({ value: a.id, label: a.title }))]} />
        <SelectField label="Answer" value={f.choice} onChange={(choice) => setF({ ...f, choice })} testId="feedback-filter-choice" options={[{ value: '', label: 'Any answer' }, ...(['COMPLETED', 'NEEDED_HELP', 'NOT_COMPLETED', 'SKIPPED'] as const).map((c) => ({ value: c, label: CHOICE_LABEL[c] }))]} />
        <SelectField label="Status" value={f.status} onChange={(status) => setF({ ...f, status })} testId="feedback-filter-status" options={[{ value: '', label: 'All' }, { value: 'new', label: 'New' }, { value: 'acknowledged', label: 'Acknowledged' }]} />
        <Field label="From" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} testId="feedback-filter-from" />
        <Field label="To" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} testId="feedback-filter-to" />
      </Card>
      {ackErr && <p className="rounded-control bg-status-dangerSurface p-3 text-[14px] text-status-danger" role="alert" data-testid="feedback-ack-error">{ackErr}</p>}
      {invalid && <p className="rounded-control bg-status-dangerSurface p-3 text-[14px] text-status-danger" role="alert" data-testid="feedback-period-error">Choose a start date on or before the end date.</p>}
      {!invalid && failed && <ErrorState onRetry={() => void reload()} testId="feedback-error" />}
      {!invalid && !failed && !data && <Card className="p-5"><SkeletonRows rows={3} testId="feedback-loading" /></Card>}
      {session.activeContext?.type === 'center' && session.activeContext.role === 'THERAPIST' &&
        <ClinicianPlanRequestsPanel centerId={centerId} />}
      {!invalid && data && (
        <>
          <p className="text-[14px] text-brand-inkMuted" data-testid="feedback-counts">{data.counts.new} new of {data.counts.total} answers{data.canAcknowledge ? '' : ' · supervisors can read but not acknowledge'}</p>
          {!data.items.length && <EmptyState icon={Inbox} title={data.counts.total ? 'No answers match these filters' : 'No practice feedback yet'} body={data.counts.total ? 'Try changing the filters.' : 'Answers families record for sample activities appear here for children you are assigned to.'} testId="feedback-empty" />}
          <div className="space-y-2" data-testid="feedback-list">{data.items.map((o) => <Row key={o.id} o={o} canAck={data.canAcknowledge} onAck={ack} />)}</div>
        </>
      )}
    </div>
  );
}

export default function PracticeFeedbackPage() {
  return <Workspace active="practice-feedback" permission="center.practice.read" deniedText="Practice feedback is available to therapists and clinical supervisors.">{(s, onError) => <InboxView session={s} onError={onError} />}</Workspace>;
}
