'use client';

import { ImageOff, Search } from 'lucide-react';
import { Field } from '@/components/auth/Field';
import { serviceLabel } from '@/components/operations/BookDialog';
import type { Template } from '@/lib/clinical';

/** Uses the existing authorized workspace template list; never loads remote or unapproved media. */
export function SessionActivityPicker({ noteId, service, templates, query, onQuery, onAdd }: {
  noteId: string; service: string; templates: Template[]; query: string;
  onQuery: (value: string) => void; onAdd: (template: Template) => void;
}) {
  const matching = templates.filter(t => t.service === service &&
    t.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <section className="space-y-3 rounded-card border border-border-light p-4"
    aria-label="Choose session activities" data-testid="session-activity-picker">
    <div className="flex items-center gap-2">
      <Search size={17} aria-hidden="true" className="text-brand-action" />
      <h4 className="font-semibold">Choose an activity · {serviceLabel(service)}</h4>
    </div>
    <p className="text-[12px] text-brand-inkMuted">Choose from this authorized specialty catalogue. Images appear only when approved for use; no private image is fetched or published. The same Add button works by keyboard or touch.</p>
    <Field label={`Search ${serviceLabel(service)} activity library`} value={query}
      onChange={e => onQuery(e.target.value)} testId={`session-search-${noteId}`} />
    <div className="grid max-h-[480px] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3"
      data-testid="session-activity-picker-results">
      {matching.map(t => <article key={t.id} className="flex min-w-0 flex-col overflow-hidden rounded-control border border-border-light bg-surface-white"
        data-testid={`session-activity-choice-${t.id}`}>
        <div className="flex aspect-[4/3] items-center justify-center border-b border-border-light bg-surface-subtle"
          data-testid={`session-activity-choice-media-${t.id}`}>
          <div className="space-y-1 px-3 text-center text-[12px] text-brand-inkMuted">
            <ImageOff size={20} className="mx-auto" aria-hidden="true" />
            <span className="block">No approved illustration available</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
          <p className="break-words text-[14px] font-semibold">{t.title}</p>
          <p className="text-[12px] text-brand-inkMuted">{t.minutes} min · {t.ageBand}</p>
          <button type="button" onClick={() => onAdd(t)}
            className="mt-auto min-h-[44px] w-full rounded-control bg-brand-action px-3 py-2 text-[13px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action"
            data-testid={`session-activity-add-${t.id}`}>Add {t.title}</button>
        </div>
      </article>)}
    </div>
    {!matching.length && <p role="status" className="text-[13px] text-brand-inkMuted"
      data-testid="session-activity-picker-empty">No authorized activity matches this search.</p>}
  </section>;
}
