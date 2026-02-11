/**
 * TEMP: Debug endpoint to inspect per-day counts (same time-of-day window).
 * Use to verify 7-day vs 30-day totals. Remove before merge / add back to auth.
 * GET /api/debug-daily-counts — no auth required.
 * GET /api/debug-daily-counts?path=/live — per-day views for that path (logged-in, same as "Pages with most views").
 * Optional ?timezone=America/Chicago for timezone-aware same-time-of-day window.
 */
import { NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { loadRenderedHogql } from '@/lib/queries';
import { runPosthogQuery } from '@/lib/posthog';
import { sanitizeTimezone } from '@/lib/timezones';

const dateFilter = 'timestamp >= now() - INTERVAL 30 DAY';

function getSameTimeOfDayFilter(timezone: string): string {
  const nowInTz = DateTime.now().setZone(timezone);
  const startOfTodayInTz = nowInTz.startOf('day');
  const secondsSinceMidnight = Math.floor(nowInTz.diff(startOfTodayInTz, 'seconds').seconds);
  return `timestamp < toStartOfDay(timestamp, '${timezone}') + toIntervalSecond(${secondsSinceMidnight})`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') ?? '';
    const timezone = sanitizeTimezone(searchParams.get('timezone'));
    const sameTimeOfDayFilter = getSameTimeOfDayFilter(timezone);

    const baseContext = {
      dateFilter,
      sameTimeOfDayFilter,
      filterInternal: false,
      filterFree: false,
    };

    if (path) {
      const hogql = loadRenderedHogql('debug-daily-views-by-path.hogql', {
        ...baseContext,
        pathname: path,
      });
      const rows = (await runPosthogQuery(hogql)) as [string, number][];
      const days = rows.map(([day, views]) => ({
        day: typeof day === 'string' ? day : new Date(day).toISOString().slice(0, 10),
        views: Number(views ?? 0),
      }));

      const sumLast30 = days.reduce((s, d) => s + d.views, 0);
      const sumLast7 = days.length >= 7 ? days.slice(-7).reduce((s, d) => s + d.views, 0) : null;

      return NextResponse.json({
        note: `TEMP debug: per-day views for path="${path}" (same time window, logged-in). Remove endpoint before merge.`,
        path,
        days,
        sumLast30,
        sumLast7,
        avg7FromLast7Days: sumLast7 !== null ? Math.round((sumLast7 / 7) * 10) / 10 : null,
        avg30FromLast30Days: days.length > 0 ? Math.round((sumLast30 / 30) * 10) / 10 : null,
      });
    }

    const hogql = loadRenderedHogql('debug-daily-active-users.hogql', baseContext);
    const rows = (await runPosthogQuery(hogql)) as [string, number][];
    const days = rows.map(([day, uniqueUsers]) => ({
      day: typeof day === 'string' ? day : new Date(day).toISOString().slice(0, 10),
      uniqueUsers: Number(uniqueUsers ?? 0),
    }));

    const sumLast30 = days.reduce((s, d) => s + d.uniqueUsers, 0);
    const sumLast7 = days.length >= 7 ? days.slice(-7).reduce((s, d) => s + d.uniqueUsers, 0) : null;

    return NextResponse.json({
      note: 'TEMP debug: per-day unique users (same time window). Remove endpoint before merge.',
      days,
      sumLast30,
      sumLast7,
      avg7FromLast7Days: sumLast7 !== null ? Math.round((sumLast7 / 7) * 10) / 10 : null,
      avg30FromLast30Days: days.length > 0 ? Math.round((sumLast30 / 30) * 10) / 10 : null,
    });
  } catch (error) {
    console.error('debug-daily-counts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
