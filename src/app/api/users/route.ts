import { NextResponse } from 'next/server';
import { getMonthlyUserCounts, getMonthlyCorpMetrics, getUsersToday, getMonthlyNewUsersComparison } from '@/lib/queries';
import { getErrorMessage, query } from '@/lib/db';
import { loadSql, renderSqlTemplate } from '@/lib/queries';

function formatMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filterGridstatus = searchParams.get('filterGridstatus') !== 'false';
    
    // Get top domains for different time periods
    const domainSearch = searchParams.get('domainSearch') || '';
    const getTopDomains = async (days: number) => {
      let sql = loadSql('top-domains.sql');
      sql = sql.replace('{{DAYS}}', days.toString());
      
      // Add domain filter if provided
      let domainFilter = '';
      if (domainSearch) {
        domainFilter = `AND SUBSTRING(username FROM POSITION('@' IN username) + 1) ILIKE '%${domainSearch.replace(/'/g, "''")}%'`;
      }
      sql = sql.replace('{{DOMAIN_FILTER}}', domainFilter);
      
      sql = renderSqlTemplate(sql, { filterGridstatus });
      return query<{ domain: string; user_count: string }>(sql);
    };

    const [userCounts, corpMetrics, usersToday, monthlyNewUsers, topDomains1d, topDomains7d, topDomains30d] = await Promise.all([
      getMonthlyUserCounts(filterGridstatus),
      getMonthlyCorpMetrics(filterGridstatus),
      getUsersToday(filterGridstatus),
      getMonthlyNewUsersComparison(filterGridstatus),
      getTopDomains(1),
      getTopDomains(7),
      getTopDomains(30),
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
      usersToday: {
        today: Number(usersToday[0]?.users_today || 0),
        yesterdayAll: Number(usersToday[0]?.users_yesterday_all || 0),
        yesterdaySameTime: Number(usersToday[0]?.users_yesterday_same_time || 0),
        lastWeekAll: Number(usersToday[0]?.users_last_week_all || 0),
        lastWeekSameTime: Number(usersToday[0]?.users_last_week_same_time || 0),
      },
      monthlyNewUsers: {
        currentMonth: Number(monthlyNewUsers[0]?.current_month_all || 0),
        previousMonthAll: Number(monthlyNewUsers[0]?.previous_month_all || 0),
        previousMonthSameTime: Number(monthlyNewUsers[0]?.previous_month_same_time || 0),
      },
      topDomains: {
        '1d': topDomains1d.map(d => ({
          domain: d.domain,
          userCount: Number(d.user_count),
        })),
        '7d': topDomains7d.map(d => ({
          domain: d.domain,
          userCount: Number(d.user_count),
        })),
        '30d': topDomains30d.map(d => ({
          domain: d.domain,
          userCount: Number(d.user_count),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
