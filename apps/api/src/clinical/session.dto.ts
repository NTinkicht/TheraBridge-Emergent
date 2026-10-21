import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsISO8601, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { SessionNoteDto, SectionsDto } from './clinical.dto';

export class SessionStartDto extends SessionNoteDto {
  @IsUUID() startKey!: string;
  @IsISO8601({ strict: true }) actualStart!: string;
}
export class SessionActivityDto {
  @IsUUID() id!: string;
  @IsUUID() templateId!: string;
  @IsInt() @Min(0) @Max(480) minutes!: number;
  @IsString() @MaxLength(300) objective!: string;
  @IsOptional() @IsUUID() planVersionId?: string;
  @IsOptional() @IsString() @MaxLength(40) goalKey?: string;
  @IsIn(['NOT_STARTED', 'COMPLETED', 'SKIPPED']) completion!: string;
  @IsOptional() @IsIn(['ACHIEVED', 'PARTIAL', 'NOT_ACHIEVED']) outcome?: string;
  @IsOptional() @IsIn(['INDEPENDENT', 'SOME_ASSISTANCE', 'SUBSTANTIAL_ASSISTANCE']) assistance?: string;
  @IsString() @MaxLength(1000) observation!: string;
}
export class SessionSaveDto {
  @IsInt() @Min(1) version!: number;
  @IsUUID() mutationKey!: string;
  @ValidateNested() @Type(() => SectionsDto) sections!: SectionsDto;
  @IsArray() @ArrayMaxSize(30) @ValidateNested({ each: true }) @Type(() => SessionActivityDto) activities!: SessionActivityDto[];
  @IsISO8601({ strict: true }) actualStart!: string;
  @IsOptional() @IsISO8601({ strict: true }) actualEnd?: string;
  @IsIn(['PRESENT', 'NO_SHOW']) attendance!: string;
  @IsIn(['IN_PROGRESS', 'COMPLETED']) executionStatus!: string;
}
