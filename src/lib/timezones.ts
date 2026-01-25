/**
 * Valid timezone options for the analytics dashboard.
 * These are validated on the server side to prevent SQL injection.
 */
export const VALID_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
] as const;

export type ValidTimezone = (typeof VALID_TIMEZONES)[number]['value'];

const VALID_TIMEZONE_VALUES: Set<string> = new Set(VALID_TIMEZONES.map((t) => t.value));

export function isValidTimezone(tz: string): tz is ValidTimezone {
  return VALID_TIMEZONE_VALUES.has(tz);
}

/**
 * Sanitize timezone input, returning UTC if invalid.
 * This prevents SQL injection by only allowing whitelisted values.
 */
export function sanitizeTimezone(tz: string | null | undefined): ValidTimezone {
  if (tz && isValidTimezone(tz)) {
    return tz;
  }
  return 'UTC';
}

