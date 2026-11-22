'use client';
import { useRef, useState } from 'react';
import { MAX_PRIVATE_IMAGE_BYTES_CLIENT } from '@/lib/private-image-client';

export function PrivatePngCandidatePicker({label,onStage,disabled=false}:{
  label:string;onStage:(pngBase64:string)=>Promise<unknown>;disabled?:boolean;
}) {
  const generation=useRef(0);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const choose=async(file:File|undefined)=>{
    const n=++generation.current;
    setMessage('');
    if(!file)return;
    if(file.type!=='image/png'||file.size<33||file.size>MAX_PRIVATE_IMAGE_BYTES_CLIENT){
      setMessage('Choose a PNG under 512 KiB. Nothing was uploaded.');return;
    }
    setBusy(true);
    try{
      // No preview, object URL, persistent cache, filename or file in React state.
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(n!==generation.current)return;
      let raw='';
      for(let offset=0;offset<bytes.length;offset+=8192)
        raw+=String.fromCharCode(...bytes.subarray(offset,offset+8192));
      const pngBase64=btoa(raw);
      await onStage(pngBase64);
      if(n===generation.current)setMessage('Private scanned candidate submitted. Publication is not authorized by this upload.');
    }catch {
      if(n===generation.current)setMessage('Private upload was not accepted. Verify scanner and private encryption configuration.');
    }finally {if(n===generation.current)setBusy(false);}
  };
  return <div className="space-y-2" data-testid="private-png-candidate-picker">
    <label className="block text-sm font-medium">{label}
      <input type="file" accept=".png,image/png" disabled={disabled||busy}
        onChange={event=>{const file=event.currentTarget.files?.[0];event.currentTarget.value='';void choose(file);}}
        className="mt-1 block min-h-[44px] w-full rounded-control border border-border-strong p-2 text-sm"
        data-testid="private-png-candidate-file" />
    </label>
    <p className="text-xs text-brand-inkMuted">
      Maximum 512 KiB. The API checks full PNG integrity, rejects metadata chunks, requires trusted antivirus scanning and encrypts before private custody.
    </p>
    {busy&&<p role="status" className="text-sm">Scanning privately…</p>}
    {message&&<p role="status" data-testid="private-png-candidate-status" className="text-sm">{message}</p>}
  </div>;
}
