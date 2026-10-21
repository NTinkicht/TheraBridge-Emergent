import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { SPECIALTIES } from '../applications/applications.dto';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MEASURES = ['percent', 'count', 'level'] as const;

export class AreaDto {
  @IsString() @MinLength(2) @MaxLength(80) area!: string;
  @IsString() @MaxLength(1000) finding!: string;
}
export class AssessmentDto {
  @IsIn(SPECIALTIES) service!: string;
  @Matches(DATE) assessedOn!: string;
  @IsString() @MaxLength(4000) summary!: string;
  @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => AreaDto) areas!: AreaDto[];
}
export class AssessmentUpdateDto extends AssessmentDto {
  @IsInt() @Min(1) version!: number;
}
export class PlanDto {
  @IsIn(SPECIALTIES) service!: string;
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
}
export class GoalDto {
  @Matches(/^[a-z0-9-]{1,40}$/) key!: string;
  @IsString() @MinLength(3) @MaxLength(300) title!: string;
  @IsIn(MEASURES) measure!: string;
  @IsNumber() baseline!: number;
  @IsNumber() target!: number;
}
export class HomeActivityDto {
  @IsUUID() templateId!: string;
  @IsString() @MaxLength(80) frequency!: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class PlanVersionUpdateDto {
  @IsString() @MaxLength(4000) summary!: string;
  @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => GoalDto) goals!: GoalDto[];
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => HomeActivityDto) homeActivities!: HomeActivityDto[];
  @IsInt() @Min(1) version!: number;
}
export class ReviewDto {
  @IsString() @MinLength(3) @MaxLength(1000) comment!: string;
}
export class SessionNoteDto {
  @IsIn(SPECIALTIES) service!: string;
  @Matches(DATE) sessionDate!: string;
  @IsOptional() @IsUUID() appointmentId?: string;
}
export class SectionsDto {
  @IsOptional() @IsString() @MaxLength(4000) focus?: string;
  @IsOptional() @IsString() @MaxLength(4000) activities?: string;
  @IsOptional() @IsString() @MaxLength(4000) response?: string;
  @IsOptional() @IsString() @MaxLength(4000) nextSteps?: string;
}
export class SessionNoteUpdateDto {
  @ValidateNested() @Type(() => SectionsDto) sections!: SectionsDto;
  @IsInt() @Min(1) version!: number;
}
export class ObservationDto {
  @IsUUID() planVersionId!: string;
  @Matches(/^[a-z0-9-]{1,40}$/) goalKey!: string;
  @IsNumber() @Min(0) @Max(100000) value!: number;
  @Matches(DATE) observedOn!: string;
  @IsOptional() @IsUUID() sessionNoteId?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
export class TemplateDto {
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @IsIn(SPECIALTIES) service!: string;
  @IsString() @MinLength(1) @MaxLength(32) ageBand!: string;
  @IsInt() @Min(1) @Max(120) minutes!: number;
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(120, { each: true }) materials!: string[];
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MinLength(3, { each: true }) @MaxLength(400, { each: true }) steps!: string[];
  @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) @MinLength(3, { each: true }) @MaxLength(400, { each: true }) safety!: string[];
}
