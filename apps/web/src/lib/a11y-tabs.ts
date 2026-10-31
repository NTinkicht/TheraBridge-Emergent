'use client';

import type { KeyboardEvent } from 'react';

/** Keyboard navigation for an existing WAI-ARIA tablist.
 * Dispatch through the tab's own click handler so unsaved-change guards and
 * other application state transitions stay authoritative.
 */
export function navigateTabs(event: KeyboardEvent<HTMLElement>) {
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'));
  const current = tabs.indexOf(event.target as HTMLButtonElement);
  if (current < 0 || !tabs.length) return;
  const next = event.key === 'ArrowRight' ? (current + 1) % tabs.length
    : event.key === 'ArrowLeft' ? (current - 1 + tabs.length) % tabs.length
    : event.key === 'Home' ? 0
    : event.key === 'End' ? tabs.length - 1 : -1;
  if (next < 0) return;
  event.preventDefault();
  tabs[next].focus();
  tabs[next].click();
}
