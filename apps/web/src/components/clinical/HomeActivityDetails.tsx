'use client';

import { Clock3, ShieldAlert } from 'lucide-react';
import type { HomeActivity, Template } from '@/lib/clinical';
import { homeActivityDefinition, MAX_THERAPIST_INSTRUCTION_LENGTH } from '@/lib/home-activity-detail';

export function HomeActivityDetails({ activity, templates, editable, index, onInstructionsChange }: {
  activity: HomeActivity;
  templates: Template[];
  editable: boolean;
  index: number;
  onInstructionsChange: (text: string) => void;
}) {
  const definition = homeActivityDefinition(activity, templates);
  return <div className="w-full space-y-3 rounded-control border border-border-light bg-surface-subtle p-3"
    data-testid={`home-activity-details-${index}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="min-w-0 break-words text-[14px] font-semibold">{definition.title}</h4>
      {definition.minutes !== null && <span className="inline-flex items-center gap-1 text-[12px] text-brand-inkMuted"
        data-testid={`home-activity-duration-${index}`}>
        <Clock3 size={14} aria-hidden="true"/>{definition.minutes} min · {definition.ageBand}
      </span>}
    </div>
    <p className="text-[12px] text-brand-inkMuted" data-testid={`home-activity-definition-source-${index}`}>
      {definition.source === 'SAVED_SNAPSHOT' ? 'Saved activity definition for this plan version.' :
        definition.source === 'CURRENT_LIBRARY' ? 'Current activity-library definition (not a frozen snapshot). Saving this draft captures the server-owned definition.' :
        'Activity definition unavailable. Review the library association before continuing.'}
      {' '}Duration is taken from the activity definition; this editor does not override it.
    </p>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <p className="text-[12px] font-semibold">Materials</p>
        <p className="break-words text-[12px] text-brand-inkMuted">
          {definition.materials.length ? definition.materials.join(' · ') : 'None recorded'}
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-[12px] font-semibold">Activity steps</p>
        {definition.steps.length ? <ol className="list-decimal space-y-1 pl-4 text-[12px] text-brand-inkMuted">
          {definition.steps.map((step, i) => <li key={i} className="break-words">{step}</li>)}
        </ol> : <p className="text-[12px] text-brand-inkMuted">No steps recorded</p>}
      </div>
    </div>
    <div className="space-y-1 rounded-control border border-border-light bg-surface-white p-3"
      data-testid={`home-activity-safety-${index}`}>
      <p className="flex items-center gap-2 text-[12px] font-semibold">
        <ShieldAlert size={15} className="text-status-caution" aria-hidden="true"/>Safety guidance from the activity definition
      </p>
      {definition.safety.length ? <ul className="list-disc space-y-1 pl-4 text-[12px] text-brand-inkMuted">
        {definition.safety.map((item, i) => <li key={i} className="break-words">{item}</li>)}
      </ul> : <p className="text-[12px] text-status-caution">No safety guidance recorded. Clinician assessment required.</p>}
    </div>
    <label className="block text-[12px] font-semibold">
      Therapist instructions for this plan activity
      <textarea rows={3} value={definition.note} disabled={!editable}
        maxLength={MAX_THERAPIST_INSTRUCTION_LENGTH}
        data-testid={`home-activity-instructions-${index}`}
        onChange={e => onInstructionsChange(e.target.value)}
        placeholder="Add activity-specific instructions, adaptations or precautions (internal draft only)"
        className="mt-1 w-full resize-y rounded-control border border-border-light bg-surface-white px-3 py-2 text-[13px] font-normal disabled:opacity-60"/>
      <span className="mt-1 block text-right text-[11px] font-normal text-brand-inkMuted">
        {definition.note.length}/{MAX_THERAPIST_INSTRUCTION_LENGTH} characters · stored only when Save draft succeeds
      </span>
    </label>
    <p className="text-[11px] text-brand-inkMuted">
      Notes are clinician-authored, never automatic clinical advice. No approval, family distribution or release.
    </p>
  </div>;
}
