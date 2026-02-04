import { NextResponse } from 'next/server';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { runPosthogQuery, getUserIdsFromEmails, PostHogThrottledError } from '@/lib/posthog';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const daysOffset = Math.min(7, Math.max(0, parseInt(searchParams.get('days_offset') || '0', 10) || 0));
      const dateFilter =
        daysOffset === 0
          ? 'timestamp >= toStartOfDay(now()) AND timestamp < now()'
          : `timestamp >= toStartOfDay(now()) - INTERVAL ${daysOffset} DAY AND timestamp < toStartOfDay(now()) - INTERVAL ${daysOffset - 1} DAY`;

      const hogql = loadRenderedHogql('top-pageview-users-by-day.hogql', {
        dateFilter,
        limit: 50,
      });
      const results = await runPosthogQuery(hogql);

      const rows = (results as [string, number, number][]).map(([email, page_views, sessions]) => ({
        email: String(email ?? ''),
        pageViews: Number(page_views ?? 0),
        sessions: Number(sessions ?? 0),
      }));

      const emails = rows.map((r) => r.email).filter(Boolean);
      const emailToUserId = await getUserIdsFromEmails(emails);

      const rowsWithUserId = rows.map((r) => ({
        email: r.email,
        pageViews: r.pageViews,
        sessions: r.sessions,
        userId: emailToUserId.get(r.email) ?? null,
      }));

      return NextResponse.json({ rows: rowsWithUserId });
    } catch (error) {
      console.error('Error fetching most page views:', error);
      if (error instanceof PostHogThrottledError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      return jsonError(error);
    }
  });
}
