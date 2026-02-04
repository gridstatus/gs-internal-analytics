import { NextResponse } from 'next/server';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';

const DEFAULT_DAYS = 7;

export interface EventWithUniqueUsers {
  event: string;
  uniqueUsers: number;
}

async function fetchUniqueEvents(days: number): Promise<EventWithUniqueUsers[]> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return [];
  }

  const dateFilter = `AND timestamp >= now() - INTERVAL ${days} DAY`;
  const hogql = loadRenderedHogql('unique-events.hogql', { dateFilter });

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
  const payload = {
    query: {
      kind: 'HogQLQuery',
      query: hogql,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('PostHog API error:', response.status, errorText);
    return [];
  }

  const data = await response.json();
  if (data.warnings) {
    console.warn('PostHog query warnings:', data.warnings);
  }

  const results: [string, number][] = data.results || [];
  return results
    .filter((row) => row[0])
    .map(([event, uniqueUsers]) => ({ event, uniqueUsers: Number(uniqueUsers) ?? 0 }));
}

export async function GET(request: Request) {
  return withRequestContext(new URL(request.url).searchParams, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const daysParam = searchParams.get('days');
      const days = daysParam ? Math.min(90, Math.max(1, parseInt(daysParam, 10) || DEFAULT_DAYS)) : DEFAULT_DAYS;

      const events = await fetchUniqueEvents(days);

      return NextResponse.json({
        events: events,
        days,
      });
    } catch (error) {
      console.error('Error fetching PostHog unique events:', error);
      return jsonError(error);
    }
  });
}
