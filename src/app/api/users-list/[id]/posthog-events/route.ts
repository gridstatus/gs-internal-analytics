import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';

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
  days: number
): Promise<{ events: PostHogEvent[]; eventCounts: EventCount[] }> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return { events: [], eventCounts: [] };
  }

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;

  // Query for event counts by type
  const countsPayload = {
    query: {
      kind: 'HogQLQuery',
      query: `
        SELECT
          event,
          COUNT(*) as count
        FROM events
        WHERE person.properties.email = '${email.replace(/'/g, "''")}'
          AND timestamp >= now() - INTERVAL ${days} DAY
          AND event != '$identify'
        GROUP BY event
        ORDER BY count DESC
        LIMIT 50
      `,
    },
  };

  // Query for recent events
  const eventsPayload = {
    query: {
      kind: 'HogQLQuery',
      query: `
        SELECT
          event,
          timestamp,
          properties.$current_url as current_url,
          properties.$pathname as pathname,
          properties.$referrer as referrer,
          properties.$device_type as device_type,
          properties.$browser as browser
        FROM events
        WHERE person.properties.email = '${email.replace(/'/g, "''")}'
          AND timestamp >= now() - INTERVAL ${days} DAY
          AND event != '$identify'
        ORDER BY timestamp DESC
        LIMIT 100
      `,
    },
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  try {
    const [countsResponse, eventsResponse] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(countsPayload),
      }),
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventsPayload),
      }),
    ]);

    if (!countsResponse.ok || !eventsResponse.ok) {
      const countsError = !countsResponse.ok ? await countsResponse.text() : '';
      const eventsError = !eventsResponse.ok ? await eventsResponse.text() : '';
      console.error('PostHog API error:', { countsError, eventsError });
      return { events: [], eventCounts: [] };
    }

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
      const days = parseInt(searchParams.get('days') || '30', 10);

      // Validate days parameter
      const validDays = [7, 30, 90];
      if (!validDays.includes(days)) {
        return NextResponse.json(
          { error: 'Invalid days parameter. Must be 7, 30, or 90' },
          { status: 400 }
        );
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
        days,
        eventCounts,
        events,
        totalEvents: eventCounts.reduce((sum, ec) => sum + ec.count, 0),
      });
    } catch (error) {
      console.error('Error fetching PostHog events:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}

