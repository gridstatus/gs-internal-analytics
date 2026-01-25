import { NextResponse } from 'next/server';
import { getMonthlyUserCounts, getMonthlyCorpMetrics, getUsersToday } from '@/lib/queries';
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
    
    const [userCounts, corpMetrics, usersToday] = await Promise.all([
      getMonthlyUserCounts(filterGridstatus),
      getMonthlyCorpMetrics(filterGridstatus),
      getUsersToday(filterGridstatus),
    ]);

    const corpMetricsMap = new Map(
      corpMetrics.map((row) => [formatMonth(new Date(row.month)), row])
    );

    const monthlyData = userCounts.map((row, index) => {
      const monthKey = formatMonth(new Date(row.month));
      const corp = corpMetricsMap.get(monthKey);
      const prevRow = index > 0 ? userCounts[index - 1] : null;

      const totalUsers = Number(row.total_users);
      const prevTotalUsers = prevRow ? Number(prevRow.total_users) : 0;
      const totalUsersMomChange = prevTotalUsers > 0
        ? Math.round(((totalUsers - prevTotalUsers) / prevTotalUsers) * 100)
        : 0;

      const newUsers = Number(row.new_users);
      const prevNewUsers = prevRow ? Number(prevRow.new_users) : 0;
      const newUsersMomChange = prevNewUsers > 0
        ? Math.round(((newUsers - prevNewUsers) / prevNewUsers) * 100)
        : 0;

      const corpUsers = Number(row.total_corp_users);
      const prevCorpUsers = prevRow ? Number(prevRow.total_corp_users) : 0;
      const corpUsersMomChange = prevCorpUsers > 0
        ? Math.round(((corpUsers - prevCorpUsers) / prevCorpUsers) * 100)
        : 0;

      const teams = corp ? Number(corp.teams) : 0;
      const usersOnTeams = corp ? Number(corp.users_on_teams) : 0;

      return {
        month: monthKey,
        totalUsers,
        newUsers,
        totalCorpUsers: corpUsers,
        newCorpUsers: Number(row.new_corp_users),
        corpDomains: corp ? Number(corp.corp_domains) : 0,
        teams,
        usersOnTeams,
        totalUsersMomChange,
        newUsersMomChange,
        corpUsersMomChange,
      };
    });

    return NextResponse.json({ 
      monthlyData,
      usersToday: Number(usersToday[0]?.users_today || 0),
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
