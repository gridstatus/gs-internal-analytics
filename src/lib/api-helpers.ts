import { NextResponse } from 'next/server';
import { getErrorMessage } from './db';

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
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatDateOnly(date: Date | null | undefined): string | null {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
}

