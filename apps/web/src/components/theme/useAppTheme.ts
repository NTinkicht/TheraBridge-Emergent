'use client';

import { useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark';

// Visual preference only; never changes role, tenant, clinical or consent state.
export function currentAppTheme(): AppTheme {
  if (typeof document === 'undefined') return 'light';
  const root = document.documentElement?.dataset;
  if (!root) return 'light';
  return root.appTheme === 'dark' || (root.appTheme !== 'light' && root.familyTheme === 'dark')
    ? 'dark' : 'light';
}

export function applyAppTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') return;
  // A single source of truth drives both staff semantic tokens and the
  // existing family palette, including every shared navigation surface.
  const root = document.documentElement?.dataset;
  if (root) {
    root.appTheme = theme;
    root.familyTheme = theme;
  }
  try {
    localStorage.setItem('tb-app-theme', theme);
    // Older design-preview users keep their stored preference on migration.
    localStorage.setItem('tb-family-theme', theme);
  } catch {
    // Theme can still be changed within this page when storage is disabled.
  }
}

export function useAppTheme() {
  const [theme, setTheme] = useState<AppTheme>('light');
  useEffect(() => { setTheme(currentAppTheme()); }, []);
  const toggleTheme = () => {
    const next: AppTheme = theme === 'dark' ? 'light' : 'dark';
    applyAppTheme(next);
    setTheme(next);
  };
  return { theme, toggleTheme };
}
