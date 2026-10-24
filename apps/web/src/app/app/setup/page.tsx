'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { FormAlert } from '@/components/auth/Field';
import { PageTitle, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { Button, Card, Meter, btn } from '@/components/design/ui';
import { ErrorState, SkeletonRows } from '@/components/design/states';
import { formatDate } from '@/components/applications/StatusPill';
import type { SessionInfo } from '@/lib/auth';
import { SETUP_LABELS, centersApi } from '@/lib/centers';

const ROLE_SUMMARY = [
  { role: 'Center administrator', can: 'Center details, setup, inviting and managing the team.' },
  { role: 'Coordinator', can: 'Schedules appointments, manages calendars, and sees staff and child administrative information, not clinical drafts.' },
  { role: 'Therapist', can: 'Assigned children, specialty-scoped clinical drafts, progress and reports. Signing and release remain locked.' },
  { role: 'Clinical supervisor', can: 'Authorized clinical review and read-only oversight; signing, approval and release remain locked.' },
];

function Setup({ centerId, onError }: { centerId: string; onError: (e: unknown) => void }) {
  const fetcher = useCallback(() => centersApi.setup(centerId), [centerId]);
  const { data, setData, failed, reload } = useLoad(fetcher, onError);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (failed) return <ErrorState onRetry={() => void reload()} testId="setup-error" />;
  if (!data) return <Card className="p-5"><SkeletonRows rows={4} testId="setup-loading" /></Card>;
  async function complete(key: string) {
    setBusy(true);
    setMsg(null);
    try {
      setData(await centersApi.completeStep(centerId, key));
    } catch (e) {
      setMsg(errorText(e, onError));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <PageTitle eyebrow="First administrator onboarding" title="Set up your center" body="Four short steps. Your progress is saved, so you can come back at any time." testId="setup-title" />
      <Card className="p-5 md:p-6" testId="setup-progress"><Meter label="Setup progress" value={data.done} max={data.total} hint={data.done === data.total ? 'All done. Your center is ready for its team.' : `${data.activeMembers} active members · ${data.invitationsSent} invitations sent`} state={data.done === data.total ? 'ok' : 'warn'} testId="setup-meter" /></Card>
      {msg && <FormAlert tone="danger" testId="setup-action-error">{msg}</FormAlert>}
      <ol className="space-y-3">
        {data.steps.map((s, i) => {
          const meta = SETUP_LABELS[s.key];
          return (
            <li key={s.key}>
              <Card className={`p-5 transition-[border-color] ${s.completedAt ? '' : 'border-border-strong'}`} testId={`setup-step-${s.key}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    {s.completedAt ? <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-status-success" aria-hidden="true" /> : <Circle size={22} className="mt-0.5 shrink-0 text-brand-inkMuted" aria-hidden="true" />}
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-brand-inkMuted">Step {i + 1}</p>
                      <h2 className="text-[16px] font-semibold">{meta.title}</h2>
                      <p className="mt-0.5 text-[14px] text-brand-inkMuted">{meta.body}</p>
                      {s.completedAt && <p className="tnum mt-1 text-[13px] text-status-success" data-testid={`setup-step-${s.key}-done`}>Completed {formatDate(s.completedAt)}{s.completedBy ? ` by ${s.completedBy}` : ''}</p>}
                    </div>
                  </div>
                  {!s.completedAt && (meta.href
                    ? <Link href={meta.href} className={`${btn('secondary')} shrink-0`} data-testid={`setup-step-${s.key}-link`}>{meta.cta}</Link>
                    : <Button className="shrink-0" disabled={busy} onClick={() => void complete(s.key)} data-testid={`setup-step-${s.key}-complete`}>{meta.cta}</Button>)}
                </div>
                {s.key === 'review_permissions' && (
                  <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="role-summary">
                    {ROLE_SUMMARY.map((r) => <li key={r.role} className="rounded-control bg-surface-subtle p-3 text-[13px]"><span className="block font-semibold">{r.role}</span>{r.can}</li>)}
                    <li className="flex items-start gap-2 rounded-control border border-dashed border-border-strong p-3 text-[13px] sm:col-span-2"><Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />Clinical sign-off, plan approval and report release are locked for every role until an owner-approved clinical policy exists.</li>
                  </ul>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const centerOf = (s: SessionInfo) => (s.activeContext?.type === 'center' ? s.activeContext.centerId : '');

export default function SetupPage() {
  return <Workspace active="setup" permission="center.setup.manage" deniedText="Center setup is available to center administrators.">{(s, onError) => <Setup centerId={centerOf(s)} onError={onError} />}</Workspace>;
}
