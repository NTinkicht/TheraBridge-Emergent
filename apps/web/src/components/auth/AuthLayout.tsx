import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { SignatureBand } from '@/components/brand/SignatureBand';

function BrandPanel() {
  return (
    <aside className="relative hidden w-[44%] max-w-[625px] flex-col justify-between overflow-hidden bg-brand-deepNavy p-12 text-white lg:flex" data-testid="auth-brand-panel">
      <div className="absolute inset-x-0 top-0"><SignatureBand /></div>
      <span className="inline-flex w-fit items-center gap-2 rounded-[12px] bg-white px-3 py-2">
        <BrandMark variant="symbol" height={28} />
        <BrandMark variant="wordmark" height={18} />
      </span>
      <div className="tb-rise">
        <h1 className="font-display text-[40px] font-bold leading-[1.1] tracking-[-0.01em]">Calm, precise care<br />coordination for every child.</h1>
        <p className="mt-5 max-w-[440px] text-[16px] leading-relaxed text-white/80">
          One shared place for therapy centers, therapists and families. Every action is checked against your role and your center.
        </p>
      </div>
      <p className="flex items-center gap-2 text-[13px] text-white/70"><ShieldCheck size={16} aria-hidden="true" /> Synthetic data only · Not for clinical use</p>
    </aside>
  );
}

export function AuthLayout({ title, subtitle, children, testId }: { title: string; subtitle?: ReactNode; children: ReactNode; testId: string }) {
  return (
    <div className="flex min-h-screen bg-canvas-clinical text-brand-ink" data-testid={testId}>
      <BrandPanel />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="lg:hidden"><SignatureBand /></div>
        <div className="flex items-center gap-2 px-6 pt-6 lg:hidden" data-testid="auth-compact-brand">
          <BrandMark variant="symbol" height={26} />
          <BrandMark variant="wordmark" height={17} />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-10 md:px-10">
          <div className="tb-rise w-full max-w-[420px]">
            <h1 className="font-display text-[28px] font-bold leading-tight md:text-[32px]">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] text-brand-inkMuted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </div>
        <p className="px-6 pb-6 text-center text-[12px] text-brand-inkMuted lg:hidden">Synthetic data only · Not for clinical use</p>
      </main>
    </div>
  );
}
