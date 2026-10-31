'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/** Segment-level recovery; avoid logging patient details into the visible UI. */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // A generic message is sufficient for synthetic demo error telemetry.
    if (process.env.NODE_ENV === 'development') console.error('App route rendering error', error);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-5 py-10">
      <section role="alert" className="w-full rounded-card border border-border-light bg-surface-white p-8 shadow-sm">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-status-caution">Unable to display this page</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-brand-ink">Something went wrong</h1>
        <p className="mt-3 text-sm text-brand-inkMuted">Your work may not have been saved. Please retry or return to your dashboard.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="rounded-control bg-brand-action px-5 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-action">Try again</button>
          <Link href="/app" className="rounded-control border border-border-light px-5 py-3 font-semibold text-brand-action">Return to dashboard</Link>
        </div>
      </section>
    </main>
  );
}
