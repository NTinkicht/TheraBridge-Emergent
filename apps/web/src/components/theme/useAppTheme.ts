'use client';

import { useSyncExternalStore } from 'react';

export type AppTheme = 'light' | 'dark';

const subscribers = new Set<() => void>();
const isTheme = (value: unknown): value is AppTheme => value === 'light' || value === 'dark';

// Visual-only preference. It never changes role, tenant, access or consent.
export function currentAppTheme(): AppTheme {
  if (typeof document === 'undefined') return 'light';
  const dataset = document.documentElement?.dataset;
  return dataset?.appTheme === 'dark' ||
    (dataset?.appTheme !== 'light' && dataset?.familyTheme === 'dark') ? 'dark' : 'light';
}

function syncDocument(theme: AppTheme): void {
  if (typeof document === 'undefined') return;
  const dataset = document.documentElement?.dataset;
  if (!dataset) return;
  dataset.appTheme = theme;
  dataset.familyTheme = theme;
}

function notifySubscribers(): void {
  for (const subscriber of subscribers) subscriber();
}

/** React's shared external store keeps multiple shell/theme consumers coherent.
 * The storage event also reconciles changes from another browser tab.
 */
export function subscribeAppTheme(subscriber: () => void): () => void {
  subscribers.add(subscriber);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== 'tb-app-theme' && event.key !== 'tb-family-theme') return;
    try {
      // A modern preference wins over the legacy family-only key.
      const preferred = localStorage.getItem('tb-app-theme') ?? localStorage.getItem('tb-family-theme');
      if (isTheme(preferred)) syncDocument(preferred);
    } catch {
      if (isTheme(event.newValue)) syncDocument(event.newValue);
    }
    notifySubscribers();
  };
  if (typeof window !== 'undefined') window.addEventListener?.('storage', onStorage);
  return () => {
    subscribers.delete(subscriber);
    if (typeof window !== 'undefined') window.removeEventListener?.('storage', onStorage);
  };
}

export function applyAppTheme(theme: AppTheme): void {
  if (!isTheme(theme) || typeof document === 'undefined') return;
  syncDocument(theme);
  try {
    localStorage.setItem('tb-app-theme', theme);
    // Preserve the previous design-preview preference during migration.
    localStorage.setItem('tb-family-theme', theme);
  } catch {
    // Preference remains effective in this tab even if storage is blocked.
  }
  notifySubscribers();
}

export function useAppTheme() {
  const theme = useSyncExternalStore(subscribeAppTheme, currentAppTheme, () => 'light');
  const toggleTheme = () => applyAppTheme(theme === 'dark' ? 'light' : 'dark');
  return { theme, toggleTheme };
}
