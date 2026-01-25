import { NextResponse } from 'next/server';
import { getMonthlyUserCounts, getMonthlyCorpMetrics, getUsersToday, getMonthlyNewUsersComparison, loadSql, renderSqlTemplate } from '@/lib/queries';
import { query } from '@/lib/db';
import { formatMonthUtc, getFilterGridstatus, jsonError, withRequestContext } from '@/lib/api-helpers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const filterGridstatus = getFilterGridstatus(searchParams);
    
    // Get top domains for different time periods
    const domainSearch = searchParams.get('domainSearch') || '';
    const timestampType = searchParams.get('timestampType') || 'created_at'; // 'created_at' or 'last_active_at'
    const timestampField = timestampType === 'last_active_at' ? 'last_active_at' : 'created_at';
    
    const getTopDomains = async (days: number) => {
      let sql = loadSql('top-domains.sql');
      
      // Replace custom placeholders first (before renderSqlTemplate)
      sql = sql.replace(/\{\{DAYS\}\}/g, days.toString());
      sql = sql.replace(/\{\{TIMESTAMP_FIELD\}\}/g, timestampField);
      
      // Add domain filter if provided
      let domainFilter = '';
      if (domainSearch) {
        domainFilter = `AND SUBSTRING(username FROM POSITION('@' IN username) + 1) ILIKE '%${domainSearch.replace(/'/g, "''")}%'`;
      }
      sql = sql.replace(/\{\{DOMAIN_FILTER\}\}/g, domainFilter);
      
      // Then render the template placeholders
      sql = renderSqlTemplate(sql, { filterGridstatus });
      return query<{ domain: string; user_count: string }>(sql);
    };

    const hourlyRegistrationsSql = `
      WITH hours AS (
        SELECT generate_series(
          DATE_TRUNC('day', NOW()),
          DATE_TRUNC('hour', NOW()),
          INTERVAL '1 hour'
        ) AS hour
      ),
      counts AS (
        SELECT
          DATE_TRUNC('hour', created_at) AS hour,
          COUNT(*) AS new_users
        FROM api_server.users
        WHERE created_at >= DATE_TRUNC('day', NOW())
          AND created_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
          AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
          {{INTERNAL_EMAIL_FILTER}}
        GROUP BY 1
      )
      SELECT h.hour, COALESCE(c.new_users, 0) AS new_users
      FROM hours h
      LEFT JOIN counts c ON c.hour = h.hour
      ORDER BY h.hour ASC
    `;

    const [userCounts, corpMetrics, usersToday, monthlyNewUsers, topDomains1d, topDomains7d, topDomains30d, hourlyRegistrationsRaw] = await Promise.all([
      getMonthlyUserCounts(filterGridstatus),
      getMonthlyCorpMetrics(filterGridstatus),
      getUsersToday(filterGridstatus),
      getMonthlyNewUsersComparison(filterGridstatus),
      getTopDomains(1),
      getTopDomains(7),
      getTopDomains(30),
      query<{ hour: Date; new_users: string }>(
        renderSqlTemplate(hourlyRegistrationsSql, { filterGridstatus })
      ),
    ]);

    let cumulativeUsers = 0;
    const hourlyRegistrations = hourlyRegistrationsRaw.map((row) => {
      const newUsers = Number(row.new_users);
      cumulativeUsers += newUsers;
      return {
        hour: row.hour.toISOString(),
        newUsers,
        cumulativeUsers,
      };
    });

    const corpMetricsMap = new Map(
      corpMetrics.map((row) => [formatMonthUtc(new Date(row.month)), row])
    );

    const monthlyData = userCounts.map((row, index) => {
      const monthKey = formatMonthUtc(new Date(row.month));
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
      hourlyRegistrations,
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
        lastYearMonthAll: Number(monthlyNewUsers[0]?.last_year_month_all || 0),
        lastYearMonthSameTime: Number(monthlyNewUsers[0]?.last_year_month_same_time || 0),
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
      return jsonError(error);
    }
  });
}
