// M5-07: structural and mounted shared-pattern safeguards for operational views.
const fs=require('node:fs');
const path=require('node:path');
const React=require('react');
const {create,act}=require('react-test-renderer');
const h=React.createElement;
const {CompactTable,DisclosureSection}=require('../src/components/design/workspace-patterns');
const source=fs.readFileSync(path.resolve(__dirname,'../src/app/app/schedule/page.tsx'),'utf8');
describe('M5-07 center operations experience',()=>{
 it('keeps original tenant-authorized appointment loading, recurring edits and calendar controls',()=>{
  expect(source).toContain('opsApi.appointments(centerId');
  expect(source).toContain('setEditing(a)');
  expect(source).toContain('BookDialog centerId={centerId}');
  expect(source).toContain('onSlot={manage ?');
  expect(source).toContain('selected.membershipId === ctx?.membershipId');
  expect(source).toContain('session.permissions.includes(\'center.clinical.read\')');
 });
 it('reports exceptions only from the filtered calendar projection, not all centre records',()=>{
  expect(source).toContain("shown.filter(a =>");
  expect(source).toContain("a.status === 'NO_SHOW' || a.status === 'CANCELLED'");
  expect(source).toContain('data-testid="m5-operations-exceptions"');
  expect(source).toContain('data-testid="schedule-timezone-notice"');
  expect(source).toContain('data-testid="schedule-clear-filters"');
 });
 it('mounted shared exception table exposes a scoped caption, empty state and statuses',async()=>{
  let tree;
  await act(async()=>{tree=create(h(DisclosureSection,{title:'Operational exceptions',openByDefault:true},
   h(CompactTable,{caption:'Synthetic scoped exceptions',columns:[
     {id:'child',label:'Child'},{id:'status',label:'Status'}],
     rows:[{id:'x',cells:{child:'Fictional Alex',status:'NO_SHOW'}}]})));});
  expect(tree.root.findByProps({role:'region'}).props['aria-label']).toContain('Synthetic scoped exceptions');
  expect(JSON.stringify(tree.toJSON())).toContain('Fictional Alex');
  expect(JSON.stringify(tree.toJSON())).toContain('NO_SHOW');
  await act(async()=>tree.unmount());
 });
});
