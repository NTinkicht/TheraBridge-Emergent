import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Lock, type LucideIcon } from 'lucide-react';
import type { SpecialtyKey } from '@/lib/design/fixtures';

export type Tone = 'clinical' | 'family';
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Tone, Record<Variant, string>> = {
  clinical: {
    primary: 'bg-brand-action text-white shadow-sm hover:bg-brand-actionHover',
    secondary: 'border border-border-light bg-surface-white text-brand-ink hover:border-border-strong hover:bg-surface-subtle',
    ghost: 'text-brand-action hover:bg-brand-actionTint',
    danger: 'bg-status-danger text-white hover:brightness-95',
  },
  family: {
    primary: 'bg-fam-accent text-fam-onAccent shadow-sm hover:bg-fam-accentHover',
    secondary: 'border border-fam-border bg-fam-surface text-fam-ink hover:bg-fam-tile',
    ghost: 'text-fam-link hover:bg-fam-accentTint',
    danger: 'bg-status-danger text-white hover:brightness-95',
  },
};
const SIZES: Record<Size, string> = {
  sm: 'min-h-[44px] md:min-h-[36px] px-3 text-[13px]',
  md: 'min-h-[44px] px-4 text-[14px]',
  lg: 'min-h-[52px] px-6 text-[16px]',
};

export const btn = (variant: Variant = 'primary', tone: Tone = 'clinical', size: Size = 'md') =>
  `inline-flex items-center justify-center gap-2 rounded-control font-medium transition-[background-color,border-color,transform,filter] duration-150 active:scale-[0.98] ${SIZES[size]} ${VARIANTS[tone][variant]}`;

export function Button({ variant, tone, size, className = '', type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; tone?: Tone; size?: Size }) {
  return <button type={type} className={`${btn(variant, tone, size)} ${className}`} {...rest} />;
}

export function LockedAction({ id, label, reason, tone = 'clinical', size = 'md', align = 'start' }: { id: string; label: string; reason: string; tone?: Tone; size?: Size; align?: 'start' | 'end' }) {
  const look = tone === 'family' ? 'border-fam-border bg-fam-tile text-fam-muted' : 'border-border-strong bg-surface-subtle text-brand-inkMuted';
  return (
    <span className={`inline-flex max-w-[260px] flex-col gap-1 ${align === 'end' ? 'items-start md:items-end md:text-right' : 'items-start'}`}>
      <button type="button" disabled aria-describedby={`${id}-reason`} data-testid={id} className={`inline-flex cursor-not-allowed items-center gap-2 rounded-control border border-dashed font-medium ${SIZES[size]} ${look}`}>
        <Lock size={14} aria-hidden="true" />
        {label}
      </button>
      <span id={`${id}-reason`} className={`text-[12px] leading-snug ${tone === 'family' ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>{reason}</span>
    </span>
  );
}

const PILLS = {
  neutral: 'bg-surface-subtle text-brand-inkMuted',
  info: 'bg-status-infoSurface text-status-info',
  success: 'bg-status-successSurface text-status-success',
  caution: 'bg-status-cautionSurface text-status-caution',
  danger: 'bg-status-dangerSurface text-status-danger',
  brand: 'bg-[#F1EBF8] text-brand-violet',
  family: 'bg-fam-accentTint text-fam-accent',
};
export function Pill({ tone = 'neutral', icon: Icon, children, testId }: { tone?: keyof typeof PILLS; icon?: LucideIcon; children: ReactNode; testId?: string }) {
  return (
    <span data-testid={testId} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${PILLS[tone]}`}>
      {Icon && <Icon size={13} strokeWidth={2.25} aria-hidden="true" />}
      {children}
    </span>
  );
}

export const SPECIALTIES: Record<SpecialtyKey, { label: string; long: string; cls: string }> = {
  speech: { label: 'Speech', long: 'Speech therapy', cls: 'bg-specialty-speechTint text-specialty-speech' },
  ot: { label: 'OT', long: 'Occupational therapy', cls: 'bg-specialty-otTint text-specialty-ot' },
  physio: { label: 'Physio', long: 'Physiotherapy', cls: 'bg-specialty-physioTint text-specialty-physio' },
  aba: { label: 'ABA', long: 'Applied behavior analysis', cls: 'bg-specialty-abaTint text-specialty-aba' },
  group: { label: 'Group', long: 'Group therapy', cls: 'bg-specialty-groupTint text-specialty-group' },
};
export function SpecialtyTag({ s, long = false }: { s: SpecialtyKey; long?: boolean }) {
  const meta = SPECIALTIES[s];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${meta.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {long ? meta.long : meta.label}
    </span>
  );
}

export function Card({ children, className = '', tone = 'clinical', testId }: { children: ReactNode; className?: string; tone?: Tone; testId?: string }) {
  const look = tone === 'family' ? 'border-fam-border bg-fam-surface' : 'border-border-light bg-surface-white';
  return <section data-testid={testId} className={`min-w-0 rounded-card border ${look} ${className}`}>{children}</section>;
}

export function CardHeader({ title, subtitle, action, tone = 'clinical' }: { title: string; subtitle?: ReactNode; action?: ReactNode; tone?: Tone }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className={`font-display text-[17px] font-semibold leading-snug md:text-[18px] ${tone === 'family' ? 'text-fam-ink' : ''}`}>{title}</h2>
        {subtitle && <p className={`mt-0.5 text-[13px] ${tone === 'family' ? 'text-fam-muted' : 'text-brand-inkMuted'}`}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const AVATARS = ['bg-[#E8F0F8] text-[#0F5692]', 'bg-[#DFF3F5] text-[#0B6E7A]', 'bg-[#ECEDF8] text-[#4A4E9C]', 'bg-[#F6EEE5] text-[#7A4A1F]', 'bg-[#E8F1E6] text-[#3E5F3A]'];
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const cls = AVATARS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATARS.length];
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full font-semibold ${cls}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>
      {initials}
    </span>
  );
}

export function Meter({ label, value, max, hint, state = 'ok', testId }: { label: string; value: number; max: number; hint?: string; state?: 'ok' | 'warn' | 'limit' | 'planned'; testId?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const bar = { ok: 'bg-brand-action', warn: 'bg-status-caution', limit: 'bg-status-danger', planned: 'bg-border-strong' }[state];
  return (
    <div data-testid={testId}>
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="tnum font-semibold">{value} / {max}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-subtle" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className={`h-full rounded-full transition-[width] duration-500 ${bar} ${state === 'planned' ? 'opacity-60' : ''}`} style={{ width: `${pct}%` }} />
      </div>
      {hint && <p className="mt-1 text-[12px] text-brand-inkMuted">{hint}</p>}
    </div>
  );
}

export function Metric({ label, value, sub, icon: Icon, accent = 'action', loading = false, testId }: { label: string; value: string | number; sub: string; icon: LucideIcon; accent?: 'action' | 'caution' | 'danger' | 'success'; loading?: boolean; testId?: string }) {
  const ic = { action: 'bg-brand-actionTint text-brand-action', caution: 'bg-status-cautionSurface text-status-caution', danger: 'bg-status-dangerSurface text-status-danger', success: 'bg-status-successSurface text-status-success' }[accent];
  return (
    <Card className="p-4 transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-[0_6px_20px_-12px_rgba(20,33,61,0.25)] md:p-5" testId={testId}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-brand-inkMuted">{label}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-[10px] ${ic}`}>
          <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
        </span>
      </div>
      {loading ? (
        <div aria-busy="true" aria-label={`Loading ${label}`} data-testid={testId ? `${testId}-loading` : undefined}>
          <span className="mt-2 block h-[34px] w-14 animate-pulse rounded-control bg-surface-subtle" />
          <span className="mt-2 block h-3 w-3/4 animate-pulse rounded bg-surface-subtle" />
        </div>
      ) : (
        <>
          <p className="tnum mt-2 text-[30px] font-semibold leading-none tracking-tight md:text-[34px]" data-testid={testId ? `${testId}-value` : undefined}>{value}</p>
          <p className="mt-2 text-[12px] text-brand-inkMuted">{sub}</p>
        </>
      )}
    </Card>
  );
}
