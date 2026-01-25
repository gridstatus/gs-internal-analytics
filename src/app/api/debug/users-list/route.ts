import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const search = searchParams.get('search') || '';
    const id = searchParams.get('id');
    const queryType = searchParams.get('type') || 'search'; // 'search' or 'detail'

    if (queryType === 'detail' && id) {
      // Detail queries
      const queries = [
        {
          name: 'user_lookup',
          sql: `SELECT id, username, first_name, last_name, created_at, last_active_at, is_admin
                FROM api_server.users WHERE id = $1`,
          params: [id],
        },
        {
          name: 'organizations',
          sql: `SELECT o.id, o.name, uo.role
                FROM api_server.organizations o
                JOIN api_server.user_organizations uo ON uo.organization_id = o.id
                WHERE uo.user_id = $1`,
          params: [id],
        },
        {
          name: 'stats',
          sql: `SELECT
                  (SELECT COUNT(*) FROM api_server.charts WHERE user_id = $1) as chart_count,
                  (SELECT COUNT(*) FROM api_server.dashboards WHERE user_id = $1) as dashboard_count`,
          params: [id],
        },
        {
          name: 'api_usage_30d',
          sql: `SELECT COUNT(*) as request_count, COALESCE(SUM(rows_returned), 0) as rows_returned
                FROM api_server.api_key_usage
                WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '30 days'`,
          params: [id],
        },
        {
          name: 'api_keys',
          sql: `SELECT 
                  api_key,
                  MIN(timestamp) as first_used,
                  MAX(timestamp) as last_used,
                  COUNT(*) as request_count
                FROM api_server.api_key_usage
                WHERE user_id = $1 AND api_key IS NOT NULL
                GROUP BY api_key
                ORDER BY MAX(timestamp) DESC`,
          params: [id],
        },
      ];

      const results: Record<string, unknown> = {};
      
      for (const q of queries) {
        const explainSql = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON) ${q.sql}`;
        try {
          const result = await query<{ 'QUERY PLAN': unknown }>(explainSql, q.params);
          results[q.name] = {
            queryPlan: result[0]?.['QUERY PLAN'],
          };
        } catch (error) {
          results[q.name] = { error: getErrorMessage(error) };
        }
      }

      return NextResponse.json({ queries: results });
    } else {
      // Search query
      const searchSql = `
        SELECT 
          u.id, 
          u.username, 
          u.first_name, 
          u.last_name, 
          u.created_at, 
          u.last_active_at,
          CASE WHEN ak.user_id IS NOT NULL THEN true ELSE false END as has_api_key
        FROM api_server.users u
        LEFT JOIN (
          SELECT DISTINCT user_id
          FROM api_server.api_key_usage
          WHERE api_key IS NOT NULL
        ) ak ON ak.user_id = u.id
        WHERE u.username ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1
        ORDER BY u.last_active_at DESC NULLS LAST
        LIMIT 100
      `;

      const explainSql = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON) ${searchSql}`;
      const result = await query<{ 'QUERY PLAN': unknown }>(explainSql, [`%${search}%`]);
      
      // Also get text version
      const explainTextSql = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE) ${searchSql}`;
      const textResult = await query<{ 'QUERY PLAN': string }>(explainTextSql, [`%${search}%`]);
      const textPlan = textResult.map(row => row['QUERY PLAN']).join('\n');

      return NextResponse.json({
        queryPlanJson: result[0]?.['QUERY PLAN'],
        queryPlanText: textPlan,
        searchTerm: search,
      });
    }
  } catch (error) {
      console.error('Error running EXPLAIN:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}

