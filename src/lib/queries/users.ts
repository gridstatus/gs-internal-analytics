import { query } from '../db';
import { loadSql } from './core';

export interface MonthlyUserCount {
  month: Date;
  new_users: number;
  total_users: number;
  new_corp_users: number;
  total_corp_users: number;
}

export async function getMonthlyUserCounts(): Promise<MonthlyUserCount[]> {
  const sql = loadSql('monthly-user-counts.sql', {});
  return query<MonthlyUserCount>(sql);
}

export async function getUserCountsByPeriod(period: 'day' | 'week' | 'month' | 'year'): Promise<MonthlyUserCount[]> {
  const sql = loadSql('user-counts-by-period.sql', { period });
  return query<MonthlyUserCount>(sql);
}

export interface ActiveUsers {
  active_24h: number;
  active_7d: number;
  active_30d: number;
  active_90d: number;
  total_users: number;
}

export async function getActiveUsers(): Promise<ActiveUsers[]> {
  const sql = loadSql('active-users.sql', {});
  return query<ActiveUsers>(sql);
}

export interface ActiveUsersByDomain {
  domain: string;
  active_24h: number;
  active_7d: number;
  active_30d: number;
  active_90d: number;
  total_users: number;
}

export async function getActiveUsersByDomain(): Promise<ActiveUsersByDomain[]> {
  const sql = loadSql('active-users-by-domain.sql', {});
  return query<ActiveUsersByDomain>(sql);
}

export interface MostEngagedUser {
  user_id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  reaction_count: number;
  likes_count: number;
  dislikes_count: number;
  engagement_count: number;
  save_count: number;
  total_engagement_score: number;
}

export async function getMostEngagedUsers(days: number | null = null): Promise<MostEngagedUser[]> {
  let timeFilterReactions = '';
  let timeFilterViews = '';
  let timeFilterSaves = '';

  if (days !== null) {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
    cutoffDate.setUTCHours(0, 0, 0, 0);
    const cutoffDateStr = cutoffDate.toISOString();

    timeFilterReactions = `r.created_at >= '${cutoffDateStr}'`;
    timeFilterViews = `pv.viewed_at >= '${cutoffDateStr}'`;
    timeFilterSaves = `sp.created_at >= '${cutoffDateStr}'`;
  }

  const sql = loadSql('top-engaged-users.sql', {
    usernamePrefix: 'u.',
    time_filter_reactions: timeFilterReactions,
    time_filter_views: timeFilterViews,
    time_filter_saves: timeFilterSaves
  });
  return query<MostEngagedUser>(sql);
}

export interface UserActivity {
  user_id: number;
  username: string;
  activity_date: Date;
  activity_type: 'user_registered' | 'joined_org' | 'created_chart' | 'created_dashboard' | 'created_api_key' | 'created_alert';
  activity_detail: string | null;
}

export async function getUserActivities(): Promise<UserActivity[]> {
  const sql = loadSql('user-activities.sql', {});
  return query<UserActivity>(sql);
}

export interface NewUsersLast3Months {
  month: Date;
  new_users: number;
}

export async function getNewUsersLast3Months(): Promise<NewUsersLast3Months[]> {
  const sql = loadSql('last-3-months-new-users.sql', {});
  return query<NewUsersLast3Months>(sql);
}

export interface TopRegistration {
  period: Date;
  period_type: 'day' | 'week' | 'month';
  registration_count: number;
}

export async function getTopRegistrations(): Promise<TopRegistration[]> {
  const sql = loadSql('top-registrations.sql', {});
  return query<TopRegistration>(sql);
}

export interface UsersToday {
  users_today: number;
  users_yesterday_all: number;
  users_yesterday_same_time: number;
  users_last_week_all: number;
  users_last_week_same_time: number;
}

export interface MonthlyNewUsers {
  current_month_all: number;
  previous_month_all: number;
  previous_month_same_time: number;
  last_year_month_all: number;
  last_year_month_same_time: number;
}

export async function getMonthlyNewUsersComparison(): Promise<MonthlyNewUsers[]> {
  const sql = loadSql('monthly-new-users-comparison.sql', {});
  return query<MonthlyNewUsers>(sql);
}

export interface Last30DaysUsers {
  last_30_days: string;
  previous_30_days: string;
  last_30_days_same_time_1_year_ago: string;
}

export interface TotalUsersCount {
  total_users: string;
}

export async function getTotalUsersCount(): Promise<TotalUsersCount[]> {
  const sql = loadSql('total-users-count.sql', {});
  return query<TotalUsersCount>(sql);
}

export async function getLast30DaysUsers(): Promise<Last30DaysUsers[]> {
  const sql = loadSql('last-30-days-users.sql', {});
  return query<Last30DaysUsers>(sql);
}

export async function getUsersToday(): Promise<UsersToday[]> {
  const sql = loadSql('users-today.sql', {});
  return query<UsersToday>(sql);
}
