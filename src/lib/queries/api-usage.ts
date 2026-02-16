import { query } from '../db';
import { loadSql } from './core';

export interface ApiUsageByIpRow {
  ip: string | null;
  distinct_users: string;
  total_rows_returned: string;
  request_count: string;
  user_names: string[];
}

export async function getApiUsageByIp(): Promise<ApiUsageByIpRow[]> {
  const sql = loadSql('api-usage-by-ip.sql', {});
  return query<ApiUsageByIpRow>(sql);
}

export interface ApiUsageByUserRow {
  user: string | null;
  org: string | null;
  usage_id: string;
  plan_id: number | null;
  total_requests: string;
  total_rows_returned: string;
  last_request_time: Date;
  unique_client_versions: (string | null)[];
  unique_datasets: (string | null)[];
  user_id: number | null;
  org_id: string | null;
}

export async function getApiUsageByUser(): Promise<ApiUsageByUserRow[]> {
  const sql = loadSql('api-usage-by-user.sql', {});
  return query<ApiUsageByUserRow>(sql);
}
