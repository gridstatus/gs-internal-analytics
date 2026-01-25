import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '1', 10);
    
    // Validate days parameter
    const validDays = [1, 7, 30, 90];
    if (!validDays.includes(days)) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be 1, 7, 30, or 90' },
        { status: 400 }
      );
    }

    // For 1 day, use hourly aggregation; for others, use daily
    const truncFunction = days === 1 ? 'hour' : 'day';
    const intervalDays = days;
    
    // Build the interval string for generate_series
    const intervalStep = days === 1 ? "INTERVAL '1 hour'" : "INTERVAL '1 day'";
    
    const usageData = await query<{
      period: Date;
      request_count: string;
      rows_returned: string;
    }>(`
      WITH all_periods AS (
        SELECT generate_series(
          DATE_TRUNC($2, NOW() - INTERVAL '1 day' * $3),
          DATE_TRUNC($2, NOW()),
          ${intervalStep}
        ) AS period
      ),
      usage_data AS (
        SELECT
          DATE_TRUNC($2, timestamp) AS period,
          COUNT(*) AS request_count,
          COALESCE(SUM(rows_returned), 0) AS rows_returned
        FROM api_server.api_key_usage
        WHERE user_id = $1
          AND timestamp >= NOW() - INTERVAL '1 day' * $3
        GROUP BY DATE_TRUNC($2, timestamp)
      )
      SELECT
        ap.period,
        COALESCE(ud.request_count::bigint, 0) AS request_count,
        COALESCE(ud.rows_returned::bigint, 0) AS rows_returned
      FROM all_periods ap
      LEFT JOIN usage_data ud ON ap.period = ud.period
      ORDER BY ap.period ASC
    `, [id, truncFunction, intervalDays]);

    return NextResponse.json({
      data: usageData.map(row => ({
        period: row.period.toISOString(),
        requestCount: Number(row.request_count),
        rowsReturned: Number(row.rows_returned),
      })),
    });
  } catch (error) {
    console.error('Error fetching API usage:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

