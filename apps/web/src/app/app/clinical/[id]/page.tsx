'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { FormAlert } from '@/components/auth/Field';
import { Workspace, errorText, useLoad } from '@/components/centers/kit';
import { AssessmentsPanel, ProgressPanel, SessionsPanel } from '@/components/clinical/Panels';
import { Child360 } from '@/components/clinical/Child360';
import { PlansPanel } from '@/components/clinical/PlanEditor';
import { ReportsPanel } from '@/components/clinical/ReportsPanel';
import { Card } from '@/components/design/ui';
import { ErrorState, SkeletonRows } from '@/components/design/states';
import type { SessionInfo } from '@/lib/auth';
import { clinicalApi } from '@/lib/clinical';
import type { Workspace as ClinicalWorkspace } from '@/lib/clinical';

const TABS = [['overview', 'Child 360°'], ['plan', 'Therapy plan'], ['assessments', 'Assessments'], ['sessions', 'Sessions'], ['progress', 'Progress'], ['reports', 'Reports']] as const;
type OlderPages = { key: string; plans: ClinicalWorkspace['plans']; observations: ClinicalWorkspace['observations']; offset: number; hasMore: boolean };
type AssessmentPages = { key: string; items: ClinicalWorkspace['assessments']; offset: number; hasMore: boolean };

function ClinicalChild({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const { id } = useParams<{ id: string }>();
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const fetcher = useCallback(() => clinicalApi.workspace(centerId, id), [centerId, id]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  // Older plan versions and their evidence belong to the child workspace,
  // not to the Plan tab. Keep them available to Progress and Sessions after
  // the Plan tab unmounts, and never reuse pages for another child/centre.
  const pageKey = `${centerId}:${id}`;
  const [olderPages, setOlderPages] = useState<OlderPages | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const currentPages = olderPages?.key === pageKey ? olderPages : null;
  const [assessmentPages, setAssessmentPages] = useState<AssessmentPages | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentError, setAssessmentError] = useState('');
  const currentAssessments = assessmentPages?.key === pageKey ? assessmentPages : null;
  const sharedData = useMemo(() => data ? { ...data,
    assessments: [...data.assessments, ...(currentAssessments?.items ?? []).filter(a => !data.assessments.some(x => x.id === a.id))],
    plans: [...data.plans, ...(currentPages?.plans ?? []).filter(p => !data.plans.some(x => x.id === p.id))],
    observations: [...data.observations, ...(currentPages?.observations ?? []).filter(o => !data.observations.some(x => x.id === o.id))],
  } : null, [data, currentPages, currentAssessments]);
  const loadOlderAssessments = async () => {
    if (!data || assessmentLoading || !(currentAssessments?.hasMore ?? data.hasMoreAssessments)) return;
    const offset = currentAssessments?.offset ?? data.assessments.length;
    setAssessmentLoading(true); setAssessmentError('');
    try {
      const page = await clinicalApi.workspace(centerId, id, 0, offset);
      setAssessmentPages(prev => {
        const old = prev?.key === pageKey ? prev : null;
        return { key: pageKey, items: [...(old?.items ?? []), ...page.assessments.filter(a => !old?.items.some(x => x.id === a.id))],
          offset: offset + page.assessments.length, hasMore: page.hasMoreAssessments };
      });
    } catch { setAssessmentError('Earlier assessments could not be loaded. Please retry.'); }
    finally { setAssessmentLoading(false); }
  };
  const loadOlderPlans = async () => {
    if (!data || pageLoading || !(currentPages?.hasMore ?? data.hasMorePlans)) return;
    const offset = currentPages?.offset ?? data.plans.length;
    setPageLoading(true); setPageError('');
    try {
      const page = await clinicalApi.workspace(centerId, id, offset);
      setOlderPages(prev => {
        const old = prev?.key === pageKey ? prev : null;
        return { key: pageKey,
          plans: [...(old?.plans ?? []), ...page.plans.filter(x => !old?.plans.some(y => y.id === x.id))],
          observations: [...(old?.observations ?? []), ...page.observations.filter(x => !old?.observations.some(y => y.id === x.id))],
          offset: offset + page.plans.length, hasMore: page.hasMorePlans };
      });
    } catch { setPageError('Older plans could not be loaded. Retry to view the full history.'); }
    finally { setPageLoading(false); }
  };
  const pending = useRef(new Set<string>());
  const onPending = useCallback((id: string, value: boolean) => { if (value) pending.current.add(id); else pending.current.delete(id); }, []);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => { if (pending.current.size) { e.preventDefault(); e.returnValue = ''; } };
    const click = (e: MouseEvent) => { if ((e.target as Element).closest('a[href]') && pending.current.size && !window.confirm('Unsaved session or transcript text remains. Leave and discard it?')) { e.preventDefault(); e.stopPropagation(); } };
    const pop = () => { if (pending.current.size && !window.confirm('Unsaved session or transcript remains. Leave and discard it?')) history.go(1); };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', click, true); window.addEventListener('popstate', pop);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', click, true); window.removeEventListener('popstate', pop); };
  }, []);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('overview');
  // Returning from an internal report-to-plan handoff should open the new
  // plan editor. The hash carries NO clinical data or permissions.
  useEffect(() => {
    if (window.location.hash === '#plan' || window.location.hash.startsWith('#plan?')) setTab('plan');
  }, []);

  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn(); setNotice({ tone: 'success', text: ok }); await reload();
      if (currentPages && data) {
        try {
          let offset = data.plans.length;
          const plans: ClinicalWorkspace['plans'] = [], observations: ClinicalWorkspace['observations'] = [];
          let more = true;
          while (offset < currentPages.offset && more) {
            const page = await clinicalApi.workspace(centerId, id, offset);
            plans.push(...page.plans); observations.push(...page.observations);
            offset += page.plans.length; more = page.hasMorePlans;
            if (!page.plans.length) break;
          }
          setOlderPages({ key: pageKey, plans, observations, offset, hasMore: more });
          setPageError('');
        } catch { setPageError('Older plans could not be refreshed. Reload this child to retry.'); }
      }
      if (currentAssessments && data) {
        try {
          let offset = data.assessments.length;
          const items: ClinicalWorkspace['assessments'] = [];
          let more = true;
          while (offset < currentAssessments.offset && more) {
            const page = await clinicalApi.workspace(centerId, id, 0, offset);
            items.push(...page.assessments); offset += page.assessments.length;
            more = page.hasMoreAssessments;
            if (!page.assessments.length) break;
          }
          setAssessmentPages({ key: pageKey, items, offset, hasMore: more });
          setAssessmentError('');
        } catch { setAssessmentError('Earlier assessments could not be refreshed. Please reload.'); }
      }
      return true;
    } catch (e) { const t = errorText(e, onError); if (t) setNotice({ tone: 'danger', text: t }); return false; }
  };
  if (failed) return <ErrorState onRetry={() => void reload()} testId="clinical-error" />;
  if (!data) return <Card className="p-5"><SkeletonRows rows={5} testId="clinical-loading" /></Card>;
  return (
    <div className="space-y-5" data-testid="clinical-workspace">
      <Link href="/app/clinical" className="inline-flex items-center gap-1 text-[14px] font-medium text-brand-action hover:underline" data-testid="clinical-back"><ArrowLeft size={15} aria-hidden="true" />All children</Link>
      <div>
        <h1 className="text-[28px] font-bold" data-testid="clinical-child-name">{data.child.name}</h1>
        <p className="text-[14px] text-brand-inkMuted">{data.canReview ? 'Clinical supervisor review' : 'Therapist workspace'} · everything here is a draft</p>
      </div>
      <p className="flex items-start gap-2 rounded-control bg-status-cautionSurface p-3 text-[13px]" data-testid="clinical-synthetic-banner"><FlaskConical size={16} className="mt-0.5 shrink-0" aria-hidden="true" />Synthetic data only, not for clinical use. {data.locked} Media capture and AI processing are not available.</p>
      <div role="tablist" aria-label="Clinical sections" className="flex gap-1 overflow-x-auto border-b border-border-light">
        {TABS.map(([k, l]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => { if (pending.current.size && !window.confirm('Unsaved session or transcript remains. Switch sections and discard it?')) return; setTab(k); setNotice(null); }} data-testid={`clinical-tab-${k}`}
            className={`min-h-[44px] shrink-0 border-b-2 px-4 text-[14px] font-semibold transition-colors ${tab === k ? 'border-brand-action text-brand-action' : 'border-transparent text-brand-inkMuted hover:text-brand-ink'}`}>{l}</button>
        ))}
      </div>
      {notice && <FormAlert tone={notice.tone} testId={`clinical-notice-${notice.tone}`}>{notice.text}</FormAlert>}
      <div role="tabpanel">
        {tab === 'overview' && <Child360 ws={sharedData!} centerId={centerId} onNavigate={setTab} />}
        {tab === 'plan' && <PlansPanel centerId={centerId} ws={sharedData!} run={run}
          pagination={{ hasMore: currentPages?.hasMore ?? data.hasMorePlans, loading: pageLoading, error: pageError, load: loadOlderPlans }} />}
        {tab === 'assessments' && <AssessmentsPanel centerId={centerId} ws={sharedData!} run={run}
          pagination={{ hasMore: currentAssessments?.hasMore ?? data.hasMoreAssessments,
            loading: assessmentLoading, error: assessmentError, load: loadOlderAssessments }} />}
        {tab === 'sessions' && <SessionsPanel centerId={centerId} ws={sharedData!} run={run} onPending={onPending} />}
        {tab === 'progress' && <ProgressPanel centerId={centerId} ws={sharedData!} run={run} onNavigate={() => setTab('plan')} />}
        {tab === 'reports' && <ReportsPanel centerId={centerId} ws={sharedData!} run={run} onError={onError} />}
      </div>
    </div>
  );
}

export default function ClinicalChildPage() {
  return <Workspace active="clinical" permission="center.clinical.read" deniedText="The clinical workspace is available to therapists and clinical supervisors.">{(s, onError) => <ClinicalChild session={s} onError={onError} />}</Workspace>;
}
