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
    const summarySql = `
      SELECT COUNT(*) as total, COUNT(DISTINCT a.user_id) as users 
      FROM api_server.alerts a
      JOIN api_server.users u ON u.id = a.user_id
      WHERE 1=1
        AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    `;
    const filteredSummarySql = renderSqlTemplate(summarySql, { filterGridstatus });
    const alertStats = await query<{ total: string; users: string }>(filteredSummarySql);

    // Get user breakdown for alerts
    const alertsSql = loadRenderedSql('alerts-by-user.sql', { filterGridstatus });
    const alertsBreakdown = await query<{
      user_id: number;
      username: string;
      domain: string;
      alert_count: string;
      last_alert_created: Date | null;
    }>(alertsSql);

    return NextResponse.json({
      summary: {
        totalAlerts: Number(alertStats[0]?.total || 0),
        alertUsers: Number(alertStats[0]?.users || 0),
      },
      users: alertsBreakdown.map((row) => ({
        userId: row.user_id,
        username: row.username,
        domain: row.domain,
        alertCount: Number(row.alert_count),
        lastAlertCreated: formatDateOnly(row.last_alert_created),
      })),
    });
  } catch (error) {
      console.error('Error fetching alerts:', error);
      return jsonError(error);
    }
  });
}

