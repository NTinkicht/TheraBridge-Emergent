'use client';

import { FileText, ShieldCheck } from 'lucide-react';
import { Workspace } from '@/components/centers/kit';
import { FamilyReleasedDocuments } from '@/components/clinical/FamilyReleasedDocuments';

/** Document contents and per-child authorization remain enforced by the dual-gated backend. */
export default function FamilyDocumentsPage() {
  return <Workspace active="family-documents" permission="family.progress.demo"
    deniedText="Family documents are available only in an authorized guardian context.">
    {(session) => {
      const centerId=session.activeContext?.type==='center'?session.activeContext.centerId:'';
      return <main className="theme-family-auto space-y-4 rounded-card bg-fam-canvas p-3 text-fam-ink sm:p-5"
        data-testid="family-documents-page">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold"><FileText size={24} aria-hidden="true"/>Family documents</h1>
        <p className="text-[14px] text-fam-muted">A separate home for documents explicitly released to your linked family account. This is not the sample progress page.</p>
        <div className="flex items-start gap-2 rounded-control border border-fam-border bg-fam-surface p-3 text-[13px]"
          data-testid="family-documents-safety">
          <ShieldCheck size={18} aria-hidden="true" className="shrink-0"/>
          <p>Clinical reports and plans remain unavailable unless the center has explicitly enabled family release and the server verifies consent and child access. Synthetic previews do not authorize real document access.</p>
        </div>
        {centerId && <FamilyReleasedDocuments centerId={centerId}/>}
      </main>;
    }}
  </Workspace>;
}
