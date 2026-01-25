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
    
    // Also get text version for easier reading
    const explainTextSql = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE) ${sql}`;
    const textResult = await query<{ 'QUERY PLAN': string }>(explainTextSql);
    const textPlan = textResult.map(row => row['QUERY PLAN']).join('\n');
    
    // Get the query plan JSON
    const queryPlan = result[0]?.['QUERY PLAN'];
    
    // Extract execution time from the plan
    let executionTime = 0;
    if (queryPlan && typeof queryPlan === 'object' && 'Execution Time' in queryPlan) {
      executionTime = Number(queryPlan['Execution Time']) || 0;
    } else if (Array.isArray(queryPlan) && queryPlan[0] && typeof queryPlan[0] === 'object' && 'Execution Time' in queryPlan[0]) {
      executionTime = Number(queryPlan[0]['Execution Time']) || 0;
    }
    
    return NextResponse.json({
      queryPlanJson: queryPlan,
      queryPlanText: textPlan,
      executionTimeMs: executionTime,
      executionTimeSeconds: (executionTime / 1000).toFixed(2),
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

