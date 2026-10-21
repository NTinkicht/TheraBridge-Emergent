import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { SPECIALTIES } from '../applications/applications.dto';

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
export const RELATIONSHIPS = ['mother', 'father', 'parent', 'grandparent', 'legal_guardian', 'foster_parent', 'other'] as const;

export class ChildDto {
  @trim() @IsString() @MinLength(1) @MaxLength(80) firstName!: string;
  @trim() @IsString() @MinLength(1) @MaxLength(80) lastName!: string;
  @IsOptional() @trim() @IsString() @MaxLength(80) preferredName?: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be YYYY-MM-DD' }) dateOfBirth!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(6) @IsIn(SPECIALTIES, { each: true }) services!: string[];
}

export class UpdateChildDto {
  @IsOptional() @trim() @IsString() @MinLength(1) @MaxLength(80) firstName?: string;
  @IsOptional() @trim() @IsString() @MinLength(1) @MaxLength(80) lastName?: string;
  @IsOptional() @trim() @IsString() @MaxLength(80) preferredName?: string;
  @IsOptional() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) dateOfBirth?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(6) @IsIn(SPECIALTIES, { each: true }) services?: string[];
  @IsInt() @Min(1) version!: number;
}

export class ListChildrenQuery {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(['ACTIVE', 'ARCHIVED']) status?: 'ACTIVE' | 'ARCHIVED';
}

export class GuardianDto {
  @trim() @IsString() @MinLength(2) @MaxLength(120) displayName!: string;
  @trim() @IsEmail() @MaxLength(254) email!: string;
  @IsIn(RELATIONSHIPS) relationship!: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsBoolean() invite?: boolean;
}

export class AssignmentDto {
  @IsUUID() membershipId!: string;
  @IsIn(SPECIALTIES) service!: string;
  @IsOptional() @IsBoolean() isLead?: boolean;
}

export class ReasonDto {
  @trim() @IsString() @MinLength(3, { message: 'Give a reason of at least 3 characters' }) @MaxLength(500) reason!: string;
}

export class AppointmentDto {
  @IsUUID() childId!: string;
  @IsUUID() membershipId!: string;
  @IsIn(SPECIALTIES) service!: string;
  @IsISO8601({ strict: true }) startsAt!: string;
  @IsISO8601({ strict: true }) endsAt!: string;
  @IsOptional() @trim() @IsString() @MaxLength(80) room?: string;
}

export class RescheduleDto {
  @IsOptional() @IsUUID() membershipId?: string;
  @IsOptional() @IsISO8601({ strict: true }) startsAt?: string;
  @IsOptional() @IsISO8601({ strict: true }) endsAt?: string;
  @IsOptional() @trim() @IsString() @MaxLength(80) room?: string;
  @IsInt() @Min(1) version!: number;
}

export class AppointmentStatusDto {
  @IsIn(['COMPLETED', 'CANCELLED', 'NO_SHOW']) status!: 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  @IsOptional() @trim() @IsString() @MinLength(3, { message: 'Give a reason of at least 3 characters' }) @MaxLength(500) reason?: string;
}

export class RangeQuery {
  @IsISO8601({ strict: true }) from!: string;
  @IsISO8601({ strict: true }) to!: string;
  @IsOptional() @IsUUID() membershipId?: string;
  @IsOptional() @IsUUID() childId?: string;
}

export class ExtendTrialDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(90) days!: number;
  @trim() @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}
