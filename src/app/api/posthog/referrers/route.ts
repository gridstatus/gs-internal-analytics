import { NextResponse } from 'next/server';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { runPosthogQuery, PostHogThrottledError, PostHogServerError } from '@/lib/posthog';

function rowKey(domain: string, path: string): string {
  return `${domain}\t${path}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const userType = searchParams.get('user_type') || 'all';
      const userTypeFilter =
        userType === 'logged_in'
          ? "person.properties.email IS NOT NULL AND person.properties.email != ''"
          : userType === 'anon'
            ? "(person.properties.email IS NULL OR person.properties.email = '')"
            : '';

      const dateFilter7 = 'timestamp >= now() - INTERVAL 7 DAY';
      const dateFilter30 = 'timestamp >= now() - INTERVAL 30 DAY';
      const todayFilter = `timestamp >= toStartOfDay(now())`;
      const sameTimeOfDayFilter =
        "timestamp < toStartOfDay(timestamp) + toIntervalSecond(dateDiff('second', toStartOfDay(now()), now()))";

      // Order matters: [0]=7-day, [1]=30-day, [2]=today. 7- and 30-day use different DATE_FILTER so totals differ.
      const [main7Results, main30Results, todayResults] = await Promise.all([
        runPosthogQuery(
          loadRenderedHogql('top-referrers-entry-path.hogql', {
            dateFilter: dateFilter7,
            limit: 100,
            userTypeFilter,
            sameTimeOfDayFilter,
          })
        ),
        runPosthogQuery(
          loadRenderedHogql('top-referrers-entry-path.hogql', {
            dateFilter: dateFilter30,
            limit: 100,
            userTypeFilter,
            sameTimeOfDayFilter,
          })
        ),
        runPosthogQuery(
          loadRenderedHogql('top-referrers-entry-path.hogql', { dateFilter: todayFilter, limit: 500, userTypeFilter })
        ),
      ]);

      const todayMap = new Map<string, number>();
      (todayResults as [string, string, number][]).forEach(([d, p, n]) => {
        todayMap.set(rowKey(String(d ?? ''), String(p ?? '')), Number(n ?? 0));
      });
      const total30Map = new Map<string, number>();
      (main30Results as [string, string, number][]).forEach(([d, p, n]) => {
        total30Map.set(rowKey(String(d ?? ''), String(p ?? '')), Number(n ?? 0));
      });

      const referrers = (main7Results as [string, string, number][]).map(
        ([referringDomain, entryPathname, uniqueUsers]) => {
          const key = rowKey(String(referringDomain ?? ''), String(entryPathname ?? ''));
          const total7 = Number(uniqueUsers ?? 0);
          const total30 = total30Map.get(key) ?? 0;
          const avg7 = total7 / 7;
          const avg30 = total30 / 30;
          const today = todayMap.get(key) ?? 0;
          const vsAvg7Change =
            avg7 !== 0 ? Math.round(((today - avg7) / avg7) * 1000) / 10 : (today > 0 ? 100 : null);
          const vsAvg30Change =
            avg30 !== 0 ? Math.round(((today - avg30) / avg30) * 1000) / 10 : (today > 0 ? 100 : null);
          return {
            referringDomain: String(referringDomain ?? ''),
            entryPathname: String(entryPathname ?? ''),
            uniqueUsers: total7,
            uniqueUsersAvg: Math.round(avg7 * 10) / 10,
            uniqueUsersAvg30: Math.round(avg30 * 10) / 10,
            uniqueUsersToday: today,
            vsAvg7Change: vsAvg7Change === null ? null : vsAvg7Change,
            vsAvg30Change: vsAvg30Change === null ? null : vsAvg30Change,
          };
        }
      );

      return NextResponse.json({ referrers });
    } catch (error) {
      console.error('Error fetching referrers:', error);
      if (error instanceof PostHogThrottledError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      return jsonError(error);
    }
  });
}
