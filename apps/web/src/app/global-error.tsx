'use client';

import Link from 'next/link';

/** Root fallback must supply html/body because the root layout can fail. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAF8F5] font-sans text-[#25354A]">
        <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-10">
          <section role="alert" className="w-full rounded-xl border border-[#DEE5EB] bg-white p-8">
            <h1 className="text-2xl font-bold">TheraBridge is temporarily unavailable</h1>
            <p className="mt-3 text-sm">Please retry. Unsaved changes may need to be entered again.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={reset} className="rounded-lg bg-[#0F5692] px-5 py-3 font-semibold text-white">Try again</button>
              <Link href="/app" className="rounded-lg border border-[#DEE5EB] px-5 py-3 font-semibold text-[#0F5692]">Return to dashboard</Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
