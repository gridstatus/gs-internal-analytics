import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { posthogFetchWithRetry, PostHogThrottledError, PostHogServerError } from '@/lib/posthog';

interface PostHogEvent {
  event: string;
  timestamp: string;
  properties: Record<string, unknown>;
}

interface EventCount {
  event: string;
  count: number;
}

async function fetchPosthogEventsForEmail(
  email: string,
  days: number | 'all'
): Promise<{ events: PostHogEvent[]; eventCounts: EventCount[] }> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return { events: [], eventCounts: [] };
  }

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;

  // Build date filter condition
  const dateFilter = days === 'all' 
    ? '' 
    : `timestamp >= now() - INTERVAL ${days} DAY`;

  // Query for event counts by type
  const countsHogql = loadRenderedHogql('user-events-counts.hogql', {
    email,
    dateFilter,
    limit: 50,
  });

  const countsPayload = {
    query: {
      kind: 'HogQLQuery',
      query: countsHogql,
    },
  };

  // Query for recent events
  const eventsHogql = loadRenderedHogql('user-events-recent.hogql', {
    email,
    dateFilter,
    limit: 100,
  });

  const eventsPayload = {
    query: {
      kind: 'HogQLQuery',
      query: eventsHogql,
    },
  };

  const headers = { Authorization: `Bearer ${apiKey}` };

  try {
    const [countsResponse, eventsResponse] = await Promise.all([
      posthogFetchWithRetry(url, countsPayload, headers),
      posthogFetchWithRetry(url, eventsPayload, headers),
    ]);
    const countsData = await countsResponse.json();
    const eventsData = await eventsResponse.json();

    const eventCounts: EventCount[] = (countsData.results || []).map(
      ([event, count]: [string, number]) => ({
        event,
        count,
      })
    );

    const events: PostHogEvent[] = (eventsData.results || []).map(
      ([event, timestamp, currentUrl, pathname, referrer, deviceType, browser]: [
        string,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null
      ]) => ({
        event,
        timestamp,
        properties: {
          currentUrl,
          pathname,
          referrer,
          deviceType,
          browser,
        },
      })
    );

    return { events, eventCounts };
  } catch (error) {
    console.error('Error fetching PostHog data:', error);
    if (error instanceof PostHogThrottledError || error instanceof PostHogServerError) throw error;
    return { events: [], eventCounts: [] };
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
      const daysParam = searchParams.get('days') || '30';

      // Parse days parameter - support 'all' or numeric values
      let days: number | 'all';
      if (daysParam === 'all') {
        days = 'all';
      } else {
        const parsedDays = parseInt(daysParam, 10);
        const validDays = [7, 30, 90];
        if (!validDays.includes(parsedDays)) {
          return NextResponse.json(
            { error: 'Invalid days parameter. Must be 7, 30, 90, or "all"' },
            { status: 400 }
          );
        }
        days = parsedDays;
      }

      // Get user email from database
      const users = await query<{ username: string }>(
        `SELECT username FROM api_server.users WHERE id = $1`,
        [id]
      );

      if (users.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const email = users[0].username;

      // Fetch PostHog data
      const { events, eventCounts } = await fetchPosthogEventsForEmail(email, days);

      return NextResponse.json({
        email,
        days: days === 'all' ? 'all' : days,
        eventCounts,
        events,
        totalEvents: eventCounts.reduce((sum, ec) => sum + ec.count, 0),
      });
    } catch (error) {
      console.error('Error fetching PostHog events:', error);
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

