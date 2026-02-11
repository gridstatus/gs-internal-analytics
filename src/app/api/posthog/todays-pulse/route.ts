import { NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { requestContext } from '@/lib/db';
import { loadRenderedHogql } from '@/lib/queries';
import { runPosthogQuery, PostHogThrottledError } from '@/lib/posthog';
import { sanitizeTimezone } from '@/lib/timezones';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const timezone = sanitizeTimezone(requestContext.getStore()?.timezone);
      const nowInTz = DateTime.now().setZone(timezone);
      const startOfTodayInTz = nowInTz.startOf('day');
      const startOfYesterdayInTz = startOfTodayInTz.minus({ days: 1 });
      const startOfLastWeekInTz = startOfTodayInTz.minus({ weeks: 1 });
      const endOfLastWeekInTz = startOfLastWeekInTz.plus({ days: 1 });

      const fmt = (dt: DateTime) => dt.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
      const dateFilters = {
        today: `timestamp >= parseDateTimeBestEffort('${fmt(startOfTodayInTz)}') AND timestamp < now()`,
        yesterday: `timestamp >= parseDateTimeBestEffort('${fmt(startOfYesterdayInTz)}') AND timestamp < parseDateTimeBestEffort('${fmt(startOfTodayInTz)}')`,
        lastWeek: `timestamp >= parseDateTimeBestEffort('${fmt(startOfLastWeekInTz)}') AND timestamp < parseDateTimeBestEffort('${fmt(endOfLastWeekInTz)}')`,
      };

      const [todayRows, yesterdayRows, lastWeekRows] = await Promise.all([
        runPosthogQuery(
          loadRenderedHogql('hourly-active-users.hogql', {
            dateFilter: dateFilters.today,
          })
        ),
        runPosthogQuery(
          loadRenderedHogql('hourly-active-users.hogql', {
            dateFilter: dateFilters.yesterday,
          })
        ),
        runPosthogQuery(
          loadRenderedHogql('hourly-active-users.hogql', {
            dateFilter: dateFilters.lastWeek,
          })
        ),
      ]);

      type HourRow = { hour: string; raw: number; cum: number };
      const toHourRows = (rows: unknown[][]): HourRow[] => {
        let cum = 0;
        return (rows as [string, number][]).map(([hour, active_users]) => {
          const raw = Number(active_users);
          cum += raw;
          return {
            hour: typeof hour === 'string' ? hour : new Date(hour).toISOString(),
            raw,
            cum,
          };
        });
      };

      const today = toHourRows(todayRows);
      const yesterday = toHourRows(yesterdayRows);
      const lastWeek = toHourRows(lastWeekRows);

      const yesterdayRawByHour = new Map<number, number>();
      const yesterdayCumByHour = new Map<number, number>();
      yesterday.forEach((r) => {
        const h = new Date(r.hour).getUTCHours();
        yesterdayRawByHour.set(h, r.raw);
        yesterdayCumByHour.set(h, r.cum);
      });
      const lastWeekRawByHour = new Map<number, number>();
      const lastWeekCumByHour = new Map<number, number>();
      lastWeek.forEach((r) => {
        const h = new Date(r.hour).getUTCHours();
        lastWeekRawByHour.set(h, r.raw);
        lastWeekCumByHour.set(h, r.cum);
      });

      const hourlyPulse = today.map((r) => {
        const hourOfDay = new Date(r.hour).getUTCHours();
        return {
          hour: r.hour,
          todayRaw: r.raw,
          yesterdayRaw: yesterdayRawByHour.get(hourOfDay) ?? 0,
          lastWeekRaw: lastWeekRawByHour.get(hourOfDay) ?? 0,
          todayCum: r.cum,
          yesterdayCum: yesterdayCumByHour.get(hourOfDay) ?? 0,
          lastWeekCum: lastWeekCumByHour.get(hourOfDay) ?? 0,
        };
      });

      return NextResponse.json({ hourlyPulse });
    } catch (error) {
      console.error('Error fetching today\'s pulse:', error);
      if (error instanceof PostHogThrottledError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      return jsonError(error);
    }
  });
}
