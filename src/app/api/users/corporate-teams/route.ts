import { NextResponse } from 'next/server';
import { getMonthlyUserCounts, getMonthlyCorpMetrics } from '@/lib/queries';
import { getErrorMessage } from '@/lib/db';

function formatMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterGridstatus = searchParams.get('filterGridstatus') !== 'false';
    
    const [userCounts, corpMetrics] = await Promise.all([
      getMonthlyUserCounts(filterGridstatus),
      getMonthlyCorpMetrics(filterGridstatus),
    ]);

    const corpMetricsMap = new Map(
      corpMetrics.map((row) => [formatMonth(new Date(row.month)), row])
    );

    const monthlyData = userCounts.map((row, index) => {
      const monthKey = formatMonth(new Date(row.month));
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
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

