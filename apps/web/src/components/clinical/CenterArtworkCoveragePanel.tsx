'use client';
import {useEffect,useState} from 'react';
import {familyReleaseApi,type CenterArtworkCoverage} from '@/lib/family-releases';
import {Button} from '@/components/design/ui';

export function CenterArtworkCoveragePanel({centerId}:{centerId:string}) {
  return <CoverageSnapshot key={centerId} centerId={centerId}/>;
}
function CoverageSnapshot({centerId}:{centerId:string}) {
  const [request,setRequest]=useState(0),[result,setResult]=useState<CenterArtworkCoverage|null>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(!request)return;
    let active=true;
    familyReleaseApi.centerArtworkCoverage(centerId).then(r=>{
      if(!active)return;
      if(r.scope!=='CENTER_ACTIVE_SYNTHETIC_PLAN_GRANTS'||r.synthetic!==true||typeof r.complete!=='boolean')
        throw Error('Invalid coverage');
      if(r.complete && (r.total===null||r.covered===null||r.eligibleGrants===null||
        ![r.total,r.covered,r.eligibleGrants].every(n=>Number.isSafeInteger(n)&&n>=0)||
        r.covered>r.total||r.reason!==null||r.percent!==(r.total?Math.floor(100*r.covered/r.total):null)))
        throw Error('Invalid totals');
      if(!r.complete && (r.total!==null||r.covered!==null||r.percent!==null||r.eligibleGrants!==null||
        !['INVENTORY_LIMIT','INVALID_SOURCE'].includes(r.reason??'')))throw Error('Invalid incomplete result');
      setResult(r);
    }).catch(()=>{if(active)setFailed(true);});
    return()=>{active=false;};
  },[centerId,request]);
  const busy=request>0&&!result&&!failed;
  return <section className="space-y-2 rounded-control border border-border-light p-3" aria-label="Released illustration coverage">
    <h3 className="font-semibold">Released synthetic illustration coverage</h3>
    <p className="text-sm text-brand-inkMuted">Current centre only. Counts unique activity versions with a readable whole-activity illustration in every eligible active release. Not production or platform-wide coverage.</p>
    <Button size="sm" variant="secondary" disabled={busy} onClick={()=>{setResult(null);setFailed(false);setRequest(n=>n+1);}}>
      {busy?'Checking coverage…':'Check centre coverage'}
    </Button>
    {failed&&<p role="status">Coverage unavailable.</p>}
    {result&&!result.complete&&<p role="status">Complete coverage unavailable. No partial percentage is reported.</p>}
    {result?.complete&&<p role="status">{result.eligibleGrants} eligible releases · {result.covered} of {result.total} activity versions covered
      {' · '}{result.percent===null?'No eligible activities':result.percent+'%'}</p>}
  </section>;
}
