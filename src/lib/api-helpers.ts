import { NextResponse } from 'next/server';
import { getErrorMessage, requestContext } from './db';
import { DEFAULT_TIMEZONE, sanitizeTimezone } from './timezones';
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

export function getFilterInternal(searchParams: URLSearchParams): boolean {
  const value = searchParams.get('filterInternal') ?? searchParams.get('filterGridstatus');
  if (value === null) return true;
  return value !== 'false';
}

export function getFilterFree(searchParams: URLSearchParams): boolean {
  return getBooleanSearchParam(searchParams, 'filterFree', true);
}

export function jsonError(error: unknown, status: number = 500) {
  let errorMessage = getErrorMessage(error);
  
  // Enhance error message with stack trace information if available
  if (error instanceof Error && error.stack) {
    // Extract file paths and line numbers from stack trace
    const stackLines = error.stack.split('\n').slice(1); // Skip the error message line
    const relevantStack = stackLines
      .filter(line => line.includes('src/') && !line.includes('node_modules'))
      .slice(0, 5) // Limit to first 5 relevant stack frames
      .map(line => {
        // Extract file path and line number: "at functionName (file:line:col)" or "at file:line:col"
        const match = line.match(/at\s+(?:\w+\s+\()?([^\s]+):(\d+):(\d+)/);
        if (match) {
          const [, file, lineNum, col] = match;
          // Clean up file path to be relative to src/
          const cleanPath = file.replace(/^.*\/src\//, 'src/');
          return `${cleanPath}:${lineNum}:${col}`;
        }
        return line.trim();
      })
      .join('\n');
    
    if (relevantStack) {
      errorMessage = `${errorMessage}\n\nStack trace:\n${relevantStack}`;
    }
  }
  
  return NextResponse.json(
    { error: errorMessage },
    { status }
  );
}

export function formatMonthUtc(date: Date): string {
  return DateTime.fromJSDate(date).toFormat('yyyy-MM');
}

export function formatDateOnly(date: Date | null | undefined): string | null {
  if (!date) return null;
  const store = requestContext.getStore();
  const timezone = store?.timezone || DEFAULT_TIMEZONE;
  
  return DateTime.fromJSDate(new Date(date))
    .setZone(timezone)
    .toFormat('yyyy-MM-dd');
}

/**
 * Wraps an API route handler with request context (timezone, filterInternal, filterFree).
 * Values are read from searchParams so query functions can use them without being passed explicitly.
 *
 * Usage:
 * ```
 * export async function GET(request: Request) {
 *   const { searchParams } = new URL(request.url);
 *   return withRequestContext(searchParams, async () => {
 *     // your handler code here; filters come from context
 *   });
 * }
 * ```
 */
export async function withRequestContext<T>(
  searchParams: URLSearchParams,
  handler: () => Promise<T>
): Promise<T> {
  const timezone = sanitizeTimezone(searchParams.get('timezone'));
  const filterInternal = getFilterInternal(searchParams);
  const filterFree = getFilterFree(searchParams);
  return requestContext.run({ timezone, filterInternal, filterFree }, handler);
}

