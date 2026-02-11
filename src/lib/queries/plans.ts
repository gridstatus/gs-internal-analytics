import { query } from '../db';
import { loadSql } from './core';

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
