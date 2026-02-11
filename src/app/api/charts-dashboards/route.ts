import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { loadSql } from '@/lib/queries';
import { formatDateOnly, jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
    // Get summary stats (combined single query) and user breakdown in parallel
    const [summaryStats, userBreakdown] = await Promise.all([
      query<{ chart_total: string; chart_users: string; dashboard_total: string; dashboard_users: string }>(
        loadSql('summary-charts-dashboards.sql', {})
      ),
      query<{
      user_id: number;
      username: string;
      domain: string;
      chart_count: string;
      dashboard_count: string;
      last_chart_created: Date | null;
      last_dashboard_created: Date | null;
    }>(loadSql('charts-dashboards-by-user.sql', {})),
    ]);

    return NextResponse.json({
      summary: {
        totalCharts: Number(summaryStats[0].chart_total),
        totalDashboards: Number(summaryStats[0].dashboard_total),
        chartUsers: Number(summaryStats[0].chart_users),
        dashboardUsers: Number(summaryStats[0].dashboard_users),
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
