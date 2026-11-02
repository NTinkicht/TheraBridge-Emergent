import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { SPECIALTIES } from '../applications/applications.dto';
import { IsCalendarDate, IsGoalMeasureValue, TrimmedString } from '../common/validators';

export const MEASURES = ['percent', 'count', 'level'] as const;

// TB-EM-048 fixed-shape operational requests: no free text, no draft content.
export class HomePlanRequestDto {
  @IsUUID() childId!: string;
  @IsIn(SPECIALTIES) service!: string;
  @IsUUID() requestKey!: string;
}
export class HomePlanRequestResponseDto {
  @IsIn(['ACKNOWLEDGED', 'CLOSED_UNAVAILABLE']) status!: 'ACKNOWLEDGED' | 'CLOSED_UNAVAILABLE';
}

export class ReviewQueueQueryDto {
  @IsOptional() @IsUUID() childId?: string;
  @IsOptional() @IsIn(SPECIALTIES) service?: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page?: number;
}

export class AreaDto {
  @TrimmedString() @IsString() @MinLength(2) @MaxLength(80) area!: string;
  @TrimmedString() @IsString() @MinLength(1) @MaxLength(1000) finding!: string;
}
export class AssessmentDto {
  @IsIn(SPECIALTIES) service!: string;
  @IsCalendarDate() assessedOn!: string;
  @TrimmedString() @IsString() @MinLength(3, { message: 'Write a summary of at least 3 characters' }) @MaxLength(4000) summary!: string;
  @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => AreaDto) areas!: AreaDto[];
}
export class AssessmentUpdateDto extends AssessmentDto {
  @IsInt() @Min(1) version!: number;
}
export class PlanDto {
  @IsIn(SPECIALTIES) service!: string;
  @TrimmedString() @IsString() @MinLength(3) @MaxLength(120) title!: string;
}
export class GoalDto {
  @Matches(/^[a-z0-9-]{1,40}$/) key!: string;
  // Legacy persisted goal titles were permitted up to 300 characters.
  // The service enforces 200 on newly authored/redefined titles while allowing
  // byte-identical round trips of earlier measured/checkpointed goals.
  @TrimmedString() @IsString() @MinLength(3) @MaxLength(300) title!: string;
  @IsIn(MEASURES) measure!: string;
  @IsNumber() @IsGoalMeasureValue() baseline!: number;
  @IsNumber() @IsGoalMeasureValue() target!: number;
  // Optional for legacy and imported drafts; these are planning targets,
  // not independently validated clinical outcomes.
  @IsOptional() @IsIn(['SHORT_TERM', 'LONG_TERM']) horizon?: 'SHORT_TERM' | 'LONG_TERM';
  @IsOptional() @IsCalendarDate() targetOn?: string;
  @IsOptional() @IsCalendarDate() reviewOn?: string;
}
export class ActivityScheduleDto {
  @IsIn(['WEEKLY', 'MONTHLY']) cadence!: 'WEEKLY' | 'MONTHLY';
  @IsCalendarDate() startsOn!: string;
  @IsCalendarDate() endsOn!: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7)
  @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true })
  weekdays?: number[];
  @IsOptional() @IsInt() @Min(1) @Max(31) monthDay?: number;
}
export class HomeActivityDto {
  @IsUUID() templateId!: string;
  // Optional for historical drafts. New therapist-linked activities must
  // reference a goal key defined in their containing plan version.
  @IsOptional() @Matches(/^[a-z0-9-]{1,40}$/) goalKey?: string;
  @TrimmedString() @IsString() @MinLength(1) @MaxLength(80) frequency!: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(500) note?: string;
  // Optional per-plan duration; never changes the server-owned library snapshot.
  @ValidateIf((_object, value) => value !== undefined) @IsInt() @Min(1) @Max(120) durationMinutes?: number;
  @IsOptional() @ValidateNested() @Type(() => ActivityScheduleDto)
  schedule?: ActivityScheduleDto;
}
export class PlanVersionUpdateDto {
  @TrimmedString() @IsString() @MaxLength(4000) summary!: string;
  @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => GoalDto) goals!: GoalDto[];
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => HomeActivityDto) homeActivities!: HomeActivityDto[];
  @IsInt() @Min(1) version!: number;
}
// A checkpoint is an internal therapist-authored review *record*, not a goal
// outcome or supervisor authorization. Observation sources are UUIDs only.
export class GoalReviewCheckpointDto {
  @Matches(/^[a-z0-9-]{1,40}$/) goalKey!: string;
  @IsCalendarDate() reviewedOn!: string;
  @TrimmedString() @IsString() @MinLength(10) @MaxLength(1000) summary!: string;
  @IsArray() @ArrayMaxSize(20) @IsUUID('4', { each: true }) observationIds!: string[];
  @IsInt() @Min(1) version!: number;
}

export class ReviewDto {
  @IsInt() @Min(1) version!: number;
  @TrimmedString() @IsString() @MinLength(3) @MaxLength(1000) comment!: string;
}
export class SessionNoteDto {
  @IsIn(SPECIALTIES) service!: string;
  @IsCalendarDate() sessionDate!: string;
  @IsOptional() @IsUUID() appointmentId?: string;
}
export class SectionsDto {
  @IsOptional() @TrimmedString() @IsString() @MaxLength(4000) focus?: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(4000) activities?: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(4000) response?: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(4000) nextSteps?: string;
}
export class SessionNoteUpdateDto {
  @ValidateNested() @Type(() => SectionsDto) sections!: SectionsDto;
  @IsInt() @Min(1) version!: number;
}
export class ObservationDto {
  @IsUUID() planVersionId!: string;
  @Matches(/^[a-z0-9-]{1,40}$/) goalKey!: string;
  @IsNumber() @Min(0) @Max(100000) value!: number;
  @IsCalendarDate() observedOn!: string;
  @IsOptional() @IsUUID() sessionNoteId?: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(500) note?: string;
}
export class ProgressQueryDto {
  @IsOptional() @IsUUID() childId?: string;
  @IsOptional() @IsIn(SPECIALTIES) service?: string;
  @IsOptional() @Matches(/^[a-z0-9-]{1,40}$/) goalKey?: string;
  @IsOptional() @IsCalendarDate() from?: string;
  @IsOptional() @IsCalendarDate() to?: string;
}
export class OutcomeDto {
  @IsUUID() childId!: string;
  @IsUUID() templateId!: string;
  @IsCalendarDate() practiceDate!: string;
  @IsIn(['COMPLETED', 'NEEDED_HELP', 'NOT_COMPLETED', 'SKIPPED']) choice!: string;
  @IsUUID() idempotencyKey!: string;
}
export class PracticeWeekDto {
  @IsOptional() @IsCalendarDate() week?: string;
  @IsOptional() @IsUUID() childId?: string;
}
export class FeedbackQueryDto {
  @IsOptional() @IsUUID() childId?: string;
  @IsOptional() @IsUUID() templateId?: string;
  @IsOptional() @IsIn(['COMPLETED', 'NEEDED_HELP', 'NOT_COMPLETED', 'SKIPPED']) choice?: string;
  @IsOptional() @IsIn(['new', 'acknowledged']) status?: string;
  @IsOptional() @IsCalendarDate() from?: string;
  @IsOptional() @IsCalendarDate() to?: string;
}
export class ReportCreateDto {
  @IsIn(SPECIALTIES) service!: string;
  @TrimmedString() @IsString() @MinLength(3, { message: 'Give the report a title of at least 3 characters' }) @MaxLength(120) title!: string;
  @IsCalendarDate() periodStart!: string;
  @IsCalendarDate() periodEnd!: string;
}
// Only recorded, immutable report-version goal identities are accepted.
// Clients never post their own goal text, measurements, or clinical advice.
export class ReportPlanGoalRefDto {
  @IsUUID() planVersionId!: string;
  @Matches(/^[a-z0-9-]{1,40}$/) goalKey!: string;
}
export class ReportToPlanDraftDto {
  @IsUUID() sourceReportVersionId!: string;
  @IsUUID() requestId!: string;
  @IsInt() @Min(1) reportRevision!: number;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @TrimmedString() @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12)
  @ValidateNested({ each: true }) @Type(() => ReportPlanGoalRefDto)
  selectedGoals!: ReportPlanGoalRefDto[];
}

export class ReportSectionsDto {
  @IsOptional() @TrimmedString() @IsString() @MaxLength(8000) summary?: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(8000) assessment?: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(8000) goals?: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(8000) sessions?: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(8000) recommendations?: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(4000) familySummary?: string;
}
export class ReportSaveDto {
  @ValidateNested() @Type(() => ReportSectionsDto) sections!: ReportSectionsDto;
  @IsInt() @Min(1) version!: number;
}
export class ReportVersionDto {
  @IsInt() @Min(1) version!: number;
}
export class TemplateDto {
  @TrimmedString() @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @IsIn(SPECIALTIES) service!: string;
  @TrimmedString() @IsString() @MinLength(1) @MaxLength(32) ageBand!: string;
  @IsInt() @Min(1) @Max(120) minutes!: number;
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(120, { each: true }) materials!: string[];
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MinLength(3, { each: true }) @MaxLength(400, { each: true }) steps!: string[];
  @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) @MinLength(3, { each: true }) @MaxLength(400, { each: true }) safety!: string[];
}

/** Edit the author's centre-owned activity; specialty cannot be changed in place. */
export class TemplateUpdateDto {
  @IsInt() @Min(1) version!: number;
  @TrimmedString() @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @TrimmedString() @IsString() @MinLength(1) @MaxLength(32) ageBand!: string;
  @IsInt() @Min(1) @Max(120) minutes!: number;
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(120, { each: true }) materials!: string[];
  @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MinLength(3, { each: true }) @MaxLength(400, { each: true }) steps!: string[];
  @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) @MinLength(3, { each: true }) @MaxLength(400, { each: true }) safety!: string[];
}

/** Duplicates content into a newly owned, centre-scoped activity. */
export class TemplateCopyDto {
  @TrimmedString() @IsString() @MinLength(3) @MaxLength(120) title!: string;
}


/** Each claim is explicitly linked by its therapist to verifiable source keys. */
export class SuggestionClaimDto {
  @TrimmedString() @IsString() @MinLength(3) @MaxLength(1200) text!: string;
  @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @MinLength(3, { each: true }) @MaxLength(150, { each: true }) sourceRefs!: string[];
}
export class ReportSuggestionDecisionDto {
  @IsIn(['assessment', 'goals', 'sessions']) section!: 'assessment' | 'goals' | 'sessions';
  @IsIn(['APPLIED', 'OMITTED', 'RECONSIDERED']) action!: 'APPLIED' | 'OMITTED' | 'RECONSIDERED';
  @IsInt() @Min(1) version!: number;
  @IsUUID() idempotencyKey!: string;
  @TrimmedString() @IsString() @MinLength(64) @MaxLength(64) @Matches(/^[a-f0-9]{64}$/) proposalFingerprint!: string;
  @IsOptional() @TrimmedString() @IsString() @MaxLength(500) reason?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => SuggestionClaimDto) claims?: SuggestionClaimDto[];
}
