import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { loadSql } from '@/lib/queries';
import { formatDateOnly, jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
    // Get summary stats (filtered via request context)
    const alertStats = await query<{ total: string; users: string }>(
      loadSql('summary-alerts.sql', {})
    );

    // Get user breakdown for alerts
    const alertsSql = loadSql('alerts-by-user.sql', {});
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

