import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { renderSqlTemplate } from '@/lib/queries';
import { formatDateOnly, getFilterInternal, getFilterFree, jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const filterInternal = getFilterInternal(searchParams);
      const filterFree = getFilterFree(searchParams);

    // Get summary stats (filtered)
    const alertStats = await query<{ total: string; users: string }>(
      renderSqlTemplate('summary-alerts.sql', { filterInternal, filterFree })
    );

    // Get user breakdown for alerts
    const alertsSql = renderSqlTemplate('alerts-by-user.sql', { filterInternal, filterFree });
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

