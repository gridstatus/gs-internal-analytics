import { readFileSync } from 'fs';
import { join } from 'path';
import { query } from './db';

const sqlDir = join(process.cwd(), 'src/sql');
const hogqlDir = join(process.cwd(), 'src/hogql');

interface TemplateContext {
  filterGridstatus: boolean;
  usernamePrefix?: string; // 'u.' or '' - determined from SQL context
}

interface HogqlTemplateContext {
  filterGridstatus?: boolean;
  limit?: number;
  days?: number;
  dateFunction?: string;
  dateFilter?: string;
  orderDirection?: string;
  email?: string;
}

export function loadSql(filename: string): string {
  return readFileSync(join(sqlDir, filename), 'utf-8');
}

export function loadRenderedSql(filename: string, context: TemplateContext): string {
  return renderSqlTemplate(loadSql(filename), context);
}

export function loadHogql(filename: string): string {
  return readFileSync(join(hogqlDir, filename), 'utf-8');
}

export function renderHogqlTemplate(hogql: string, context: HogqlTemplateContext): string {
  let rendered = hogql;
  
  // Handle GRIDSTATUS_FILTER
  if (context.filterGridstatus) {
    rendered = rendered.replace(/\{\{GRIDSTATUS_FILTER\}\}/g, "AND NOT person.properties.email LIKE '%@gridstatus.io'");
  } else {
    rendered = rendered.replace(/\s+\{\{GRIDSTATUS_FILTER\}\}/g, '');
    rendered = rendered.replace(/\{\{GRIDSTATUS_FILTER\}\}/g, '');
  }
  
  // Handle LIMIT placeholder
  if (context.limit !== undefined) {
    rendered = rendered.replace(/\{\{LIMIT\}\}/g, context.limit.toString());
  }
  
  // Handle DAYS placeholder
  if (context.days !== undefined) {
    rendered = rendered.replace(/\{\{DAYS\}\}/g, context.days.toString());
  }
  
  // Handle DATE_FUNCTION placeholder
  if (context.dateFunction !== undefined) {
    rendered = rendered.replace(/\{\{DATE_FUNCTION\}\}/g, context.dateFunction);
  }
  
  // Handle DATE_FILTER placeholder
  if (context.dateFilter !== undefined) {
    rendered = rendered.replace(/\{\{DATE_FILTER\}\}/g, context.dateFilter);
  } else {
    rendered = rendered.replace(/\s+\{\{DATE_FILTER\}\}/g, '');
    rendered = rendered.replace(/\{\{DATE_FILTER\}\}/g, '');
  }
  
  // Handle ORDER_DIRECTION placeholder
  if (context.orderDirection !== undefined) {
    rendered = rendered.replace(/\{\{ORDER_DIRECTION\}\}/g, context.orderDirection);
  }
  
  // Handle EMAIL placeholder (escape single quotes for SQL safety)
  if (context.email !== undefined) {
    const escapedEmail = context.email.replace(/'/g, "''");
    rendered = rendered.replace(/\{\{EMAIL\}\}/g, escapedEmail);
  }
  
  return rendered;
}

export function loadRenderedHogql(filename: string, context: HogqlTemplateContext): string {
  return renderHogqlTemplate(loadHogql(filename), context);
}

/**
 * Renders SQL template with placeholders.
 * 
 * Available placeholders:
 * - {{GRIDSTATUS_FILTER_STANDALONE}} - Replaced with "NOT IN ('gridstatus.io')" or removed
 * - {{GRIDSTATUS_FILTER_IN_LIST}} - Replaced with ", 'gridstatus.io'" or empty string
 * - {{INTERNAL_EMAIL_FILTER}} - Replaced with "AND {usernamePrefix}username != 'kmax12+dev@gmail.com'" or empty string
 * 
 * BEST PRACTICES to prevent SQL syntax errors:
 * - Always use "WHERE 1=1" or another base condition before using {{GRIDSTATUS_FILTER_STANDALONE}} with AND
 * - Example: "WHERE 1=1 AND SUBSTRING(...) {{GRIDSTATUS_FILTER_STANDALONE}}"
 * - Avoid: "WHERE SUBSTRING(...) {{GRIDSTATUS_FILTER_STANDALONE}}" (can leave invalid SQL when filter is removed)
 * - The template renderer will attempt to fix this, but it's safer to structure SQL correctly from the start
 */
export function renderSqlTemplate(sql: string, context: TemplateContext): string {
  let rendered = sql;
  
  // Determine username prefix if not provided
  if (!context.usernamePrefix) {
    context.usernamePrefix = sql.includes('FROM api_server.users u') || sql.includes('JOIN api_server.users u') 
      ? 'u.' 
      : '';
  }

  // Handle GRIDSTATUS_FILTER_STANDALONE (for standalone NOT IN ('gridstatus.io'))
  if (context.filterGridstatus) {
    rendered = rendered.replace(/\{\{GRIDSTATUS_FILTER_STANDALONE\}\}/g, "NOT IN ('gridstatus.io')");
  } else {
    // Remove the filter and clean up surrounding whitespace/AND
    // The placeholder is typically used like: "SUBSTRING(...) {{GRIDSTATUS_FILTER_STANDALONE}}"
    // When removing, we need to remove the entire condition including the SUBSTRING part
    // Since SUBSTRING can have nested parentheses, we'll match the common pattern more specifically
    // Pattern 1: "AND SUBSTRING(...) {{GRIDSTATUS_FILTER_STANDALONE}}" - remove entire AND clause (multiline)
    // Match: AND + SUBSTRING + (username or u.username) + FROM + POSITION + ... + ) + whitespace/newlines + placeholder
    rendered = rendered.replace(/\s+AND\s+SUBSTRING\([u]?\.?username\s+FROM\s+POSITION\([^)]+\)\s*\+\s*\d+\)\s*[\r\n\s]*\{\{GRIDSTATUS_FILTER_STANDALONE\}\}/gi, '');
    // Pattern 2: "WHERE SUBSTRING(...) {{GRIDSTATUS_FILTER_STANDALONE}}" - remove entire WHERE clause condition
    // This handles cases where WHERE starts with the filter (which would leave invalid SQL)
    rendered = rendered.replace(/WHERE\s+SUBSTRING\([u]?\.?username\s+FROM\s+POSITION\([^)]+\)\s*\+\s*\d+\)\s*[\r\n\s]*\{\{GRIDSTATUS_FILTER_STANDALONE\}\}/gi, 'WHERE 1=1');
    // Pattern 3: "SUBSTRING(...) {{GRIDSTATUS_FILTER_STANDALONE}}" - remove the SUBSTRING condition (fallback, multiline)
    rendered = rendered.replace(/SUBSTRING\([u]?\.?username\s+FROM\s+POSITION\([^)]+\)\s*\+\s*\d+\)\s*[\r\n\s]*\{\{GRIDSTATUS_FILTER_STANDALONE\}\}/gi, '');
    // Pattern 4: Lines that only contain the placeholder (with optional whitespace)
    rendered = rendered.replace(/^\s*\{\{GRIDSTATUS_FILTER_STANDALONE\}\}\s*$/gm, '');
    // Pattern 5: Any remaining placeholder with leading whitespace
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
  // Pattern: "WHERE " followed by only whitespace and then another keyword - replace with nothing
  rendered = rendered.replace(/WHERE\s+(?=\s*(?:GROUP BY|ORDER BY|HAVING|LIMIT|\)|,))/gi, '');
  // Pattern: "WHERE " with only whitespace/newlines before next clause - ensure we have 1=1 as fallback
  rendered = rendered.replace(/WHERE\s*$/gm, '');
  
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
    sql.includes('{{INTERNAL_EMAIL_FILTER}}')
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

export async function getActiveUsers(filterGridstatus: boolean = true): Promise<ActiveUsers[]> {
  let sql = loadSql('active-users.sql');
  sql = renderSqlTemplate(sql, { filterGridstatus });
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
// The filterGridstatus param is kept for API consistency but not used for posts.
export async function getMonthlyInsightsPosts(period: 'day' | 'week' | 'month' = 'month', filterGridstatus: boolean = true): Promise<MonthlyInsightsPosts[]> {
  let sql = loadSql('monthly-insights-posts.sql');
  // Replace DATE_TRUNC('month' with the appropriate period
  sql = sql.replace(/DATE_TRUNC\('month'/g, `DATE_TRUNC('${period}'`);
  return query<MonthlyInsightsPosts>(sql);
}

export async function getMonthlyInsightsViews(period: 'day' | 'week' | 'month' = 'month', filterGridstatus: boolean = true): Promise<MonthlyInsightsViews[]> {
  let sql = loadSql('monthly-insights-views.sql');
  // Replace DATE_TRUNC('month' with the appropriate period
  sql = sql.replace(/DATE_TRUNC\('month'/g, `DATE_TRUNC('${period}'`);
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<MonthlyInsightsViews>(sql);
}

export async function getMonthlyInsightsReactions(period: 'day' | 'week' | 'month' = 'month', filterGridstatus: boolean = true): Promise<MonthlyInsightsReactions[]> {
  let sql = loadSql('monthly-insights-reactions.sql');
  // Replace DATE_TRUNC('month' with the appropriate period
  sql = sql.replace(/DATE_TRUNC\('month'/g, `DATE_TRUNC('${period}'`);
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<MonthlyInsightsReactions>(sql);
}

// Get total unique logged-in users who have visited insights (any view source)
// Note: Anonymous users are tracked in PostHog, not PostgreSQL
export async function getTotalUniqueVisitors(filterGridstatus: boolean = true): Promise<number> {
  let sql = `
    SELECT COUNT(DISTINCT pv.user_id) AS total
    FROM insights.post_views pv
    JOIN api_server.users u ON pv.user_id = u.id
    WHERE pv.viewed_at >= '2025-10-01'
      AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
      {{INTERNAL_EMAIL_FILTER}}
  `;
  sql = renderSqlTemplate(sql, { filterGridstatus, usernamePrefix: 'u.' });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

// Get total unique logged-in users who have visited the homefeed (/insights)
// Note: Anonymous users are tracked in PostHog, not PostgreSQL
export async function getTotalUniqueHomefeedVisitors(filterGridstatus: boolean = true): Promise<number> {
  let sql = `
    SELECT COUNT(DISTINCT pv.user_id) AS total
    FROM insights.post_views pv
    JOIN api_server.users u ON pv.user_id = u.id
    WHERE pv.view_source = 'feed'
      AND pv.viewed_at >= '2025-10-01'
      AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
      {{INTERNAL_EMAIL_FILTER}}
  `;
  sql = renderSqlTemplate(sql, { filterGridstatus, usernamePrefix: 'u.' });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

// Summary KPI queries with period support (1d, 7d, 30d, all)
// These are independent queries for summary metrics, not derived from chart data

export async function getSummaryUniqueVisitors(period: '1d' | '7d' | '30d' | 'all', filterGridstatus: boolean = true): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `AND pv.viewed_at >= NOW() - INTERVAL '${days} days'`;
  } else {
    dateFilter = `AND pv.viewed_at >= '2025-10-01'`;
  }
  
  let sql = `
    SELECT COUNT(DISTINCT pv.user_id) AS total
    FROM insights.post_views pv
    JOIN api_server.users u ON pv.user_id = u.id
    WHERE 1=1
      ${dateFilter}
      AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
      {{INTERNAL_EMAIL_FILTER}}
  `;
  sql = renderSqlTemplate(sql, { filterGridstatus, usernamePrefix: 'u.' });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

export async function getSummaryHomefeedVisitors(period: '1d' | '7d' | '30d' | 'all', filterGridstatus: boolean = true): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `AND pv.viewed_at >= NOW() - INTERVAL '${days} days'`;
  } else {
    dateFilter = `AND pv.viewed_at >= '2025-10-01'`;
  }
  
  let sql = `
    SELECT COUNT(DISTINCT pv.user_id) AS total
    FROM insights.post_views pv
    JOIN api_server.users u ON pv.user_id = u.id
    WHERE 1=1
      AND pv.view_source = 'feed'
      ${dateFilter}
      AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
      {{INTERNAL_EMAIL_FILTER}}
  `;
  sql = renderSqlTemplate(sql, { filterGridstatus, usernamePrefix: 'u.' });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

export async function getSummaryEngagements(period: '1d' | '7d' | '30d' | 'all', filterGridstatus: boolean = true): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `AND pv.viewed_at >= NOW() - INTERVAL '${days} days'`;
  } else {
    dateFilter = `AND pv.viewed_at >= '2025-10-01'`;
  }
  
  let sql = `
    SELECT COUNT(*) AS total
    FROM insights.post_views pv
    JOIN api_server.users u ON pv.user_id = u.id
    WHERE 1=1
      AND pv.view_source IN ('feed_expanded', 'detail')
      ${dateFilter}
      AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
      {{INTERNAL_EMAIL_FILTER}}
  `;
  sql = renderSqlTemplate(sql, { filterGridstatus, usernamePrefix: 'u.' });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

export async function getSummaryImpressions(period: '1d' | '7d' | '30d' | 'all', filterGridstatus: boolean = true): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `AND pv.viewed_at >= NOW() - INTERVAL '${days} days'`;
  } else {
    dateFilter = `AND pv.viewed_at >= '2025-10-01'`;
  }
  
  let sql = `
    SELECT COUNT(*) AS total
    FROM insights.post_views pv
    JOIN api_server.users u ON pv.user_id = u.id
    WHERE 1=1
      AND pv.view_source = 'feed'
      ${dateFilter}
      AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
      {{INTERNAL_EMAIL_FILTER}}
  `;
  sql = renderSqlTemplate(sql, { filterGridstatus, usernamePrefix: 'u.' });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

export async function getSummaryReactions(period: '1d' | '7d' | '30d' | 'all', filterGridstatus: boolean = true): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `AND r.created_at >= NOW() - INTERVAL '${days} days'`;
  } else {
    dateFilter = `AND r.created_at >= '2025-10-01'`;
  }
  
  let sql = `
    SELECT COUNT(*) AS total
    FROM insights.reactions r
    JOIN api_server.users u ON r.user_id = u.id
    WHERE 1=1
      ${dateFilter}
      AND SUBSTRING(u.username FROM POSITION('@' IN u.username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
      {{INTERNAL_EMAIL_FILTER}}
  `;
  sql = renderSqlTemplate(sql, { filterGridstatus, usernamePrefix: 'u.' });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

export async function getSummaryPosts(period: '1d' | '7d' | '30d' | 'all'): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `AND p.created_at >= NOW() - INTERVAL '${days} days'`;
  } else {
    dateFilter = `AND p.created_at >= '2025-10-01'`;
  }
  
  let sql = `
    SELECT COUNT(*) AS total
    FROM insights.posts p
    WHERE 1=1
      AND p.status = 'PUBLISHED'
      ${dateFilter}
  `;
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

// Fetch anonymous users from PostHog (users without email addresses)
// These are users who visited /insights pages but are not logged in
export async function fetchPosthogAnonymousUsers(period: 'day' | 'week' | 'month'): Promise<{ period: string; anonymousUsers: number }[]> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return [];
  }

  // Determine the date function and format based on period
  let dateFunction: string;
  let dateFilter: string;
  const orderDirection = 'DESC';
  
  if (period === 'day') {
    dateFunction = 'toStartOfDay(timestamp)';
    dateFilter = "AND timestamp >= now() - INTERVAL 2 YEAR";
  } else if (period === 'week') {
    dateFunction = 'toStartOfWeek(timestamp)';
    dateFilter = "AND timestamp >= now() - INTERVAL 3 YEAR";
  } else {
    dateFunction = 'toStartOfMonth(timestamp)';
    dateFilter = '';
  }

  const hogql = loadRenderedHogql('anonymous-users.hogql', {
    dateFunction,
    dateFilter,
    orderDirection,
  });

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
  const payload = {
    query: {
      kind: 'HogQLQuery',
      query: hogql,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('PostHog anonymous users API error:', response.status, errorText);
    return [];
  }

  const data = await response.json();
  
  if (data.warnings) {
    console.warn('PostHog anonymous users query warnings:', data.warnings);
  }
  if (data.limit_reached) {
    console.warn('PostHog anonymous users query limit reached - results may be truncated');
  }
  
  const results: [string, number][] = data.results || [];
  const sortedResults = results.reverse();

  return sortedResults.map(([periodDate, anonymousUsers]) => {
    const date = new Date(periodDate);
    let formattedPeriod: string;
    
    if (period === 'day') {
      formattedPeriod = date.toISOString().slice(0, 10);
    } else if (period === 'week') {
      formattedPeriod = date.toISOString().slice(0, 10);
    } else {
      formattedPeriod = date.toISOString().slice(0, 7);
    }
    
    return {
      period: formattedPeriod,
      anonymousUsers,
    };
  });
}

// Get summary anonymous user counts for a specific period (1d, 7d, 30d, all)
export async function getSummaryAnonymousVisitors(period: '1d' | '7d' | '30d' | 'all'): Promise<number> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return 0;
  }

  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `AND timestamp >= now() - INTERVAL ${days} DAY`;
  } else {
    dateFilter = "AND timestamp >= '2025-10-01'";
  }

  const hogql = loadRenderedHogql('anonymous-visitors-summary.hogql', {
    dateFilter,
  });

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
  const payload = {
    query: {
      kind: 'HogQLQuery',
      query: hogql,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('PostHog anonymous visitors summary API error:', response.status, errorText);
    return 0;
  }

  const data = await response.json();
  
  if (data.warnings) {
    console.warn('PostHog anonymous visitors summary query warnings:', data.warnings);
  }
  
  const results: [number][] = data.results || [];
  return results[0]?.[0] || 0;
}

// Get summary anonymous homefeed visitor counts for a specific period (1d, 7d, 30d, all)
export async function getSummaryAnonymousHomefeedVisitors(period: '1d' | '7d' | '30d' | 'all'): Promise<number> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return 0;
  }

  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `AND timestamp >= now() - INTERVAL ${days} DAY`;
  } else {
    dateFilter = "AND timestamp >= '2025-10-01'";
  }

  const hogql = loadRenderedHogql('anonymous-homefeed-visitors-summary.hogql', {
    dateFilter,
  });

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
  const payload = {
    query: {
      kind: 'HogQLQuery',
      query: hogql,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('PostHog anonymous homefeed visitors summary API error:', response.status, errorText);
    return 0;
  }

  const data = await response.json();
  
  if (data.warnings) {
    console.warn('PostHog anonymous homefeed visitors summary query warnings:', data.warnings);
  }
  
  const results: [number][] = data.results || [];
  return results[0]?.[0] || 0;
}

// Fetch anonymous homefeed visitors from PostHog (users without email who visited /insights)
export async function fetchPosthogAnonymousHomefeedVisitors(period: 'day' | 'week' | 'month'): Promise<{ period: string; anonymousUsers: number }[]> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return [];
  }

  let dateFunction: string;
  let dateFilter: string;
  const orderDirection = 'DESC';
  
  if (period === 'day') {
    dateFunction = 'toStartOfDay(timestamp)';
    dateFilter = "AND timestamp >= now() - INTERVAL 2 YEAR";
  } else if (period === 'week') {
    dateFunction = 'toStartOfWeek(timestamp)';
    dateFilter = "AND timestamp >= now() - INTERVAL 3 YEAR";
  } else {
    dateFunction = 'toStartOfMonth(timestamp)';
    dateFilter = '';
  }

  const hogql = loadRenderedHogql('anonymous-homefeed-visitors.hogql', {
    dateFunction,
    dateFilter,
    orderDirection,
  });

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
  const payload = {
    query: {
      kind: 'HogQLQuery',
      query: hogql,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('PostHog anonymous homefeed visitors API error:', response.status, errorText);
    return [];
  }

  const data = await response.json();
  
  if (data.warnings) {
    console.warn('PostHog anonymous homefeed visitors query warnings:', data.warnings);
  }
  if (data.limit_reached) {
    console.warn('PostHog anonymous homefeed visitors query limit reached - results may be truncated');
  }
  
  const results: [string, number][] = data.results || [];
  const sortedResults = results.reverse();

  return sortedResults.map(([periodDate, anonymousUsers]) => {
    const date = new Date(periodDate);
    let formattedPeriod: string;
    
    if (period === 'day') {
      formattedPeriod = date.toISOString().slice(0, 10);
    } else if (period === 'week') {
      formattedPeriod = date.toISOString().slice(0, 10);
    } else {
      formattedPeriod = date.toISOString().slice(0, 7);
    }
    
    return {
      period: formattedPeriod,
      anonymousUsers,
    };
  });
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

export async function getMostEngagedUsers(filterGridstatus: boolean = true, days: number | null = null): Promise<MostEngagedUser[]> {
  let sql = loadSql('most-engaged-users.sql');
  
  // Build time filter conditions
  let timeFilterReactions = '';
  let timeFilterViews = '';
  let timeFilterSaves = '';
  
  if (days !== null) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    cutoffDate.setHours(0, 0, 0, 0);
    const cutoffDateStr = cutoffDate.toISOString();
    
    // reactions table uses created_at
    timeFilterReactions = `AND r.created_at >= '${cutoffDateStr}'`;
    // post_views table uses viewed_at
    timeFilterViews = `AND pv.viewed_at >= '${cutoffDateStr}'`;
    // saved_posts table uses created_at
    timeFilterSaves = `AND sp.created_at >= '${cutoffDateStr}'`;
  }
  
  sql = sql.replace(/\{\{TIME_FILTER_REACTIONS\}\}/g, timeFilterReactions);
  sql = sql.replace(/\{\{TIME_FILTER_VIEWS\}\}/g, timeFilterViews);
  sql = sql.replace(/\{\{TIME_FILTER_SAVES\}\}/g, timeFilterSaves);
  
  sql = renderSqlTemplate(sql, { filterGridstatus, usernamePrefix: 'u.' });
  return query<MostEngagedUser>(sql);
}

// NOTE: Posts are not filtered by author domain because all posts are authored by GS employees.
// The filterGridstatus param is kept for API consistency but not used for posts.
export async function getTopInsightsPosts(timeFilter?: '24h' | '7d' | '1m', filterGridstatus: boolean = true): Promise<TopInsightsPost[]> {
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

export interface Last30DaysUsers {
  last_30_days: string;
  previous_30_days: string;
}

export interface TotalUsersCount {
  total_users: string;
}

export async function getTotalUsersCount(filterGridstatus: boolean = true): Promise<TotalUsersCount[]> {
  let sql = `
    SELECT COUNT(*)::text AS total_users
    FROM api_server.users
    WHERE created_at IS NOT NULL
      AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
      {{INTERNAL_EMAIL_FILTER}}
  `;
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<TotalUsersCount>(sql);
}

export async function getLast30DaysUsers(filterGridstatus: boolean = true): Promise<Last30DaysUsers[]> {
  let sql = `
    WITH last_30_days_start AS (
      SELECT NOW() - INTERVAL '30 days' AS start_time
    ),
    previous_30_days_start AS (
      SELECT NOW() - INTERVAL '60 days' AS start_time
    ),
    previous_30_days_end AS (
      SELECT NOW() - INTERVAL '30 days' AS end_time
    ),
    last_30_days_count AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM last_30_days_start)
        AND created_at < NOW()
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    previous_30_days_count AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM previous_30_days_start)
        AND created_at < (SELECT end_time FROM previous_30_days_end)
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    )
    SELECT 
      (SELECT count FROM last_30_days_count)::text AS last_30_days,
      (SELECT count FROM previous_30_days_count)::text AS previous_30_days
  `;
  sql = renderSqlTemplate(sql, { filterGridstatus });
  return query<Last30DaysUsers>(sql);
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
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    users_yesterday_all AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM yesterday_start)
        AND created_at < (SELECT start_time FROM yesterday_start) + INTERVAL '1 day'
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    users_yesterday_same_time AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM yesterday_start)
        AND created_at < (SELECT start_time FROM yesterday_start) + (NOW() - (SELECT start_time FROM today_start))
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    users_last_week_all AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM last_week_start)
        AND created_at < (SELECT start_time FROM last_week_start) + INTERVAL '1 day'
        AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
        {{INTERNAL_EMAIL_FILTER}}
    ),
    users_last_week_same_time AS (
      SELECT COUNT(*) as count
      FROM api_server.users
      WHERE created_at >= (SELECT start_time FROM last_week_start)
        AND created_at < (SELECT start_time FROM last_week_start) + (NOW() - (SELECT start_time FROM today_start))
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

// Pricing Page Visitors from PostHog
export interface PricingPageVisitCount {
  email: string;
  visitCount: number;
}

// Get visit counts for pricing page by period (1d, 7d, 30d)
export async function getPricingPageVisitCounts(period: '1d' | '7d' | '30d', filterGridstatus: boolean = true): Promise<number> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return 0;
  }

  const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;

  const hogql = loadRenderedHogql('pricing-page-visit-counts.hogql', {
    filterGridstatus,
    days,
  });

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
  const payload = {
    query: {
      kind: 'HogQLQuery',
      query: hogql,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('PostHog pricing page visit counts API error:', response.status, errorText);
    return 0;
  }

  const data = await response.json();
  
  if (data.warnings) {
    console.warn('PostHog pricing page visit counts query warnings:', data.warnings);
  }
  
  const results: [number][] = data.results || [];
  return results[0]?.[0] || 0;
}

// Get users with most visits to pricing page for a period
export async function getPricingPageMostVisits(period: '1d' | '7d' | '30d', limit: number = 50, filterGridstatus: boolean = true): Promise<PricingPageVisitCount[]> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return [];
  }

  const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;

  const hogql = loadRenderedHogql('pricing-page-most-visits.hogql', {
    filterGridstatus,
    days,
    limit,
  });

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
  const payload = {
    query: {
      kind: 'HogQLQuery',
      query: hogql,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('PostHog pricing page most visits API error:', response.status, errorText);
    return [];
  }

  const data = await response.json();
  
  if (data.warnings) {
    console.warn('PostHog pricing page most visits query warnings:', data.warnings);
  }
  
  const results: [string, number][] = data.results || [];
  
  return results.map(([email, visitCount]) => ({
    email,
    visitCount,
  }));
}
