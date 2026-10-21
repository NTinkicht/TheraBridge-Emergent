import { CheckCircle2, CircleDashed, CircleSlash, Hammer, XCircle } from 'lucide-react';

export type WorkStatus = 'IMPLEMENTED' | 'TESTED: PASS' | 'TESTED: FAIL' | 'PLANNED' | 'NOT RUN';

const STYLES: Record<WorkStatus, { cls: string; Icon: typeof CheckCircle2 }> = {
  IMPLEMENTED: { cls: 'bg-brand-actionTint text-brand-action', Icon: Hammer },
  'TESTED: PASS': { cls: 'bg-[#E3F2EC] text-status-success', Icon: CheckCircle2 },
  'TESTED: FAIL': { cls: 'bg-status-dangerSurface text-status-danger', Icon: XCircle },
  PLANNED: { cls: 'bg-surface-subtle text-brand-inkMuted', Icon: CircleDashed },
  'NOT RUN': { cls: 'bg-status-cautionSurface text-status-caution', Icon: CircleSlash },
};

export function StatusPill({ status, testId }: { status: WorkStatus; testId?: string }) {
  const { cls, Icon } = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold tracking-wide ${cls}`}
      data-testid={testId}
    >
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      {status}
    </span>
  );
}
