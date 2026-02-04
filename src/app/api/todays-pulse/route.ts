import { NextResponse } from 'next/server';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { runPosthogQuery, PostHogThrottledError } from '@/lib/posthog';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const dateFilters = {
        today:
          'timestamp >= toStartOfDay(now()) AND timestamp < now()',
        yesterday:
          "timestamp >= toStartOfDay(now()) - INTERVAL 1 DAY AND timestamp < toStartOfDay(now())",
        lastWeek:
          "timestamp >= toStartOfDay(now()) - INTERVAL 7 DAY AND timestamp < toStartOfDay(now()) - INTERVAL 6 DAY",
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
