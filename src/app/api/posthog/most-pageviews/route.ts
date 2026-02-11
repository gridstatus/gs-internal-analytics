import { NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { requestContext } from '@/lib/db';
import { loadRenderedHogql } from '@/lib/queries';
import { runPosthogQuery, getUserIdsFromEmails, PostHogThrottledError } from '@/lib/posthog';
import { sanitizeTimezone } from '@/lib/timezones';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const timezone = sanitizeTimezone(requestContext.getStore()?.timezone);
      const nowInTz = DateTime.now().setZone(timezone);
      const daysOffset = Math.min(7, Math.max(0, parseInt(searchParams.get('days_offset') || '0', 10) || 0));

      const fmt = (dt: DateTime) => dt.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
      let dateFilter: string;
      if (daysOffset === 0) {
        const startOfTodayInTz = nowInTz.startOf('day');
        dateFilter = `timestamp >= parseDateTimeBestEffort('${fmt(startOfTodayInTz)}') AND timestamp < now()`;
      } else {
        const startOfDayInTz = nowInTz.startOf('day').minus({ days: daysOffset });
        const endOfDayInTz = startOfDayInTz.plus({ days: 1 });
        dateFilter = `timestamp >= parseDateTimeBestEffort('${fmt(startOfDayInTz)}') AND timestamp < parseDateTimeBestEffort('${fmt(endOfDayInTz)}')`;
      }

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
