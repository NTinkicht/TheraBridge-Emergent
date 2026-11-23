'use client';
import { useEffect, useState } from 'react';
import { Card, Button } from '@/components/design/ui';
import { opsApi, type PrivateCareRecord } from '@/lib/operations';

const fields = [
  ['conditions','Conditions or diagnoses reported by family'],
  ['allergies','Allergies reported by family'],
  ['medications','Medication information reported by family'],
  ['careNotes','Other relevant care or safeguarding context'],
] as const;
type Key = typeof fields[number][0];

export function PrivateCarePanel({centerId,childId,canEdit,active}: {
  centerId:string;childId:string;canEdit:boolean;active:boolean;
}) {
  const [value,setValue] = useState<PrivateCareRecord|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [saved,setSaved]=useState(false);
  useEffect(()=>{
    let valid=true;
    setValue(null);setError('');setSaved(false);
    void opsApi.privateCare(centerId,childId)
      .then(r=>{if(valid)setValue(r);})
      .catch(()=>{if(valid)setError('Private care context cannot be loaded. No information is displayed.');});
    return ()=>{valid=false;setValue(null);};
  },[centerId,childId]);
  const save=async()=>{
    if(!value || busy)return;
    setBusy(true);setError('');setSaved(false);
    try{
      const r=await opsApi.updatePrivateCare(centerId,childId,{
        sourceAcknowledged:true,version:value.version,
        conditions:value.conditions,allergies:value.allergies,
        medications:value.medications,careNotes:value.careNotes,
      });
      setValue(r);setSaved(true);
    }catch{setError('Care context was not saved. Verify encryption setup and access, or reload after a concurrent change.');}
    finally{setBusy(false);}
  };
  return <Card className="p-5 md:p-6" testId="child-private-care">
    <div className="space-y-2">
      <h2 className="text-[18px] font-semibold">Restricted family-reported care context</h2>
      <p className="text-[13px] text-brand-inkMuted">
        Information provided during intake is unverified. It is not a diagnosis, prescription
        or clinician-approved assessment. Never use this panel for emergency instructions.
      </p>
      {!value&&!error&&<p role="status" className="text-sm">Loading restricted context…</p>}
      {error&&<p role="alert" data-testid="private-care-error" className="text-sm text-status-danger">{error}</p>}
      {value&&<div className="space-y-3" data-testid="private-care-fields">
        {fields.map(([key,label])=><label key={key} className="block text-[13px] font-medium">
          {label}
          <textarea aria-label={label} data-testid={`private-care-${key}`}
            value={value[key]} disabled={!canEdit||!active||busy} maxLength={key==='careNotes'?1200:600}
            onChange={event=>{const text=event.target.value;setSaved(false);setValue(v=>v?{...v,[key]:text}:v);}}
            rows={key==='careNotes'?3:2}
            className="mt-1 min-h-[70px] w-full rounded-control border border-border-strong bg-surface-white p-2 text-sm disabled:opacity-70"/>
        </label>)}
        {canEdit&&active&&<Button disabled={busy} onClick={()=>void save()} data-testid="private-care-save">
          {busy?'Saving…':'Save restricted context'}
        </Button>}
        {saved&&<p role="status" data-testid="private-care-saved" className="text-sm">Restricted context saved as unverified family-reported information.</p>}
      </div>}
    </div>
  </Card>;
}
