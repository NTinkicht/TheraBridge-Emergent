'use client';
import { useCallback,useEffect,useState } from 'react';
import { Card } from '@/components/design/ui';
import { opsApi } from '@/lib/operations';
import { PrivatePngCandidatePicker } from './PrivatePngCandidatePicker';

export function ChildPhotoPanel({centerId,childId,canManage,active}:{
  centerId:string;childId:string;canManage:boolean;active:boolean;
}) {
  const [items,setItems]=useState<{id:string;status:string;consentState:string}[]>([]);
  const [image,setImage]=useState<string|null>(null);
  const [notice,setNotice]=useState('');
  const [loading,setLoading]=useState(true);
  const refresh=useCallback(async()=>{
    const list=await opsApi.childPhotoCandidates(centerId,childId);
    setItems(list.candidates);
    try{
      const privatePhoto=await opsApi.privateChildPhoto(centerId,childId);
      setImage(privatePhoto.mimeType==='image/png'?'data:image/png;base64,'+privatePhoto.pngBase64:null);
    }catch{setImage(null);}
  },[centerId,childId]);
  useEffect(()=>{
    let valid=true;
    setItems([]);setImage(null);setNotice('');setLoading(true);
    void Promise.all([opsApi.childPhotoCandidates(centerId,childId),
      opsApi.privateChildPhoto(centerId,childId).catch(()=>null)])
      .then(([list,privatePhoto])=>{
        if(!valid)return;setItems(list.candidates);
        if(privatePhoto?.mimeType==='image/png')setImage('data:image/png;base64,'+privatePhoto.pngBase64);
      }).catch(()=>{if(valid)setNotice('Private photo status unavailable.');})
      .finally(()=>{if(valid)setLoading(false);});
    return ()=>{valid=false;setImage(null);};
  },[centerId,childId]);
  return <Card className="space-y-3 p-5 md:p-6" testId="child-private-photo">
    <h2 className="text-[18px] font-semibold">Private profile photograph (optional)</h2>
    <p className="text-[13px] text-brand-inkMuted">A photo is visible only after the linked guardian reviews and consents. It is never published as an activity image or AI input.</p>
    {loading&&<p role="status" className="text-sm">Checking private photo state…</p>}
    {image&&<img alt="Guardian-consented private child profile photograph"
      src={image} className="h-32 w-32 rounded-control border border-border-light object-contain"
      data-testid="child-consented-photo" />}
    {!image&&!loading&&<p className="text-sm">No consented private photo available.</p>}
    {items.filter(x=>x.status==='QUARANTINED').length>0&&
      <p className="text-xs text-brand-inkMuted" data-testid="child-photo-pending">
        {items.filter(x=>x.status==='QUARANTINED').length} scanned private photo candidate(s) awaiting linked guardian consent.
      </p>}
    {canManage&&active&&<PrivatePngCandidatePicker label="Prepare a scanned private PNG for guardian review"
      onStage={async pngBase64=>{
        await opsApi.uploadChildPhoto(centerId,childId,pngBase64);
        await refresh();
        setNotice('Photo securely quarantined. Linked guardian must review and approve it before private display.');
      }} />}
    {notice&&<p className="text-sm" role="status">{notice}</p>}
  </Card>;
}
