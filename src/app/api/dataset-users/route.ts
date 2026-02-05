import { NextResponse } from 'next/server';
import { getDatasetUsersLast24h } from '@/lib/queries';
import { jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const datasetId = searchParams.get('dataset')?.trim();
      if (!datasetId) {
        return NextResponse.json(
          { error: 'Missing dataset parameter' },
          { status: 400 }
        );
      }

      const daysParam = searchParams.get('days');
      const days = daysParam ? parseInt(daysParam, 10) : 1;
      if (![1, 7, 14].includes(days)) {
        return NextResponse.json(
          { error: 'Invalid days parameter. Must be 1, 7, or 14' },
          { status: 400 }
        );
      }

      const rows = await getDatasetUsersLast24h(datasetId, days);
      const data = rows.map((row) => ({
        userId: row.user_id,
        username: row.username,
        numRequests: Number(row.num_requests),
        lastQueryAt: row.last_query_at.toISOString(),
        avgSecondsBetween: row.avg_seconds_between != null ? Number(row.avg_seconds_between) : null,
      }));

      return NextResponse.json({ data });
    } catch (error) {
      console.error('Error fetching dataset users:', error);
      return jsonError(error);
    }
  });
}
