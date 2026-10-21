'use client';

import { useCallback } from 'react';
import { FlaskConical, HeartHandshake } from 'lucide-react';
import { Workspace, useLoad } from '@/components/centers/kit';
import { FamilyProgress } from '@/components/clinical/FamilyProgress';
import { ErrorState, SkeletonRows } from '@/components/design/states';
import type { SessionInfo } from '@/lib/auth';
import { reportsApi } from '@/lib/reports';

function Demo({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const fetcher = useCallback(() => reportsApi.familyDemo(centerId), [centerId]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  if (failed) return <ErrorState tone="family" onRetry={() => void reload()} testId="family-progress-error" />;
  if (!data) return <SkeletonRows rows={4} testId="family-progress-loading" />;
  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 font-display text-[26px] font-bold"><HeartHandshake size={24} className="text-fam-accent" aria-hidden="true" />Progress updates</h1>
      <FamilyProgress data={data} testId="family-progress-demo" banner={
        <p className="flex items-start gap-2 rounded-control border-2 border-dashed border-fam-caution bg-fam-surface p-3 text-[14px]" data-testid="family-progress-sample-banner">
          <FlaskConical size={18} className="mt-0.5 shrink-0 text-fam-caution" aria-hidden="true" />
          <span><strong>Sample only.</strong> This shows how a progress update could look one day. It uses a made-up child and made-up numbers. Your child’s therapy records are not shared here, because sharing reports is switched off in this version.</span>
        </p>
      } />
    </div>
  );
}

export default function FamilyProgressPage() {
  return <Workspace active="family-progress" permission="family.progress.demo" deniedText="Progress updates are for connected families.">{(s, onError) => <Demo session={s} onError={onError} />}</Workspace>;
}
