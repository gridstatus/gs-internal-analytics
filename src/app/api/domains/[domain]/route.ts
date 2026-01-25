import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';
import { loadSql } from '@/lib/queries';
import { withRequestContext } from '@/lib/api-helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ domain: string }> | { domain: string } }
) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const resolvedParams = await Promise.resolve(params);
    const domain = decodeURIComponent(resolvedParams.domain);

    // Get domain stats
    const statsSql = loadSql('domain-analytics.sql');
    const stats = await query<{
      total_users: string;
      new_users_7d: string;
      new_users_30d: string;
      active_users_7d: string;
      active_users_30d: string;
      admin_count: string;
    }>(statsSql, [domain]);

    // Get users at this domain
    const users = await query<{
      id: number;
      username: string;
      first_name: string;
      last_name: string;
      created_at: Date;
      last_active_at: Date | null;
      is_admin: boolean;
    }>(`
      SELECT id, username, first_name, last_name, created_at, last_active_at, is_admin
      FROM api_server.users
      WHERE SUBSTRING(username FROM POSITION('@' IN username) + 1) = $1
      ORDER BY last_active_at DESC NULLS LAST, created_at DESC
    `, [domain]);

    // Get charts and dashboards count
    const chartsDashboards = await query<{
      chart_count: string;
      dashboard_count: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM api_server.charts c
         JOIN api_server.users u ON c.user_id = u.id
         WHERE SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) = $1) as chart_count,
        (SELECT COUNT(*) FROM api_server.dashboards d
         JOIN api_server.users u ON d.user_id = u.id
         WHERE SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) = $1) as dashboard_count
    `, [domain]);


    // Get monthly user registrations
    const monthlyRegistrations = await query<{
      month: Date;
      user_count: string;
    }>(`
      SELECT
        DATE_TRUNC('month', created_at) AS month,
        COUNT(*) AS user_count
      FROM api_server.users
      WHERE SUBSTRING(username FROM POSITION('@' IN username) + 1) = $1
        AND created_at IS NOT NULL
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `, [domain]);

    return NextResponse.json({
      domain,
      stats: {
        totalUsers: Number(stats[0]?.total_users || 0),
        newUsers7d: Number(stats[0]?.new_users_7d || 0),
        newUsers30d: Number(stats[0]?.new_users_30d || 0),
        activeUsers7d: Number(stats[0]?.active_users_7d || 0),
        activeUsers30d: Number(stats[0]?.active_users_30d || 0),
        adminCount: Number(stats[0]?.admin_count || 0),
        chartCount: Number(chartsDashboards[0]?.chart_count || 0),
        dashboardCount: Number(chartsDashboards[0]?.dashboard_count || 0),
      },
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        firstName: u.first_name,
        lastName: u.last_name,
        createdAt: u.created_at,
        lastActiveAt: u.last_active_at,
        isAdmin: u.is_admin,
      })),
      monthlyRegistrations: monthlyRegistrations.map(m => ({
        month: m.month,
        userCount: Number(m.user_count),
      })),
    });
  } catch (error) {
      console.error('Error fetching domain analytics:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}

