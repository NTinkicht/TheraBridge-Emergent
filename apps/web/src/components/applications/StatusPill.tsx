import { CheckCircle2, Clock3, Search, XCircle } from 'lucide-react';
import { Pill } from '@/components/design/ui';
import { STATUS_LABELS, type ApplicationStatus } from '@/lib/auth';

const LOOK = {
  SUBMITTED: { tone: 'caution', icon: Clock3 },
  UNDER_REVIEW: { tone: 'info', icon: Search },
  APPROVED: { tone: 'success', icon: CheckCircle2 },
  REJECTED: { tone: 'danger', icon: XCircle },
} as const;

export function StatusPill({ status, testId }: { status: ApplicationStatus; testId?: string }) {
  return <Pill tone={LOOK[status].tone} icon={LOOK[status].icon} testId={testId}>{STATUS_LABELS[status]}</Pill>;
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
