'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { Baby, ChevronRight } from 'lucide-react';
import { PageTitle, Workspace, useLoad } from '@/components/centers/kit';
import { Card } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { serviceLabel } from '@/components/operations/BookDialog';
import type { SessionInfo } from '@/lib/auth';
import { opsApi } from '@/lib/operations';

function List({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const fetcher = useCallback(() => opsApi.children(centerId, {}), [centerId]);
  const { data, failed, reload } = useLoad(fetcher, onError);
  return (
    <div className="space-y-5">
      <PageTitle title="Clinical workspace" body="Assessments, therapy plans, session drafts and progress. Synthetic data only; nothing can be signed or released." testId="clinical-title" />
      {failed && <ErrorState onRetry={() => void reload()} testId="clinical-list-error" />}
      {!failed && !data && <Card className="p-5"><SkeletonRows rows={3} testId="clinical-list-loading" /></Card>}
      {data && !data.items.length && <EmptyState icon={Baby} title="No children assigned" body="Children assigned to you appear here." testId="clinical-list-empty" />}
      {data && data.items.length > 0 && (
        <Card className="divide-y divide-border-light" testId="clinical-list">
          {data.items.map((c) => (
            <Link key={c.id} href={`/app/clinical/${c.id}`} className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-subtle" data-testid={`clinical-child-${c.id}`}>
              <span className="min-w-0"><span className="block font-semibold">{c.preferredName ?? c.firstName} {c.lastName}</span><span className="text-[13px] text-brand-inkMuted">{c.services.map(serviceLabel).join(', ')}</span></span>
              <ChevronRight size={18} aria-hidden="true" />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}

export default function ClinicalPage() {
  return <Workspace active="clinical" permission="center.clinical.read" deniedText="The clinical workspace is available to therapists and clinical supervisors.">{(s, onError) => <List session={s} onError={onError} />}</Workspace>;
}
