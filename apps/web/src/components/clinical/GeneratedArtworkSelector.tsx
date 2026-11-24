'use client';

import { useEffect, useRef, useState } from 'react';
import { GENERATED_ARTWORK, findGeneratedArtwork, verifyGeneratedReviewBytes, type GeneratedArtwork } from '@/lib/generated-artwork.mjs';

/** Local, hash-verified synthetic reference artwork. Not a released activity instruction. */
export function GeneratedArtworkSelector({onSelect,service,disabled=false,lockedReference,onStage,instruction}:{ 
  onSelect?:(asset:GeneratedArtwork)=>void;service?:string;disabled?:boolean;
  lockedReference?:string;onStage?:(pngBase64:string)=>Promise<void>;instruction?:string;
}) {
  const [id,setId]=useState('');
  const [submitted,setSubmitted]=useState(false);
  const verifiedBytes=useRef<Uint8Array|null>(null);
  const [preview,setPreview]=useState<{url:string;asset:GeneratedArtwork}|null>(null);
  const [status,setStatus]=useState('');
  const [busy,setBusy]=useState(false);
  const generation=useRef(0);
  const urlRef=useRef<string|null>(null);
  const clear=()=>{
    if(urlRef.current)URL.revokeObjectURL(urlRef.current);
    urlRef.current=null;
    verifiedBytes.current=null;
    setPreview(null);
  };
  useEffect(()=>{
    setId('');setPreview(null);setStatus('');setBusy(false);setSubmitted(false);
    return ()=>{generation.current++;if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current=null;verifiedBytes.current=null;};
  },[service,lockedReference]);
  const family=service==='feeding'?'occupational':service==='developmental'?'behavioral':service;
  const choices=GENERATED_ARTWORK.filter(item=>family===undefined||item.family===family);
  const locked=lockedReference===undefined?null:choices.find(item=>
    lockedReference==='m5-b-v1:'+item.referenceId+':sha256:'+item.reviewSha256)??null;
  const activeId=lockedReference===undefined?id:locked?.referenceId??'';
  const asset=choices.some(item=>item.referenceId===activeId)?findGeneratedArtwork(activeId):null;
  const previewMatches=asset!==null&&preview?.asset.referenceId===asset.referenceId;
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
      urlRef.current=url;verifiedBytes.current=bytes;setPreview({url,asset});
      setStatus('Exact reference artwork verified on this device. No bytes uploaded and no approval granted.');
    }catch{
      if(n===generation.current)setStatus('This file does not match the selected artwork. Nothing was uploaded.');
    }finally{if(n===generation.current)setBusy(false);}
  };
  const stage=async()=>{
    if(!onStage||!locked||!previewMatches||!verifiedBytes.current||busy||submitted||disabled)return;
    const n=++generation.current;
    const bytes=verifiedBytes.current;
    setBusy(true);setSubmitted(true);setStatus('');
    try{
      let raw='';
      for(let offset=0;offset<bytes.length;offset+=8192)
        raw+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
      await onStage(btoa(raw));
      if(n===generation.current){clear();setStatus('Scanned candidate staged in private custody. Not approved or released.');}
    }catch{
      if(n===generation.current){clear();setStatus('Private staging not confirmed. Close and inspect candidate history before retrying.');}
    }finally{if(n===generation.current)setBusy(false);}
  };
  return <section className="space-y-3 rounded-control border border-border-light bg-surface-white p-3" data-testid="generated-artwork-selector">
    <h5 className="font-semibold">{lockedReference===undefined?'Generated illustration collection · 25 references':'Review and stage exact saved artwork'}</h5>
    <p className="text-[13px] text-brand-inkMuted">{lockedReference===undefined?'Choose a fictional illustration from the locked Direction B set. Preview its exact local review copy, then use its metadata for a private proposal.':'Verify the saved reference file and compare the picture with its intended instruction before explicitly submitting the same bytes for private scanning.'} This is not an approved activity or step illustration.</p>
    {instruction!==undefined&&<p className="rounded-control border border-border-light p-2 text-sm" data-testid="generated-artwork-instruction"><strong>Intended instruction: </strong>{instruction}</p>}
    {lockedReference!==undefined&&!locked&&<p role="alert" className="text-sm text-status-danger">Saved artwork identity is unavailable or does not match this specialty.</p>}
    {lockedReference===undefined&&<label className="block text-sm font-medium">Illustration reference
      <select disabled={disabled} value={id} className="mt-1 min-h-[44px] w-full rounded-control border border-border-strong bg-surface-white p-2"
        onChange={e=>{generation.current++;clear();setBusy(false);setStatus('');setId(e.target.value);}}>
        <option value="">Select a reference</option>
        {choices.map(item=><option key={item.referenceId} value={item.referenceId}>{item.family} · {item.scene} · {item.referenceId}</option>)}
      </select>
    </label>}
    {asset&&<>
      <p className="break-words text-xs text-brand-inkMuted">File: {asset.reviewFile}</p>
      <label className="block text-sm font-medium">Verify local reference artwork
        <input type="file" accept=".png,image/png" disabled={disabled||busy||submitted}
          className="mt-1 min-h-[44px] w-full rounded-control border border-border-strong p-2 text-sm"
          onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void choose(file);}} />
      </label>
    </>}
    {previewMatches&&preview&&<figure className="max-w-sm overflow-hidden rounded-control border border-border-light">
      {/* The only source is an exact digest-pinned local fictional reference; never a server media URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview.url} alt={preview.asset.alt} width={400} height={300} className="block aspect-[4/3] h-auto w-full object-contain" />
      <figcaption className="p-2 text-xs text-brand-inkMuted">Local reference only · not approved for clinical use</figcaption>
    </figure>}
    {previewMatches&&preview&&onSelect&&!onStage&&<button type="button" disabled={disabled||busy}
      className="min-h-[44px] rounded-control border border-border-strong px-3 py-2 text-sm font-semibold"
      onClick={()=>onSelect(preview.asset)}>Use verified artwork metadata</button>}
    {previewMatches&&preview&&locked&&onStage&&<button type="button" disabled={disabled||busy||submitted}
      className="min-h-[44px] rounded-control border border-border-strong px-3 py-2 text-sm font-semibold"
      onClick={()=>void stage()}>Confirm private scanned staging</button>}
    {busy&&<p role="status" className="text-sm">{submitted?'Submitting for private scanning…':'Verifying artwork…'}</p>}
    {status&&<p role="status" className="text-sm">{status}</p>}
  </section>;
}
