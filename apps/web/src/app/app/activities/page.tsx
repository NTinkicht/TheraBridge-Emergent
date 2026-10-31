'use client';

import { useCallback, useState } from 'react';
import { HeartHandshake, Plus, Search, Sparkles } from 'lucide-react';
import { Field, FormAlert } from '@/components/auth/Field';
import { PageTitle, SelectField, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { ActivityCard } from '@/components/clinical/ActivityCard';
import { TemplateActions } from '@/components/clinical/TemplateActions';
import { Button, Card } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { SPECIALTY_OPTIONS, type SessionInfo } from '@/lib/auth';
import { clinicalApi, type Template } from '@/lib/clinical';

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const area = 'mt-1 w-full rounded-control border border-border-light bg-transparent px-3 py-2 text-[14px]';

function NewTemplate({ centerId, onDone, onError }: { centerId: string; onDone: () => void; onError: (e: unknown) => void }) {
  const [f, setF] = useState({ title: '', service: 'speech', ageBand: '3-6 years', minutes: '10', materials: '', steps: '', safety: '' });
  const [err, setErr] = useState<string | null>(null);
  const save = async () => {
    setErr(null);
    try {
      await clinicalApi.createTemplate(centerId, { title: f.title, service: f.service, ageBand: f.ageBand, minutes: Number(f.minutes), materials: lines(f.materials), steps: lines(f.steps), safety: lines(f.safety) });
      setF({ ...f, title: '', materials: '', steps: '', safety: '' });
      onDone();
    } catch (e) { setErr(errorText(e, onError)); }
  };
  return (
    <Card className="space-y-3 p-5" testId="template-form">
      <h2 className="text-[16px] font-semibold">New activity template</h2>
      {err && <FormAlert tone="danger" testId="template-error">{err}</FormAlert>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Field label="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} testId="template-title" />
        <SelectField label="Service" value={f.service} onChange={(service) => setF({ ...f, service })} testId="template-service" options={SPECIALTY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        <Field label="Age band" value={f.ageBand} onChange={(e) => setF({ ...f, ageBand: e.target.value })} testId="template-age" />
        <Field label="Minutes" type="number" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} testId="template-minutes" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {(['materials', 'steps', 'safety'] as const).map((k) => <label key={k} className="block text-[14px] font-medium capitalize">{k === 'safety' ? 'Safety guidance' : k} (one per line)<textarea rows={4} className={area} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} data-testid={`template-${k}`} /></label>)}
      </div>
      <Button onClick={() => void save()} data-testid="template-save"><Plus size={15} aria-hidden="true" />Add to library</Button>
    </Card>
  );
}

function StaffLibrary({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');
  const [ownership, setOwnership] = useState('all');
  const queryKey = JSON.stringify([centerId, search.trim(), specialty, ownership]);
  const fetcher = useCallback(async () => ({ ...await clinicalApi.templates(centerId, {
    search: search.trim(), service: specialty === 'all' ? undefined : specialty,
    ownership, limit: 100,
  }), queryKey }), [centerId, search, specialty, ownership, queryKey]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const first = data?.queryKey === queryKey ? data : null;
  const [additional, setAdditional] = useState<{ key: string; items: Template[]; hasMore: boolean; nextOffset: number | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const validMore = additional?.key === queryKey ? additional : null;
  const templates = [...(first?.items ?? []), ...(validMore?.items ?? []).filter(t => !first?.items.some(x => x.id === t.id))];
  const hasMore = validMore?.hasMore ?? first?.hasMore ?? false;
  const nextOffset = validMore?.nextOffset ?? first?.nextOffset;
  const filtering = !!search.trim() || specialty !== 'all' || ownership !== 'all';
  const loadMore = async () => {
    if (loadingMore || !hasMore || nextOffset === null || nextOffset === undefined) return;
    setLoadingMore(true); setLoadError('');
    try {
      const next = await clinicalApi.templates(centerId, { offset: nextOffset, limit: 100,
        search: search.trim(), service: specialty === 'all' ? undefined : specialty, ownership });
      setAdditional(prev => ({ key: queryKey,
        items: [...(prev?.key === queryKey ? prev.items : []), ...next.items],
        hasMore: next.hasMore, nextOffset: next.nextOffset }));
    } catch { setLoadError('More activities could not be loaded. Please retry.'); }
    finally { setLoadingMore(false); }
  };
  return (
    <div className="space-y-5">
      <PageTitle title="Activity library" body="Step-by-step home activities with safety guidance, ready to add to therapy plan drafts." testId="activities-title" />
      {notice && <FormAlert tone="success" testId="template-saved">{notice}</FormAlert>}
      {session.permissions.includes('center.activities.manage') && (
        <div className="space-y-3">
          <Button variant="secondary" onClick={() => setCreating(value => !value)} data-testid="template-form-toggle" aria-expanded={creating}>
            <Plus size={16} aria-hidden="true" />{creating ? 'Close activity form' : 'Create activity'}
          </Button>
          {creating && <NewTemplate centerId={centerId} onError={onError} onDone={() => { setCreating(false); setNotice('Activity created.'); setAdditional(null); void reload(); }} />}
        </div>
      )}
      {failed && <ErrorState onRetry={() => void reload()} testId="activities-error" />}
      {!failed && !first && <Card className="p-5"><SkeletonRows rows={4} testId="activities-loading" /></Card>}
      {first && <Card className="space-y-3 p-4" testId="activities-discovery">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,180px)_minmax(0,180px)]">
          <label className="block text-[13px] font-medium">Search activities
            <span className="relative mt-1 block">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-inkMuted" />
              <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full rounded-control border border-border-strong bg-surface-white py-2 pl-10 pr-3 text-[14px]"
                placeholder="Title, specialty or age band" data-testid="activities-search" />
            </span>
          </label>
          <label className="block text-[13px] font-medium">Specialty
            <select value={specialty} onChange={e => setSpecialty(e.target.value)}
              className="mt-1 w-full rounded-control border border-border-strong bg-surface-white p-2 text-[14px]"
              data-testid="activities-specialty-filter">
              <option value="all">All specialties</option>
              {SPECIALTY_OPTIONS.map(service => <option key={service.value} value={service.value}>{service.label}</option>)}
            </select>
          </label>
          <label className="block text-[13px] font-medium">Library
            <select value={ownership} onChange={e => setOwnership(e.target.value)}
              className="mt-1 w-full rounded-control border border-border-strong bg-surface-white p-2 text-[14px]"
              data-testid="activities-ownership-filter">
              <option value="all">All activities</option>
              {session.permissions.includes('center.activities.manage') && <option value="mine">Created by me</option>}
              <option value="center">Centre activities</option>
              <option value="samples">Synthetic samples</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-brand-inkMuted" role="status" data-testid="activities-result-count">
            Showing {templates.length}{hasMore ? '+' : ''} matching activities
          </p>
          {filtering && <Button size="sm" variant="ghost"
            onClick={() => { setSearch(''); setSpecialty('all'); setOwnership('all'); }} data-testid="activities-clear-filters">
            Clear filters
          </Button>}
        </div>
      </Card>}
      {first && !templates.length && !filtering && <EmptyState icon={Sparkles} title="No activities yet" body="Add the first template above." testId="activities-empty" />}
      {first && !templates.length && filtering &&
        <div data-testid="activities-no-results"><EmptyState icon={Search} title="No matching activities"
          body="Try another keyword or clear your filters. Your saved activities are unchanged." /></div>}
      {first && templates.length > 0 && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="activities-list">{templates.map(t => (
        <div key={t.id} className="min-w-0 space-y-2">
          <ActivityCard t={t} />
          {session.permissions.includes('center.activities.manage') && (
            <TemplateActions centerId={centerId} template={t} onError={onError}
              onChanged={message => { setNotice(message); setAdditional(null); void reload(); }} />
          )}
        </div>
      ))}</div>}
      {first && hasMore && <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMore()} data-testid="activities-load-more">
        {loadingMore ? 'Loading more activities…' : 'Load more activities'}
      </Button>}
      {loadError && <p role="alert" className="text-[13px] text-status-caution">{loadError}</p>}
    </div>
  );
}

function FamilyActivities({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const fetcher = useCallback(() => clinicalApi.family(centerId), [centerId]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  return (
    <div className="theme-family-light space-y-5 rounded-card bg-fam-canvas p-4 text-fam-ink md:p-6" data-testid="family-activities">
      <div>
        <h1 className="font-display text-[26px] font-bold">Activities at home</h1>
        <p className="mt-1 rounded-control bg-fam-warm p-3 text-[14px]" data-testid="family-activities-sample-note">These are <strong>sample activities</strong> from a synthetic library, chosen for your child’s services. Your therapist hasn’t shared a home plan here yet, because sharing plans is switched off in this version.</p>
      </div>
      {failed && <ErrorState tone="family" onRetry={() => void reload()} testId="family-activities-error" />}
      {!failed && !data && <SkeletonRows rows={3} testId="family-activities-loading" />}
      {data && !data.children.length && <EmptyState tone="family" icon={HeartHandshake} title="No children linked yet" body="Activities appear once the center connects your child." testId="family-activities-empty" />}
      {data?.children.map((c) => (
        <section key={c.id} className="space-y-3" data-testid={`family-activities-child-${c.id}`}>
          <h2 className="text-[18px] font-semibold">For {c.name}</h2>
          {c.activities.length ? <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{c.activities.map((t) => <ActivityCard key={t.id} t={t} tone="family" />)}</div>
            : <p className="text-[14px] text-fam-muted">No sample activities for these services yet.</p>}
        </section>
      ))}
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <Workspace active="activities" permission="center.activities.read|family.activities.read" deniedText="Activities are available to center staff and connected families.">
      {(s, onError) => (s.permissions.includes('family.activities.read') ? <FamilyActivities session={s} onError={onError} /> : <StaffLibrary session={s} onError={onError} />)}
    </Workspace>
  );
}
