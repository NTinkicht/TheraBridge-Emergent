import { Transform } from 'class-transformer';
import { ValidateBy, type ValidationArguments, type ValidationOptions } from 'class-validator';

// Calendar dates are date-only business values, not auto-normalizing timestamps.
export const isCalendarDateValue = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.slice(0, 4) === '0000') return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
};
export const IsCalendarDate = (options?: ValidationOptions) => ValidateBy({
  name: 'isCalendarDate',
  validator: {
    validate: isCalendarDateValue,
    defaultMessage: () => 'Enter a real calendar date in YYYY-MM-DD format.',
  },
}, options);

// Intl provides the authoritative IANA zone database bundled in the runtime;
// syntactically plausible but nonexistent names (for example Mars/Phobos) fail.
export const isIanaTimeZoneValue = (value: unknown): value is string => {
  if (typeof value !== 'string' || !value.trim() || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch (e) {
    if (e instanceof RangeError) return false;
    throw e;
  }
};
export const IsIanaTimeZone = (options?: ValidationOptions) => ValidateBy({
  name: 'isIanaTimeZone',
  validator: {
    validate: isIanaTimeZoneValue,
    defaultMessage: () => 'Choose a valid IANA time zone.',
  },
}, options);

// Apply only to human-entered, non-password fields.
export const TrimmedString = () => Transform(({ value }) => typeof value === 'string' ? value.trim() : value);

// The current model uses measure + baseline/target (not the superseded
// baselineProgressPct/targetProgressPct fields). A percent must lie in 0..100;
// non-percent counts/levels must still be nonnegative finite numbers.
export const IsGoalMeasureValue = (options?: ValidationOptions) => ValidateBy({
  name: 'isGoalMeasureValue',
  validator: {
    validate(value: unknown, args: ValidationArguments) {
      const measure = (args.object as { measure?: string }).measure;
      return typeof value === 'number' && Number.isFinite(value) && value >= 0 &&
        (measure !== 'percent' || value <= 100);
    },
    defaultMessage: () => 'Goal measurements must be finite and nonnegative; percentages must be between 0 and 100.',
  },
}, options);
