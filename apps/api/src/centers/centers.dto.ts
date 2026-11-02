import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsDefined, IsObject, IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Matches, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { SPECIALTIES } from '../applications/applications.dto';
import { IsIanaTimeZone } from '../common/validators';
import { RESPONSIBILITIES, STAFF_ROLES } from './history';

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class InviteeDto {
  @trim() @IsEmail() @MaxLength(254) email!: string;
  @trim() @IsString() @MinLength(2) @MaxLength(120) displayName!: string;
}

export class CreateCenterDto {
  @trim() @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsOptional() @trim() @IsString() @Length(3, 64) @Matches(SLUG, { message: 'slug may contain lowercase letters, numbers and single dashes' }) slug?: string;
  @trim() @IsString() @MaxLength(64) @IsIanaTimeZone() timezone!: string;
  @trim() @IsString() @MinLength(2) @MaxLength(80) country!: string;
  @trim() @IsString() @MinLength(2) @MaxLength(80) city!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(6) @IsIn(SPECIALTIES, { each: true }) specialties!: string[];
  @IsOptional() @IsUUID() applicationId?: string;
  @IsDefined() @IsObject() @ValidateNested() @Type(() => InviteeDto) firstAdmin!: InviteeDto;
}

export class UpdateCenterDto {
  @IsOptional() @trim() @IsString() @MinLength(2) @MaxLength(160) name?: string;
  @IsOptional() @trim() @IsString() @MaxLength(64) @IsIanaTimeZone() timezone?: string;
  @IsOptional() @trim() @IsString() @MinLength(2) @MaxLength(80) country?: string;
  @IsOptional() @trim() @IsString() @MinLength(2) @MaxLength(80) city?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(6) @IsIn(SPECIALTIES, { each: true }) specialties?: string[];
  @IsInt() @Min(1) version!: number;
}

export class ListCentersQuery {
  @IsOptional() @IsIn(['ACTIVE', 'SUSPENDED']) status?: 'ACTIVE' | 'SUSPENDED';
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) page?: number;
}

class ProfileFields {
  @IsOptional() @trim() @IsString() @MaxLength(80) title?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsIn(SPECIALTIES, { each: true }) specialties?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsIn(RESPONSIBILITIES, { each: true }) responsibilities?: string[];
}

export class InviteStaffDto extends ProfileFields {
  @trim() @IsEmail() @MaxLength(254) email!: string;
  @trim() @IsString() @MinLength(2) @MaxLength(120) displayName!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @IsIn(STAFF_ROLES, { each: true, message: 'roles may only be COORDINATOR, THERAPIST or CLINICAL_SUPERVISOR' }) roles!: string[];
}

export class UpdateStaffDto extends ProfileFields {
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsIn(STAFF_ROLES, { each: true, message: 'roles may only be COORDINATOR, THERAPIST or CLINICAL_SUPERVISOR' }) roles?: string[];
  @IsOptional() @trim() @IsString() @Matches(/^$|^[+()0-9 .-]{6,40}$/, { message: 'phone must be a phone number' }) phone?: string;
}

export class UpdateProfileDto extends ProfileFields {
  @IsOptional() @trim() @IsString() @MinLength(2) @MaxLength(120) displayName?: string;
  @IsOptional() @trim() @IsString() @Matches(/^$|^[+()0-9 .-]{6,40}$/, { message: 'phone must be a phone number' }) phone?: string;
}

export class StatusChangeDto {
  @trim() @IsString() @MinLength(3, { message: 'Give a reason of at least 3 characters' }) @MaxLength(500) reason!: string;
}

export class ListStaffQuery {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsIn(['CENTER_ADMIN', ...STAFF_ROLES]) role?: string;
  @IsOptional() @IsIn(['ACTIVE', 'SUSPENDED', 'REVOKED']) status?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  @IsOptional() @IsIn(SPECIALTIES) specialty?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) page?: number;
}

export class TokenDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{20,128}$/, { message: 'This invitation link is not valid.' }) token!: string;
}

export class AcceptNewDto extends TokenDto {
  @trim() @IsString() @MinLength(2) @MaxLength(120) displayName!: string;
  @IsString() @MinLength(1) @MaxLength(256) password!: string;
}
