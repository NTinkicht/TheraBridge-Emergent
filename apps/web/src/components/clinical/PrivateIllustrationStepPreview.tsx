import { ImageOff, ShieldAlert } from 'lucide-react';
import { ILLUSTRATION_STYLE_VERSION } from '@/lib/illustration-style.mjs';
import { projectPrivateIllustrationSteps } from '@/lib/private-illustration-steps.mjs';

/**
 * M5 WU2-E: render ONLY inside the existing staff-authorized proposal panel.
 * This component neither resolves image URLs nor accepts approval/release
 * flags from props or client data. All 4:3 tiles are text placeholders.
 */
export function PrivateIllustrationStepPreview({
  templateVersion, steps,
}:{
  templateVersion?: number;
  steps: readonly string[];
}) {
  const projected = projectPrivateIllustrationSteps({
    templateVersion, steps: [...steps],
  });
  return <details className="rounded-control border border-border-light bg-surface-white p-3"
    data-testid="private-illustration-step-preview"
    data-illustration-style={ILLUSTRATION_STYLE_VERSION}>
    <summary className="min-h-[44px] cursor-pointer py-2 font-semibold text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action">
      Plan illustrated steps (staff-only preview)
    </summary>
    <p className="mt-2 flex gap-2 text-[13px] text-brand-inkMuted">
      <ShieldAlert size={18} aria-hidden="true" className="shrink-0" />
      Artwork is not approved. These are the existing activity instructions,
      not released images, new therapy advice or a printable family plan.
    </p>
    {!projected ? <p role="status" className="mt-3 text-[13px] text-status-caution">
      Activity instructions or version unavailable. Reload before planning artwork.
    </p> : projected.stepCount===0 ?
      <p role="status" className="mt-3 text-[13px] text-brand-inkMuted">
        No authored steps available for this activity version.
      </p> :
      <ol className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Clinician-authored numbered activity steps">
        {projected.steps.map(step=><li key={step.number}
          className="min-w-0 overflow-hidden rounded-control border border-border-light bg-surface-white"
          data-testid={'private-illustration-step-' + step.number}>
          <div className="flex aspect-[4/3] items-center justify-center border-b border-border-light bg-surface-subtle p-4"
            role="note" aria-label={'Step ' + step.number + ': illustration unavailable, not approved'}>
            <div className="space-y-2 text-center text-[13px] text-brand-inkMuted">
              <ImageOff size={24} aria-hidden="true" className="mx-auto" />
              <p>No approved illustration available</p>
            </div>
          </div>
          <div className="space-y-2 p-3">
            <p className="text-[12px] font-semibold text-brand-inkMuted">
              Step {step.number} · Activity version {step.templateVersion}
            </p>
            <p className="break-words text-[14px]">{step.instruction}</p>
          </div>
        </li>)}
      </ol>}
    <p className="mt-3 text-[12px] text-brand-inkMuted">
      Style {ILLUSTRATION_STYLE_VERSION} · 4:3 targets · center-safe square crop.
      Private drafts and scanned candidates cannot appear here.
    </p>
  </details>;
}
