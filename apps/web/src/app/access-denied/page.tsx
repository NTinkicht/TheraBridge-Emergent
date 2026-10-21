import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function AccessDeniedPage() {
  return (
    <AuthLayout title="You don’t have access to that" subtitle="Your current workspace and role don’t include this area. Nothing was shown or changed." testId="access-denied-page">
      <div className="flex items-start gap-3 rounded-card border border-border-light bg-surface-white p-4">
        <ShieldAlert size={20} className="mt-0.5 shrink-0 text-status-caution" aria-hidden="true" />
        <p className="text-[14px] text-brand-inkMuted">If you think you should have access, ask your center administrator. Switching workspace may also help.</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/app" className="inline-flex min-h-[44px] items-center rounded-control bg-brand-action px-4 text-[14px] font-semibold text-white hover:bg-brand-actionHover" data-testid="access-denied-home">Go to home</Link>
        <Link href="/select-context" className="inline-flex min-h-[44px] items-center rounded-control border border-border-strong bg-surface-white px-4 text-[14px] font-medium hover:bg-surface-subtle" data-testid="access-denied-switch">Switch workspace</Link>
      </div>
    </AuthLayout>
  );
}
