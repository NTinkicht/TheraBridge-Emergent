import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEmail, IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { SPECIALTIES } from '../applications/applications.dto';
import { IsCalendarDate } from '../common/validators';

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
export const RELATIONSHIPS = ['mother', 'father', 'parent', 'grandparent', 'legal_guardian', 'foster_parent', 'other'] as const;

export class ChildDto {
  @trim() @IsString() @MinLength(1) @MaxLength(80) firstName!: string;
  @trim() @IsString() @MinLength(1) @MaxLength(80) lastName!: string;
  @IsOptional() @trim() @IsString() @MaxLength(80) preferredName?: string;
  @IsCalendarDate() dateOfBirth!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(6) @IsIn(SPECIALTIES, { each: true }) services!: string[];
}

export class UpdateChildDto {
  @IsOptional() @trim() @IsString() @MinLength(1) @MaxLength(80) firstName?: string;
  @IsOptional() @trim() @IsString() @MinLength(1) @MaxLength(80) lastName?: string;
  @IsOptional() @trim() @IsString() @MaxLength(80) preferredName?: string;
  @IsOptional() @IsCalendarDate() dateOfBirth?: string;
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

// Centre-admin-only child-wide care coordination, not a clinical approval role.
export class ReferentDto {
  @IsOptional() @IsUUID() membershipId!: string | null;
  @IsInt() @Min(1) version!: number;
  @trim() @IsString() @MinLength(3) @MaxLength(500) reason!: string;
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

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const THREAD_CATEGORIES = ['scheduling', 'attendance', 'logistics', 'other'] as const;

export class SeriesDto {
  @IsUUID() childId!: string;
  @IsUUID() membershipId!: string;
  @IsIn(SPECIALTIES) service!: string;
  @IsOptional() @trim() @IsString() @MaxLength(80) room?: string;
  @IsCalendarDate() startDate!: string;
  @Matches(TIME, { message: 'startTime must be HH:MM' }) startTime!: string;
  @IsInt() @Min(15) @Max(480) durationMinutes!: number;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true }) weekdays!: number[];
  @IsInt() @Min(1) @Max(4) intervalWeeks!: number;
  @IsOptional() @IsCalendarDate() untilDate?: string;
  @IsOptional() @IsInt() @Min(1) @Max(60) count?: number;
  @IsOptional() @IsBoolean() skipConflicts?: boolean;
}

export class SeriesUpdateDto {
  @IsCalendarDate() fromDate!: string;
  @IsOptional() @Matches(TIME, { message: 'startTime must be HH:MM' }) startTime?: string;
  @IsOptional() @IsInt() @Min(15) @Max(480) durationMinutes?: number;
  @IsOptional() @IsUUID() membershipId?: string;
  @IsOptional() @trim() @IsString() @MaxLength(80) room?: string;
  @IsInt() @Min(1) version!: number;
}

export class SeriesCancelDto {
  @IsCalendarDate() fromDate!: string;
  @trim() @IsString() @MinLength(3, { message: 'Give a reason of at least 3 characters' }) @MaxLength(500) reason!: string;
}

export const THREAD_AUDIENCES = ['GUARDIAN', 'CARE_TEAM', 'SPECIALTY'] as const;

export class ThreadDto {
  @IsUUID() childId!: string;
  @IsOptional() @IsUUID() guardianLinkId?: string;
  @IsOptional() @IsIn(THREAD_AUDIENCES) audience?: typeof THREAD_AUDIENCES[number];
  @IsOptional() @IsIn(SPECIALTIES) service?: string;
  @IsIn(THREAD_CATEGORIES) category!: string;
  @trim() @IsString() @MinLength(3, { message: 'Give the conversation a subject of at least 3 characters' }) @MaxLength(120) subject!: string;
  @trim() @IsString() @MinLength(1, { message: 'Write a message' }) @MaxLength(2000) body!: string;
}

export class MessageDto {
  @trim() @IsString() @MinLength(1, { message: 'Write a message' }) @MaxLength(2000) body!: string;
}

export class ThreadListQuery {
  @IsOptional() @IsIn(['OPEN', 'CLOSED']) status?: 'OPEN' | 'CLOSED';
  @IsOptional() @IsUUID() childId?: string;
}

export class FamilyPreferenceDto {
  @IsUUID() childId!: string;
  @IsBoolean() reminders!: boolean;
}
