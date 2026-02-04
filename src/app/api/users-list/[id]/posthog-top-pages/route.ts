import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';

interface TopPageRow {
  pathname: string;
  views: number;
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
      const projectId = process.env.POSTHOG_PROJECT_ID;
      const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

      if (!projectId || !apiKey) {
        return NextResponse.json({ pages: [] });
      }

      const hogql = loadRenderedHogql('user-top-pages.hogql', {
        email,
        limit: 10,
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
        return NextResponse.json({ pages: [] });
      }

      const data = await response.json();
      const results = (data.results || []) as [string, number][];
      const pages: TopPageRow[] = results.map(([pathname, views]) => ({
        pathname: String(pathname ?? '/'),
        views: Number(views ?? 0),
      }));

      return NextResponse.json({ pages });
    } catch (error) {
      console.error('Error fetching PostHog top pages:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}
