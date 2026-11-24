'use client';

import {useEffect,useRef,useState} from 'react';
import {activityMediaDrafts,type ActivityMediaDraft} from '@/lib/activity-media';
import type {Template} from '@/lib/clinical';
import type {LocalArtworkPreview} from './GeneratedArtworkGallery';

/** Match only actual current-version saved metadata to independently verified local
 * copies. Never read private candidate bytes, infer approval, or pick by similarity. */
export function LocalMappedArtworkReview({centerId,template,previews}:{
  centerId:string;template:Template;previews:readonly LocalArtworkPreview[];
}) {
  const [rows,setRows]=useState<ActivityMediaDraft[]|null>(null);
  const [error,setError]=useState(false);
  const [busy,setBusy]=useState(false);
  const epoch=useRef(0);
  const running=useRef(false);
  useEffect(()=>()=>{epoch.current++;running.current=false;},[]);
  const refresh=async()=>{
    if(running.current||!template.version||!previews.length)return;
    running.current=true;
    const n=++epoch.current;
    setRows(null);setError(false);setBusy(true);
    try{
      const collected:ActivityMediaDraft[]=[];
      const seen=new Set<string>();let cursor:string|undefined;
      for(let page=0;page<10;page++){
        const result=await activityMediaDrafts.list(centerId,template.id,cursor,100);
        if(n!==epoch.current)return;
        if(result.publishEnabled!==false||result.clinicalReleaseEnabled!==false||
           !Array.isArray(result.items)||result.items.length>100)throw Error('envelope');
        for(const item of result.items){
          if(item.centerId!==centerId||item.templateId!==template.id||seen.has(item.id))throw Error('scope');
          seen.add(item.id);collected.push(item);
        }
        if(!result.hasMore){
          if(result.nextCursor!==null)throw Error('cursor');
          setRows(collected);return;
        }
        if(typeof result.nextCursor!=='string'||!result.nextCursor||result.nextCursor===cursor||
           result.items.at(-1)?.id!==result.nextCursor)throw Error('cursor');
        cursor=result.nextCursor;
      }
      throw Error('bounded history');
    }catch{if(n===epoch.current)setError(true);}
    finally{if(n===epoch.current){running.current=false;setBusy(false);}}
  };
  const family=template.service==='feeding'?'occupational':template.service==='developmental'?'behavioral':template.service;
  const matches=(rows??[]).flatMap(row=>{
    if(row.state!=='DRAFT'||row.templateVersion!==template.version||row.sourceType!=='GENERATED'||
       row.styleVersion!=='m5-b-v1'||(row.stepNumber!==null&&
       (!Number.isSafeInteger(row.stepNumber)||row.stepNumber<1||row.stepNumber>64||!template.steps[row.stepNumber-1]?.trim())))return [];
    const preview=previews.find(({asset})=>asset.family===family&&asset.scene===row.sceneType&&
      row.sourceReference==='m5-b-v1:'+asset.referenceId+':sha256:'+asset.reviewSha256);
    return preview?[{row,preview}]:[];
  });
  return <section className="space-y-2 rounded-control border border-border-light bg-surface-white p-3"
    data-testid={'local-mapped-artwork-'+template.id}>
    <h4 className="text-sm font-semibold">Saved illustration references · staff review</h4>
    <p className="text-xs text-brand-inkMuted">Load a current snapshot of saved proposals to compare with the original local collection. No private candidate bytes or released illustrations are read. Refresh after changes.</p>
    <button type="button" disabled={busy||!template.version} onClick={()=>void refresh()}
      className="min-h-[44px] rounded-control border border-border-strong px-3 text-sm font-semibold">
      {busy?'Checking saved references…':'Check saved illustration references'}
    </button>
    {error&&<p role="alert" className="text-sm text-status-danger">Could not verify the complete proposal history. No images displayed.</p>}
    {rows&&matches.length===0&&<p role="status" className="text-sm">No matching current-version generated proposals.</p>}
    {matches.length>0&&<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-label="Saved local reference comparisons">
      {matches.map(({row,preview})=><li key={row.id} className="min-w-0 rounded-control border border-border-light p-2">
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.url} alt={preview.asset.alt} width={400} height={300} className="block aspect-[4/3] h-auto w-full rounded-control object-contain" />
          <figcaption className="mt-2 space-y-1 text-sm">
            <p className="font-semibold">{row.stepNumber===null?'Whole activity':'Step '+row.stepNumber} · Version {row.templateVersion}</p>
            {row.stepNumber!==null&&<p className="break-words">{template.steps[row.stepNumber-1]}</p>}
            <p className="text-xs text-brand-inkMuted">Local reference · Not approved · Not released</p>
          </figcaption>
        </figure>
      </li>)}
    </ul>}
  </section>;
}
