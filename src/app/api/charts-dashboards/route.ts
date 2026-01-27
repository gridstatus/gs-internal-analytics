import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { renderSqlTemplate } from '@/lib/queries';
import { formatDateOnly, getFilterGridstatus, jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const filterGridstatus = getFilterGridstatus(searchParams);

    // Get summary stats (filtered)
    const [chartStats, dashboardStats] = await Promise.all([
      query<{ total: string; users: string }>(renderSqlTemplate('chart-stats.sql', { filterGridstatus })),
      query<{ total: string; users: string }>(renderSqlTemplate('dashboard-stats.sql', { filterGridstatus })),
    ]);

    // Get user breakdown for charts/dashboards
    const chartsDashboardsSql = renderSqlTemplate('charts-dashboards-by-user.sql', { filterGridstatus });
    const userBreakdown = await query<{
      user_id: number;
      username: string;
      domain: string;
      chart_count: string;
      dashboard_count: string;
      last_chart_created: Date | null;
      last_dashboard_created: Date | null;
    }>(chartsDashboardsSql);

    return NextResponse.json({
      summary: {
        totalCharts: Number(chartStats[0].total),
        totalDashboards: Number(dashboardStats[0].total),
        chartUsers: Number(chartStats[0].users),
        dashboardUsers: Number(dashboardStats[0].users),
      },
      users: userBreakdown.map((row) => ({
        userId: row.user_id,
        username: row.username,
        domain: row.domain,
        chartCount: Number(row.chart_count),
        dashboardCount: Number(row.dashboard_count),
        lastChartCreated: formatDateOnly(row.last_chart_created),
        lastDashboardCreated: formatDateOnly(row.last_dashboard_created),
      })),
    });
  } catch (error) {
      console.error('Error fetching charts/dashboards:', error);
      return jsonError(error);
    }
  });
}
