import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { runPosthogQuery, getUserIdsFromEmails, PostHogThrottledError, PostHogServerError } from '@/lib/posthog';

/** Build pathname from catch-all segment (e.g. ['outages'] → '/outages'). */
function pathSegmentsToPathname(segments: string[]): string {
  if (segments.length === 0) return '/';
  return '/' + segments.join('/');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const { path: pathSegments } = await params;
      const pathname = pathSegmentsToPathname(pathSegments);
      const daysParam = searchParams.get('days') || '30';
      const allTime = daysParam === 'all' || daysParam === 'all_time';
      const daysNum = daysParam === '7' ? 7 : daysParam === '365' ? 365 : 30;
      const dateFilter = allTime ? '' : `timestamp >= now() - INTERVAL ${daysNum} DAY`;
      const dateFilterTimeseries = allTime
        ? 'timestamp >= now() - INTERVAL 2 YEAR'
        : dateFilter;
      const periodSelect = 'toStartOfDay(timestamp)';

      const [statsResults, usersResults, timeseriesResults, referrersResults] = await Promise.all([
        runPosthogQuery(
          loadRenderedHogql('path-stats.hogql', {
            pathname,
            dateFilter,
          })
        ),
        runPosthogQuery(
          loadRenderedHogql('path-users.hogql', {
            pathname,
            dateFilter,
            limit: 100,
          })
        ),
        runPosthogQuery(
          loadRenderedHogql('path-timeseries.hogql', {
            pathname,
            dateFilter: dateFilterTimeseries,
            periodSelect,
          })
        ),
        runPosthogQuery(
          loadRenderedHogql('path-top-referrers.hogql', {
            entryPathname: pathname,
            dateFilter,
            limit: 20,
          })
        ),
      ]);

      const statsRow = statsResults[0] as [number, number] | undefined;
      const views = Number(statsRow?.[0] ?? 0);
      const uniqueUsers = Number(statsRow?.[1] ?? 0);

      const rows = (usersResults as [string, number, number, number][]).map(
        ([email, page_views, sessions, days_active]) => ({
          email: String(email ?? ''),
          pageViews: Number(page_views ?? 0),
          sessions: Number(sessions ?? 0),
          daysActive: Number(days_active ?? 0),
        })
      );
      const emails = rows.map((r) => r.email).filter(Boolean);
      const emailToUserId = await getUserIdsFromEmails(emails);
      const rowsWithUserId = rows.map((r) => ({
        email: r.email,
        pageViews: r.pageViews,
        sessions: r.sessions,
        daysActive: r.daysActive,
        userId: emailToUserId.get(r.email) ?? null,
      }));

      const timeSeries = (timeseriesResults as [string, number, number][]).map(
        ([period, unique_sessions, unique_users]) => ({
          period: String(period ?? '').slice(0, 10),
          uniqueSessions: Number(unique_sessions ?? 0),
          uniqueUsers: Number(unique_users ?? 0),
        })
      );

      const referrers = (referrersResults as [string, number, number][]).map(
        ([referring_domain, unique_users, sessions]) => ({
          referringDomain: String(referring_domain ?? ''),
          uniqueUsers: Number(unique_users ?? 0),
          sessions: Number(sessions ?? 0),
        })
      );

      return NextResponse.json({
        pathname,
        stats: { views, uniqueUsers },
        users: rowsWithUserId,
        timeSeries,
        referrers,
      });
    } catch (error) {
      console.error('Error fetching path data:', error);
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
