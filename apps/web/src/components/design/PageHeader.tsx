import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export function PageHeader({ crumbs, title, context, actions, tone = 'clinical' }: { crumbs: { label: string; href?: string }[]; title: ReactNode; context?: ReactNode; actions?: ReactNode; tone?: 'clinical' | 'family' }) {
  const muted = tone === 'family' ? 'text-fam-muted' : 'text-brand-inkMuted';
  return (
    <header className="tb-rise mb-6 flex flex-col gap-4 md:mb-8 lg:flex-row lg:items-end lg:justify-between" data-testid="page-header">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className={`mb-2 hidden items-center gap-1 text-[13px] md:flex ${muted}`}>
          {crumbs.map((c, i) => (
            <span key={c.label} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight size={13} aria-hidden="true" />}
              {c.href ? <Link href={c.href} className="hover:underline">{c.label}</Link> : <span aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c.label}</span>}
            </span>
          ))}
        </nav>
        <h1 className={`font-display text-[25px] font-semibold leading-tight tracking-[-0.01em] md:text-[31px] ${tone === 'family' ? 'text-fam-ink' : ''}`} data-testid="page-title">{title}</h1>
        {context && <p className={`mt-1.5 text-[15px] ${muted}`} data-testid="page-context">{context}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-start gap-3">{actions}</div>}
    </header>
  );
}
