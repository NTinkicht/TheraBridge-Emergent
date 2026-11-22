'use client';

import { useCallback, useState } from 'react';
import { FlaskConical, HeartHandshake } from 'lucide-react';
import { Workspace, useLoad } from '@/components/centers/kit';
import { FamilyProgress } from '@/components/clinical/FamilyProgress';
import { ErrorState, SkeletonRows } from '@/components/design/states';
import type { SessionInfo } from '@/lib/auth';
import { reportsApi } from '@/lib/reports';
import { opsApi } from '@/lib/operations';
import Link from 'next/link';

function Demo({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const fetcher = useCallback(() => reportsApi.familyDemo(centerId), [centerId]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  const familyFetcher = useCallback(() => opsApi.family(centerId), [centerId]);
  const { data: family, failed: familyFailed } = useLoad(familyFetcher, onError);
  const [selectedChildId, setSelectedChildId] = useState('');
  const chosen = family?.children.find(c => c.id === selectedChildId) ?? family?.children[0];
  if (failed) return <ErrorState tone="family" onRetry={() => void reload()} testId="family-progress-error" />;
  if (!data) return <SkeletonRows rows={4} testId="family-progress-loading" />;
  return (
    <div className="theme-family-auto space-y-4 rounded-card bg-fam-canvas p-3 text-fam-ink sm:p-5">
      <h1 className="flex items-center gap-2 font-display text-[26px] font-bold"><HeartHandshake size={24} className="text-fam-accent" aria-hidden="true" />Progress updates</h1>
      {family && family.children.length > 1 && <div role="group" aria-label="Choose a linked child" className="flex flex-wrap gap-2"
        data-testid="family-progress-child-tabs">
        {family.children.map(c => <button key={c.id} type="button"
          aria-pressed={chosen?.id === c.id} onClick={() => setSelectedChildId(c.id)}
          data-testid={`family-progress-child-${c.id}`}
          className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-semibold ${chosen?.id===c.id?'bg-fam-accent text-fam-onAccent':'border-fam-border bg-fam-surface text-fam-ink'}`}>
          {c.name}
        </button>)}
      </div>}
      {chosen && <p data-testid="family-progress-selected-child" className="text-[13px] text-fam-muted">
        Selected linked child: {chosen.name}. The sample below is fictional and is not this child's clinical progress.
      </p>}
      {familyFailed && <p role="status" className="text-[13px] text-fam-muted">Linked-child selection is unavailable. No real child progress is shown.</p>}
      <FamilyProgress theme="auto" data={data} testId="family-progress-demo" banner={
        <p className="flex items-start gap-2 rounded-control border-2 border-dashed border-fam-caution bg-fam-surface p-3 text-[14px]" data-testid="family-progress-sample-banner">
          <FlaskConical size={18} className="mt-0.5 shrink-0 text-fam-caution" aria-hidden="true" />
          <span><strong>Sample only.</strong> This shows how a progress update could look one day. It uses a made-up child and made-up numbers. Your child’s therapy records are not shared here, because sharing reports is switched off in this version.</span>
        </p>
      } />
      <div className="rounded-control border border-fam-border bg-fam-surface p-3">
        <p className="text-sm font-semibold">Looking for family documents?</p>
        <p className="text-[13px] text-fam-muted">Documents are separate from this fictional progress demonstration and remain subject to server-side release and consent.</p>
        <Link href="/app/family-documents" className="inline-flex min-h-[44px] items-center font-semibold text-fam-accent underline" data-testid="family-progress-documents-link">Open Family Documents</Link>
      </div>
    </div>
  );
}

export default function FamilyProgressPage() {
  return <Workspace active="family-progress" permission="family.progress.demo" deniedText="Progress updates are for connected families.">{(s, onError) => <Demo session={s} onError={onError} />}</Workspace>;
}
