import { posthogFetchWithRetry } from '../posthog';
import { loadRenderedHogql } from './core';
import type { HogqlTemplateContext } from './core';

async function runHogqlQuery(
  filename: string,
  context: HogqlTemplateContext,
  warningLabel?: string
): Promise<{ results: unknown[]; limitReached?: boolean }> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.warn('PostHog credentials not configured');
    return { results: [] };
  }

  const hogql = loadRenderedHogql(filename, context);
  const url = `https://us.i.posthog.com/api/projects/${projectId}/query/`;
  const payload = {
    query: {
      kind: 'HogQLQuery',
      query: hogql,
    },
  };

  const response = await posthogFetchWithRetry(url, payload, { Authorization: `Bearer ${apiKey}` });
  const data = await response.json();

  if (data.warnings && warningLabel) {
    console.warn(`PostHog ${warningLabel} query warnings:`, data.warnings);
  }
  if (data.limit_reached && warningLabel) {
    console.warn(`PostHog ${warningLabel} query limit reached - results may be truncated`);
  }

  return {
    results: data.results || [],
    limitReached: data.limit_reached,
  };
}

export async function fetchPosthogAnonymousUsers(period: 'day' | 'week' | 'month'): Promise<{ period: string; anonymousUsers: number }[]> {
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

  const { results } = await runHogqlQuery('anonymous-users.hogql', {
    dateFunction,
    dateFilter,
    orderDirection,
  }, 'anonymous users');

  const typedResults = (results || []) as [string, number][];
  const sortedResults = typedResults.slice().reverse();

  return sortedResults.map(([periodDate, anonymousUsers]) => {
    const date = new Date(periodDate);
    const formattedPeriod = period === 'month' ? date.toISOString().slice(0, 7) : date.toISOString().slice(0, 10);
    return { period: formattedPeriod, anonymousUsers };
  });
}

export async function getSummaryAnonymousVisitors(period: '1d' | '7d' | '30d' | 'all'): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `timestamp >= now() - INTERVAL ${days} DAY`;
  } else {
    dateFilter = "timestamp >= '2025-10-01'";
  }

  const { results } = await runHogqlQuery('anonymous-visitors-summary.hogql', { dateFilter }, 'anonymous visitors summary');
  const typed = (results || []) as [number][];
  return typed[0]?.[0] ?? 0;
}

export async function getSummaryAnonymousHomefeedVisitors(period: '1d' | '7d' | '30d' | 'all'): Promise<number> {
  let dateFilter = '';
  if (period !== 'all') {
    const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
    dateFilter = `timestamp >= now() - INTERVAL ${days} DAY`;
  } else {
    dateFilter = "timestamp >= '2025-10-01'";
  }

  const { results } = await runHogqlQuery('anonymous-homefeed-visitors-summary.hogql', { dateFilter }, 'anonymous homefeed visitors summary');
  const typed = (results || []) as [number][];
  return typed[0]?.[0] ?? 0;
}

export async function fetchPosthogAnonymousHomefeedVisitors(period: 'day' | 'week' | 'month'): Promise<{ period: string; anonymousUsers: number }[]> {
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

  const { results } = await runHogqlQuery('anonymous-homefeed-visitors.hogql', {
    dateFunction,
    dateFilter,
    orderDirection,
  }, 'anonymous homefeed visitors');

  const typedResults = (results || []) as [string, number][];
  const sortedResults = typedResults.slice().reverse();

  return sortedResults.map(([periodDate, anonymousUsers]) => {
    const date = new Date(periodDate);
    const formattedPeriod = period === 'month' ? date.toISOString().slice(0, 7) : date.toISOString().slice(0, 10);
    return { period: formattedPeriod, anonymousUsers };
  });
}

export interface PricingPageVisitCount {
  email: string;
  visitCount: number;
}

export async function getPricingPageVisitCounts(period: '1d' | '7d' | '30d'): Promise<number> {
  const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
  const { results } = await runHogqlQuery('pricing-page-visit-counts.hogql', { days }, 'pricing page visit counts');
  const typed = (results || []) as [number][];
  return typed[0]?.[0] ?? 0;
}

export async function getPricingPageMostVisits(period: '1d' | '7d' | '30d', limit: number = 50): Promise<PricingPageVisitCount[]> {
  const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
  const { results } = await runHogqlQuery('pricing-page-most-visits.hogql', { days, limit }, 'pricing page most visits');
  const typed = (results || []) as [string, number][];
  return typed.map(([email, visitCount]) => ({ email, visitCount }));
}
