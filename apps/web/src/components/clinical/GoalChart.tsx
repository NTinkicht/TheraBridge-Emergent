'use client';

import type { Point } from '@/lib/reports';

const W = 600;
const H = 200;
const PAD = { l: 40, r: 16, t: 16, b: 28 };
const t = (d: string) => Date.parse(`${d}T00:00:00Z`);

// Plots recorded observations only, in date order, against the plan's baseline and target. No trend line is drawn.
export function GoalChart({ points, baseline, target, measure, from, to, tone = 'clinical', testId }: { points: Point[]; baseline: number; target: number; measure: string; from: string; to: string; tone?: 'clinical' | 'family'; testId: string }) {
  const fam = tone === 'family';
  const hi = measure === 'percent' ? 100 : Math.max(target, baseline, ...points.map((p) => p.value), 1) * 1.15;
  const [x0, x1] = [t(from), Math.max(t(to), t(from) + 86_400_000)];
  const x = (d: string) => PAD.l + ((t(d) - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - Math.min(v, hi) / hi) * (H - PAD.t - PAD.b);
  const line = fam ? 'text-fam-accent' : 'text-brand-action';
  const muted = fam ? 'fill-fam-muted' : 'fill-brand-inkMuted';
  const label = points.length ? `Recorded values from ${points[0].date} to ${points[points.length - 1].date}: ${points.map((p) => `${p.value} on ${p.date}`).join(', ')}. Baseline ${baseline}, target ${target}.` : `No values recorded between ${from} and ${to}. Baseline ${baseline}, target ${target}.`;
  return (
    <figure className="w-full" data-testid={testId}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full overflow-visible">
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="stroke-current text-border-light" strokeWidth={1} />
        <line x1={PAD.l} x2={W - PAD.r} y1={y(baseline)} y2={y(baseline)} className="stroke-current text-brand-inkMuted" strokeDasharray="4 4" strokeWidth={1.5} />
        <text x={PAD.l - 6} y={y(baseline) + 4} textAnchor="end" className={`${muted} text-[11px]`}>{baseline}</text>
        <text x={W - PAD.r} y={y(baseline) - 5} textAnchor="end" className={`${muted} text-[11px]`}>Baseline</text>
        <line x1={PAD.l} x2={W - PAD.r} y1={y(target)} y2={y(target)} className="stroke-current text-status-success" strokeDasharray="6 3" strokeWidth={1.5} />
        <text x={PAD.l - 6} y={y(target) + 4} textAnchor="end" className={`${muted} text-[11px]`}>{target}</text>
        <text x={W - PAD.r} y={y(target) - 5} textAnchor="end" className="fill-status-success text-[11px] font-semibold">Target</text>
        {points.length > 1 && <polyline points={points.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')} fill="none" className={`stroke-current ${line}`} strokeWidth={2.5} strokeLinejoin="round" />}
        {points.map((p, i) => (
          <g key={`${p.date}-${i}`}>
            <circle cx={x(p.date)} cy={y(p.value)} r={5} className={`fill-current ${line}`} stroke="white" strokeWidth={2} />
            {points.length <= 10 && <text x={x(p.date)} y={y(p.value) - 10} textAnchor="middle" className={`${muted} text-[11px] font-semibold`}>{p.value}</text>}
          </g>
        ))}
        <text x={PAD.l} y={H - 8} className={`${muted} text-[11px]`}>{from}</text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end" className={`${muted} text-[11px]`}>{to}</text>
      </svg>
      {points.length > 0 && (
        <table className="sr-only">
          <caption>Recorded observations</caption>
          <thead><tr><th>Date</th><th>Value</th></tr></thead>
          <tbody>{points.map((p, i) => <tr key={i}><td>{p.date}</td><td>{p.value}</td></tr>)}</tbody>
        </table>
      )}
    </figure>
  );
}

export const STATUS_TEXT = {
  none: 'No observations recorded in this period',
  insufficient: 'Only one observation recorded, not enough to show change',
  recorded: 'observations recorded',
} as const;
