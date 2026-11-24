'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/design/ui';
import { activityMediaDrafts, type StaffArtworkPreview } from '@/lib/activity-media';

export type StaffArtworkScope = { centerId:string; templateId:string; version:number; actorKey:string };

function decode(data: StaffArtworkPreview, version:number, slot:number) {
  if (data.templateVersion !== version || data.stepNumber !== (slot || null) || data.staffPreview !== true ||
      data.publishEnabled !== false || data.clinicalReleaseEnabled !== false ||
      data.width !== 400 || data.height !== 300 || typeof data.altText !== 'string' ||
      !data.altText.trim() || data.altText.length > 600 || typeof data.pngBase64 !== 'string' ||
      data.pngBase64.length > 699052 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data.pngBase64) ||
      data.pngBase64.length % 4 !== 0) throw new Error('Invalid staff preview');
  const binary = atob(data.pngBase64);
  if (binary.length < 33 || binary.length > 512 * 1024 || btoa(binary) !== data.pngBase64)
    throw new Error('Invalid image');
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  if (view.getUint32(0) !== 0x89504e47 || view.getUint32(4) !== 0x0d0a1a0a ||
      view.getUint32(16) !== 400 || view.getUint32(20) !== 300) throw new Error('Invalid PNG');
  return new Blob([bytes],{type:'image/png'});
}

/** Explicit per-slot staff preview. Never prefetch the entire catalogue, and
 * never use a persistent/public image URL. Identity changes remount and
 * dispose old bytes. A new view always reauthorizes against the server. */
export function StaffArtworkImage({scope,slot}:{scope:StaffArtworkScope;slot:number}) {
  return <Preview key={JSON.stringify([scope.centerId,scope.templateId,scope.version,scope.actorKey,slot])} scope={scope} slot={slot}/>;
}
function Preview({scope,slot}:{scope:StaffArtworkScope;slot:number}) {
  const [open,setOpen]=useState(false);
  const [image,setImage]=useState<{url:string;alt:string}|null>(null);
  const [failed,setFailed]=useState(false);
  const {centerId,templateId,version}=scope;
  useEffect(()=>{
    if (!open) return;
    let active=true, url:string|undefined;
    activityMediaDrafts.readApprovedArtwork(centerId,templateId,version,slot).then(data=>{
      if (!active) return;
      const blob=decode(data,version,slot);
      url=URL.createObjectURL(blob);
      setImage({url,alt:data.altText});
    }).catch(()=>{if(active)setFailed(true);});
    return ()=>{active=false;if(url)URL.revokeObjectURL(url);};
  },[open,centerId,templateId,version,slot]);
  return <div className="flex min-w-0 max-w-full flex-col items-start gap-1 text-xs">
    <Button variant="secondary" size="sm" aria-expanded={open}
      onClick={()=>{setImage(null);setFailed(false);setOpen(value=>!value);}}>
      {open?'Close illustration':slot===0?'View signed illustration':'View step illustration'}
    </Button>
    {open && failed && <p role="status">No signed illustration available. Close and retry to refresh.</p>}
    {open && !image && !failed && <p role="status">Checking illustration…</p>}
    {open && image && !failed && <>
      <img src={image.url} alt={image.alt} width={400} height={300} className="max-h-36 w-auto max-w-full rounded-control object-contain"
        onError={()=>setFailed(true)} />
      <p>Private staff preview · not released to families</p>
    </>}
  </div>;
}
