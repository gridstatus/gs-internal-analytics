import { NextResponse } from 'next/server';
import { query, getErrorMessage } from '@/lib/db';
import { loadSql, renderSqlTemplate } from '@/lib/queries';
import { withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const filterGridstatus = searchParams.get('filterGridstatus') !== 'false';
    
    // Load the user-activities SQL query
    let sql = loadSql('user-activities.sql');
    
    // Render the template with the filter context
    sql = renderSqlTemplate(sql, { filterGridstatus });
    
    // Run EXPLAIN ANALYZE
    const explainSql = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON) ${sql}`;
    
    const result = await query<{ 'QUERY PLAN': unknown }>(explainSql);
    
    // With FORMAT JSON, PostgreSQL returns a single row with a JSON array in 'QUERY PLAN'
    // The array contains the execution plan
    const queryPlan = result[0]?.['QUERY PLAN'];
    
    // Also get a text version for easier reading
    const explainTextSql = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE) ${sql}`;
    const textResult = await query<{ 'QUERY PLAN': string }>(explainTextSql);
    const textPlan = textResult.map(row => row['QUERY PLAN']).join('\n');
    
    return NextResponse.json({
      queryPlanJson: queryPlan,
      queryPlanText: textPlan,
      sql: sql.substring(0, 2000), // Include first 2000 chars of SQL for reference
      sqlLength: sql.length,
      filterGridstatus,
    });
  } catch (error) {
      console.error('Error running EXPLAIN:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}

