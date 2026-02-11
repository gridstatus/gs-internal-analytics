import { readFileSync } from 'fs';
import { join } from 'path';
import { query, requestContext } from './db';
import { posthogFetchWithRetry } from './posthog';

const sqlDir = join(process.cwd(), 'src/sql');
const hogqlDir = join(process.cwd(), 'src/hogql');

/** Free email domains excluded when filterFree is true. */
export const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'outlook.com',
  'hotmail.com', 'hotmail.co.uk', 'live.com', 'icloud.com', 'mac.com', 'me.com', 'aol.com',
  'mail.com', 'protonmail.com', 'proton.me', 'zoho.com', 'yandex.com',
  'gmx.com', 'gmx.net', 'mail.ru', 'qq.com', '163.com', 'comcast.net', 'att.net', 'verizon.net',
];

interface TemplateContext {
  filterInternal?: boolean;
  filterFree?: boolean;
  usernamePrefix?: string; // 'u.' or '' - determined from SQL context
  // Custom template variables - any key-value pairs for {{KEY}} placeholders
  [key: string]: string | number | boolean | undefined;
}

interface HogqlTemplateContext {
  filterInternal?: boolean;
  filterFree?: boolean;
  limit?: number;
  days?: number;
  dateFunction?: string;
  dateFilter?: string;
  orderDirection?: string;
  email?: string;
  eventName?: string;
  /** Domain for email filter (e.g. "acme.com"); used to replace {{DOMAIN_LIKE}} with %@domain */
  domain?: string;
  /** Clause for user type: logged-in (email set), anon (email null/empty), or empty for all users */
  userTypeFilter?: string;
  /** Period expression for grouping (e.g. toDate(timestamp), toStartOfWeek(timestamp), toStartOfMonth(timestamp)) */
  periodSelect?: string;
  /** When set, restricts each day to "midnight to current time" for fair same-time-of-day comparison */
  sameTimeOfDayFilter?: string;
  /** Pathname for path-scoped HogQL (e.g. debug-daily-views-by-path) */
  pathname?: string;
}

/**
 * Load SQL from file. With no context, returns raw file content.
 * With context, loads the file and replaces {{PLACEHOLDER}}s (including {{USER_FILTER}} from request context).
 */
export function loadSql(filename: string, context?: TemplateContext): string {
  const raw = readFileSync(join(sqlDir, filename), 'utf-8');
  if (context === undefined) return raw;
  return renderSqlFromRaw(raw, context, filename);
}

function renderSqlFromRaw(raw: string, context: TemplateContext, filename: string): string {
  const lines = raw.split('\n');
  let rendered = lines.filter(line => !line.trim().startsWith('--')).join('\n');

  if (!context.usernamePrefix) {
    context.usernamePrefix = rendered.includes('FROM api_server.users u') || rendered.includes('JOIN api_server.users u')
      ? 'u.'
      : '';
  }

  const store = requestContext.getStore();
  const filterInternal = context.filterInternal ?? store?.filterInternal ?? true;
  const filterFree = context.filterFree ?? store?.filterFree ?? true;

  const usernameRef = context.usernamePrefix ? `${context.usernamePrefix}username` : 'username';
  const domainExpr = `SUBSTRING(${usernameRef} FROM POSITION('@' IN ${usernameRef}) + 1)`;
  const internalClause = filterInternal
    ? `${domainExpr} NOT IN ('gridstatus.io') AND ${usernameRef} != 'kmax12+dev@gmail.com'`
    : '';
  const freeClause = filterFree
    ? `${domainExpr} NOT IN (${FREE_EMAIL_DOMAINS.map(d => `'${d.replace(/'/g, "''")}'`).join(', ')})`
    : '';
  const userFilter = [internalClause, freeClause].filter(Boolean).join(' AND ');
  if (userFilter) {
    rendered = rendered.replace(/\{\{USER_FILTER\}\}/g, userFilter);
  } else {
    rendered = rendered.replace(/\s+AND\s+\{\{USER_FILTER\}\}/g, '');
    rendered = rendered.replace(/\{\{USER_FILTER\}\}/g, '');
  }

  const AND_PREFIXED_PLACEHOLDERS = ['DATE_FILTER', 'TIME_FILTER_REACTIONS', 'TIME_FILTER_VIEWS', 'TIME_FILTER_SAVES', 'TIMEFILTER', 'DOMAIN_FILTER'];

  for (const [key, value] of Object.entries(context)) {
    if (key === 'filterInternal' || key === 'filterFree' || key === 'usernamePrefix') continue;

    const placeholderName = key.toUpperCase();
    const isEmpty = value === undefined || value === null || value === '';

    if (!isEmpty) {
      const stringValue = String(value);
      const isClausePlaceholder = AND_PREFIXED_PLACEHOLDERS.includes(placeholderName);
      const looksLikeSqlClause = /^\s*(AND|OR)\s+/i.test(stringValue) || /\b(WHERE|JOIN|FROM|SELECT|INSERT|UPDATE|DELETE)\b/i.test(stringValue) || /\w+\s*(>=|<=|=|<|>)\s*['"]/.test(stringValue);
      const escapedValue = (isClausePlaceholder || looksLikeSqlClause) ? stringValue : stringValue.replace(/'/g, "''");
      rendered = rendered.replace(new RegExp(`\\{\\{${placeholderName}\\}\\}`, 'g'), escapedValue);
    } else {
      if (AND_PREFIXED_PLACEHOLDERS.includes(placeholderName)) {
        rendered = rendered.replace(new RegExp(`\\s+AND\\s+\\{\\{${placeholderName}\\}\\}`, 'g'), '');
      } else {
        rendered = rendered.replace(new RegExp(`\\s*\\{\\{${placeholderName}\\}\\}`, 'g'), '');
      }
    }
  }

  rendered = rendered.replace(/\n\s*\n\s*(GROUP BY|ORDER BY|HAVING|LIMIT|\)|,)/gi, '\n$1');
  rendered = rendered.replace(/\s+\n\s*(GROUP BY|ORDER BY|HAVING|LIMIT|\)|,)/gi, '\n$1');
  rendered = rendered.replace(/(WHERE[^\n]*(?:\n[^\n]*)*?)\s+\n\s*(GROUP BY|ORDER BY|HAVING|LIMIT|\)|,)/gi, '$1\n$2');
  rendered = rendered.replace(/WHERE\s+(?=\)|GROUP BY|ORDER BY|HAVING|LIMIT)/gi, '');
  rendered = rendered.replace(/WHERE\s+(?=\s*(?:GROUP BY|ORDER BY|HAVING|LIMIT|\)|,))/gi, '');

  const remainingPlaceholders = rendered.match(/\{\{[A-Z_]+\}\}/g);
  if (remainingPlaceholders && remainingPlaceholders.length > 0) {
    const uniquePlaceholders = [...new Set(remainingPlaceholders)];
    const requiredPlaceholders = uniquePlaceholders.filter(
      p => !['DOMAIN_FILTER', 'TIME_FILTER', 'DATE_FILTER', 'TIME_FILTER_REACTIONS', 'TIME_FILTER_VIEWS', 'TIME_FILTER_SAVES', 'TIMEFILTER'].includes(p.replace(/[{}]/g, ''))
    );
    if (requiredPlaceholders.length > 0) {
      console.warn(
        `Warning: Unresolved placeholders in ${filename}: ${requiredPlaceholders.join(', ')}. This may cause SQL syntax errors.`
      );
    }
  }

  return `-- SQL file: src/sql/${filename}\n${rendered}`;
}

export function loadHogql(filename: string): string {
  return readFileSync(join(hogqlDir, filename), 'utf-8');
}

export function renderHogqlTemplate(hogql: string, context: HogqlTemplateContext): string {
  let rendered = hogql;
  const store = requestContext.getStore();
  const filterInternal = context.filterInternal ?? store?.filterInternal ?? true;
  const filterFree = context.filterFree ?? store?.filterFree ?? true;

  // Handle LOGGED_IN_USER_FILTER — always expands to the logged-in user check (AND is in the template)
  rendered = rendered.replace(
    /\{\{LOGGED_IN_USER_FILTER\}\}/g,
    "person.properties.email IS NOT NULL AND person.properties.email != ''"
  );

  // Handle USER_FILTER (same placeholder name as SQL; HogQL uses person.properties.email)
  // Each clause is a bare expression; template provides the leading AND.
  const internalClause = filterInternal ? "NOT person.properties.email LIKE '%@gridstatus.io'" : '';
  const freeClauseList = filterFree
    ? FREE_EMAIL_DOMAINS.map(d => `NOT person.properties.email LIKE '%@${d}'`)
    : [];
  const allUserFilterClauses = [internalClause, ...freeClauseList].filter(Boolean);
  const userFilter = allUserFilterClauses.join('\n  AND ');
  if (userFilter) {
    rendered = rendered.replace(/\{\{USER_FILTER\}\}/g, userFilter);
  } else {
    rendered = rendered.replace(/\s+AND\s+\{\{USER_FILTER\}\}/g, '');
    rendered = rendered.replace(/\{\{USER_FILTER\}\}/g, '');
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
  
  // Handle DATE_FILTER placeholder (AND is in template; empty string = remove)
  if (context.dateFilter) {
    rendered = rendered.replace(/\{\{DATE_FILTER\}\}/g, context.dateFilter);
  } else {
    rendered = rendered.replace(/\s+AND\s+\{\{DATE_FILTER\}\}/g, '');
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

  // Handle EVENT_NAME placeholder (escape single quotes for HogQL safety)
  if (context.eventName !== undefined) {
    const escaped = String(context.eventName).replace(/'/g, "''");
    rendered = rendered.replace(/\{\{EVENT_NAME\}\}/g, escaped);
  }

  // Handle DOMAIN_LIKE placeholder: LIKE '%@domain' for filtering by email domain
  if (context.domain !== undefined) {
    const escaped = String(context.domain).replace(/'/g, "''");
    rendered = rendered.replace(/\{\{DOMAIN_LIKE\}\}/g, '%@' + escaped);
  }

  // Handle USER_TYPE_FILTER: clause for logged-in, anon, or all (empty = remove)
  if (context.userTypeFilter) {
    rendered = rendered.replace(/\{\{USER_TYPE_FILTER\}\}/g, context.userTypeFilter);
  } else {
    rendered = rendered.replace(/\s+AND\s+\{\{USER_TYPE_FILTER\}\}/g, '');
    rendered = rendered.replace(/\{\{USER_TYPE_FILTER\}\}/g, '');
  }

  // Handle PERIOD_SELECT: expression for time grouping (e.g. toDate(timestamp))
  if (context.periodSelect !== undefined) {
    rendered = rendered.replace(/\{\{PERIOD_SELECT\}\}/g, context.periodSelect);
  }

  // Handle SAME_TIME_OF_DAY_FILTER: include only events before (that day's start + elapsed time today)
  if (context.sameTimeOfDayFilter) {
    rendered = rendered.replace(/\{\{SAME_TIME_OF_DAY_FILTER\}\}/g, context.sameTimeOfDayFilter);
  } else {
    rendered = rendered.replace(/\s+AND\s+\{\{SAME_TIME_OF_DAY_FILTER\}\}/g, '');
    rendered = rendered.replace(/\{\{SAME_TIME_OF_DAY_FILTER\}\}/g, '');
  }

  // Handle PATHNAME_FILTER: filter by pathname (e.g. for debug-daily-views-by-path)
  if (context.pathname !== undefined && context.pathname !== '') {
    const escaped = String(context.pathname).replace(/\\/g, '\\\\').replace(/'/g, "''");
    rendered = rendered.replace(/\{\{PATHNAME_FILTER\}\}/g, `properties.pathname = '${escaped}'`);
  } else {
    rendered = rendered.replace(/\s+AND\s+\{\{PATHNAME_FILTER\}\}/g, '');
    rendered = rendered.replace(/\{\{PATHNAME_FILTER\}\}/g, '');
  }

  return rendered;
}

export function loadRenderedHogql(filename: string, context: HogqlTemplateContext): string {
  return renderHogqlTemplate(loadHogql(filename), context);
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

export async function getMonthlyUserCounts(): Promise<MonthlyUserCount[]> {
  const sql = loadSql('monthly-user-counts.sql', {});
  return query<MonthlyUserCount>(sql);
}

export async function getUserCountsByPeriod(period: 'day' | 'week' | 'month' | 'year'): Promise<MonthlyUserCount[]> {
  const sql = loadSql('user-counts-by-period.sql', { period });
  return query<MonthlyUserCount>(sql);
}

export async function getMonthlyApiUsage(): Promise<MonthlyApiUsage[]> {
  const sql = loadSql('monthly-api-usage.sql', {});
  return query<MonthlyApiUsage>(sql);
}

export interface DatasetUserLast24h {
  user_id: number;
  username: string | null;
  num_requests: string;
  last_query_at: Date;
  avg_seconds_between: string | null;
}

export async function getDatasetUsersLast24h(datasetId: string, days: number): Promise<DatasetUserLast24h[]> {
  const sql = loadSql('dataset-users-last-24h.sql', {});
  return query<DatasetUserLast24h>(sql, [datasetId, days]);
}

export interface DatasetUsage24hRow {
  dataset_id: string;
  num_unique_users: string;
  last_query_at: Date;
}

export async function getDatasetUsage24h(): Promise<DatasetUsage24hRow[]> {
  const sql = loadSql('last-24h-dataset-unique-users.sql', {});
  return query<DatasetUsage24hRow>(sql);
}

export async function getMonthlyCorpMetrics(): Promise<MonthlyCorpMetric[]> {
  const sql = loadSql('monthly-corp-metrics.sql', {});
  return query<MonthlyCorpMetric>(sql);
}

export async function getDomainDistribution(): Promise<DomainDistribution[]> {
  const sql = loadSql('domain-distribution.sql', {});
  return query<DomainDistribution>(sql);
}

export async function getDomainSummary(): Promise<DomainSummary[]> {
  const sql = loadSql('domain-summary.sql', {});
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
  // Replace DATE_TRUNC('month' with the appropriate period
  sql = sql.replace(/DATE_TRUNC\('month'/g, `DATE_TRUNC('${period}'`);
  return query<MonthlyInsightsPosts>(sql);
}

export async function getMonthlyInsightsViews(period: 'day' | 'week' | 'month' = 'month'): Promise<MonthlyInsightsViews[]> {
  let sql = loadSql('monthly-insights-views.sql', {});
  // Replace DATE_TRUNC('month' with the appropriate period
  sql = sql.replace(/DATE_TRUNC\('month'/g, `DATE_TRUNC('${period}'`);
  return query<MonthlyInsightsViews>(sql);
}

export async function getMonthlyInsightsReactions(period: 'day' | 'week' | 'month' = 'month'): Promise<MonthlyInsightsReactions[]> {
  let sql = loadSql('monthly-insights-reactions.sql', {});
  // Replace DATE_TRUNC('month' with the appropriate period
  sql = sql.replace(/DATE_TRUNC\('month'/g, `DATE_TRUNC('${period}'`);
  return query<MonthlyInsightsReactions>(sql);
}

// Get total unique logged-in users who have visited insights (any view source)
// Note: Anonymous users are tracked in PostHog, not PostgreSQL
export async function getTotalUniqueVisitors(): Promise<number> {
  const sql = loadSql('total-unique-visitors.sql', { usernamePrefix: 'u.' });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

// Get total unique logged-in users who have visited the homefeed (/insights)
// Note: Anonymous users are tracked in PostHog, not PostgreSQL
export async function getTotalUniqueHomefeedVisitors(): Promise<number> {
  const sql = loadSql('total-unique-homefeed-visitors.sql', { usernamePrefix: 'u.' });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

// Summary KPI queries with period support (1d, 7d, 30d, all)
// These are independent queries for summary metrics, not derived from chart data

export async function getSummaryUniqueVisitors(period: '1d' | '7d' | '30d' | 'all'): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `pv.viewed_at >= NOW() - INTERVAL '${days} days'`;
  } else {
    dateFilter = `pv.viewed_at >= '2025-10-01'`;
  }
  
  const sql = loadSql('summary-unique-visitors.sql', { usernamePrefix: 'u.', date_filter: dateFilter });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

export async function getSummaryHomefeedVisitors(period: '1d' | '7d' | '30d' | 'all'): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `pv.viewed_at >= NOW() - INTERVAL '${days} days'`;
  } else {
    dateFilter = `pv.viewed_at >= '2025-10-01'`;
  }
  
  const sql = loadSql('summary-homefeed-visitors.sql', { usernamePrefix: 'u.', date_filter: dateFilter });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

export async function getSummaryEngagements(period: '1d' | '7d' | '30d' | 'all'): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `pv.viewed_at >= NOW() - INTERVAL '${days} days'`;
  } else {
    dateFilter = `pv.viewed_at >= '2025-10-01'`;
  }
  
  const sql = loadSql('summary-engagements.sql', { usernamePrefix: 'u.', date_filter: dateFilter });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

export async function getSummaryImpressions(period: '1d' | '7d' | '30d' | 'all'): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `pv.viewed_at >= NOW() - INTERVAL '${days} days'`;
  } else {
    dateFilter = `pv.viewed_at >= '2025-10-01'`;
  }
  
  const sql = loadSql('summary-impressions.sql', { usernamePrefix: 'u.', date_filter: dateFilter });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

export async function getSummaryReactions(period: '1d' | '7d' | '30d' | 'all'): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `r.created_at >= NOW() - INTERVAL '${days} days'`;
  } else {
    dateFilter = `r.created_at >= '2025-10-01'`;
  }
  
  const sql = loadSql('summary-reactions.sql', { usernamePrefix: 'u.', date_filter: dateFilter });
  const result = await query<{ total: string }>(sql);
  return Number(result[0]?.total || 0);
}

export async function getSummaryPosts(period: '1d' | '7d' | '30d' | 'all'): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `p.created_at >= NOW() - INTERVAL '${days} days'`;
  } else {
    dateFilter = `p.created_at >= '2025-10-01'`;
  }
  
  let sql = `
    SELECT COUNT(*) AS total
    FROM insights.posts p
    WHERE p.status = 'PUBLISHED'
      AND ${dateFilter}
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
    dateFilter = "timestamp >= now() - INTERVAL 2 YEAR";
  } else if (period === 'week') {
    dateFunction = 'toStartOfWeek(timestamp)';
    dateFilter = "timestamp >= now() - INTERVAL 3 YEAR";
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

  const response = await posthogFetchWithRetry(url, payload, { Authorization: `Bearer ${apiKey}` });
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
    dateFilter = `timestamp >= now() - INTERVAL ${days} DAY`;
  } else {
    dateFilter = "timestamp >= '2025-10-01'";
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

  const response = await posthogFetchWithRetry(url, payload, { Authorization: `Bearer ${apiKey}` });
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
    dateFilter = `timestamp >= now() - INTERVAL ${days} DAY`;
  } else {
    dateFilter = "timestamp >= '2025-10-01'";
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

  const response = await posthogFetchWithRetry(url, payload, { Authorization: `Bearer ${apiKey}` });
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
    dateFilter = "timestamp >= now() - INTERVAL 2 YEAR";
  } else if (period === 'week') {
    dateFunction = 'toStartOfWeek(timestamp)';
    dateFilter = "timestamp >= now() - INTERVAL 3 YEAR";
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

  const response = await posthogFetchWithRetry(url, payload, { Authorization: `Bearer ${apiKey}` });
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

export async function getMostEngagedUsers(days: number | null = null): Promise<MostEngagedUser[]> {
  // Build time filter conditions
  let timeFilterReactions = '';
  let timeFilterViews = '';
  let timeFilterSaves = '';
  
  if (days !== null) {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
    cutoffDate.setUTCHours(0, 0, 0, 0);
    const cutoffDateStr = cutoffDate.toISOString();
    
    // reactions table uses created_at
    timeFilterReactions = `r.created_at >= '${cutoffDateStr}'`;
    // post_views table uses viewed_at
    timeFilterViews = `pv.viewed_at >= '${cutoffDateStr}'`;
    // saved_posts table uses created_at
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

// NOTE: Posts are not filtered by author domain because all posts are authored by GS employees.
export async function getTopInsightsPosts(timeFilter?: '24h' | '7d' | '1m'): Promise<TopInsightsPost[]> {
  // Apply time filter if provided
  let timeFilterClause = '';
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
    
    timeFilterClause = `p.created_at >= '${dateStr}'`;
  } else {
    // Default: show all posts from Oct 2025 onwards
    timeFilterClause = "p.created_at >= '2025-10-01'";
  }
  
  const sql = loadSql('top-insights-posts.sql', { timeFilter: timeFilterClause });
  return query<TopInsightsPost>(sql);
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

// Pricing Page Visitors from PostHog
export interface PricingPageVisitCount {
  email: string;
  visitCount: number;
}

// Get visit counts for pricing page by period (1d, 7d, 30d)
export async function getPricingPageVisitCounts(period: '1d' | '7d' | '30d'): Promise<number> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return 0;
  }

  const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;

  const hogql = loadRenderedHogql('pricing-page-visit-counts.hogql', {
    days,
  });

  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
  const payload = {
    query: {
      kind: 'HogQLQuery',
      query: hogql,
    },
  };

  const response = await posthogFetchWithRetry(url, payload, { Authorization: `Bearer ${apiKey}` });
  const data = await response.json();
  
  if (data.warnings) {
    console.warn('PostHog pricing page visit counts query warnings:', data.warnings);
  }
  
  const results: [number][] = data.results || [];
  return results[0]?.[0] || 0;
}

// Get users with most visits to pricing page for a period
export async function getPricingPageMostVisits(period: '1d' | '7d' | '30d', limit: number = 50): Promise<PricingPageVisitCount[]> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return [];
  }

  const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;

  const hogql = loadRenderedHogql('pricing-page-most-visits.hogql', {
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

  const response = await posthogFetchWithRetry(url, payload, { Authorization: `Bearer ${apiKey}` });
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

export interface PlanListRow {
  id: number;
  plan_name: string;
}

export async function getPlansList(): Promise<PlanListRow[]> {
  const sql = loadSql('plan-list.sql');
  return query<PlanListRow>(sql);
}

export interface PlanEntitlementRow {
  entitlement: string;
}

export async function getDistinctEntitlements(): Promise<PlanEntitlementRow[]> {
  const sql = loadSql('plan-entitlements.sql');
  return query<PlanEntitlementRow>(sql);
}

export interface PlanRow {
  id: number;
  plan_name: string;
  api_rows_returned_limit: number | null;
  api_requests_limit: number | null;
  api_rows_per_response_limit: number | null;
  alerts_limit: number | null;
  dashboards_limit: number | null;
  downloads_limit: number | null;
  entitlements: string[] | null;
  per_second_api_rate_limit: number | null;
  per_minute_api_rate_limit: number | null;
  per_hour_api_rate_limit: number | null;
  charts_limit: number | null;
}

export async function getPlanById(id: number): Promise<PlanRow[]> {
  const sql = loadSql('plan-by-id.sql');
  return query<PlanRow>(sql, [id]);
}

export interface PlanSubscriptionRow {
  id: number;
  user_id: number | null;
  username: string | null;
  plan_id: number | null;
  start_date: Date;
  status: string;
  organization_id: string | null;
  organization_name: string | null;
  stripe_subscription_id: string | null;
  current_billing_period_start: Date;
  current_billing_period_end: Date | null;
  created_at: Date | null;
}

export async function getSubscriptionsByPlanId(planId: number): Promise<PlanSubscriptionRow[]> {
  const sql = loadSql('plan-subscriptions.sql');
  return query<PlanSubscriptionRow>(sql, [planId]);
}

export async function getSubscriptionsByOrganizationId(
  organizationId: string
): Promise<SubscriptionListRow[]> {
  const sql = loadSql('subscription-filter.sql', {
    subscription_filter: 's.organization_id = $1',
  });
  return query<SubscriptionListRow>(sql, [organizationId]);
}

export async function getSubscriptionsByUserId(
  userId: number | string
): Promise<SubscriptionListRow[]> {
  const sql = loadSql('subscription-filter.sql', {
    subscription_filter: 's.user_id = $1',
  });
  return query<SubscriptionListRow>(sql, [userId]);
}

export interface SubscriptionListRow {
  id: number;
  user_id: number | null;
  username: string | null;
  plan_id: number | null;
  plan_name: string | null;
  start_date: Date;
  status: string;
  organization_id: string | null;
  organization_name: string | null;
  stripe_subscription_id: string | null;
  current_billing_period_start: Date;
  current_billing_period_end: Date | null;
  enforce_api_usage_limit: boolean;
  created_at: Date | null;
}

/** Map a SubscriptionListRow to a JSON-safe camelCase object. Shared by all routes that return subscription lists. */
export function toSubscriptionListItem(row: SubscriptionListRow) {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    planId: row.plan_id,
    planName: row.plan_name,
    startDate: row.start_date instanceof Date ? row.start_date.toISOString() : String(row.start_date),
    status: row.status,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    stripeSubscriptionId: row.stripe_subscription_id,
    currentBillingPeriodStart:
      row.current_billing_period_start instanceof Date
        ? row.current_billing_period_start.toISOString()
        : String(row.current_billing_period_start),
    currentBillingPeriodEnd:
      row.current_billing_period_end instanceof Date
        ? row.current_billing_period_end.toISOString()
        : row.current_billing_period_end != null
          ? String(row.current_billing_period_end)
          : null,
    enforceApiUsageLimit: row.enforce_api_usage_limit,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at != null ? String(row.created_at) : null,
  };
}

export async function getSubscriptionsList(): Promise<SubscriptionListRow[]> {
  const sql = loadSql('subscription-list.sql');
  return query<SubscriptionListRow>(sql);
}

export interface SubscriptionDetailRow {
  id: number;
  user_id: number | null;
  username: string | null;
  plan_id: number | null;
  plan_name: string | null;
  start_date: Date;
  status: string;
  cancel_at_period_end: boolean | null;
  organization_id: string | null;
  organization_name: string | null;
  stripe_subscription_id: string | null;
  current_billing_period_start: Date;
  current_billing_period_end: Date | null;
  created_at: Date | null;
  enforce_api_usage_limit: boolean;
  api_rows_returned_limit_override: number | null;
  api_requests_limit_override: number | null;
  api_rows_per_response_limit_override: number | null;
  alerts_limit_override: number | null;
  dashboards_limit_override: number | null;
  downloads_limit_override: number | null;
  entitlement_overrides: string[] | null;
  per_second_api_rate_limit_override: number | null;
  per_minute_api_rate_limit_override: number | null;
  per_hour_api_rate_limit_override: number | null;
  charts_limit_override: number | null;
}

export async function getSubscriptionById(id: number): Promise<SubscriptionDetailRow[]> {
  const sql = loadSql('subscription-by-id.sql');
  return query<SubscriptionDetailRow>(sql, [id]);
}
