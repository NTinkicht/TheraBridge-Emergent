'use client';

import { useCallback, useState } from 'react';
import { HeartHandshake, Plus, Sparkles } from 'lucide-react';
import { Field, FormAlert } from '@/components/auth/Field';
import { PageTitle, SelectField, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { ActivityCard } from '@/components/clinical/ActivityCard';
import { Button, Card } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { SPECIALTY_OPTIONS, type SessionInfo } from '@/lib/auth';
import { clinicalApi } from '@/lib/clinical';

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
  const fetcher = useCallback(() => clinicalApi.templates(centerId), [centerId]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const [notice, setNotice] = useState(false);
  return (
    <div className="space-y-5">
      <PageTitle title="Activity library" body="Step-by-step home activities with safety guidance, ready to add to therapy plan drafts." testId="activities-title" />
      {notice && <FormAlert tone="success" testId="template-saved">Template added.</FormAlert>}
      {session.permissions.includes('center.activities.manage') && <NewTemplate centerId={centerId} onError={onError} onDone={() => { setNotice(true); void reload(); }} />}
      {failed && <ErrorState onRetry={() => void reload()} testId="activities-error" />}
      {!failed && !data && <Card className="p-5"><SkeletonRows rows={4} testId="activities-loading" /></Card>}
      {data && !data.items.length && <EmptyState icon={Sparkles} title="No activities yet" body="Add the first template above." testId="activities-empty" />}
      {data && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="activities-list">{data.items.map((t) => <ActivityCard key={t.id} t={t} />)}</div>}
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
