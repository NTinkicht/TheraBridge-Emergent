'use client';

import { useEffect, useRef, useState } from 'react';
import { GENERATED_ARTWORK, findGeneratedArtwork, verifyGeneratedReviewBytes, type GeneratedArtwork } from '@/lib/generated-artwork.mjs';

/** Local, hash-verified synthetic reference artwork. Not a released activity instruction. */
export function GeneratedArtworkSelector({onSelect,service,disabled=false}:{
  onSelect:(asset:GeneratedArtwork)=>void;service?:string;disabled?:boolean;
}) {
  const [id,setId]=useState('');
  const [preview,setPreview]=useState<{url:string;asset:GeneratedArtwork}|null>(null);
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const generation=useRef(0);
  const urlRef=useRef<string|null>(null);
  const clear=()=>{
    if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    urlRef.current=null;
    setPreview(null);
  };
  useEffect(()=>()=>{generation.current++;if(urlRef.current)URL.revokeObjectURL(urlRef.current);},[]);
  const family=service==='feeding'?'occupational':service==='developmental'?'behavioral':service;
  const choices=GENERATED_ARTWORK.filter(item=>family===undefined||item.family===family);
  const asset=choices.some(item=>item.referenceId===id)?findGeneratedArtwork(id):null;
  const choose=async(file:File|undefined)=>{
    const n=++generation.current;
    clear();setStatus('');setBusy(false);
    if(!file||!asset)return;
    if(file.type!=='image/png'||file.size!==asset.reviewByteLength){
      setStatus('Choose the exact named 400 × 300 review PNG from the supplied artwork pack.');return;
    }
    setBusy(true);
    try{
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(!await verifyGeneratedReviewBytes(asset.referenceId,bytes))throw new Error('mismatch');
      if(n!==generation.current)return;
      const url=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
      urlRef.current=url;setPreview({url,asset});
      setStatus('Exact reference artwork verified on this device. No bytes uploaded and no approval granted.');
    }catch{
      if(n===generation.current)setStatus('This file does not match the selected artwork. Nothing was uploaded.');
    }finally{if(n===generation.current)setBusy(false);}
  };
  return <section className="space-y-3 rounded-control border border-border-light bg-surface-white p-3" data-testid="generated-artwork-selector">
    <h5 className="font-semibold">Generated illustration collection · 25 references</h5>
    <p className="text-[13px] text-brand-inkMuted">Choose a fictional illustration from the locked Direction B set. Preview its exact local review copy, then use its metadata for a private proposal. This is not an approved activity or step illustration.</p>
    <label className="block text-sm font-medium">Illustration reference
      <select disabled={disabled} value={id} className="mt-1 min-h-[44px] w-full rounded-control border border-border-strong bg-surface-white p-2"
        onChange={e=>{generation.current++;clear();setBusy(false);setStatus('');setId(e.target.value);}}>
        <option value="">Select a reference</option>
        {choices.map(item=><option key={item.referenceId} value={item.referenceId}>{item.family} · {item.scene} · {item.referenceId}</option>)}
      </select>
    </label>
    {asset&&<>
      <p className="break-words text-xs text-brand-inkMuted">File: {asset.reviewFile}</p>
      <label className="block text-sm font-medium">Verify local reference artwork
        <input type="file" accept=".png,image/png" disabled={disabled||busy}
          className="mt-1 min-h-[44px] w-full rounded-control border border-border-strong p-2 text-sm"
          onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void choose(file);}} />
      </label>
    </>}
    {preview&&<figure className="max-w-sm overflow-hidden rounded-control border border-border-light">
      {/* The only source is an exact digest-pinned local fictional reference; never a server media URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview.url} alt={preview.asset.alt} width={400} height={300} className="block aspect-[4/3] h-auto w-full object-contain" />
      <figcaption className="p-2 text-xs text-brand-inkMuted">Local reference only · not approved for clinical use</figcaption>
    </figure>}
    {preview&&<button type="button" disabled={disabled||busy}
      className="min-h-[44px] rounded-control border border-border-strong px-3 py-2 text-sm font-semibold"
      onClick={()=>onSelect(preview.asset)}>Use verified artwork metadata</button>}
    {busy&&<p role="status" className="text-sm">Verifying artwork…</p>}
    {status&&<p role="status" className="text-sm">{status}</p>}
  </section>;
}
