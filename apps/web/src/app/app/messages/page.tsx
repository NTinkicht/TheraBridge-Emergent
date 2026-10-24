'use client';
// Global family messaging is disabled pending safeguarding and privacy policy.
// This informational screen never invokes the disabled thread API.
import { MessagesSquareOff } from 'lucide-react';
import { Workspace } from '@/components/centers/kit';
import { Card } from '@/components/design/ui';

export default function MessagesPage() {
  return <Workspace active="messages" permission="center.messages.use"
    deniedText="This workspace is not authorized to access messages.">
    {() => <Card className="max-w-2xl space-y-3 p-6" testId="messages-demo-disabled">
      <MessagesSquareOff size={25} className="text-brand-inkMuted" aria-hidden="true" />
      <h1 className="text-[22px] font-bold">Family messaging is unavailable in this demo</h1>
      <p className="text-[14px] text-brand-inkMuted">Conversations remain switched off while participant privacy and safeguarding policies await approval. No messages can be viewed or sent here.</p>
      <p className="text-[13px] text-brand-inkMuted">Other authorized workspace features remain available; a centre administrator cannot enable messaging from this screen.</p>
    </Card>}
  </Workspace>;
}
