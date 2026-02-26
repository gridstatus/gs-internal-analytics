import { readFileSync } from 'fs';
import { join } from 'path';
import { requestContext } from '../db';

const sqlDir = join(process.cwd(), 'src/sql');
const hogqlDir = join(process.cwd(), 'src/hogql');

/** Free email domains excluded when filterFree is true. */
export const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'outlook.com',
  'hotmail.com', 'hotmail.co.uk', 'live.com', 'icloud.com', 'mac.com', 'me.com', 'aol.com',
  'mail.com', 'protonmail.com', 'proton.me', 'zoho.com', 'yandex.com',
  'gmx.com', 'gmx.net', 'mail.ru', 'qq.com', '163.com', '126.com', 'comcast.net', 'att.net', 'verizon.net', 'earthlink.net',
];

export interface TemplateContext {
  filterInternal?: boolean;
  filterFree?: boolean;
  usernamePrefix?: string; // 'u.' or '' - determined from SQL context
  // Custom template variables - any key-value pairs for {{KEY}} placeholders
  [key: string]: string | number | boolean | undefined;
}

export interface HogqlTemplateContext {
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
  const userFilter = allUserFilterClauses.join(' AND ');
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
