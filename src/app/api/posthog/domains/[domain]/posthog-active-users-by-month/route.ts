import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { posthogFetchWithRetry, PostHogThrottledError, PostHogServerError } from '@/lib/posthog';

interface MonthRow {
  month: string;
  activeUsers: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const { domain } = await params;
      const decodedDomain = decodeURIComponent(domain);
      const monthsParam = searchParams.get('months'); // '3' | '12' | 'all'

      const projectId = process.env.POSTHOG_PROJECT_ID;
      const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

      if (!projectId || !apiKey) {
        return NextResponse.json({ data: [] });
      }

      let dateFilter: string | undefined;
      if (monthsParam === '3') {
        dateFilter = 'timestamp >= now() - INTERVAL 3 MONTH';
      } else if (monthsParam === '12') {
        dateFilter = 'timestamp >= now() - INTERVAL 12 MONTH';
      }
      // 'all' or missing: no date filter

      const hogql = loadRenderedHogql('domain-monthly-active-users.hogql', {
        domain: decodedDomain,
        ...(dateFilter && { dateFilter }),
      });

      const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
      const response = await posthogFetchWithRetry(url, { query: { kind: 'HogQLQuery', query: hogql } }, {
        Authorization: `Bearer ${apiKey}`,
      });
      const body = await response.json();
      const results = (body.results || []) as [string, number][];
      const data: MonthRow[] = results.map(([month, activeUsers]) => ({
        month: typeof month === 'string' ? month.slice(0, 7) : String(month).slice(0, 7),
        activeUsers: Number(activeUsers ?? 0),
      }));

      return NextResponse.json({ data });
    } catch (error) {
      console.error('Error fetching PostHog active users by month:', error);
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
