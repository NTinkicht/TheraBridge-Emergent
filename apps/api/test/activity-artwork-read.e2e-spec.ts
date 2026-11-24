import * as storage from '../src/common/private-r2';
import { ActivityMediaService } from '../src/clinical/activity-media.service';
import { NotFoundException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';

describe('staff signed illustration read boundary',()=>{
  const viewer={userId:'u',membershipId:'m',role:'THERAPIST'} as never;
  function setup() {
    const tx={$queryRaw:jest.fn(),privateMediaCandidate:{findFirst:jest.fn()}};
    const prisma={$transaction:jest.fn(async fn=>fn(tx))};
    const service=new ActivityMediaService(prisma as never,{} as never);
    const auth=jest.spyOn(service as any,'authorizedTemplate').mockResolvedValue({version:7});
    const verified=jest.spyOn(service as any,'verifiedArtwork').mockResolvedValue([{candidateId:'candidate',draftId:'draft',digestSha256:'a'.repeat(64),stepNumber:null,width:400,height:300,altText:'Signed art'}]);
    return {service,tx,auth,verified};
  }
  it('rejects invalid slot and version before any authorization or storage lookup',async()=>{
    const {service,auth}=setup();
    await expect(service.readApprovedArtwork('c',viewer,'t',7,65)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(service.readApprovedArtwork('c',viewer,'t',0,0)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(auth).not.toHaveBeenCalled();
  });
  it('denies unauthorized and stale template requests without looking up signed records',async()=>{
    const {service,auth,verified,tx}=setup();
    auth.mockRejectedValueOnce(new ForbiddenException());
    await expect(service.readApprovedArtwork('c',viewer,'t',7,0)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.readApprovedArtwork('c',viewer,'t',6,0)).rejects.toBeInstanceOf(NotFoundException);
    expect(verified).not.toHaveBeenCalled();expect(tx.privateMediaCandidate.findFirst).not.toHaveBeenCalled();
  });
  it('rechecks after acquiring locks and denies revocation during the read',async()=>{
    const {service,verified,tx}=setup();
    verified.mockResolvedValueOnce([{candidateId:'candidate',draftId:'draft'}]).mockResolvedValueOnce([]);
    await expect(service.readApprovedArtwork('c',viewer,'t',7,0)).rejects.toBeInstanceOf(NotFoundException);
    expect(verified).toHaveBeenCalledTimes(2);expect(tx.$queryRaw).toHaveBeenCalledTimes(3);
    expect(tx.privateMediaCandidate.findFirst).not.toHaveBeenCalled();
  });
  it('rejects an absent signed binding and replacement while locking',async()=>{
    const {service,verified,tx}=setup();
    verified.mockResolvedValueOnce([]);
    await expect(service.readApprovedArtwork('c',viewer,'t',7,0)).rejects.toBeInstanceOf(NotFoundException);
    verified.mockResolvedValueOnce([{candidateId:'one',draftId:'draft'}]).mockResolvedValueOnce([{candidateId:'two',draftId:'draft'}]);
    await expect(service.readApprovedArtwork('c',viewer,'t',7,0)).rejects.toBeInstanceOf(NotFoundException);
    verified.mockResolvedValueOnce([{candidateId:'one',draftId:'draft'}]).mockResolvedValueOnce([{candidateId:'one',draftId:'different'}]);
    await expect(service.readApprovedArtwork('c',viewer,'t',7,0)).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.privateMediaCandidate.findFirst).not.toHaveBeenCalled();
  });
  it('refuses oversized encrypted input',async()=>{
    const {service,tx}=setup();tx.privateMediaCandidate.findFirst.mockResolvedValueOnce({encryptedBytes:Buffer.alloc(512*1024+30)});
    await expect(service.readApprovedArtwork('c',viewer,'t',7,0)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('rejects negative and fractional slot and version',async()=>{
    const {service,auth}=setup();
    for(const [version,slot] of [[7,-1],[7,1.5],[1.5,0]])await expect(service.readApprovedArtwork('c',viewer,'t',version,slot)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(auth).not.toHaveBeenCalled();
  });
  it('never falls back to database bytes for an unavailable R2 pointer',async()=>{
    const {service,tx}=setup();
    const read=jest.spyOn(storage,'readPrivateR2').mockRejectedValueOnce(new Error('unavailable'));
    tx.privateMediaCandidate.findFirst.mockResolvedValueOnce({encryptedBytes:Buffer.alloc(50),r2CipherSha256:'b'.repeat(64),r2CipherBytes:50});
    try {
      await expect(service.readApprovedArtwork('c',viewer,'t',7,0)).rejects.toBeInstanceOf(NotFoundException);
      expect(read).toHaveBeenCalledWith({centerId:'c',candidateId:'candidate',digest:'b'.repeat(64),size:50});
    } finally {read.mockRestore();}
  });
  it('rejects missing storage and malformed encrypted bytes',async()=>{
    const {service,tx}=setup();
    tx.privateMediaCandidate.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({encryptedBytes:Buffer.alloc(50)});
    await expect(service.readApprovedArtwork('c',viewer,'t',7,0)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.readApprovedArtwork('c',viewer,'t',7,0)).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.privateMediaCandidate.findFirst).toHaveBeenCalledWith({where:{id:'candidate',centerId:'c',templateId:'t',templateVersion:7,
      mediaDraftId:'draft',kind:'ACTIVITY_IMAGE',status:'QUARANTINED',revokedAt:null,digestSha256:'a'.repeat(64)},select:{encryptedBytes:true,r2CipherSha256:true,r2CipherBytes:true}});
  });
});
