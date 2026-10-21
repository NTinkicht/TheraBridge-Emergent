import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

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
