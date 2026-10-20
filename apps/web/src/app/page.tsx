import nextPkg from 'next/package.json';
import { ShieldAlert } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { SignatureBand } from '@/components/brand/SignatureBand';
import { ProbePanel } from '@/components/feasibility/ProbePanel';
import { WorkUnits } from '@/components/feasibility/WorkUnits';

export default function FeasibilityPage() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border-light bg-surface-white/95 backdrop-blur" data-testid="app-header">
        <SignatureBand />
        <div className="mx-auto flex max-w-content items-center justify-between gap-3 px-4 py-3 md:px-8">
          <a href="/" className="flex items-center gap-2.5" data-testid="brand-home-link">
            <BrandMark variant="symbol" height={30} />
            <BrandMark variant="wordmark" height={20} />
          </a>
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-status-cautionSurface px-3 py-1.5 text-[12px] font-semibold text-status-caution"
            data-testid="synthetic-data-badge"
          >
            <ShieldAlert size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Synthetic data only · Not for clinical use</span>
            <span className="sm:hidden">Synthetic only</span>
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-content space-y-6 px-4 py-8 md:px-8 md:py-10">
        <div className="tb-rise">
          <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-brand-action">Work unit TB-EM-000</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight md:text-[31px]" data-testid="page-title">
            Feasibility and portability gate
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-brand-inkMuted md:text-[16px]">
            Coordinated care, meaningful progress. This page proves the preferred stack runs end to end before any product feature is built.
          </p>
        </div>

        <ProbePanel nextVersion={nextPkg.version} />
        <WorkUnits />

        <footer className="pb-6 text-[12px] text-brand-inkMuted" data-testid="page-footer">
          TheraBridge V1 proof of concept · fictional demo data only · clinical pilot and production: NO-GO.
        </footer>
      </main>
    </>
  );
}
