import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { CENTER_ROLES } from './policy';

export class LoginDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(1) @MaxLength(1024) password!: string;
}

export class ForgotPasswordDto {
  @IsEmail() @MaxLength(254) email!: string;
}

export class ResetPasswordDto {
  @IsString() @MinLength(20) @MaxLength(128) token!: string;
  @IsString() @MaxLength(1024) password!: string;
}

export class ChangePasswordDto {
  @IsString() @MaxLength(1024) currentPassword!: string;
  @IsString() @MaxLength(1024) newPassword!: string;
}

export class SelectContextDto {
  @IsOptional() @IsBoolean() platform?: boolean;
  @IsOptional() @IsUUID() membershipId?: string;
  @IsOptional() @IsIn(CENTER_ROLES) role?: (typeof CENTER_ROLES)[number];
}
