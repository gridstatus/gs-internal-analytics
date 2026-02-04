import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { posthogFetchWithRetry, PostHogThrottledError, PostHogServerError } from '@/lib/posthog';

interface SessionCounts {
  last1d: number;
  last7d: number;
  last30d: number;
  allTime: number;
}

async function fetchSessionCount(email: string, days: number | 'all'): Promise<number> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return 0;
  }

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;

  const dateFilter = days === 'all' 
    ? '' 
    : `timestamp >= now() - INTERVAL ${days} DAY`;

  const hogql = loadRenderedHogql('user-session-counts.hogql', {
    email,
    dateFilter,
  });

  const payload = {
    query: {
      kind: 'HogQLQuery',
      query: hogql,
    },
  };

  const headers = { Authorization: `Bearer ${apiKey}` };

  try {
    const response = await posthogFetchWithRetry(url, payload, headers);
    const data = await response.json();
    const results = data.results || [];
    
    if (results.length > 0 && results[0].length > 0) {
      return Number(results[0][0]) || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching PostHog session count:', error);
    if (error instanceof PostHogThrottledError || error instanceof PostHogServerError) throw error;
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

      // Get user email from database
      const users = await query<{ username: string }>(
        `SELECT username FROM api_server.users WHERE id = $1`,
        [id]
      );

      if (users.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const email = users[0].username;

      // Fetch session counts for all time periods in parallel
      const [last1d, last7d, last30d, allTime] = await Promise.all([
        fetchSessionCount(email, 1),
        fetchSessionCount(email, 7),
        fetchSessionCount(email, 30),
        fetchSessionCount(email, 'all'),
      ]);

      const sessionCounts: SessionCounts = {
        last1d,
        last7d,
        last30d,
        allTime,
      };

      return NextResponse.json({
        email,
        sessionCounts,
      });
    } catch (error) {
      console.error('Error fetching PostHog sessions:', error);
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

