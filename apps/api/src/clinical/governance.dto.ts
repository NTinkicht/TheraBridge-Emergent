import { IsIn, IsInt, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { TrimmedString } from '../common/validators';
import { SPECIALTIES } from '../applications/applications.dto';
export class TransitionDto {
  @IsInt() @Min(1) version!: number;
  @IsIn(['SUBMIT','RETURN','COMMENT','WITHDRAW','FREEZE','REOPEN']) action!: string;
  @TrimmedString() @IsString() @MinLength(3) @MaxLength(1000) reason!: string;
}
// TB-EM-049: structured, non-clinical handover preparation only.
export class HandoverProposalDto {
  @IsUUID() childId!: string;
  @IsUUID() fromMembershipId!: string;
  @IsUUID() toMembershipId!: string;
  @IsIn(['STAFF_CHANGE', 'AVAILABILITY', 'FAMILY_REQUEST']) reasonCode!: string;
  @IsIn(SPECIALTIES) service!: string;
}

export class TransferDraftDto {
  @IsUUID() childId!: string;
  @IsUUID() fromMembershipId!: string;
  @IsUUID() toMembershipId!: string;
  @TrimmedString() @IsString() @MinLength(3) @MaxLength(1000) reason!: string;
  @TrimmedString() @IsString() @MinLength(2) @MaxLength(32) service!: string;
}
