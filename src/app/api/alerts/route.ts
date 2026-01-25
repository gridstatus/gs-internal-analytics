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
    const summarySql = `
      SELECT COUNT(*) as total, COUNT(DISTINCT a.user_id) as users 
      FROM api_server.alerts a
      JOIN api_server.users u ON u.id = a.user_id
      WHERE SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    `;
    const filteredSummarySql = renderSqlTemplate(summarySql, { filterGridstatus });
    const alertStats = await query<{ total: string; users: string }>(filteredSummarySql);

    // Get user breakdown for alerts
    const alertsSqlPath = join(process.cwd(), 'src/sql/alerts-by-user.sql');
    let alertsSql = readFileSync(alertsSqlPath, 'utf-8');
    alertsSql = renderSqlTemplate(alertsSql, { filterGridstatus });
    const alertsBreakdown = await query<{
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
        username: row.username,
        domain: row.domain,
        alertCount: Number(row.alert_count),
        lastAlertCreated: formatDate(row.last_alert_created),
      })),
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

