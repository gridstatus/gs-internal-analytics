import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { loadRenderedSql, renderSqlTemplate } from '@/lib/queries';
import { formatDateOnly, getFilterGridstatus, jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const filterGridstatus = getFilterGridstatus(searchParams);

    // Get summary stats (filtered)
    const chartStatsSql = `
      SELECT COUNT(*) as total, COUNT(DISTINCT c.user_id) as users 
      FROM api_server.charts c
      JOIN api_server.users u ON u.id = c.user_id
      WHERE SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    `;
    const dashboardStatsSql = `
      SELECT COUNT(*) as total, COUNT(DISTINCT d.user_id) as users 
      FROM api_server.dashboards d
      JOIN api_server.users u ON u.id = d.user_id
      WHERE SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    `;
    const [chartStats, dashboardStats] = await Promise.all([
      query<{ total: string; users: string }>(renderSqlTemplate(chartStatsSql, { filterGridstatus })),
      query<{ total: string; users: string }>(renderSqlTemplate(dashboardStatsSql, { filterGridstatus })),
    ]);

    // Get user breakdown for charts/dashboards
    const chartsDashboardsSql = loadRenderedSql('charts-dashboards-by-user.sql', { filterGridstatus });
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
