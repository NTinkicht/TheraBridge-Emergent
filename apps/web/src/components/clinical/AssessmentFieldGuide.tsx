'use client';

import { serviceLabel } from '@/components/operations/BookDialog';

/** Non-diagnostic prompts. No values, findings or recommendations are generated. */
const HELP: Record<string, string[]> = {
  speech: ['Describe the communication task and the setting actually observed.', 'Record the learner’s response and assistance used, without inferring a diagnosis.'],
  occupational: ['Describe the functional activity, supports and environment actually observed.', 'Record observable participation and safety considerations without making a diagnostic claim.'],
  physical: ['Describe the observed movement task, support and environment.', 'Record directly observed participation and stop if a safety concern needs clinical review.'],
  behavioral: ['Describe observable behavior and context, not speculative causes.', 'Use neutral, factual wording and follow the center’s safeguarding process for concerns.'],
  feeding: ['Describe the observed feeding task and assistance without inferring swallowing safety.', 'Record factual responses and refer concerns to qualified clinical review.'],
  developmental: ['Describe the developmental task and context observed.', 'Record what the child actually did, supports used and any limitations.'],
};
export function AssessmentFieldGuide({ service }: { service: string }) {
  const prompts = HELP[service] ?? [
    'Describe only what was directly observed for this specialty and task.',
    'Record context and supports; avoid diagnosis, inference or unsourced recommendations.',
  ];
  return <aside className="rounded-control border border-border-light bg-surface-subtle p-3"
    data-testid="assessment-specialty-guide" aria-label="Assessment writing guidance">
    <p className="text-[13px] font-semibold">Drafting guidance · {service ? serviceLabel(service) : 'selected specialty'}</p>
    <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12px] text-brand-inkMuted">
      {prompts.map(item => <li key={item}>{item}</li>)}
    </ol>
    <p className="mt-2 text-[12px] text-brand-inkMuted">Writing prompts only; clinician must review every entry. These do not prefill, validate, diagnose, sign or release anything.</p>
  </aside>;
}
