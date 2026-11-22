/**
 * Eight M5-02 task areas, grouped only AFTER current-session permission filtering.
 * This is presentation, not authorization: API/route guards remain authoritative.
 */
export type ShellNavItem = {
  key: string;
  href: string;
  label: string;
  short: string;
  permission?: string;
};
export type ShellAreaId = 'workspace' | 'care' | 'sessions' | 'family' |
  'operations' | 'scheduling' | 'governance' | 'account';

export const SHELL_AREAS: ReadonlyArray<{ key: ShellAreaId; label: string }> = [
  { key: 'workspace', label: 'Today & workspace' },
  { key: 'care', label: 'Children & care' },
  { key: 'sessions', label: 'Sessions & activities' },
  { key: 'family', label: 'Family & home' },
  { key: 'operations', label: 'Center operations' },
  { key: 'scheduling', label: 'Scheduling & messages' },
  { key: 'governance', label: 'Safety & governance' },
  { key: 'account', label: 'Account & access' },
];

export const SHELL_AREA_BY_NAV_ID: Readonly<Record<string, ShellAreaId>> = Object.freeze({
  'home|': 'workspace',
  'applications|platform.applications.read': 'operations',
  'centers|platform.centers.read': 'operations',
  'setup|center.setup.manage': 'operations',
  'children|center.children.read': 'care',
  'schedule|center.schedule.read': 'scheduling',
  'messages|center.messages.use': 'scheduling',
  'clinical|center.clinical.read': 'sessions',
  'governance|center.clinical.read': 'governance',
  'access-review|center.governance.read': 'governance',
  'progress|center.clinical.read': 'care',
  'practice-feedback|center.practice.read': 'sessions',
  'activities|center.activities.read': 'sessions',
  'activities|family.activities.read': 'family',
  'practice|family.practice.read': 'family',
  'family-progress|family.progress.demo': 'family',
  'family-documents|family.progress.demo': 'family',
  'team|center.staff.read': 'operations',
  'center|center.settings.read': 'operations',
  'profile|center.profile.self': 'account',
  'security|': 'account',
});

export function navId(item: ShellNavItem): string {
  return item.key + '|' + (item.permission ?? '');
}

export function groupAuthorizedNav<T extends ShellNavItem>(
  source: readonly T[], permissions: readonly string[],
): Array<{ key: ShellAreaId; label: string; items: T[] }> {
  const allowed = new Set(permissions);
  const groups = new Map(SHELL_AREAS.map(area => [area.key, [] as T[]]));
  const seen = new Set<string>();
  for (const item of source) {
    const id = navId(item);
    if (seen.has(id)) throw new Error('Duplicate M5-03 source navigation identity: ' + id);
    seen.add(id);
    const area = SHELL_AREA_BY_NAV_ID[id];
    if (!area) throw new Error('Unmapped M5-03 navigation destination: ' + id);
    if (!item.permission || allowed.has(item.permission)) groups.get(area)?.push(item);
  }
  if (Object.keys(SHELL_AREA_BY_NAV_ID).length !== seen.size) {
    throw new Error('Stale M5-03 group definition: review permission-specific NAV changes');
  }
  return SHELL_AREAS.map(area => ({ ...area, items: groups.get(area.key) ?? [] }))
    .filter(area => area.items.length > 0);
}

/** Maximum three direct mobile destinations; More always retains every allowed item. */
export function quickMobileNav<T extends ShellNavItem>(authorizedGroups:
  ReadonlyArray<{ items: readonly T[] }>): T[] {
  const items = authorizedGroups.flatMap(group => group.items);
  const order = ['home', 'practice', 'clinical', 'schedule', 'children',
    'applications', 'setup', 'messages', 'activities', 'governance', 'family-progress'];
  const candidates = [...items].sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  return candidates.slice(0, 3);
}
