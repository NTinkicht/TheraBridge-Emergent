'use client';

import { Clock, ShieldCheck } from 'lucide-react';
import { Card, type Tone } from '@/components/design/ui';
import { serviceLabel } from '@/components/operations/BookDialog';
import type { Template } from '@/lib/clinical';

// Step-by-step activity with materials and safety guidance; shared by the staff library, plan preview and family screens.
export function ActivityCard({ t, tone = 'clinical', extra }: { t: Template; tone?: Tone; extra?: string }) {
  const fam = tone === 'family';
  return (
    <Card tone={tone} className="p-5" testId={`activity-${t.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={`${fam ? 'font-display text-[19px]' : 'text-[16px]'} font-semibold`}>{t.title}</h3>
        <span className={`flex items-center gap-1 text-[13px] ${fam ? 'text-fam-muted' : 'text-brand-inkMuted'}`}><Clock size={13} aria-hidden="true" />{t.minutes} min · {t.ageBand}</span>
      </div>
      <p className={`text-[13px] ${fam ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>{serviceLabel(t.service)}{t.library === 'synthetic' ? ' · synthetic sample library' : ''}{extra ? ` · ${extra}` : ''}</p>
      {t.materials.length > 0 && <p className="mt-3 text-[14px]"><span className="font-semibold">You’ll need: </span>{t.materials.join(', ')}</p>}
      <ol className="mt-3 space-y-2" aria-label="Steps">
        {t.steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-[14px]">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${fam ? 'bg-fam-accentTint text-fam-accent' : 'bg-brand-actionTint text-brand-action'}`}>{i + 1}</span><span>{s}</span>
          </li>
        ))}
      </ol>
      <div className={`mt-4 rounded-control p-3 text-[14px] ${fam ? 'bg-fam-warm' : 'bg-status-cautionSurface'}`} data-testid={`activity-safety-${t.id}`}>
        <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={15} aria-hidden="true" />Safety</p>
        <ul className="mt-1 list-disc pl-5">{t.safety.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </div>
    </Card>
  );
}
