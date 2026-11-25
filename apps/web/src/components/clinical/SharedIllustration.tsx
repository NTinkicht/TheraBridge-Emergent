'use client';
import {useState} from 'react';
import type {SharedIllustration as Asset} from '@/lib/shared-illustration-manifest.mjs';
import {sharedIllustrationUrl} from '@/lib/shared-illustrations.mjs';
import {SHARED_ILLUSTRATIONS} from '@/lib/shared-illustration-manifest.mjs';
export function SharedIllustration({asset}:{asset:Asset}) {
  return <Image key={asset.id+asset.digest} asset={asset}/>;
}
function Image({asset}:{asset:Asset}) {
  const [failed,setFailed]=useState(false);
  return <figure className="m-0 w-full min-w-0 overflow-hidden rounded-control" data-testid="shared-reference-image">
    {failed ? <p role="status" className="p-2 text-xs">Reference image unavailable</p> :
      // eslint-disable-next-line @next/next/no-img-element
      <img src={sharedIllustrationUrl(asset)} alt={asset.alt} width={400} height={300} loading="lazy" decoding="async"
        className="block aspect-[4/3] h-auto w-full" onError={()=>setFailed(true)}/>}
  </figure>;
}
export function SharedIllustrationLibrary() {
  return <details className="rounded-card border border-border-light bg-surface-white p-4" data-testid="shared-illustration-library">
    <summary className="cursor-pointer font-semibold">Shared illustration library (25 references)</summary>
    <p className="my-3 text-sm text-brand-inkMuted">Fictional reference artwork for the synthetic demo, not individualized treatment instructions or an approved family plan.</p>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {SHARED_ILLUSTRATIONS.map(asset=><div key={asset.id} className="min-w-0 rounded-control border border-border-light">
        <SharedIllustration asset={asset}/><p className="px-2 pb-2 text-xs capitalize">{asset.family} - {asset.scene.replaceAll('-',' ')}</p>
      </div>)}
    </div>
  </details>;
}
