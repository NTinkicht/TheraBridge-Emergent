'use client';
import { useCallback,useEffect,useState } from 'react';
import { Button } from '@/components/design/ui';
import { opsApi } from '@/lib/operations';

export function GuardianPhotoConsent({centerId,childId}: {centerId:string;childId:string}) {
  const [pending,setPending]=useState<{id:string;status:string;consentState:string}[]>([]);
  const [privatePhoto,setPrivatePhoto]=useState<string|null>(null);
  const [review,setReview]=useState<{id:string;src:string}|null>(null);
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    const list=await opsApi.guardianPhotoCandidates(centerId,childId);
    setPending(list.candidates.filter(x=>x.status==='QUARANTINED'));
    try{
      const photo=await opsApi.guardianPrivatePhoto(centerId,childId);
      setPrivatePhoto('data:image/png;base64,'+photo.pngBase64);
    }catch{setPrivatePhoto(null);}
  },[centerId,childId]);
  useEffect(()=>{
    let valid=true;
    setPending([]);setReview(null);setConfirmed(false);setPrivatePhoto(null);setError('');
    void opsApi.guardianPhotoCandidates(centerId,childId)
      .then(list=>{if(valid)setPending(list.candidates.filter(x=>x.status==='QUARANTINED'));})
      .catch(()=>{if(valid)setError('Private photo candidates could not be loaded.');});
    void opsApi.guardianPrivatePhoto(centerId,childId)
      .then(photo=>{if(valid)setPrivatePhoto('data:image/png;base64,'+photo.pngBase64);})
      .catch(()=>{if(valid)setPrivatePhoto(null);});
    return ()=>{valid=false;setReview(null);setPrivatePhoto(null);};
  },[centerId,childId]);
  const inspect=async id=>{
    setBusy(true);setError('');setReview(null);setConfirmed(false);
    try{const image=await opsApi.guardianReviewPhoto(centerId,childId,id);
      setReview({id,src:'data:image/png;base64,'+image.pngBase64});
    }catch{setError('Unable to privately inspect this photograph.');}
    finally{setBusy(false);}
  };
  const decide=async consent=>{
    if(!review||busy||(consent&&!confirmed))return;
    setBusy(true);setError('');
    try{
      await opsApi.guardianPhotoConsent(centerId,childId,review.id,consent);
      setReview(null);setConfirmed(false);await refresh();
    }catch{setError('Photo consent was not saved. Check your link and retry.');}
    finally{setBusy(false);}
  };
  const revoke=async()=>{
    if(busy)return;setBusy(true);setError('');
    try{await opsApi.guardianPhotoRevoke(centerId,childId);setPrivatePhoto(null);setReview(null);await refresh();}
    catch{setError('Photo consent could not be revoked.');}
    finally{setBusy(false);}
  };
  if(!pending.length&&!privatePhoto&&!error)return null;
  return <section className="space-y-3 rounded-control border border-fam-border bg-fam-tile p-3"
    aria-label="Private child profile photograph consent" data-testid="guardian-photo-consent">
    <h3 className="font-semibold text-sm">Private profile photo — your choice</h3>
    <p className="text-xs text-fam-muted">A private photo is not part of therapy progress or a public gallery. You may review it, decline it, or withdraw consent.</p>
    {privatePhoto&&<div className="space-y-2">
      <img alt="Private profile photo with guardian consent" src={privatePhoto}
        className="h-28 w-28 rounded-control object-contain" data-testid="guardian-private-photo"/>
      <Button size="sm" variant="secondary" disabled={busy} onClick={()=>void revoke()}
        data-testid="guardian-revoke-photo">Withdraw consent and delete</Button>
    </div>}
    {pending.map(item=><Button key={item.id} size="sm" variant="secondary" disabled={busy}
      onClick={()=>void inspect(item.id)} data-testid={`guardian-review-photo-${item.id}`}>
      Review pending photo privately
    </Button>)}
    {review&&<div className="space-y-3">
      <img alt="Photo proposed for your consent — not yet approved"
        src={review.src} className="h-28 w-28 rounded-control object-contain"
        data-testid="guardian-photo-review-preview"/>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}
          data-testid="guardian-photo-consent-confirm"/>
        I have reviewed this photo and authorize private child-profile display. This does not authorize sharing or AI training.
      </label>
      <div className="flex flex-wrap gap-2">
        <Button disabled={!confirmed||busy} onClick={()=>void decide(true)} data-testid="guardian-photo-approve">Consent to private photo</Button>
        <Button disabled={busy} variant="secondary" onClick={()=>void decide(false)} data-testid="guardian-photo-deny">Decline and delete</Button>
      </div>
    </div>}
    {error&&<p role="alert" className="text-sm text-status-danger">{error}</p>}
  </section>;
}
