import { IsIn, IsString, Matches } from 'class-validator';

export const PROBE_SOURCES = ['web-preview', 'api-test', 'cli'] as const;
export type ProbeSource = (typeof PROBE_SOURCES)[number];

export class CreateProbeDto {
  @IsString()
  @Matches(/^[A-Za-z0-9 _.:-]{1,64}$/, { message: 'label must be 1-64 characters: letters, digits, space, _ . : -' })
  label!: string;

  @IsIn(PROBE_SOURCES)
  source!: ProbeSource;
}
