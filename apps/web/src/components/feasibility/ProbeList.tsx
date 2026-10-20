import { CheckCircle2 } from 'lucide-react';
import type { Probe } from '@/lib/api';

export function ProbeRows({ items, highlightId }: { items: Probe[]; highlightId: string | null }) {
  if (items.length === 0) {
    return (
      <p className="rounded-control border border-dashed border-border-strong px-4 py-6 text-center text-[14px] text-brand-inkMuted" data-testid="probe-empty">
        No probe rows yet. Write one to test the round trip.
      </p>
    );
  }
  return (
    <ul className="space-y-2" data-testid="probe-rows">
      {items.map((p) => (
        <li
          key={p.id}
          className={`tb-rise rounded-control border px-4 py-3 ${p.id === highlightId ? 'border-status-success bg-[#F1F8F5]' : 'border-border-light bg-surface-white'}`}
          data-testid={`probe-row-${p.id}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="font-mono text-[13px] font-medium">{p.label}</span>
            <span className="text-[12px] text-brand-inkMuted">{new Date(p.createdAt).toLocaleString()}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[12px] text-brand-inkMuted">
            <span>source: {p.source}</span>
            <span className="truncate">id: {p.id}</span>
            {p.id === highlightId && (
              <span className="inline-flex items-center gap-1 font-semibold text-status-success" data-testid="probe-readback-confirmed">
                <CheckCircle2 size={14} aria-hidden="true" /> Read back from PostgreSQL
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
