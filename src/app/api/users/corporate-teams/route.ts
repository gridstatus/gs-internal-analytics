import { NextResponse } from 'next/server';
import { getUserCountsByPeriod, getMonthlyCorpMetrics } from '@/lib/queries';
import { formatMonthUtc, jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
    const [userCounts, corpMetrics] = await Promise.all([
      getUserCountsByPeriod('month'),
      getMonthlyCorpMetrics(),
    ]);

    const corpMetricsMap = new Map(
      corpMetrics.map((row) => [formatMonthUtc(new Date(row.month)), row])
    );

    const monthlyData = userCounts.map((row, index) => {
      const monthKey = formatMonthUtc(new Date(row.month));
      const corp = corpMetricsMap.get(monthKey);
      const prevRow = index > 0 ? userCounts[index - 1] : null;

      const corpUsers = Number(row.total_corp_users);
      const prevCorpUsers = prevRow ? Number(prevRow.total_corp_users) : 0;
      const corpUsersMomChange = prevCorpUsers > 0
        ? Math.round(((corpUsers - prevCorpUsers) / prevCorpUsers) * 100)
        : 0;

      const teams = corp ? Number(corp.teams) : 0;
      const usersOnTeams = corp ? Number(corp.users_on_teams) : 0;

      return {
        month: monthKey,
        totalCorpUsers: corpUsers,
        newCorpUsers: Number(row.new_corp_users),
        corpDomains: corp ? Number(corp.corp_domains) : 0,
        teams,
        usersOnTeams,
        corpUsersMomChange,
      };
    });

    return NextResponse.json({ monthlyData });
  } catch (error) {
      console.error('Error fetching corporate and teams data:', error);
      return jsonError(error);
    }
  });
}

