'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { FlaskConical, LineChart } from 'lucide-react';
import { Field } from '@/components/auth/Field';
import { PageTitle, SelectField, Workspace, useLoad } from '@/components/centers/kit';
import { GoalChart, STATUS_TEXT } from '@/components/clinical/GoalChart';
import { SupervisorReviewQueue } from '@/components/clinical/SupervisorReviewQueue';
import { Card, Metric, Pill } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { serviceLabel } from '@/components/operations/BookDialog';
import type { SessionInfo } from '@/lib/auth';
import { daysAgo, isoDay, reportsApi, type Dashboard } from '@/lib/reports';

const PERIODS = [['30', 'Last 30 days'], ['90', 'Last 90 days'], ['180', 'Last 6 months'], ['365', 'Last 12 months'], ['custom', 'Custom dates']] as const;

function GoalCard({ g, period }: { g: Dashboard['goals'][number]; period: Dashboard['period'] }) {
  const last = g.points[g.points.length - 1];
  return (
    <Card className="space-y-3 p-5" testId={`dash-goal-${g.childId}-${g.key}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[16px] font-semibold">{g.title}</h3>
          <p className="text-[13px] text-brand-inkMuted"><Link href={`/app/clinical/${g.childId}`} className="font-medium text-brand-action hover:underline">{g.childName}</Link> · {serviceLabel(g.service)} · {g.planTitle}</p>
        </div>
        <Pill tone={g.status === 'recorded' ? 'info' : g.status === 'insufficient' ? 'caution' : 'neutral'} testId={`dash-status-${g.childId}-${g.key}`}>{g.status === 'recorded' ? `${g.points.length} ${STATUS_TEXT.recorded}` : g.status === 'insufficient' ? 'Not enough data' : 'No data in period'}</Pill>
      </div>
      <GoalChart points={g.points} baseline={g.baseline} target={g.target} measure={g.measure} from={period.from} to={period.to} testId={`dash-chart-${g.childId}-${g.key}`} />
      {g.status !== 'recorded' && <p className="text-[13px] text-brand-inkMuted">{STATUS_TEXT[g.status]}.</p>}
      <dl className="grid grid-cols-1 gap-2 rounded-control bg-surface-subtle p-3 text-[13px] sm:grid-cols-3" data-testid={`dash-compare-${g.childId}-${g.key}`}>
        <div><dt className="text-brand-inkMuted">Baseline → target</dt><dd className="tnum font-semibold">{g.baseline} → {g.target} <span className="font-normal text-brand-inkMuted">({g.measure})</span></dd></div>
        <div><dt className="text-brand-inkMuted">Last value before this period</dt><dd className="tnum font-semibold">{g.prior ? `${g.prior.value} (${g.prior.date})` : 'None recorded'}</dd></div>
        <div><dt className="text-brand-inkMuted">Latest value in this period</dt><dd className="tnum font-semibold">{last ? `${last.value} (${last.date})` : 'None recorded'}</dd></div>
      </dl>
    </Card>
  );
}

function Board({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const [f, setF] = useState({ childId: '', service: '', goal: '', period: '90', from: daysAgo(89), to: isoDay(new Date()) });
  const range = f.period === 'custom' ? { from: f.from, to: f.to } : { from: daysAgo(Number(f.period) - 1), to: isoDay(new Date()) };
  const invalid = !range.from || !range.to || range.from > range.to;
  const fetcher = useCallback(() => reportsApi.dashboard(centerId, { childId: f.childId || undefined, service: f.service || undefined, ...range }), [centerId, f.childId, f.service, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data, failed, reload } = useLoad(invalid ? null : fetcher, onError);
  const goals = useMemo(() => (data?.goals ?? []).filter((g) => !f.goal || g.key === f.goal), [data, f.goal]);
  const services = [...new Set((data?.children ?? []).filter((k) => !f.childId || k.id === f.childId).flatMap((k) => k.services))];
  const goalOptions = [...new Map((data?.goals ?? []).map((g) => [g.key, g.title])).entries()];
  return (
    <div className="space-y-5" data-testid="progress-dashboard">
      <PageTitle eyebrow="Clinical" title="Progress" body="Recorded observations for each goal, shown against the plan's baseline and target. Nothing here is estimated or projected." testId="progress-title" />
      <p className="flex items-start gap-2 rounded-control bg-status-cautionSurface p-3 text-[13px]" data-testid="progress-synthetic-banner"><FlaskConical size={16} className="mt-0.5 shrink-0" aria-hidden="true" />Synthetic data only, not for clinical use. Home activity completion is never counted as progress.</p>
      <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4" testId="progress-filters">
        <SelectField label="Child" value={f.childId} onChange={(childId) => setF({ ...f, childId, service: '', goal: '' })} testId="filter-child" options={[{ value: '', label: 'All my children' }, ...(data?.children ?? []).map((k) => ({ value: k.id, label: k.name }))]} />
        <SelectField label="Service" value={f.service} onChange={(service) => setF({ ...f, service, goal: '' })} testId="filter-service" options={[{ value: '', label: 'All services' }, ...services.map((s) => ({ value: s, label: serviceLabel(s) }))]} />
        <SelectField label="Goal" value={f.goal} onChange={(goal) => setF({ ...f, goal })} testId="filter-goal" options={[{ value: '', label: 'All goals' }, ...goalOptions.map(([value, label]) => ({ value, label }))]} />
        <SelectField label="Period" value={f.period} onChange={(period) => setF({ ...f, period })} testId="filter-period" options={PERIODS.map(([value, label]) => ({ value, label }))} />
        {f.period === 'custom' && <>
          <Field label="From" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} testId="filter-from" error={invalid ? 'Start date must not follow end date.' : undefined} />
          <Field label="To" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} testId="filter-to" error={invalid ? 'End date must not precede start date.' : undefined} />
        </>}
      </Card>
      {invalid && <p className="rounded-control bg-status-dangerSurface p-3 text-[14px] text-status-danger" role="alert" data-testid="progress-period-error">Choose a start date on or before the end date.</p>}
      {session.activeContext?.role === 'CLINICAL_SUPERVISOR' && (
        <SupervisorReviewQueue centerId={centerId} childId={f.childId} service={f.service} onError={onError} />
      )}
      {!invalid && failed && <ErrorState onRetry={() => void reload()} testId="progress-error" />}
      {!invalid && !failed && !data && <Card className="p-5"><SkeletonRows rows={4} testId="progress-loading" /></Card>}
      {data && !invalid && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="progress-summary">
            <Metric label="Goals shown" value={goals.length} sub={`${data.period.from} to ${data.period.to}`} icon={LineChart} testId="metric-goals" />
            <Metric label="With recorded data" value={goals.filter((g) => g.status === 'recorded').length} sub="two or more observations" icon={LineChart} accent="success" testId="metric-recorded" />
            <Metric label="Not enough data" value={goals.filter((g) => g.status === 'insufficient').length} sub="one observation" icon={LineChart} accent="caution" testId="metric-insufficient" />
            <Metric label="No data" value={goals.filter((g) => g.status === 'none').length} sub="nothing recorded" icon={LineChart} testId="metric-none" />
          </div>
          {!goals.length && <EmptyState icon={LineChart} title={data.children.length ? 'No goals match these filters' : 'No children assigned to you'} body={data.children.length ? 'Goals appear here once a therapy plan has goals. Try another child, service or goal.' : 'Progress appears for children you are assigned to.'} testId="progress-empty" />}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" data-testid="progress-goals">{goals.map((g) => <GoalCard key={`${g.childId}-${g.service}-${g.key}`} g={g} period={data.period} />)}</div>
        </>
      )}
    </div>
  );
}

export default function ProgressPage() {
  return <Workspace active="progress" permission="center.clinical.read" deniedText="Progress tracking is available to therapists and clinical supervisors.">{(s, onError) => <Board session={s} onError={onError} />}</Workspace>;
}
