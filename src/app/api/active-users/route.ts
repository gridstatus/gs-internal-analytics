import { NextResponse } from 'next/server';
import { getActiveUsers, getActiveUsersByDomain } from '@/lib/queries';
import { getFilterGridstatus, jsonError } from '@/lib/api-helpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterGridstatus = getFilterGridstatus(searchParams);
    
    const [summaryResult, domainResult] = await Promise.all([
      getActiveUsers(),
      getActiveUsersByDomain(filterGridstatus),
    ]);

    const data = summaryResult[0];

    const byDomain = domainResult.map((row) => ({
      domain: row.domain,
      active24h: Number(row.active_24h),
      active7d: Number(row.active_7d),
      active30d: Number(row.active_30d),
      active90d: Number(row.active_90d),
      totalUsers: Number(row.total_users),
    }));

    return NextResponse.json({
      active24h: Number(data.active_24h),
      active7d: Number(data.active_7d),
      active30d: Number(data.active_30d),
      active90d: Number(data.active_90d),
      totalUsers: Number(data.total_users),
      byDomain,
    });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return jsonError(error);
  }
}
