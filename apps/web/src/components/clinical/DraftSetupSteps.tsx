'use client';

/** Orientation only: all draft controls remain mounted and their save semantics unchanged. */
export function DraftSetupSteps({ kind, titleId, detailId }: { kind: 'report' | 'plan'; titleId: string; detailId: string }) {
  return <nav aria-label={`${kind} draft creation steps`} data-testid={`${kind}-draft-setup-steps`}
    className="rounded-control border border-border-light bg-surface-subtle p-3">
    <p className="text-[14px] font-semibold">Start a {kind} draft in two steps</p>
    <ol className="mt-2 flex flex-wrap gap-2 text-[13px]">
      <li><a className="inline-flex min-h-[44px] items-center rounded-control border border-border-light px-3 text-brand-action underline"
        href={`#${titleId}`}>1. Choose specialty and title</a></li>
      <li><a className="inline-flex min-h-[44px] items-center rounded-control border border-border-light px-3 text-brand-action underline"
        href={`#${detailId}`}>{kind === 'report' ? '2. Review report period and start draft' : '2. Start editable plan version'}</a></li>
    </ol>
    <p className="mt-2 text-[12px] text-brand-inkMuted">
      {kind === 'report'
        ? 'The generated report is a draft based on recorded sources. Review all fields before any later submission.'
        : 'Creation starts a draft plan version; goals and activities are edited and explicitly saved afterwards.'}
      {' '}No signing, approval or family release occurs here.
    </p>
  </nav>;
}
