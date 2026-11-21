import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildIaCrosswalk } from './m5-ia-crosswalk.mjs';
import { buildAudit, parseNav } from '../qa/m5-route-audit.mjs';

const shellFile = 'apps/web/src/components/auth/ProductShell.tsx';
const groupsFile = 'apps/web/src/components/auth/nav-areas.ts';
const load = async () => {
  const [shell, source] = await Promise.all([readFile(shellFile,'utf8'),readFile(groupsFile,'utf8')]);
  const nav = parseNav(shell);
  const match = source.match(/export const SHELL_AREA_BY_NAV_ID:[\s\S]*?Object\.freeze\(\{([\s\S]*?)\}\);/);
  if (!match) throw new Error('M5 group map missing; manual review required');
  const rows = [...match[1].matchAll(/'([^']+)': '([^']+)'/g)].map(m=>({identity:m[1],area:m[2]}));
  if (rows.length !== (match[1].match(/:/g)??[]).length)
    throw new Error('Unexpected nonliteral M5 group mapping');
  return { nav, shell, source, rows };
};

test('M5-03 grouped app nav is exact current permission-specific 20-entry M5-02 eight-area crosswalk', async () => {
  const {nav,source,rows}=await load();
  const proposal=await buildIaCrosswalk({sourceAudit:await buildAudit()});
  assert.equal(nav.length,20);
  assert.equal(rows.length,20);
  assert.equal(new Set(rows.map(x=>x.identity)).size,20);
  assert.equal(proposal.navigation.length,20);
  const expected = new Map(proposal.navigation.map(n=>[n.key+'|'+(n.permission??''),n.proposedArea]));
  assert.deepEqual([...rows].sort((a,b)=>a.identity.localeCompare(b.identity)),
    [...expected].map(([identity,area])=>({identity,area})).sort((a,b)=>a.identity.localeCompare(b.identity)));
  const expectedAreaNames = ['workspace','care','sessions','family','operations','scheduling','governance','account'];
  assert.deepEqual([...new Set(rows.map(x=>x.area))].sort(), expectedAreaNames.sort());
  assert.match(source,/if \(!item\.permission \|\| allowed\.has\(item\.permission\)\)/);
  assert.match(source,/Stale M5-03 group definition/);
  assert.match(source,/Duplicate M5-03 source navigation identity/);
  assert.match(source,/Unmapped M5-03 navigation destination/);
});

test('family and center activity links remain permission distinct and responsive shell never widens grants', async () => {
  const {rows,shell,source}=await load();
  assert.equal(rows.find(x=>x.identity==='activities|center.activities.read')?.area,'sessions');
  assert.equal(rows.find(x=>x.identity==='activities|family.activities.read')?.area,'family');
  assert.match(shell,/groupAuthorizedNav\(NAV, session\.permissions\)/);
  assert.match(shell,/mobileQuick = quickMobileNav\(groups\)/);
  assert.match(shell,/mobile-more-panel/);
  assert.match(shell,/aria-modal="true"/);
  assert.match(shell,/handleMoreKeyDown/);
  assert.match(shell,/window\.matchMedia\('\(min-width: 768px\)'\)/);
  assert.match(shell,/desktop\.addEventListener\('change', closeOnDesktop\)/);
  assert.match(shell,/document\.body\.style\.overflow = 'hidden'/);
  assert.match(shell,/document\.documentElement\.style\.overflow = 'hidden'/);
  assert.match(shell,/document\.body\.style\.overflow = bodyOverflow/);
  assert.match(shell,/overscroll-y-contain/);
  assert.match(shell,/sidebar-collapse-toggle/);
  assert.match(shell,/collapsed-workspace-switcher/);
  assert.match(shell,/desktop-destination-search/);
  assert.match(shell,/mobile-destination-search/);
  assert.match(shell,/visibleGroups = searchTerm \? groups\.map/);
  assert.match(shell,/setNavQuery\(''\)/);
  assert.match(shell,/shell-breadcrumb/);
  assert.match(source,/return candidates\.slice\(0, 3\)/);
  assert(!shell.includes('sessionStorage') && !shell.includes('localStorage'),
    'Do not persist navigation context across role changes');
});

test('source verifier refuses drift in original 20-entry permission audit contract', async () => {
  const {nav,rows}=await load();
  const fromNav=new Set(nav.map(n=>n.key+'|'+(n.permission??'')));
  const fromGroups=new Set(rows.map(x=>x.identity));
  assert.deepEqual([...fromNav].sort(),[...fromGroups].sort());
  assert(nav.every(n=>n.href.startsWith('/') && !n.href.includes('//')));
});
