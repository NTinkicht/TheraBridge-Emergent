import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, Equals, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';

export const SPECIALTIES = ['speech', 'occupational', 'physical', 'behavioral', 'feeding', 'developmental'] as const;

export class SubmitApplicationDto {
  @IsString() @MinLength(2) @MaxLength(160) organizationName!: string;
  @IsString() @MinLength(2) @MaxLength(80) country!: string;
  @IsString() @MinLength(2) @MaxLength(80) city!: string;
  @IsString() @Matches(/^[A-Za-z_]+\/[A-Za-z_/+-]+$|^UTC$/, { message: 'timezone must be an IANA time zone' }) @MaxLength(64) timezone!: string;
  @IsString() @MinLength(2) @MaxLength(120) contactName!: string;
  @IsEmail() @MaxLength(254) contactEmail!: string;
  @IsOptional() @IsString() @Matches(/^[+()0-9 .-]{6,40}$/, { message: 'contactPhone must be a phone number' }) contactPhone?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(6) @IsIn(SPECIALTIES, { each: true }) specialties!: string[];
  @Type(() => Number) @IsInt() @Min(1) @Max(500) therapistEstimate!: number;
  @Type(() => Number) @IsInt() @Min(0) @Max(5000) childEstimate!: number;
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
  @IsBoolean() @Equals(true, { message: 'You must confirm this environment uses synthetic data only' }) syntheticDataAcknowledged!: boolean;
}

export class StartReviewDto {
  @IsInt() @Min(1) version!: number;
}

export class DecisionDto {
  @IsIn(['APPROVED', 'REJECTED']) decision!: 'APPROVED' | 'REJECTED';
  @IsString() @MinLength(10, { message: 'Explain the decision in at least 10 characters' }) @MaxLength(2000) rationale!: string;
  @IsInt() @Min(1) version!: number;
}

export class ListApplicationsQuery {
  @IsOptional() @IsIn(['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'OPEN']) status?: string;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) page?: number;
}
