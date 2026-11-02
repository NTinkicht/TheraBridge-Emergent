import { IsIn, IsUUID, MaxLength, IsString } from 'class-validator';

export class FamilyApprovalDto {
  @IsUUID() snapshotId!: string;
}
export class FamilyGrantDto {
  @IsUUID() approvalId!: string;
  @IsUUID() guardianLinkId!: string;
}
export class FamilyConsentDto {
  @IsUUID() childId!: string;
  @IsIn(['FAMILY_PLAN', 'FAMILY_REPORT']) purpose!: 'FAMILY_PLAN' | 'FAMILY_REPORT';
}
export class FamilyGrantChangeDto {
  @IsIn(['REVOKED', 'WITHDRAWN', 'SUPERSEDED']) status!: 'REVOKED' | 'WITHDRAWN' | 'SUPERSEDED';
  @IsString() @MaxLength(500) reason!: string;
}
