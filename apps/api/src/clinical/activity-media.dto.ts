import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, Matches } from 'class-validator';
import { TrimmedString } from '../common/validators';

// Registers metadata for an unuploaded illustration proposal ONLY.
// No client-provided public URL, storage path, approval or release state.
export class ActivityMediaDraftDto {
  @IsInt() @Min(1) @Max(1000000) templateVersion!: number;
  @IsIn(['ORIGINAL', 'GENERATED', 'LICENSED']) sourceType!: 'ORIGINAL' | 'GENERATED' | 'LICENSED';
  @TrimmedString() @IsString() @MinLength(4) @MaxLength(120) styleVersion!: string;
  @TrimmedString() @IsString() @MinLength(3) @MaxLength(80) sceneType!: string;
  @TrimmedString() @IsString() @MinLength(10) @MaxLength(600) altText!: string;
  @TrimmedString() @IsString() @MinLength(4) @MaxLength(160) license!: string;
  @TrimmedString() @IsString() @MinLength(8) @MaxLength(500) sourceReference!: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(500) providerTerms?: string;
}

export class ActivityMediaRejectDto {
  @IsInt() @Min(1) version!: number;
  @TrimmedString() @IsString() @MinLength(8) @MaxLength(500) reason!: string;
}
