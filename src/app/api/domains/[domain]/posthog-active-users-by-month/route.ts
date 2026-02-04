import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';

interface MonthRow {
  month: string;
  activeUsers: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const { domain } = await params;
      const decodedDomain = decodeURIComponent(domain);

      const projectId = process.env.POSTHOG_PROJECT_ID;
      const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

      if (!projectId || !apiKey) {
        return NextResponse.json({ data: [] });
      }

      const hogql = loadRenderedHogql('domain-monthly-active-users.hogql', {
        domain: decodedDomain,
      });

      const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: { kind: 'HogQLQuery', query: hogql },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PostHog API error:', errorText);
        return NextResponse.json({ data: [] });
      }

      const body = await response.json();
      const results = (body.results || []) as [string, number][];
      const data: MonthRow[] = results.map(([month, activeUsers]) => ({
        month: typeof month === 'string' ? month.slice(0, 7) : String(month).slice(0, 7),
        activeUsers: Number(activeUsers ?? 0),
      }));

      return NextResponse.json({ data });
    } catch (error) {
      console.error('Error fetching PostHog active users by month:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}
