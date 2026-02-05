import { NextResponse } from 'next/server';
import { getDatasetUsage24h } from '@/lib/queries';
import { jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const rows = await getDatasetUsage24h();
      const data = rows.map((row) => ({
        datasetId: row.dataset_id,
        numUniqueUsers: Number(row.num_unique_users),
        lastQueryAt: row.last_query_at.toISOString(),
      }));
      return NextResponse.json({ data });
    } catch (error) {
      console.error('Error fetching dataset usage 24h:', error);
      return jsonError(error);
    }
  });
}
