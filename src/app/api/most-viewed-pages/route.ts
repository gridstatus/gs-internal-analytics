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
      const secondsSinceMidnight = Math.floor(nowInTz.diff(startOfTodayInTz, 'seconds').seconds);

      const dateFilter7 = 'timestamp >= now() - INTERVAL 7 DAY';
      const dateFilter30 = 'timestamp >= now() - INTERVAL 30 DAY';
      const todayStartUtc = startOfTodayInTz.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
      const todayFilter = `timestamp >= parseDateTimeBestEffort('${todayStartUtc}') AND timestamp < now()`;
      const sameTimeOfDayFilter = `timestamp < toStartOfDay(timestamp, '${timezone}') + toIntervalSecond(${secondsSinceMidnight})`;

      const [main7Results, main30Results, todayResults] = await Promise.all([
        runPosthogQuery(
          loadRenderedHogql('top-pages-by-views.hogql', { dateFilter: dateFilter7, limit: 100, sameTimeOfDayFilter })
        ),
        runPosthogQuery(
          loadRenderedHogql('top-pages-by-views.hogql', { dateFilter: dateFilter30, limit: 100, sameTimeOfDayFilter })
        ),
        runPosthogQuery(
          loadRenderedHogql('top-pages-by-views.hogql', { dateFilter: todayFilter, limit: 500 })
        ),
      ]);

      const todayMap = new Map<string, number>();
      (todayResults as [string, number][]).forEach(([path, n]) => {
        todayMap.set(String(path ?? '/'), Number(n ?? 0));
      });
      const total30Map = new Map<string, number>();
      (main30Results as [string, number][]).forEach(([path, n]) => {
        total30Map.set(String(path ?? '/'), Number(n ?? 0));
      });

      const pages = (main7Results as [string, number][]).map(([pathname, views]) => {
        const path = String(pathname ?? '/');
        const total7 = Number(views ?? 0);
        const total30 = total30Map.get(path) ?? 0;
        const avg7 = total7 / 7;
        const avg30 = total30 / 30;
        const today = todayMap.get(path) ?? 0;
        const vsAvg7Change =
          avg7 !== 0 ? Math.round(((today - avg7) / avg7) * 1000) / 10 : (today > 0 ? 100 : null);
        const vsAvg30Change =
          avg30 !== 0 ? Math.round(((today - avg30) / avg30) * 1000) / 10 : (today > 0 ? 100 : null);
        return {
          pathname: path,
          views: total7,
          viewsAvg: Math.round(avg7 * 10) / 10,
          viewsAvg30: Math.round(avg30 * 10) / 10,
          viewsToday: today,
          vsAvg7Change: vsAvg7Change === null ? null : vsAvg7Change,
          vsAvg30Change: vsAvg30Change === null ? null : vsAvg30Change,
        };
      });

      return NextResponse.json({ pages });
    } catch (error) {
      console.error('Error fetching most viewed pages:', error);
      if (error instanceof PostHogThrottledError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      return jsonError(error);
    }
  });
}
