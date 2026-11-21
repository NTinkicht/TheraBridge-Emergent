'use client';

import { Activity, Brain, Clock, Hand, ImageOff, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { Card, type Tone } from '@/components/design/ui';
import { isRecognizedSpecialty, specialtyDisplayName, specialtyIdentity } from '@/styles/specialty-identity';
import type { Template } from '@/lib/clinical';

// Step-by-step activity with materials and safety guidance; shared by the staff library, plan preview and family screens.
export function ActivityCard({ t, tone = 'clinical', extra, visual = false, compact = false }: { t: Template; tone?: Tone; extra?: string; visual?: boolean; compact?: boolean }) {
  const fam = tone === 'family';
  const identity = isRecognizedSpecialty(t.service) ? specialtyIdentity(t.service) : null;
  const Icon = identity ? { 'message-circle': MessageCircle, hand: Hand, brain: Brain, activity: Activity, users: Users }[identity.icon] : null;
  return (
    <Card tone={tone} className="p-5" testId={`activity-${t.id}`}>
      {visual && <div className="mb-4 flex aspect-[4/3] max-h-48 w-full items-center justify-center rounded-control border border-border-light bg-surface-muted" data-testid={`activity-media-placeholder-${t.id}`}>
        <div className="flex flex-col items-center gap-2 px-3 text-center text-[13px] text-brand-inkMuted">
          <ImageOff size={24} aria-hidden="true" />
          <span>No approved illustration available</span>
        </div>
      </div>}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={`${fam ? 'font-display text-[19px]' : 'text-[16px]'} font-semibold`}>{t.title}</h3>
        <span className={`flex items-center gap-1 text-[13px] ${fam ? 'text-fam-muted' : 'text-brand-inkMuted'}`}><Clock size={13} aria-hidden="true" />{t.minutes} min · {t.ageBand}</span>
      </div>
      <p className={`text-[13px] ${fam ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>{Icon && <Icon size={14} aria-hidden="true" className="inline-block align-[-2px]" />}<span className={Icon ? 'ml-1' : ''}>{specialtyDisplayName(t.service)}</span>{t.library === 'synthetic' ? ' · synthetic sample library' : ''}{extra ? ` · ${extra}` : ''}</p>
      {t.materials.length > 0 && <p className="mt-3 text-[14px]"><span className="font-semibold">You’ll need: </span>{t.materials.join(', ')}</p>}
      {compact && t.steps.length > 0 && <details className="mt-3 rounded-control border border-border-light p-3" data-testid={`activity-details-${t.id}`}>
        <summary className="cursor-pointer text-[14px] font-semibold">Instructions ({t.steps.length} steps)</summary>
        <ol className="mt-3 space-y-2" aria-label="Steps">
          {t.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-[14px]">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${fam ? 'bg-fam-accentTint text-fam-accent' : 'bg-brand-actionTint text-brand-action'}`}>{i + 1}</span><span>{step}</span>
            </li>
          ))}
        </ol>
      </details>}
      {(!compact || t.steps.length === 0) && <ol className="mt-3 space-y-2" aria-label="Steps">
        {t.steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-[14px]">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${fam ? 'bg-fam-accentTint text-fam-accent' : 'bg-brand-actionTint text-brand-action'}`}>{i + 1}</span><span>{s}</span>
          </li>
        ))}
      </ol>}
      <div className={`mt-4 rounded-control p-3 text-[14px] ${fam ? 'bg-fam-warm' : 'bg-status-cautionSurface'}`} data-testid={`activity-safety-${t.id}`}>
        <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={15} aria-hidden="true" />Safety</p>
        <ul className="mt-1 list-disc pl-5">{t.safety.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </div>
    </Card>
  );
}
