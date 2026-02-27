import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { runPosthogQuery, PostHogThrottledError, PostHogServerError } from '@/lib/posthog';

/** Top pathnames by view count in the last 24 hours (logged-in users). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const dateFilter = 'timestamp >= now() - INTERVAL 24 HOUR';
      const hogql = loadRenderedHogql('top-pages-by-views.hogql', {
        dateFilter,
        limit: 50,
      });
      const results = await runPosthogQuery(hogql);
      const pages = (results as [string, number][]).map(([pathname, views]) => ({
        pathname: String(pathname ?? '/'),
        views: Number(views ?? 0),
      }));
      return NextResponse.json({ pages });
    } catch (error) {
      console.error('Error fetching top paths:', error);
      if (error instanceof PostHogThrottledError || error instanceof PostHogServerError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}
