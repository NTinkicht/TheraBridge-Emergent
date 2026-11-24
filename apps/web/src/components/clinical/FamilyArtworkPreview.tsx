'use client';
import {useEffect,useState} from 'react';
import {familyReleaseApi} from '@/lib/family-releases';
import {Button} from '@/components/design/ui';
type Slot={slot:number;altText:string;instruction:string|null};
function slotsOf(manifest:unknown,index:number):Slot[] {
  if(!Array.isArray(manifest)||manifest.length>10)return [];
  const rows=manifest.filter(x=>x?.activityIndex===index);
  if(rows.length!==1||!Array.isArray(rows[0].slots)||rows[0].slots.length>65)return [];
  const slots=rows[0].slots as Slot[];
  return slots.every(s=>s&&Number.isInteger(s.slot)&&s.slot>=0&&s.slot<=64&&typeof s.altText==='string'&&
    (s.instruction===null||typeof s.instruction==='string'))&&new Set(slots.map(s=>s.slot)).size===slots.length?slots:[];
}
export function FamilyArtworkPreview({centerId,releaseId,index,manifest}:{centerId:string;releaseId:string;index:number;manifest:unknown}) {
  return <div className="space-y-2">{slotsOf(manifest,index).map(s=><FamilySlot key={JSON.stringify([centerId,releaseId,index,s.slot,s.altText])}
    centerId={centerId} releaseId={releaseId} index={index} slot={s}/>)}</div>;
}
function FamilySlot({centerId,releaseId,index,slot}:{centerId:string;releaseId:string;index:number;slot:Slot}) {
  const [open,setOpen]=useState(false),[url,setUrl]=useState<string|null>(null),[error,setError]=useState(false);
  useEffect(()=>{
    if(!open)return;
    let active=true,owned:string|undefined;
    familyReleaseApi.artwork(centerId,releaseId,index,slot.slot).then(x=>{
      if(!active)return;
      if(x.synthetic!==true||x.activityIndex!==index||x.slot!==slot.slot||x.altText!==slot.altText||
        x.width!==400||x.height!==300||typeof x.pngBase64!=='string'||x.pngBase64.length>699052||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(x.pngBase64))throw Error('Invalid artwork');
      const raw=atob(x.pngBase64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
      if(bytes.length<33||bytes.length>512*1024||btoa(raw)!==x.pngBase64)throw Error('Invalid artwork');
      const v=new DataView(bytes.buffer);
      if(v.getUint32(0)!==0x89504e47||v.getUint32(4)!==0x0d0a1a0a||v.getUint32(16)!==400||v.getUint32(20)!==300)throw Error('Invalid PNG');
      owned=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));setUrl(owned);
    }).catch(()=>{if(active)setError(true);});
    return()=>{active=false;if(owned)URL.revokeObjectURL(owned);};
  },[open,centerId,releaseId,index,slot.slot,slot.altText]);
  return <div className="space-y-1">
    <Button size="sm" variant="secondary" aria-expanded={open} onClick={()=>{setUrl(null);setError(false);setOpen(v=>!v);}}>
      {open?'Close illustration':slot.slot===0?'View activity illustration':'View step '+slot.slot+' illustration'}
    </Button>
    {open&&slot.instruction&&<p className="text-sm">{slot.instruction}</p>}
    {open&&error&&<p role="status">Illustration unavailable.</p>}
    {open&&!url&&!error&&<p role="status">Checking illustration…</p>}
    {open&&url&&!error&&<img src={url} alt={slot.altText} width={400} height={300} onError={()=>setError(true)}
      className="h-auto max-w-full rounded-control object-contain"/>}
  </div>;
}
