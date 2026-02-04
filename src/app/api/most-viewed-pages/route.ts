import { NextResponse } from 'next/server';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { runPosthogQuery, PostHogThrottledError } from '@/lib/posthog';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') || '7', 10) || 7));
      const dateFilter = `timestamp >= now() - INTERVAL ${days} DAY`;
      const todayFilter = `timestamp >= toStartOfDay(now())`;

      const [mainResults, todayResults] = await Promise.all([
        runPosthogQuery(
          loadRenderedHogql('top-pages-by-views.hogql', { dateFilter, limit: 100 })
        ),
        runPosthogQuery(
          loadRenderedHogql('top-pages-by-views.hogql', { dateFilter: todayFilter, limit: 500 })
        ),
      ]);

      const todayMap = new Map<string, number>();
      (todayResults as [string, number][]).forEach(([path, n]) => {
        todayMap.set(String(path ?? '/'), Number(n ?? 0));
      });

      const pages = (mainResults as [string, number][]).map(([pathname, views]) => {
        const path = String(pathname ?? '/');
        const total = Number(views ?? 0);
        const avg = days > 0 ? total / days : 0;
        const today = todayMap.get(path) ?? 0;
        const vsAvgChange =
          avg !== 0 ? Math.round(((today - avg) / avg) * 1000) / 10 : (today > 0 ? 100 : null);
        return {
          pathname: path,
          views: total,
          viewsAvg: Math.round(avg * 10) / 10,
          viewsToday: today,
          vsAvgChange: vsAvgChange === null ? null : vsAvgChange,
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
