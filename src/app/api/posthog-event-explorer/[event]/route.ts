import { NextResponse } from 'next/server';
import { jsonError, withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';
import { query } from '@/lib/db';

const DEFAULT_OCCURRENCES_LIMIT = 100;

function getPeriodConfig(period: 'day' | 'week' | 'month') {
  if (period === 'day') {
    return {
      dateFunction: 'toStartOfDay(timestamp)',
      dateFilter: "timestamp >= now() - INTERVAL 2 YEAR",
    };
  }
  if (period === 'week') {
    return {
      dateFunction: 'toStartOfWeek(timestamp)',
      dateFilter: "timestamp >= now() - INTERVAL 3 YEAR",
    };
  }
  return {
    dateFunction: 'toStartOfMonth(timestamp)',
    dateFilter: "timestamp >= now() - INTERVAL 5 YEAR",
  };
}

function formatPeriod(value: string, period: 'day' | 'week' | 'month'): string {
  const d = new Date(value);
  if (period === 'month') {
    return d.toISOString().slice(0, 7);
  }
  return d.toISOString().slice(0, 10);
}

async function runPosthogQuery(
  projectId: string,
  apiKey: string,
  hogql: string
): Promise<unknown[][]> {
  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hogql } }),
  });
  if (!response.ok) {
    const text = await response.text();
    console.error('PostHog API error:', response.status, text);
    return [];
  }
  const data = await response.json();
  return data.results || [];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ event: string }> }
) {
  return withRequestContext(new URL(request.url).searchParams, async () => {
    try {
      const { event: encodedEvent } = await params;
      const eventName = encodedEvent ? decodeURIComponent(encodedEvent) : '';
      if (!eventName) {
        return NextResponse.json({ error: 'Event name required' }, { status: 400 });
      }

      const { searchParams } = new URL(request.url);
      const periodParam = (searchParams.get('period') || 'month') as 'day' | 'week' | 'month';
      const period = ['day', 'week', 'month'].includes(periodParam) ? periodParam : 'month';
      const occurrencesLimit = Math.min(
        200,
        Math.max(10, parseInt(searchParams.get('occurrencesLimit') || String(DEFAULT_OCCURRENCES_LIMIT), 10) || DEFAULT_OCCURRENCES_LIMIT)
      );

      const projectId = process.env.POSTHOG_PROJECT_ID;
      const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

      if (!projectId || !apiKey) {
        return NextResponse.json(
          { error: 'PostHog not configured', frequencyOverTime: [], uniqueUsersOverTime: [], occurrences: [] },
          { status: 200 }
        );
      }

      const { dateFunction, dateFilter } = getPeriodConfig(period);

      const [freqHogql, usersHogql, occHogql] = [
        loadRenderedHogql('event-frequency-timeseries.hogql', { eventName, dateFunction, dateFilter }),
        loadRenderedHogql('event-unique-users-timeseries.hogql', { eventName, dateFunction, dateFilter }),
        loadRenderedHogql('event-occurrences-recent.hogql', { eventName, limit: occurrencesLimit }),
      ];

      const [freqResults, usersResults, occResults] = await Promise.all([
        runPosthogQuery(projectId, apiKey, freqHogql),
        runPosthogQuery(projectId, apiKey, usersHogql),
        runPosthogQuery(projectId, apiKey, occHogql),
      ]);

      const frequencyOverTime = (freqResults as [string, number][]).map(([p, count]) => ({
        month: formatPeriod(String(p), period),
        count: Number(count) || 0,
      }));

      const uniqueUsersOverTime = (usersResults as [string, number][]).map(([p, u]) => ({
        month: formatPeriod(String(p), period),
        uniqueUsers: Number(u) || 0,
      }));

      type OccRow = [string, string | null];
      const occurrencesRaw = occResults as OccRow[];
      const emails = [...new Set(occurrencesRaw.map(([, e]) => e).filter(Boolean))] as string[];

      let emailToUserId: Record<string, number> = {};
      if (emails.length > 0) {
        const placeholders = emails.map((_, i) => `$${i + 1}`).join(', ');
        const rows = await query<{ username: string; id: number }>(
          `SELECT id, username FROM api_server.users WHERE username IN (${placeholders})`,
          emails
        );
        rows.forEach((r) => {
          emailToUserId[r.username] = r.id;
        });
      }

      const occurrences = occurrencesRaw
        .map(([timestamp, email]) => ({
          timestamp,
          email: email || null,
          userId: email ? emailToUserId[email] ?? null : null,
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return NextResponse.json({
        eventName,
        period,
        frequencyOverTime,
        uniqueUsersOverTime,
        occurrences,
      });
    } catch (error) {
      console.error('Error fetching event detail:', error);
      return jsonError(error);
    }
  });
}
