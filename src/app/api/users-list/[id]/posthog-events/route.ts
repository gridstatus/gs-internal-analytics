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
  email: string
): Promise<{ events: PostHogEvent[]; eventCounts: EventCount[] }> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return { events: [], eventCounts: [] };
  }

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;

  // Last 100 events for this user (no date filter)
  const eventsHogql = loadRenderedHogql('user-events-recent.hogql', {
    email,
    dateFilter: '',
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
    const eventsResponse = await posthogFetchWithRetry(url, eventsPayload, headers);
    const eventsData = await eventsResponse.json();

    const rawEvents = eventsData.results || [];
    const events: PostHogEvent[] = rawEvents.map(
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

    // Derive event counts from the 100 events
    const countByEvent = new Map<string, number>();
    for (const e of events) {
      countByEvent.set(e.event, (countByEvent.get(e.event) ?? 0) + 1);
    }
    const eventCounts: EventCount[] = Array.from(countByEvent.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);

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

      const users = await query<{ username: string }>(
        `SELECT username FROM api_server.users WHERE id = $1`,
        [id]
      );

      if (users.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const email = users[0].username;

      const { events, eventCounts } = await fetchPosthogEventsForEmail(email);

      return NextResponse.json({
        email,
        eventCounts,
        events,
        totalEvents: events.length,
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

