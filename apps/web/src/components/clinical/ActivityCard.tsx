'use client';

import { Activity, Brain, Clock, Hand, ImageOff, MessageCircle, ShieldCheck, Users } from 'lucide-react';
import { Card, type Tone } from '@/components/design/ui';
import { isRecognizedSpecialty, specialtyDisplayName, specialtyIdentity } from '@/styles/specialty-identity';
import type { Template } from '@/lib/clinical';

// Presentation-only. The current template API assigns ONE service. The
// optional services array supports future multi-specialty cards without
// inventing permissions or changing the stored clinical activity.
export function ActivityCard({ t, tone = 'clinical', extra, visual = false, compact = false, layout = 'grid' }: {
  t: Template; tone?: Tone; extra?: string; visual?: boolean; compact?: boolean; layout?: 'grid' | 'list';
}) {
  const fam = tone === 'family';
  const candidateServices = (t as Template & { services?: readonly string[] }).services;
  const services = Array.isArray(candidateServices) && candidateServices.length
    ? candidateServices.filter(isRecognizedSpecialty) : [t.service];
  const identities = services.filter(isRecognizedSpecialty)
    .map(specialtyIdentity)
    .filter((item, i, list) => list.findIndex(x => x.family === item.family) === i);
  const identity = isRecognizedSpecialty(t.service) ? specialtyIdentity(t.service) : null;
  const Icon = identity ? { 'message-circle': MessageCircle, hand: Hand, brain: Brain, activity: Activity, users: Users }[identity.icon] : null;
  const accent = identities.length > 1
    ? `linear-gradient(90deg, ${identities.map((x, i) => `${x.color} ${(i / (identities.length - 1)) * 100}%`).join(', ')})`
    : identities[0]?.color;
  const tint = identities.length > 1
    ? `linear-gradient(115deg, ${identities.map((x, i) => `${x.tint} ${(i / (identities.length - 1)) * 100}%`).join(', ')})`
    : undefined;
  const showList = layout === 'list' && visual;
  return (
    <Card tone={tone} className="flex min-h-0 flex-1 flex-col overflow-hidden" testId={`activity-${t.id}`}>
      {!fam && accent && <div aria-hidden="true" className="h-1.5 w-full shrink-0" style={{ background: accent }}
        data-testid={`activity-specialty-accent-${t.id}`} />}
      <div className={`flex min-w-0 flex-1 flex-col gap-4 p-5 ${showList ? 'sm:flex-row' : ''}`}
        style={!fam && identities.length ? { background: tint ?? identities[0].tint } : undefined}>
        {visual && <div className={`flex aspect-[4/3] min-w-0 items-center justify-center rounded-control border border-border-light bg-surface-white ${showList ? 'w-full sm:w-44 sm:shrink-0 sm:self-start' : 'max-h-48 w-full'}`}
          data-testid={`activity-media-placeholder-${t.id}`}>
          <div className="flex flex-col items-center gap-2 px-3 text-center text-[13px] text-brand-inkMuted">
            <ImageOff size={24} aria-hidden="true" />
            <span>No approved illustration available</span>
          </div>
        </div>}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className={`${fam ? 'font-display text-[19px]' : 'text-[16px]'} min-w-0 flex-1 break-words font-semibold ${compact && !showList ? 'sm:min-h-[44px]' : ''}`}>{t.title}</h3>
            <span className={`flex shrink-0 items-center gap-1 text-[13px] ${fam ? 'text-fam-muted' : 'text-brand-inkMuted'}`}><Clock size={13} aria-hidden="true" />{t.minutes} min · {t.ageBand}</span>
          </div>
          <p className={`text-[13px] ${fam ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>
            {Icon && <Icon size={14} aria-hidden="true" className="inline-block align-[-2px]" />}
            <span className={Icon ? 'ml-1' : ''}>{services.length > 1 ? services.map(specialtyDisplayName).join(', ') : specialtyDisplayName(t.service)}</span>
            {t.library === 'synthetic' ? ' · synthetic sample library' : ''}{extra ? ` · ${extra}` : ''}
          </p>
          {t.materials.length > 0 && <p className="mt-3 text-[14px]"><span className="font-semibold">You’ll need: </span>{t.materials.join(', ')}</p>}
          {compact && t.steps.length > 0 && <details className="mt-3 rounded-control border border-border-light bg-surface-white p-3" data-testid={`activity-details-${t.id}`}>
            <summary className="cursor-pointer text-[14px] font-semibold">Instructions ({t.steps.length} steps)</summary>
            <ol className="mt-3 space-y-2" aria-label="Steps">{t.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-[14px]">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${fam ? 'bg-fam-accentTint text-fam-accent' : 'bg-brand-actionTint text-brand-action'}`}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}</ol>
          </details>}
          {(!compact || t.steps.length === 0) && <ol className="mt-3 space-y-2" aria-label="Steps">
            {t.steps.map((step, i) => <li key={i} className="flex gap-3 text-[14px]">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold ${fam ? 'bg-fam-accentTint text-fam-accent' : 'bg-brand-actionTint text-brand-action'}`}>{i + 1}</span>
              <span>{step}</span>
            </li>)}
          </ol>}
          <div className="mt-auto pt-4">
            <div className={`rounded-control p-3 text-[14px] ${fam ? 'bg-fam-warm' : 'bg-status-cautionSurface'}`}
              data-testid={`activity-safety-${t.id}`}>
              <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={15} aria-hidden="true" />Safety</p>
              <ul className="mt-1 list-disc pl-5">{t.safety.map((step, i) => <li key={i}>{step}</li>)}</ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
