import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';
import { renderSqlTemplate } from '@/lib/queries';

function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterGridstatus = searchParams.get('filterGridstatus') !== 'false';

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
    const chartsDashboardsSqlPath = join(process.cwd(), 'src/sql/charts-dashboards-by-user.sql');
    let chartsDashboardsSql = readFileSync(chartsDashboardsSqlPath, 'utf-8');
    chartsDashboardsSql = renderSqlTemplate(chartsDashboardsSql, { filterGridstatus });
    const userBreakdown = await query<{
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
        username: row.username,
        domain: row.domain,
        chartCount: Number(row.chart_count),
        dashboardCount: Number(row.dashboard_count),
        lastChartCreated: formatDate(row.last_chart_created),
        lastDashboardCreated: formatDate(row.last_dashboard_created),
      })),
    });
  } catch (error) {
    console.error('Error fetching charts/dashboards:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
