'use client';

import { useEffect, useState } from 'react';
import { Workspace } from '@/components/centers/kit';
import { Messages } from '@/components/messages/Messages';
import type { SessionInfo } from '@/lib/auth';
import { opsApi } from '@/lib/operations';

function Page({ session, onError }: { session: SessionInfo; onError: (e: unknown) => void }) {
  const centerId = session.activeContext?.type === 'center' ? session.activeContext.centerId : '';
  const family = session.activeContext?.role === 'GUARDIAN';
  const [kids, setKids] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    const load = family
      ? opsApi.family(centerId).then((r) => r.children.map((c) => ({ id: c.id, name: c.fullName })))
      : opsApi.children(centerId, {}).then((r) => r.items.map((c) => ({ id: c.id, name: `${c.preferredName ?? c.firstName} ${c.lastName}` })));
    load.then(setKids).catch(() => setKids([]));
  }, [centerId, family]);
  return <Messages centerId={centerId} family={family} kids={kids} onError={onError} />;
}

export default function MessagesPage() {
  return <Workspace active="messages" permission="center.messages.use" deniedText="Messages are available to center staff working with families and to connected guardians.">{(s, onError) => <Page session={s} onError={onError} />}</Workspace>;
}
