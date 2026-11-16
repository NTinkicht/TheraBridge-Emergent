'use client';

import type { ReactNode } from 'react';
import { WorkspaceTabs } from '@/components/design/workspace-patterns';

export type ChildSection = 'overview' | 'plan' | 'assessments' | 'sessions' | 'progress' | 'reports';
export type PrimaryChildSection = 'overview' | 'care' | 'sessions' | 'progress' | 'documents';

export const primaryChildSection = (section: ChildSection): PrimaryChildSection => {
  if (section === 'plan' || section === 'assessments') return 'care';
  if (section === 'reports') return 'documents';
  return section;
};
export const defaultChildSection = (section: PrimaryChildSection): ChildSection =>
  section === 'care' ? 'plan' : section === 'documents' ? 'reports' : section;

/**
 * M5-05 synthetic qualification UI: five primary decisions, with plan and
 * assessment tasks grouped under Care. All clinical models and mutation checks
 * stay in the existing, API-authorized panel. This component never fetches,
 * caches or grants any child/tenant/specialty data.
 */
export function Child360Navigation({
  selected, onSelect, children,
}: {
  selected: ChildSection;
  onSelect: (section: ChildSection) => void;
  children: ReactNode;
}) {
  const primary = primaryChildSection(selected);
  const panel = primary === 'care' ? (
    <div className="space-y-4">
      <nav aria-label="Care sections" className="flex flex-wrap gap-2">
        {([
          ['plan', 'Therapy plans'],
          ['assessments', 'Assessments'],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" aria-current={selected === id ? 'page' : undefined}
            data-testid={`clinical-secondary-${id}`}
            onClick={() => onSelect(id)}
            className={`min-h-11 rounded-control border px-4 text-sm font-semibold ${selected === id
              ? 'border-brand-action bg-brand-actionTint text-brand-action'
              : 'border-border-light bg-surface-white text-brand-inkMuted hover:border-border-strong'}`}>
            {label}
          </button>
        ))}
      </nav>
      {children}
    </div>
  ) : children;
  return (
    <WorkspaceTabs label="Child 360 sections" selected={primary}
      onSelect={(next) => {
        const target = next as PrimaryChildSection;
        if (target !== primary) onSelect(defaultChildSection(target));
      }}
      tabs={[
        { id: 'overview', label: 'Overview', testId: 'clinical-tab-overview', content: primary === 'overview' ? panel : null },
        { id: 'care', label: 'Care', testId: 'clinical-tab-care', content: primary === 'care' ? panel : null },
        { id: 'sessions', label: 'Sessions', testId: 'clinical-tab-sessions', content: primary === 'sessions' ? panel : null },
        { id: 'progress', label: 'Progress', testId: 'clinical-tab-progress', content: primary === 'progress' ? panel : null },
        { id: 'documents', label: 'Documents', testId: 'clinical-tab-documents', content: primary === 'documents' ? panel : null },
      ]}
    />
  );
}
