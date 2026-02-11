import { NextResponse } from 'next/server';
import { getUserCountsByPeriod, getMonthlyCorpMetrics, getUsersToday, getMonthlyNewUsersComparison, getLast30DaysUsers, getTotalUsersCount, loadSql } from '@/lib/queries';
import { query } from '@/lib/db';
import { formatMonthUtc, jsonError, withRequestContext } from '@/lib/api-helpers';
import { DateTime } from 'luxon';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
    // Get top domains for different time periods
    const domainSearch = searchParams.get('domainSearch') || '';
    const timestampType = searchParams.get('timestampType') || 'created_at'; // 'created_at' or 'last_active_at'
    const timestampField = timestampType === 'last_active_at' ? 'last_active_at' : 'created_at';
    const newUsersPeriod = (searchParams.get('newUsersPeriod') as 'day' | 'week' | 'month' | 'year') || 'month';
    
    const getTopDomains = async (days: number) => {
      // Add domain filter if provided
      let domainFilter = '';
      if (domainSearch) {
        domainFilter = `SUBSTRING(username FROM POSITION('@' IN username) + 1) ILIKE '%${domainSearch.replace(/'/g, "''")}%'`;
      }
      
      // Render template with all placeholders (filters from request context)
      const sql = loadSql('top-domains.sql', { 
        days, 
        timestamp_field: timestampField,
        domain_filter: domainFilter
      });
      return query<{ domain: string; user_count: string }>(sql);
    };

    // Load and render hourly registrations SQL template for different day offsets
    const getHourlyRegistrationsSql = (daysOffset: number) => {
      return loadSql('hourly-registrations.sql', { 
        days_offset: daysOffset
      });
    };

    // Use period-specific query for combined chart (single query with cumulative calc in DB)
    const periodUserCountsPromise = getUserCountsByPeriod(newUsersPeriod);

    // Still need monthly data for metrics and table (reuse when period is 'month')
    const monthlyUserCountsPromise = newUsersPeriod === 'month'
      ? periodUserCountsPromise
      : getUserCountsByPeriod('month');

    const [periodUserCounts, userCounts, corpMetrics, usersToday, monthlyNewUsers, last30DaysUsers, totalUsersCount, topDomains1d, topDomains7d, topDomains30d, hourlyRegistrationsRaw, hourlyRegistrationsYesterdayRaw, hourlyRegistrationsLastWeekRaw] = await Promise.all([
      periodUserCountsPromise,
      monthlyUserCountsPromise,
      getMonthlyCorpMetrics(),
      getUsersToday(),
      getMonthlyNewUsersComparison(),
      getLast30DaysUsers(),
      getTotalUsersCount(),
      getTopDomains(1),
      getTopDomains(7),
      getTopDomains(30),
      query<{ hour: Date; new_users: string }>(getHourlyRegistrationsSql(0)),
      query<{ hour: Date; new_users: string }>(getHourlyRegistrationsSql(1)),
      query<{ hour: Date; new_users: string }>(getHourlyRegistrationsSql(7)),
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

    let cumulativeYesterday = 0;
    const yesterdayMap = new Map<number, number>();
    hourlyRegistrationsYesterdayRaw.forEach((row) => {
      const newUsers = Number(row.new_users);
      cumulativeYesterday += newUsers;
      const hourOfDay = new Date(row.hour).getUTCHours();
      yesterdayMap.set(hourOfDay, cumulativeYesterday);
    });

    let cumulativeLastWeek = 0;
    const lastWeekMap = new Map<number, number>();
    hourlyRegistrationsLastWeekRaw.forEach((row) => {
      const newUsers = Number(row.new_users);
      cumulativeLastWeek += newUsers;
      const hourOfDay = new Date(row.hour).getUTCHours();
      lastWeekMap.set(hourOfDay, cumulativeLastWeek);
    });

    // Merge cumulative values by hour of day
    const hourlyRegistrationsWithComparisons = hourlyRegistrations.map((row) => {
      const hourOfDay = new Date(row.hour).getUTCHours();
      return {
        ...row,
        cumulativeYesterday: yesterdayMap.get(hourOfDay) ?? null,
        cumulativeLastWeek: lastWeekMap.get(hourOfDay) ?? null,
      };
    });

    const corpMetricsMap = new Map(
      corpMetrics.map((row) => [formatMonthUtc(new Date(row.month)), row])
    );

    // Always use monthly data for monthlyData (for Total Registered Users chart)
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

    // Format period-specific data for combined chart (cumulative total_users already calculated in DB)
    const formatPeriodKey = (date: Date): string => {
      const d = new Date(date);
      if (newUsersPeriod === 'week') {
        const weekStart = DateTime.fromJSDate(d).startOf('week');
        return weekStart.toFormat('yyyy-MM-dd');
      } else if (newUsersPeriod === 'year') {
        return DateTime.fromJSDate(d).toFormat('yyyy');
      } else {
        return formatMonthUtc(d);
      }
    };

    const combinedDataByPeriod = periodUserCounts.map((row, index) => {
      const periodKey = formatPeriodKey(new Date(row.month));
      const prevRow = index > 0 ? periodUserCounts[index - 1] : null;

      const totalUsers = Number(row.total_users); // Already cumulative from DB
      const prevTotalUsers = prevRow ? Number(prevRow.total_users) : 0;
      const totalUsersMomChange = prevTotalUsers > 0
        ? Math.round(((totalUsers - prevTotalUsers) / prevTotalUsers) * 100)
        : 0;

      const newUsers = Number(row.new_users);
      const prevNewUsers = prevRow ? Number(prevRow.new_users) : 0;
      const newUsersMomChange = prevNewUsers > 0
        ? Math.round(((newUsers - prevNewUsers) / prevNewUsers) * 100)
        : 0;

      return {
        month: periodKey,
        totalUsers,
        newUsers,
        totalUsersMomChange,
        newUsersMomChange,
      };
    });

    return NextResponse.json({ 
      monthlyData,
      combinedDataByPeriod,
      hourlyRegistrations: hourlyRegistrationsWithComparisons,
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
      last30DaysUsers: {
        last30Days: Number(last30DaysUsers[0]?.last_30_days || 0),
        previous30Days: Number(last30DaysUsers[0]?.previous_30_days || 0),
        last30DaysSameTime1YearAgo: Number(last30DaysUsers[0]?.last_30_days_same_time_1_year_ago || 0),
      },
      totalUsers: Number(totalUsersCount[0]?.total_users || 0),
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
