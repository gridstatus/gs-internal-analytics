import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './db';

const sqlDir = join(process.cwd(), 'src/sql');

const FREE_EMAIL_DOMAINS = [
  'gmail.com',
  'comcast.net',
  'yahoo.com',
  'hotmail.com',
  'qq.com',
  'outlook.com',
  'icloud.com',
  'aol.com',
  'me.com',
  'protonmail.com',
  'live.com',
  'msn.com',
  'zoho.com',
  'gmx.com',
  'yandex.com',
] as const;

const FREE_EMAIL_DOMAINS_SQL = FREE_EMAIL_DOMAINS.map((domain) => `'${domain}'`).join(', ');

interface TemplateContext {
  filterGridstatus: boolean;
  usernamePrefix?: string; // 'u.' or '' - determined from SQL context
}

export function loadSql(filename: string): string {
  return readFileSync(join(sqlDir, filename), 'utf-8');
}

export function loadRenderedSql(filename: string, context: TemplateContext): string {
  return renderSqlTemplate(loadSql(filename), context);
}

function buildEduGovFilter(usernamePrefix: string): string {
  const usernameRef = `${usernamePrefix}username`;
  return `AND NOT (
    SUBSTRING(${usernameRef} FROM POSITION('@' IN ${usernameRef}) + 1) LIKE '%.edu'
    OR SUBSTRING(${usernameRef} FROM POSITION('@' IN ${usernameRef}) + 1) LIKE '%.gov'
  )`;
}

/**
 * Renders SQL template with placeholders.
 * 
 * Available placeholders:
 * - {{GRIDSTATUS_FILTER_STANDALONE}} - Replaced with "NOT IN ('gridstatus.io')" or removed
 * - {{GRIDSTATUS_FILTER_IN_LIST}} - Replaced with ", 'gridstatus.io'" or empty string
 * - {{INTERNAL_EMAIL_FILTER}} - Replaced with "AND {usernamePrefix}username != 'kmax12+dev@gmail.com'" or empty string
 * - {{FREE_EMAIL_DOMAINS}} - Replaced with the standard free-domain exclusion list
 * - {{EDU_GOV_FILTER}} - Replaced with "AND NOT (...)" for .edu/.gov exclusions
 */
export function renderSqlTemplate(sql: string, context: TemplateContext): string {
  let rendered = sql;
  
  // Determine username prefix if not provided
  if (!context.usernamePrefix) {
    context.usernamePrefix = sql.includes('FROM api_server.users u') || sql.includes('JOIN api_server.users u') 
      ? 'u.' 
      : '';
  }
  
  // Handle FREE_EMAIL_DOMAINS list (shared across multiple queries)
  rendered = rendered.replace(/\{\{FREE_EMAIL_DOMAINS\}\}/g, FREE_EMAIL_DOMAINS_SQL);

  // Handle EDU_GOV_FILTER (shared domain exclusion)
  rendered = rendered.replace(/\{\{EDU_GOV_FILTER\}\}/g, buildEduGovFilter(context.usernamePrefix));

  // Handle GRIDSTATUS_FILTER_STANDALONE (for standalone NOT IN ('gridstatus.io'))
  if (context.filterGridstatus) {
    rendered = rendered.replace(/\{\{GRIDSTATUS_FILTER_STANDALONE\}\}/g, "NOT IN ('gridstatus.io')");
  } else {
    // Remove the filter and clean up surrounding whitespace/AND
    // The placeholder is typically used like: "SUBSTRING(...) {{GRIDSTATUS_FILTER_STANDALONE}}"
    // When removing, we need to remove the entire condition including the SUBSTRING part
    // Since SUBSTRING can have nested parentheses, we'll match the common pattern more specifically
    // Pattern 1: "AND SUBSTRING(...) {{GRIDSTATUS_FILTER_STANDALONE}}" - remove entire AND clause
    // Match: AND + SUBSTRING + (username or u.username) + FROM + POSITION + ... + ) + whitespace + placeholder
    rendered = rendered.replace(/\s+AND\s+SUBSTRING\([u]?\.?username\s+FROM\s+POSITION\([^)]+\)\s*\+\s*\d+\)\s+\{\{GRIDSTATUS_FILTER_STANDALONE\}\}/gi, '');
    // Pattern 2: "WHERE SUBSTRING(...) {{GRIDSTATUS_FILTER_STANDALONE}}" - remove the SUBSTRING condition
    rendered = rendered.replace(/SUBSTRING\([u]?\.?username\s+FROM\s+POSITION\([^)]+\)\s*\+\s*\d+\)\s+\{\{GRIDSTATUS_FILTER_STANDALONE\}\}/gi, '');
    // Pattern 3: Lines that only contain the placeholder (with optional whitespace)
    rendered = rendered.replace(/^\s*\{\{GRIDSTATUS_FILTER_STANDALONE\}\}\s*$/gm, '');
    // Pattern 4: Any remaining placeholder with leading whitespace
    rendered = rendered.replace(/\s+\{\{GRIDSTATUS_FILTER_STANDALONE\}\}/g, '');
    rendered = rendered.replace(/\{\{GRIDSTATUS_FILTER_STANDALONE\}\}/g, '');
  }
  
  // Handle GRIDSTATUS_FILTER_IN_LIST (for ", 'gridstatus.io'" in exclusion lists)
  if (context.filterGridstatus) {
    rendered = rendered.replace(/\{\{GRIDSTATUS_FILTER_IN_LIST\}\}/g, ", 'gridstatus.io'");
  } else {
    rendered = rendered.replace(/\{\{GRIDSTATUS_FILTER_IN_LIST\}\}/g, '');
  }
  
  // Handle INTERNAL_EMAIL_FILTER
  if (context.filterGridstatus) {
    rendered = rendered.replace(/\{\{INTERNAL_EMAIL_FILTER\}\}/g, `AND ${context.usernamePrefix}username != 'kmax12+dev@gmail.com'`);
  } else {
    // Remove the filter, including any leading whitespace/newlines
    rendered = rendered.replace(/\s+\{\{INTERNAL_EMAIL_FILTER\}\}/g, '');
    rendered = rendered.replace(/\{\{INTERNAL_EMAIL_FILTER\}\}/g, '');
  }
  
  // Clean up empty WHERE clauses that might result from removing all filters
  // Pattern: "WHERE\n" or "WHERE " followed by only whitespace and newlines
  rendered = rendered.replace(/WHERE\s*$/gm, '');
  // Pattern: "WHERE\n  \n)" - empty WHERE before closing paren or other clause
  rendered = rendered.replace(/WHERE\s+(?=\)|GROUP BY|ORDER BY|HAVING|LIMIT)/gi, '');
  
  return rendered;
}

/**
 * @deprecated Use renderSqlTemplate instead. This function is kept for backward compatibility
 * but will be removed once all SQL files are migrated to templates.
 */
export function applyGridstatusFilter(sql: string, filterGridstatus: boolean): string {
  // Try to detect if this is a template-based SQL file
  if (
    sql.includes('{{GRIDSTATUS_FILTER') ||
    sql.includes('{{INTERNAL_EMAIL_FILTER}}') ||
    sql.includes('{{FREE_EMAIL_DOMAINS}}') ||
    sql.includes('{{EDU_GOV_FILTER}}')
  ) {
    return renderSqlTemplate(sql, { filterGridstatus });
  }
  
  // Fall back to old regex-based approach for non-template files
  if (!filterGridstatus) {
    sql = sql.replace(/, 'gridstatus\.io'/g, '');
    sql = sql.replace(/'gridstatus\.io', /g, '');
    sql = sql.replace(/\s+NOT IN \('gridstatus\.io'\)/g, ' IS NOT NULL');
    sql = sql.replace(/NOT IN \(\s*\)/g, '1=1');
    sql = sql.replace(/\s+AND username != 'kmax12\+dev@gmail\.com'/g, '');
    sql = sql.replace(/\s+AND u\.username != 'kmax12\+dev@gmail\.com'/g, '');
  } else {
    if (!sql.includes("'gridstatus.io'")) {
      sql = sql.replace(
        /NOT IN \(([^)]+)\)/g,
        (match, list) => {
          if (!list.includes("'gridstatus.io'")) {
            return `NOT IN (${list}, 'gridstatus.io')`;
          }
          return match;
        }
      );
    }
    if (!sql.includes("username != 'kmax12+dev@gmail.com'") && !sql.includes("u.username != 'kmax12+dev@gmail.com'")) {
      sql = sql.replace(
        /(WHERE[^W]+?)(\s+(?:GROUP BY|ORDER BY|HAVING|\)|LIMIT))/gi,
        (match, whereClause, nextClause) => {
          if (!whereClause.includes("username != 'kmax12+dev@gmail.com'") && 
              !whereClause.includes("u.username != 'kmax12+dev@gmail.com'") &&
              !whereClause.trim().endsWith("IS NOT NULL")) {
            const needsPrefix = whereClause.includes('u.') || whereClause.includes('FROM api_server.users u');
            const usernameRef = needsPrefix ? 'u.username' : 'username';
            return `${whereClause} AND ${usernameRef} != 'kmax12+dev@gmail.com'${nextClause}`;
          }
          return match;
        }
      );
    }
  }
  return sql;
}

export interface MonthlyUserCount {
  month: Date;
  new_users: number;
  total_users: number;
  new_corp_users: number;
  total_corp_users: number;
}

export interface MonthlyApiUsage {
  month: Date;
  total_api_requests: number;
  total_api_rows_returned: number;
  unique_api_users: number;
}

export interface MonthlyCorpMetric {
  month: Date;
  corp_domains: number;
  teams: number;
  users_on_teams: number;
}

export interface DomainDistribution {
  users_bucket: number;
  domain_count: number;
}

export interface DomainSummary {
  total_corp_domains: number;
  teams_count: number;
  users_on_teams: number;
}

export async function getMonthlyUserCounts(filterGridstatus: boolean = true): Promise<MonthlyUserCount[]> {
  let sql = loadSql('monthly-user-counts.sql');
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<MonthlyUserCount>(sql);
}

export async function getMonthlyApiUsage(filterGridstatus: boolean = true): Promise<MonthlyApiUsage[]> {
  let sql = loadSql('monthly-api-usage.sql');
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<MonthlyApiUsage>(sql);
}

export async function getMonthlyCorpMetrics(filterGridstatus: boolean = true): Promise<MonthlyCorpMetric[]> {
  let sql = loadSql('monthly-corp-metrics.sql');
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<MonthlyCorpMetric>(sql);
}

export async function getDomainDistribution(filterGridstatus: boolean = true): Promise<DomainDistribution[]> {
  let sql = loadSql('domain-distribution.sql');
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<DomainDistribution>(sql);
}

export async function getDomainSummary(filterGridstatus: boolean = true): Promise<DomainSummary[]> {
  let sql = loadSql('domain-summary.sql');
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<DomainSummary>(sql);
}

export interface ActiveUsers {
  active_24h: number;
  active_7d: number;
  active_30d: number;
  active_90d: number;
  total_users: number;
}

export async function getActiveUsers(): Promise<ActiveUsers[]> {
  const sql = loadSql('active-users.sql');
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

export async function getActiveUsersByDomain(filterGridstatus: boolean = true): Promise<ActiveUsersByDomain[]> {
  let sql = loadSql('active-users-by-domain.sql');
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<ActiveUsersByDomain>(sql);
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
  unique_viewers: number;
  unique_impression_users: number;
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

export async function getMonthlyInsightsPosts(period: 'day' | 'week' | 'month' = 'month'): Promise<MonthlyInsightsPosts[]> {
  let sql = loadSql('monthly-insights-posts.sql');
  // Replace DATE_TRUNC('month' with the appropriate period
  sql = sql.replace(/DATE_TRUNC\('month'/g, `DATE_TRUNC('${period}'`);
  return query<MonthlyInsightsPosts>(sql);
}

export async function getMonthlyInsightsViews(period: 'day' | 'week' | 'month' = 'month'): Promise<MonthlyInsightsViews[]> {
  let sql = loadSql('monthly-insights-views.sql');
  // Replace DATE_TRUNC('month' with the appropriate period
  sql = sql.replace(/DATE_TRUNC\('month'/g, `DATE_TRUNC('${period}'`);
  return query<MonthlyInsightsViews>(sql);
}

export async function getMonthlyInsightsReactions(period: 'day' | 'week' | 'month' = 'month'): Promise<MonthlyInsightsReactions[]> {
  let sql = loadSql('monthly-insights-reactions.sql');
  // Replace DATE_TRUNC('month' with the appropriate period
  sql = sql.replace(/DATE_TRUNC\('month'/g, `DATE_TRUNC('${period}'`);
  return query<MonthlyInsightsReactions>(sql);
}

export async function getTopInsightsPosts(timeFilter?: '24h' | '7d' | '1m'): Promise<TopInsightsPost[]> {
  let sql = loadSql('top-insights-posts.sql');
  
  // Apply time filter if provided
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
    
    // Format date as YYYY-MM-DD HH:MM:SS in UTC
    const year = cutoffDate.getUTCFullYear();
    const month = String(cutoffDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(cutoffDate.getUTCDate()).padStart(2, '0');
    const hours = String(cutoffDate.getUTCHours()).padStart(2, '0');
    const minutes = String(cutoffDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(cutoffDate.getUTCSeconds()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    sql = sql.replace('{{TIME_FILTER}}', `AND p.created_at >= '${dateStr}'`);
  } else {
    // Default: show all posts from Oct 2025 onwards
    sql = sql.replace('{{TIME_FILTER}}', "AND p.created_at >= '2025-10-01'");
  }
  
  return query<TopInsightsPost>(sql);
}

export interface UserActivity {
  user_id: number;
  username: string;
  activity_date: Date;
  activity_type: 'user_registered' | 'joined_org' | 'created_chart' | 'created_dashboard' | 'created_api_key' | 'created_alert';
  activity_detail: string | null;
}

export async function getUserActivities(filterGridstatus: boolean = true): Promise<UserActivity[]> {
  let sql = loadSql('user-activities.sql');
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<UserActivity>(sql);
}

export interface NewUsersLast3Months {
  month: Date;
  new_users: number;
}

export async function getNewUsersLast3Months(filterGridstatus: boolean = true): Promise<NewUsersLast3Months[]> {
  let sql = loadSql('new-users-last-3-months.sql');
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<NewUsersLast3Months>(sql);
}

export interface TopRegistration {
  period: Date;
  period_type: 'day' | 'week' | 'month';
  registration_count: number;
}

export async function getTopRegistrations(filterGridstatus: boolean = true): Promise<TopRegistration[]> {
  let sql = loadSql('top-registrations.sql');
  sql = renderSqlTemplate(sql, { filterGridstatus });
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

export async function getMonthlyNewUsersComparison(filterGridstatus: boolean = true): Promise<MonthlyNewUsers[]> {
  let sql = `
    WITH current_month_start AS (
      SELECT DATE_TRUNC('month', NOW()) AS start_time
    ),
    previous_month_start AS (
      SELECT DATE_TRUNC('month', NOW() - INTERVAL '1 month') AS start_time
    ),
    current_month_all AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM current_month_start)
        AND created_at < (SELECT start_time FROM current_month_start) + INTERVAL '1 month'
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    previous_month_all AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM previous_month_start)
        AND created_at < (SELECT start_time FROM previous_month_start) + INTERVAL '1 month'
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    previous_month_same_time AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM previous_month_start)
        AND created_at < (SELECT start_time FROM previous_month_start) + (NOW() - (SELECT start_time FROM current_month_start))
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    last_year_month_start AS (
      SELECT DATE_TRUNC('month', NOW() - INTERVAL '1 year') AS start_time
    ),
    last_year_month_all AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM last_year_month_start)
        AND created_at < (SELECT start_time FROM last_year_month_start) + INTERVAL '1 month'
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    last_year_month_same_time AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM last_year_month_start)
        AND created_at < (SELECT start_time FROM last_year_month_start) + (NOW() - (SELECT start_time FROM current_month_start))
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    )
    SELECT 
      (SELECT count FROM current_month_all) as current_month_all,
      (SELECT count FROM previous_month_all) as previous_month_all,
      (SELECT count FROM previous_month_same_time) as previous_month_same_time,
      (SELECT count FROM last_year_month_all) as last_year_month_all,
      (SELECT count FROM last_year_month_same_time) as last_year_month_same_time
  `;
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<MonthlyNewUsers>(sql);
}

export async function getUsersToday(filterGridstatus: boolean = true): Promise<UsersToday[]> {
  let sql = `
    WITH today_start AS (
      SELECT DATE_TRUNC('day', NOW()) AS start_time
    ),
    yesterday_start AS (
      SELECT DATE_TRUNC('day', NOW() - INTERVAL '1 day') AS start_time
    ),
    last_week_start AS (
      SELECT DATE_TRUNC('day', NOW() - INTERVAL '7 days') AS start_time
    ),
    users_today AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM today_start)
        AND created_at < (SELECT start_time FROM today_start) + INTERVAL '1 day'
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT IN (
          {{FREE_EMAIL_DOMAINS}}
        )
        {{EDU_GOV_FILTER}}
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    users_yesterday_all AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM yesterday_start)
        AND created_at < (SELECT start_time FROM yesterday_start) + INTERVAL '1 day'
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT IN (
          {{FREE_EMAIL_DOMAINS}}
        )
        {{EDU_GOV_FILTER}}
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    users_yesterday_same_time AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM yesterday_start)
        AND created_at < (SELECT start_time FROM yesterday_start) + (NOW() - (SELECT start_time FROM today_start))
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT IN (
          {{FREE_EMAIL_DOMAINS}}
        )
        {{EDU_GOV_FILTER}}
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    users_last_week_all AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM last_week_start)
        AND created_at < (SELECT start_time FROM last_week_start) + INTERVAL '1 day'
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT IN (
          {{FREE_EMAIL_DOMAINS}}
        )
        {{EDU_GOV_FILTER}}
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    users_last_week_same_time AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM last_week_start)
        AND created_at < (SELECT start_time FROM last_week_start) + (NOW() - (SELECT start_time FROM today_start))
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) NOT IN (
          {{FREE_EMAIL_DOMAINS}}
        )
        {{EDU_GOV_FILTER}}
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    )
    SELECT 
      (SELECT count FROM users_today) as users_today,
      (SELECT count FROM users_yesterday_all) as users_yesterday_all,
      (SELECT count FROM users_yesterday_same_time) as users_yesterday_same_time,
      (SELECT count FROM users_last_week_all) as users_last_week_all,
      (SELECT count FROM users_last_week_same_time) as users_last_week_same_time
  `;
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<UsersToday>(sql);
}
