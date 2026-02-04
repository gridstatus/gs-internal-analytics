import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { runPosthogQuery, getUserIdsFromEmails, PostHogThrottledError, PostHogServerError } from '@/lib/posthog';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const { domain } = await params;
      const decodedDomain = decodeURIComponent(domain);
      const daysParam = searchParams.get('days') || '30';
      const allTime = daysParam === 'all' || daysParam === 'all_time';
      const daysNum = daysParam === '7' ? 7 : daysParam === '365' ? 365 : 30;
      const dateFilter = allTime ? '' : `timestamp >= now() - INTERVAL ${daysNum} DAY`;

      const hogql = loadRenderedHogql('domain-top-pageview-users.hogql', {
        domain: decodedDomain,
        dateFilter,
        limit: 50,
      });
      const results = await runPosthogQuery(hogql);

      const rows = (results as [string, number, number, number][]).map(([email, page_views, sessions, days_active]) => ({
        email: String(email ?? ''),
        pageViews: Number(page_views ?? 0),
        sessions: Number(sessions ?? 0),
        daysActive: Number(days_active ?? 0),
      }));

      const emails = rows.map((r) => r.email).filter(Boolean);
      const emailToUserId = await getUserIdsFromEmails(emails);

      const rowsWithUserId = rows.map((r) => ({
        email: r.email,
        pageViews: r.pageViews,
        sessions: r.sessions,
        daysActive: r.daysActive,
        userId: emailToUserId.get(r.email) ?? null,
      }));

      return NextResponse.json({ rows: rowsWithUserId });
    } catch (error) {
      console.error('Error fetching domain most active users:', error);
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
