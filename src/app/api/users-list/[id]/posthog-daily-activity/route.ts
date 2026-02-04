import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { posthogFetchWithRetry, PostHogThrottledError, PostHogServerError } from '@/lib/posthog';

interface DayRow {
  day: string;
  sessions: number;
  pageViews: number;
}

type Period = 'day' | 'week' | 'month';

function last30DayKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function last52WeekKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  const curr = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayOfWeek = curr.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  curr.setUTCDate(curr.getUTCDate() + mondayOffset);
  for (let w = 0; w < 52; w++) {
    const d = new Date(curr);
    d.setUTCDate(d.getUTCDate() - w * 7);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys.reverse();
}

function allMonthKeysFromResults(results: [string, number, number][]): string[] {
  if (results.length === 0) return [];
  const dates = results.map((r) => (typeof r[0] === 'string' ? r[0].slice(0, 10) : String(r[0]).slice(0, 10)));
  dates.sort();
  return [...new Set(dates)];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const { id } = await params;

      const users = await query<{ username: string }>(
        `SELECT username FROM api_server.users WHERE id = $1`,
        [id]
      );

      if (users.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const email = users[0].username;
      const period = (searchParams.get('period') || 'day') as Period;
      if (period !== 'day' && period !== 'week' && period !== 'month') {
        return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
      }

      const dateFilter =
        period === 'day'
          ? 'timestamp >= now() - INTERVAL 30 DAY'
          : period === 'week'
            ? 'timestamp >= now() - INTERVAL 1 YEAR'
            : '';
      const periodSelect =
        period === 'day'
          ? 'toDate(timestamp)'
          : period === 'week'
            ? 'toStartOfWeek(timestamp)'
            : 'toStartOfMonth(timestamp)';

      const keysForEmpty =
        period === 'day'
          ? last30DayKeys()
          : period === 'week'
            ? last52WeekKeys()
            : [];

      const projectId = process.env.POSTHOG_PROJECT_ID;
      const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

      if (!projectId || !apiKey) {
        const data = (period === 'month' ? [] : keysForEmpty).map((day) => ({ day, sessions: 0, pageViews: 0 }));
        return NextResponse.json({ data });
      }

      const hogql = loadRenderedHogql('user-daily-sessions-pageviews.hogql', {
        email,
        dateFilter,
        periodSelect,
      });

      const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
      const response = await posthogFetchWithRetry(url, { query: { kind: 'HogQLQuery', query: hogql } }, {
        Authorization: `Bearer ${apiKey}`,
      });
      const resBody = await response.json();
      const results = (resBody.results || []) as [string, number, number][];
      const byDay = new Map<string, { sessions: number; pageViews: number }>();
      for (const row of results) {
        const [day, sessions, pageViews] = row;
        const d = typeof day === 'string' ? day.slice(0, 10) : String(day).slice(0, 10);
        byDay.set(d, {
          sessions: Number(sessions ?? 0),
          pageViews: Number(pageViews ?? 0),
        });
      }

      const keys =
        period === 'month'
          ? allMonthKeysFromResults(results)
          : keysForEmpty;

      const data: DayRow[] = keys.map((day) => {
        const v = byDay.get(day) ?? { sessions: 0, pageViews: 0 };
        return { day, sessions: v.sessions, pageViews: v.pageViews };
      });

      return NextResponse.json({ data });
    } catch (error) {
      console.error('Error fetching PostHog daily activity:', error);
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
