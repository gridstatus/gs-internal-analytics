import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { posthogFetchWithRetry, PostHogThrottledError, PostHogServerError } from '@/lib/posthog';

interface DaysActiveResponse {
  email: string;
  daysActive7d: number;
  daysActive30d: number;
  daysActive365d: number;
}

async function fetchDaysActive(email: string, days: number): Promise<number> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return 0;
  }

  const dateFilter = `timestamp >= now() - INTERVAL ${days} DAY`;
  const hogql = loadRenderedHogql('user-days-active.hogql', {
    email,
    dateFilter,
  });

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
  const body = { query: { kind: 'HogQLQuery', query: hogql } };
  const headers = { Authorization: `Bearer ${apiKey}` };

  try {
    const response = await posthogFetchWithRetry(url, body, headers);
    const data = await response.json();
    const results = data.results || [];

    if (results.length > 0 && results[0].length > 0) {
      return Number(results[0][0]) || 0;
    }
    return 0;
  } catch (err) {
    console.error('Error fetching PostHog days active:', err);
    if (err instanceof PostHogThrottledError || err instanceof PostHogServerError) throw err;
    return 0;
  }
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

      const [daysActive7d, daysActive30d, daysActive365d] = await Promise.all([
        fetchDaysActive(email, 7),
        fetchDaysActive(email, 30),
        fetchDaysActive(email, 365),
      ]);

      const body: DaysActiveResponse = {
        email,
        daysActive7d,
        daysActive30d,
        daysActive365d,
      };

      return NextResponse.json(body);
    } catch (error) {
      console.error('Error fetching PostHog days active:', error);
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
