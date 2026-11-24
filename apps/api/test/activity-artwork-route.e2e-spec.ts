import { ActivityMediaController } from '../src/clinical/activity-media.controller';
import { BadRequestException } from '@nestjs/common';
describe('staff artwork numeric route parameters',()=>{
 const readApprovedArtwork=jest.fn();
 const controller=new ActivityMediaController({readApprovedArtwork} as never);
 const req={auth:{session:{userId:'u',activeMembershipId:'m',activeRole:'THERAPIST'}}} as never;
 it.each([['7','0',7,0],['12','64',12,64]])('accepts numeric version and slot %s/%s',(v,s,version,slot)=>{
   controller.readApprovedArtwork('c','t',v as string,s as string,req);
   expect(readApprovedArtwork).toHaveBeenLastCalledWith('c',{userId:'u',membershipId:'m',role:'THERAPIST'},'t',version,slot);
 });
 it.each([['0','0'],['7','-1'],['7','1x'],['x','0']])('rejects malformed route %s/%s',(v,s)=>{
   expect(()=>controller.readApprovedArtwork('c','t',v,s,req)).toThrow(BadRequestException);
 });
});
