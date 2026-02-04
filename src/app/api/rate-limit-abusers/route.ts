import { NextResponse } from 'next/server';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { query } from '@/lib/db';
import { posthogFetchWithRetry, PostHogThrottledError, PostHogServerError } from '@/lib/posthog';

interface RateLimitUser {
  email: string;
  hits: number;
  percentage: number;
  userId?: number | null;
}

// Look up user IDs from emails
async function getUserIdsFromEmails(emails: string[]): Promise<Map<string, number>> {
  if (emails.length === 0) return new Map();
  
  const users = await query<{ username: string; id: number }>(
    `SELECT username, id FROM api_server.users WHERE username = ANY($1)`,
    [emails]
  );
  
  const emailToId = new Map<string, number>();
  for (const user of users) {
    emailToId.set(user.username, user.id);
  }
  return emailToId;
}

interface RateLimitTimeSeries {
  date: string;
  hits: number;
  uniqueUsers: number;
}

async function fetchRateLimitAbusers(days: number = 30): Promise<{
  users: RateLimitUser[];
  timeSeries: RateLimitTimeSeries[];
  totalHits: number;
  uniqueUsers: number;
}> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return { users: [], timeSeries: [], totalHits: 0, uniqueUsers: 0 };
  }

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;

  // Query for top users by rate limit hits
  const usersHogql = loadRenderedHogql('rate-limit-users.hogql', {
    days,
    limit: 50,
  });

  const usersPayload = {
    query: {
      kind: 'HogQLQuery',
      query: usersHogql,
    },
  };

  // Query for time series
  const timeSeriesHogql = loadRenderedHogql('rate-limit-timeseries.hogql', {
    days,
  });

  const timeSeriesPayload = {
    query: {
      kind: 'HogQLQuery',
      query: timeSeriesHogql,
    },
  };

  const headers = { Authorization: `Bearer ${apiKey}` };

  try {
    const [usersResponse, timeSeriesResponse] = await Promise.all([
      posthogFetchWithRetry(url, usersPayload, headers),
      posthogFetchWithRetry(url, timeSeriesPayload, headers),
    ]);
    const usersData = await usersResponse.json();
    const timeSeriesData = await timeSeriesResponse.json();

    const usersResults: [string, number][] = usersData.results || [];
    const timeSeriesResults: [string, number, number][] = timeSeriesData.results || [];

    const totalHits = usersResults.reduce((sum, [, hits]) => sum + hits, 0);

    // Get all unique emails
    const allEmails = usersResults
      .map(([email]) => email)
      .filter((email): email is string => !!email && email !== 'unknown');

    // Look up user IDs
    const emailToUserId = await getUserIdsFromEmails(allEmails);

    const users: RateLimitUser[] = usersResults.map(([email, hits]) => ({
      email: email || 'unknown',
      hits: Number(hits),
      percentage: totalHits > 0 ? (Number(hits) / totalHits) * 100 : 0,
      userId: email && email !== 'unknown' ? emailToUserId.get(email) || null : null,
    }));

    const timeSeries: RateLimitTimeSeries[] = timeSeriesResults.map(([date, hits, uniqueUsers]) => ({
      date: date as string,
      hits: Number(hits),
      uniqueUsers: Number(uniqueUsers),
    }));

    const uniqueUsers = new Set(usersResults.map(([email]) => email)).size;

    return {
      users,
      timeSeries,
      totalHits,
      uniqueUsers,
    };
  } catch (error) {
    console.error('Error fetching rate limit data:', error);
    if (error instanceof PostHogThrottledError || error instanceof PostHogServerError) throw error;
    return { users: [], timeSeries: [], totalHits: 0, uniqueUsers: 0 };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const days = parseInt(searchParams.get('days') || '30', 10);
      const data = await fetchRateLimitAbusers(days);

      return NextResponse.json(data);
    } catch (error) {
      console.error('Error in rate-limit-abusers API:', error);
      if (error instanceof PostHogThrottledError || error instanceof PostHogServerError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      return jsonError(error, 500);
    }
  });
}

