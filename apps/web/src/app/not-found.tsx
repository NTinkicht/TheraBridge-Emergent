import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-5 py-10">
      <section role="alert" className="w-full rounded-card border border-border-light bg-surface-white p-8 shadow-sm">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-status-caution">404 · Not found</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-brand-ink">Page not found</h1>
        <p className="mt-3 text-sm text-brand-inkMuted">This page is unavailable or you may not have access to it.</p>
        <Link href="/app" className="mt-6 inline-flex rounded-control bg-brand-action px-5 py-3 font-semibold text-white">Return to dashboard</Link>
      </section>
    </main>
  );
}
