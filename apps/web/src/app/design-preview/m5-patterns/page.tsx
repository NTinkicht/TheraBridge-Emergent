import { CompactTable } from '@/components/design/workspace-patterns';

// Public design QA fixture. Fictional labels only; no API, child, or tenant data.
export default function M5PatternsPreview() {
  return (
    <main className="mx-auto max-w-content space-y-5 px-4 py-8" data-testid="m5-patterns-qa">
      <h1 className="font-display text-2xl font-semibold">M5 shared patterns · synthetic QA</h1>
      <p className="text-sm text-brand-inkMuted">Static accessibility fixture, not a clinical workspace or approval.</p>
      <CompactTable caption="Synthetic activity table" columns={[
        {id:'activity',label:'Activity'}, {id:'status',label:'Status'}, {id:'date',label:'Date'},
      ]} rows={[
        {id:'synthetic-a',cells:{activity:'Demo practice A',status:'Not published',date:'2026-01-01'}},
        {id:'synthetic-b',cells:{activity:'Demo practice B',status:'Under review',date:'2026-01-02'}},
      ]}/>
    </main>
  );
}
