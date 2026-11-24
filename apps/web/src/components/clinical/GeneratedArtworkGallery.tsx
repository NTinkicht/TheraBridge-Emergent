'use client';

import { useEffect, useRef, useState } from 'react';
import { GENERATED_ARTWORK, verifyGeneratedReviewBytes, type GeneratedArtwork } from '@/lib/generated-artwork.mjs';

export type LocalArtworkPreview = { asset: GeneratedArtwork; url: string };
type Preview = LocalArtworkPreview;

/** Local reference board, never a clinical publication or activity mapping. */
export function GeneratedArtworkGallery({onVerified}: {onVerified?:(previews:readonly LocalArtworkPreview[])=>void} = {}) {
  const [previews,setPreviews]=useState<Preview[]>([]);
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const generation=useRef(0);
  const urls=useRef<string[]>([]);
  const release=()=>{
    for(const url of urls.current)URL.revokeObjectURL(url);
    urls.current=[];
  };
  useEffect(()=>()=>{generation.current++;release();},[]);
  const clear=()=>{
    generation.current++;release();setPreviews([]);onVerified?.([]);setBusy(false);setStatus('');
  };
  const load=async(files:File[])=>{
    clear();
    const n=generation.current;
    const byName=new Map(files.map(file=>[file.name,file]));
    if(files.length!==GENERATED_ARTWORK.length||byName.size!==GENERATED_ARTWORK.length){
      setStatus('Select exactly one named review PNG for every reference in the original collection.');return;
    }
    setBusy(true);
    const verified:{asset:GeneratedArtwork;bytes:Uint8Array}[]=[];
    const pending:string[]=[];
    try{
      // No object URL exists until the COMPLETE locked set has passed.
      for(const asset of GENERATED_ARTWORK){
        const file=byName.get(asset.reviewFile);
        if(!file||file.type!=='image/png'||file.size!==asset.reviewByteLength)throw Error('identity');
        const bytes=new Uint8Array(await file.arrayBuffer());
        if(n!==generation.current)return;
        if(!await verifyGeneratedReviewBytes(asset.referenceId,bytes))throw Error('digest');
        if(n!==generation.current)return;
        verified.push({asset,bytes});
      }
      const next=verified.map(({asset,bytes})=>{
        const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
        pending.push(url);return {asset,url};
      });
      urls.current=pending.splice(0);
      setPreviews(next);onVerified?.(next);setStatus('Complete original reference collection verified locally. Nothing uploaded or approved.');
    }catch{
      if(n===generation.current)setStatus('Collection rejected: missing, incorrect or altered review copy. No artwork displayed.');
    }finally{
      for(const url of pending)URL.revokeObjectURL(url);
      if(n===generation.current)setBusy(false);
    }
  };
  return <section className="space-y-4 rounded-card border border-border-light bg-surface-white p-4"
    data-testid="generated-artwork-gallery">
    <h2 className="text-[16px] font-semibold">Direction B · original illustration collection</h2>
    <p className="text-sm text-brand-inkMuted">Choose all {GENERATED_ARTWORK.length} extracted review PNGs together. This staff-only board displays exact fictional reference images on this device, not approved activity illustrations or a family plan.</p>
    <label className="block text-sm font-medium">Load complete review collection
      <input type="file" multiple accept=".png,image/png" disabled={busy}
        className="mt-1 min-h-[44px] w-full rounded-control border border-border-strong p-2"
        onChange={event=>{const files=Array.from(event.currentTarget.files??[]);event.currentTarget.value='';void load(files);}} />
    </label>
    <button type="button" onClick={clear} className="min-h-[44px] rounded-control border border-border-strong px-3 py-2 text-sm font-semibold">Clear local collection</button>
    <p role="status" className="text-sm text-brand-inkMuted">{busy?'Verifying the complete collection…':status}</p>
    {previews.length>0&&<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="generated-artwork-gallery-grid">
      {previews.map(({asset,url})=><figure key={asset.referenceId} className="min-w-0 overflow-hidden rounded-control border border-border-light">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={asset.alt} width={400} height={300} className="block aspect-[4/3] h-auto w-full object-contain" />
        <figcaption className="space-y-1 p-3 text-sm">
          <p className="font-semibold capitalize">{asset.family} · {asset.scene.replaceAll('-',' ')}</p>
          <p className="break-words text-xs text-brand-inkMuted">{asset.referenceId} · Local reference only</p>
        </figcaption>
      </figure>)}
    </div>}
  </section>;
}
