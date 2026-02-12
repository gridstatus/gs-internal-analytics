import { query } from '../db';
import { loadSql } from './core';

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
  cancel_at_period_end: boolean | null;
  enforce_api_usage_limit: boolean;
  created_at: Date | null;
}

export async function getSubscriptionsByPlanId(planId: number): Promise<PlanSubscriptionRow[]> {
  const sql = loadSql('plan-subscriptions.sql');
  return query<PlanSubscriptionRow>(sql, [planId]);
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
  cancel_at_period_end: boolean | null;
  enforce_api_usage_limit: boolean;
  created_at: Date | null;
}

export async function getSubscriptionsByOrganizationId(organizationId: string): Promise<SubscriptionListRow[]> {
  const sql = loadSql('subscription-filter.sql', {
    subscription_filter: 's.organization_id = $1',
  });
  return query<SubscriptionListRow>(sql, [organizationId]);
}

export async function getSubscriptionsByUserId(userId: number | string): Promise<SubscriptionListRow[]> {
  const sql = loadSql('subscription-filter.sql', {
    subscription_filter: 's.user_id = $1',
  });
  return query<SubscriptionListRow>(sql, [userId]);
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
    cancelAtPeriodEnd: row.cancel_at_period_end ?? null,
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

export interface LimitNotEnforcedRow {
  id: number;
  user_id: number | null;
  username: string | null;
  organization_name: string | null;
}

export interface ActiveTrialRow {
  id: number;
  user_id: number | null;
  username: string | null;
  organization_name: string | null;
  status: string;
  past_end_date: boolean;
}

export async function getLimitNotEnforcedSubscriptions(): Promise<LimitNotEnforcedRow[]> {
  const sql = loadSql('subscription-monitor-limit-not-enforced.sql', {});
  return query<LimitNotEnforcedRow>(sql);
}

export async function getTrialsSelfService(): Promise<SubscriptionListRow[]> {
  const sql = loadSql('subscription-trials-self-service.sql', {});
  return query<SubscriptionListRow>(sql);
}

export async function getActiveEnterpriseTrials(): Promise<ActiveTrialRow[]> {
  const sql = loadSql('subscription-monitor-active-trials.sql', {});
  return query<ActiveTrialRow>(sql);
}

export async function getPastBillingPeriodSubscriptions(): Promise<SubscriptionListRow[]> {
  const sql = loadSql('subscription-monitor-past-billing-period.sql', {});
  return query<SubscriptionListRow>(sql);
}
