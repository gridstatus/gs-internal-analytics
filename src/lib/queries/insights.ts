import { query } from '../db';
import { loadSql } from './core';

type SummaryPeriod = '1d' | '7d' | '30d' | 'all';

/** Build date filter clause for insights summary KPIs. prefix is the column (e.g. pv.viewed_at, r.created_at, p.created_at). */
function buildInsightsDateFilter(period: SummaryPeriod, prefix: string): string {
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    return `${prefix} >= NOW() - INTERVAL '${days} days'`;
  }
  return `${prefix} >= '2025-10-01'`;
}

export interface MonthlyInsightsPosts {
  month: Date;
  total_posts: number;
  unique_authors: number;
}

export interface MonthlyInsightsViews {
  month: Date;
  impressions: number;
  views: number;
  total_views: number;
  posts_viewed: number;
  unique_viewers_logged_in: number;
  unique_homefeed_visitors_logged_in: number;
  unique_visitors_logged_in: number;
}

export interface MonthlyInsightsReactions {
  month: Date;
  total_reactions: number;
  posts_with_reactions: number;
  unique_reactors: number;
  likes: number;
  dislikes: number;
}

export interface TopInsightsPost {
  id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  author_id: number;
  username: string | null;
  impressions: number;
  view_count: number;
  reaction_count: number;
  save_count: number;
  like_count: number;
  dislike_count: number;
  engagement_rate: number;
}

// NOTE: Posts are not filtered by author domain because all posts are authored by GS employees.
export async function getMonthlyInsightsPosts(period: 'day' | 'week' | 'month' = 'month'): Promise<MonthlyInsightsPosts[]> {
  let sql = loadSql('monthly-insights-posts.sql', {});
  sql = sql.replace(/DATE_TRUNC\('month'/g, `DATE_TRUNC('${period}'`);
  return query<MonthlyInsightsPosts>(sql);
}

export async function getMonthlyInsightsViews(period: 'day' | 'week' | 'month' = 'month'): Promise<MonthlyInsightsViews[]> {
  let sql = loadSql('monthly-insights-views.sql', {});
  sql = sql.replace(/DATE_TRUNC\('month'/g, `DATE_TRUNC('${period}'`);
  return query<MonthlyInsightsViews>(sql);
}

export async function getMonthlyInsightsReactions(period: 'day' | 'week' | 'month' = 'month'): Promise<MonthlyInsightsReactions[]> {
  let sql = loadSql('monthly-insights-reactions.sql', {});
  sql = sql.replace(/DATE_TRUNC\('month'/g, `DATE_TRUNC('${period}'`);
  return query<MonthlyInsightsReactions>(sql);
}


export interface PostViewsSummary {
  uniqueVisitors: number;
  homefeedVisitors: number;
  engagements: number;
  impressions: number;
}

export async function getSummaryPostViews(period: SummaryPeriod): Promise<PostViewsSummary> {
  const dateFilter = buildInsightsDateFilter(period, 'pv.viewed_at');
  const sql = loadSql('summary-post-views.sql', { usernamePrefix: 'u.', date_filter: dateFilter });
  const result = await query<{ unique_visitors: string; homefeed_visitors: string; engagements: string; impressions: string }>(sql);
  const row = result[0];
  return {
    uniqueVisitors: Number(row?.unique_visitors || 0),
    homefeedVisitors: Number(row?.homefeed_visitors || 0),
    engagements: Number(row?.engagements || 0),
    impressions: Number(row?.impressions || 0),
  };
}

export async function getSummaryReactions(period: SummaryPeriod): Promise<number> {
  const dateFilter = buildInsightsDateFilter(period, 'r.created_at');
  const sql = loadSql('summary-reactions.sql', { usernamePrefix: 'u.', date_filter: dateFilter });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

export async function getSummaryPosts(period: SummaryPeriod): Promise<number> {
  const dateFilter = buildInsightsDateFilter(period, 'p.created_at');
  const sql = loadSql('summary-posts.sql', { date_filter: dateFilter });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

// NOTE: Posts are not filtered by author domain because all posts are authored by GS employees.
export async function getTopInsightsPosts(timeFilter?: '24h' | '7d' | '1m'): Promise<TopInsightsPost[]> {
  let timeFilterClause: string;
  if (timeFilter) {
    const now = new Date();
    let cutoffDate: Date;
    switch (timeFilter) {
      case '24h':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }
    const year = cutoffDate.getUTCFullYear();
    const month = String(cutoffDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(cutoffDate.getUTCDate()).padStart(2, '0');
    const hours = String(cutoffDate.getUTCHours()).padStart(2, '0');
    const minutes = String(cutoffDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(cutoffDate.getUTCSeconds()).padStart(2, '0');
    timeFilterClause = `p.created_at >= '${year}-${month}-${day} ${hours}:${minutes}:${seconds}'`;
  } else {
    timeFilterClause = "p.created_at >= '2025-10-01'";
  }

  const sql = loadSql('top-insights-posts.sql', { timeFilter: timeFilterClause });
  return query<TopInsightsPost>(sql);
}
