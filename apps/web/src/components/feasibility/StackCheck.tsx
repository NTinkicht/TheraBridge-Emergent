import { Database, GitBranch, Layers, Server } from 'lucide-react';
import type { HealthResponse } from '@/lib/api';

type Row = { key: string; name: string; detail: string; ok: boolean | null; Icon: typeof Server };

function rows(nextVersion: string, health: HealthResponse | null, failed: boolean): Row[] {
  const pending = failed ? false : null;
  return [
    { key: 'next', name: 'Next.js App Router', detail: `next ${nextVersion} rendered this page`, ok: true, Icon: Layers },
    { key: 'nest', name: 'NestJS on Fastify', detail: health ? `${health.framework} · /api/health` : 'GET /api/health', ok: health ? true : pending, Icon: Server },
    { key: 'pg', name: 'PostgreSQL', detail: health ? `v${health.database.version} · ${health.database.latencyMs} ms` : 'SHOW server_version', ok: health ? health.database.status === 'up' : pending, Icon: Database },
    { key: 'prisma', name: 'Prisma migrations', detail: health ? `${health.migrations.applied} applied · ${health.migrations.latest ?? 'none'}` : '_prisma_migrations', ok: health ? health.migrations.applied > 0 : pending, Icon: GitBranch },
  ];
}

export function StackCheck({ nextVersion, health, failed }: { nextVersion: string; health: HealthResponse | null; failed: boolean }) {
  return (
    <ul className="divide-y divide-border-light">
      {rows(nextVersion, health, failed).map(({ key, name, detail, ok, Icon }) => (
        <li key={key} className="flex min-w-0 items-center gap-3 py-3.5" data-testid={`stack-row-${key}`}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-control bg-surface-subtle text-brand-action">
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">{name}</span>
            <span className="block truncate text-[13px] text-brand-inkMuted">{detail}</span>
          </span>
          <span
            className={`text-[13px] font-semibold ${ok === null ? 'text-brand-inkMuted' : ok ? 'text-status-success' : 'text-status-danger'}`}
            data-testid={`stack-row-${key}-state`}
          >
            {ok === null ? 'Checking…' : ok ? 'Responding' : 'Not responding'}
          </span>
        </li>
      ))}
    </ul>
  );
}
