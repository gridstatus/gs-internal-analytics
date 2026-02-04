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
      const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '7', 10) || 7));
      const userType = searchParams.get('user_type') || 'all';
      const userTypeFilter =
        userType === 'logged_in'
          ? "person.properties.email IS NOT NULL AND person.properties.email != ''"
          : userType === 'anon'
            ? "(person.properties.email IS NULL OR person.properties.email = '')"
            : '';

      const dateFilter = `timestamp >= now() - INTERVAL ${days} DAY`;
      const todayFilter = `timestamp >= toStartOfDay(now())`;

      const [mainResults, todayResults] = await Promise.all([
        runPosthogQuery(
          loadRenderedHogql('top-referrers-entry-path.hogql', { dateFilter, limit: 100, userTypeFilter })
        ),
        runPosthogQuery(
          loadRenderedHogql('top-referrers-entry-path.hogql', { dateFilter: todayFilter, limit: 500, userTypeFilter })
        ),
      ]);

      const todayMap = new Map<string, number>();
      (todayResults as [string, string, number][]).forEach(([d, p, n]) => {
        todayMap.set(rowKey(String(d ?? ''), String(p ?? '')), Number(n ?? 0));
      });

      const referrers = (mainResults as [string, string, number][]).map(
        ([referringDomain, entryPathname, uniqueUsers]) => {
          const key = rowKey(String(referringDomain ?? ''), String(entryPathname ?? ''));
          const total = Number(uniqueUsers ?? 0);
          const avg = days > 0 ? total / days : 0;
          const today = todayMap.get(key) ?? 0;
          const vsAvgChange =
            avg !== 0 ? Math.round(((today - avg) / avg) * 1000) / 10 : (today > 0 ? 100 : null);
          return {
            referringDomain: String(referringDomain ?? ''),
            entryPathname: String(entryPathname ?? ''),
            uniqueUsers: total,
            uniqueUsersAvg: Math.round(avg * 10) / 10,
            uniqueUsersToday: today,
            vsAvgChange: vsAvgChange === null ? null : vsAvgChange,
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
