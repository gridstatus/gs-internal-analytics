import { NextResponse } from 'next/server';
import { getFilterInternal, getFilterFree, jsonError, withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql } from '@/lib/queries';

async function fetchPosthogActiveUsers(period: 'day' | 'week' | 'month', filterInternal: boolean, filterFree: boolean): Promise<{ period: string; activeUsers: number }[]> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return [];
  }

  // Determine the date function and format based on period
  let dateFunction: string;
  let dateFormat: string;
  let dateFilter: string;
  
  // Always order DESC to get most recent data first
  // If PostHog has result limits, this ensures we get the most recent periods
  const orderDirection = 'DESC';
  
  if (period === 'day') {
    dateFunction = 'toStartOfDay(timestamp)';
    dateFormat = 'YYYY-MM-DD';
    // For daily data, limit to last 2 years to avoid hitting PostHog query limits
    dateFilter = "AND timestamp >= now() - INTERVAL 2 YEAR";
  } else if (period === 'week') {
    dateFunction = 'toStartOfWeek(timestamp)';
    dateFormat = 'YYYY-MM-DD';
    // For weekly data, limit to last 3 years
    dateFilter = "AND timestamp >= now() - INTERVAL 3 YEAR";
  } else {
    dateFunction = 'toStartOfMonth(timestamp)';
    dateFormat = 'YYYY-MM';
    // For monthly data, no date filter needed (fewer rows)
    dateFilter = '';
  }

  const hogql = loadRenderedHogql('posthog-active-users.hogql', {
    filterInternal,
    filterFree,
    dateFunction,
    dateFilter,
    orderDirection,
  });

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
  const payload = {
    query: {
      kind: 'HogQLQuery',
      query: hogql,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('PostHog API error:', response.status, errorText);
    return [];
  }

  const data = await response.json();
  
  // Log warnings or limits if present
  if (data.warnings) {
    console.warn('PostHog query warnings:', data.warnings);
  }
  if (data.limit_reached) {
    console.warn('PostHog query limit reached - results may be truncated');
  }
  
  const results: [string, number][] = data.results || [];
  
  // Log the number of results and date range (before reversing)
  if (results.length > 0) {
    const firstDate = results[0][0]; // Most recent (since we ordered DESC)
    const lastDate = results[results.length - 1][0]; // Oldest in result set
    console.log(`PostHog ${period} query returned ${results.length} results. Most recent: ${firstDate}, Oldest in set: ${lastDate}`);
  }

  // Reverse results to get chronological order (oldest to newest) for display
  // We ordered DESC to prioritize most recent data if PostHog limits results
  const sortedResults = results.reverse();

  return sortedResults.map(([periodDate, activeUsers]) => {
    const date = new Date(periodDate);
    let formattedPeriod: string;
    
    if (period === 'day') {
      formattedPeriod = date.toISOString().slice(0, 10);
    } else if (period === 'week') {
      // Format as YYYY-MM-DD (start of week)
      formattedPeriod = date.toISOString().slice(0, 10);
    } else {
      formattedPeriod = date.toISOString().slice(0, 7);
    }
    
    return {
      period: formattedPeriod,
      activeUsers,
    };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const filterInternal = getFilterInternal(searchParams);
      const filterFree = getFilterFree(searchParams);
      const period = (searchParams.get('period') || 'month') as 'day' | 'week' | 'month';
    
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be day, week, or month' },
        { status: 400 }
      );
    }

    const activeUsers = await fetchPosthogActiveUsers(period, filterInternal, filterFree);

    // Calculate period-over-period change
    const periodData = activeUsers.map((row, index) => {
      const prevActive = index > 0 ? activeUsers[index - 1].activeUsers : 0;
      const periodChange = prevActive > 0 
        ? Math.round(((row.activeUsers - prevActive) / prevActive) * 100) 
        : 0;

      return {
        period: row.period,
        activeUsers: row.activeUsers,
        periodChange,
      };
    });

    return NextResponse.json({ 
      periodData,
      periodType: period,
    });
  } catch (error) {
      console.error('Error fetching PostHog Active Users:', error);
      return jsonError(error);
    }
  });
}
