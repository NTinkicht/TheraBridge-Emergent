'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { FileClock, LockKeyhole } from 'lucide-react';
import { PageTitle, ReasonField, Workspace, errorText, useLoad } from '@/components/centers/kit';
import { Button, Card, Pill } from '@/components/design/ui';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/design/states';
import { governanceApi, type DocumentItem, type Snapshot } from '@/lib/governance';
import type { SessionInfo } from '@/lib/auth';

function FrozenValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-brand-inkMuted">Not recorded</span>;
  if (Array.isArray(value)) return value.length ? <ul className="space-y-3">{value.map((item, i) => <li key={i} className="border-l-2 border-border-light pl-3"><FrozenValue value={item} /></li>)}</ul> : <span className="text-brand-inkMuted">None recorded</span>;
  if (typeof value === 'object') return <dl className="space-y-2">{Object.entries(value).map(([key, item]) => <div key={key}><dt className="text-[12px] font-semibold capitalize text-brand-inkMuted">{key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')}</dt><dd className="whitespace-pre-wrap break-words"><FrozenValue value={item} /></dd></div>)}</dl>;
  return <span>{String(value)}</span>;
}

function FrozenPreview({ snapshot: s }: { snapshot: Snapshot }) {
  return <Card className="space-y-4 p-5 print:border-0" testId="immutable-preview">
    <p className="rounded-control bg-status-cautionSurface p-3 font-semibold">{s.notice}</p>
    <h2 className="text-[20px] font-semibold">Frozen {s.kind.toLowerCase()} preview</h2>
    <dl className="grid gap-2 break-words text-[13px] sm:grid-cols-2">
      <div><dt>Document / revision</dt><dd>{s.documentId} / {s.sourceVersion}</dd></div><div><dt>Generated</dt><dd>{new Date(s.createdAt).toLocaleString()}</dd></div>
      <div><dt>Child / center</dt><dd>{s.childId} / {s.centerId}</dd></div><div><dt>Author / captured by</dt><dd>{s.authorId} / {s.generatedById}</dd></div>
      <div className="sm:col-span-2"><dt>SHA-256 fingerprint</dt><dd className="break-all font-mono" data-testid="preview-fingerprint">{s.fingerprint}</dd></div>
    </dl>
    <h3 className="font-semibold">Exact frozen content</h3><div className="rounded-control bg-surface-subtle p-3 text-[14px]"><FrozenValue value={s.content} /></div>
    <details><summary className="cursor-pointer font-semibold">Evidence captured with this version</summary><div className="mt-3 text-[13px]"><FrozenValue value={s.evidence} /></div></details>
    <Button variant="secondary" onClick={() => window.print()} className="print:hidden">Print internal preview</Button>
  </Card>;
}
function DocumentReview({ c, d, supervisor, reload, onError }: {c:string; d:DocumentItem; supervisor:boolean; reload:()=>Promise<void>; onError:(e:unknown)=>void}) {
  const fetcher = useCallback(()=>governanceApi.history(c,d),[c,d]);
  const {data,failed,reload:reloadHistory}=useLoad(fetcher,onError);
  const [reason,setReason]=useState(''); const [busy,setBusy]=useState(false); const [err,setErr]=useState(''); const [preview,setPreview]=useState<Snapshot|null>(null);
  const action=async(a:string)=>{setBusy(true);setErr('');try{await governanceApi.transition(c,d,a,reason);setReason('');await reload();await reloadHistory();}catch(e){setErr(errorText(e,onError)||'The action could not be completed. Reload to check the current state.');}finally{setBusy(false);}};
  const actions=supervisor?(d.status==='IN_REVIEW'?['COMMENT','RETURN']:[]):d.mine?(d.status==='IN_REVIEW'?['WITHDRAW']:['DRAFT','RETURNED_FOR_REVISION'].includes(d.status)?['SUBMIT','FREEZE']:d.kind==='REPORT'&&d.status==='WITHDRAWN'?['REOPEN']:[]):[];
  const labels:Record<string,string>={SUBMIT:'Send for review',FREEZE:'Freeze internal snapshot',WITHDRAW:'Explicitly withdraw from review',COMMENT:'Add reviewer comment',RETURN:'Return for revision',REOPEN:'Resume report draft'};
  return <div className="space-y-4" data-testid="document-review">
    <Card className="space-y-4 p-5"><div className="flex flex-wrap items-center gap-2"><h2 className="flex-1 text-[18px] font-semibold">{d.title}</h2><Pill tone="info">{d.status.replaceAll('_',' ')}</Pill></div>
      <p className="break-words text-[13px] text-brand-inkMuted">{d.kind} · revision {d.version} · {d.childName} · by {d.authorName}</p>
      <Link className="inline-block text-brand-action underline" href={d.kind==='PLAN'?`/app/clinical/${d.childId}`:`/app/reports/${d.id}`}>Open clinical workspace</Link>
      {actions.length>0&&<><ReasonField label="Reason or reviewer comment (required)" value={reason} onChange={setReason} testId="governance-reason"/><div className="flex flex-wrap gap-2">{actions.map(a=><Button key={a} variant="secondary" disabled={busy||reason.trim().length<3} onClick={()=>void action(a)} data-testid={`transition-${a.toLowerCase()}`}>{labels[a]}</Button>)}</div></>}
      {d.kind==='PLAN'&&['WITHDRAWN','FROZEN_INTERNAL'].includes(d.status)&&<p className="text-[14px]">The preserved version stays read-only. Its author can start the next version in the clinical workspace.</p>}
      <p className="flex items-start gap-2 text-[13px] text-brand-inkMuted"><LockKeyhole className="shrink-0" size={16}/>Signing, approval and release are disabled. Freezing does not approve a document.</p>
      {err&&<p role="alert" className="text-status-danger">{err}</p>}
    </Card>
    <Card className="space-y-3 p-5"><h2 className="text-[18px] font-semibold">Version and status history</h2>{failed?<ErrorState onRetry={()=>void reloadHistory()}/>:!data?<SkeletonRows rows={2}/>:!data.items.length?<p className="text-[14px] text-brand-inkMuted">No governance transitions yet. Earlier history remains in the clinical workspace.</p>:data.items.map(h=><div key={h.id} className="space-y-2 border-t border-border-light pt-3 text-[14px]"><p className="font-semibold">{h.fromStatus} → {h.toStatus} · revision {h.sourceVersion}</p><p className="break-words">{h.reason}</p><p className="break-words text-[12px] text-brand-inkMuted">{new Date(h.createdAt).toLocaleString()} · {h.actorName}</p><Button variant="ghost" size="sm" onClick={()=>void governanceApi.preview(c,h.snapshotId).then(setPreview).catch(e=>setErr(errorText(e,onError)||'The request could not be completed.'))} data-testid="view-frozen-preview">View immutable preview</Button></div>)}</Card>
    {preview&&<FrozenPreview snapshot={preview}/>}
  </div>;
}
function Governance({session,onError}:{session:SessionInfo;onError:(e:unknown)=>void}) {
 const c=session.activeContext?.type==='center'?session.activeContext.centerId:'';
 const fetcher=useCallback(()=>governanceApi.documents(c),[c]); const {data,failed,reload}=useLoad(fetcher,onError);
 const [selected,setSelected]=useState('');const [queue,setQueue]=useState(false);
 const items=(data?.items??[]).filter(d=>!queue||d.status==='IN_REVIEW');const d=data?.items.find(d=>d.id===selected);
 return <div className="space-y-5"><PageTitle testId="governance-title" eyebrow="Clinical governance" title="Documents & review" body="Synthetic records only. Review and internal freezing prepare an audit trail; they confer no clinical authorization."/>
 <Card className="flex flex-wrap gap-2 p-3"><Button variant={queue?'secondary':'primary'} onClick={()=>setQueue(false)}>All documents</Button><Button variant={queue?'primary':'secondary'} onClick={()=>setQueue(true)}>Supervisor review queue ({data?.items.filter(d=>d.status==='IN_REVIEW').length??0})</Button></Card>
 {failed?<ErrorState onRetry={()=>void reload()}/>:!data?<SkeletonRows rows={3}/>:!items.length?<EmptyState icon={FileClock} title="No documents in this view" body="Create a synthetic plan or report in the clinical workspace, or switch to all documents."/>:<div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]"><div className="space-y-2">{items.map(item=><button key={item.id} onClick={()=>setSelected(item.id)} className={`w-full break-words rounded-control border p-4 text-left ${selected===item.id?'border-brand-action bg-brand-actionTint':'border-border-light bg-surface-white'}`}><span className="block font-semibold">{item.title}</span><span className="text-[12px] text-brand-inkMuted">{item.kind} · {item.status.replaceAll('_',' ')}</span></button>)}</div>{d?<DocumentReview key={d.id} c={c} d={d} supervisor={session.activeContext?.role==='CLINICAL_SUPERVISOR'} reload={reload} onError={onError}/>:<Card className="p-5"><p>Select a document to inspect its history and available actions.</p></Card>}</div>}</div>;
}
export default function Page(){return <Workspace active="governance" permission="center.clinical.read" deniedText="Clinical governance is restricted to assigned therapists and clinical supervisors.">{(session,onError)=><Governance session={session} onError={onError}/>}</Workspace>;}
