import { NextResponse } from 'next/server';
import {
  getMonthlyUserCounts,
  getMonthlyApiUsage,
  getMonthlyCorpMetrics,
  getDomainDistribution,
  getDomainSummary,
  loadRenderedHogql,
} from '@/lib/queries';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext, getFilterInternal, getFilterFree } from '@/lib/api-helpers';

interface PosthogMau {
  month: string;
  mau: number;
}

async function fetchPosthogMaus(filterInternal: boolean = true, filterFree: boolean = true): Promise<Map<string, number>> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return new Map();
  }

  const hogql = loadRenderedHogql('posthog-mau.hogql', {
    filterInternal,
    filterFree,
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
    console.error('PostHog API error:', response.status);
    return new Map();
  }

  const data = await response.json();
  const results: [string, number][] = data.results || [];

  const mauMap = new Map<string, number>();
  for (const [month, mau] of results) {
    // PostHog returns dates like "2024-01-01", extract YYYY-MM
    const monthKey = month.slice(0, 7);
    mauMap.set(monthKey, mau);
  }

  return mauMap;
}

function formatMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const filterInternal = getFilterInternal(searchParams);
      const filterFree = getFilterFree(searchParams);
    
    // Run all queries in parallel
    const [userCounts, apiUsage, corpMetrics, domainDistribution, domainSummaryResult, posthogMaus] =
      await Promise.all([
        getMonthlyUserCounts(filterInternal, filterFree),
        getMonthlyApiUsage(filterInternal, filterFree),
        getMonthlyCorpMetrics(filterInternal, filterFree),
        getDomainDistribution(filterInternal, filterFree),
        getDomainSummary(filterInternal, filterFree),
        fetchPosthogMaus(filterInternal, filterFree),
      ]);

    // Create lookup maps for efficient merging
    const apiUsageMap = new Map(
      apiUsage.map((row) => [formatMonth(new Date(row.month)), row])
    );
    const corpMetricsMap = new Map(
      corpMetrics.map((row) => [formatMonth(new Date(row.month)), row])
    );

    // Merge all data into monthly metrics
    const monthlyMetrics = userCounts.map((row) => {
      const monthKey = formatMonth(new Date(row.month));
      const api = apiUsageMap.get(monthKey);
      const corp = corpMetricsMap.get(monthKey);
      const posthogMau = posthogMaus.get(monthKey) ?? 0;

      const totalUsers = Number(row.total_users);
      const teams = corp ? Number(corp.teams) : 0;
      const usersOnTeams = corp ? Number(corp.users_on_teams) : 0;

      return {
        month: monthKey,
        totalUsers,
        newUsers: Number(row.new_users),
        totalCorpUsers: Number(row.total_corp_users),
        newCorpUsers: Number(row.new_corp_users),
        corpDomains: corp ? Number(corp.corp_domains) : 0,
        teams,
        usersOnTeams,
        posthogMaus: posthogMau,
        totalApiRequests: api ? Number(api.total_api_requests) : 0,
        totalApiRowsReturned: api ? Number(api.total_api_rows_returned) : 0,
        uniqueApiUsers: api ? Number(api.unique_api_users) : 0,
        percentActiveUsers:
          totalUsers > 0 ? Math.round((posthogMau / totalUsers) * 100) : 0,
        avgTeamSize: teams > 0 ? Math.round((usersOnTeams / teams) * 10) / 10 : 0,
      };
    });

    // Format domain distribution
    const formattedDomainDistribution = domainDistribution.map((row) => ({
      usersBucket: Number(row.users_bucket),
      domainCount: Number(row.domain_count),
    }));

    // Get summary
    const summary = domainSummaryResult[0]
      ? {
          totalCorpDomains: Number(domainSummaryResult[0].total_corp_domains),
          teamsCount: Number(domainSummaryResult[0].teams_count),
          usersOnTeams: Number(domainSummaryResult[0].users_on_teams),
        }
      : {
          totalCorpDomains: 0,
          teamsCount: 0,
          usersOnTeams: 0,
        };

    return NextResponse.json({
      monthlyMetrics,
      domainDistribution: formattedDomainDistribution,
      summary,
    });
  } catch (error) {
      console.error('Error fetching metrics:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}
