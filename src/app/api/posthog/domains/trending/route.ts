import { NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/db';
import { withRequestContext } from '@/lib/api-helpers';
import { loadRenderedHogql, getTotalUsersByDomain } from '@/lib/queries';
import { runPosthogQuery, PostHogThrottledError, PostHogServerError } from '@/lib/posthog';

const MIN_TOTAL_ACTIVE_USERS = 2;

export interface TrendingDomainRow {
  domain: string;
  avgWau: number;
  last30: number;
  prev30: number;
  absoluteTrend: number;
  percentTrend: number | null;
  totalRegistered: number;
}

export interface TrendingDomainsResponse {
  domains: TrendingDomainRow[];
  periodLabels: [string, string];
}

function buildTrendingDomains(
  rows: { domain: string; period: string; activeUsers: number }[],
  totalRegisteredByDomain: Map<string, number>
): TrendingDomainsResponse {
  const domainPeriods = new Map<string, { last30: number; prev30: number }>();
  for (const r of rows) {
    if (!domainPeriods.has(r.domain)) {
      domainPeriods.set(r.domain, { last30: 0, prev30: 0 });
    }
    const d = domainPeriods.get(r.domain)!;
    if (r.period === 'last30') d.last30 = r.activeUsers;
    else if (r.period === 'prev30') d.prev30 = r.activeUsers;
  }

  const domains: TrendingDomainRow[] = [];
  for (const [domain, counts] of domainPeriods) {
    const { last30, prev30 } = counts;
    const sum = last30 + prev30;
    if (sum < MIN_TOTAL_ACTIVE_USERS) continue;
    // Exclude low-activity noise: (1,1) or (0,1) or (1,0)
    if ((last30 === 1 && prev30 === 1) || (last30 === 0 && prev30 === 1) || (last30 === 1 && prev30 === 0)) continue;

    const avgWau = sum / 2;
    const absoluteTrend = last30 - prev30;
    const percentTrend = prev30 === 0 ? null : (absoluteTrend / prev30) * 100;

    domains.push({
      domain,
      avgWau,
      last30,
      prev30,
      absoluteTrend,
      percentTrend,
      totalRegistered: totalRegisteredByDomain.get(domain) ?? 0,
    });
  }

  return {
    domains,
    periodLabels: ['Last 30 days', '30-60 days ago'],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const [results, dbRows] = await Promise.all([
        (async () => {
          const hogql = loadRenderedHogql('trending-domain-weekly-users.hogql', {
            filterFree: true,
          });
          return runPosthogQuery(hogql);
        })(),
        getTotalUsersByDomain(),
      ]);

      const rows = (results as [string, string, number][]).map(([domain, period, activeUsers]) => ({
        domain: String(domain ?? '').trim(),
        period: String(period ?? ''),
        activeUsers: Number(activeUsers ?? 0),
      }));

      const totalRegisteredByDomain = new Map(
        dbRows.map((r) => [r.domain, Number(r.total_users)])
      );

      const { domains, periodLabels } = buildTrendingDomains(rows, totalRegisteredByDomain);

      return NextResponse.json({ domains, periodLabels });
    } catch (error) {
      console.error('Error fetching trending domains:', error);
      if (error instanceof PostHogThrottledError || error instanceof PostHogServerError) {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
    }
  });
}
