import { IsIn } from 'class-validator';

export const PROBE_SOURCES = ['web-preview', 'api-test', 'cli'] as const;
export type ProbeSource = (typeof PROBE_SOURCES)[number];

// Clients send no free text: the label is generated server-side so the table can only ever hold synthetic values.
export class CreateProbeDto {
  @IsIn(PROBE_SOURCES)
  source!: ProbeSource;
}
