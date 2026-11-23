import { Equals, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, Matches } from 'class-validator';
import { ILLUSTRATION_STYLE_VERSION } from './illustration-style';
import { TrimmedString } from '../common/validators';

export class ActivityPrivatePngCandidateDto {
  @IsString() @MinLength(44) @MaxLength(699052) pngBase64!: string;
}

// Registers metadata for an unuploaded illustration proposal ONLY.
// No client-provided public URL, storage path, approval or release state.
export class ActivityMediaDraftDto {
  @IsInt() @Min(1) @Max(1000000) templateVersion!: number;
  @IsOptional() @IsInt() @Min(1) @Max(64) stepNumber?: number;
  @IsIn(['ORIGINAL', 'GENERATED', 'LICENSED']) sourceType!: 'ORIGINAL' | 'GENERATED' | 'LICENSED';
  @IsString() @Equals(ILLUSTRATION_STYLE_VERSION) styleVersion!: typeof ILLUSTRATION_STYLE_VERSION;
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
