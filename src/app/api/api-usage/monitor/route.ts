import { NextResponse } from 'next/server';
import { getApiUsageByIp, getApiUsageByUser } from '@/lib/queries';
import { jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const [byIp, byUser] = await Promise.all([
        getApiUsageByIp(),
        getApiUsageByUser(),
      ]);
      return NextResponse.json({
        byIp: byIp.map((row) => ({
          ip: row.ip,
          distinctUsers: Number(row.distinct_users),
          totalRowsReturned: Number(row.total_rows_returned),
          requestCount: Number(row.request_count),
          userNames: row.user_names ?? [],
        })),
        byUser: byUser.map((row) => ({
          id: `${row.usage_id}-${row.plan_id ?? 'none'}`,
          user: row.user,
          org: row.org,
          usageId: row.usage_id,
          planId: row.plan_id,
          totalRequests: Number(row.total_requests),
          totalRowsReturned: Number(row.total_rows_returned),
          lastRequestTime:
            row.last_request_time instanceof Date
              ? row.last_request_time.toISOString()
              : String(row.last_request_time),
          uniqueClientVersions: (row.unique_client_versions ?? []).filter(
            (v): v is string => v != null
          ),
          uniqueDatasets: (row.unique_datasets ?? []).filter(
            (v): v is string => v != null
          ),
          userId: row.user_id,
          orgId: row.org_id,
        })),
      });
    } catch (error) {
      console.error('Error fetching API usage monitor data:', error);
      return jsonError(error);
    }
  });
}
