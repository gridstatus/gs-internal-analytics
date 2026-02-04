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
      const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30', 10) || 30));
      const dateFilter = `timestamp >= now() - INTERVAL ${days} DAY`;

      const hogql = loadRenderedHogql('domain-top-pageview-users.hogql', {
        domain: decodedDomain,
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
