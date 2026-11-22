'use client';

import Link from 'next/link';

/** Only navigates within the caller's already-authorized child workspace. */
export function GoalVersionLink({ childId, versionId, goalKey, historical, onNavigate, testId }: {
  childId: string; versionId: string; goalKey: string; historical: boolean;
  onNavigate: () => boolean | void; testId: string;
}) {
  const href = `/app/clinical/${encodeURIComponent(childId)}#plan?version=${encodeURIComponent(versionId)}&goal=${encodeURIComponent(goalKey)}`;
  return <Link href={href} data-testid={testId}
    className="inline-flex min-h-[44px] items-center text-[13px] font-semibold text-brand-action underline focus-visible:outline-2 focus-visible:outline-brand-action"
    onClick={event => {
      // Modified clicks/open in new tab remain browser navigation with their own
      // server-side authorization; never hijack them or bypass navigation guards.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      const target = event.currentTarget.getAttribute('href');
      if (!target) return;
      // A pending session draft may reject tab navigation. Do not change the
      // address if the user refused to discard pending text.
      if (onNavigate() === false) return;
      window.history.pushState(null, '', target);
    }}>
    {historical ? 'Inspect original historical goal and target (read-only)' : 'Open exact plan goal and edit draft target'}
  </Link>;
}
