import { NextResponse } from 'next/server';
import { getErrorMessage, requestContext } from './db';
import { sanitizeTimezone } from './timezones';
import { DateTime } from 'luxon';

export function getBooleanSearchParam(
  searchParams: URLSearchParams,
  key: string,
  defaultValue: boolean = true
): boolean {
  const value = searchParams.get(key);
  if (value === null) return defaultValue;
  return value !== 'false';
}

export function getFilterGridstatus(searchParams: URLSearchParams): boolean {
  return getBooleanSearchParam(searchParams, 'filterGridstatus', true);
}

export function jsonError(error: unknown, status: number = 500) {
  return NextResponse.json(
    { error: getErrorMessage(error) },
    { status }
  );
}

export function formatMonthUtc(date: Date): string {
  return DateTime.fromJSDate(date).toFormat('yyyy-MM');
}

export function formatDateOnly(date: Date | null | undefined): string | null {
  if (!date) return null;
  const store = requestContext.getStore();
  const timezone = store?.timezone || 'UTC';
  
  return DateTime.fromJSDate(new Date(date))
    .setZone(timezone)
    .toFormat('yyyy-MM-dd');
}

/**
 * Wraps an API route handler with request context that sets timezone.
 * The timezone is read from searchParams and sanitized to prevent SQL injection.
 * 
 * Usage:
 * ```
 * export async function GET(request: Request) {
 *   const { searchParams } = new URL(request.url);
 *   return withRequestContext(searchParams, async () => {
 *     // your handler code here
 *   });
 * }
 * ```
 */
export async function withRequestContext<T>(
  searchParams: URLSearchParams,
  handler: () => Promise<T>
): Promise<T> {
  const timezone = sanitizeTimezone(searchParams.get('timezone'));
  return requestContext.run({ timezone }, handler);
}

