import { NextResponse } from 'next/server';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';

interface RateLimitUser {
  email: string;
  hits: number;
  percentage: number;
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

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  try {
    const [usersResponse, timeSeriesResponse] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(usersPayload),
      }),
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(timeSeriesPayload),
      }),
    ]);

    if (!usersResponse.ok || !timeSeriesResponse.ok) {
      const usersError = !usersResponse.ok ? await usersResponse.text() : '';
      const timeSeriesError = !timeSeriesResponse.ok ? await timeSeriesResponse.text() : '';
      console.error('PostHog API error:', { usersError, timeSeriesError });
      return { users: [], timeSeries: [], totalHits: 0, uniqueUsers: 0 };
    }

    const usersData = await usersResponse.json();
    const timeSeriesData = await timeSeriesResponse.json();

    const usersResults: [string, number][] = usersData.results || [];
    const timeSeriesResults: [string, number, number][] = timeSeriesData.results || [];

    const totalHits = usersResults.reduce((sum, [, hits]) => sum + hits, 0);

    const users: RateLimitUser[] = usersResults.map(([email, hits]) => ({
      email: email || 'unknown',
      hits: Number(hits),
      percentage: totalHits > 0 ? (Number(hits) / totalHits) * 100 : 0,
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
      return jsonError(error, 500);
    }
  });
}

