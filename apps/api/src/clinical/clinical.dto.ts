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
  @IsString() @MinLength(3, { message: 'Write a summary of at least 3 characters' }) @MaxLength(4000) summary!: string;
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
  // Optional for historical drafts. New therapist-linked activities must
  // reference a goal key defined in their containing plan version.
  @IsOptional() @Matches(/^[a-z0-9-]{1,40}$/) goalKey?: string;
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
  @IsInt() @Min(1) version!: number;
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
export class ProgressQueryDto {
  @IsOptional() @IsUUID() childId?: string;
  @IsOptional() @IsIn(SPECIALTIES) service?: string;
  @IsOptional() @Matches(/^[a-z0-9-]{1,40}$/) goalKey?: string;
  @IsOptional() @Matches(DATE) from?: string;
  @IsOptional() @Matches(DATE) to?: string;
}
export class OutcomeDto {
  @IsUUID() childId!: string;
  @IsUUID() templateId!: string;
  @Matches(DATE) practiceDate!: string;
  @IsIn(['COMPLETED', 'NEEDED_HELP', 'NOT_COMPLETED', 'SKIPPED']) choice!: string;
  @IsUUID() idempotencyKey!: string;
}
export class PracticeWeekDto {
  @IsOptional() @Matches(DATE) week?: string;
  @IsOptional() @IsUUID() childId?: string;
}
export class FeedbackQueryDto {
  @IsOptional() @IsUUID() childId?: string;
  @IsOptional() @IsUUID() templateId?: string;
  @IsOptional() @IsIn(['COMPLETED', 'NEEDED_HELP', 'NOT_COMPLETED', 'SKIPPED']) choice?: string;
  @IsOptional() @IsIn(['new', 'acknowledged']) status?: string;
  @IsOptional() @Matches(DATE) from?: string;
  @IsOptional() @Matches(DATE) to?: string;
}
export class ReportCreateDto {
  @IsIn(SPECIALTIES) service!: string;
  @IsString() @MinLength(3, { message: 'Give the report a title of at least 3 characters' }) @MaxLength(120) title!: string;
  @Matches(DATE) periodStart!: string;
  @Matches(DATE) periodEnd!: string;
}
export class ReportSectionsDto {
  @IsOptional() @IsString() @MaxLength(8000) summary?: string;
  @IsOptional() @IsString() @MaxLength(8000) assessment?: string;
  @IsOptional() @IsString() @MaxLength(8000) goals?: string;
  @IsOptional() @IsString() @MaxLength(8000) sessions?: string;
  @IsOptional() @IsString() @MaxLength(8000) recommendations?: string;
  @IsOptional() @IsString() @MaxLength(4000) familySummary?: string;
}
export class ReportSaveDto {
  @ValidateNested() @Type(() => ReportSectionsDto) sections!: ReportSectionsDto;
  @IsInt() @Min(1) version!: number;
}
export class ReportVersionDto {
  @IsInt() @Min(1) version!: number;
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

/** Edit the author's centre-owned activity; specialty cannot be changed in place. */
export class TemplateUpdateDto {
  @IsInt() @Min(1) version!: number;
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @IsString() @MinLength(1) @MaxLength(32) ageBand!: string;
  @IsInt() @Min(1) @Max(120) minutes!: number;
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(120, { each: true }) materials!: string[];
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MinLength(3, { each: true }) @MaxLength(400, { each: true }) steps!: string[];
  @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) @MinLength(3, { each: true }) @MaxLength(400, { each: true }) safety!: string[];
}

/** Duplicates content into a newly owned, centre-scoped activity. */
export class TemplateCopyDto {
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
}


/** Each claim is explicitly linked by its therapist to verifiable source keys. */
export class SuggestionClaimDto {
  @IsString() @MinLength(3) @MaxLength(1200) text!: string;
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MinLength(3, { each: true }) @MaxLength(150, { each: true }) sourceRefs!: string[];
}
export class ReportSuggestionDecisionDto {
  @IsIn(['assessment', 'goals', 'sessions']) section!: 'assessment' | 'goals' | 'sessions';
  @IsIn(['APPLIED', 'OMITTED', 'RECONSIDERED']) action!: 'APPLIED' | 'OMITTED' | 'RECONSIDERED';
  @IsInt() @Min(1) version!: number;
  @IsUUID() idempotencyKey!: string;
  @IsString() @MinLength(64) @MaxLength(64) @Matches(/^[a-f0-9]{64}$/) proposalFingerprint!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => SuggestionClaimDto) claims?: SuggestionClaimDto[];
}
