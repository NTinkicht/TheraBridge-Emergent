import { StatusPill, type WorkStatus } from '@/components/ui/StatusPill';

const UNITS: { id: string; name: string; status: WorkStatus }[] = [
  { id: 'TB-EM-000', name: 'Feasibility and portability gate', status: 'IMPLEMENTED' },
  { id: 'TB-EM-000-api-tests', name: 'API integration tests against real PostgreSQL', status: 'TESTED: PASS' },
  { id: 'TB-EM-000-compose', name: 'Docker Compose (web, api, postgres)', status: 'NOT RUN' },
  { id: 'TB-EM-000-ci', name: 'GitHub Actions CI workflow', status: 'NOT RUN' },
  { id: 'TB-EM-001', name: 'Authentication and sessions', status: 'PLANNED' },
  { id: 'TB-EM-002', name: 'Public center application', status: 'PLANNED' },
  { id: 'TB-EM-003', name: 'Platform review and provisioning', status: 'PLANNED' },
  { id: 'TB-EM-004', name: 'Invitations, outbox and center onboarding', status: 'PLANNED' },
  { id: 'TB-EM-005', name: 'Trial limits and expiry', status: 'PLANNED' },
  { id: 'TB-EM-006', name: 'Responsive and accessibility pass, handover', status: 'PLANNED' },
];

export function WorkUnits() {
  return (
    <section className="rounded-card border border-border-light bg-surface-white p-5 md:p-6" data-testid="work-units-card">
      <h2 className="text-[20px] font-semibold">Work-unit status</h2>
      <p className="mt-1 text-[14px] text-brand-inkMuted">Labels follow the owner vocabulary. Nothing outside TB-EM-000 is built.</p>
      <ul className="mt-3 divide-y divide-border-light">
        {UNITS.map((u) => (
          <li key={u.id} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid={`work-unit-${u.id}`}>
            <span className="text-[15px]">
              <span className="font-mono text-[13px] font-semibold text-brand-action">{u.id}</span>
              <span className="ml-2">{u.name}</span>
            </span>
            <StatusPill status={u.status} testId={`work-unit-${u.id}-status`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
